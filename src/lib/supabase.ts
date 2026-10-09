import { createClient } from '@supabase/supabase-js'

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
export const authRedirectUrl = () => `${window.location.origin}${window.location.pathname}`
