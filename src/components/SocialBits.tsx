import { Check, Send, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { UNIVERSES } from '../config/categories'
import { REACTIONS, friendList, social, type Reactions, type SocialCard } from '../lib/social'
import { routeHref } from '../lib/useHashRoute'
import { useApp } from '../state/AppState'
import { useAuth } from '../state/AuthState'
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

/** Scelta degli amici a cui mandare qualcosa (messaggio fisso, nessun testo da scrivere). */
export function FriendPicker(props: { title: string; single?: boolean; confirmLabel: string; onConfirm: (codes: string[]) => Promise<void> | void; onClose: () => void }) {
  const [friends, setFriends] = useState<SocialCard[] | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    friendList()
      .then(setFriends)
      .catch((e: Error) => setError(e.message))
  }, [])
  const toggle = (code: string) =>
    setPicked((cur) => (props.single ? [code] : cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={props.onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        className="flex max-h-[80dvh] w-full max-w-md flex-col rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="font-semibold">{props.title}</h2>
          <button type="button" onClick={props.onClose} aria-label="Chiudi" className="text-neutral-500">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {error && <p className="py-4 text-sm text-rose-600">{error}</p>}
          {!friends && !error && <p className="py-4 text-sm text-neutral-500">Caricamento…</p>}
          {friends?.length === 0 && (
            <p className="py-6 text-center text-sm text-neutral-500">
              Non hai ancora amici. Manda il tuo link da Amici: chi lo apre può seguirti.
            </p>
          )}
          {friends?.map((f) => {
            const on = picked.includes(f.code)
            return (
              <button
                key={f.code}
                type="button"
                onClick={() => toggle(f.code)}
                aria-pressed={on}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left active:bg-neutral-100"
              >
                <Avatar emoji={f.avatar} size="sm" />
                <span className="flex-1 font-medium">{f.handle}</span>
                <span className={`grid size-6 place-items-center rounded-full ring-1 ${on ? 'bg-rose-500 text-[#fff] ring-rose-500' : 'ring-neutral-300'}`}>
                  {on && <Check className="size-4" />}
                </span>
              </button>
            )
          })}
        </div>
        <div className="border-t border-neutral-100 p-4">
          <button
            type="button"
            disabled={picked.length === 0 || busy}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                await props.onConfirm(picked)
              } catch (e) {
                setError((e as Error).message)
              } finally {
                setBusy(false)
              }
            }}
            className="w-full rounded-full bg-rose-500 py-3 font-semibold text-[#fff] active:scale-[0.98] disabled:opacity-50"
          >
            {props.confirmLabel}
            {picked.length > 1 ? ` (${picked.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Pulsante "Manda a un amico" per prodotti, sondaggi e liste (solo con account). Mostra "Inviato" per un attimo. */
export function SendToFriends(props: { kind: 'consiglio' | 'sondaggio' | 'lista'; productId?: string; id?: string; label: string; className: string }) {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState('')
  if (!auth.user) return null
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={props.className}>
        <Send className="size-4" />
        {done || props.label}
      </button>
      {open && (
        <FriendPicker
          title={props.label}
          confirmLabel="Manda"
          onClose={() => setOpen(false)}
          onConfirm={async (codes) => {
            const n = await social.send(codes, props.kind, { productId: props.productId, id: props.id })
            setOpen(false)
            setDone(n === 1 ? 'Inviato!' : `Inviato a ${n} amici!`)
            setTimeout(() => setDone(''), 2500)
          }}
        />
      )}
    </>
  )
}

/** Reazioni con emoji fisse. Il proprietario vede solo i conteggi. */
export function ReactionBar(props: { kind: 'poll' | 'list'; id: string; initial?: Reactions; readOnly?: boolean }) {
  const auth = useAuth()
  const [r, setR] = useState<Reactions | undefined>(props.initial)
  useEffect(() => {
    if (props.initial || !auth.user) return
    social
      .reactions(props.kind, props.id)
      .then(setR)
      .catch(() => {})
  }, [props.kind, props.id, props.initial, auth.user])
  if (!auth.user) return null
  const toggle = async (emoji: string) => {
    const next = r?.mine === emoji ? null : emoji
    try {
      setR(await social.react(props.kind, props.id, next))
    } catch {
      /* rete assente: resta com'era */
    }
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTIONS.map((e) => {
        const n = r?.counts[e] ?? 0
        const mine = r?.mine === e
        if (props.readOnly && n === 0) return null
        return (
          <button
            key={e}
            type="button"
            disabled={props.readOnly}
            onClick={(ev) => {
              ev.preventDefault()
              void toggle(e)
            }}
            aria-pressed={mine}
            aria-label={`Reazione ${e}`}
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-sm ring-1 active:scale-90 ${
              mine ? 'bg-rose-50 ring-rose-300' : 'bg-white ring-neutral-200'
            }`}
          >
            <span>{e}</span>
            {n > 0 && <span className="text-xs font-semibold text-neutral-600">{n}</span>}
          </button>
        )
      })}
    </div>
  )
}
