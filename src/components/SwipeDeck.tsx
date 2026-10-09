import { AnimatePresence } from 'framer-motion'
import { Heart, RotateCcw, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { track } from '../lib/analytics'
import { useApp } from '../state/AppState'
import { productImageUrl, storeLinkLabel } from '../config/stores'
import { StoreLink } from './StoreLink'
import { SwipeCard, type SwipeDir } from './SwipeCard'

const preloaded = new Set<string>()
function preload(url?: string) {
  if (!url || preloaded.has(url)) return
  preloaded.add(url)
  const img = new Image()
  img.decoding = 'async'
  img.src = url
}

export function SwipeDeck() {
  const { deck, state, actions } = useApp()
  const [exitDir, setExitDir] = useState<SwipeDir>(1)
  const top = deck[0]
  const visible = deck.slice(0, 3)

  const swipe = useCallback(
    (dir: SwipeDir) => {
      if (!top) return
      setExitDir(dir)
      if (dir === 1) {
        actions.like(top)
        navigator.vibrate?.(12)
      } else actions.dislike(top)
    },
    [top, actions],
  )

  // Una "visualizzazione" per ogni card che arriva in cima.
  useEffect(() => {
    if (top) track('view', top)
  }, [top])

  useEffect(() => {
    deck.slice(1, 6).forEach((p) => preload(productImageUrl(p) ?? undefined))
  }, [deck])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.key === 'ArrowRight') swipe(1)
      else if (e.key === 'ArrowLeft') swipe(-1)
      else if ((e.key === 'z' && (e.ctrlKey || e.metaKey)) || e.key === 'Backspace') actions.undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [swipe, actions])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="relative min-h-0 flex-1">
        <AnimatePresence custom={exitDir}>
          {visible
            .map((p, i) => <SwipeCard key={p.id} product={p} index={i} onSwipe={swipe} />)
            .reverse()}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={actions.undo}
          disabled={!state.lastAction}
          aria-label="Annulla ultimo swipe"
          title="Annulla"
          className="grid size-11 place-items-center rounded-full bg-white text-neutral-500 shadow-md ring-1 ring-black/5 transition active:scale-90 disabled:opacity-30"
        >
          <RotateCcw className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => swipe(-1)}
          aria-label="No, scarta"
          className="flex h-14 items-center gap-2 rounded-full bg-white px-5 font-semibold text-neutral-800 shadow-md ring-1 ring-black/5 transition active:scale-90"
        >
          <X className="size-6" strokeWidth={2.5} /> NO
        </button>
        <button
          type="button"
          onClick={() => swipe(1)}
          aria-label="Sì, salva nei preferiti"
          className="flex h-14 items-center gap-2 rounded-full bg-rose-500 px-5 font-semibold text-white shadow-lg shadow-rose-500/30 transition active:scale-90"
        >
          <Heart className="size-6 fill-current" /> SÌ
        </button>
      </div>
      {top && (
        <StoreLink
          product={top}
          className="mx-auto flex h-11 w-full max-w-[17rem] items-center justify-center gap-2 rounded-full bg-neutral-900 text-sm font-semibold text-white shadow-md transition active:scale-95"
        >
          {storeLinkLabel(top).toUpperCase()}
        </StoreLink>
      )}
    </div>
  )
}
