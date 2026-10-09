import { CATEGORY_GROUPS } from '../config/categories'
import type { Product } from '../types/product'

/**
 * Card "esplora" usate finché il catalogo verificato è vuoto.
 * Non sono prodotti inventati: ognuna apre una vera ricerca su Amazon.it
 * con il tracking ID, senza prezzo né foto.
 */
const ONLY_WOMEN = new Set(['vestiti'])

export function buildExploreCards(): Product[] {
  const cards: Product[] = []
  for (const group of CATEGORY_GROUPS) {
    for (const item of group.items) {
      for (const gender of ['donna', 'uomo'] as const) {
        if (gender === 'uomo' && ONLY_WOMEN.has(item.id)) continue
        const externalId = `esplora-${item.id}-${gender}`
        cards.push({
          id: `amazon:${externalId}`,
          store: 'amazon',
          externalId,
          title: `${item.label} ${gender}`,
          gender,
          category: item.id,
          availability: 'unknown',
          addedAt: '2026-01-01T00:00:00Z',
          searchQuery: `${item.label} ${gender}`,
        })
      }
    }
  }
  return cards
}
