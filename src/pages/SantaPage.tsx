import { Check, Gift, Share2, UserPlus, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Avatar, FriendPicker, LoginNeeded, ProductStrip } from '../components/SocialBits'
import {
  GIFT_TEMPLATES,
  SANTA_BUDGETS,
  SANTA_THEMES,
  hashParam,
  santaDate,
  santaTitle,
  santaUrl,
  shareLink,
  social,
  type GiftListSummary,
  type SantaGroup,
  type SantaTheme,
} from '../lib/social'
import { routeHref } from '../lib/useHashRoute'
import { useAuth } from '../state/AuthState'

/** Babbo Natale segreto (#/segreto/<id>): gruppo, inviti, estrazione e a chi fai il regalo. */
export function SantaPage() {
  const auth = useAuth()
  const [id] = useState(() => hashParam('segreto'))
  const [group, setGroup] = useState<SantaGroup | null | undefined>(id ? undefined : null)
  const [lists, setLists] = useState<GiftListSummary[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const userId = auth.user?.id

  const reload = useCallback(async () => {
    if (!id) return
    try {
      const [g, mine] = await Promise.all([social.santa(id), social.mine()])
      setGroup(g)
      setLists(mine.lists)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [id])
  useEffect(() => {
    if (userId) void Promise.resolve().then(reload)
  }, [reload, userId])

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setNotice('')
    try {
      await fn()
      await reload()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!auth.ready) return <p className="py-10 text-center text-neutral-500">Caricamento…</p>
  if (!auth.user) return <LoginNeeded text="Accedi per partecipare al Babbo Natale segreto con i tuoi amici." />
  if (error) return <p className="py-10 text-center text-neutral-500">{error}</p>
  if (group === undefined) return <p className="py-10 text-center text-neutral-500">Caricamento…</p>
  if (!group) return <p className="py-10 text-center text-neutral-500">Questo gruppo non esiste più.</p>

  const g = group
  const readyCount = g.members.filter((m) => m.ready).length
  const btn = 'flex flex-1 items-center justify-center gap-2 rounded-full py-3 font-semibold active:scale-[0.98] disabled:opacity-50'

  return (
    <div className="space-y-4 pb-8">
      <div className="space-y-2 pt-2">
        <p className="text-xs font-semibold tracking-wide text-rose-500 uppercase">Babbo Natale segreto 🎅</p>
        <h1 className="text-2xl font-bold">{santaTitle(g.theme)}</h1>
        <div className="flex flex-wrap gap-1.5 text-sm">
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-neutral-200">{g.budget ? `Budget ${g.budget} €` : 'Budget libero'}</span>
          {g.exchange_on && <span className="rounded-full bg-white px-3 py-1 ring-1 ring-neutral-200">Scambio il {santaDate(g.exchange_on)}</span>}
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-neutral-200">
            {g.members.length} {g.members.length === 1 ? 'persona' : 'persone'}
          </span>
        </div>
        <p className="flex items-center gap-2 text-sm text-neutral-600">
          <Avatar emoji={g.owner.avatar} size="sm" />
          {g.is_owner ? 'Organizzi tu' : `Organizza ${g.owner.handle}`}
        </p>
      </div>

      {notice && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">{notice}</p>}

      {!g.is_member ? (
        g.drawn ? (
          <p className="rounded-2xl bg-white p-5 text-center text-sm text-neutral-600 ring-1 ring-black/5">L'estrazione è già stata fatta: non si può più entrare.</p>
        ) : (
          <div className="space-y-3 rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100">
            <p className="text-sm text-rose-900">
              Entra nel gruppo: quando {g.owner.handle} fa l'estrazione scopri a chi fare il regalo. Nessuno saprà chi lo fa a te.
            </p>
            <button type="button" disabled={busy} onClick={() => act(() => social.santaJoin(g.id))} className={`${btn} w-full bg-rose-500 text-[#fff]`}>
              Partecipa
            </button>
          </div>
        )
      ) : (
        <>
          {g.drawn && g.broken && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
              Qualcuno ha lasciato Swipe Shopping dopo l'estrazione.{' '}
              {g.is_owner ? 'Rifai l\'estrazione qui sotto.' : `Chiedi a ${g.owner.handle} di rifare l'estrazione.`}
            </p>
          )}

          {g.drawn && g.gives_to && (
            <div className="space-y-3 rounded-2xl bg-rose-500 p-5 text-[#fff]">
              {!revealed ? (
                <button type="button" onClick={() => setRevealed(true)} className="w-full space-y-1 py-4 text-center">
                  <p className="text-4xl">🎁</p>
                  <p className="text-lg font-bold">Tocca per scoprire a chi fai il regalo</p>
                  <p className="text-sm opacity-90">Occhio a chi guarda lo schermo!</p>
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Avatar emoji={g.gives_to.avatar} size="lg" />
                    <div>
                      <p className="text-sm opacity-90">Fai il regalo a</p>
                      <p className="text-xl font-bold">{g.gives_to.handle}</p>
                    </div>
                  </div>
                  {g.gives_to_list ? (
                    <a href={`#/regalo/${g.gives_to_list.id}`} className="block space-y-2 rounded-xl bg-white p-3 text-neutral-900">
                      <p className="text-sm font-semibold">
                        Le sue idee: {GIFT_TEMPLATES[g.gives_to_list.template].emoji} {GIFT_TEMPLATES[g.gives_to_list.template].label}
                      </p>
                      <ProductStrip ids={g.gives_to_list.product_ids} />
                    </a>
                  ) : (
                    <p className="text-sm opacity-90">Non ha ancora scelto una lista di idee: ripassa più tardi.</p>
                  )}
                </>
              )}
              <label className="flex items-center justify-between gap-3 rounded-xl bg-white/15 px-3 py-2 text-sm font-medium">
                Ho già preso il regalo
                <input
                  type="checkbox"
                  checked={g.my_ready}
                  disabled={busy}
                  onChange={(e) => act(() => social.santaSet(g.id, g.my_list_id, e.target.checked))}
                  className="size-5 accent-neutral-900"
                />
              </label>
            </div>
          )}

          {!g.drawn && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setInviting(true)} className={`${btn} bg-rose-500 text-[#fff]`}>
                <UserPlus className="size-5" /> Invita amici
              </button>
              <button
                type="button"
                onClick={async () => {
                  if ((await shareLink('Partecipa al nostro Babbo Natale segreto su Swipe Shopping!', santaUrl(g.id))) === 'copied') setNotice('Link copiato.')
                }}
                className={`${btn} bg-white ring-1 ring-neutral-200`}
              >
                <Share2 className="size-5" /> Link
              </button>
            </div>
          )}

          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Gift className="size-5 text-rose-500" /> Cosa ti piacerebbe ricevere
            </h2>
            {lists.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Crea una lista regalo in{' '}
                <a href={routeHref('amici')} className="font-medium underline">
                  Amici → Crea
                </a>
                , poi sceglila qui: chi ti pesca la vedrà.
              </p>
            ) : (
              <>
                <p className="text-sm text-neutral-500">Chi ti pesca vedrà questa lista e potrà scegliere da lì.</p>
                <div className="flex flex-wrap gap-1.5">
                  {[null, ...lists].map((l) => {
                    const on = (l?.id ?? null) === g.my_list_id
                    return (
                      <button
                        key={l?.id ?? 'none'}
                        type="button"
                        disabled={busy}
                        aria-pressed={on}
                        onClick={() => act(() => social.santaSet(g.id, l?.id ?? null, g.my_ready))}
                        className={`rounded-full px-3 py-1 text-sm ring-1 ${on ? 'bg-neutral-900 text-white ring-neutral-900' : 'bg-white text-neutral-700 ring-neutral-200'}`}
                      >
                        {l ? `${GIFT_TEMPLATES[l.template].emoji} ${GIFT_TEMPLATES[l.template].label} (${l.product_ids.length})` : 'Nessuna'}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </section>

          <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <h2 className="font-semibold">
              Partecipanti{g.drawn ? ` · ${readyCount} di ${g.members.length} hanno il regalo` : ''}
            </h2>
            {g.members.map((m) => (
              <div key={m.code} className="flex items-center gap-2">
                <Avatar emoji={m.avatar} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {m.handle}
                  {m.is_me && ' (tu)'}
                  {m.code === g.owner.code && <span className="ml-1 text-xs text-neutral-400">organizza</span>}
                </span>
                {g.drawn && m.ready && <Check className="size-4 text-emerald-600" aria-label="Ha il regalo" />}
                {!g.drawn && !m.has_list && <span className="text-xs text-neutral-400">senza lista</span>}
                {!g.drawn && g.is_owner && !m.is_me && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => window.confirm(`Togliere ${m.handle} dal gruppo?`) && act(() => social.santaLeave(g.id, m.code))}
                    aria-label={`Togli ${m.handle}`}
                    className="text-neutral-400"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ))}
            {!g.drawn && g.members.length < 3 && <p className="text-sm text-neutral-500">Servono almeno 3 persone per l'estrazione.</p>}
          </section>

          {g.is_owner && (
            <button
              type="button"
              disabled={busy || g.members.length < 3}
              onClick={() =>
                (!g.drawn || window.confirm('Rifare l\'estrazione? Tutti riceveranno una persona nuova.')) &&
                act(async () => {
                  await social.santaDraw(g.id)
                  setRevealed(false)
                })
              }
              className={`${btn} w-full ${g.drawn ? 'bg-white text-neutral-700 ring-1 ring-neutral-200' : 'bg-neutral-900 text-white'}`}
            >
              {g.drawn ? 'Rifai l\'estrazione' : '🎲 Fai l\'estrazione'}
            </button>
          )}
          {!g.drawn && !g.is_owner && (
            <button
              type="button"
              disabled={busy}
              onClick={() => window.confirm('Uscire dal gruppo?') && act(() => social.santaLeave(g.id, null))}
              className="block w-full text-center text-sm text-neutral-500 underline"
            >
              Esci dal gruppo
            </button>
          )}
          {g.is_owner && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                window.confirm('Eliminare il gruppo per tutti?') &&
                act(async () => {
                  await social.deleteSanta(g.id)
                  window.location.hash = routeHref('amici')
                })
              }
              className="block w-full text-center text-sm text-neutral-500 underline"
            >
              Elimina gruppo
            </button>
          )}
        </>
      )}

      <a href={routeHref('amici')} className="block text-center text-sm font-medium text-neutral-600 underline">
        Torna ad Amici
      </a>

      {inviting && (
        <FriendPicker
          title="Invita al Babbo Natale segreto"
          confirmLabel="Invita"
          onClose={() => setInviting(false)}
          onConfirm={async (codes) => {
            const n = await social.santaInvite(g.id, codes)
            setInviting(false)
            setNotice(n === 0 ? 'Sono già tutti nel gruppo.' : n === 1 ? 'Invito mandato!' : `Invito mandato a ${n} amici!`)
          }}
        />
      )}
    </div>
  )
}

/** Nuovo gruppo: solo opzioni prestabilite. */
export function SantaCreator({ onClose }: { onClose: () => void }) {
  const [theme, setTheme] = useState<SantaTheme>('amici')
  const [budget, setBudget] = useState<number | null>(20)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  // Di solito la vigilia di Natale (quella del prossimo anno, se è già passata).
  const [date, setDate] = useState(() => {
    const year = Number(today.slice(0, 4))
    return `${year}-12-24` >= today ? `${year}-12-24` : `${year + 1}-12-24`
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const chip = (on: boolean) =>
    `rounded-full px-3 py-1 text-sm ring-1 ${on ? 'bg-neutral-900 text-white ring-neutral-900' : 'bg-white text-neutral-700 ring-neutral-200'}`
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nuovo Babbo Natale segreto"
        className="w-full max-w-md space-y-4 rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Nuovo Babbo Natale segreto 🎅</h2>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="text-neutral-500">
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Che gruppo è?</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(SANTA_THEMES) as SantaTheme[]).map((t) => (
              <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(t)} className={chip(theme === t)}>
                {santaTitle(t)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Budget per il regalo</p>
          <div className="flex flex-wrap gap-1.5">
            {[null, ...SANTA_BUDGETS].map((b) => (
              <button key={b ?? 'libero'} type="button" aria-pressed={budget === b} onClick={() => setBudget(b)} className={chip(budget === b)}>
                {b ? `${b} €` : 'Libero'}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center justify-between gap-3 text-sm font-medium">
          Giorno dello scambio
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-full bg-white px-3 py-1.5 text-sm ring-1 ring-neutral-200"
          />
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setError('')
            try {
              const id = await social.createSanta(theme, budget, date && date >= today ? date : null)
              onClose()
              window.location.hash = `#/segreto/${id}`
            } catch (e) {
              setError((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
          className="w-full rounded-full bg-rose-500 py-3 font-semibold text-[#fff] active:scale-[0.98] disabled:opacity-50"
        >
          Crea il gruppo
        </button>
      </div>
    </div>
  )
}
