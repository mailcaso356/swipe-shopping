import { useEffect, useState } from 'react'
import { loadDetails, type ProductDetails } from './details'

/** Dettagli del prodotto (null finché non arrivano o se non ci sono). */
export function useDetails(id: string | undefined, enabled = true) {
  const [state, setState] = useState<{ id: string; details: ProductDetails | null } | null>(null)
  useEffect(() => {
    if (!id || !enabled) return
    let cancelled = false
    loadDetails(id).then((details) => !cancelled && setState({ id, details }))
    return () => {
      cancelled = true
    }
  }, [id, enabled])
  return state && state.id === id ? state.details : null
}
