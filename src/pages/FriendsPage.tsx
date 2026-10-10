import { BarChart3, Gift, RefreshCw, Share2, Trash2, UserPlus, Users } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Avatar, LoginNeeded, ProductPicker, ProductStrip } from '../components/SocialBits'
import {
  AVATARS,
  GIFT_TEMPLATES,
  LIST_MAX,
  POLL_MAX,
  giftListUrl,
  pollUrl,
  profileUrl,
  shareLink,
  social,
  timeAgo,
  type FeedItem,
  type GiftListSummary,
  type GiftTemplate,
  type MyProfile,
  type PollSummary,
  type SocialCard,
} from '../lib/social'
import { useAuth } from '../state/AuthState'

interface Data {
  me: MyProfile
  lists: GiftListSummary[]
  polls: PollSummary[]
  feed: FeedItem[]
  following: SocialCard[]
  followers: SocialCard[]
}

/** Amici (#/amici): il mio profilo, sondaggi "Aiutami a scegliere", liste regalo e attività di chi seguo. */
export function FriendsPage() {
  const auth = useAuth()
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const userId = auth.user?.id

  const reload = useCallback(async () => {
    try {
      const me = await social.me()
      const [mine, feed, friends] = await Promise.all([social.mine(), social.feed(), social.friends()])
      setData({ me, ...mine, feed, ...friends })
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    if (userId) void Promise.resolve().then(reload)
  }, [userId, reload])

  if (!auth.enabled) return <p className="py-10 text-center text-neutral-500">Gli amici arriveranno presto.</p>
  if (!auth.ready) return <p className="py-10 text-center text-neutral-500">Caricamento…</p>
  return (
    <div className="space-y-5 pb-6">
      <h1 className="text-2xl font-bold">Amici</h1>
      {!auth.user ? (
        <LoginNeeded text="Con un account puoi invitare gli amici, chiedere un parere sui prodotti e creare liste regalo." />
      ) : error && !data ? (
        <p className="rounded-2xl bg-white p-5 text-center text-sm text-neutral-600 ring-1 ring-black/5">{error}</p>
      ) : !data ? (
        <p className="py-10 text-center text-neutral-500">Caricamento…</p>
      ) : (
        <Loaded data={data} reload={reload} setData={setData} />
      )}
    </div>
  )
}

function Loaded({ data, reload, setData }: { data: Data; reload: () => Promise<void>; setData: (d: Data) => void }) {
  const [picker, setPicker] = useState<null | 'poll' | 'list'>(null)
  const [template, setTemplate] = useState<GiftTemplate>('compleanno')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

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
  const share = async (text: string, url: string) => {
    if ((await shareLink(text, url)) === 'copied') setNotice('Link copiato: incollalo dove vuoi.')
  }

  return (
    <>
      <MyCard me={data.me} onChange={(me) => setData({ ...data, me })} onShare={share} />
      {notice && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">{notice}</p>}

      <Section
        icon={<BarChart3 className="size-5" />}
        title="Aiutami a scegliere"
        action={
          <button type="button" disabled={busy} onClick={() => setPicker('poll')} className={smallBtn}>
            Nuovo
          </button>
        }
      >
        <p className="text-sm text-neutral-500">Scegli da 2 a {POLL_MAX} preferiti: gli amici votano sì o no, anche senza app.</p>
        {data.polls.map((poll) => (
          <Row
            key={poll.id}
            ids={poll.product_ids}
            title={poll.closed ? 'Sondaggio chiuso' : `Aperto fino al ${new Date(poll.closes_at).toLocaleDateString('it-IT')}`}
            subtitle={`${poll.voters ?? 0} ${poll.voters === 1 ? 'voto' : 'voti'}`}
            href={`#/sondaggio/${poll.id}`}
            onShare={() => share('Aiutami a scegliere! Quale ti piace di più?', pollUrl(poll.id))}
            onDelete={() => window.confirm('Eliminare il sondaggio?') && act(() => social.deletePoll(poll.id))}
          />
        ))}
      </Section>

      <Section
        icon={<Gift className="size-5" />}
        title="Liste regalo"
        action={
          <button type="button" disabled={busy} onClick={() => setPicker('list')} className={smallBtn}>
            Nuova
          </button>
        }
      >
        <p className="text-sm text-neutral-500">Gli amici segnano "lo prendo io" e tu non vedi chi: la sorpresa resta.</p>
        {data.lists.map((list) => (
          <Row
            key={list.id}
            ids={list.product_ids}
            title={`${GIFT_TEMPLATES[list.template].emoji} ${GIFT_TEMPLATES[list.template].label}`}
            subtitle={`${list.product_ids.length} prodotti`}
            href={`#/regalo/${list.id}`}
            onShare={() => share(`La mia lista "${GIFT_TEMPLATES[list.template].label}" su Swipe Shopping`, giftListUrl(list.id))}
            onDelete={() => window.confirm('Eliminare la lista?') && act(() => social.deleteList(list.id))}
          />
        ))}
      </Section>

      <Section icon={<Users className="size-5" />} title="Cosa fanno i tuoi amici">
        {data.feed.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {data.following.length === 0
              ? 'Non segui ancora nessuno. Manda il tuo link agli amici: quando lo aprono possono seguirti, e tu apri il loro.'
              : 'Ancora niente di nuovo dai tuoi amici.'}
          </p>
        ) : (
          data.feed.map((item, i) => <FeedRow key={`${item.kind}-${'id' in item ? item.id : item.who.code}-${i}`} item={item} />)
        )}
      </Section>

      <Section icon={<UserPlus className="size-5" />} title={`Amici (${data.following.length} seguiti, ${data.followers.length} ti seguono)`}>
        <FriendList
          title="Segui"
          people={data.following}
          actions={[{ label: 'Smetti di seguire', run: (c) => act(() => social.unfriend(c, 'unfollow')) }]}
        />
        <FriendList
          title="Ti seguono"
          people={data.followers}
          actions={[
            { label: 'Rimuovi', run: (c) => act(() => social.unfriend(c, 'remove')) },
            {
              label: 'Blocca',
              run: (c) => window.confirm('Bloccare? Non potrà più seguirti né vedere le tue liste.') && act(() => social.unfriend(c, 'block')),
            },
          ]}
        />
      </Section>

      {picker === 'poll' && (
        <ProductPicker
          title="Aiutami a scegliere"
          hint={`Scegli da 2 a ${POLL_MAX} preferiti da far votare.`}
          min={2}
          max={POLL_MAX}
          confirmLabel="Crea"
          onClose={() => setPicker(null)}
          onConfirm={(ids) => {
            setPicker(null)
            void act(async () => {
              // Si apre il sondaggio, con il pulsante per mandarlo agli amici (la condivisione vuole un tocco).
              window.location.hash = `#/sondaggio/${await social.createPoll(ids)}`
            })
          }}
        />
      )}
      {picker === 'list' && (
        <ProductPicker
          title="Nuova lista regalo"
          hint={`Scegli il tipo di lista e fino a ${LIST_MAX} preferiti.`}
          min={1}
          max={LIST_MAX}
          confirmLabel="Crea"
          onClose={() => setPicker(null)}
          onConfirm={(ids) => {
            setPicker(null)
            void act(async () => {
              window.location.hash = `#/regalo/${await social.saveList(null, template, ids)}`
            })
          }}
        >
          <TemplateChips value={template} onChange={setTemplate} />
        </ProductPicker>
      )}
    </>
  )
}

const smallBtn = 'rounded-full bg-rose-500 px-3.5 py-1.5 text-sm font-semibold text-[#fff] active:scale-95 disabled:opacity-50'

function MyCard({ me, onChange, onShare }: { me: MyProfile; onChange: (me: MyProfile) => void; onShare: (text: string, url: string) => void }) {
  const [choosing, setChoosing] = useState(false)
  const [busy, setBusy] = useState(false)
  const update = async (patch: Parameters<typeof social.update>[0]) => {
    setBusy(true)
    try {
      onChange(await social.update(patch))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setChoosing(!choosing)} aria-label="Cambia avatar">
          <Avatar emoji={me.avatar} size="lg" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{me.handle}</p>
          <p className="text-sm text-neutral-500">
            {me.followers} ti seguono · segui {me.following}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => update({ regenerate: true })}
          aria-label="Genera un altro nome"
          className="grid size-10 place-items-center rounded-full bg-neutral-100 text-neutral-600 active:scale-90 disabled:opacity-50"
        >
          <RefreshCw className={`size-5 ${busy ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {choosing && (
        <div className="grid grid-cols-7 gap-1.5">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setChoosing(false)
                void update({ avatar: a })
              }}
              className={`grid aspect-square place-items-center rounded-xl text-2xl ${a === me.avatar ? 'bg-rose-100 ring-2 ring-rose-400' : 'bg-neutral-50'}`}
            >
              {a}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => onShare(`Seguimi su Swipe Shopping! Sono ${me.handle}`, profileUrl(me.code))}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 py-3 font-semibold text-white active:scale-[0.98]"
      >
        <Share2 className="size-4" /> Invita amici
      </button>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Mostra ai miei amici cosa salvo nei preferiti</span>
        <input
          type="checkbox"
          checked={me.share_saves}
          disabled={busy}
          onChange={(e) => update({ shareSaves: e.target.checked })}
          className="size-5 accent-rose-500"
        />
      </label>
    </div>
  )
}

function Section({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <span className="text-rose-500">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Row(props: { ids: string[]; title: string; subtitle: string; href: string; onShare: () => void; onDelete: () => void }) {
  return (
    <div className="space-y-2 border-t border-neutral-100 pt-3">
      <a href={props.href} className="block space-y-2">
        <div>
          <p className="font-medium">{props.title}</p>
          <p className="text-xs text-neutral-500">{props.subtitle}</p>
        </div>
        <ProductStrip ids={props.ids} />
      </a>
      <div className="flex gap-4 text-sm">
        <a href={props.href} className="font-medium text-rose-600 underline">
          Apri
        </a>
        <button type="button" onClick={props.onShare} className="font-medium text-neutral-600 underline">
          Condividi
        </button>
        <button type="button" onClick={props.onDelete} className="ml-auto text-neutral-400" aria-label="Elimina">
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}

function FeedRow({ item }: { item: FeedItem }) {
  const text =
    item.kind === 'poll'
      ? 'chiede un parere: quale preferisci?'
      : item.kind === 'list'
        ? `ha una lista: ${GIFT_TEMPLATES[item.template].emoji} ${GIFT_TEMPLATES[item.template].label}`
        : `ha salvato ${item.count === 1 ? 'un prodotto' : `${item.count} prodotti`}`
  const href = item.kind === 'poll' ? `#/sondaggio/${item.id}` : item.kind === 'list' ? `#/regalo/${item.id}` : `#/u/${item.who.code}`
  return (
    <a href={href} className="block space-y-2 border-t border-neutral-100 pt-3">
      <div className="flex items-center gap-2">
        <Avatar emoji={item.who.avatar} size="sm" />
        <p className="text-sm">
          <strong>{item.who.handle}</strong> {text}
          <span className="block text-xs text-neutral-400">{timeAgo(item.at)}</span>
        </p>
      </div>
      <ProductStrip ids={item.product_ids} />
    </a>
  )
}

function FriendList(props: { title: string; people: SocialCard[]; actions: { label: string; run: (code: string) => unknown }[] }) {
  if (props.people.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">{props.title}</p>
      {props.people.map((p) => (
        <div key={p.code} className="flex items-center gap-2">
          <a href={`#/u/${p.code}`} className="flex min-w-0 flex-1 items-center gap-2">
            <Avatar emoji={p.avatar} size="sm" />
            <span className="truncate text-sm font-medium">{p.handle}</span>
          </a>
          {props.actions.map((a) => (
            <button key={a.label} type="button" onClick={() => a.run(p.code)} className="text-xs font-medium text-neutral-500 underline">
              {a.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

export function TemplateChips({ value, onChange }: { value: GiftTemplate; onChange: (t: GiftTemplate) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(GIFT_TEMPLATES) as GiftTemplate[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          aria-pressed={value === t}
          className={`rounded-full px-3 py-1 text-sm ring-1 ${
            value === t ? 'bg-neutral-900 text-white ring-neutral-900' : 'bg-white text-neutral-700 ring-neutral-200'
          }`}
        >
          {GIFT_TEMPLATES[t].emoji} {GIFT_TEMPLATES[t].label}
        </button>
      ))}
    </div>
  )
}
