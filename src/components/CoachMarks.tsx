import { Hand, Heart, Images, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { load, save } from '../lib/storage'
import { ONBOARDED_EVENT } from './Welcome'

/** Guida rapida al primo utilizzo, sopra la prima card (dopo il benvenuto). */
export function CoachMarks() {
  const [onboarded, setOnboarded] = useState(() => load<boolean>('onboarded', false))
  const [seen, setSeen] = useState(() => load<boolean>('coachSeen', false))

  useEffect(() => {
    const on = () => setOnboarded(true)
    window.addEventListener(ONBOARDED_EVENT, on)
    return () => window.removeEventListener(ONBOARDED_EVENT, on)
  }, [])

  if (!onboarded || seen) return null
  const close = () => {
    save('coachSeen', true)
    setSeen(true)
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center rounded-3xl bg-black/65 p-5 backdrop-blur-[2px]" onClick={close}>
      <div role="dialog" aria-label="Come funziona" className="w-full space-y-4 text-[#fff]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Come funziona</h2>
          <button type="button" onClick={close} aria-label="Chiudi la guida" className="opacity-80">
            <X className="size-5" />
          </button>
        </div>
        <Tip icon={<Heart className="size-5" />}>
          <strong>Scorri a destra</strong> se ti piace: finisce nei Preferiti. <strong>A sinistra</strong> se non fa per te.
        </Tip>
        <Tip icon={<Images className="size-5" />}>
          <strong>Tocca i lati della foto</strong> per vedere le altre foto del prodotto.
        </Tip>
        <Tip icon={<Hand className="size-5" />}>
          <strong>Tocca il centro</strong> o il nome per aprire la scheda con caratteristiche e prezzo.
        </Tip>
        <button type="button" onClick={close} className="h-12 w-full rounded-full bg-rose-500 font-semibold text-[#fff]">
          Ho capito
        </button>
      </div>
    </div>
  )
}

function Tip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex gap-3 text-[15px] leading-snug">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#fff]/15">{icon}</span>
      <span>{children}</span>
    </p>
  )
}
