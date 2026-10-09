import { Moon, Search, Sun, X } from 'lucide-react'
import { useState } from 'react'
import { APP_NAME } from '../config/app'
import { routeHref } from '../lib/useHashRoute'
import { useTheme } from '../lib/theme'
import { useApp } from '../state/AppState'

const iconBtn = 'grid size-10 place-items-center rounded-full text-neutral-700 transition active:scale-90 active:bg-neutral-100'

/** Barra in alto: ricerca a sinistra, logo al centro, tema chiaro/scuro a destra. */
export function Header() {
  const { query, actions } = useApp()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)

  const close = () => {
    setOpen(false)
    actions.setQuery('')
  }

  return (
    <header className="shrink-0 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-md items-center gap-2 px-2 sm:max-w-2xl">
        {open ? (
          <form
            role="search"
            className="flex flex-1 items-center gap-2 rounded-full bg-white px-3 ring-1 ring-neutral-200"
            onSubmit={(e) => {
              e.preventDefault()
              ;(document.activeElement as HTMLElement | null)?.blur()
            }}
          >
            <Search className="size-4 shrink-0 text-neutral-400" />
            <input
              autoFocus
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => {
                actions.setQuery(e.target.value)
                if (!location.hash.startsWith('#/scopri')) location.hash = routeHref('scopri')
              }}
              placeholder="Cerca: giacca nera, Nike, sneakers…"
              aria-label="Cerca prodotti"
              className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-neutral-400 [&::-webkit-search-cancel-button]:hidden"
            />
            <button type="button" onClick={close} aria-label="Chiudi la ricerca" className="text-neutral-500">
              <X className="size-5" />
            </button>
          </form>
        ) : (
          <>
            <button type="button" onClick={() => setOpen(true)} aria-label="Cerca" title="Cerca" className={iconBtn}>
              <Search className="size-5" />
            </button>
            <a href="#/scopri" className="flex-1 text-center text-lg font-black tracking-tight">
              {APP_NAME.split(' ')[0]}
              <span className="text-rose-500">{APP_NAME.split(' ').slice(1).join(' ')}</span>
            </a>
          </>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
          title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
          className={iconBtn}
        >
          {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
      </div>
    </header>
  )
}
