# Swipe Shopping – MVP web app

Shopping moda "come su Tinder": scorri i prodotti, salva quelli che ti piacciono, acquista sul negozio tramite link affiliato.

## Avvio

```bash
npm install
npm run dev            # sviluppo su http://localhost:5173
npm run build          # build statico in dist/ (pubblicabile su Netlify, Vercel, Cloudflare Pages...)
npm run check:catalog  # controlla public/catalog.json e stampa i link affiliati generati
```

## Architettura

Stack: Vite + React + TypeScript + Tailwind CSS 4 + Framer Motion. Nessun backend per ora: il build è un sito statico che
funziona su qualsiasi hosting e, senza modifiche, dentro Capacitor (percorsi relativi, routing via `#/`).

```
public/catalog.json        Catalogo verificato (si aggiorna senza ricompilare)
src/types/product.ts       Modello Product e Filters
src/config/categories.ts   Albero categorie (aggiungerne una = una riga)
src/config/stores.ts       Negozi e costruzione link affiliati (Amazon tag, altri via affiliateUrl)
src/config/app.ts          Nome app e testi di disclosure
src/lib/catalog.ts         Sorgente catalogo (oggi JSON, domani API con la stessa firma)
src/lib/validate.ts        Validazione voci catalogo (usata da app e da check:catalog)
src/lib/filters.ts         Filtri, ordinamento, valori disponibili
src/lib/price.ts           Formattazione e "freschezza" dei prezzi
src/lib/storage.ts         Unico punto che usa localStorage (da sostituire con Supabase)
src/lib/analytics.ts       Eventi con consenso: view, like, dislike, click, remove
src/state/AppState.tsx     Stato centrale: catalogo, filtri, preferiti, scartati, annulla
src/components/            SwipeCard, SwipeDeck, StoreLink, PriceTag, ProductImage, BottomNav, ConsentBanner
src/pages/                 Scopri, Preferiti, Filtri, Profilo
```

Scelte principali:

- **Link esterni**: sono veri `<a href target="_blank" rel="noopener noreferrer sponsored">`, non pulsanti JavaScript.
  Funzionano in ogni browser; le anteprime "sandbox" (come quella di ChatGPT) possono bloccarli, ma nel browser vero
  si aprono. Con Capacitor si intercetterà il click in `StoreLink` per aprire il browser di sistema.
- **Prezzi**: un prezzo si mostra solo se ha `priceCheckedAt` entro la finestra del negozio (24 ore per Amazon, come
  richiesto dalle regole Amazon Associates). Altrimenti la card mostra "Prezzo su Amazon".
- **Catalogo vuoto**: finché `catalog.json` non ha prodotti validi, l'app mostra card "Esplora la categoria" che aprono
  una vera ricerca su amazon.it con il tag. Spariscono da sole appena aggiungi il primo prodotto.
- **Prodotti già visti**: like e scartati non vengono riproposti; dal Profilo o a fine mazzo si possono rivedere gli scartati.
- **Esauriti**: `availability: "out_of_stock"` esclude il prodotto dallo swipe e lo segna come non disponibile nei preferiti.

## Aggiungere un prodotto Amazon

1. Apri il prodotto su amazon.it e copia l'ASIN (nella URL dopo `/dp/`, 10 caratteri).
2. Prendi l'URL dell'immagine dalla barra SiteStripe (Immagine) o, in futuro, dall'API ufficiale.
3. Aggiungi una voce in `public/catalog.json`:

```json
{
  "id": "amazon:ASIN_REALE",
  "store": "amazon",
  "externalId": "ASIN_REALE",
  "title": "Nome del prodotto come su Amazon",
  "brand": "Marca",
  "gender": "uomo",
  "category": "sneakers",
  "imageUrl": "https://...",
  "availability": "in_stock",
  "addedAt": "2026-10-09T00:00:00Z",
  "sizes": ["42", "43"],
  "colors": ["Nero"]
}
```

Facoltativi: `imageUrl` (senza immagine la card mostra un segnaposto), `price`, `originalPrice` e `priceCheckedAt` (senza `priceCheckedAt` recente il prezzo non appare).
Valori di `gender`: `uomo`, `donna`, `unisex`. Le categorie valide sono gli `id` in `src/config/categories.ts`.

4. Esegui `npm run check:catalog`: deve dire 0 da correggere e stampa il link affiliato da provare nel browser.

## Altri negozi

Zalando, ASOS, ABOUT YOU, Nike e Adidas sono già in `src/config/stores.ts` con `enabled: false`. Quando un programma
di affiliazione viene approvato (spesso tramite Awin o simili): metti `enabled: true` e per ogni prodotto inserisci
`affiliateUrl` con il link generato dalla rete di affiliazione.

## Prossimi passi

- Fase 2 (PWA): manifest, icone, service worker per cache immagini.
- Backend: Supabase per account e sincronizzazione preferiti (sostituendo `lib/storage.ts`) e un job che aggiorna
  prezzi tramite l'API ufficiale Amazon quando l'account la sblocca.
- Fase 3: Capacitor (`npx cap add android ios`) sul build `dist/`.
