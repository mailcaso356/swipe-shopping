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
] as const

/**
 * Sezioni extra, fuori dalla moda di base: spente finché l'utente non le attiva nei Filtri.
 * Per aggiungerne una (es. videogiochi) basta inserirla qui e nel piano di ricerca Amazon.
 */
export const EXTRA_SECTIONS = [
  {
    id: 'profumi',
    label: 'Profumi',
    emoji: '🌸',
    hint: 'Profumi uomo e donna delle grandi marche',
    items: [{ id: 'profumi', label: 'Profumi' }],
  },
] as const

export type CategoryGroup = (typeof CATEGORY_GROUPS)[number] | (typeof EXTRA_SECTIONS)[number]
export type CategoryId = CategoryGroup['items'][number]['id']
export type ExtraSectionId = (typeof EXTRA_SECTIONS)[number]['id']

const byId = new Map<string, { label: string; group: CategoryGroup; extra?: ExtraSectionId }>()
for (const group of CATEGORY_GROUPS) {
  for (const item of group.items) byId.set(item.id, { label: item.label, group })
}
for (const section of EXTRA_SECTIONS) {
  for (const item of section.items) byId.set(item.id, { label: item.label, group: section, extra: section.id })
}

export const isCategoryId = (id: string): id is CategoryId => byId.has(id)
export const categoryLabel = (id: CategoryId) => byId.get(id)?.label ?? id
export const categoryGroupOf = (id: CategoryId) => byId.get(id)?.group
/** Sezione extra a cui appartiene la categoria (undefined = moda di base) */
export const extraSectionOf = (id: CategoryId) => byId.get(id)?.extra
/** Categorie della moda di base (quelle scelte nella sezione Categorie dei filtri) */
export const ALL_CATEGORY_IDS = CATEGORY_GROUPS.flatMap((g) => g.items.map((i) => i.id)) as CategoryId[]
