// Corregge la categoria in base al titolo: la ricerca Amazon per "scarpe eleganti" a volte
// restituisce sneakers, quella per "giacca" una felpa, ecc. Si cambia solo dentro lo stesso gruppo
// (scarpe con scarpe, abbigliamento con abbigliamento) e solo se il titolo è chiaro.

type Rule = [category: string, pattern: RegExp]

const SHOES: Rule[] = [
  ['scarpe_sportive', /\b(running|corsa|trail|jogging|scarpe da (?:corsa|running))\b/i],
  ['sandali', /\b(sandal\w*|ciabatt\w*|infradito|zoccol\w*|slides?|flip.?flop)\b/i],
  ['stivali', /\b(stival\w*|anfibi\w*|boots?|chelsea|chukka)\b/i],
  ['sneakers', /\b(sneakers?|scarpe da ginnastica|trainers?|basket)\b/i],
  ['scarpe_eleganti', /\b(oxford|derby|mocassin\w*|brogue|stringat\w*|decollet\w*|scarpe eleganti)\b/i],
]

const CLOTHES: Rule[] = [
  ['cappotti', /\b(cappott\w*|parka|trench)\b/i],
  ['giacche', /\b(giacc\w*|giubbott\w*|piumin\w*|jacket|bomber|gilet)\b/i],
  ['vestiti', /\b(vestit\w*|abito|dress)\b/i],
  ['jeans', /\bjeans\b/i],
  ['felpe', /\b(felp\w*|hoodie|sweatshirt)\b/i],
  ['tshirt', /\b(t-?shirt|maglietta|tee)\b/i],
  ['maglioni', /\b(maglion\w*|pullover|cardigan|knit)\b/i],
  ['camicie', /\b(camici\w*)\b/i],
  ['pantaloni', /\b(pantalon\w*|chino|jogger|cargo)\b/i],
]

const GROUPS: Rule[][] = [SHOES, CLOTHES]

export function classify(title: string, category: string): string {
  const rules = GROUPS.find((g) => g.some(([c]) => c === category))
  if (!rules) return category
  const own = rules.find(([c]) => c === category)?.[1]
  if (own?.test(title)) return category // il titolo conferma la categoria attuale
  const match = rules.find(([, re]) => re.test(title))
  return match ? match[0] : category
}
