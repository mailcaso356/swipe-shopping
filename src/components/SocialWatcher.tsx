import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { friendSavesMap, refreshUnseen, resetFriendSaves, type SocialCard } from '../lib/social'
import { useApp } from '../state/AppState'
import { useAuth } from '../state/AuthState'
import { Avatar } from './SocialBits'

/**
 * Social in sottofondo: aggiorna il pallino delle novità sulla scheda Amici e, quando salvi un prodotto
 * già salvato da un amico, mostra "È un match!".
 */
export function SocialWatcher() {
  const auth = useAuth()
  const { wishlist } = useApp()
  const userId = auth.user?.id
  const [match, setMatch] = useState<{ title: string; who: SocialCard[] } | null>(null)
  const known = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!userId) return
    void refreshUnseen()
    const timer = window.setInterval(() => document.visibilityState === 'visible' && void refreshUnseen(), 60_000)
    const onVisible = () => document.visibilityState === 'visible' && void refreshUnseen()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      resetFriendSaves()
    }
  }, [userId])

  useEffect(() => {
    const ids = new Set(wishlist.map((w) => w.product.id))
    const before = known.current
    known.current = ids
    if (!userId || !before) return
    // Un solo prodotto nuovo = un "mi piace" (più prodotti insieme = sincronizzazione dall'account).
    const addedAll = wishlist.filter((w) => !before.has(w.product.id))
    if (addedAll.length !== 1) return
    const added = addedAll[0]
    void friendSavesMap().then((map) => {
      const who = map.get(added.product.id)
      if (who?.length) setMatch({ title: added.product.title, who })
    })
  }, [wishlist, userId])

  useEffect(() => {
    if (!match) return
    const t = window.setTimeout(() => setMatch(null), 3500)
    return () => window.clearTimeout(t)
  }, [match])

  return (
    <AnimatePresence>
      {match && (
        <motion.a
          href="#/amici"
          onClick={() => setMatch(null)}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-x-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-rose-500 p-3 text-[#fff] shadow-xl"
        >
          <Avatar emoji={match.who[0].avatar} size="sm" />
          <span className="min-w-0 flex-1 text-sm">
            <strong className="block">È un match! 💞</strong>
            <span className="line-clamp-1">
              Anche {match.who.map((w) => w.handle).join(', ')} {match.who.length === 1 ? 'lo vuole' : 'lo vogliono'}
            </span>
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  )
}
