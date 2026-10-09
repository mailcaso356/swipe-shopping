import { motion, useReducedMotion } from 'framer-motion'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'

/** Indicazione sopra la card: scorri a sinistra per NO, a destra per SÌ. */
export function SwipeHint() {
  const reduce = useReducedMotion()
  const nudge = (dir: 1 | -1) =>
    reduce ? {} : { animate: { x: [0, 5 * dir, 0] }, transition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' as const } }

  return (
    <div className="flex items-center justify-center gap-3 text-xs font-semibold tracking-wide text-neutral-500 select-none" aria-hidden>
      <span className="flex items-center gap-1 text-neutral-700">
        <motion.span {...nudge(-1)} className="inline-flex">
          <ChevronsLeft className="size-4" strokeWidth={2.5} />
        </motion.span>
        NO
      </span>
      <span className="font-normal text-neutral-400">scorri</span>
      <span className="flex items-center gap-1 text-rose-500">
        SÌ
        <motion.span {...nudge(1)} className="inline-flex">
          <ChevronsRight className="size-4" strokeWidth={2.5} />
        </motion.span>
      </span>
    </div>
  )
}
