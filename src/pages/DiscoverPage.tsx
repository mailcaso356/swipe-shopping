import { RefreshCw, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { SwipeDeck } from '../components/SwipeDeck'
import { SwipeHint } from '../components/SwipeHint'
import { routeHref } from '../lib/useHashRoute'
import { useApp } from '../state/AppState'

export function DiscoverPage() {
  const { state, deck, actions, query, searching } = useApp()
  const { catalog } = state

  if (catalog.status === 'loading') {
    return (
      <div className="flex flex-1 flex-col gap-4" aria-busy="true" aria-label="Caricamento prodotti">
        <div className="flex-1 animate-pulse rounded-3xl bg-neutral-200/70" />
        <div className="mx-auto h-14 w-64 animate-pulse rounded-full bg-neutral-200/70" />
      </div>
    )
  }

  if (catalog.status === 'error') {
    return (
      <Empty title="Non riusciamo a caricare i prodotti" text={catalog.error}>
        <button type="button" onClick={actions.reloadCatalog} className={primaryBtn}>
          <RefreshCw className="size-4" /> Riprova
        </button>
      </Empty>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {catalog.exploreMode && (
        <p className="rounded-2xl bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 ring-1 ring-amber-200">
          Catalogo in preparazione: per ora ogni card apre una ricerca reale su Amazon.
        </p>
      )}
      {searching && (
        <div className="flex items-center justify-between gap-2 rounded-full bg-white px-4 py-1.5 text-sm ring-1 ring-neutral-200">
          <span className="flex min-w-0 items-center gap-2">
            <Search className="size-4 shrink-0 text-neutral-400" />
            <span className="truncate">
              «{query.trim()}» · {deck.length} {deck.length === 1 ? 'risultato' : 'risultati'}
            </span>
          </span>
          <button type="button" onClick={() => actions.setQuery('')} aria-label="Annulla la ricerca" className="text-neutral-500">
            <X className="size-4" />
          </button>
        </div>
      )}
      {deck.length > 0 ? (
        <>
          {!searching && <SwipeHint />}
          <SwipeDeck />
        </>
      ) : (
        searching ? (
          <Empty title="Nessun risultato" text="Prova con meno parole o un'altra marca.">
            <button type="button" onClick={() => actions.setQuery('')} className={primaryBtn}>
              <X className="size-4" /> Annulla la ricerca
            </button>
          </Empty>
        ) : (
        <Empty title="Hai visto tutto!" text="Non ci sono altri prodotti con questi filtri.">
          <a href={routeHref('filtri')} className={primaryBtn}>
            <SlidersHorizontal className="size-4" /> Modifica i filtri
          </a>
          {state.disliked.length > 0 && (
            <button type="button" onClick={actions.resetSeen} className={secondaryBtn}>
              <Sparkles className="size-4" /> Rivedi i {state.disliked.length} scartati
            </button>
          )}
        </Empty>
        )
      )}
    </div>
  )
}

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-5 py-3 font-semibold text-white active:scale-95'
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-neutral-800 ring-1 ring-neutral-200 active:scale-95'

function Empty({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-5xl" aria-hidden>
        🛍️
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-neutral-500">{text}</p>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </div>
  )
}
