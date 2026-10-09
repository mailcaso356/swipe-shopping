import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { track } from '../lib/analytics'
import { loadCatalog } from '../lib/catalog'
import { matchesFilters, sortProducts } from '../lib/filters'
import { load, save } from '../lib/storage'
import { DEFAULT_FILTERS, type Filters, type Product } from '../types/product'

export interface WishItem {
  /** Copia del prodotto al momento del salvataggio: resta visibile anche se esce dal catalogo */
  product: Product
  savedAt: number
}

type CatalogState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; products: Product[]; exploreMode: boolean }

interface State {
  catalog: CatalogState
  filters: Filters
  wishlist: WishItem[]
  disliked: string[]
  lastAction: { type: 'like' | 'dislike'; product: Product } | null
}

type Action =
  | { type: 'catalog'; catalog: CatalogState }
  | { type: 'like' | 'dislike'; product: Product }
  | { type: 'undo' }
  | { type: 'remove'; id: string }
  | { type: 'filters'; filters: Filters }
  | { type: 'resetSeen' }
  | { type: 'clearAll' }

const MAX_DISLIKED = 5000

/** Seme personale per l'ordine "Consigliati": stabile tra una visita e l'altra. */
const MIX_SEED = (() => {
  const existing = load<string>('mixSeed', '')
  if (existing) return existing
  const seed = Math.random().toString(36).slice(2)
  save('mixSeed', seed)
  return seed
})()

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'catalog':
      return { ...state, catalog: action.catalog }
    case 'like':
      if (state.wishlist.some((w) => w.product.id === action.product.id)) return state
      return {
        ...state,
        wishlist: [{ product: action.product, savedAt: Date.now() }, ...state.wishlist],
        lastAction: { type: 'like', product: action.product },
      }
    case 'dislike':
      return {
        ...state,
        disliked: [...state.disliked, action.product.id].slice(-MAX_DISLIKED),
        lastAction: { type: 'dislike', product: action.product },
      }
    case 'undo': {
      const last = state.lastAction
      if (!last) return state
      return {
        ...state,
        wishlist: last.type === 'like' ? state.wishlist.filter((w) => w.product.id !== last.product.id) : state.wishlist,
        disliked: last.type === 'dislike' ? state.disliked.filter((id) => id !== last.product.id) : state.disliked,
        lastAction: null,
      }
    }
    case 'remove':
      return { ...state, wishlist: state.wishlist.filter((w) => w.product.id !== action.id), lastAction: null }
    case 'filters':
      return { ...state, filters: action.filters }
    case 'resetSeen':
      return { ...state, disliked: [], lastAction: null }
    case 'clearAll':
      return { ...state, wishlist: [], disliked: [], filters: DEFAULT_FILTERS, lastAction: null }
  }
}

function useAppStore() {
  const [state, dispatch] = useReducer(reducer, undefined, (): State => ({
    catalog: { status: 'loading' },
    filters: { ...DEFAULT_FILTERS, ...load<Partial<Filters>>('filters:v2', {}) },
    wishlist: load<WishItem[]>('wishlist', []),
    disliked: load<string[]>('disliked', []),
    lastAction: null,
  }))

  useEffect(() => save('filters:v2', state.filters), [state.filters])
  useEffect(() => save('wishlist', state.wishlist), [state.wishlist])
  useEffect(() => save('disliked', state.disliked), [state.disliked])

  const reloadCatalog = useCallback((signal?: AbortSignal) => {
    dispatch({ type: 'catalog', catalog: { status: 'loading' } })
    loadCatalog(signal)
      .then((r) => dispatch({ type: 'catalog', catalog: { status: 'ready', products: r.products, exploreMode: r.exploreMode } }))
      .catch((e: unknown) => {
        if (signal?.aborted) return
        dispatch({ type: 'catalog', catalog: { status: 'error', error: e instanceof Error ? e.message : String(e) } })
      })
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    reloadCatalog(ctrl.signal)
    return () => ctrl.abort()
  }, [reloadCatalog])

  const products = useMemo(() => (state.catalog.status === 'ready' ? state.catalog.products : []), [state.catalog])

  const deck = useMemo(() => {
    const seen = new Set([...state.disliked, ...state.wishlist.map((w) => w.product.id)])
    const list = products.filter((p) => p.availability !== 'out_of_stock' && !seen.has(p.id) && matchesFilters(p, state.filters))
    return sortProducts(list, state.filters.sort, MIX_SEED)
  }, [products, state.disliked, state.wishlist, state.filters])

  /** Preferiti con i dati aggiornati dal catalogo quando il prodotto è ancora presente */
  const wishlist = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]))
    return state.wishlist.map((w) => ({ ...w, product: byId.get(w.product.id) ?? w.product, inCatalog: byId.has(w.product.id) }))
  }, [products, state.wishlist])

  const actions = useMemo(
    () => ({
      like: (product: Product) => {
        track('like', product)
        dispatch({ type: 'like', product })
      },
      dislike: (product: Product) => {
        track('dislike', product)
        dispatch({ type: 'dislike', product })
      },
      undo: () => dispatch({ type: 'undo' }),
      remove: (product: Product) => {
        track('remove', product)
        dispatch({ type: 'remove', id: product.id })
      },
      setFilters: (filters: Filters) => dispatch({ type: 'filters', filters }),
      resetSeen: () => dispatch({ type: 'resetSeen' }),
      clearAll: () => dispatch({ type: 'clearAll' }),
      reloadCatalog: () => reloadCatalog(),
    }),
    [reloadCatalog],
  )

  return { state, products, deck, wishlist, actions }
}

type Store = ReturnType<typeof useAppStore>
const Ctx = createContext<Store | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const store = useAppStore()
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

// oxlint-disable-next-line react/only-export-components -- hook e provider stanno insieme
export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp va usato dentro AppStateProvider')
  return ctx
}
