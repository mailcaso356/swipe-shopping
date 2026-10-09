import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { ALL_CATEGORY_IDS, CATEGORY_GROUPS, type CategoryId } from '../config/categories'
import { BrandPicker } from '../components/BrandPicker'
import { PriceRange } from '../components/PriceRange'
import { STORES, type StoreId } from '../config/stores'
import { activeFilterCount, facetValues, matchesFilters } from '../lib/filters'
import { routeHref } from '../lib/useHashRoute'
import { useApp } from '../state/AppState'
import { DEFAULT_FILTERS, type Filters } from '../types/product'

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

export function FiltersPage() {
  const { state, products, actions } = useApp()
  const f = state.filters
  const set = (patch: Partial<Filters>) => actions.setFilters({ ...f, ...patch })
  const facets = facetValues(products)
  const matching = products.filter((p) => p.availability !== 'out_of_stock' && matchesFilters(p, f)).length
  // Come per le marche: nessuna selezionata (o tutte) = tutte le categorie.
  const setCategories = (list: CategoryId[]) => set({ categories: list.length === ALL_CATEGORY_IDS.length ? [] : list })

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Filtri</h1>
        {activeFilterCount(f) > 0 && (
          <button type="button" onClick={() => actions.setFilters(DEFAULT_FILTERS)} className="text-sm font-medium text-rose-600">
            Azzera
          </button>
        )}
      </div>

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

      <Section title="Offerte">
        <label className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 ring-1 ring-neutral-200">
          <span>
            <span className="block font-medium">Solo prodotti in offerta</span>
            <span className="text-xs text-neutral-500">Mostra solo quelli scontati almeno del 5%</span>
          </span>
          <input
            type="checkbox"
            checked={!!f.onlyDeals}
            onChange={(e) => set({ onlyDeals: e.target.checked || undefined })}
            className="size-6 accent-rose-500"
          />
        </label>
      </Section>

      <Section title="Prezzo" hint="Con un limite di prezzo vedi solo prodotti con prezzo aggiornato">
        <PriceRange min={f.priceMin} max={f.priceMax} onChange={(priceMin, priceMax) => set({ priceMin, priceMax })} />
      </Section>

      <Section title="Categorie" hint="Nessuna selezionata = tutte le categorie">
        <div className="space-y-4">
          {CATEGORY_GROUPS.map((group) => {
            const ids = group.items.map((i) => i.id) as CategoryId[]
            const all = ids.every((id) => f.categories.includes(id))
            return (
              <div key={group.id} className="space-y-2">
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

      {facets.stores.length > 1 && (
        <ChipSection title="Negozio" values={facets.stores} selected={f.stores} label={(s) => STORES[s as StoreId].name}
          onToggle={(v) => set({ stores: toggle(f.stores, v as StoreId) })} />
      )}
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
      {facets.colors.length > 0 && (
        <ChipSection title="Colore" values={facets.colors} selected={f.colors} onToggle={(v) => set({ colors: toggle(f.colors, v) })} />
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

      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 px-4">
        <a
          href={routeHref('scopri')}
          className="mx-auto flex h-12 max-w-md items-center justify-center rounded-full bg-neutral-900 font-semibold text-white shadow-lg"
        >
          {matching > 0 ? 'Applica filtri' : 'Nessun prodotto con questi filtri'}
        </a>
      </div>
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
