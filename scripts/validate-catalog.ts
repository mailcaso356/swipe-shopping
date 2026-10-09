// Controlla public/catalog.json prima di pubblicare: `npm run check:catalog`
import { readFileSync } from 'node:fs'
import { productUrl } from '../src/config/stores.ts'
import { checkCatalog } from '../src/lib/validate.ts'

const file = new URL('../public/catalog.json', import.meta.url)
const { valid, invalid } = checkCatalog(JSON.parse(readFileSync(file, 'utf8')))

for (const p of valid) console.log(`✓ ${p.id}  ${productUrl(p)}`)
for (const i of invalid) console.error(`✗ voce #${i.index} (${String(i.id)}): ${i.errors.join('; ')}`)
console.log(`\n${valid.length} prodotti validi, ${invalid.length} da correggere.`)
if (invalid.length) process.exit(1)
