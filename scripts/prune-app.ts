// Dopo `vite build` per l'app Android/iOS: toglie dal pacchetto i dati che l'app scarica sempre dal sito
// (catalogo, dettagli) e le cose solo del sito (service worker, testi email). L'app resta leggera e aggiornata.
import { rmSync } from 'node:fs'

for (const path of ['catalog.json', 'catalog-moda.json', 'catalog-tech.json', 'catalog-gadget.json', 'catalog-snack.json', 'details', 'email', 'sw.js']) {
  rmSync(new URL(`../dist/${path}`, import.meta.url), { recursive: true, force: true })
}
console.log('Pacchetto app pronto: dati dal sito online.')
