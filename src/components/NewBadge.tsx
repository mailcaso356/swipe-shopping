import { isNew } from '../lib/newness'
import type { Product } from '../types/product'

/** Etichetta "Nuovo" in alto a sinistra sulla foto. */
export function NewBadge({ product, size = 'md' }: { product: Product; size?: 'sm' | 'md' }) {
  if (!isNew(product)) return null
  return (
    <span
      className={`pointer-events-none absolute rounded-full bg-emerald-500 font-bold tracking-wide text-[#fff] uppercase shadow ${
        size === 'md' ? 'top-3 left-3 px-2.5 py-1 text-xs' : 'top-2 left-2 px-2 py-0.5 text-[10px]'
      }`}
    >
      Nuovo
    </span>
  )
}
