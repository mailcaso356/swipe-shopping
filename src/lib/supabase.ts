import { createClient } from '@supabase/supabase-js'
import { APP_AUTH_URL, isNative } from './native'

const url: string | undefined = import.meta.env.VITE_SUPABASE_URL
const anonKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Client Supabase per account e sincronizzazione. È null finché il progetto non è configurato:
 * in quel caso l'app funziona come prima, con i dati salvati solo sul dispositivo.
 */
export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          // PKCE: il codice torna nella query (?code=), così non si scontra con il routing via #.
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null

/** Indirizzo a cui tornano i link delle email (conferma, recupero password). */
// Nell'app le email riaprono l'app stessa. Se Supabase non ha questo indirizzo tra quelli consentiti
// usa il sito: la conferma vale lo stesso e l'app entra da sola (vedi useAutoLoginAfterConfirm).
export const authRedirectUrl = () => (isNative ? APP_AUTH_URL : `${window.location.origin}${window.location.pathname}`)
