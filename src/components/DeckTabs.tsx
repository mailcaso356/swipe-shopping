import { useApp } from '../state/AppState'

type Mode = 'tutto' | 'offerte'
const TABS: [Mode, string][] = [
  ['tutto', 'Tutto'],
  ['offerte', 'Offerte'],
]

/** Scorciatoia sopra il mazzo: è lo stesso interruttore "Solo in offerta" dei filtri. */
export function DeckTabs() {
  const { state, actions } = useApp()
  const f = state.filters
  const mode: Mode = f.onlyDeals ? 'offerte' : 'tutto'
  const choose = (m: Mode) => actions.setFilters({ ...f, onlyDeals: m === 'offerte' || undefined })

  return (
    <div role="tablist" aria-label="Cosa vedere" className="mx-auto grid w-full max-w-60 grid-cols-2 rounded-full bg-neutral-100 p-1 text-sm font-semibold">
      {TABS.map(([m, label]) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          onClick={() => choose(m)}
          className={`rounded-full py-1.5 transition ${mode === m ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
