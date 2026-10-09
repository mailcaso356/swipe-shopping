import type { Filters, Product } from '../types/product'
import { freshPrice } from './price'

export function matchesFilters(p: Product, f: Filters) {
  if (f.gender !== 'tutti' && p.gender !== f.gender && p.gender !== 'unisex') return false
  if (f.categories.length && !f.categories.includes(p.category)) return false
  if (f.brands.length && (!p.brand || !f.brands.includes(p.brand))) return false
  if (f.stores.length && !f.stores.includes(p.store)) return false
  if (f.sizes.length && !p.sizes?.some((s) => f.sizes.includes(s))) return false
  if (f.colors.length && !p.colors?.some((c) => f.colors.includes(c))) return false
  if (f.priceMin !== undefined || f.priceMax !== undefined) {
    // Con un filtro prezzo attivo escludiamo i prodotti senza prezzo verificato.
    const price = freshPrice(p)?.price
    if (price === undefined) return false
    if (f.priceMin !== undefined && price < f.priceMin) return false
    if (f.priceMax !== undefined && price > f.priceMax) return false
  }
  return true
}

export function sortProducts(list: Product[], sort: Filters['sort']) {
  const sorted = [...list]
  if (sort === 'novita') return sorted.sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  const dir = sort === 'prezzo_asc' ? 1 : -1
  // I prodotti senza prezzo vanno in fondo.
  return sorted.sort((a, b) => {
    const pa = freshPrice(a)?.price
    const pb = freshPrice(b)?.price
    if (pa === undefined) return pb === undefined ? 0 : 1
    if (pb === undefined) return -1
    return (pa - pb) * dir
  })
}

export function activeFilterCount(f: Filters) {
  return (
    (f.gender !== 'tutti' ? 1 : 0) +
    f.categories.length +
    f.brands.length +
    f.stores.length +
    f.sizes.length +
    f.colors.length +
    (f.priceMin !== undefined ? 1 : 0) +
    (f.priceMax !== undefined ? 1 : 0)
  )
}

/** Valori distinti presenti nel catalogo, per mostrare solo filtri utili. */
export function facetValues(products: Product[]) {
  const brands = new Set<string>()
  const stores = new Set<Product['store']>()
  const sizes = new Set<string>()
  const colors = new Set<string>()
  for (const p of products) {
    if (p.brand) brands.add(p.brand)
    stores.add(p.store)
    p.sizes?.forEach((s) => sizes.add(s))
    p.colors?.forEach((c) => colors.add(c))
  }
  const sort = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b, 'it'))
  return { brands: sort(brands), stores: [...stores], sizes: [...sizes], colors: sort(colors) }
}
