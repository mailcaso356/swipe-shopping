import { Moon, Sun } from 'lucide-react'
import { APP_NAME } from '../config/app'
import { useTheme } from '../lib/theme'

/** Barra in alto: logo al centro, tema chiaro/scuro a destra. */
export function Header() {
  const { theme, toggle } = useTheme()
  return (
    <header className="shrink-0 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-md items-center gap-2 px-2 sm:max-w-2xl">
        <span className="size-10" aria-hidden />
        <a href="#/scopri" className="flex-1 text-center text-lg font-black tracking-tight">
          {APP_NAME.split(' ')[0]}
          <span className="text-rose-500">{APP_NAME.split(' ').slice(1).join(' ')}</span>
        </a>
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
