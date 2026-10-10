import { QrCode, RefreshCw, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AVATARS, profileUrl, shareLink, social, type MyProfile } from '../lib/social'
import { useAuth } from '../state/AuthState'
import { ProfileQr } from './ProfileQr'
import { Avatar } from './SocialBits'

/** In cima al Profilo: nome, @tag, follower, "Invita amici" e QR (solo con un account). */
export function MyProfileCard() {
  const auth = useAuth()
  const [me, setMe] = useState<MyProfile | null>(null)
  const userId = auth.user?.id
  useEffect(() => {
    if (!userId) return
    let alive = true
    social
      .me()
      .then((m) => alive && setMe(m))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [userId])
  if (!userId || !me) return null
  return <MyCard me={me} onChange={setMe} />
}

function MyCard({ me, onChange }: { me: MyProfile; onChange: (me: MyProfile) => void }) {
  const [notice, setNotice] = useState('')
  const [choosing, setChoosing] = useState(false)
  const [qr, setQr] = useState(false)
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
          <p className="text-lg leading-tight font-bold">{me.handle}</p>
          {me.tag && <p className="truncate text-sm font-medium text-rose-500">@{me.tag}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() => update({ regenerate: true })}
            className="mt-0.5 flex items-center gap-1 text-xs font-medium text-neutral-500 underline active:opacity-60 disabled:opacity-50"
          >
            <RefreshCw className={`size-3 ${busy ? 'animate-spin' : ''}`} /> Genera nuovo nome
          </button>
        </div>
        <div className="flex shrink-0 gap-3 text-center">
          <div>
            <p className="text-xl leading-tight font-bold">{me.followers}</p>
            <p className="text-[11px] text-neutral-500">follower</p>
          </div>
          <div>
            <p className="text-xl leading-tight font-bold">{me.following}</p>
            <p className="text-[11px] text-neutral-500">seguiti</p>
          </div>
        </div>
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
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            if ((await shareLink(`Seguimi su Swipe Shopping! Sono ${me.handle}${me.tag ? ` (@${me.tag})` : ''}`, profileUrl(me.code))) === 'copied') setNotice('Link copiato: incollalo dove vuoi.')
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-neutral-900 py-3 font-semibold text-white active:scale-[0.98]"
        >
          <Share2 className="size-4" /> Invita amici
        </button>
        <button
          type="button"
          onClick={() => setQr(true)}
          className="flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 font-semibold ring-1 ring-neutral-200 active:scale-[0.98]"
        >
          <QrCode className="size-4" /> QR
        </button>
      </div>
      {notice && <p className="text-sm text-neutral-500">{notice}</p>}
      {qr && <ProfileQr me={me} onClose={() => setQr(false)} />}
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
