import { BarChart3, Layers, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PriceTag } from '../components/PriceTag'
import { ProductImage } from '../components/ProductImage'
import { Avatar, LoginNeeded, ProductPicker, ProductStrip, useProductsById } from '../components/SocialBits'
import { openProduct } from '../lib/productSheet'
import { REACTIONS, hashParam, refreshUnseen, social, timeAgo, type ChatMessage, type SocialCard } from '../lib/social'
import { routeHref } from '../lib/useHashRoute'
import { useAuth } from '../state/AuthState'
import type { Product } from '../types/product'

/** Chat con un amico (#/chat/<codice>): si mandano solo prodotti; si risponde solo con un'emoji. */
export function ChatPage() {
  const auth = useAuth()
  const [code] = useState(() => hashParam('chat'))
  const [chat, setChat] = useState<{ who: SocialCard; messages: ChatMessage[] } | null | undefined>(code ? undefined : null)
  const [error, setError] = useState('')
  const [picking, setPicking] = useState(false)
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const userId = auth.user?.id
  const ids = chat?.messages.flatMap((m) => (m.product_id ? [m.product_id] : [])) ?? []
  const { products } = useProductsById(ids.length ? ids : undefined)

  const reload = useCallback(async () => {
    if (!code) return
    try {
      const c = await social.chat(code)
      setChat(c)
      if (c?.messages.some((m) => !m.from_me && !m.seen)) await social.chatSeen(code).then(refreshUnseen)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [code])

  useEffect(() => {
    if (!userId) return
    void Promise.resolve().then(reload)
    // Chat aperta: controlla ogni tanto se è arrivato qualcosa.
    const timer = setInterval(() => document.visibilityState === 'visible' && void reload(), 15000)
    return () => clearInterval(timer)
  }, [reload, userId])

  const count = chat?.messages.length ?? 0
  useEffect(() => {
    if (count) endRef.current?.scrollIntoView({ block: 'end' })
  }, [count, products.length])

  if (!auth.ready) return <p className="py-10 text-center text-neutral-500">Caricamento…</p>
  if (!auth.user) return <LoginNeeded text="Accedi per mandare prodotti ai tuoi amici." />
  if (error) return <p className="py-10 text-center text-neutral-500">{error}</p>
  if (chat === undefined) return <p className="py-10 text-center text-neutral-500">Caricamento…</p>
  if (!chat) return <p className="py-10 text-center text-neutral-500">Puoi scrivere solo ai tuoi amici.</p>

  const react = async (m: ChatMessage, emoji: string) => {
    const next = m.reply_emoji === emoji ? null : emoji
    setChat({ ...chat, messages: chat.messages.map((x) => (x.id === m.id ? { ...x, reply_emoji: next } : x)) })
    await social.chatReact(m.id, next).catch((e: Error) => setError(e.message))
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 py-3">
        <a href={`#/u/${chat.who.code}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar emoji={chat.who.avatar} />
          <div className="min-w-0">
            <p className="truncate font-bold">{chat.who.handle}</p>
            {chat.who.tag && <p className="truncate text-xs text-neutral-500">@{chat.who.tag}</p>}
          </div>
        </a>
        <button
          type="button"
          disabled={sending}
          onClick={() => setPicking(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-[#fff] active:scale-95 disabled:opacity-50"
        >
          <Plus className="size-4" /> Manda
        </button>
      </div>

      <div className="flex-1 space-y-4 py-4">
        {chat.messages.length === 0 && (
          <p className="py-10 text-center text-sm text-neutral-500">
            Tocca "Manda" e scegli un prodotto dai tuoi preferiti: qui vedete tutto quello che vi scambiate.
          </p>
        )}
        {chat.messages.map((m) => (
          <Bubble key={m.id} m={m} product={products.find((p) => p.id === m.product_id)} onReact={(e) => react(m, e)} />
        ))}
        <div ref={endRef} className="scroll-mb-[calc(6rem+env(safe-area-inset-bottom))]" />
      </div>

      <a href={routeHref('amici')} className="block pb-4 text-center text-xs text-neutral-500 underline">
        Torna ad Amici
      </a>

      {picking && (
        <ProductPicker
          title={`Manda a ${chat.who.handle}`}
          hint="Scegli fino a 5 prodotti dai tuoi preferiti."
          min={1}
          max={5}
          confirmLabel="Manda"
          onClose={() => setPicking(false)}
          onConfirm={async (picked) => {
            setPicking(false)
            setSending(true)
            try {
              for (const id of picked) await social.send([chat.who.code], 'consiglio', { productId: id })
              await reload()
            } catch (e) {
              setError((e as Error).message)
            } finally {
              setSending(false)
            }
          }}
        />
      )}
    </div>
  )
}

function Bubble({ m, product, onReact }: { m: ChatMessage; product?: Product; onReact: (emoji: string) => void }) {
  const side = m.from_me ? 'items-end' : 'items-start'
  const card = `relative w-full overflow-hidden rounded-2xl text-left shadow-sm ring-1 ring-black/5 ${m.from_me ? 'bg-rose-50' : 'bg-white'}`
  let body
  if (m.kind === 'consiglio') {
    if (!product) {
      body = <div className={`${card} p-3 text-sm text-neutral-500`}>Prodotto non più disponibile</div>
    } else {
      body = (
        <button type="button" onClick={() => openProduct(product)} className={card}>
          <ProductImage product={product} className="aspect-[4/3] w-full bg-[#fff] [&_span]:text-5xl" />
          <div className="space-y-1 p-3">
            <p className="line-clamp-2 text-sm font-medium">{product.title}</p>
            <PriceTag product={product} />
          </div>
        </button>
      )
    }
  } else {
    const poll = m.kind === 'sondaggio'
    body = (
      <a href={poll ? `#/sondaggio/${m.ref_id}` : `#/insieme/${m.ref_id}`} className={`${card} block space-y-2 p-3`}>
        <p className="flex items-center gap-2 text-sm font-semibold">
          {poll ? <BarChart3 className="size-4 text-rose-500" /> : <Layers className="size-4 text-rose-500" />}
          {poll ? (m.from_me ? 'Hai chiesto un parere' : 'Ti chiede un parere: vota!') : m.from_me ? 'Swipe insieme' : 'Ti invita a Swipe insieme'}
        </p>
        {m.product_ids && <ProductStrip ids={m.product_ids} />}
      </a>
    )
  }
  return (
    <div className={`flex flex-col gap-1 ${side}`}>
      <div className="relative w-[75%] max-w-xs">
        {body}
        {m.reply_emoji && (
          <span className={`absolute -bottom-3 ${m.from_me ? 'left-2' : 'right-2'} rounded-full bg-white px-1.5 text-base shadow ring-1 ring-black/5`}>
            {m.reply_emoji}
          </span>
        )}
      </div>
      {!m.from_me && m.kind === 'consiglio' && product && (
        <div className="mt-2 flex gap-1" aria-label="Rispondi con un'emoji">
          {REACTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onReact(e)}
              aria-pressed={m.reply_emoji === e}
              className={`rounded-full px-1.5 py-0.5 text-base ${m.reply_emoji === e ? 'bg-rose-100 ring-1 ring-rose-300' : 'opacity-60'}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <p className={`text-[11px] text-neutral-400 ${m.reply_emoji ? 'mt-2' : ''}`}>{timeAgo(m.at)}</p>
    </div>
  )
}
