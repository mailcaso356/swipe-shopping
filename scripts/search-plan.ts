// Cosa cercare su Amazon per riempire il catalogo: per ogni sottocategoria le parole chiave
// e le marche note ammesse. Per aggiungere una marca o una categoria basta modificare qui.

export type SearchGender = 'uomo' | 'donna' | 'unisex'

export interface CategoryPlan {
  /** id in src/config/categories.ts */
  category: string
  keywords: string
  brands: string[]
  genders: SearchGender[]
  /** Prezzo minimo in euro: esclude articoli sospetti o di bassa qualità */
  minPrice: number
  /** Reparto Amazon in cui cercare (di base Fashion) */
  searchIndex?: string
}

const BOTH: SearchGender[] = ['uomo', 'donna']
/** Prodotti per tutti: una sola ricerca, senza uomo/donna */
const TECH: SearchGender[] = ['unisex']

export const SEARCH_PLAN: CategoryPlan[] = [
  // Abbigliamento
  { category: 'tshirt', keywords: 't-shirt', minPrice: 12, genders: BOTH,
    brands: ['Tommy Hilfiger', 'Calvin Klein', 'Lacoste', 'Nike', 'adidas', 'Champion', "Levi's", 'BOSS'] },
  { category: 'felpe', keywords: 'felpa', minPrice: 20, genders: BOTH,
    brands: ['Champion', 'Nike', 'adidas', 'Tommy Hilfiger', 'Calvin Klein', 'The North Face', 'Puma', 'Carhartt'] },
  { category: 'maglioni', keywords: 'maglione', minPrice: 20, genders: BOTH,
    brands: ['Tommy Hilfiger', 'Ralph Lauren', 'GANT', 'Lacoste', 'Calvin Klein', 'Jack & Jones', 'Vero Moda', 'Only'] },
  { category: 'camicie', keywords: 'camicia', minPrice: 20, genders: BOTH,
    brands: ['Tommy Hilfiger', 'Ralph Lauren', 'GANT', "Levi's", 'Calvin Klein', 'BOSS', 'Lacoste', 'Guess'] },
  { category: 'pantaloni', keywords: 'pantaloni', minPrice: 20, genders: BOTH,
    brands: ["Levi's", 'Tommy Hilfiger', 'Carhartt', 'Dockers', 'Calvin Klein', 'Jack & Jones', 'Vero Moda', 'Only'] },
  { category: 'jeans', keywords: 'jeans', minPrice: 25, genders: BOTH,
    brands: ["Levi's", 'Pepe Jeans', 'Diesel', 'Wrangler', 'Tommy Jeans', 'Calvin Klein', 'Lee', 'Guess'] },
  { category: 'giacche', keywords: 'giacca', minPrice: 30, genders: BOTH,
    brands: ['The North Face', 'Columbia', 'Napapijri', 'Tommy Hilfiger', 'Superdry', "Levi's", 'Calvin Klein', 'Guess'] },
  { category: 'cappotti', keywords: 'cappotto', minPrice: 40, genders: BOTH,
    brands: ['Tommy Hilfiger', 'Calvin Klein', 'Guess', 'Vero Moda', 'Only', 'Superdry', 'Liu Jo', 'BOSS'] },
  { category: 'vestiti', keywords: 'vestito', minPrice: 20, genders: ['donna'],
    brands: ['Guess', 'Desigual', 'Liu Jo', 'Vero Moda', 'Only', 'Tommy Hilfiger', 'Calvin Klein', "Levi's"] },
  { category: 'sportivo', keywords: 'abbigliamento sportivo', minPrice: 15, genders: BOTH,
    brands: ['Nike', 'adidas', 'Puma', 'Under Armour', 'New Balance', 'ASICS', 'Reebok', 'Champion'] },
  // Scarpe
  { category: 'sneakers', keywords: 'sneakers', minPrice: 35, genders: BOTH,
    brands: ['Nike', 'adidas', 'New Balance', 'Puma', 'Converse', 'Vans', 'Reebok', 'Skechers', 'ASICS', 'Lacoste'] },
  { category: 'scarpe_eleganti', keywords: 'scarpe eleganti', minPrice: 40, genders: BOTH,
    brands: ['Clarks', 'Geox', 'Ecco', 'Tommy Hilfiger', 'Guess', 'Calvin Klein', 'Timberland', 'Lumberjack'] },
  { category: 'scarpe_sportive', keywords: 'scarpe running', minPrice: 40, genders: BOTH,
    brands: ['Nike', 'adidas', 'ASICS', 'New Balance', 'Brooks', 'Saucony', 'Mizuno', 'Puma'] },
  { category: 'stivali', keywords: 'stivali', minPrice: 50, genders: BOTH,
    brands: ['Dr. Martens', 'Timberland', 'UGG', 'Clarks', 'Geox', 'Guess', 'Tommy Hilfiger', 'Lumberjack'] },
  { category: 'sandali', keywords: 'sandali', minPrice: 20, genders: BOTH,
    brands: ['Birkenstock', 'Crocs', 'Havaianas', 'Teva', 'adidas', 'Nike', 'Geox', 'Ecco'] },
  // Accessori
  { category: 'occhiali', keywords: 'occhiali da sole', minPrice: 40, genders: BOTH,
    brands: ['Ray-Ban', 'Oakley', 'Persol', 'Carrera', 'Polaroid', 'Prada', 'Gucci', 'Vogue Eyewear'] },
  { category: 'cappellini', keywords: 'cappellino', minPrice: 12, genders: BOTH,
    brands: ['New Era', 'Nike', 'adidas', 'The North Face', 'Tommy Hilfiger', 'Calvin Klein', 'Carhartt', 'Lacoste'] },
  { category: 'orologi', keywords: 'orologio', minPrice: 30, genders: BOTH,
    brands: ['Casio', 'Seiko', 'Citizen', 'Tissot', 'Fossil', 'Michael Kors', 'Garmin', 'Daniel Wellington'] },
  { category: 'cinture', keywords: 'cintura', minPrice: 15, genders: BOTH,
    brands: ['Tommy Hilfiger', 'Calvin Klein', "Levi's", 'Guess', 'Lacoste', 'BOSS', 'Timberland', 'Ralph Lauren'] },
  { category: 'gioielli', keywords: 'gioielli', minPrice: 20, genders: BOTH,
    brands: ['Pandora', 'Swarovski', 'Morellato', 'Breil', 'Michael Kors', 'Guess', 'Fossil', 'Brosway'] },
  { category: 'portafogli', keywords: 'portafoglio', minPrice: 15, genders: BOTH,
    brands: ['Tommy Hilfiger', 'Calvin Klein', 'Guess', "Levi's", 'Lacoste', 'Fossil', 'Timberland', 'BOSS'] },
  { category: 'calze', keywords: 'calzini', minPrice: 8, genders: BOTH,
    brands: ['Nike', 'adidas', 'Puma', 'Tommy Hilfiger', 'Calvin Klein', "Levi's", 'Burlington', 'Falke'] },
  // Borse e zaini
  { category: 'zaini', keywords: 'zaino', minPrice: 25, genders: BOTH,
    brands: ['Eastpak', 'Invicta', 'The North Face', 'Herschel', 'Nike', 'adidas', 'Samsonite', 'Seven'] },
  { category: 'borse', keywords: 'borsa', minPrice: 30, genders: ['donna'],
    brands: ['Guess', 'Michael Kors', 'Liu Jo', 'Calvin Klein', 'Tommy Hilfiger', 'Desigual', 'Coccinelle', 'Furla'] },
  { category: 'borselli', keywords: 'borsello', minPrice: 20, genders: ['uomo'],
    brands: ['Calvin Klein', 'Tommy Hilfiger', 'Eastpak', 'The North Face', 'Guess', 'Lacoste', 'Nike', 'Napapijri'] },
  { category: 'borse_viaggio', keywords: 'borsa da viaggio', minPrice: 30, genders: BOTH,
    brands: ['Samsonite', 'American Tourister', 'Eastpak', 'The North Face', 'adidas', 'Nike', 'Herschel', 'Delsey'] },
  // Profumi (reparto Bellezza): prezzo minimo alto per evitare tester e imitazioni
  { category: 'profumi', keywords: 'eau de parfum', searchIndex: 'Beauty', minPrice: 30, genders: BOTH,
    brands: ['Dior', 'Armani', 'Yves Saint Laurent', 'Hugo Boss', 'Lancome', 'Dolce & Gabbana', 'Rabanne', 'Versace',
      'Calvin Klein', 'Prada', 'Valentino', 'Jean Paul Gaultier'] },
  // Sezione Tech: prodotti unisex
  { category: 'cuffie', keywords: 'cuffie wireless', searchIndex: 'Electronics', minPrice: 40, genders: TECH,
    brands: ['Sony', 'Bose', 'JBL', 'Sennheiser', 'Beats', 'Marshall'] },
  { category: 'auricolari', keywords: 'auricolari bluetooth', searchIndex: 'Electronics', minPrice: 30, genders: TECH,
    brands: ['Apple', 'Samsung', 'Sony', 'JBL', 'Bose', 'Jabra'] },
  { category: 'casse', keywords: 'cassa bluetooth', searchIndex: 'Electronics', minPrice: 30, genders: TECH,
    brands: ['JBL', 'Bose', 'Marshall', 'Ultimate Ears', 'Sony', 'Anker'] },
  { category: 'smartphone', keywords: 'smartphone', searchIndex: 'Electronics', minPrice: 150, genders: TECH,
    brands: ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Motorola', 'OnePlus'] },
  { category: 'smartwatch', keywords: 'smartwatch', searchIndex: 'Electronics', minPrice: 50, genders: TECH,
    brands: ['Apple', 'Samsung', 'Garmin', 'Huawei', 'Amazfit', 'Xiaomi'] },
  { category: 'tablet', keywords: 'tablet', searchIndex: 'Electronics', minPrice: 100, genders: TECH,
    brands: ['Apple', 'Samsung', 'Lenovo', 'Xiaomi', 'Amazon'] },
  { category: 'videogiochi', keywords: 'videogioco', searchIndex: 'VideoGames', minPrice: 15, genders: TECH,
    brands: ['Nintendo', 'Sony', 'Electronic Arts', 'Ubisoft', 'Bandai Namco', 'Activision', 'Microsoft', 'Take-Two'] },
  { category: 'console', keywords: 'console', searchIndex: 'VideoGames', minPrice: 150, genders: TECH,
    brands: ['Nintendo', 'Sony', 'Microsoft', 'Valve'] },
  { category: 'accessori_gaming', keywords: 'gaming', searchIndex: 'Electronics', minPrice: 25, genders: TECH,
    brands: ['Logitech', 'Razer', 'Corsair', 'SteelSeries', 'HyperX', 'Turtle Beach'] },
  { category: 'fotocamere', keywords: 'fotocamera', searchIndex: 'Electronics', minPrice: 80, genders: TECH,
    brands: ['GoPro', 'DJI', 'Canon', 'Sony', 'Fujifilm', 'Insta360'] },
]

/** Confronto tollerante tra marche ("TOMMY HILFIGER" = "Tommy Hilfiger", "Levi's" = "Levis"). */
export const normalizeBrand = (b: string) =>
  b
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
