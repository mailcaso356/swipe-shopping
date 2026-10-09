import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { useRef } from 'react'
import { categoryLabel } from '../config/categories'
import { storeName } from '../config/stores'
import type { Product } from '../types/product'
import { PriceTag } from './PriceTag'
import { ProductImage } from './ProductImage'
import { StoreLink } from './StoreLink'

const SWIPE_DISTANCE = 110
const SWIPE_VELOCITY = 600

export type SwipeDir = 1 | -1

const variants = {
  exit: (dir: SwipeDir) => ({
    x: dir * (typeof window === 'undefined' ? 600 : window.innerWidth + 200),
    rotate: dir * 22,
    opacity: 0,
    transition: { duration: 0.32, ease: 'easeOut' as const },
  }),
}

export function SwipeCard({
  product,
  index,
  onSwipe,
}: {
  product: Product
  /** 0 = card in cima */
  index: number
  onSwipe: (dir: SwipeDir) => void
}) {
  const isTop = index === 0
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-300, 0, 300], [-16, 0, 16])
  const likeOpacity = useTransform(x, [20, SWIPE_DISTANCE], [0, 1])
  const nopeOpacity = useTransform(x, [-SWIPE_DISTANCE, -20], [1, 0])
  const dragged = useRef(false)

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) onSwipe(1)
    else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) onSwipe(-1)
    // Il click che segue un trascinamento non deve aprire il link.
    setTimeout(() => (dragged.current = false), 0)
  }

  return (
    <motion.article
      className="absolute inset-0 flex flex-col overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/5"
      style={{ x, rotate, zIndex: 10 - index, touchAction: isTop ? 'pan-y' : undefined }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragStart={() => (dragged.current = true)}
      onDragEnd={onDragEnd}
      initial={{ scale: 0.94, y: 14, opacity: 0 }}
      animate={{ scale: 1 - index * 0.04, y: index * 14, opacity: index > 1 ? 0 : 1 }}
      exit="exit"
      variants={variants}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      aria-hidden={!isTop}
      aria-label={isTop ? product.title : undefined}
    >
      <div className="relative min-h-0 flex-1">
        {isTop ? (
          <StoreLink
            product={product}
            icon={false}
            ariaLabel={`Apri ${product.title} su ${storeName(product.store)}`}
            className="block size-full"
            onClickCapture={(e) => dragged.current && e.preventDefault()}
          >
            <ProductImage product={product} eager className="size-full" />
          </StoreLink>
        ) : (
          <ProductImage product={product} eager={index < 2} className="size-full" />
        )}
        {isTop && (
          <>
            <motion.span
              style={{ opacity: likeOpacity }}
              className="pointer-events-none absolute top-6 left-5 -rotate-12 rounded-xl border-4 border-rose-500 bg-white/80 px-3 py-1 text-2xl font-black tracking-wide text-rose-500"
            >
              MI PIACE
            </motion.span>
            <motion.span
              style={{ opacity: nopeOpacity }}
              className="pointer-events-none absolute top-6 right-5 rotate-12 rounded-xl border-4 border-neutral-800 bg-white/80 px-3 py-1 text-2xl font-black tracking-wide text-neutral-800"
            >
              NO
            </motion.span>
          </>
        )}
        {product.searchQuery && (
          <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-neutral-900/80 px-3 py-1 text-xs font-medium text-white">
            Esplora la categoria
          </span>
        )}
      </div>
      <div className="space-y-1.5 border-t border-neutral-100 px-5 pt-3 pb-4">
        <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
          {product.brand ?? categoryLabel(product.category)} · {storeName(product.store)}
        </p>
        <h2 className="line-clamp-2 text-lg leading-snug font-semibold text-neutral-900">{product.title}</h2>
        <div className="flex items-center justify-between gap-3">
          <PriceTag product={product} size="lg" />
          {isTop && (
            <StoreLink
              product={product}
              className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 underline-offset-4 hover:underline"
              onClickCapture={(e) => dragged.current && e.preventDefault()}
            >
              Apri
            </StoreLink>
          )}
        </div>
      </div>
    </motion.article>
  )
}
