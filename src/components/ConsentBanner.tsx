import { setConsent } from '../lib/analytics'
import { useConsent } from '../lib/useConsent'

export function ConsentBanner() {
  const consent = useConsent()
  if (consent !== 'unset') return null
  return (
    <div
      role="dialog"
      aria-label="Consenso statistiche"
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-4"
    >
      <div className="mx-auto max-w-md rounded-2xl bg-neutral-900 p-3 text-xs text-white shadow-2xl">
        <p>
          Ci aiuti a migliorare con statistiche anonime d'uso? Nessun cookie di terze parti, puoi cambiare idea dal
          Profilo.
        </p>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => setConsent('denied')} className="flex-1 rounded-full bg-white/10 py-1.5 text-sm font-semibold">
            Rifiuta
          </button>
          <button type="button" onClick={() => setConsent('granted')} className="flex-1 rounded-full bg-white py-1.5 text-sm font-semibold text-neutral-900">
            Accetta
          </button>
        </div>
      </div>
    </div>
  )
}
