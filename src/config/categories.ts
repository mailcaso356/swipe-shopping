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
      { id: 'ereader', label: 'E-reader' },
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
    items: [
      { id: 'fotocamere', label: 'Fotocamere e action cam' },
      { id: 'droni', label: 'Droni' },
    ],
  },
  {
    id: 'pc',
    label: 'PC e accessori',
    emoji: '💻',
    items: [
      { id: 'monitor', label: 'Monitor' },
      { id: 'tastiere_mouse', label: 'Tastiere e mouse' },
    ],
  },
] as const

/**
 * La sezione Gadget: oggetti curiosi e idee regalo, da comprare d'impulso.
 * Solo marche note e, quando Amazon le fornisce, buone recensioni (vedi scripts/search-plan.ts).
 */
export const GADGET_GROUPS = [
  {
    id: 'casa',
    label: 'Casa e cucina',
    emoji: '🏠',
    items: [
      { id: 'gadget_cucina', label: 'Gadget da cucina' },
      { id: 'lampade', label: 'Lampade e luci' },
      { id: 'tazze', label: 'Tazze e borracce' },
    ],
  },
  {
    id: 'giochi',
    label: 'Giochi e passatempi',
    emoji: '🎲',
    items: [
      { id: 'giochi_tavolo', label: 'Giochi da tavolo' },
      { id: 'rompicapi', label: 'Rompicapi' },
      { id: 'costruzioni', label: 'Set da costruire' },
    ],
  },
  {
    id: 'regali',
    label: 'Regali e curiosità',
    emoji: '🎁',
    items: [
      { id: 'regali', label: 'Regali divertenti' },
      { id: 'gadget_tech', label: 'Gadget tech' },
    ],
  },
] as const

/** La sezione Snack: dolci, salati, proteici e caffè, solo marche note (acquisti d'impulso). */
export const SNACK_GROUPS = [
  {
    id: 'dolci',
    label: 'Dolci',
    emoji: '🍫',
    items: [
      { id: 'cioccolato', label: 'Cioccolato' },
      { id: 'caramelle', label: 'Caramelle e gommose' },
      { id: 'biscotti', label: 'Biscotti e merendine' },
    ],
  },
  {
    id: 'salati',
    label: 'Salati',
    emoji: '🥨',
    items: [
      { id: 'patatine', label: 'Patatine e salatini' },
      { id: 'frutta_secca', label: 'Frutta secca' },
    ],
  },
  {
    id: 'energia',
    label: 'Proteici e bevande',
    emoji: '☕',
    items: [
      { id: 'snack_proteici', label: 'Snack proteici' },
      { id: 'caffe_te', label: 'Caffè e tè' },
    ],
  },
] as const

export type Universe = 'moda' | 'tech' | 'gadget' | 'snack'

/** Le sezioni dell'app, come app separate: ognuna con categorie, filtri e preferiti suoi. */
export const SECTIONS: { id: Universe; label: string; hint: string; color: string }[] = [
  { id: 'moda', label: 'Moda', hint: 'Vestiti, scarpe, borse, profumi', color: '#f43f5e' },
  { id: 'tech', label: 'Tech', hint: 'Cuffie, smartphone, gaming', color: '#f97316' },
  { id: 'gadget', label: 'Gadget', hint: 'Idee regalo e oggetti curiosi', color: '#8b5cf6' },
  { id: 'snack', label: 'Snack', hint: 'Dolci, salati, proteici, caffè', color: '#0d9488' },
]
export const UNIVERSES = SECTIONS.map((s) => s.id)
export const isUniverse = (v: unknown): v is Universe => UNIVERSES.includes(v as Universe)
export const sectionOf = (u: Universe) => SECTIONS.find((s) => s.id === u)!

export type CategoryGroup = (typeof CATEGORY_GROUPS)[number] | (typeof TECH_GROUPS)[number] | (typeof GADGET_GROUPS)[number]
  | (typeof SNACK_GROUPS)[number]
export type CategoryId = CategoryGroup['items'][number]['id']

const byId = new Map<string, { label: string; group: CategoryGroup; universe: Universe }>()
for (const group of CATEGORY_GROUPS) {
  for (const item of group.items) byId.set(item.id, { label: item.label, group, universe: 'moda' })
}
for (const group of TECH_GROUPS) {
  for (const item of group.items) byId.set(item.id, { label: item.label, group, universe: 'tech' })
}
for (const group of GADGET_GROUPS) {
  for (const item of group.items) byId.set(item.id, { label: item.label, group, universe: 'gadget' })
}
for (const group of SNACK_GROUPS) {
  for (const item of group.items) byId.set(item.id, { label: item.label, group, universe: 'snack' })
}

export const isCategoryId = (id: string): id is CategoryId => byId.has(id)
export const categoryLabel = (id: CategoryId) => byId.get(id)?.label ?? id
export const categoryGroupOf = (id: CategoryId) => byId.get(id)?.group
/** Sezione della categoria (moda, tech, gadget, snack) */
export const universeOf = (id: CategoryId): Universe => byId.get(id)?.universe ?? 'moda'
/** Gruppi di categorie della sezione */
const GROUPS: Record<Universe, readonly CategoryGroup[]> = {
  moda: CATEGORY_GROUPS,
  tech: TECH_GROUPS,
  gadget: GADGET_GROUPS,
  snack: SNACK_GROUPS,
}
export const groupsOf = (u: Universe): readonly CategoryGroup[] => GROUPS[u]
/** Tutte le categorie della sezione */
export const categoryIdsOf = (u: Universe) => groupsOf(u).flatMap((g) => g.items.map((i) => i.id)) as CategoryId[]
/** Tutte le categorie della moda (la sezione principale) */
export const ALL_CATEGORY_IDS = categoryIdsOf('moda')

/** Valore speciale dei filtri: "Deseleziona tutto", nessuna categoria inclusa (nessun prodotto ha questa categoria). */
export const NO_CATEGORY = 'nessuna' as CategoryId
