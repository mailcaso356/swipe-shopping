// Email "prezzo sceso": avvisa chi ha un preferito che oggi costa meno di quando l'ha salvato.
// Gira su GitHub Actions dopo l'aggiornamento del catalogo. Regole:
// - al massimo un'email ogni 3 giorni per persona, mai due volte per lo stesso calo;
// - solo account confermati che non hanno spento gli avvisi dal Profilo;
// - niente link affiliati, prezzi o testi Amazon nell'email (regole Amazon Associates):
//   l'email porta all'app, dove il prezzo aggiornato si vede accanto al prodotto.
// Uso: `npm run alerts:price` (aggiungi `-- --dry` per vedere chi riceverebbe l'email senza inviarla).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlsqxxcztysnlijznjng.supabase.co'
const { SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY } = process.env
const DRY = process.argv.includes('--dry')
const FROM = 'Swipe Shopping <noreply@swipeshopping.app>'
const APP_URL = 'https://swipeshopping.app'
const MIN_GAP_MS = 3 * 24 * 3_600_000
const PRICE_MAX_AGE_MS = 24 * 3_600_000

if (!SUPABASE_SERVICE_ROLE_KEY || (!RESEND_API_KEY && !DRY)) {
  console.log('::notice::Avvisi prezzo non attivi: mancano i secrets SUPABASE_SERVICE_ROLE_KEY e/o RESEND_API_KEY.')
  process.exit(0)
}

interface Product {
  id: string
  price?: number
  priceFrom?: boolean
  priceCheckedAt?: string
  availability?: string
}
interface WishItem {
  product: Product
}

const catalog = JSON.parse(readFileSync(new URL('../public/catalog.json', import.meta.url), 'utf8')) as Product[]
const byId = new Map(catalog.map((p) => [p.id, p]))
const now = Date.now()

/** Prezzo attuale se è sceso di almeno 1 € e del 3% rispetto a quando è stato salvato (stesse regole dell'app). */
function droppedPrice(saved: Product) {
  const current = byId.get(saved.id)
  if (!current || current.availability === 'out_of_stock') return null
  if (current.price === undefined || !current.priceCheckedAt || saved.price === undefined || !saved.priceCheckedAt) return null
  if (now - Date.parse(current.priceCheckedAt) > PRICE_MAX_AGE_MS) return null
  if ((saved.priceFrom === true) !== (current.priceFrom === true)) return null
  const diff = saved.price - current.price
  return diff >= 1 && diff / saved.price >= 0.03 ? current.price : null
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function all<T>(table: string, columns: string, filter?: (q: any) => any): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    let q = db.from(table).select(columns).range(from, from + 999)
    if (filter) q = filter(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data as T[]))
    if (!data || data.length < 1000) return rows
  }
}

function email(count: number) {
  const subject = count === 1 ? 'Un tuo preferito ora costa meno' : `${count} tuoi preferiti ora costano meno`
  const intro =
    count === 1
      ? 'Il prezzo di un prodotto che hai salvato è sceso da quando l’hai messo nei preferiti.'
      : `Il prezzo di ${count} prodotti che hai salvato è sceso da quando li hai messi nei preferiti.`
  const link = `${APP_URL}/#/preferiti`
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f5f5f5;padding:32px 16px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:20px;padding:32px 28px;text-align:center">
    <img src="${APP_URL}/icons/icon-192.png" width="72" height="72" alt="Swipe Shopping" style="border-radius:16px">
    <h1 style="font-size:22px;color:#171717;margin:20px 0 8px">${subject}</h1>
    <p style="font-size:15px;line-height:1.5;color:#525252;margin:0 0 24px">${intro} Aprili nell’app per vedere il prezzo aggiornato prima che cambi.</p>
    <a href="${link}" style="display:inline-block;background:#f43f5e;color:#fff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 28px;border-radius:999px">Vedi i miei preferiti</a>
    <p style="font-size:12px;line-height:1.5;color:#a3a3a3;margin:28px 0 0">Ricevi questa email perché hai un account su Swipe Shopping. Ti scriviamo al massimo ogni 3 giorni.<br><a href="${APP_URL}/#/profilo" style="color:#a3a3a3">Non voglio più questi avvisi</a></p>
  </div>
</div>`
  const text = `${subject}\n\n${intro}\nVedi i tuoi preferiti: ${link}\n\nNon vuoi più questi avvisi? Spegnili dal Profilo: ${APP_URL}/#/profilo`
  return { subject, html, text }
}

const users = await all<{ user_id: string; wishlist: WishItem[] }>('user_data', 'user_id, wishlist', (q) => q.eq('email_alerts', true))
const sentLog = new Map(
  (await all<{ user_id: string; last_sent_at: string | null; notified: Record<string, number> }>('price_alerts', 'user_id, last_sent_at, notified')).map(
    (r) => [r.user_id, r],
  ),
)

let sent = 0
let failed = 0
for (const u of users) {
  const log = sentLog.get(u.user_id)
  if (log?.last_sent_at && now - Date.parse(log.last_sent_at) < MIN_GAP_MS) continue
  const notified = { ...(log?.notified ?? {}) }
  const fresh: Record<string, number> = {}
  for (const w of Array.isArray(u.wishlist) ? u.wishlist : []) {
    const price = w?.product?.id ? droppedPrice(w.product) : null
    // Già avvisato a questo prezzo (o più basso): aspetto un nuovo calo di almeno 1 €.
    if (price === null || (notified[w.product.id] !== undefined && price > notified[w.product.id] - 1)) continue
    fresh[w.product.id] = price
  }
  const count = Object.keys(fresh).length
  if (count === 0) continue

  const { data, error } = await db.auth.admin.getUserById(u.user_id)
  const to = data?.user?.email
  if (error || !to || !data.user.email_confirmed_at) continue

  const { subject, html, text } = email(count)
  if (DRY) {
    console.log(`[prova] ${to}: ${subject}`)
    continue
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      html,
      text,
      headers: { 'List-Unsubscribe': `<${APP_URL}/#/profilo>` },
    }),
  })
  if (!res.ok) {
    failed++
    console.log(`::warning::Email non inviata (${res.status}): ${(await res.text()).slice(0, 300)}`)
    continue
  }
  const { error: upsertError } = await db
    .from('price_alerts')
    .upsert({ user_id: u.user_id, last_sent_at: new Date().toISOString(), notified: { ...notified, ...fresh } })
  if (upsertError) console.log(`::warning::price_alerts: ${upsertError.message}`)
  sent++
  await new Promise((r) => setTimeout(r, 600)) // Resend: max 2 richieste al secondo
}

console.log(`Avvisi prezzo: ${sent} email inviate${failed ? `, ${failed} non riuscite` : ''} (${users.length} account con avvisi attivi).`)
