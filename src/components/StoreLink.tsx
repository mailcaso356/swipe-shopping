import { ExternalLink } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import { productUrl, storeLinkLabel } from '../config/stores'
import { track } from '../lib/analytics'
import type { Product } from '../types/product'

/**
 * Link al negozio. È un vero <a href> (non un pulsante con JavaScript): funziona
 * in ogni browser, con tasto centrale/"apri in nuova scheda", e nelle webview.
 * Nella fase Capacitor qui si intercetterà il click per aprire il browser di sistema.
 */
export function StoreLink({
  product,
  className,
  children,
  onClickCapture,
  icon = true,
  ariaLabel,
}: {
  product: Product
  className?: string
  children?: ReactNode
  onClickCapture?: (e: MouseEvent<HTMLAnchorElement>) => void
  /** Icona "apri esternamente" dopo il testo */
  icon?: boolean
  ariaLabel?: string
}) {
  const url = productUrl(product)
  const label = children ?? storeLinkLabel(product)
  if (!url) {
    return (
      <span className={`${className ?? ''} cursor-not-allowed opacity-50`} aria-disabled="true">
        Link non disponibile
      </span>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer sponsored nofollow"
      className={className}
      onClickCapture={onClickCapture}
      onClick={() => track('click', product)}
      aria-label={ariaLabel}
      // Il trascinamento nativo dei link interferirebbe con lo swipe.
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
    >
      {label}
      {icon && <ExternalLink className="size-4 shrink-0" aria-hidden />}
    </a>
  )
}
