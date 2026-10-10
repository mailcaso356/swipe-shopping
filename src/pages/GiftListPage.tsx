import { Check, Pencil, Share2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PriceTag } from '../components/PriceTag'
import { ProductImage } from '../components/ProductImage'
import { Avatar, ProductPicker, useProductsById } from '../components/SocialBits'
import { StoreLink } from '../components/StoreLink'
import { brandAndStore } from '../config/stores'
import { openProduct } from '../lib/productSheet'
import { GIFT_TEMPLATES, LIST_MAX, giftListUrl, hashParam, shareLink, social, type GiftList, type GiftTemplate } from '../lib/social'
import { routeHref } from '../lib/useHashRoute'
import { useAuth } from '../state/AuthState'
import { TemplateChips } from './FriendsPage'

/** Lista regalo (#/regalo/<id>): gli amici segnano "lo prendo io", il proprietario non vede chi e cosa. */
export function GiftListPage() {
  const auth = useAuth()
  const [id] = useState(() => hashParam('regalo'))
  const [list, setList] = useState<GiftList | null | undefined>(id ? undefined : null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(false)
  const [template, setTemplate] = useState<GiftTemplate>('compleanno')
  const { products, loading } = useProductsById(list?.product_ids)
  const userId = auth.user?.id

  const reload = useCallback(async () => {
    if (!id) return
    try {
      setList(await social.list(id))
    } catch (e) {
      setError((e as Error).message)
    }
  }, [id])
  // Anche dopo l'accesso: cambia cosa si vede (proprietario, prenotazioni mie).
  useEffect(() => void Promise.resolve().then(reload), [reload, userId])

  if (error) return <p className="py-10 text-center text-neutral-500">{error}</p>
  if (list === undefined) return <p className="py-10 text-center text-neutral-500">Caricamento…</p>
  if (!list) return <p className="py-10 text-center text-neutral-500">Questa lista non esiste più.</p>

  const t = GIFT_TEMPLATES[list.template]
  const claims = new Map(list.claims.map((c) => [c.product_id, c.mine]))
  const claim = async (productId: string, on: boolean) => {
    setNotice('')
    try {
      await social.claim(list.id, productId, on)
    } catch (e) {
      setNotice((e as Error).message)
    }
    await reload()
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="space-y-2 pt-2">
        <p className="text-xs font-semibold tracking-wide text-rose-500 uppercase">Lista regalo</p>
        <h1 className="text-2xl font-bold">
          {t.emoji} {t.label}
        </h1>
        <a href={`#/u/${list.owner.code}`} className="flex items-center gap-2 text-sm text-neutral-600">
          <Avatar emoji={list.owner.avatar} size="sm" />
          {list.is_owner ? 'La tua lista' : `di ${list.owner.handle}`} · {list.product_ids.length} prodotti
        </a>
      </div>

      {list.is_owner ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              if ((await shareLink(`La mia lista "${t.label}" su Swipe Shopping`, giftListUrl(list.id))) === 'copied') setNotice('Link copiato.')
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-500 py-3 font-semibold text-[#fff] active:scale-[0.98]"
          >
            <Share2 className="size-5" /> Manda agli amici
          </button>
          <button
            type="button"
            onClick={() => {
              setTemplate(list.template)
              setEditing(true)
            }}
            className="flex items-center gap-2 rounded-full bg-white px-4 font-semibold ring-1 ring-neutral-200"
          >
            <Pencil className="size-4" /> Modifica
          </button>
        </div>
      ) : (
        <p className="text-sm text-neutral-600">
          Segna "Lo prendo io" su quello che regali: gli altri amici lo vedono, {list.owner.handle} no.
        </p>
      )}
      {notice && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">{notice}</p>}
      {loading && products.length < list.product_ids.length && <p className="text-sm text-neutral-500">Caricamento prodotti…</p>}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {products.map((product) => {
          const claimed = claims.get(product.id)
          return (
            <li key={product.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <button type="button" onClick={() => openProduct(product)} aria-label={`Dettagli di ${product.title}`} className="relative aspect-square">
                <ProductImage product={product} className={`size-full ${claimed === false ? 'opacity-40' : ''}`} />
                {claimed !== undefined && (
                  <span className="absolute top-2 left-2 rounded-full bg-neutral-900/85 px-2 py-0.5 text-xs font-medium text-white">
                    {claimed ? 'Lo prendi tu' : 'Già preso'}
                  </span>
                )}
              </button>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase">{brandAndStore(product)}</p>
                <h3 className="line-clamp-2 text-sm leading-snug font-medium">{product.title}</h3>
                <div className="mt-auto pt-1">
                  <PriceTag product={product} />
                </div>
                {!list.is_owner &&
                  (!auth.user ? (
                    <a href={routeHref('profilo')} className="mt-2 text-center text-xs font-medium text-neutral-600 underline">
                      Accedi per dire "lo prendo io"
                    </a>
                  ) : claimed === false ? null : (
                    <button
                      type="button"
                      onClick={() => claim(product.id, !claimed)}
                      className={`mt-2 flex items-center justify-center gap-1 rounded-full py-2 text-sm font-semibold ring-1 active:scale-95 ${
                        claimed ? 'bg-emerald-600 text-[#fff] ring-emerald-600' : 'bg-white ring-neutral-200'
                      }`}
                    >
                      {claimed && <Check className="size-4" />}
                      {claimed ? 'Lo prendo io (annulla)' : 'Lo prendo io'}
                    </button>
                  ))}
                <StoreLink
                  product={product}
                  className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-full bg-neutral-900 px-3 py-2 text-sm font-semibold text-white active:scale-95"
                >
                  Acquista
                </StoreLink>
              </div>
            </li>
          )
        })}
      </ul>

      {editing && (
        <ProductPicker
          title="Modifica la lista"
          hint={`Scegli il tipo di lista e fino a ${LIST_MAX} preferiti.`}
          min={1}
          max={LIST_MAX}
          initial={list.product_ids}
          confirmLabel="Salva"
          onClose={() => setEditing(false)}
          onConfirm={async (ids) => {
            setEditing(false)
            try {
              await social.saveList(list.id, template, ids)
            } catch (e) {
              setNotice((e as Error).message)
            }
            await reload()
          }}
        >
          <TemplateChips value={template} onChange={setTemplate} />
        </ProductPicker>
      )}
    </div>
  )
}
