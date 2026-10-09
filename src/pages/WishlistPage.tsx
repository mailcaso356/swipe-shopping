import { BadgePercent, Folder, FolderInput, Heart, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { FolderPicker } from '../components/FolderPicker'
import { NewBadge } from '../components/NewBadge'
import { DiscountBadge } from '../components/DiscountBadge'
import { ShareButton } from '../components/ShareButton'
import { PriceTag } from '../components/PriceTag'
import { ProductImage } from '../components/ProductImage'
import { StoreLink } from '../components/StoreLink'
import { AMAZON_DISCLOSURE } from '../config/app'
import { storeName } from '../config/stores'
import { discountBadge, freshPrice } from '../lib/price'
import { openProduct } from '../lib/productSheet'
import { routeHref } from '../lib/useHashRoute'
import { useApp } from '../state/AppState'
import type { Product } from '../types/product'

type WishSort = 'recenti' | 'prezzo_asc' | 'prezzo_desc' | 'sconto'

const priceOf = (p: Product) => freshPrice(p)?.price

export function WishlistPage() {
  const { wishlist, actions, markDealsSeen } = useApp()
  const deals = wishlist.filter((w) => w.deal !== null).length
  const [folder, setFolder] = useState<string | null>(null)
  const [sort, setSort] = useState<WishSort>('recenti')
  const [moving, setMoving] = useState<Product | null>(null)

  const folders = useMemo(() => {
    const count = new Map<string, number>()
    for (const w of wishlist) if (w.folder) count.set(w.folder, (count.get(w.folder) ?? 0) + 1)
    return [...count].sort((a, b) => a[0].localeCompare(b[0], 'it'))
  }, [wishlist])
  // Cartella eliminata o svuotata: si torna a "Tutti".
  const current = folder && folders.some(([f]) => f === folder) ? folder : null

  const shown = useMemo(() => {
    const list = current ? wishlist.filter((w) => w.folder === current) : [...wishlist]
    if (sort === 'sconto') return list.sort((a, b) => (discountBadge(b.product) ?? 0) - (discountBadge(a.product) ?? 0))
    if (sort !== 'recenti') {
      const dir = sort === 'prezzo_asc' ? 1 : -1
      return list.sort((a, b) => {
        const pa = priceOf(a.product)
        const pb = priceOf(b.product)
        if (pa === undefined) return pb === undefined ? 0 : 1
        if (pb === undefined) return -1
        return (pa - pb) * dir
      })
    }
    return list
  }, [wishlist, current, sort])

  // Aprendo i Preferiti l'avviso sul menu si spegne (l'etichetta sulle card resta).
  useEffect(() => markDealsSeen(), [markDealsSeen])

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
      {deals > 0 && (
        <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
          <BadgePercent className="size-5 shrink-0" />
          {deals === 1 ? 'Un tuo preferito è in offerta!' : `${deals} preferiti sono in offerta!`}
        </p>
      )}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <FolderChip active={!current} onClick={() => setFolder(null)} label="Tutti" count={wishlist.length} />
        {folders.map(([name, n]) => (
          <FolderChip key={name} active={current === name} onClick={() => setFolder(name)} label={name} count={n} folder />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        {current ? (
          <span className="flex gap-3">
            <button
              type="button"
              className="font-medium text-neutral-600 underline"
              onClick={() => {
                const name = window.prompt('Nuovo nome della cartella', current)
                if (name?.trim()) {
                  actions.renameFolder(current, name)
                  setFolder(name.trim())
                }
              }}
            >
              Rinomina
            </button>
            <button
              type="button"
              className="font-medium text-rose-600 underline"
              onClick={() => window.confirm(`Eliminare la cartella "${current}"? I prodotti restano nei preferiti.`) && actions.renameFolder(current)}
            >
              Elimina cartella
            </button>
          </span>
        ) : (
          <span className="text-xs text-neutral-500">Tocca la cartella su un prodotto per organizzarlo.</span>
        )}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as WishSort)}
          aria-label="Ordina i preferiti"
          className="rounded-full bg-white px-3 py-1.5 text-sm ring-1 ring-neutral-200"
        >
          <option value="recenti">Più recenti</option>
          <option value="prezzo_asc">Prezzo più basso</option>
          <option value="prezzo_desc">Prezzo più alto</option>
          <option value="sconto">Sconto maggiore</option>
        </select>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map(({ product, inCatalog, folder: itemFolder }) => {
          const unavailable = product.availability === 'out_of_stock' || !inCatalog
          return (
            <li key={product.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <div className="relative aspect-square">
                <button
                  type="button"
                  onClick={() => openProduct(product)}
                  aria-label={`Dettagli di ${product.title}`}
                  className="block size-full"
                >
                  <ProductImage product={product} className="size-full" />
                </button>
                {!unavailable && <DiscountBadge product={product} size="sm" />}
                {!unavailable && <NewBadge product={product} size="sm" />}
                {unavailable && (
                  <span className="pointer-events-none absolute top-2 left-2 rounded-full bg-neutral-900/80 px-2 py-0.5 text-xs text-white">
                    Non disponibile
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setMoving(product)}
                  aria-label={`Sposta ${product.title} in una cartella`}
                  className={`absolute top-2 right-24 grid size-9 place-items-center rounded-full shadow ring-1 ring-black/5 active:scale-90 ${
                    itemFolder ? 'bg-neutral-900 text-white' : 'bg-white/90 text-neutral-600'
                  }`}
                >
                  <FolderInput className="size-4" />
                </button>
                <ShareButton
                  product={product}
                  className="absolute top-2 right-13 grid size-9 place-items-center rounded-full bg-white/90 text-neutral-600 shadow ring-1 ring-black/5 active:scale-90"
                />
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
      {moving && <FolderPicker product={moving} onClose={() => setMoving(null)} />}
      <p className="text-center text-xs text-neutral-500">
        L'acquisto avviene sul sito del negozio. Prezzi e disponibilità possono cambiare.
      </p>
      {wishlist.some((w) => w.product.store === 'amazon') && (
        <p className="text-center text-xs text-neutral-400">{AMAZON_DISCLOSURE}</p>
      )}
    </div>
  )
}

function FolderChip(props: { active: boolean; onClick: () => void; label: string; count: number; folder?: boolean }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ${
        props.active ? 'bg-neutral-900 text-white ring-neutral-900' : 'bg-white text-neutral-700 ring-neutral-200'
      }`}
    >
      {props.folder && <Folder className="size-3.5" />}
      {props.label}
      <span className={props.active ? 'opacity-70' : 'text-neutral-400'}>{props.count}</span>
    </button>
  )
}
