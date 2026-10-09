// Importi con estensione .ts: questo file è usato anche da `npm run check:catalog` (Node).
import { isCategoryId } from '../config/categories.ts'
import { STORES, isStoreId, productUrl } from '../config/stores.ts'
import type { Product } from '../types/product'

const GENDERS = ['uomo', 'donna', 'unisex']
const AVAILABILITY = ['in_stock', 'out_of_stock', 'unknown']
const isIsoDate = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v))
const isPositive = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0

/** Restituisce l'elenco degli errori di una voce del catalogo (vuoto = valida). */
export function validateProduct(raw: unknown): string[] {
  const errors: string[] = []
  if (!raw || typeof raw !== 'object') return ['la voce non è un oggetto']
  const p = raw as Record<string, unknown>

  if (typeof p.store !== 'string' || !isStoreId(p.store)) errors.push(`negozio sconosciuto: ${String(p.store)}`)
  if (typeof p.externalId !== 'string' || !p.externalId) errors.push('externalId mancante')
  if (p.store === 'amazon' && typeof p.externalId === 'string' && !/^[A-Z0-9]{10}$/.test(p.externalId)) {
    errors.push(`ASIN non valido: ${p.externalId} (servono 10 caratteri maiuscoli/cifre)`)
  }
  if (typeof p.id !== 'string' || p.id !== `${p.store}:${p.externalId}`) {
    errors.push(`id deve essere "${String(p.store)}:${String(p.externalId)}"`)
  }
  if (typeof p.title !== 'string' || p.title.trim().length < 3) errors.push('titolo mancante')
  if (typeof p.gender !== 'string' || !GENDERS.includes(p.gender)) errors.push(`genere non valido: ${String(p.gender)}`)
  if (typeof p.category !== 'string' || !isCategoryId(p.category)) errors.push(`categoria sconosciuta: ${String(p.category)}`)
  if (p.imageUrl !== undefined && (typeof p.imageUrl !== 'string' || !p.imageUrl.startsWith('https://'))) {
    errors.push('imageUrl deve essere un URL https')
  }
  if (typeof p.availability !== 'string' || !AVAILABILITY.includes(p.availability)) errors.push('availability non valida')
  if (!isIsoDate(p.addedAt)) errors.push('addedAt mancante o non è una data ISO')
  if (p.price !== undefined && !isPositive(p.price)) errors.push('price deve essere un numero > 0')
  if (p.originalPrice !== undefined && !isPositive(p.originalPrice)) errors.push('originalPrice deve essere un numero > 0')
  if (p.price !== undefined && !isIsoDate(p.priceCheckedAt)) errors.push('price senza priceCheckedAt')
  if (p.searchQuery !== undefined) errors.push('searchQuery non è ammesso nel catalogo verificato')
  for (const key of ['sizes', 'colors'] as const) {
    if (p[key] !== undefined && !(Array.isArray(p[key]) && p[key].every((s) => typeof s === 'string'))) {
      errors.push(`${key} deve essere una lista di testi`)
    }
  }
  if (errors.length === 0) {
    const product = p as unknown as Product
    if (!STORES[product.store].enabled) errors.push(`il negozio ${product.store} non è ancora attivo`)
    const url = productUrl(product)
    if (!url) errors.push('impossibile costruire il link affiliato')
  }
  return errors
}

export interface CatalogCheck {
  valid: Product[]
  invalid: { index: number; id: unknown; errors: string[] }[]
}

export function checkCatalog(raw: unknown): CatalogCheck {
  if (!Array.isArray(raw)) throw new Error('Il catalogo deve essere una lista JSON')
  const valid: Product[] = []
  const invalid: CatalogCheck['invalid'] = []
  const seen = new Set<string>()
  raw.forEach((item, index) => {
    const errors = validateProduct(item)
    const id = (item as { id?: unknown })?.id
    if (typeof id === 'string' && seen.has(id)) errors.push('id duplicato')
    if (typeof id === 'string') seen.add(id)
    if (errors.length) invalid.push({ index, id, errors })
    else valid.push(item as Product)
  })
  return { valid, invalid }
}
