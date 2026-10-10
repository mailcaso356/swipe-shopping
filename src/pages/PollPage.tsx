import { Crown, Heart, Share2, ThumbsDown } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PriceTag } from '../components/PriceTag'
import { ProductImage } from '../components/ProductImage'
import { Avatar, useProductsById } from '../components/SocialBits'
import { StoreLink } from '../components/StoreLink'
import { brandAndStore } from '../config/stores'
import { openProduct } from '../lib/productSheet'
import { hashParam, pollUrl, shareLink, social, type Poll } from '../lib/social'
import { routeHref } from '../lib/useHashRoute'

/** Sondaggio "Aiutami a scegliere" (#/sondaggio/<id>): votano tutti quelli che hanno il link, anche senza account. */
export function PollPage() {
  const [id] = useState(() => hashParam('sondaggio'))
  const [poll, setPoll] = useState<Poll | null | undefined>(id ? undefined : null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const { products, loading } = useProductsById(poll?.product_ids)

  const reload = useCallback(async () => {
    if (!id) return
    try {
      setPoll(await social.poll(id))
    } catch (e) {
      setError((e as Error).message)
    }
  }, [id])
  useEffect(() => void Promise.resolve().then(reload), [reload])

  if (error) return <p className="py-10 text-center text-neutral-500">{error}</p>
  if (poll === undefined) return <p className="py-10 text-center text-neutral-500">Caricamento…</p>
  if (!poll) return <p className="py-10 text-center text-neutral-500">Questo sondaggio non esiste più.</p>

  const vote = async (productId: string, yes: boolean) => {
    setPoll({ ...poll, my_votes: { ...poll.my_votes, [productId]: yes } })
    try {
      await social.vote(poll.id, productId, yes)
      await reload()
    } catch (e) {
      setError((e as Error).message)
    }
  }
  const results = poll.results ? new Map(poll.results.map((r) => [r.product_id, r])) : null
  const best = poll.results ? Math.max(...poll.results.map((r) => r.yes)) : 0
  const sorted = results ? [...products].sort((a, b) => (results.get(b.id)?.yes ?? 0) - (results.get(a.id)?.yes ?? 0)) : products
  const left = poll.product_ids.length - Object.keys(poll.my_votes).length

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3 pt-2">
        <Avatar emoji={poll.owner.avatar} />
        <div>
          <p className="text-xs font-semibold tracking-wide text-rose-500 uppercase">Aiutami a scegliere</p>
          <h1 className="text-lg leading-tight font-bold">
            {poll.is_owner ? 'Il tuo sondaggio' : `${poll.owner.handle} chiede: quale ti piace?`}
          </h1>
          <p className="text-sm text-neutral-500">
            {poll.voters} {poll.voters === 1 ? 'voto' : 'voti'} · {poll.closed ? 'chiuso' : `aperto fino al ${new Date(poll.closes_at).toLocaleDateString('it-IT')}`}
          </p>
        </div>
      </div>

      {poll.is_owner && (
        <button
          type="button"
          onClick={async () => {
            if ((await shareLink('Aiutami a scegliere! Quale ti piace di più?', pollUrl(poll.id))) === 'copied') setCopied(true)
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-rose-500 py-3 font-semibold text-[#fff] active:scale-[0.98]"
        >
          <Share2 className="size-5" /> {copied ? 'Link copiato' : 'Manda agli amici'}
        </button>
      )}
      {!poll.is_owner && !results && !poll.closed && (
        <p className="text-sm text-neutral-600">
          Vota sì o no su ogni prodotto: vedi i risultati quando hai finito{left > 0 ? ` (ne mancano ${left})` : ''}.
        </p>
      )}
      {loading && products.length < poll.product_ids.length && <p className="text-sm text-neutral-500">Caricamento prodotti…</p>}

      <ul className="space-y-3">
        {sorted.map((product) => {
          const r = results?.get(product.id)
          const total = r ? r.yes + r.no : 0
          const pct = total ? Math.round((r!.yes / total) * 100) : 0
          const myVote = poll.my_votes[product.id]
          return (
            <li key={product.id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
              <button type="button" onClick={() => openProduct(product)} aria-label={`Dettagli di ${product.title}`} className="shrink-0">
                <ProductImage product={product} className="size-24 overflow-hidden rounded-xl bg-[#fff] [&_span]:text-5xl" />
              </button>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase">{brandAndStore(product)}</p>
                <p className="line-clamp-2 text-sm leading-snug font-medium">{product.title}</p>
                <PriceTag product={product} />
                {r && (
                  <div className="mt-1 space-y-1">
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-rose-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="flex items-center gap-1 text-xs text-neutral-600">
                      {r.yes === best && best > 0 && <Crown className="size-3.5 text-amber-500" />}
                      {r.yes} sì · {r.no} no
                    </p>
                  </div>
                )}
                {!poll.is_owner && !poll.closed && (
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => vote(product.id, false)}
                      aria-pressed={myVote === false}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-sm font-semibold ring-1 active:scale-95 ${
                        myVote === false ? 'bg-neutral-900 text-white ring-neutral-900' : 'bg-white ring-neutral-200'
                      }`}
                    >
                      <ThumbsDown className="size-4" /> No
                    </button>
                    <button
                      type="button"
                      onClick={() => vote(product.id, true)}
                      aria-pressed={myVote === true}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-sm font-semibold ring-1 active:scale-95 ${
                        myVote === true ? 'bg-rose-500 text-[#fff] ring-rose-500' : 'bg-white ring-neutral-200'
                      }`}
                    >
                      <Heart className={`size-4 ${myVote === true ? 'fill-current' : ''}`} /> Sì
                    </button>
                  </div>
                )}
                <StoreLink product={product} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-neutral-600 underline">
                  Vedi nel negozio
                </StoreLink>
              </div>
            </li>
          )
        })}
      </ul>
      <a href={routeHref('scopri')} className="block text-center text-sm font-medium text-neutral-600 underline">
        Scopri altri prodotti con uno swipe
      </a>
    </div>
  )
}
