// Aggiorna public/catalog.json con foto, prezzi e disponibilità dalla Amazon Creators API.
// Gira su GitHub Actions prima di ogni build: le credenziali restano nei Secrets del repository
// e non finiscono mai nel sito. Uso: `npm run sync:amazon` con le variabili d'ambiente impostate.
import { readFileSync, writeFileSync } from 'node:fs'

const { AMAZON_CREDENTIAL_ID, AMAZON_CREDENTIAL_SECRET, AMAZON_CREDENTIAL_VERSION, AMAZON_TOKEN_URL } = process.env
const PARTNER_TAG = process.env.VITE_AMAZON_TAG || 'mrofferta09-21'
const MARKETPLACE = 'www.amazon.it'
const API_BASE = 'https://creatorsapi.amazon/catalog/v1'
// Endpoint del token per versione delle credenziali (EU = 3.2).
const TOKEN_URLS: Record<string, string> = {
  '3.1': 'https://api.amazon.com/auth/o2/token',
  '3.2': 'https://api.amazon.co.uk/auth/o2/token',
  '3.3': 'https://api.amazon.co.jp/auth/o2/token',
}

if (!AMAZON_CREDENTIAL_ID || !AMAZON_CREDENTIAL_SECRET) {
  console.log('Credenziali Amazon assenti: catalogo lasciato invariato.')
  process.exit(0)
}

const file = new URL('../public/catalog.json', import.meta.url)
const catalog = JSON.parse(readFileSync(file, 'utf8')) as Record<string, any>[]

// Gli errori diventano annotazioni GitHub (visibili nel riepilogo) e non bloccano la pubblicazione.
const annotate = (level: 'error' | 'warning' | 'notice', msg: string) =>
  console.log(`::${level}::${msg.replace(/\r?\n/g, ' ').slice(0, 4000)}`)

async function getToken() {
  const url = AMAZON_TOKEN_URL || TOKEN_URLS[AMAZON_CREDENTIAL_VERSION ?? '3.2'] || TOKEN_URLS['3.2']
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: AMAZON_CREDENTIAL_ID,
      client_secret: AMAZON_CREDENTIAL_SECRET,
      scope: 'creatorsapi::default',
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.access_token) throw new Error(`Token non ottenuto (HTTP ${res.status}): ${JSON.stringify(body)}`)
  return body.access_token as string
}

async function callApi(op: string, token: string, payload: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/${op}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-marketplace': MARKETPLACE },
    body: JSON.stringify({ marketplace: MARKETPLACE, partnerTag: PARTNER_TAG, languagesOfPreference: ['it_IT'], ...payload }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${op} HTTP ${res.status}: ${JSON.stringify(body)}`)
  return body
}

const OFFER_RESOURCES = ['offersV2.listings.price', 'offersV2.listings.availability', 'offersV2.listings.isBuyBoxWinner']

const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN)

interface Offer {
  price: number
  basis: number
  availability: string
}

function readListing(item: any): Offer | null {
  const listings: any[] = item?.offersV2?.listings ?? []
  const listing = listings.find((l) => l?.isBuyBoxWinner) ?? listings[0]
  if (!listing) return null
  return {
    price: num(listing.price?.money?.amount),
    basis: num(listing.price?.savingBasis?.money?.amount),
    availability: String(listing.availability?.type ?? '').toUpperCase(),
  }
}

const isUsable = (o: Offer | null): o is Offer => !!o && !o.availability.includes('OUT') && o.price > 0

/** Per i capi con taglie/colori: la variante disponibile con il prezzo più basso. */
async function bestVariant(token: string, asin: string) {
  let best: (Offer & { image?: string }) | null = null
  for (let page = 1; page <= 3; page++) {
    const body = await callApi('getVariations', token, {
      asin,
      variationCount: 9,
      variationPage: page,
      resources: [...OFFER_RESOURCES, 'images.primary.large'],
    })
    const result = body?.variationsResult
    for (const item of result?.items ?? []) {
      const offer = readListing(item)
      if (!isUsable(offer)) continue
      if (!best || offer.price < best.price) best = { ...offer, image: item?.images?.primary?.large?.url }
    }
    if (page >= (result?.variationSummary?.pageCount ?? 1)) break
  }
  return best
}

try {
  const token = await getToken()
  const now = new Date().toISOString()
  const amazon = catalog.filter((p) => p.store === 'amazon')
  const summary: string[] = []
  let updated = 0

  for (let i = 0; i < amazon.length; i += 10) {
    const batch = amazon.slice(i, i + 10)
    const body = await callApi('getItems', token, {
      itemIds: batch.map((p) => p.externalId),
      itemIdType: 'ASIN',
      resources: ['images.primary.large', 'itemInfo.title', 'itemInfo.byLineInfo', 'parentASIN', ...OFFER_RESOURCES],
    })
    const errors: any[] = body?.errors ?? []
    for (const err of errors) annotate('warning', `Amazon: ${err.code} ${err.message}`)
    const items: any[] = body?.itemsResult?.items ?? []

    for (const p of batch) {
      const item = items.find((it) => it?.asin === p.externalId)
      if (!item) {
        // Amazon segnala l'ASIN come non accessibile o non valido: lo togliamo dallo swipe.
        if (errors.some((e) => String(e?.message).includes(p.externalId))) p.availability = 'out_of_stock'
        continue
      }
      const image = item?.images?.primary?.large?.url
      if (typeof image === 'string' && image.startsWith('https://')) p.imageUrl = image

      let offer = readListing(item)
      delete p.priceFrom
      if (!isUsable(offer)) {
        // L'ASIN principale non ha un'offerta: proviamo con taglie e colori.
        try {
          const v = await bestVariant(token, item.parentASIN ?? p.externalId)
          if (v) {
            offer = v
            p.priceFrom = true
            if (!p.imageUrl && v.image) p.imageUrl = v.image
          }
        } catch (e) {
          annotate('warning', `Varianti ${p.externalId}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      if (isUsable(offer)) {
        p.price = offer.price
        p.priceCheckedAt = now
        if (offer.basis > offer.price) p.originalPrice = offer.basis
        else delete p.originalPrice
        p.availability = 'in_stock'
      } else {
        delete p.price
        delete p.originalPrice
        delete p.priceCheckedAt
        p.availability = offer?.availability.includes('OUT') ? 'out_of_stock' : 'unknown'
      }
      summary.push(`${p.externalId}:${p.price ?? '-'}${p.priceFrom ? '(da)' : ''}:${p.availability}`)
      updated++
    }
  }

  writeFileSync(file, JSON.stringify(catalog, null, 1) + '\n')
  annotate('notice', `Riepilogo: ${summary.join(' | ')}`)
  annotate('notice', `Aggiornati ${updated} prodotti su ${amazon.length}.`)
} catch (e) {
  annotate('error', `Sincronizzazione Amazon non riuscita: ${e instanceof Error ? e.message : String(e)}`)
}
