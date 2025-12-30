import { loadCustomTaxonomy } from './custom'

export type StarterTaxonomy = Array<{ category: string; subcategories: string[] }>

export const STARTER_TAXONOMY: StarterTaxonomy = [
  { category: 'Work', subcategories: ['Clinic', 'Surgery', 'Didactics', 'Admin', 'Research', 'Call'] },
  { category: 'Health', subcategories: ['Workout', 'Sleep', 'Nutrition', 'Recovery', 'Meditation'] },
  { category: 'Personal', subcategories: ['Errands', 'Groceries', 'Family', 'Friends', 'Home'] },
  { category: 'Learning', subcategories: ['Reading', 'Practice', 'Coursework'] },
  { category: 'Transport', subcategories: ['Driving', 'Flight', 'Transit', 'Commute', 'Parking'] },
  { category: 'Finance', subcategories: ['Banking', 'Budget', 'Bills', 'Expenses', 'Income'] },
]

export function normalizeCategory(input: string) {
  return input.trim()
}

export function categoriesFromStarter() {
  const custom = loadCustomTaxonomy()
  const merged = [...STARTER_TAXONOMY]
  for (const c of custom) {
    if (!c.category.trim()) continue
    if (!merged.some((m) => m.category.toLowerCase() === c.category.toLowerCase())) merged.push(c)
  }
  return merged.map((x) => x.category)
}

export function subcategoriesFromStarter(category: string | null | undefined) {
  const c = (category ?? '').trim()
  if (!c) return []
  const merged = [...STARTER_TAXONOMY]
  for (const custom of loadCustomTaxonomy()) {
    const idx = merged.findIndex((m) => m.category.toLowerCase() === custom.category.toLowerCase())
    if (idx >= 0) {
      merged[idx] = {
        category: merged[idx]!.category,
        subcategories: Array.from(new Set([...merged[idx]!.subcategories, ...custom.subcategories])),
      }
    } else {
      merged.push(custom)
    }
  }
  return merged.find((x) => x.category.toLowerCase() === c.toLowerCase())?.subcategories ?? []
}
