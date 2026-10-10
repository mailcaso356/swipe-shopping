import { Check, UserRound, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { UNIVERSES } from '../config/categories'
import { routeHref } from '../lib/useHashRoute'
import { useApp } from '../state/AppState'
import type { Product } from '../types/product'
import { ProductImage } from './ProductImage'

export function Avatar({ emoji, size = 'md' }: { emoji: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'size-16 text-4xl' : size === 'sm' ? 'size-9 text-xl' : 'size-11 text-2xl'
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-rose-50 ring-1 ring-rose-100 ${cls}`} aria-hidden>
      {emoji}
    </span>
  )
}

/** Prodotti dagli id: dal catalogo, o dai preferiti se non ci sono più. Esclude quelli sconosciuti. */
// oxlint-disable-next-line react/only-export-components -- hook usato solo dai componenti social
export function useProductsById(ids: string[] | undefined) {
  const { allProducts, wishlist, state } = useApp()
  const byId = useMemo(() => {
    const m = new Map<string, Product>(wishlist.map((w) => [w.product.id, w.product]))
    for (const p of allProducts) m.set(p.id, p)
    return m
  }, [allProducts, wishlist])
  const loading =
    state.catalog.status === 'loading' || (state.catalog.status === 'ready' && state.catalog.sections.length < UNIVERSES.length)
  const products = (ids ?? []).map((id) => byId.get(id)).filter((p): p is Product => p !== undefined)
  return { products, loading }
}

/** Fila di miniature (feed, liste). */
export function ProductStrip({ ids, max = 4 }: { ids: string[]; max?: number }) {
  const { products } = useProductsById(ids)
  const shown = products.slice(0, max)
  const more = products.length - shown.length
  return (
    <div className="flex gap-2">
      {shown.map((p) => (
        <ProductImage key={p.id} product={p} className="size-16 shrink-0 overflow-hidden rounded-xl bg-[#fff] object-contain ring-1 ring-black/5 [&_span]:text-3xl" />
      ))}
      {more > 0 && (
        <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-neutral-100 text-sm font-semibold text-neutral-600">
          +{more}
        </span>
      )}
    </div>
  )
}

export function LoginNeeded({ text }: { text: string }) {
  return (
    <div className="space-y-3 rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5">
      <UserRound className="mx-auto size-10 text-rose-400" />
      <p className="text-sm text-neutral-600">{text}</p>
      <a href={routeHref('profilo')} className="inline-block rounded-full bg-rose-500 px-5 py-2.5 font-semibold text-[#fff]">
        Accedi o registrati
      </a>
    </div>
  )
}

/** Scelta di prodotti dai preferiti (tutte le sezioni), da min a max. */
export function ProductPicker(props: {
  title: string
  hint: string
  min: number
  max: number
  initial?: string[]
  confirmLabel: string
  onConfirm: (ids: string[]) => void
  onClose: () => void
  children?: ReactNode
}) {
  const { wishlist } = useApp()
  const [picked, setPicked] = useState<string[]>(props.initial ?? [])
  const items = wishlist.filter((w) => w.inCatalog && w.product.availability !== 'out_of_stock')
  const toggle = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= props.max ? cur : [...cur, id]))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={props.onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        className="flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 pb-2">
          <div>
            <h2 className="font-semibold">{props.title}</h2>
            <p className="text-sm text-neutral-500">{props.hint}</p>
          </div>
          <button type="button" onClick={props.onClose} aria-label="Chiudi" className="text-neutral-500">
            <X className="size-5" />
          </button>
        </div>
        {props.children && <div className="px-4 pb-2">{props.children}</div>}
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">
            Prima salva qualche prodotto nei preferiti con uno swipe a destra.
          </p>
        ) : (
          <ul className="grid flex-1 grid-cols-3 gap-2 overflow-y-auto px-4 pb-2">
            {items.map(({ product }) => {
              const on = picked.includes(product.id)
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => toggle(product.id)}
                    aria-pressed={on}
                    aria-label={product.title}
                    className={`relative block aspect-square w-full overflow-hidden rounded-xl ring-2 ${on ? 'ring-rose-500' : 'ring-transparent'}`}
                  >
                    <ProductImage product={product} className="size-full bg-[#fff]" />
                    {on && (
                      <span className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-rose-500 text-[#fff]">
                        <Check className="size-4" />
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div className="border-t border-neutral-100 p-4">
          <button
            type="button"
            disabled={picked.length < props.min}
            onClick={() => props.onConfirm(picked)}
            className="w-full rounded-full bg-rose-500 py-3 font-semibold text-[#fff] active:scale-[0.98] disabled:opacity-50"
          >
            {picked.length < props.min ? `Scegline almeno ${props.min}` : `${props.confirmLabel} (${picked.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}
