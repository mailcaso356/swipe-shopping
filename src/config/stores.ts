import type { Product } from '../types/product'

export const AMAZON_TAG: string = import.meta.env?.VITE_AMAZON_TAG || 'mrofferta09-21'

export interface StoreConfig {
  id: string
  name: string
  /** Negozio attivo nell'app (serve un programma di affiliazione approvato) */
  enabled: boolean
  /** Ore dopo cui un prezzo inserito a mano non viene più mostrato */
  priceMaxAgeHours: number
  /** Costruisce il link affiliato. Restituisce null se il prodotto non ha un link valido. */
  buildUrl: (p: Product) => string | null
  /** Immagine ufficiale ricavata dal codice prodotto, usata se manca `imageUrl` */
  buildImageUrl?: (p: Product) => string | null
}

const fromAffiliateUrl = (p: Product) => (p.affiliateUrl?.startsWith('https://') ? p.affiliateUrl : null)

export const STORES = {
  amazon: {
    id: 'amazon',
    name: 'Amazon',
    enabled: true,
    // Le regole Amazon Associates non consentono prezzi più vecchi di 24 ore.
    priceMaxAgeHours: 24,
    buildUrl: (p) => {
      if (p.searchQuery) {
        return `https://www.amazon.it/s?k=${encodeURIComponent(p.searchQuery)}&tag=${AMAZON_TAG}`
      }
      return /^[A-Z0-9]{10}$/.test(p.externalId)
        ? `https://www.amazon.it/dp/${p.externalId}?tag=${AMAZON_TAG}`
        : null
    },
    // Lo stesso link immagine generato dalla barra SiteStripe di Amazon Affiliati.
    buildImageUrl: (p) =>
      !p.searchQuery && /^[A-Z0-9]{10}$/.test(p.externalId)
        ? `https://ws-eu.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${p.externalId}&Format=_SL500_&ID=AsinImage&MarketPlace=IT&ServiceVersion=20070822&WS=1&tag=${AMAZON_TAG}&language=it_IT`
        : null,
  },
  // Negozi predisposti: si attivano quando c'è un programma di affiliazione
  // approvato (es. tramite Awin) e i prodotti hanno `affiliateUrl`.
  zalando: { id: 'zalando', name: 'Zalando', enabled: false, priceMaxAgeHours: 72, buildUrl: fromAffiliateUrl },
  asos: { id: 'asos', name: 'ASOS', enabled: false, priceMaxAgeHours: 72, buildUrl: fromAffiliateUrl },
  aboutyou: { id: 'aboutyou', name: 'ABOUT YOU', enabled: false, priceMaxAgeHours: 72, buildUrl: fromAffiliateUrl },
  nike: { id: 'nike', name: 'Nike', enabled: false, priceMaxAgeHours: 72, buildUrl: fromAffiliateUrl },
  adidas: { id: 'adidas', name: 'Adidas', enabled: false, priceMaxAgeHours: 72, buildUrl: fromAffiliateUrl },
} satisfies Record<string, StoreConfig>

export type StoreId = keyof typeof STORES

export const isStoreId = (id: string): id is StoreId => id in STORES
export const storeName = (id: StoreId) => STORES[id].name
export const productUrl = (p: Product) => STORES[p.store]?.buildUrl(p) ?? null
export const productImageUrl = (p: Product): string | null => {
  if (p.imageUrl) return p.imageUrl
  const store: StoreConfig | undefined = STORES[p.store]
  return store?.buildImageUrl?.(p) ?? null
}
export const storeLinkLabel = (p: Product) =>
  p.searchQuery ? `Cerca su ${storeName(p.store)}` : `Vedi su ${storeName(p.store)}`
