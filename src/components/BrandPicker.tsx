import { Search, X } from 'lucide-react'
import { useState } from 'react'

/** Marche: cerca per nome; senza ricerca mostra le selezionate e le più presenti nel catalogo. */
export function BrandPicker({
  brands,
  selected,
  onToggle,
  onClear,
}: {
  /** Ordinate dalla più presente */
  brands: string[]
  selected: string[]
  onToggle: (brand: string) => void
  onClear: () => void
}) {
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const q = query.trim().toLowerCase()
  const list = q
    ? brands.filter((b) => b.toLowerCase().includes(q))
    : [...selected, ...brands.filter((b) => !selected.includes(b))].slice(0, showAll ? undefined : 16)

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-neutral-200 focus-within:ring-2 focus-within:ring-neutral-900">
        <Search className="size-4 text-neutral-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca una marca"
          className="h-11 w-full bg-transparent text-base outline-none"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {list.map((b) => {
          const active = selected.includes(b)
          return (
            <button
              key={b}
              type="button"
              onClick={() => onToggle(b)}
              aria-pressed={active}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition active:scale-95 ${
                active ? 'bg-neutral-900 text-white ring-neutral-900' : 'bg-white text-neutral-700 ring-neutral-200'
              }`}
            >
              {b}
            </button>
          )
        })}
        {q && list.length === 0 && <p className="text-sm text-neutral-500">Nessuna marca trovata.</p>}
      </div>
      <div className="flex gap-4 text-sm font-medium">
        {!q && brands.length > 16 && (
          <button type="button" onClick={() => setShowAll(!showAll)} className="text-neutral-600 underline underline-offset-4">
            {showAll ? 'Mostra meno' : `Mostra tutte (${brands.length})`}
          </button>
        )}
        {selected.length > 0 && (
          <button type="button" onClick={onClear} className="inline-flex items-center gap-1 text-rose-600">
            <X className="size-4" /> Tutte le marche
          </button>
        )}
      </div>
    </div>
  )
}
