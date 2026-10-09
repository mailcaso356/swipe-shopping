import { Heart, Trash2 } from 'lucide-react'
import { PriceTag } from '../components/PriceTag'
import { ProductImage } from '../components/ProductImage'
import { StoreLink } from '../components/StoreLink'
import { AMAZON_DISCLOSURE } from '../config/app'
import { storeName } from '../config/stores'
import { routeHref } from '../lib/useHashRoute'
import { useApp } from '../state/AppState'

export function WishlistPage() {
  const { wishlist, actions } = useApp()

  if (wishlist.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Heart className="size-12 text-rose-300" />
        <h2 className="text-xl font-semibold">Nessun preferito ancora</h2>
        <p className="text-neutral-500">Scorri a destra sui prodotti che ti piacciono: li ritrovi qui.</p>
        <a href={routeHref('scopri')} className="mt-2 rounded-full bg-neutral-900 px-5 py-3 font-semibold text-white">
          Inizia a scoprire
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Preferiti</h1>
        <span className="text-sm text-neutral-500">{wishlist.length} prodotti</span>
      </div>
      <p className="text-xs text-neutral-500">
        L'acquisto avviene sul sito del negozio. Prezzi e disponibilità possono cambiare.
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {wishlist.map(({ product, inCatalog }) => {
          const unavailable = product.availability === 'out_of_stock' || !inCatalog
          return (
            <li key={product.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <div className="relative aspect-square">
                <ProductImage product={product} className="size-full" />
                {unavailable && (
                  <span className="absolute top-2 left-2 rounded-full bg-neutral-900/80 px-2 py-0.5 text-xs text-white">
                    Non disponibile
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => actions.remove(product)}
                  aria-label={`Rimuovi ${product.title}`}
                  className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-white/90 text-neutral-600 shadow ring-1 ring-black/5 active:scale-90"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                  {product.brand ? `${product.brand} · ` : ''}
                  {storeName(product.store)}
                </p>
                <h3 className="line-clamp-2 text-sm leading-snug font-medium">{product.title}</h3>
                <div className="mt-auto pt-1">
                  <PriceTag product={product} />
                </div>
                <StoreLink
                  product={product}
                  className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-full bg-neutral-900 px-3 py-2 text-sm font-semibold text-white active:scale-95"
                >
                  {product.searchQuery ? 'Cerca' : 'Acquista'}
                </StoreLink>
              </div>
            </li>
          )
        })}
      </ul>
      {wishlist.some((w) => w.product.store === 'amazon') && (
        <p className="text-center text-xs text-neutral-400">{AMAZON_DISCLOSURE}</p>
      )}
    </div>
  )
}
