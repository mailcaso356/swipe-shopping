import { categoryLabel } from '../config/categories'
import { detectColors, type ColorId } from '../config/colors'
import type { Gender, Product } from '../types/product'

/**
 * Ricerca testuale semplice, tutta sul telefono: ogni parola deve comparire nel titolo,
 * nella marca o nella categoria (anche al plurale: "giacca" trova "giacche").
 * I colori ("nera") e il genere ("uomo") diventano filtri veri.
 */
const STOPWORDS = new Set(['da', 'di', 'del', 'della', 'per', 'con', 'e', 'il', 'la', 'lo', 'le', 'i', 'gli', 'un', 'una', 'in'])
const GENDERS: Record<string, Gender> = { uomo: 'uomo', uomini: 'uomo', men: 'uomo', donna: 'donna', donne: 'donna', women: 'donna' }

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')

const words = (s: string) => normalize(s).split(/[^a-z0-9]+/).filter(Boolean)

/** "giacca" → "giacc", così trova anche "giacche"; le parole corte restano intere. */
const stem = (w: string) => (w.length > 4 ? w.replace(/[aeiouy]$/, '') : w)

export interface Query {
  terms: string[]
  colors: ColorId[]
  gender?: Gender
}

export function parseQuery(text: string): Query | null {
  const q: Query = { terms: [], colors: [] }
  for (const w of words(text)) {
    if (STOPWORDS.has(w)) continue
    if (GENDERS[w]) {
      q.gender = GENDERS[w]
      continue
    }
    const colors = detectColors(w)
    if (colors.length) q.colors.push(...colors)
    else q.terms.push(stem(w))
  }
  return q.terms.length || q.colors.length || q.gender ? q : null
}

const index = new WeakMap<Product, string[]>()
function wordsOf(p: Product) {
  let w = index.get(p)
  if (!w) {
    w = words(`${p.title} ${p.brand ?? ''} ${categoryLabel(p.category)}`)
    index.set(p, w)
  }
  return w
}

export function matchesQuery(p: Product, q: Query) {
  if (q.gender && p.gender !== q.gender && p.gender !== 'unisex') return false
  if (q.colors.length && !q.colors.some((c) => p.colors?.includes(c))) return false
  const w = wordsOf(p)
  return q.terms.every((t) => w.some((x) => x.startsWith(t)))
}
