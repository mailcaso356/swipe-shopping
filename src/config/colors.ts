/**
 * Colori del filtro, ricavati dal titolo dei prodotti (italiano e inglese).
 * `swatch` è il pallino mostrato accanto al nome nei filtri.
 */
export const COLORS = [
  { id: 'Nero', swatch: '#171717', words: ['nero', 'nera', 'neri', 'nere', 'black', 'schwarz'] },
  { id: 'Bianco', swatch: '#ffffff', words: ['bianco', 'bianca', 'bianchi', 'bianche', 'white', 'panna', 'avorio', 'ivory', 'off[- ]white'] },
  { id: 'Grigio', swatch: '#9ca3af', words: ['grigio', 'grigia', 'grigi', 'grey', 'gray', 'antracite', 'anthracite', 'charcoal'] },
  { id: 'Beige', swatch: '#e7d7b9', words: ['beige', 'sabbia', 'sand', 'crema', 'cream', 'ecru', 'écru', 'tan', 'nude'] },
  { id: 'Marrone', swatch: '#7c4a2d', words: ['marrone', 'marroni', 'brown', 'cammello', 'camel', 'cuoio', 'cognac', 'tabacco', 'cioccolato', 'chocolate', 'testa di moro', 'wheat'] },
  { id: 'Blu', swatch: '#1e3a8a', words: ['blu', 'blue', 'blues', 'navy', 'marine', 'marina', 'indigo'] },
  { id: 'Azzurro', swatch: '#7dd3fc', words: ['azzurro', 'azzurra', 'celeste', 'light blue', 'sky blue', 'turchese', 'turquoise'] },
  { id: 'Verde', swatch: '#15803d', words: ['verde', 'verdi', 'green', 'oliva', 'olive', 'kaki', 'khaki', 'militare', 'salvia', 'sage', 'menta', 'mint'] },
  { id: 'Rosso', swatch: '#dc2626', words: ['rosso', 'rossa', 'rossi', 'red', 'bordeaux', 'burgundy', 'borgogna', 'vinaccia', 'wine'] },
  { id: 'Rosa', swatch: '#f9a8d4', words: ['rosa', 'pink', 'fucsia', 'fuchsia', 'cipria'] },
  { id: 'Viola', swatch: '#7c3aed', words: ['viola', 'purple', 'lilla', 'lilac', 'lavanda', 'lavender', 'prugna'] },
  { id: 'Giallo', swatch: '#facc15', words: ['giallo', 'gialla', 'yellow', 'senape', 'mustard', 'ocra'] },
  { id: 'Arancione', swatch: '#f97316', words: ['arancione', 'arancio', 'orange', 'corallo', 'coral', 'ruggine', 'rust'] },
  { id: 'Oro', swatch: '#d4a017', words: ['oro', 'dorato', 'dorata', 'gold', 'golden'] },
  { id: 'Argento', swatch: '#cbd5e1', words: ['argento', 'argentato', 'silver'] },
  { id: 'Multicolore', swatch: 'conic-gradient(#dc2626, #facc15, #15803d, #1e3a8a, #7c3aed, #dc2626)', words: ['multicolore', 'multicolor', 'multicolour', 'fantasia', 'stampa floreale'] },
] as const

export type ColorId = (typeof COLORS)[number]['id']
export const COLOR_ORDER = COLORS.map((c) => c.id) as string[]
export const colorSwatch = (id: string) => COLORS.find((c) => c.id === id)?.swatch

const patterns = COLORS.map((c) => ({ id: c.id, re: new RegExp(`(^|[^\\p{L}])(${c.words.join('|')})(?=$|[^\\p{L}])`, 'iu') }))

/** Colori nominati nel titolo, nell'ordine della palette. */
export function detectColors(title: string): ColorId[] {
  const found = patterns.filter((p) => p.re.test(title)).map((p) => p.id)
  // "Light blue" non è anche Blu.
  if (found.includes('Azzurro') && /light blue|sky blue/i.test(title) && !/(^|[^\p{L}])(blu|navy)(?=$|[^\p{L}])/iu.test(title)) {
    return found.filter((c) => c !== 'Blu')
  }
  return found
}
