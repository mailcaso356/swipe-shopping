import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../state/AuthState'

/** Preferenza "avvisami via email quando un preferito cala di prezzo" (colonna user_data.email_alerts). */
export function EmailAlertsToggle() {
  const { user } = useAuth()
  const userId = user?.id
  const [value, setValue] = useState<{ userId: string; on: boolean } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase || !userId) return
    let cancelled = false
    supabase
      .from('user_data')
      .select('email_alerts')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        // Colonna assente (script non ancora eseguito): nascondo l'opzione.
        if (!cancelled && !error) setValue({ userId, on: (data as { email_alerts?: boolean } | null)?.email_alerts ?? true })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (!supabase || !userId || value?.userId !== userId) return null

  const change = async (on: boolean) => {
    setValue({ userId, on })
    setError('')
    const { error } = await supabase!.from('user_data').upsert({ user_id: userId, email_alerts: on })
    if (error) {
      setValue({ userId, on: !on })
      setError('Non sono riuscito a salvare, riprova.')
    }
  }

  return (
    <div>
      <label className="flex items-center justify-between gap-4">
        <span>
          Avvisami via email quando un preferito cala di prezzo
          <span className="block text-xs text-neutral-500">Al massimo un'email ogni 3 giorni.</span>
        </span>
        <input
          type="checkbox"
          checked={value.on}
          onChange={(e) => void change(e.target.checked)}
          className="size-5 shrink-0 accent-neutral-900"
        />
      </label>
      {error && <p className="mt-1 text-rose-600">{error}</p>}
    </div>
  )
}
