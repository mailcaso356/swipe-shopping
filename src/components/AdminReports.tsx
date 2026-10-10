import { useCallback, useEffect, useState } from 'react'
import { social } from '../lib/social'

/** Statistiche: @tag segnalati dagli utenti, con reset al tag generato. */
export function AdminReports() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof social.adminReports>> | null>(null)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    try {
      setRows(await social.adminReports())
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])
  useEffect(() => void Promise.resolve().then(reload), [reload])

  if (error || !rows || rows.length === 0) return null
  return (
    <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <h2 className="font-semibold">Tag segnalati</h2>
      <p className="text-xs text-neutral-500">Con 3 segnalazioni il tag torna da solo quello generato. Reset lo fa subito.</p>
      {rows.map((r) => (
        <div key={r.code} className="flex items-center gap-2 border-t border-neutral-100 pt-2 text-sm">
          <a href={`#/u/${r.code}`} className="min-w-0 flex-1">
            <span className="font-semibold">@{r.tag}</span> <span className="text-neutral-500">· {r.handle}</span>
            <span className="block text-xs text-neutral-500">
              {r.reports} {r.reports === 1 ? 'segnalazione' : 'segnalazioni'}
            </span>
          </a>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm(`Resettare @${r.tag}?`)) return
              await social.adminResetTag(r.code).catch((e: Error) => setError(e.message))
              await reload()
            }}
            className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white"
          >
            Reset
          </button>
        </div>
      ))}
    </section>
  )
}
