// Dopo il build: pagine statiche che Google può leggere (l'app vera usa JavaScript e il routing
// con #, che i motori di ricerca indicizzano male). Una pagina per categoria (anche per uomo e
// donna), una per marca e una per le offerte, più sitemap.xml e robots.txt.
// Ogni prodotto porta all'app (#/p/<id>) e al negozio con link affiliato.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { SECTIONS, UNIVERSES, groupsOf, sectionOf, universeOf, type Universe } from '../src/config/categories.ts'
import { productUrl, STORES } from '../src/config/stores.ts'
import type { Product } from '../src/types/product.ts'

const SITE = 'https://swipeshopping.app'
const MAX_PRODUCTS = 48
const MIN_PRODUCTS = 6
const dist = new URL('../dist/', import.meta.url)
const products = (JSON.parse(readFileSync(new URL('catalog.json', dist), 'utf8')) as Product[]).filter(
  (p) => p.availability !== 'out_of_stock' && p.imageUrl,
)
const now = Date.now()
const builtAt = new Date(now)
const builtLabel = builtAt.toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'long', timeStyle: 'short' })

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

/** Prezzo solo se verificato entro la finestra del negozio (24 ore per Amazon). */
function price(p: Product) {
  if (p.price === undefined || !p.priceCheckedAt) return null
  if (now - Date.parse(p.priceCheckedAt) > STORES[p.store].priceMaxAgeHours * 3_600_000) return null
  const off = p.originalPrice && p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0
  return { text: `${p.priceFrom ? 'da ' : ''}${eur.format(p.price)}`, off: off >= 5 ? off : 0 }
}

// Ordine stabile ma vario: prima gli scontati, poi un mix che cambia a ogni aggiornamento.
const score = (p: Product) => (price(p)?.off ?? 0) * 1000 + (parseInt(p.externalId.slice(-4), 36) % 997)
// Stesso articolo in più taglie ("…, M" e "…, L"): uno solo per pagina.
const model = (p: Product) => p.title.replace(/,\s*[^,]{1,12}$/, '').toLowerCase()
function pick(list: Product[]) {
  const seen = new Set<string>()
  return [...list]
    .sort((a, b) => score(b) - score(a))
    .filter((p) => !seen.has(model(p)) && seen.add(model(p)))
    .slice(0, MAX_PRODUCTS)
}

interface Page {
  section: Universe
  slug: string
  title: string
  h1: string
  intro: string
  items: Product[]
  group: string
}
const pages: Page[] = []
const add = (page: Omit<Page, 'items'>, list: Product[]) => {
  if (list.length >= MIN_PRODUCTS) pages.push({ ...page, items: pick(list) })
}
const forGender = (list: Product[], g: 'uomo' | 'donna') => list.filter((p) => p.gender === g || p.gender === 'unisex')
const pathOf = (pg: Pick<Page, 'section' | 'slug'>) => `/${pg.section}/${pg.slug}/`

// --- Moda: categorie (anche per uomo e donna), marche, offerte ---
for (const group of groupsOf('moda')) {
  for (const item of group.items) {
    const list = products.filter((p) => p.category === item.id)
    const label = item.label
    const lower = label.toLowerCase()
    const slug = slugify(label)
    add(
      {
        section: 'moda',
        slug,
        group: group.label,
        title: `${label} di marca: offerte e novità | Swipe Shopping`,
        h1: `${label} di marca`,
        intro: `Le migliori ${lower} dei marchi più amati, con prezzi aggiornati e sconti. Salva quelle che ti piacciono e acquistale in un tocco.`,
      },
      list,
    )
    for (const g of ['donna', 'uomo'] as const) {
      add(
        {
          section: 'moda',
          slug: `${slug}-${g}`,
          group: group.label,
          title: `${label} da ${g} di marca: offerte | Swipe Shopping`,
          h1: `${label} da ${g}`,
          intro: `${label} da ${g} dei migliori marchi, scelte una per una e con lo sconto in evidenza.`,
        },
        forGender(list, g),
      )
    }
  }
}

const moda = products.filter((p) => universeOf(p.category) === 'moda')
const byBrand = (list: Product[]) => {
  const map = new Map<string, Product[]>()
  for (const p of list) if (p.brand) map.set(p.brand, [...(map.get(p.brand) ?? []), p])
  return map
}

for (const [brand, list] of byBrand(moda)) {
  // Marche di soli profumi (Dior, Lancôme…): il testo parla di profumi, non di abbigliamento.
  const what = list.every((p) => p.category === 'profumi') ? 'profumi' : 'abbigliamento, scarpe e accessori'
  add(
    {
      section: 'moda',
      slug: `marca-${slugify(brand)}`,
      group: 'Marche',
      title: `${brand}: ${what} in offerta | Swipe Shopping`,
      h1: `${brand} in offerta`,
      intro: `Tutti i prodotti ${brand} che trovi su Swipe Shopping: ${what} con prezzi aggiornati.`,
    },
    list,
  )
}

const deals = moda.filter((p) => (price(p)?.off ?? 0) > 0)
add(
  {
    section: 'moda',
    slug: 'offerte',
    group: 'Offerte',
    title: 'Offerte moda di oggi: abbigliamento e scarpe scontati | Swipe Shopping',
    h1: 'Offerte moda di oggi',
    intro: 'Abbigliamento, scarpe e accessori di marca scontati almeno del 5%, aggiornati più volte al giorno.',
  },
  deals,
)
for (const g of ['donna', 'uomo'] as const) {
  add(
    {
      section: 'moda',
      slug: `offerte-${g}`,
      group: 'Offerte',
      title: `Offerte moda ${g}: abbigliamento e scarpe scontati | Swipe Shopping`,
      h1: `Offerte moda ${g}`,
      intro: `Abbigliamento, scarpe e accessori da ${g} in sconto, dei migliori marchi.`,
    },
    forGender(deals, g),
  )
}

// --- Tech, Gadget, Snack: categorie, marche, offerte (niente uomo/donna) ---
const OTHER = {
  tech: { what: 'prodotti tech', deals: 'Offerte tech di oggi: cuffie, smartphone, gaming', dealsH1: 'Offerte tech di oggi',
    dealsIntro: 'Cuffie, smartphone, smartwatch, console e videogiochi scontati almeno del 5%, aggiornati più volte al giorno.' },
  gadget: { what: 'gadget e idee regalo', deals: 'Idee regalo in offerta: gadget, giochi e LEGO', dealsH1: 'Idee regalo in offerta oggi',
    dealsIntro: 'Gadget, lampade, tazze, giochi da tavolo, LEGO e regali curiosi scontati almeno del 5%, aggiornati più volte al giorno.' },
  snack: { what: 'snack, dolci e caffè', deals: 'Offerte snack di oggi: cioccolato, caramelle, caffè', dealsH1: 'Offerte snack di oggi',
    dealsIntro: 'Cioccolato, caramelle, biscotti, patatine, snack proteici, caffè e tè scontati almeno del 5%, aggiornati più volte al giorno.' },
} as const
for (const section of ['tech', 'gadget', 'snack'] as const) {
  const t = OTHER[section]
  const list = products.filter((p) => universeOf(p.category) === section)
  for (const group of groupsOf(section)) {
    for (const item of group.items) {
      const label = item.label
      add(
        {
          section,
          slug: slugify(label),
          group: group.label,
          title: `${label} in offerta: i migliori modelli | Swipe Shopping`,
          h1: `${label} in offerta`,
          intro: `${label} delle migliori marche con prezzi aggiornati e sconti in evidenza. Salva quelli che ti piacciono e confrontali con calma.`,
        },
        products.filter((p) => p.category === item.id),
      )
    }
  }
  for (const [brand, byB] of byBrand(list)) {
    add(
      {
        section,
        slug: `marca-${slugify(brand)}`,
        group: 'Marche',
        title: `${brand} in offerta: ${t.what} | Swipe Shopping`,
        h1: `${brand} in offerta`,
        intro: `I prodotti ${brand} che trovi su Swipe Shopping, con prezzi aggiornati e sconti.`,
      },
      byB,
    )
  }
  add(
    { section, slug: 'offerte', group: 'Offerte', title: `${t.deals} | Swipe Shopping`, h1: t.dealsH1, intro: t.dealsIntro },
    list.filter((p) => (price(p)?.off ?? 0) > 0),
  )
}

const CSS = `
:root{color-scheme:light dark;--bg:#fafafa;--card:#fff;--text:#171717;--muted:#737373;--line:#e5e5e5;--accent:#f43f5e}
@media (prefers-color-scheme:dark){:root{--bg:#0e0e10;--card:#1c1c1f;--text:#f4f4f6;--muted:#9d9da4;--line:#34343a}}
*{box-sizing:border-box}body{margin:0;font-family:Inter,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.5}
a{color:inherit}header{display:flex;justify-content:space-between;align-items:center;max-width:1100px;margin:0 auto;padding:14px 16px}
.logo{font-weight:900;font-size:20px;text-decoration:none;letter-spacing:-.02em}.logo span{color:var(--accent)}
.cta{background:var(--accent);color:#fff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:999px;font-size:14px}
main{max-width:1100px;margin:0 auto;padding:0 16px 32px}h1{font-size:28px;line-height:1.2;margin:12px 0 6px}.intro{color:var(--muted);margin:0 0 6px}
.note{color:var(--muted);font-size:12px;margin:0 0 18px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;list-style:none;padding:0;margin:0}
@media(min-width:640px){.grid{grid-template-columns:repeat(3,1fr)}}@media(min-width:960px){.grid{grid-template-columns:repeat(4,1fr)}}
.card{background:var(--card);border-radius:16px;overflow:hidden;border:1px solid var(--line);display:flex;flex-direction:column}
.img{position:relative;aspect-ratio:1;background:#fff;display:block}.img img{width:100%;height:100%;object-fit:contain;padding:12px}
.off{position:absolute;left:8px;bottom:8px;background:var(--accent);color:#fff;font-weight:800;font-size:12px;padding:2px 8px;border-radius:999px}
.body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:4px;flex:1}.brand{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.title{font-size:14px;font-weight:500;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.price{font-weight:700;margin-top:auto}.buy{margin-top:6px;text-align:center;background:var(--text);color:var(--bg);text-decoration:none;font-weight:600;font-size:14px;padding:8px;border-radius:999px}
.links{margin-top:32px}.links h2{font-size:16px;margin:20px 0 8px}.links ul{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:0}
.links a{display:inline-block;border:1px solid var(--line);background:var(--card);border-radius:999px;padding:6px 12px;font-size:13px;text-decoration:none}
footer{max-width:1100px;margin:0 auto;padding:16px;color:var(--muted);font-size:12px;border-top:1px solid var(--line)}`

function layout(opts: { title: string; description: string; path: string; body: string; jsonLd?: object; section: Universe }) {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}">
<link rel="canonical" href="${SITE}${opts.path}">
<link rel="icon" type="image/png" href="/icons/favicon-64.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Swipe Shopping">
<meta property="og:title" content="${esc(opts.title)}">
<meta property="og:description" content="${esc(opts.description)}">
<meta property="og:url" content="${SITE}${opts.path}">
<meta property="og:image" content="${SITE}/icons/og-image.png">
<style>${CSS}:root{--accent:${sectionOf(opts.section).color}}</style>
${opts.jsonLd ? `<script type="application/ld+json">${JSON.stringify(opts.jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body>
<header><a class="logo" href="/">Swipe<span>Shopping</span></a><a class="cta" href="/${opts.section === 'moda' ? '' : `?sezione=${opts.section}`}#/scopri">Apri l'app</a></header>
<main>${opts.body}</main>
<footer>I link verso i negozi sono link di affiliazione: se acquisti, potremmo ricevere una commissione senza costi aggiuntivi per te. In qualità di Affiliato Amazon, ricevo un guadagno dagli acquisti idonei. Prezzi e disponibilità sono indicativi e possono cambiare: fa fede quello mostrato dal negozio al momento dell'acquisto. · <a href="/#/privacy">Privacy e termini</a></footer>
</body>
</html>
`
}

function card(p: Product) {
  const pr = price(p)
  const url = productUrl(p)
  const app = `/#/p/${encodeURIComponent(p.id)}`
  return `<li class="card"><a class="img" href="${app}" title="Apri nell'app"><img src="${esc(p.imageUrl!)}" alt="${esc(p.title)}" loading="lazy" decoding="async" width="300" height="300">${pr?.off ? `<span class="off">-${pr.off}%</span>` : ''}</a><div class="body"><span class="brand">${esc(p.brand ?? '')}</span><h3 class="title"><a href="${app}" style="text-decoration:none">${esc(p.title)}</a></h3>${pr ? `<span class="price">${pr.text}</span>` : ''}${url ? `<a class="buy" href="${esc(url)}" rel="sponsored nofollow noopener" target="_blank">Vedi su ${STORES[p.store].name}</a>` : ''}</div></li>`
}

function linksSection(section: Universe, current: string) {
  const groups = new Map<string, Page[]>()
  for (const pg of pages)
    if (pg.section === section && pg.slug !== current && !/-(uomo|donna)$/.test(pg.slug)) groups.set(pg.group, [...(groups.get(pg.group) ?? []), pg])
  return `<nav class="links">${[...groups]
    .map(([g, list]) => `<h2>${esc(g)}</h2><ul>${list.map((pg) => `<li><a href="${pathOf(pg)}">${esc(pg.h1)}</a></li>`).join('')}</ul>`)
    .join('')}${otherSection(section)}</nav>`
}

const otherSection = (section: Universe) =>
  `<h2>Altre sezioni</h2><ul>${SECTIONS.filter((x) => x.id !== section)
    .map((x) => `<li><a href="/${x.id}/">${x.label}: ${esc(x.hint.toLowerCase())}</a></li>`)
    .join('')}</ul>`

for (const pg of pages) {
  const genderLinks = pages.filter((x) => x.section === pg.section && (x.slug === `${pg.slug}-donna` || x.slug === `${pg.slug}-uomo`))
  const body = `<h1>${esc(pg.h1)}</h1><p class="intro">${esc(pg.intro)}</p>
<p class="note">${pg.items.length} prodotti · prezzi aggiornati il ${builtLabel}${
    genderLinks.length ? ` · ${genderLinks.map((x) => `<a href="${pathOf(x)}">${x.slug.endsWith('donna') ? 'Donna' : 'Uomo'}</a>`).join(' · ')}` : ''
  }</p>
<ul class="grid">${pg.items.map(card).join('')}</ul>${linksSection(pg.section, pg.slug)}`
  const dir = new URL(`${pg.section}/${pg.slug}/`, dist)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    new URL('index.html', dir),
    layout({
      title: pg.title,
      description: pg.intro,
      path: pathOf(pg),
      body,
      section: pg.section,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: pg.h1,
        itemListElement: pg.items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/#/p/${encodeURIComponent(p.id)}`, name: p.title })),
      },
    }),
  )
}

// Indice di ogni sezione
const INDEX = {
  moda: {
    title: 'Moda di marca: categorie, marche e offerte | Swipe Shopping',
    description: 'Abbigliamento, scarpe, borse, accessori e profumi dei migliori marchi, divisi per categoria e marca, con le offerte del giorno.',
    h1: 'Moda di marca',
  },
  tech: {
    title: 'Tech in offerta: cuffie, smartphone, smartwatch, gaming | Swipe Shopping',
    description: 'Cuffie, auricolari, casse, smartphone, smartwatch, tablet, fotocamere, console e videogiochi delle migliori marche, con le offerte del giorno.',
    h1: 'Tech in offerta',
  },
  gadget: {
    title: 'Idee regalo e gadget curiosi: lampade, tazze, giochi, LEGO | Swipe Shopping',
    description: 'Gadget da cucina, lampade, tazze, giochi da tavolo, rompicapi, LEGO e regali divertenti delle migliori marche, con le offerte del giorno.',
    h1: 'Gadget e idee regalo',
  },
  snack: {
    title: 'Snack in offerta: cioccolato, caramelle, patatine, caffè | Swipe Shopping',
    description: 'Cioccolato, caramelle, biscotti, patatine, frutta secca, snack proteici, caffè e tè delle migliori marche, con le offerte del giorno.',
    h1: 'Snack in offerta',
  },
} as const
for (const section of UNIVERSES) {
  const ix = INDEX[section]
  mkdirSync(new URL(`${section}/`, dist), { recursive: true })
  writeFileSync(
    new URL(`${section}/index.html`, dist),
    layout({
      title: ix.title,
      description: ix.description,
      path: `/${section}/`,
      section,
      body: `<h1>${ix.h1}</h1><p class="intro">Scegli una categoria, una marca o le offerte del giorno. Oppure apri l'app e scopri i prodotti uno alla volta con uno swipe.</p>${linksSection(section, '')}`,
    }),
  )
}

const urls = ['/', ...UNIVERSES.map((u) => `/${u}/`), ...pages.map(pathOf)]
const lastmod = builtAt.toISOString().slice(0, 10)
writeFileSync(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
)
writeFileSync(new URL('robots.txt', dist), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)
console.log(`Pagine per Google: ${pages.length} (+ indice), sitemap con ${urls.length} indirizzi.`)
