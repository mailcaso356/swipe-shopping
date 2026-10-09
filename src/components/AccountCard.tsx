import { CheckCircle2, CloudOff, Loader2, LogOut, Mail, Trash2, UserRound } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useApp, type SyncStatus } from '../state/AppState'
import { useAuth } from '../state/AuthState'

type Mode = 'accedi' | 'registrati' | 'recupera'

const SYNC_LABEL: Record<SyncStatus, ReactNode> = {
  off: null,
  loading: (
    <>
      <Loader2 className="size-4 animate-spin" /> Recupero i tuoi dati…
    </>
  ),
  saving: (
    <>
      <Loader2 className="size-4 animate-spin" /> Salvataggio…
    </>
  ),
  synced: (
    <>
      <CheckCircle2 className="size-4 text-emerald-600" /> Dati salvati nel tuo account
    </>
  ),
  error: (
    <>
      <CloudOff className="size-4 text-rose-600" /> Salvataggio non riuscito, riproverò alla prossima modifica
    </>
  ),
}

/** Accesso, registrazione e gestione dell'account (Supabase). */
export function AccountCard({ children }: { children?: ReactNode }) {
  const auth = useAuth()
  const { sync, actions } = useApp()

  if (!auth.enabled) {
    return (
      <>
        <p className="text-sm text-neutral-600">
          Per ora preferiti e filtri restano salvati su questo dispositivo. Account e sincronizzazione arriveranno presto.
        </p>
        {children}
      </>
    )
  }
  if (!auth.ready) return <p className="text-sm text-neutral-500">Caricamento…</p>
  if (auth.recovering) return <NewPasswordForm />
  if (auth.user) {
    return (
      <LoggedIn
        email={auth.user.email ?? ''}
        sync={sync}
        onSignOut={async () => {
          await auth.signOut()
          actions.clearAll()
        }}
        onDelete={async () => {
          await auth.deleteAccount()
          actions.clearAll()
        }}
      >
        {children}
      </LoggedIn>
    )
  }
  return (
    <>
      <p className="mb-3 text-sm text-neutral-600">
        Crea un account gratuito per non perdere i preferiti e ritrovarli su ogni dispositivo.
      </p>
      <AuthForm />
      {children}
    </>
  )
}

function LoggedIn({
  email,
  sync,
  onSignOut,
  onDelete,
  children,
}: {
  email: string
  sync: SyncStatus
  onSignOut: () => Promise<void>
  onDelete: () => Promise<void>
  children?: ReactNode
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const act = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Qualcosa è andato storto.')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="flex items-center gap-2">
        <UserRound className="size-4 text-neutral-500" />
        <span className="truncate font-medium">{email}</span>
      </p>
      {SYNC_LABEL[sync] && <p className="flex items-center gap-2 text-neutral-600">{SYNC_LABEL[sync]}</p>}
      {children}
      {error && <p className="text-rose-600">{error}</p>}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => act(onSignOut)}
          className="inline-flex items-center gap-2 text-left font-medium disabled:opacity-40"
        >
          <LogOut className="size-4" /> Esci
        </button>
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2">
            <span>Eliminare l'account e tutti i dati salvati?</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => act(onDelete)}
              className="rounded-full bg-rose-600 px-3 py-1 font-semibold text-white disabled:opacity-40"
            >
              Sì, elimina
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="px-2 py-1 font-medium text-neutral-500">
              Annulla
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-2 text-left font-medium text-rose-600"
          >
            <Trash2 className="size-4" /> Elimina account
          </button>
        )}
      </div>
    </div>
  )
}

function AuthForm() {
  const auth = useAuth()
  const [mode, setMode] = useState<Mode>('accedi')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
    setInfo('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    try {
      if (mode === 'accedi') await auth.signIn(email.trim(), password)
      if (mode === 'registrati') {
        await auth.signUp(email.trim(), password)
        setInfo(`Ti abbiamo mandato un'email a ${email.trim()}: apri il link per confermare l'account.`)
      }
      if (mode === 'recupera') {
        await auth.resetPassword(email.trim())
        setInfo("Se l'email è registrata riceverai un link per scegliere una nuova password.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Qualcosa è andato storto.')
    } finally {
      setBusy(false)
    }
  }

  const input =
    'w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-base outline-none focus:border-neutral-900'

  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      {mode !== 'recupera' && (
        <div className="grid grid-cols-2 rounded-full bg-neutral-100 p-1 font-medium">
          {(['accedi', 'registrati'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`rounded-full py-1.5 ${mode === m ? 'bg-white shadow-sm' : 'text-neutral-500'}`}
            >
              {m === 'accedi' ? 'Accedi' : 'Registrati'}
            </button>
          ))}
        </div>
      )}
      {mode === 'recupera' && <p className="text-neutral-600">Inserisci la tua email: ti mandiamo un link per reimpostare la password.</p>}
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={input}
      />
      {mode !== 'recupera' && (
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'accedi' ? 'current-password' : 'new-password'}
          placeholder={mode === 'accedi' ? 'Password' : 'Password (almeno 6 caratteri)'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={input}
        />
      )}
      {error && <p className="text-rose-600">{error}</p>}
      {info && (
        <p className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-emerald-800">
          <Mail className="mt-0.5 size-4 shrink-0" />
          {info}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-neutral-900 font-semibold text-white disabled:opacity-50"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {mode === 'accedi' ? 'Accedi' : mode === 'registrati' ? 'Crea account' : 'Invia link'}
      </button>
      <button
        type="button"
        onClick={() => switchMode(mode === 'recupera' ? 'accedi' : 'recupera')}
        className="w-full text-center font-medium text-neutral-500"
      >
        {mode === 'recupera' ? "Torna all'accesso" : 'Password dimenticata?'}
      </button>
    </form>
  )
}

function NewPasswordForm() {
  const auth = useAuth()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await auth.updatePassword(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Qualcosa è andato storto.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      <p className="text-neutral-600">Scegli una nuova password per il tuo account.</p>
      <input
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
        placeholder="Nuova password (almeno 6 caratteri)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-base outline-none focus:border-neutral-900"
      />
      {error && <p className="text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-neutral-900 font-semibold text-white disabled:opacity-50"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        Salva password
      </button>
    </form>
  )
}
