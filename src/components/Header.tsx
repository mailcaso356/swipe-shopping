import { Cpu, Moon, Shirt, Sun } from 'lucide-react'
import { APP_NAME } from '../config/app'
import { useTheme } from '../lib/theme'
import { useApp } from '../state/AppState'

/** Barra in alto: passaggio moda/tech a sinistra, logo al centro, tema chiaro/scuro a destra. */
export function Header() {
  const { theme, toggle } = useTheme()
  const { state, actions } = useApp()
  const tech = state.mode === 'tech'
  return (
    // Sticky con sfondo pieno: iOS 26 riconosce la barra e usa il suo colore sotto l'ora invece di sfocare il contenuto.
    <header className="sticky top-0 z-20 shrink-0 bg-neutral-50 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-md items-center gap-2 px-2 sm:max-w-2xl">
        <button
          type="button"
          onClick={() => actions.setMode(tech ? 'moda' : 'tech')}
          aria-label={tech ? 'Torna alla moda' : 'Passa alla sezione tech'}
          // Colori fissi: il pulsante mostra il colore della sezione in cui porta (rosa moda, arancione tech).
          className={`flex h-10 w-24 items-center justify-center gap-1.5 rounded-full border-[1.5px] bg-transparent active:scale-95 ${
            tech ? 'border-[#f43f5e] text-[#f43f5e]' : 'border-[#f97316] text-[#f97316]'
          }`}
        >
          {tech ? <Shirt className="size-4 shrink-0" /> : <Cpu className="size-4 shrink-0" />}
          <span className="flex flex-col items-start leading-none">
            <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Passa a</span>
            <span className="text-sm font-bold">{tech ? 'Moda' : 'Tech'}</span>
          </span>
        </button>
        <a href="#/scopri" className="flex flex-1 flex-col items-center leading-none">
          <span className="text-lg font-black tracking-tight">
            {APP_NAME.split(' ')[0]}
            <span className="text-rose-500">{APP_NAME.split(' ').slice(1).join(' ')}</span>
          </span>
          <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.25em] text-rose-500">{tech ? 'Tech' : 'Moda'}</span>
        </a>
        <span className="w-14" aria-hidden />
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
