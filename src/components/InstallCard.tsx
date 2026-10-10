import { Share, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { isNative } from '../lib/native'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

const isStandalone = () =>
  isNative ||
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

/** Spiega come aggiungere l'app alla schermata Home. Sparisce quando è già installata. */
export function InstallCard() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    // Android/Chrome: il browser offre l'installazione con un pulsante vero.
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || (!prompt && !isIos())) return null

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        <Smartphone className="size-5" />
        Installa l'app
      </h2>
      {prompt ? (
        <button
          type="button"
          onClick={() => prompt.prompt().then(() => setPrompt(null))}
          className="h-11 w-full rounded-full bg-neutral-900 text-sm font-semibold text-white"
        >
          Aggiungi alla schermata Home
        </button>
      ) : (
        <p className="text-sm text-neutral-600">
          In Safari tocca <Share className="inline size-4 align-text-bottom" /> <strong>Condividi</strong>, poi{' '}
          <strong>Aggiungi alla schermata Home</strong>: si aprirà a schermo intero, come un'app.
        </p>
      )}
    </section>
  )
}
