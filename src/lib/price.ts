import { STORES } from '../config/stores'
import type { Product } from '../types/product'

const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
export const formatPrice = (value: number) => eur.format(value)

/** Un prezzo si mostra solo se è stato verificato entro la finestra consentita dal negozio. */
export function freshPrice(p: Product, now = Date.now()) {
  if (p.price === undefined || !p.priceCheckedAt) return null
  const checked = Date.parse(p.priceCheckedAt)
  const maxAge = STORES[p.store].priceMaxAgeHours * 3_600_000
  if (Number.isNaN(checked) || now - checked > maxAge) return null
  const discounted = p.originalPrice !== undefined && p.originalPrice > p.price
  return {
    price: p.price,
    originalPrice: discounted ? p.originalPrice : undefined,
    discountPct: discounted ? Math.round((1 - p.price / p.originalPrice!) * 100) : undefined,
    checkedAt: new Date(checked),
    from: p.priceFrom === true,
  }
}

/**
 * Calo di prezzo di un preferito: confronta il prezzo di quando è stato salvato con quello attuale
 * (solo se attuale è verificato di recente). Ignora variazioni minime.
 */
export function priceDrop(saved: Product, current: Product, now = Date.now()) {
  const fresh = freshPrice(current, now)
  if (!fresh || saved.price === undefined || !saved.priceCheckedAt) return null
  if ((saved.priceFrom === true) !== fresh.from) return null
  const diff = saved.price - fresh.price
  if (diff < 1 || diff / saved.price < 0.03) return null
  return { was: saved.price, now: fresh.price, pct: Math.round((diff / saved.price) * 100) }
}

/** Sconto da mostrare come badge sulla foto (sotto il 5% non vale la pena). */
export function discountBadge(p: Product) {
  const pct = freshPrice(p)?.discountPct
  return pct !== undefined && pct >= 5 ? pct : null
}
