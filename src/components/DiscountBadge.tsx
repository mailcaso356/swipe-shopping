import { discountBadge } from '../lib/price'
import type { Product } from '../types/product'

/** Etichetta "-30%" in basso a sinistra sulla foto del prodotto. */
export function DiscountBadge({ product, size = 'md' }: { product: Product; size?: 'sm' | 'md' }) {
  const pct = discountBadge(product)
  if (pct === null) return null
  return (
    <span
      className={`pointer-events-none absolute bottom-3 left-3 rounded-full bg-rose-500 font-black text-white shadow-lg ${
        size === 'md' ? 'px-3 py-1 text-base' : 'bottom-2 left-2 px-2 py-0.5 text-xs'
      }`}
    >
      -{pct}%
    </span>
  )
}
