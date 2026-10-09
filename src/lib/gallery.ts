import { productImageUrl } from '../config/stores'
import type { Product } from '../types/product'
import type { ProductDetails } from './details'

/** Foto del prodotto: la principale e poi quelle aggiuntive, senza doppioni. */
export function galleryOf(p: Product, details: ProductDetails | null) {
  const main = productImageUrl(p)
  return [...new Set([...(main ? [main] : []), ...(details?.images ?? [])])]
}
