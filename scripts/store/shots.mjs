// Screenshot e grafica per la scheda di Google Play, con i prodotti veri del catalogo.
// Si usa dal workflow "Grafica store" (serve internet per le foto Amazon): node scripts/store/shots.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const OUT = new URL('../../store-out/', import.meta.url)
mkdirSync(new URL('raw/', OUT), { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, locale: 'it-IT', colorScheme: 'light' })

async function page(mode, extra = {}) {
  const p = await ctx.newPage()
  const ls = {
    onboarded: true, coachSeen: true, 'analytics:consent': 'denied', 'sectionsMenuSeen:2': true,
    sectionsVisited: ['beauty', 'casa', 'gadget', 'snack', 'animali'], theme: 'light', mode, ...extra,
  }
  await p.addInitScript((entries) => {
    if (sessionStorage.getItem('seeded')) return
    localStorage.clear()
    for (const [k, v] of Object.entries(entries)) localStorage.setItem(`swipeshop:v1:${k}`, JSON.stringify(v))
    sessionStorage.setItem('seeded', '1')
  }, ls)
  return p
}

/** Aspetta che la foto del prodotto in cima sia caricata. */
async function ready(p) {
  await p.waitForFunction(() => [...document.images].some((i) => i.complete && i.naturalWidth > 100 && i.src.startsWith('https://m.media-amazon')), null, { timeout: 30000 }).catch(() => {})
  await p.waitForTimeout(800)
}

const shot = (p, name) => p.screenshot({ path: new URL(`raw/${name}.png`, OUT).pathname })

// 1. Moda: il mazzo
let p = await page('moda')
await p.goto(`${BASE}/#/scopri`)
await ready(p)
await shot(p, '1-moda')
// 2. Scheda prodotto
await p.getByRole('button', { name: /^Dettagli di/ }).first().click().catch(() => p.mouse.click(180, 300))
await p.waitForTimeout(1500)
await shot(p, '2-scheda')
await p.close()

// 3. Menu delle sezioni
p = await page('moda')
await p.goto(`${BASE}/#/scopri`)
await ready(p)
await p.getByRole('button', { name: /cambia sezione/ }).click()
await p.waitForTimeout(500)
await shot(p, '3-sezioni')
await p.close()

// 4-6. Tech, Gadget, Snack
for (const [n, mode] of [[4, 'tech'], [5, 'gadget'], [6, 'snack']]) {
  p = await page(mode)
  await p.goto(`${BASE}/#/scopri`)
  await ready(p)
  await shot(p, `${n}-${mode}`)
  await p.close()
}

// 7. Preferiti: salvo alcuni prodotti e apro la pagina
p = await page('moda')
await p.goto(`${BASE}/#/scopri`)
await ready(p)
for (let i = 0; i < 8; i++) {
  await p.getByRole('button', { name: 'Sì, salva nei preferiti' }).click()
  await p.waitForTimeout(450)
}
await p.goto(`${BASE}/#/preferiti`)
await p.waitForTimeout(3000)
await shot(p, '7-preferiti')
await p.close()

// 8. Filtri
p = await page('moda')
await p.goto(`${BASE}/#/filtri`)
await p.waitForTimeout(1500)
await shot(p, '8-filtri')
await p.close()

// --- Screenshot con titolo, 1080x1920 ---
const SLIDES = [
  ['1-moda', 'Scorri. Ti piace? Salvalo.', '#f43f5e'],
  ['2-scheda', 'Foto, dettagli e prezzo aggiornato', '#f43f5e'],
  ['3-sezioni', 'Moda, beauty, tech, casa e tanto altro', '#171717'],
  ['4-tech', 'Le offerte tech di ogni giorno', '#f97316'],
  ['5-gadget', 'Idee regalo curiose', '#8b5cf6'],
  ['6-snack', 'Dolci, salati e caffè', '#0d9488'],
  ['7-preferiti', 'Tutti i tuoi preferiti in un posto', '#f43f5e'],
  ['8-filtri', 'Solo quello che ti interessa', '#171717'],
]
mkdirSync(new URL('screenshot/', OUT), { recursive: true })
const frame = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 })
for (const [name, title, color] of SLIDES) {
  const img = readFileSync(new URL(`raw/${name}.png`, OUT)).toString('base64')
  await frame.setContent(`<!doctype html><html><body style="margin:0;width:360px;height:640px;overflow:hidden;background:${color};font-family:Inter,-apple-system,Roboto,sans-serif">
    <div style="height:118px;display:flex;align-items:center;justify-content:center;padding:0 28px;text-align:center;color:#fff;font-weight:800;font-size:27px;line-height:1.15;letter-spacing:-.02em">${title}</div>
    <div style="margin:0 auto;width:286px;height:508px;border-radius:26px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.35);border:5px solid #111;background:#fff">
      <img src="data:image/png;base64,${img}" style="width:100%;display:block">
    </div></body></html>`)
  await frame.waitForTimeout(200)
  await frame.screenshot({ path: new URL(`screenshot/${name}.png`, OUT).pathname })
}

// --- Grafica in evidenza, 1024x500 ---
const catalog = JSON.parse(readFileSync(new URL('../../public/catalog.json', import.meta.url), 'utf8'))
const pick = (cat) => catalog.find((x) => x.category === cat && x.imageUrl && x.availability !== 'out_of_stock')?.imageUrl
const imgs = ['sneakers', 'cuffie', 'costruzioni', 'cioccolato'].map(pick).filter(Boolean)
const logo = readFileSync(new URL('../../public/icons/icon-1024.png', import.meta.url)).toString('base64')
const fg = await browser.newPage({ viewport: { width: 1024, height: 500 } })
await fg.setContent(`<!doctype html><html><body style="margin:0;width:1024px;height:500px;overflow:hidden;background:linear-gradient(135deg,#fff 0%,#fff 48%,#ffe4e9 100%);font-family:Inter,-apple-system,Roboto,sans-serif;display:flex;align-items:center">
  <div style="width:470px;padding-left:56px">
    <img src="data:image/png;base64,${logo}" style="width:330px;margin:-60px 0 -50px -28px">
    <div style="font-size:30px;font-weight:800;color:#171717;line-height:1.2;letter-spacing:-.02em">Scorri, salva e trova<br>le offerte dei migliori marchi</div>
  </div>
  <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:30px 48px 30px 10px">
    ${imgs.map((u, i) => `<div style="height:200px;border-radius:24px;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;transform:rotate(${[-3, 2, 2, -2][i]}deg)"><img src="${u}" style="max-width:80%;max-height:80%"></div>`).join('')}
  </div></body></html>`)
await fg.waitForLoadState('networkidle')
await fg.waitForTimeout(1000)
await fg.screenshot({ path: new URL('grafica-in-evidenza.png', OUT).pathname })

await browser.close()
writeFileSync(new URL('README.txt', OUT), 'Generati da scripts/store/shots.mjs\n')
console.log('Grafica store pronta in store-out/')
