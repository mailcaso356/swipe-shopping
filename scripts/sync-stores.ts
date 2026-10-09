// Aggiorna in public/catalog.json i prodotti dei negozi diversi da Amazon, letti dalle loro pagine pubbliche:
// - Benetton: negozio Shopify, elenco prodotti in JSON per collezione (una richiesta ogni 250 prodotti)
// - Calzedonia: sitemap dei prodotti + dati strutturati (JSON-LD) della pagina, rispettando il Crawl-delay
// Niente doppioni: se un prodotto c'è già su Amazon teniamo solo quello di Amazon.
// Uso: `npm run sync:stores` (aggiunge `-- --dry` per vedere il risultato senza scrivere nulla).
import { readFileSync, writeFileSync } from 'node:fs'
import { classify } from './classify.ts'
import { normalizeBrand } from './search-plan.ts'
import { detectColors } from '../src/config/colors.ts'
import { DETAIL_SHARDS, detailShard, type ProductDetails } from '../src/lib/details.ts'

const DRY = process.argv.includes('--dry')
const DEBUG = !!process.env.STORES_DEBUG
const ONLY = process.argv.find((a) => a.startsWith('--store='))?.slice(8)
const UA = 'Mozilla/5.0 (compatible; SwipeShoppingBot/1.0; +https://swipeshopping.app)'

const file = new URL('../public/catalog.json', import.meta.url)
const catalog = JSON.parse(readFileSync(file, 'utf8')) as Record<string, any>[]
const previous = new Map(catalog.map((p) => [p.id, p]))
const now = new Date().toISOString()

const annotate = (level: 'error' | 'warning' | 'notice', msg: string) =>
  console.log(`::${level}::${msg.replace(/\r?\n/g, ' ').slice(0, 4000)}`)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const lastCall = new Map<string, number>()

/** GET con pausa minima per sito (Crawl-delay) e qualche nuovo tentativo sugli errori temporanei. */
async function get(url: string, gapMs: number): Promise<string> {
  const host = new URL(url).host
  for (let attempt = 0; ; attempt++) {
    await sleep(Math.max(0, (lastCall.get(host) ?? 0) + gapMs - Date.now()))
    lastCall.set(host, Date.now())
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'it-IT,it;q=0.9' } }).catch((e) => e as Error)
    if (res instanceof Response && res.ok) return res.text()
    const status = res instanceof Response ? res.status : 0
    if (attempt < 3 && (status === 0 || status === 429 || status >= 500)) {
      await sleep(5000 * 2 ** attempt)
      continue
    }
    throw new Error(`${url}: ${res instanceof Response ? `HTTP ${status}` : res.message}`)
  }
}

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&agrave;/g, 'à')
    .replace(/&egrave;/g, 'è')
    .replace(/&eacute;/g, 'é')
    .replace(/&igrave;/g, 'ì')
    .replace(/&ograve;/g, 'ò')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

/** Punti elenco dalla descrizione: frasi brevi, al massimo 5. */
const features = (html: string) =>
  decode(html.replace(/<br\s*\/?>|<\/p>|<\/li>/gi, '. '))
    .split(/(?<=\.)\s+/)
    .map((s) => s.replace(/[.\s]+$/, '').trim())
    .filter((s) => s.length > 3 && s.length < 200)
    .slice(0, 5)

interface Found {
  product: Record<string, any>
  details?: ProductDetails
}

function makeProduct(base: {
  store: string
  externalId: string
  title: string
  brand: string
  gender: string
  category: string
  imageUrl: string
  url: string
  price: number
  originalPrice?: number
  priceFrom?: boolean
  colorText?: string
}) {
  const id = `${base.store}:${base.externalId}`
  const p: Record<string, any> = {
    id,
    store: base.store,
    externalId: base.externalId,
    title: base.title,
    brand: base.brand,
    gender: base.gender,
    category: classify(base.title, base.category),
    imageUrl: base.imageUrl,
    affiliateUrl: base.url,
    price: Math.round(base.price * 100) / 100,
    priceCheckedAt: now,
    availability: 'in_stock',
    addedAt: previous.get(id)?.addedAt ?? now,
  }
  if (base.originalPrice && base.originalPrice > base.price) p.originalPrice = Math.round(base.originalPrice * 100) / 100
  if (base.priceFrom) p.priceFrom = true
  const colors = detectColors(`${base.title} ${base.colorText ?? ''}`)
  if (colors.length) p.colors = colors
  return p
}

// ---------------------------------------------------------------- Benetton (Shopify)
// Il negozio italiano dà i prodotti (titoli, prezzi in euro, foto) ma non le collezioni a chi si collega
// da fuori Italia. Genere e categoria li prendiamo dalle collezioni del negozio internazionale
// (world.benetton.com), che usa gli stessi codici articolo: il codice è la prima parte dello SKU.

/** Collezioni del negozio internazionale → categoria e genere dell'app. Solo adulti, solo categorie che l'app conosce. */
const BENETTON: [handle: string, category: string, gender: 'donna' | 'uomo'][] = [
  ['hoodies-women', 'felpe', 'donna'],
  ['sweatshirts-without-hood-women', 'felpe', 'donna'],
  ['sweaters-women-crew-neck', 'maglioni', 'donna'],
  ['sweaters-women-high-neck', 'maglioni', 'donna'],
  ['cardigans-women', 'maglioni', 'donna'],
  ['cashmere-knitwear-women', 'maglioni', 'donna'],
  ['blouses-women', 'camicie', 'donna'],
  ['tops-t-shirts-women-new', 'tshirt', 'donna'],
  ['polos-women', 'tshirt', 'donna'],
  ['jeans-women', 'jeans', 'donna'],
  ['chinos-women', 'pantaloni', 'donna'],
  ['trousers-women-new', 'pantaloni', 'donna'],
  ['dresses-women', 'vestiti', 'donna'],
  ['coats-women', 'cappotti', 'donna'],
  ['parka-women', 'cappotti', 'donna'],
  ['light-jackets-women', 'giacche', 'donna'],
  ['padded-jackets-women', 'giacche', 'donna'],
  ['puffer-jackets-women', 'giacche', 'donna'],
  ['blazers-women', 'giacche', 'donna'],
  ['bags-backpacks-women', 'borse', 'donna'],
  ['backpacks-women', 'zaini', 'donna'],
  ['belts-women', 'cinture', 'donna'],
  ['hats-caps-women', 'cappellini', 'donna'],
  ['boots-ankle-boots-women', 'stivali', 'donna'],
  ['flats-low-top-shoes-women', 'scarpe_eleganti', 'donna'],
  ['hoodies-men', 'felpe', 'uomo'],
  ['crew-neck-sweatshirts-men', 'felpe', 'uomo'],
  ['crew-neck-sweaters-men', 'maglioni', 'uomo'],
  ['high-neck-sweaters-men', 'maglioni', 'uomo'],
  ['cardigans-men', 'maglioni', 'uomo'],
  ['cashmere-knitwear-men', 'maglioni', 'uomo'],
  ['shirts-men-check', 'camicie', 'uomo'],
  ['shirts-men-button-down', 'camicie', 'uomo'],
  ['shirts-men-patterned', 'camicie', 'uomo'],
  ['t-shirts-men-new', 'tshirt', 'uomo'],
  ['polos-men', 'tshirt', 'uomo'],
  ['jeans-men', 'jeans', 'uomo'],
  ['chinos-men', 'pantaloni', 'uomo'],
  ['cargo-trousers-men', 'pantaloni', 'uomo'],
  ['elegant-trousers-men', 'pantaloni', 'uomo'],
  ['coats-men', 'cappotti', 'uomo'],
  ['parkas-men', 'cappotti', 'uomo'],
  ['light-jackets-men', 'giacche', 'uomo'],
  ['padded-jackets-men', 'giacche', 'uomo'],
  ['puffer-jackets-men', 'giacche', 'uomo'],
  ['blazers-men', 'giacche', 'uomo'],
  ['bags-men-backpacks', 'zaini', 'uomo'],
  ['bum-bags-men', 'borselli', 'uomo'],
  ['belts-men', 'cinture', 'uomo'],
  ['hats-caps-men', 'cappellini', 'uomo'],
  ['flat-shoes-men', 'scarpe_eleganti', 'uomo'],
]
const BENETTON_BRANDS: Record<string, string> = { UCB: 'Benetton', SISLEY: 'Sisley' }
/** Codice articolo: "1VCPG101D_00V_82" → "1VCPG101D" */
const styleOf = (sku: unknown) => String(sku ?? '').split('_')[0].toUpperCase()

async function shopifyPages(base: string, onPage: (products: any[]) => void) {
  for (let page = 1; page <= 60; page++) {
    const list: any[] = JSON.parse(await get(`${base}${base.includes('?') ? '&' : '?'}limit=250&page=${page}`, 1000)).products ?? []
    onPage(list)
    if (list.length < 250) return
  }
}

async function syncBenetton(): Promise<Found[]> {
  // 1. Codice articolo → genere e categoria, dalle collezioni internazionali
  const kinds = new Map<string, { category: string; gender: string }>()
  let missing = 0
  for (const [handle, category, gender] of BENETTON) {
    let count = 0
    try {
      await shopifyPages(`https://world.benetton.com/collections/${handle}/products.json`, (list) => {
        count += list.length
        for (const item of list) {
          for (const style of new Set((item.variants ?? []).map((v: any) => styleOf(v.sku)))) {
            if (!style) continue
            const known = kinds.get(style)
            if (!known) kinds.set(style, { category, gender })
            else if (known.gender !== gender) known.gender = 'unisex'
          }
        }
      })
    } catch (e) {
      annotate('warning', `Benetton ${handle}: ${e instanceof Error ? e.message : String(e)}`)
    }
    if (count === 0) missing++
    if (DEBUG) console.log(`debug benetton ${handle}: ${count} prodotti`)
  }

  // 2. Prodotti del negozio italiano: titolo, prezzo in euro, foto
  const found = new Map<string, Found>()
  let total = 0
  await shopifyPages('https://it.benetton.com/products.json', (list) => {
    total += list.length
    for (const item of list) {
      const id = `benetton:${item.id}`
      const brand = BENETTON_BRANDS[String(item.vendor).toUpperCase()]
      const kind = (item.variants ?? []).map((v: any) => kinds.get(styleOf(v.sku))).find(Boolean)
      const variants = (item.variants ?? []).filter((v: any) => v.available && Number(v.price) > 0)
      const images = (item.images ?? []).map((i: any) => String(i.src)).filter((s: string) => s.startsWith('https://'))
      if (found.has(id) || !brand || !kind || !variants.length || !images.length || !item.handle) continue
      const prices = variants.map((v: any) => Number(v.price))
      const price = Math.min(...prices)
      const cheapest = variants.find((v: any) => Number(v.price) === price)
      const sized = (src: string) => `${src}${src.includes('?') ? '&' : '?'}width=900`
      const product = makeProduct({
        store: 'benetton',
        externalId: String(item.id),
        title: decode(String(item.title)),
        brand,
        gender: kind.gender,
        category: kind.category,
        imageUrl: sized(images[0]),
        url: `https://it.benetton.com/products/${item.handle}`,
        price,
        originalPrice: Number(cheapest?.compare_at_price) || undefined,
        priceFrom: new Set(prices).size > 1,
        // Il colore è nel nome della pagina (es. "...-bianco-panna-1vcpg101d_00v")
        colorText: String(item.handle).replace(/-/g, ' '),
      })
      const f = features(String(item.body_html ?? ''))
      const more = images.slice(1, 7).map(sized)
      found.set(id, {
        product,
        details: more.length || f.length ? { ...(more.length ? { images: more } : {}), ...(f.length ? { features: f } : {}) } : undefined,
      })
    }
  })
  annotate(
    'notice',
    `Benetton: ${kinds.size} codici da ${BENETTON.length - missing}/${BENETTON.length} collezioni, ${total} prodotti sul sito italiano, ${found.size} tenuti.`,
  )
  return [...found.values()]
}

// ---------------------------------------------------------------- Calzedonia (Salesforce Commerce Cloud)

/** Dal nome della pagina: solo ciò che rientra nelle categorie dell'app (soprattutto calze e collant). */
const CALZEDONIA_TYPES: [category: string, slug: RegExp][] = [
  ['calze', /collant|calz[ae]|calzin|gambalett|parigin|fantasmin|sottopied|sock/],
  ['jeans', /jeans/],
  ['pantaloni', /leggings|pantalon|jogger/],
]
const CALZEDONIA_SKIP = /bambin|bimb|kid|girl|boy|baby|neonat|regalo|gift|confezione_regalo/
/** Pagine lette per esecuzione: con Crawl-delay di 5 secondi sono circa 35 minuti. */
const CALZEDONIA_MAX_PAGES = Number(process.env.CALZEDONIA_MAX_PAGES ?? 420)
const CALZEDONIA_GAP_MS = 5000

function productLd(html: string): any | null {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1])
      const list = Array.isArray(data) ? data : data['@graph'] ?? [data]
      const product = list.find((d: any) => d?.['@type'] === 'Product')
      if (product) return product
    } catch {}
  }
  return null
}

async function syncCalzedonia(): Promise<Found[]> {
  const xml = await get('https://www.calzedonia.com/it/sitemap_0-product.xml', CALZEDONIA_GAP_MS)
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()).filter((u) => u.includes('/it/product/'))
  const wanted = new Map<string, string>()
  for (const url of urls) {
    const slug = decodeURIComponent(url.split('/product/')[1] ?? '').toLowerCase()
    if (CALZEDONIA_SKIP.test(slug)) continue
    const type = CALZEDONIA_TYPES.find(([, re]) => re.test(slug))
    if (type) wanted.set(url, type[0])
  }
  // Prima i prodotti già in catalogo (dal prezzo più vecchio), poi quelli nuovi.
  const knownByUrl = new Map(catalog.filter((p) => p.store === 'calzedonia').map((p) => [p.affiliateUrl, p]))
  const order = [...wanted.keys()].sort((a, b) => {
    const pa = knownByUrl.get(a)?.priceCheckedAt ?? ''
    const pb = knownByUrl.get(b)?.priceCheckedAt ?? ''
    return (knownByUrl.has(a) ? 0 : 1) - (knownByUrl.has(b) ? 0 : 1) || pa.localeCompare(pb)
  })
  const found: Found[] = []
  let read = 0
  let rejected = 0
  for (const url of order.slice(0, CALZEDONIA_MAX_PAGES)) {
    read++
    let ld: any
    try {
      ld = productLd(await get(url, CALZEDONIA_GAP_MS))
    } catch (e) {
      annotate('warning', `Calzedonia: ${e instanceof Error ? e.message : String(e)}`)
      continue
    }
    // La categoria può essere un percorso ("int_woman/...") o un elenco (["Donna", "Calze", ...]).
    const path = [ld?.category].flat(3).join('/').toLowerCase()
    const gender = /(^|[_/])(woman|women|donna)/.test(path) ? 'donna' : /(^|[_/])(man|men|uomo)/.test(path) ? 'uomo' : null
    const offers = [ld?.offers].flat(3).filter(Boolean)
    const offer = offers.find((o: any) => !/OutOfStock|SoldOut|Discontinued/i.test(String(o.availability ?? ''))) ?? null
    const price = Number(offer?.price ?? offer?.lowPrice)
    const images = [ld?.image].flat(3).filter((s: unknown) => typeof s === 'string' && s.startsWith('https://')) as string[]
    const rating = Number(ld?.aggregateRating?.ratingValue)
    const reviews = Number(ld?.aggregateRating?.reviewCount)
    // Articoli con recensioni scarse (almeno 5 recensioni e media sotto 3,5) non li proponiamo.
    const poor = reviews >= 5 && rating < 3.5
    if (DEBUG) console.log(`debug calzedonia ${url}: ${JSON.stringify({ ...ld, review: undefined, description: undefined, image: undefined }).slice(0, 900)}`)
    if (!ld?.name || !ld?.sku || !gender || /kid|girl|boy|baby/.test(path) || !(price > 0) || !images.length || poor) {
      rejected++
      continue
    }
    const product = makeProduct({
      store: 'calzedonia',
      externalId: String(ld.sku),
      title: decode(String(ld.name)),
      brand: 'Calzedonia',
      gender,
      category: wanted.get(url)!,
      imageUrl: images[0],
      url,
      price,
      colorText: String(ld.color ?? ''),
    })
    const f = features(String(ld.description ?? ''))
    const more = images.slice(1, 7)
    found.push({
      product,
      details: more.length || f.length ? { ...(more.length ? { images: more } : {}), ...(f.length ? { features: f } : {}) } : undefined,
    })
  }
  // Prodotti non riletti in questa esecuzione ma ancora sul sito: restano con il prezzo della volta prima.
  const readIds = new Set(found.map((f) => f.product.id))
  const kept = order
    .slice(CALZEDONIA_MAX_PAGES)
    .map((u) => knownByUrl.get(u))
    .filter((p): p is Record<string, any> => !!p && !readIds.has(p.id))
    .map((product) => ({ product }))
  annotate(
    'notice',
    `Calzedonia: ${wanted.size} pagine utili su ${urls.length}, lette ${read}, ${found.length} prodotti validi, ${rejected} scartati, ${kept.length} rimasti dalla volta prima.`,
  )
  return [...found, ...kept]
}

// ---------------------------------------------------------------- Doppioni con Amazon

const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2),
  )

/** Codici articolo (lettere e cifre insieme, almeno 6 caratteri): se compaiono anche su Amazon è lo stesso prodotto. */
const codes = (s: string) =>
  s
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length >= 6 && /\d/.test(t) && /[A-Z]/.test(t))

function dropAmazonDuplicates(items: Found[]) {
  const amazon = catalog.filter((p) => p.store === 'amazon')
  const byBrand = new Map<string, { words: Set<string>; category: string }[]>()
  const amazonCodes = new Set<string>()
  for (const p of amazon) {
    const key = normalizeBrand(String(p.brand ?? ''))
    if (!byBrand.has(key)) byBrand.set(key, [])
    byBrand.get(key)!.push({ words: words(p.title), category: p.category })
    codes(p.title).forEach((c) => amazonCodes.add(c))
  }
  let dropped = 0
  const kept = items.filter(({ product }) => {
    const brand = normalizeBrand(product.brand)
    const candidates = [...byBrand].filter(([b]) => b.includes(brand) || (b.length > 3 && brand.includes(b))).flatMap(([, list]) => list)
    const ownCodes = codes(`${product.externalId} ${product.title} ${product.affiliateUrl}`)
    const sameCode = ownCodes.some((c) => amazonCodes.has(c))
    const t = words(product.title)
    const similar = candidates.some((a) => {
      if (a.category !== product.category) return false
      let common = 0
      for (const w of t) if (a.words.has(w)) common++
      return common / Math.min(t.size, a.words.size) >= 0.75
    })
    if (sameCode || similar) dropped++
    return !(sameCode || similar)
  })
  annotate('notice', `Doppioni già su Amazon scartati: ${dropped}.`)
  return kept
}

// ---------------------------------------------------------------- Scrittura

const SOURCES: Record<string, () => Promise<Found[]>> = { benetton: syncBenetton, calzedonia: syncCalzedonia }
const results = new Map<string, Found[]>()
await Promise.all(
  Object.entries(SOURCES)
    .filter(([store]) => !ONLY || ONLY === store)
    .map(async ([store, sync]) => {
      try {
        const items = await sync()
        // Una lettura vuota è quasi sempre un errore del sito: teniamo i prodotti della volta prima.
        if (items.length) results.set(store, items)
        else annotate('warning', `${store}: nessun prodotto letto, catalogo del negozio lasciato invariato.`)
      } catch (e) {
        annotate('error', `${store}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }),
)

const fresh = dropAmazonDuplicates([...results.values()].flat())
const synced = new Set(results.keys())
const next = [...catalog.filter((p) => !synced.has(p.store)), ...fresh.map((f) => f.product)]

for (const [store, items] of results) {
  const sample = items.slice(0, 3).map((f) => `${f.product.title} | ${f.product.category}/${f.product.gender} | ${f.product.price} €`)
  console.log(`${store}: ${items.length} letti. Esempi: ${sample.join(' ; ')}`)
}
annotate('notice', `Catalogo: ${next.length} prodotti, di cui ${fresh.length} da ${[...synced].join(', ') || 'nessun negozio'}.`)

if (DRY) {
  console.log('Prova: nessun file scritto.')
} else if (synced.size) {
  writeFileSync(file, JSON.stringify(next, null, 1) + '\n')
  const dir = new URL('../public/details/', import.meta.url)
  const keptIds = new Set(fresh.map((f) => f.product.id))
  for (let n = 0; n < DETAIL_SHARDS; n++) {
    const shardFile = new URL(`${n}.json`, dir)
    let shard: Record<string, ProductDetails> = {}
    try {
      shard = JSON.parse(readFileSync(shardFile, 'utf8'))
    } catch {}
    for (const id of Object.keys(shard)) if (synced.has(id.split(':')[0]) && !keptIds.has(id)) delete shard[id]
    for (const f of fresh) if (f.details && detailShard(f.product.id) === n) shard[f.product.id] = f.details
    writeFileSync(shardFile, JSON.stringify(shard))
  }
}
