import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authRedirectUrl, supabase } from '../lib/supabase'

/** Messaggi d'errore di Supabase tradotti in italiano semplice. */
function friendlyError(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email o password non corretti.'
  if (m.includes('email not confirmed')) return "Conferma prima l'email: ti abbiamo mandato un link."
  if (m.includes('already registered')) return 'Esiste già un account con questa email. Prova ad accedere.'
  if (m.includes('password should be at least')) return 'La password deve avere almeno 6 caratteri.'
  if (m.includes('rate limit')) return 'Troppi tentativi. Riprova tra qualche minuto.'
  if (m.includes('sending') && m.includes('email')) return "Non siamo riusciti a inviare l'email. Riprova tra qualche minuto."
  if (m.includes('invalid email') || m.includes('unable to validate email')) return "L'indirizzo email non è valido."
  return message
}

async function run(fn: () => Promise<{ error: { message: string } | null }>) {
  const { error } = await fn()
  if (error) throw new Error(friendlyError(error.message))
}

/**
 * Registrazione in attesa di conferma: la password resta solo in memoria per un po'.
 * Quando l'utente conferma l'email (spesso nel browser, fuori dall'app) e torna qui, entriamo da soli
 * invece di chiedergli di accedere di nuovo.
 */
let pendingSignup: { email: string; password: string; until: number } | null = null
const PENDING_MS = 30 * 60_000

function useAutoLoginAfterConfirm(loggedIn: boolean) {
  useEffect(() => {
    if (!supabase || loggedIn) return
    let busy = false
    const tryLogin = async () => {
      const p = pendingSignup
      if (!p || busy || document.visibilityState !== 'visible') return
      if (Date.now() > p.until) {
        pendingSignup = null
        return
      }
      busy = true
      // Finché l'email non è confermata Supabase risponde con un errore: riproviamo più tardi.
      const { error } = await supabase!.auth.signInWithPassword({ email: p.email, password: p.password })
      if (!error) pendingSignup = null
      busy = false
    }
    document.addEventListener('visibilitychange', tryLogin)
    window.addEventListener('focus', tryLogin)
    // Anche senza uscire dall'app (conferma da un altro dispositivo).
    const timer = window.setInterval(tryLogin, 10_000)
    return () => {
      document.removeEventListener('visibilitychange', tryLogin)
      window.removeEventListener('focus', tryLogin)
      window.clearInterval(timer)
    }
  }, [loggedIn])
}

function useAuthStore() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)
  /** true quando l'utente arriva dal link "password dimenticata" */
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    // Togliamo ?code=... dall'indirizzo dopo il ritorno dal link email.
    if (window.location.search.includes('code=')) {
      window.history.replaceState(null, '', authRedirectUrl() + window.location.hash)
    }
    return () => data.subscription.unsubscribe()
  }, [])

  useAutoLoginAfterConfirm(!!session)

  return useMemo(
    () => ({
      enabled: !!supabase,
      ready,
      user: session?.user ?? null,
      recovering,
      signUp: async (email: string, password: string, emailNews: boolean) => {
        await run(() =>
          supabase!.auth.signUp({
            email,
            password,
            // Copiata in user_data.email_news da un trigger (supabase/schema-3.sql).
            options: { emailRedirectTo: authRedirectUrl(), data: { email_news: emailNews } },
          }),
        )
        pendingSignup = { email, password, until: Date.now() + PENDING_MS }
      },
      signIn: (email: string, password: string) => run(() => supabase!.auth.signInWithPassword({ email, password })),
      signOut: () => {
        pendingSignup = null
        return run(() => supabase!.auth.signOut())
      },
      resetPassword: (email: string) =>
        run(() => supabase!.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() })),
      updatePassword: async (password: string) => {
        await run(() => supabase!.auth.updateUser({ password }))
        setRecovering(false)
      },
      deleteAccount: async () => {
        await run(async () => supabase!.rpc('delete_my_account'))
        await supabase!.auth.signOut()
      },
    }),
    [session, ready, recovering],
  )
}

type Auth = ReturnType<typeof useAuthStore>
const Ctx = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthStore()
  return <Ctx.Provider value={auth}>{children}</Ctx.Provider>
}

// oxlint-disable-next-line react/only-export-components -- hook e provider stanno insieme
export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth va usato dentro AuthProvider')
  return ctx
}
