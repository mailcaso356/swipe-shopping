import { Check, Search, X } from 'lucide-react'
import { useState } from 'react'

/** Marche: cerca per nome; senza ricerca mostra le selezionate e le più presenti nel catalogo. */
export function BrandPicker({
  brands,
  selected,
  onToggle,
}: {
  /** Ordinate dalla più presente */
  brands: string[]
  selected: string[]
  onToggle: (brand: string) => void
}) {
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const q = query.trim().toLowerCase()
  // Verde = inclusa, rosso = esclusa; nessuna in lista = tutte verdi.
  const isIn = (b: string) => selected.length === 0 || selected.includes(b)
  // In cima le marche "diverse" dalla maggioranza (le poche verdi o le poche rosse), così si vedono subito.
  const fewIn = selected.length > 0 && selected.length <= brands.length / 2
  const first = selected.length === 0 ? [] : brands.filter((b) => isIn(b) === fewIn)
  const list = q
    ? brands.filter((b) => b.toLowerCase().includes(q))
    : [...first, ...brands.filter((b) => !first.includes(b))].slice(0, showAll ? undefined : 16)

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
          const active = isIn(b)
          return (
            <button
              key={b}
              type="button"
              onClick={() => onToggle(b)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition active:scale-95 ${
                active ? 'bg-[#dcfce7] text-[#166534] ring-[#22c55e]' : 'bg-[#fee2e2] text-[#991b1b] ring-[#ef4444]'
              }`}
            >
              {active ? <Check className="size-3.5" /> : <X className="size-3.5" />}
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
      </div>
    </div>
  )
}
