// Applica classify() e isJunk() a public/catalog.json: stampa i cambi di categoria e gli articoli scartati.
import { readFileSync, writeFileSync } from 'node:fs'
import { classify, isJunk } from './classify.ts'

const file = new URL('../public/catalog.json', import.meta.url)
let catalog = JSON.parse(readFileSync(file, 'utf8')) as { title: string; category: string }[]
const moves = new Map<string, number>()
for (const p of catalog) {
  const next = classify(p.title, p.category)
  if (next !== p.category) {
    const k = `${p.category} → ${next}`
    moves.set(k, (moves.get(k) ?? 0) + 1)
    p.category = next
  }
}
const junk = catalog.filter((p) => isJunk(p.title, p.category))
for (const p of junk) console.log(`scartato\t${p.category}\t${p.title.slice(0, 80)}`)
catalog = catalog.filter((p) => !junk.includes(p))
for (const [k, n] of [...moves].sort((a, b) => b[1] - a[1])) console.log(`${n}\t${k}`)
if (process.argv.includes('--write')) writeFileSync(file, JSON.stringify(catalog, null, 1) + '\n')
