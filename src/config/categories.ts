/**
 * Albero delle categorie. Per aggiungerne una basta inserirla qui:
 * filtri, validazione del catalogo e card "esplora" si aggiornano da soli.
 */
export const CATEGORY_GROUPS = [
  {
    id: 'abbigliamento',
    label: 'Abbigliamento',
    emoji: '👕',
    items: [
      { id: 'tshirt', label: 'Magliette e T-shirt' },
      { id: 'felpe', label: 'Felpe' },
      { id: 'maglioni', label: 'Maglioni' },
      { id: 'camicie', label: 'Camicie' },
      { id: 'pantaloni', label: 'Pantaloni' },
      { id: 'jeans', label: 'Jeans' },
      { id: 'giacche', label: 'Giacche' },
      { id: 'cappotti', label: 'Cappotti' },
      { id: 'vestiti', label: 'Vestiti' },
      { id: 'sportivo', label: 'Abbigliamento sportivo' },
    ],
  },
  {
    id: 'scarpe',
    label: 'Scarpe',
    emoji: '👟',
    items: [
      { id: 'sneakers', label: 'Sneakers' },
      { id: 'scarpe_eleganti', label: 'Scarpe eleganti' },
      { id: 'scarpe_sportive', label: 'Scarpe sportive' },
      { id: 'stivali', label: 'Stivali' },
      { id: 'sandali', label: 'Sandali' },
    ],
  },
  {
    id: 'accessori',
    label: 'Accessori',
    emoji: '🕶️',
    items: [
      { id: 'occhiali', label: 'Occhiali da sole' },
      { id: 'cappellini', label: 'Cappellini' },
      { id: 'orologi', label: 'Orologi' },
      { id: 'cinture', label: 'Cinture' },
      { id: 'gioielli', label: 'Gioielli' },
      { id: 'portafogli', label: 'Portafogli' },
      { id: 'calze', label: 'Calze' },
    ],
  },
  {
    id: 'borse',
    label: 'Borse e zaini',
    emoji: '🎒',
    items: [
      { id: 'zaini', label: 'Zaini' },
      { id: 'borse', label: 'Borse' },
      { id: 'borselli', label: 'Borselli' },
      { id: 'borse_viaggio', label: 'Borse da viaggio' },
    ],
  },
  {
    id: 'profumi',
    label: 'Profumi',
    emoji: '🌸',
    items: [{ id: 'profumi', label: 'Profumi' }],
  },
] as const

/**
 * La sezione Tech: un'app gemella con le sue categorie, aperta dal pulsante in alto a sinistra.
 * I prodotti tech sono unisex e arrivano da Amazon (vedi scripts/search-plan.ts).
 */
export const TECH_GROUPS = [
  {
    id: 'audio',
    label: 'Audio',
    emoji: '🎧',
    items: [
      { id: 'cuffie', label: 'Cuffie' },
      { id: 'auricolari', label: 'Auricolari' },
      { id: 'casse', label: 'Casse bluetooth' },
    ],
  },
  {
    id: 'smart',
    label: 'Smartphone e smartwatch',
    emoji: '📱',
    items: [
      { id: 'smartphone', label: 'Smartphone' },
      { id: 'smartwatch', label: 'Smartwatch' },
      { id: 'tablet', label: 'Tablet' },
    ],
  },
  {
    id: 'gaming',
    label: 'Gaming',
    emoji: '🎮',
    items: [
      { id: 'videogiochi', label: 'Videogiochi' },
      { id: 'console', label: 'Console' },
      { id: 'accessori_gaming', label: 'Accessori gaming' },
    ],
  },
  {
    id: 'foto',
    label: 'Foto e video',
    emoji: '📷',
    items: [{ id: 'fotocamere', label: 'Fotocamere e action cam' }],
  },
] as const

export type Universe = 'moda' | 'tech'
export type CategoryGroup = (typeof CATEGORY_GROUPS)[number] | (typeof TECH_GROUPS)[number]
export type CategoryId = CategoryGroup['items'][number]['id']

const byId = new Map<string, { label: string; group: CategoryGroup; universe: Universe }>()
for (const group of CATEGORY_GROUPS) {
  for (const item of group.items) byId.set(item.id, { label: item.label, group, universe: 'moda' })
}
for (const group of TECH_GROUPS) {
  for (const item of group.items) byId.set(item.id, { label: item.label, group, universe: 'tech' })
}

export const isCategoryId = (id: string): id is CategoryId => byId.has(id)
export const categoryLabel = (id: CategoryId) => byId.get(id)?.label ?? id
export const categoryGroupOf = (id: CategoryId) => byId.get(id)?.group
/** Moda o tech, in base alla categoria */
export const universeOf = (id: CategoryId): Universe => byId.get(id)?.universe ?? 'moda'
/** Gruppi di categorie della sezione */
export const groupsOf = (u: Universe): readonly CategoryGroup[] => (u === 'tech' ? TECH_GROUPS : CATEGORY_GROUPS)
/** Tutte le categorie della sezione */
export const categoryIdsOf = (u: Universe) => groupsOf(u).flatMap((g) => g.items.map((i) => i.id)) as CategoryId[]
/** Tutte le categorie della moda (la sezione principale) */
export const ALL_CATEGORY_IDS = categoryIdsOf('moda')

/** Valore speciale dei filtri: "Deseleziona tutto", nessuna categoria inclusa (nessun prodotto ha questa categoria). */
export const NO_CATEGORY = 'nessuna' as CategoryId
