import { BarChart3, Info, ShieldCheck, Trash2, Undo2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { AMAZON_DISCLOSURE, APP_NAME, GENERIC_DISCLOSURE } from '../config/app'
import { categoryLabel, isCategoryId } from '../config/categories'
import { setConsent, summary } from '../lib/analytics'
import { useConsent } from '../lib/useConsent'
import { useApp } from '../state/AppState'

export function ProfilePage() {
  const { state, wishlist, products, actions } = useApp()
  const consent = useConsent()
  const [confirmClear, setConfirmClear] = useState(false)
  const stats = consent === 'granted' ? summary() : null
  const titleOf = (id: string) => products.find((p) => p.id === id)?.title ?? id

  return (
    <div className="space-y-5 pb-6">
      <h1 className="text-2xl font-bold">Profilo</h1>

      <Card icon={<Info className="size-5" />} title="Il tuo account">
        <p className="text-sm text-neutral-600">
          Per ora preferiti e filtri restano salvati su questo dispositivo. Account e sincronizzazione arriveranno presto.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <Stat label="Preferiti" value={wishlist.length} />
          <Stat label="Scartati" value={state.disliked.length} />
        </div>
      </Card>

      <Card icon={<BarChart3 className="size-5" />} title="Statistiche">
        {stats ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <Stat label="Visti" value={stats.views} />
              <Stat label="Mi piace" value={stats.likes} />
              <Stat label="No" value={stats.dislikes} />
              <Stat label="Click negozio" value={stats.clicks} />
            </div>
            <p className="text-neutral-600">
              Click / visualizzazioni: <strong>{(stats.ctr * 100).toFixed(1)}%</strong>
            </p>
            {stats.topCategories.length > 0 && (
              <TopList
                title="Categorie preferite"
                rows={stats.topCategories.map(([id, n]) => [isCategoryId(id) ? categoryLabel(id) : id, n])}
              />
            )}
            {stats.topProducts.length > 0 && (
              <TopList title="Prodotti più interessanti" rows={stats.topProducts.map(([id, n]) => [titleOf(id), n])} />
            )}
          </div>
        ) : (
          <p className="text-sm text-neutral-600">Attiva le statistiche anonime qui sotto per vedere i tuoi numeri.</p>
        )}
      </Card>

      <Card icon={<ShieldCheck className="size-5" />} title="Privacy">
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>
            Statistiche anonime di utilizzo
            <span className="block text-xs text-neutral-500">Restano su questo dispositivo, nessun cookie di terze parti.</span>
          </span>
          <input
            type="checkbox"
            checked={consent === 'granted'}
            onChange={(e) => setConsent(e.target.checked ? 'granted' : 'denied')}
            className="size-5 accent-neutral-900"
          />
        </label>
        <p className="mt-3 text-xs text-neutral-500">
          {GENERIC_DISCLOSURE} {AMAZON_DISCLOSURE}
        </p>
      </Card>

      <Card icon={<Trash2 className="size-5" />} title="Dati">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={actions.resetSeen}
            disabled={state.disliked.length === 0}
            className="inline-flex items-center gap-2 text-left text-sm font-medium disabled:opacity-40"
          >
            <Undo2 className="size-4" /> Rivedi i prodotti scartati
          </button>
          {confirmClear ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>Cancellare preferiti, filtri e statistiche?</span>
              <button
                type="button"
                onClick={() => {
                  actions.clearAll()
                  setConsent('unset')
                  setConfirmClear(false)
                }}
                className="rounded-full bg-rose-600 px-3 py-1 font-semibold text-white"
              >
                Sì, cancella
              </button>
              <button type="button" onClick={() => setConfirmClear(false)} className="px-2 py-1 font-medium text-neutral-500">
                Annulla
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-2 text-left text-sm font-medium text-rose-600"
            >
              <Trash2 className="size-4" /> Cancella tutti i miei dati
            </button>
          )}
        </div>
      </Card>

      <p className="text-center text-xs text-neutral-400">{APP_NAME} · versione {__APP_VERSION__}</p>
    </div>
  )
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-neutral-50 py-2">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  )
}

function TopList({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase">{title}</h3>
      <ol className="space-y-1">
        {rows.map(([name, n]) => (
          <li key={name} className="flex justify-between gap-3">
            <span className="truncate">{name}</span>
            <span className="text-neutral-500">{n}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
