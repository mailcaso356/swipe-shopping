// Dopo `vite build`: riscrive dist/catalog.json compatto (senza spazi e senza prodotti esauriti),
// così l'app scarica e legge meno dati all'avvio.
import { readFileSync, writeFileSync } from 'node:fs'
import { UNIVERSES, universeOf, type CategoryId } from '../src/config/categories.ts'

const file = new URL('../dist/catalog.json', import.meta.url)
const source = readFileSync(file, 'utf8')
const catalog = (JSON.parse(source) as { availability?: string }[]).filter((p) => p.availability !== 'out_of_stock')
const out = JSON.stringify(catalog)
writeFileSync(file, out)
// Una copia per sezione, più leggera: senza campi ricostruibili (vedi expand() in src/lib/catalog.ts).
// catalog.json resta intero per le versioni dell'app già installate.
for (const section of UNIVERSES) {
  const list = catalog
    .filter((p) => universeOf((p as { category: CategoryId }).category) === section)
    .map((raw) => {
      const { source: _s, externalId: _e, ...p } = raw as Record<string, unknown>
      if (p.availability === 'in_stock') delete p.availability
      return p
    })
  const json = JSON.stringify(list)
  writeFileSync(new URL(`../dist/catalog-${section}.json`, import.meta.url), json)
  console.log(`catalog-${section}.json: ${(json.length / 1e6).toFixed(2)} MB, ${list.length} prodotti`)
}
console.log(`catalog.json: ${(source.length / 1e6).toFixed(2)} MB → ${(out.length / 1e6).toFixed(2)} MB, ${catalog.length} prodotti`)
