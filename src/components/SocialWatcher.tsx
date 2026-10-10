import { useEffect } from 'react'
import { refreshUnseen } from '../lib/social'
import { useAuth } from '../state/AuthState'

/** Social in sottofondo: aggiorna il pallino delle novità sulla scheda Amici. */
export function SocialWatcher() {
  const auth = useAuth()
  const userId = auth.user?.id

  useEffect(() => {
    if (!userId) return
    void refreshUnseen()
    const timer = window.setInterval(() => document.visibilityState === 'visible' && void refreshUnseen(), 60_000)
    const onVisible = () => document.visibilityState === 'visible' && void refreshUnseen()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId])

  return null
}
