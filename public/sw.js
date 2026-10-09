// Service worker: l'app si apre subito anche con rete lenta e funziona offline con l'ultimo catalogo.
// - pagina e catalogo: prima la rete (per avere prezzi aggiornati), se manca si usa la copia salvata
// - file del build (nomi con hash, non cambiano mai): prima la copia salvata
const CACHE = 'swipeshop-v2'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  // Solo i nostri file: immagini Amazon, Supabase ecc. passano senza toccarli.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return

  const immutable = url.pathname.includes('/assets/') || url.pathname.includes('/icons/')
  event.respondWith(immutable ? cacheFirst(req) : networkFirst(req))
})

async function cacheFirst(req) {
  const cached = await caches.match(req)
  if (cached) return cached
  const res = await fetch(req)
  if (res.ok) (await caches.open(CACHE)).put(req, res.clone())
  return res
}

async function networkFirst(req) {
  try {
    const res = await fetch(req)
    if (res.ok) (await caches.open(CACHE)).put(req, res.clone())
    return res
  } catch (err) {
    const cached = await caches.match(req, { ignoreSearch: true })
    if (cached) return cached
    throw err
  }
}
