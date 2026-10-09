import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { categoryIdsOf, groupsOf, type CategoryId } from '../config/categories'
import { colorSwatch } from '../config/colors'
import { BrandPicker } from '../components/BrandPicker'
import { PriceRange } from '../components/PriceRange'
import { STORES, type StoreId } from '../config/stores'
import { activeFilterCount, facetValues, matchesFilters } from '../lib/filters'
import { useApp } from '../state/AppState'
import { DEFAULT_FILTERS, type Filters } from '../types/product'

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

export function FiltersPage() {
  const { state, products, actions } = useApp()
  const f = state.filters
  const set = (patch: Partial<Filters>) => actions.setFilters({ ...f, ...patch })
  const tech = state.mode === 'tech'
  const facets = facetValues(products)
  const matching = products.filter((p) => p.availability !== 'out_of_stock' && matchesFilters(p, f)).length
  // Come per le marche: nessuna selezionata (o tutte) = tutte le categorie.
  const setStores = (list: StoreId[]) => set({ stores: list.length === facets.stores.length ? [] : list })
  const setCategories = (list: CategoryId[]) => set({ categories: list.length === categoryIdsOf(state.mode).length ? [] : list })

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Filtri{tech ? ' Tech' : ''}</h1>
        {activeFilterCount(f) > 0 && (
          <button type="button" onClick={() => actions.setFilters(DEFAULT_FILTERS)} className="rounded-full bg-rose-600 px-4 py-1.5 text-sm font-semibold text-[#fff] shadow-sm active:scale-95">
            Azzera filtri
          </button>
        )}
      </div>

      {matching === 0 && products.length > 0 && (
        <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Nessun prodotto con questi filtri: prova ad allargarli.</p>
      )}

      {!tech && (
        <Section title="Genere">
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-neutral-100 p-1">
            {(
              [
                ['tutti', 'Tutti'],
                ['donna', 'Donna'],
                ['uomo', 'Uomo'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => set({ gender: value })}
                aria-pressed={f.gender === value}
                className={`rounded-xl py-2 text-sm font-semibold transition ${f.gender === value ? 'bg-white shadow-sm' : 'text-neutral-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>
      )}

      {facets.stores.length > 1 && (
        <Section title="Negozi" hint="Nessuno selezionato = tutti i negozi">
          <div className="flex flex-wrap gap-2">
            {facets.stores.map((id) => (
              <Chip key={id} active={f.stores.includes(id)} onClick={() => setStores(toggle(f.stores, id))}>
                {STORES[id].name}
              </Chip>
            ))}
          </div>
        </Section>
      )}

      <Section title="Offerte">
        <div className="rounded-2xl bg-white ring-1 ring-neutral-200">
          <Toggle
            label="Solo prodotti in offerta"
            hint="Scontati almeno del 5%"
            checked={!!f.onlyDeals}
            onChange={(v) => set({ onlyDeals: v || undefined })}
          />
        </div>
      </Section>

      <Section title="Prezzo" hint="Con un limite di prezzo vedi solo prodotti con prezzo aggiornato">
        <PriceRange min={f.priceMin} max={f.priceMax} onChange={(priceMin, priceMax) => set({ priceMin, priceMax })} />
      </Section>

      <Section title="Categorie" hint="Nessuna selezionata = tutte le categorie">
        <div className="space-y-4">
          {groupsOf(state.mode).map((group) => {
            const ids = group.items.map((i) => i.id) as CategoryId[]
            const all = ids.every((id) => f.categories.includes(id))
            return (
              <div key={group.id} className="space-y-2">
                {ids.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCategories(all ? f.categories.filter((c) => !ids.includes(c)) : [...new Set([...f.categories, ...ids])])
                    }
                    className="flex items-center gap-2 text-sm font-semibold"
                  >
                    <span aria-hidden>{group.emoji}</span> {group.label}
                    <span className="text-xs font-normal text-neutral-400">{all ? 'deseleziona' : 'seleziona tutte'}</span>
                  </button>
                ) : (
                  // Gruppo con una sola voce (es. Profumi): basta il chip, il titolo non è un pulsante.
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <span aria-hidden>{group.emoji}</span> {group.label}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <Chip
                      key={item.id}
                      active={f.categories.includes(item.id)}
                      onClick={() => setCategories(toggle(f.categories, item.id as CategoryId))}
                    >
                      {item.label}
                    </Chip>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {facets.brands.length > 0 && (
        <Section title="Marca" hint="Nessuna selezionata = tutte le marche">
          <BrandPicker
            brands={facets.brands}
            selected={f.brands}
            onToggle={(v) => set({ brands: toggle(f.brands, v) })}
            onClear={() => set({ brands: [] })}
          />
        </Section>
      )}
      {facets.sizes.length > 0 && (
        <ChipSection title="Taglia" values={facets.sizes} selected={f.sizes} onToggle={(v) => set({ sizes: toggle(f.sizes, v) })} />
      )}
      {!tech && facets.colors.length > 0 && (
        <Section title="Colore" hint="Nessuno selezionato = tutti i colori">
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => (
              <Chip key={c} active={f.colors.includes(c)} onClick={() => set({ colors: toggle(f.colors, c) })}>
                {colorSwatch(c) && (
                  <span
                    aria-hidden
                    className="size-3.5 rounded-full ring-1 ring-black/15"
                    style={{ background: colorSwatch(c) }}
                  />
                )}
                {c}
              </Chip>
            ))}
          </div>
        </Section>
      )}

      <Section title="Ordina per">
        <select
          value={f.sort}
          onChange={(e) => set({ sort: e.target.value as Filters['sort'] })}
          className="w-full rounded-xl bg-white px-4 py-2.5 ring-1 ring-neutral-200"
        >
          <option value="mix">Consigliati</option>
          <option value="novita">Novità</option>
          <option value="prezzo_asc">Prezzo crescente</option>
          <option value="prezzo_desc">Prezzo decrescente</option>
        </select>
      </Section>

    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-xs text-neutral-500">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 px-4 py-3">
      <span>
        <span className="block font-medium">{label}</span>
        <span className="text-xs text-neutral-500">{hint}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-6 accent-rose-500" />
    </label>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition active:scale-95 ${
        active ? 'bg-neutral-900 text-white ring-neutral-900' : 'bg-white text-neutral-700 ring-neutral-200'
      }`}
    >
      {active && <Check className="size-3.5" />}
      {children}
    </button>
  )
}

function ChipSection(props: {
  title: string
  values: string[]
  selected: string[]
  label?: (v: string) => string
  onToggle: (v: string) => void
}) {
  return (
    <Section title={props.title}>
      <div className="flex flex-wrap gap-2">
        {props.values.map((v) => (
          <Chip key={v} active={props.selected.includes(v)} onClick={() => props.onToggle(v)}>
            {props.label?.(v) ?? v}
          </Chip>
        ))}
      </div>
    </Section>
  )
}
