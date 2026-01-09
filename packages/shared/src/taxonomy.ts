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
  return STARTER_TAXONOMY.map((entry) => entry.category)
}

export function subcategoriesFromStarter(category: string | null | undefined) {
  const match = (category ?? '').trim().toLowerCase()
  if (!match) return []
  const found = STARTER_TAXONOMY.find((entry) => entry.category.toLowerCase() === match)
  return found?.subcategories ?? []
}
