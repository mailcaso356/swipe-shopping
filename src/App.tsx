import { BottomNav } from './components/BottomNav'
import { ConsentBanner } from './components/ConsentBanner'
import { APP_NAME } from './config/app'
import { useHashRoute } from './lib/useHashRoute'
import { Welcome } from './components/Welcome'
import { DiscoverPage } from './pages/DiscoverPage'
import { FiltersPage } from './pages/FiltersPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ProfilePage } from './pages/ProfilePage'
import { WishlistPage } from './pages/WishlistPage'

export default function App() {
  const route = useHashRoute()
  const isDiscover = route === 'scopri'

  return (
    <div className="flex h-dvh flex-col bg-neutral-50 text-neutral-900">
      <header className="shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-md items-center justify-center px-4 sm:max-w-2xl">
          <a href="#/scopri" className="text-lg font-black tracking-tight">
            {APP_NAME.split(' ')[0]}
            <span className="text-rose-500">{APP_NAME.split(' ').slice(1).join(' ')}</span>
          </a>
        </div>
      </header>
      <main
        className={`mx-auto flex w-full min-h-0 flex-1 flex-col px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] ${
          isDiscover ? 'max-w-md overflow-hidden' : 'max-w-4xl overflow-y-auto'
        }`}
      >
        {route === 'scopri' && <DiscoverPage />}
        {route === 'preferiti' && <WishlistPage />}
        {route === 'filtri' && <FiltersPage />}
        {route === 'profilo' && <ProfilePage />}
        {route === 'privacy' && <PrivacyPage />}
      </main>
      <ConsentBanner />
      <Welcome />
      <BottomNav current={route} />
    </div>
  )
}
