// Dopo `vite build`: riscrive dist/catalog.json compatto (senza spazi e senza prodotti esauriti),
// così l'app scarica e legge meno dati all'avvio.
import { readFileSync, writeFileSync } from 'node:fs'

const file = new URL('../dist/catalog.json', import.meta.url)
const source = readFileSync(file, 'utf8')
const catalog = (JSON.parse(source) as { availability?: string }[]).filter((p) => p.availability !== 'out_of_stock')
const out = JSON.stringify(catalog)
writeFileSync(file, out)
console.log(`catalog.json: ${(source.length / 1e6).toFixed(2)} MB → ${(out.length / 1e6).toFixed(2)} MB, ${catalog.length} prodotti`)
