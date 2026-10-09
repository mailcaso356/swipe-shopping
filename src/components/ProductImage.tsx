import { useState } from 'react'
import { categoryGroupOf } from '../config/categories'
import type { Product } from '../types/product'

/** Foto prodotto con segnaposto elegante se manca o non si carica. */
export function ProductImage({ product, eager, className }: { product: Product; eager?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!product.imageUrl || failed) {
    const group = categoryGroupOf(product.category)
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 ${className ?? ''}`}>
        <span className="text-7xl drop-shadow-sm select-none" aria-hidden>
          {group?.emoji ?? '🛍️'}
        </span>
      </div>
    )
  }
  return (
    <div className={`bg-white ${className ?? ''}`}>
      <img
        src={product.imageUrl}
        alt={product.title}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onError={() => setFailed(true)}
        className="size-full object-contain p-4 select-none"
      />
    </div>
  )
}
