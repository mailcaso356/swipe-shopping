import { Share2 } from 'lucide-react'
import { useState } from 'react'
import { shareProduct } from '../lib/share'
import type { Product } from '../types/product'

export function ShareButton({ product, className }: { product: Product; className: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label={`Condividi ${product.title}`}
      title="Condividi"
      onClick={async () => {
        if ((await shareProduct(product)) === 'copied') {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      }}
      className={/\babsolute\b/.test(className) ? className : `relative ${className}`}
    >
      <Share2 className="size-5" />
      {copied && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-full bg-neutral-900 px-2 py-1 text-xs whitespace-nowrap text-white">
          Link copiato
        </span>
      )}
    </button>
  )
}
