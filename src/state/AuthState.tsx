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

  return useMemo(
    () => ({
      enabled: !!supabase,
      ready,
      user: session?.user ?? null,
      recovering,
      signUp: (email: string, password: string, emailNews: boolean) =>
        run(() =>
          supabase!.auth.signUp({
            email,
            password,
            // Copiata in user_data.email_news da un trigger (supabase/schema-3.sql).
            options: { emailRedirectTo: authRedirectUrl(), data: { email_news: emailNews } },
          }),
        ),
      signIn: (email: string, password: string) => run(() => supabase!.auth.signInWithPassword({ email, password })),
      signOut: () => run(() => supabase!.auth.signOut()),
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
