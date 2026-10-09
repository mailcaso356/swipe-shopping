// Ricava i colori dal titolo per tutti i prodotti di public/catalog.json (`--write` per salvare).
import { readFileSync, writeFileSync } from 'node:fs'
import { detectColors } from '../src/config/colors.ts'

const file = new URL('../public/catalog.json', import.meta.url)
const catalog = JSON.parse(readFileSync(file, 'utf8')) as { title: string; colors?: string[] }[]
const count = new Map<string, number>()
let none = 0
for (const p of catalog) {
  const colors = [...new Set([...(p.colors ?? []), ...detectColors(p.title)])]
  if (colors.length) p.colors = colors
  else none++
  for (const c of colors) count.set(c, (count.get(c) ?? 0) + 1)
}
for (const [c, n] of [...count].sort((a, b) => b[1] - a[1])) console.log(`${n}\t${c}`)
console.log(`${none} prodotti senza colore riconosciuto su ${catalog.length}`)
if (process.argv.includes('--write')) writeFileSync(file, JSON.stringify(catalog, null, 1) + '\n')
