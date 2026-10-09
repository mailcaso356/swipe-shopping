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
    <header className="shrink-0 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-md items-center gap-2 px-2 sm:max-w-2xl">
        <button
          type="button"
          onClick={() => actions.setMode(tech ? 'moda' : 'tech')}
          aria-label={tech ? 'Torna alla moda' : 'Passa alla sezione tech'}
          // Colori fissi: il pulsante mostra il colore della sezione in cui porta (rosa moda, arancione tech).
          className={`flex h-9 w-20 items-center justify-center gap-1 rounded-full text-sm font-semibold text-[#fff] active:scale-95 ${
            tech ? 'bg-[#f43f5e]' : 'bg-[#f97316]'
          }`}
        >
          {tech ? <Shirt className="size-4" /> : <Cpu className="size-4" />}
          {tech ? 'Moda' : 'Tech'}
        </button>
        <a href="#/scopri" className="flex-1 text-center text-lg font-black tracking-tight">
          {APP_NAME.split(' ')[0]}
          <span className="text-rose-500">{APP_NAME.split(' ').slice(1).join(' ')}</span>
        </a>
        <span className="w-10" aria-hidden />
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
