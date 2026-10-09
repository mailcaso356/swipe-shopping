import { useApp } from '../state/AppState'

type Mode = 'tutto' | 'offerte' | 'novita'
const TABS: [Mode, string][] = [
  ['tutto', 'Tutto'],
  ['offerte', 'Offerte'],
  ['novita', 'Novità'],
]

/** Scorciatoie sopra il mazzo: sono gli stessi interruttori "Solo in offerta" e "Solo novità" dei filtri. */
export function DeckTabs() {
  const { state, actions } = useApp()
  const f = state.filters
  const mode: Mode = f.onlyNew ? 'novita' : f.onlyDeals ? 'offerte' : 'tutto'
  const choose = (m: Mode) =>
    actions.setFilters({ ...f, onlyDeals: m === 'offerte' || undefined, onlyNew: m === 'novita' || undefined })

  return (
    <div role="tablist" aria-label="Cosa vedere" className="mx-auto grid w-full max-w-xs grid-cols-3 rounded-full bg-neutral-100 p-1 text-sm font-semibold">
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
