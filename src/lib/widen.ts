import { NO_CATEGORY, categoryIdsOf, groupsOf, universeOf, type CategoryId } from '../config/categories'
import type { Filters, Product } from '../types/product'
import { matchesFilters } from './filters'

export interface Widen {
  label: string
  patch: Partial<Filters>
  count: number
}

/**
 * Mazzo finito: quali filtri allargare e quanti prodotti nuovi darebbero.
 * `fresh` = prodotti della sezione non ancora visti (né scartati né nei preferiti).
 */
export function widenSuggestions(f: Filters, fresh: Product[], limit = 3): Widen[] {
  const section = fresh[0] ? universeOf(fresh[0].category) : 'moda'
  const options: Omit<Widen, 'count'>[] = []
  if (f.onlyDeals) options.push({ label: 'Non solo offerte', patch: { onlyDeals: undefined } })
  if (f.gender !== 'tutti') options.push({ label: 'Donna e uomo', patch: { gender: 'tutti' } })
  if (f.priceMin !== undefined || f.priceMax !== undefined) options.push({ label: 'Qualsiasi prezzo', patch: { priceMin: undefined, priceMax: undefined } })
  if (f.stores.length) options.push({ label: 'Tutti i negozi', patch: { stores: [] } })
  if (f.brands.length) options.push({ label: 'Tutte le marche', patch: { brands: [] } })
  if (f.colors.length) options.push({ label: 'Tutti i colori', patch: { colors: [] } })
  if (f.categories.length) {
    const on = f.categories.includes(NO_CATEGORY) ? [] : f.categories
    const all = categoryIdsOf(section)
    for (const g of groupsOf(section)) {
      const ids = g.items.map((i) => i.id as CategoryId)
      if (ids.every((id) => on.includes(id))) continue
      const next = [...new Set([...on, ...ids])]
      options.push({ label: `Riattiva ${g.label}`, patch: { categories: next.length >= all.length ? [] : next } })
    }
  }
  return options
    .map((o) => ({ ...o, count: fresh.filter((p) => matchesFilters(p, { ...f, ...o.patch })).length }))
    .filter((o) => o.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
