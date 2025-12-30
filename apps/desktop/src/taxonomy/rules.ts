export type TaxonomyRule = {
  match: string
  category?: string
  subcategory?: string
  tags?: string[]
}

const STORAGE_KEY = 'insight5.taxonomy.rules.text.v1'
export const TAXONOMY_RULES_CHANGED_EVENT = 'insight5.taxonomy.rules.changed'

function cleanValue(raw: string) {
  return raw.trim().replace(/^['"]|['"]$/g, '')
}

function parseTagsValue(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((t) => cleanValue(t))
      .filter(Boolean)
  }
  return trimmed
    .split(',')
    .map((t) => cleanValue(t))
    .filter(Boolean)
}

export function parseTaxonomyRules(text: string) {
  const rules: TaxonomyRule[] = []
  let current: TaxonomyRule | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('-')) {
      if (current?.match) rules.push(current)
      current = { match: '' }
      const rest = line.replace(/^-+/, '').trim()
      if (rest) {
        const [k, ...vParts] = rest.split(':')
        const value = vParts.join(':').trim()
        if (k.trim() === 'match' && value) current.match = cleanValue(value)
      }
      continue
    }
    if (!current) continue
    const [keyRaw, ...valueParts] = line.split(':')
    if (!keyRaw || !valueParts.length) continue
    const key = keyRaw.trim()
    const value = valueParts.join(':').trim()
    if (!value) continue
    if (key === 'match') current.match = cleanValue(value)
    if (key === 'category') current.category = cleanValue(value)
    if (key === 'subcategory') current.subcategory = cleanValue(value)
    if (key === 'tags') current.tags = parseTagsValue(value)
  }

  if (current?.match) rules.push(current)
  return rules
}

export function loadTaxonomyRules() {
  const text = localStorage.getItem(STORAGE_KEY) ?? ''
  return { text, rules: parseTaxonomyRules(text) }
}

export function saveTaxonomyRules(text: string) {
  localStorage.setItem(STORAGE_KEY, text)
  window.dispatchEvent(new Event(TAXONOMY_RULES_CHANGED_EVENT))
  return parseTaxonomyRules(text)
}

export function defaultTaxonomyRulesText() {
  return [
    '- match: "drive|commute|uber|lyft"',
    '  category: "Transport"',
    '  subcategory: "Driving"',
    '  tags: ["#transport", "#commute"]',
    '- match: "flight|airport|tsa"',
    '  category: "Transport"',
    '  subcategory: "Flight"',
    '  tags: ["#transport"]',
    '- match: "cardio|run|treadmill"',
    '  category: "Health"',
    '  subcategory: "Cardio"',
    '  tags: ["#workout"]',
    '- match: "strength|lift|weights"',
    '  category: "Health"',
    '  subcategory: "Strength"',
    '  tags: ["#workout"]',
  ].join('\n')
}
