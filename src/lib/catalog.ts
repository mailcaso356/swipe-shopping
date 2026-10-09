import { buildExploreCards } from '../data/exploreCards'
import type { Product } from '../types/product'
import { checkCatalog } from './validate'

export interface CatalogResult {
  products: Product[]
  /** true se il catalogo verificato è vuoto e mostriamo le card "esplora" */
  exploreMode: boolean
  skipped: number
}

/**
 * Sorgente del catalogo. Oggi legge `public/catalog.json` (modificabile senza
 * ricompilare l'app); domani potrà chiamare un'API/backend con la stessa firma.
 */
export async function loadCatalog(signal?: AbortSignal): Promise<CatalogResult> {
  const res = await fetch(`${import.meta.env.BASE_URL}catalog.json`, { signal, cache: 'no-cache' })
  if (!res.ok) throw new Error(`Catalogo non disponibile (HTTP ${res.status})`)
  const { valid, invalid } = checkCatalog(await res.json())
  if (invalid.length) console.warn('Prodotti scartati dal catalogo:', invalid)
  const available = valid.filter((p) => p.availability !== 'out_of_stock')
  if (available.length === 0) return { products: buildExploreCards(), exploreMode: true, skipped: invalid.length }
  return { products: valid, exploreMode: false, skipped: invalid.length }
}
