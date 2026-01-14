import type { StarterTaxonomy } from './starter'

const STORAGE_KEY = 'insight5.taxonomy.custom.v1'

function normalizeCategoryName(raw: string) {
  return raw.trim()
}

export function loadCustomTaxonomy(): StarterTaxonomy {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StarterTaxonomy
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCustomTaxonomy(next: StarterTaxonomy) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

export function upsertCategory(category: string, subcategories: string[]) {
  const name = normalizeCategoryName(category)
  if (!name) return
  const list = loadCustomTaxonomy()
  const idx = list.findIndex((c) => c.category.toLowerCase() === name.toLowerCase())
  if (idx >= 0) {
    list[idx] = { category: name, subcategories }
  } else {
    list.push({ category: name, subcategories })
  }
  saveCustomTaxonomy(list)
}

export function removeCategory(category: string) {
  const name = normalizeCategoryName(category)
  if (!name) return
  const list = loadCustomTaxonomy()
  const next = list.filter((c) => c.category.toLowerCase() !== name.toLowerCase())
  if (next.length === list.length) return
  saveCustomTaxonomy(next)
}
