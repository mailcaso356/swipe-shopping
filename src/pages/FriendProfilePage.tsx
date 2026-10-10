import { Check, Send, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Avatar, LoginNeeded, ProductStrip } from '../components/SocialBits'
import { FEATURES } from '../config/app'
import { GIFT_TEMPLATES, hashParam, social, type FriendProfile } from '../lib/social'
import { routeHref } from '../lib/useHashRoute'
import { useAuth } from '../state/AuthState'

/** Profilo di un amico (#/u/<codice>, il link di invito): seguirlo, vedere liste regalo e sondaggi. */
export function FriendProfilePage() {
  const auth = useAuth()
  const [code] = useState(() => hashParam('u'))
  const [profile, setProfile] = useState<FriendProfile | null | undefined>(code ? undefined : null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const userId = auth.user?.id

  const reload = useCallback(async () => {
    if (!code) return
    try {
      setProfile(await social.profile(code))
    } catch (e) {
      setError((e as Error).message)
    }
  }, [code])
  useEffect(() => {
    if (auth.ready) void Promise.resolve().then(reload)
  }, [reload, auth.ready, userId])

  if (error) return <p className="py-10 text-center text-neutral-500">{error}</p>
  if (profile === undefined) return <p className="py-10 text-center text-neutral-500">Caricamento…</p>
  if (!profile) return <p className="py-10 text-center text-neutral-500">Questo profilo non esiste.</p>

  const toggleFollow = async () => {
    setBusy(true)
    try {
      if (profile.following) await social.unfriend(profile.code, 'unfollow')
      else await social.follow(profile.code)
      await reload()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const canSee = profile.is_me || profile.following

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <Avatar emoji={profile.avatar} size="lg" />
        <h1 className="text-2xl font-bold">{profile.handle}</h1>
        <p className="text-sm text-neutral-500">
          {profile.tag && `@${profile.tag} · `}
          {profile.followers} follower
          {profile.follows_me && ' · ti segue'}
        </p>
      </div>

      {profile.is_me ? (
        <a href={routeHref('amici')} className="block rounded-full bg-neutral-900 py-3 text-center font-semibold text-white">
          Questo è il tuo profilo: vai ad Amici
        </a>
      ) : !auth.user ? (
        <LoginNeeded text={`Accedi o registrati per seguire ${profile.handle} e vedere i suoi sondaggi.`} />
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={toggleFollow}
          className={`flex w-full items-center justify-center gap-2 rounded-full py-3 font-semibold active:scale-[0.98] disabled:opacity-60 ${
            profile.following ? 'bg-white ring-1 ring-neutral-200' : 'bg-rose-500 text-[#fff]'
          }`}
        >
          {profile.following ? <Check className="size-5" /> : <UserPlus className="size-5" />}
          {profile.following ? 'Segui già (tocca per smettere)' : `Segui ${profile.handle}`}
        </button>
      )}

      {!profile.is_me && auth.user && (profile.following || profile.follows_me) && (
        <a
          href={`#/chat/${profile.code}`}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 font-semibold ring-1 ring-neutral-200 active:scale-[0.98]"
        >
          <Send className="size-5" /> Chat: mandagli un prodotto
        </a>
      )}

      {canSee && (
        <>
          {profile.polls.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold">Ti chiede un parere</h2>
              {profile.polls.map((poll) => (
                <a key={poll.id} href={`#/sondaggio/${poll.id}`} className="block space-y-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
                  <p className="text-sm font-medium">Aiutami a scegliere: vota!</p>
                  <ProductStrip ids={poll.product_ids} />
                </a>
              ))}
            </section>
          )}
          {FEATURES.giftLists && (
          <section className="space-y-3">
            <h2 className="font-semibold">Liste regalo</h2>
            {profile.lists.length === 0 && <p className="text-sm text-neutral-500">Nessuna lista per ora.</p>}
            {profile.lists.map((list) => (
              <a key={list.id} href={`#/regalo/${list.id}`} className="block space-y-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
                <p className="text-sm font-medium">
                  {GIFT_TEMPLATES[list.template].emoji} {GIFT_TEMPLATES[list.template].label} · {list.product_ids.length} prodotti
                </p>
                <ProductStrip ids={list.product_ids} />
              </a>
            ))}
          </section>
          )}
        </>
      )}
    </div>
  )
}
