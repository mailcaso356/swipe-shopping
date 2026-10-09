import type { Product } from '../types/product'
import { track } from './analytics'

const SITE = 'https://swipeshopping.app/'

/** Link all'app che apre direttamente quel prodotto (non al negozio: così chi lo riceve scopre l'app). */
export const productShareUrl = (p: Product) => `${SITE}#/p/${encodeURIComponent(p.id)}`

/** Usa il pannello di condivisione del telefono; dove non c'è copia il link. Ritorna 'copied' se ha copiato. */
export async function shareProduct(p: Product): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = productShareUrl(p)
  const text = `Guarda cosa ho trovato su Swipe Shopping: ${p.brand ? `${p.brand} – ` : ''}${p.title}`
  track('share', p)
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Swipe Shopping', text, url })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  await navigator.clipboard?.writeText(`${text}\n${url}`)
  return 'copied'
}

/** Prodotto condiviso nell'indirizzo (#/p/<id>), se presente. */
export function sharedProductId(hash = window.location.hash) {
  const m = hash.match(/^#\/?p\/(.+)$/)
  return m ? decodeURIComponent(m[1]) : null
}
