import { useSyncExternalStore } from 'react'
import type { Product } from '../types/product'

/** Prodotto aperto nella scheda dettaglio (uno alla volta, da qualsiasi pagina). */
let current: Product | null = null
const listeners = new Set<() => void>()

export function openProduct(p: Product) {
  current = p
  listeners.forEach((fn) => fn())
}
export function closeProduct() {
  current = null
  listeners.forEach((fn) => fn())
}
export function useOpenProduct() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => current,
  )
}
