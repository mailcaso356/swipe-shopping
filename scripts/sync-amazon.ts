// Aggiorna public/catalog.json con foto, prezzi e disponibilità dalla Amazon Creators API.
// Gira su GitHub Actions prima di ogni build: le credenziali restano nei Secrets del repository
// e non finiscono mai nel sito. Uso: `npm run sync:amazon` con le variabili d'ambiente impostate.
import { readFileSync, writeFileSync } from "node:fs";

const {
  AMAZON_CREDENTIAL_ID,
  AMAZON_CREDENTIAL_SECRET,
  AMAZON_CREDENTIAL_VERSION,
  AMAZON_TOKEN_URL,
} = process.env;
const PARTNER_TAG = process.env.VITE_AMAZON_TAG || "mrofferta09-21";
const MARKETPLACE = "www.amazon.it";
const API_URL = "https://creatorsapi.amazon/catalog/v1/getItems";
// Endpoint del token per versione delle credenziali (EU = 3.2).
const TOKEN_URLS: Record<string, string> = {
  "3.1": "https://api.amazon.com/auth/o2/token",
  "3.2": "https://api.amazon.co.uk/auth/o2/token",
  "3.3": "https://api.amazon.co.jp/auth/o2/token",
};

if (!AMAZON_CREDENTIAL_ID || !AMAZON_CREDENTIAL_SECRET) {
  console.log("Credenziali Amazon assenti: catalogo lasciato invariato.");
  process.exit(0);
}

const file = new URL("../public/catalog.json", import.meta.url);
const catalog = JSON.parse(readFileSync(file, "utf8")) as Record<string, any>[];

async function getToken() {
  const url =
    AMAZON_TOKEN_URL ||
    TOKEN_URLS[AMAZON_CREDENTIAL_VERSION ?? "3.2"] ||
    TOKEN_URLS["3.2"];
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: AMAZON_CREDENTIAL_ID,
      client_secret: AMAZON_CREDENTIAL_SECRET,
      scope: "creatorsapi::default",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token)
    throw new Error(
      `Token non ottenuto (HTTP ${res.status}): ${JSON.stringify(body)}`,
    );
  return body.access_token as string;
}

const num = (v: unknown) =>
  typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
const amountOf = (p: any) => num(p?.money?.amount ?? p?.amount);

function readListing(item: any) {
  const listings: any[] = item?.offersV2?.listings ?? [];
  const listing = listings.find((l) => l?.isBuyBoxWinner) ?? listings[0];
  if (!listing) return null;
  const price = amountOf(listing.price);
  const basis = amountOf(listing.price?.savingBasis ?? listing.savingBasis);
  const availability = String(listing.availability?.type ?? "").toUpperCase();
  return { price, basis, availability };
}

// Gli errori diventano annotazioni GitHub (visibili nel riepilogo) e non bloccano la pubblicazione.
const annotate = (level: "error" | "warning" | "notice", msg: string) =>
  console.log(`::${level}::${msg.replace(/\r?\n/g, " ").slice(0, 4000)}`);

try {
  const token = await getToken();
  const now = new Date().toISOString();
  const amazon = catalog.filter((p) => p.store === "amazon");
  let updated = 0;
  let printedSample = false;
  const summary: string[] = [];

  for (let i = 0; i < amazon.length; i += 10) {
    const batch = amazon.slice(i, i + 10);
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-marketplace": MARKETPLACE,
      },
      body: JSON.stringify({
        itemIds: batch.map((p) => p.externalId),
        itemIdType: "ASIN",
        marketplace: MARKETPLACE,
        partnerTag: PARTNER_TAG,
        languagesOfPreference: ["it_IT"],
        resources: [
          "images.primary.large",
          "itemInfo.title",
          "itemInfo.byLineInfo",
          "offersV2.listings.price",
          "offersV2.listings.availability",
          "offersV2.listings.isBuyBoxWinner",
        ],
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(`getItems HTTP ${res.status}: ${JSON.stringify(body)}`);
    if (!printedSample) {
      // Una risposta di esempio aiuta a verificare la struttura dei dati.
      annotate(
        "notice",
        `Esempio risposta: ${JSON.stringify((body?.itemsResult ?? body?.itemResults)?.items?.[1] ?? body)}`,
      );
      printedSample = true;
    }
    for (const err of body?.errors ?? [])
      annotate("warning", `Amazon: ${err.code} ${err.message}`);

    const items: any[] = (body?.itemsResult ?? body?.itemResults)?.items ?? []
    summary.push(...items.map((it) => `${it?.asin}:${JSON.stringify(it?.offersV2?.listings?.[0]?.price ?? null)}:${it?.offersV2?.listings?.[0]?.availability?.type ?? '-'}`));
    for (const p of batch) {
      const item = items.find((it) => it?.asin === p.externalId);
      if (!item) {
        // Amazon segnala l'ASIN come non accessibile o non valido: lo togliamo dallo swipe.
        const rejected = (body?.errors ?? []).some((e: any) => String(e?.message).includes(p.externalId));
        if (rejected) p.availability = "out_of_stock";
        continue;
      }
      const image = item?.images?.primary?.large?.url;
      if (typeof image === "string" && image.startsWith("https://"))
        p.imageUrl = image;
      const offer = readListing(item);
      if (offer && Number.isFinite(offer.price) && offer.price > 0) {
        p.price = offer.price;
        p.priceCheckedAt = now;
        if (Number.isFinite(offer.basis) && offer.basis > offer.price)
          p.originalPrice = offer.basis;
        else delete p.originalPrice;
      } else {
        delete p.price;
        delete p.originalPrice;
        delete p.priceCheckedAt;
      }
      p.availability = offer?.availability.includes("OUT")
        ? "out_of_stock"
        : offer
          ? "in_stock"
          : "unknown";
      updated++;
    }
  }

  writeFileSync(file, JSON.stringify(catalog, null, 1) + "\n");
  annotate("notice", `Riepilogo: ${summary.join(' | ')}`);
  annotate("notice", `Aggiornati ${updated} prodotti su ${amazon.length}.`);
} catch (e) {
  annotate(
    "error",
    `Sincronizzazione Amazon non riuscita: ${e instanceof Error ? e.message : String(e)}`,
  );
}
