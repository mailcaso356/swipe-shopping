import type { Product } from '../types/product'
import { freshPrice } from './price'

/** Stesso articolo in più taglie o colori ("…, M" / "…, Nero"): conta come uno solo. */
const model = (p: Product) => `${p.brand ?? ''}|${p.title.replace(/,\s*[^,]{1,14}$/, '').toLowerCase()}`

/**
 * Prodotti simili per la scheda: stessa categoria, genere compatibile, prezzo vicino.
 * Niente personalizzazione: dipende solo dal prodotto aperto, non da cosa ha visto l'utente.
 */
export function similarProducts(product: Product, all: Product[], limit = 8): Product[] {
  const price = freshPrice(product)?.price ?? product.price
  const own = model(product)
  const candidates = all.filter(
    (p) =>
      p.id !== product.id &&
      p.category === product.category &&
      p.availability !== 'out_of_stock' &&
      !p.searchQuery &&
      (product.gender === 'unisex' || p.gender === product.gender || p.gender === 'unisex') &&
      model(p) !== own,
  )
  const score = (p: Product) => {
    const q = freshPrice(p)?.price ?? p.price
    // Distanza di prezzo in proporzione (0 = stesso prezzo); senza prezzo vanno in fondo.
    const gap = price && q ? Math.abs(Math.log(q / price)) : 2
    return gap - (p.brand && p.brand === product.brand ? 0.15 : 0)
  }
  const seen = new Set<string>()
  const byBrand = new Map<string, number>()
  const out: Product[] = []
  for (const p of candidates.sort((a, b) => score(a) - score(b))) {
    const m = model(p)
    const b = p.brand ?? ''
    // Varietà: al massimo 3 della stessa marca.
    if (seen.has(m) || (byBrand.get(b) ?? 0) >= 3) continue
    seen.add(m)
    byBrand.set(b, (byBrand.get(b) ?? 0) + 1)
    out.push(p)
    if (out.length >= limit) break
  }
  return out
}
