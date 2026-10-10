import { Check, ChevronDown, Cookie, Cpu, Gift, Moon, Shirt, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { APP_NAME } from '../config/app'
import { SECTIONS, sectionOf, type Universe } from '../config/categories'
import { load, save } from '../lib/storage'
import { useTheme } from '../lib/theme'
import { useApp } from '../state/AppState'

/** Barra in alto: menu delle sezioni a sinistra, logo al centro, tema chiaro/scuro a destra. */
export function Header() {
  const { theme, toggle } = useTheme()
  const { state } = useApp()
  return (
    // Sticky con sfondo pieno: iOS 26 riconosce la barra e usa il suo colore sotto l'ora invece di sfocare il contenuto.
    <header className="sticky top-0 z-20 shrink-0 bg-neutral-50 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-md items-center gap-2 px-2 sm:max-w-2xl">
        <SectionMenu />
        <a href="#/scopri" className="flex flex-1 flex-col items-center leading-none">
          <span className="text-lg font-black tracking-tight">
            {APP_NAME.split(' ')[0]}
            <span className="text-rose-500">{APP_NAME.split(' ').slice(1).join(' ')}</span>
          </span>
          <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.25em] text-rose-500">{sectionOf(state.mode).label}</span>
        </a>
        <span className="w-18" aria-hidden />
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
          title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
          className="grid size-10 place-items-center rounded-full text-neutral-700 transition active:scale-90 active:bg-neutral-100"
        >
          {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
      </div>
    </header>
  )
}

const ICONS: Record<Universe, typeof Shirt> = { moda: Shirt, tech: Cpu, gadget: Gift, snack: Cookie }

/** Sezioni nuove: hanno il segno "Nuovo" finché l'utente non le apre. Aggiungere qui le prossime. */
const NEW_SECTIONS: Universe[] = ['gadget', 'snack']

/** Menu delle sezioni: ognuna è come un'app a sé, con filtri e preferiti suoi. */
function SectionMenu() {
  const { state, actions } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = sectionOf(state.mode)
  const Icon = ICONS[current.id]
  const [visited, setVisited] = useState(() => load<Universe[]>('sectionsVisited', []))
  const [menuSeen, setMenuSeen] = useState(() => load<boolean>('sectionsMenuSeen', false))
  const isNew = (u: Universe) => NEW_SECTIONS.includes(u) && !visited.includes(u) && u !== state.mode
  // Il pallino sul pulsante sparisce alla prima apertura del menu; il "Nuovo" nel menu quando si apre la sezione.
  const dot = !menuSeen && NEW_SECTIONS.some(isNew)

  // Anche se si arriva alla sezione in altri modi (benvenuto, link condiviso): la sezione aperta non è più nuova.
  useEffect(() => {
    const saved = load<Universe[]>('sectionsVisited', [])
    if (NEW_SECTIONS.includes(state.mode) && !saved.includes(state.mode)) save('sectionsVisited', [...saved, state.mode])
  }, [state.mode])

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open)
          if (!menuSeen) {
            setMenuSeen(true)
            save('sectionsMenuSeen', true)
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Sezione ${current.label}: cambia sezione`}
        className="relative flex h-10 w-28 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-rose-500 bg-transparent text-rose-500 active:scale-95"
      >
        {dot && (
          <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-[#8b5cf6] ring-2 ring-neutral-50" aria-label="Nuove sezioni" />
        )}
        <Icon className="size-4 shrink-0" />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Sezioni</span>
          <span className="text-sm font-bold">{current.label}</span>
        </span>
        <ChevronDown className={`size-3.5 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute top-12 left-0 z-30 w-72 overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-neutral-200">
          {SECTIONS.map((s) => {
            const SIcon = ICONS[s.id]
            const active = s.id === state.mode
            return (
              <button
                key={s.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  if (!visited.includes(s.id)) setVisited([...visited, s.id])
                  actions.setMode(s.id)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left active:bg-neutral-100 ${active ? 'bg-neutral-100' : ''}`}
              >
                {/* Colori fissi: ogni sezione mostra il suo colore, qualunque sia quella aperta. */}
                <span className="grid size-9 shrink-0 place-items-center rounded-full text-[#fff]" style={{ background: s.color }}>
                  <SIcon className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="flex items-center gap-1.5 font-semibold">
                    {s.label}
                    {isNew(s.id) && (
                      <span className="rounded-full px-1.5 py-px text-[10px] font-bold uppercase text-[#fff]" style={{ background: s.color }}>
                        Nuovo
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-neutral-500">{s.hint}</span>
                </span>
                {active && <Check className="size-4 shrink-0" style={{ color: s.color }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
