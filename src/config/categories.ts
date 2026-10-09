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

export type CategoryGroup = (typeof CATEGORY_GROUPS)[number]
export type CategoryId = CategoryGroup['items'][number]['id']

const byId = new Map<string, { label: string; group: CategoryGroup }>()
for (const group of CATEGORY_GROUPS) {
  for (const item of group.items) byId.set(item.id, { label: item.label, group })
}

export const isCategoryId = (id: string): id is CategoryId => byId.has(id)
export const categoryLabel = (id: CategoryId) => byId.get(id)?.label ?? id
export const categoryGroupOf = (id: CategoryId) => byId.get(id)?.group
export const ALL_CATEGORY_IDS = [...byId.keys()] as CategoryId[]
