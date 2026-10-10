import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { UNIVERSES, isUniverse, universeOf, type Universe } from '../config/categories'
import { track } from '../lib/analytics'
import { loadCatalog } from '../lib/catalog'
import { fetchUserData, mergeUserData, saveUserData } from '../lib/cloudSync'
import { matchesFilters, normalizeFilters, sortProducts } from '../lib/filters'
import { setNewBaseline } from '../lib/newness'
import { modelKey, onePerModel } from '../lib/dedupe'
import { discountBadge } from '../lib/price'
import { sharedProductId } from '../lib/share'
import { load, save } from '../lib/storage'
import { DEFAULT_FILTERS, type Filters, type Product } from '../types/product'
import { useAuth } from './AuthState'

export interface WishItem {
  /** Copia del prodotto al momento del salvataggio: resta visibile anche se esce dal catalogo */
  product: Product
  savedAt: number
  /** Cartella dei preferiti (nessuna = solo in "Tutti") */
  folder?: string
}

type CatalogState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; products: Product[]; exploreMode: boolean; sections: Universe[] }

interface State {
  catalog: CatalogState
  /** Sezione aperta: moda (principale) o una delle altre (vedi SECTIONS) */
  mode: Universe
  /** Filtri della moda (sincronizzati con l'account) */
  filters: Filters
  /** Filtri delle altre sezioni (solo su questo dispositivo) */
  sectionFilters: Record<OtherSection, Filters>
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
  | { type: 'mode'; mode: Universe }
  | { type: 'resetSeen' }
  | { type: 'clearAll' }
  | { type: 'hydrate'; wishlist: WishItem[]; disliked: string[]; filters: Filters }
  | { type: 'folder'; id: string; folder?: string }
  | { type: 'renameFolder'; from: string; to?: string }

const MAX_DISLIKED = 5000

type OtherSection = Exclude<Universe, 'moda'>

/** Filtri di ogni sezione tranne la moda (salvati come techFilters, gadgetFilters…). */
const otherSectionFilters = (make: (u: OtherSection) => Filters) =>
  Object.fromEntries(UNIVERSES.filter((u) => u !== 'moda').map((u) => [u, make(u as OtherSection)])) as Record<OtherSection, Filters>

/** ?sezione=tech arriva dalle pagine Google ("Apri l'app"); altrimenti l'ultima sezione aperta. */
function initialMode(): Universe {
  const fromUrl = new URLSearchParams(window.location.search).get('sezione')
  if (isUniverse(fromUrl)) {
    // Usato una volta: poi vale la sezione scelta dall'utente, anche ricaricando.
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    save('mode', fromUrl)
    return fromUrl
  }
  const saved = load<string>('mode', 'moda')
  return isUniverse(saved) ? saved : 'moda'
}

/** Copia salvata nei preferiti senza prezzi: i prezzi si leggono sempre dal catalogo aggiornato. */
const snapshot = ({ price: _p, originalPrice: _o, priceCheckedAt: _c, priceFrom: _f, ...rest }: Product): Product => rest
const stripPrices = (list: WishItem[]) => list.map((w) => ({ ...w, product: snapshot(w.product) }))

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
        wishlist: [{ product: snapshot(action.product), savedAt: Date.now() }, ...state.wishlist],
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
      return state.mode === 'moda'
        ? { ...state, filters: normalizeFilters(action.filters) }
        : { ...state, sectionFilters: { ...state.sectionFilters, [state.mode]: normalizeFilters(action.filters) } }
    case 'mode':
      return { ...state, mode: action.mode, lastAction: null }
    case 'resetSeen':
      return { ...state, disliked: [], lastAction: null }
    case 'clearAll':
      return { ...state, wishlist: [], disliked: [], filters: DEFAULT_FILTERS, sectionFilters: otherSectionFilters(() => DEFAULT_FILTERS), lastAction: null }
    case 'folder':
      return {
        ...state,
        wishlist: state.wishlist.map((w) => (w.product.id === action.id ? { ...w, folder: action.folder } : w)),
      }
    case 'renameFolder':
      return {
        ...state,
        wishlist: state.wishlist.map((w) => (w.folder === action.from ? { ...w, folder: action.to } : w)),
      }
    case 'hydrate':
      return {
        ...state,
        wishlist: stripPrices(action.wishlist),
        disliked: action.disliked.slice(-MAX_DISLIKED),
        filters: normalizeFilters({ ...DEFAULT_FILTERS, ...action.filters }),
        lastAction: null,
      }
  }
}

function useAppStore() {
  const [state, dispatch] = useReducer(reducer, undefined, (): State => ({
    catalog: { status: 'loading' },
    mode: initialMode(),
    filters: normalizeFilters({ ...DEFAULT_FILTERS, ...load<Partial<Filters>>('filters:v2', {}) }),
    sectionFilters: otherSectionFilters((u) => normalizeFilters({ ...DEFAULT_FILTERS, ...load<Partial<Filters>>(`${u}Filters`, {}) })),
    wishlist: stripPrices(load<WishItem[]>('wishlist', [])),
    disliked: load<string[]>('disliked', []),
    lastAction: null,
  }))

  useEffect(() => save('filters:v2', state.filters), [state.filters])
  useEffect(() => {
    for (const [u, f] of Object.entries(state.sectionFilters)) save(`${u}Filters`, f)
  }, [state.sectionFilters])
  useEffect(() => {
    save('mode', state.mode)
    // Classe per i colori della sezione (vedi src/index.css).
    for (const u of UNIVERSES) if (u !== 'moda') document.documentElement.classList.toggle(u, state.mode === u)
  }, [state.mode])
  const activeFilters = state.mode === 'moda' ? state.filters : state.sectionFilters[state.mode]
  useEffect(() => save('wishlist', state.wishlist), [state.wishlist])
  useEffect(() => save('disliked', state.disliked), [state.disliked])

  const sync = useCloudSync(state, dispatch)

  // Prima la sezione aperta (si vede subito), poi le altre in sottofondo (preferiti, link condivisi, cambio sezione).
  const modeRef = useRef(state.mode)
  useEffect(() => {
    modeRef.current = state.mode
  }, [state.mode])
  const reloadCatalog = useCallback((signal?: AbortSignal) => {
    dispatch({ type: 'catalog', catalog: { status: 'loading' } })
    const first = modeRef.current
    loadCatalog(first, signal)
      .then(async (r) => {
        setNewBaseline(r.products)
        dispatch({ type: 'catalog', catalog: { status: 'ready', products: r.products, exploreMode: r.exploreMode, sections: r.sections } })
        const others = UNIVERSES.filter((u) => !r.sections.includes(u))
        if (others.length === 0) return
        const rest = await Promise.all(others.map((u) => loadCatalog(u, signal).catch(() => null)))
        if (signal?.aborted) return
        const products = [...r.products, ...rest.flatMap((x) => x?.products ?? [])]
        setNewBaseline(products)
        dispatch({ type: 'catalog', catalog: { status: 'ready', products, exploreMode: false, sections: [...UNIVERSES] } })
      })
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

  // Prodotto aperto da un link condiviso: va in cima al mazzo una volta sola, anche se filtrato o già visto.
  const [sharedId, setSharedId] = useState(() => sharedProductId())
  useEffect(() => {
    if (sharedId) window.history.replaceState(null, '', '#/scopri')
  }, [sharedId])
  // Link condiviso a un prodotto dell'altra sezione: si apre la sua sezione.
  const sharedProduct = sharedId ? products.find((p) => p.id === sharedId) : undefined
  useEffect(() => {
    if (sharedProduct) dispatch({ type: 'mode', mode: universeOf(sharedProduct.category) })
  }, [sharedProduct])

  const deck = useMemo(() => {
    const seen = new Set([...state.disliked, ...state.wishlist.map((w) => w.product.id)])
    const list = products.filter(
      (p) =>
        p.availability !== 'out_of_stock' &&
        !seen.has(p.id) &&
        universeOf(p.category) === state.mode &&
        matchesFilters(p, activeFilters),
    )
    // Una variante per modello: niente stessa felpa in tre colori di fila. Un modello già scartato o salvato non torna.
    const byId = new Map(products.map((p) => [p.id, p]))
    const seenModels = new Set([...seen].flatMap((id) => (byId.has(id) ? [modelKey(byId.get(id)!)] : [])))
    const sorted = onePerModel(sortProducts(list, activeFilters.sort, MIX_SEED), seenModels)
    const shared = sharedId ? products.find((p) => p.id === sharedId) : undefined
    return shared ? [shared, ...sorted.filter((p) => p.id !== shared.id)] : sorted
  }, [products, state.disliked, state.wishlist, state.mode, activeFilters, sharedId])

  /** Preferiti con i dati aggiornati dal catalogo quando il prodotto è ancora presente */
  const wishlist = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]))
    return state.wishlist.map((w) => {
      const current = byId.get(w.product.id)
      return {
        ...w,
        product: current ?? w.product,
        inCatalog: !!current,
        /** Sconto attuale sul negozio (non confrontiamo con prezzi vecchi: Amazon non lo consente) */
        deal: current && current.availability !== 'out_of_stock' ? discountBadge(current) : null,
      }
    })
  }, [products, state.wishlist])

  /** Offerte sui preferiti già viste nella pagina Preferiti: id → sconto visto */
  const [seenDeals, setSeenDeals] = useState(() => load<Record<string, number>>('dealsSeen', {}))
  const unseenDeals = wishlist.filter((w) => w.deal !== null && seenDeals[w.product.id] !== w.deal).length
  const markDealsSeen = useCallback(() => {
    setSeenDeals((prev) => {
      const next: Record<string, number> = {}
      for (const w of wishlist) if (w.deal !== null) next[w.product.id] = w.deal
      if (Object.keys(next).every((id) => prev[id] === next[id]) && Object.keys(prev).length === Object.keys(next).length) return prev
      save('dealsSeen', next)
      return next
    })
  }, [wishlist])

  const actions = useMemo(
    () => ({
      like: (product: Product) => {
        setSharedId(null)
        track('like', product)
        dispatch({ type: 'like', product })
      },
      dislike: (product: Product) => {
        setSharedId(null)
        track('dislike', product)
        dispatch({ type: 'dislike', product })
      },
      undo: () => dispatch({ type: 'undo' }),
      remove: (product: Product) => {
        track('remove', product)
        dispatch({ type: 'remove', id: product.id })
      },
      setFilters: (filters: Filters) => dispatch({ type: 'filters', filters }),
      /** Cambia sezione (moda, tech, gadget…) */
      setMode: (mode: Universe) => dispatch({ type: 'mode', mode }),
      resetSeen: () => dispatch({ type: 'resetSeen' }),
      clearAll: () => dispatch({ type: 'clearAll' }),
      reloadCatalog: () => reloadCatalog(),
      /** Sposta un preferito in una cartella (undefined = toglie dalla cartella) */
      setFolder: (product: Product, folder?: string) => dispatch({ type: 'folder', id: product.id, folder: folder?.trim() || undefined }),
      /** Rinomina una cartella; senza nuovo nome la elimina (i prodotti restano nei preferiti) */
      renameFolder: (from: string, to?: string) => dispatch({ type: 'renameFolder', from, to: to?.trim() || undefined }),
    }),
    [reloadCatalog],
  )

  // Per il resto dell'app `state.filters` sono i filtri della sezione aperta.
  const view = useMemo(() => ({ ...state, filters: activeFilters }), [state, activeFilters])
  /** Prodotti della sezione aperta (per i filtri) */
  const sectionProducts = useMemo(() => products.filter((p) => universeOf(p.category) === state.mode), [products, state.mode])
  return { state: view, products: sectionProducts, allProducts: products, deck, wishlist, actions, sync, unseenDeals, markDealsSeen }
}

export type SyncStatus = 'off' | 'loading' | 'synced' | 'saving' | 'error'

/**
 * Con un account: all'accesso unisce i dati del dispositivo a quelli salvati online,
 * poi salva ogni modifica (con un piccolo ritardo per raggruppare gli swipe).
 */
function useCloudSync(state: State, dispatch: (a: Action) => void): SyncStatus {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [status, setStatus] = useState<SyncStatus>('loading')
  const hydratedFor = useRef<string | null>(null)
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  useEffect(() => {
    hydratedFor.current = null
    if (!userId) return
    let cancelled = false
    fetchUserData(userId)
      .then(async (remote) => {
        if (cancelled) return
        const { wishlist, disliked, filters } = stateRef.current
        const merged = mergeUserData({ wishlist, disliked, filters }, remote)
        dispatch({ type: 'hydrate', ...merged })
        hydratedFor.current = userId
        await saveUserData(userId, merged)
        if (!cancelled) setStatus('synced')
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
      setStatus('loading')
    }
  }, [userId, dispatch])

  useEffect(() => {
    if (!userId || hydratedFor.current !== userId) return
    const timer = setTimeout(() => {
      setStatus('saving')
      saveUserData(userId, { wishlist: state.wishlist, disliked: state.disliked, filters: state.filters })
        .then(() => setStatus('synced'))
        .catch(() => setStatus('error'))
    }, 1500)
    return () => clearTimeout(timer)
  }, [userId, state.wishlist, state.disliked, state.filters])

  return userId ? status : 'off'
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
