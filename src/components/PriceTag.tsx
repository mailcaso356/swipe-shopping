import { storeName } from '../config/stores'
import { formatPrice, freshPrice } from '../lib/price'
import type { Product } from '../types/product'

export function PriceTag({ product, size = 'md' }: { product: Product; size?: 'md' | 'lg' }) {
  const price = freshPrice(product)
  if (!price) {
    return <span className="text-sm text-neutral-500">Prezzo su {storeName(product.store)}</span>
  }
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className={`font-semibold text-neutral-900 ${size === 'lg' ? 'text-xl' : 'text-base'}`}>
        {formatPrice(price.price)}
      </span>
      {price.originalPrice && (
        <>
          <span className="text-sm text-neutral-400 line-through">{formatPrice(price.originalPrice)}</span>
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
            -{price.discountPct}%
          </span>
        </>
      )}
    </span>
  )
}
