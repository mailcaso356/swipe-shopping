import { BarChart3, ChevronRight, ShieldCheck, Trash2, Undo2, UserRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { AccountCard } from '../components/AccountCard'
import { InstallCard } from '../components/InstallCard'
import { ADMIN_EMAIL, AMAZON_DISCLOSURE, APP_NAME, GENERIC_DISCLOSURE } from '../config/app'
import { categoryLabel, isCategoryId } from '../config/categories'
import { setConsent, summary } from '../lib/analytics'
import { remove } from '../lib/storage'
import { useConsent } from '../lib/useConsent'
import { routeHref } from '../lib/useHashRoute'
import { useApp } from '../state/AppState'
import { useAuth } from '../state/AuthState'

export function ProfilePage() {
  const { state, wishlist, products, actions } = useApp()
  const consent = useConsent()
  const { user } = useAuth()
  const [confirmClear, setConfirmClear] = useState(false)
  const stats = consent === 'granted' ? summary() : null
  const titleOf = (id: string) => products.find((p) => p.id === id)?.title ?? id

  return (
    <div className="space-y-5 pb-6">
      <h1 className="text-2xl font-bold">Profilo</h1>

      {user?.email?.toLowerCase() === ADMIN_EMAIL && (
        <a
          href={routeHref('admin')}
          className="flex items-center justify-between rounded-2xl bg-neutral-900 p-4 font-semibold text-white shadow-sm"
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="size-5" /> Statistiche dell'app
          </span>
          <ChevronRight className="size-5" />
        </a>
      )}

      <InstallCard />

      <Card icon={<UserRound className="size-5" />} title="Il tuo account">
        <AccountCard>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <Stat label="Preferiti" value={wishlist.length} />
            <Stat label="Scartati" value={state.disliked.length} />
          </div>
        </AccountCard>
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
            <span className="block text-xs text-neutral-500">Anonime, senza cookie di terze parti: ci aiutano a capire cosa piace.</span>
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
        <a href={routeHref('privacy')} className="mt-3 inline-block text-sm font-medium text-rose-600 underline">
          Informativa privacy e termini
        </a>
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
                  remove('onboarded')
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
