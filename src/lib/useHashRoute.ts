import { useEffect, useState } from 'react'

/** Routing via hash: funziona su qualsiasi hosting statico e dentro Capacitor. */
export const ROUTES = ['scopri', 'preferiti', 'filtri', 'profilo', 'privacy', 'admin'] as const
export type Route = (typeof ROUTES)[number]

const parse = (): Route => {
  const r = window.location.hash.replace(/^#\/?/, '')
  if (r.startsWith('p/')) return 'scopri' // prodotto condiviso: si apre in Scopri
  return (ROUTES as readonly string[]).includes(r) ? (r as Route) : 'scopri'
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(parse)
  useEffect(() => {
    const onChange = () => setRoute(parse())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export const routeHref = (r: Route) => `#/${r}`
