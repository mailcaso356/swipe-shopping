import { Check, Folder, FolderPlus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useApp } from '../state/AppState'
import type { Product } from '../types/product'

/** Finestra per spostare un preferito in una cartella (o crearne una nuova). */
export function FolderPicker({ product, onClose }: { product: Product; onClose: () => void }) {
  const { wishlist, actions } = useApp()
  const current = wishlist.find((w) => w.product.id === product.id)?.folder
  const folders = [...new Set(wishlist.map((w) => w.folder).filter((f): f is string => !!f))].sort((a, b) =>
    a.localeCompare(b, 'it'),
  )
  const [name, setName] = useState('')

  const choose = (folder?: string) => {
    actions.setFolder(product, folder)
    onClose()
  }
  const create = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim()) choose(name)
  }

  const row = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-medium active:bg-neutral-100'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 pb-[12dvh]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sposta in una cartella"
        className="w-full max-w-sm space-y-3 rounded-3xl bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Sposta in una cartella</h2>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="text-neutral-500">
            <X className="size-5" />
          </button>
        </div>
        <p className="line-clamp-1 text-sm text-neutral-500">{product.title}</p>
        <div className="max-h-64 overflow-y-auto">
          <button type="button" className={row} onClick={() => choose(undefined)}>
            <span className="size-4" />
            <span className="flex-1">Nessuna cartella</span>
            {!current && <Check className="size-4 text-rose-500" />}
          </button>
          {folders.map((f) => (
            <button key={f} type="button" className={row} onClick={() => choose(f)}>
              <Folder className="size-4 text-neutral-500" />
              <span className="flex-1 truncate">{f}</span>
              {current === f && <Check className="size-4 text-rose-500" />}
            </button>
          ))}
        </div>
        <form onSubmit={create} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder="Nuova cartella (es. Regali)"
            className="min-w-0 flex-1 rounded-full bg-neutral-50 px-4 py-2.5 text-base ring-1 ring-neutral-200 outline-none focus:ring-neutral-900"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 font-semibold text-white disabled:opacity-40"
          >
            <FolderPlus className="size-4" /> Crea
          </button>
        </form>
      </div>
    </div>
  )
}
