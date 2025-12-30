import { db } from '../db/insight-db'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink'

export type Macros = {
  protein: number   // grams
  carbs: number     // grams
  fat: number       // grams
  fiber?: number    // grams
}

export type FoodItem = {
  id: string
  name: string
  quantity: number
  unit: string              // e.g., 'oz', 'cup', 'serving', 'g'
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  brand?: string
  notes?: string
}

export type Meal = {
  id: string
  eventId: string           // Links to parent calendar event
  userId?: string
  type: MealType
  title: string
  items: FoodItem[]
  totalCalories: number
  macros: Macros
  location?: string         // Restaurant name or home
  photoUri?: string         // Optional photo of the meal
  notes?: string
  goalId?: string           // Links to nutrition goal (e.g., "cut", "bulk")
  tags?: string[]
  eatenAt: number
  createdAt: number
  updatedAt: number
}

// Common foods database with nutritional info (per serving)
export const COMMON_FOODS: Array<{ name: string; unit: string; calories: number; protein: number; carbs: number; fat: number }> = [
  // Proteins
  { name: 'Chicken Breast', unit: 'oz', calories: 46, protein: 8.8, carbs: 0, fat: 1 },
  { name: 'Ground Beef (90% lean)', unit: 'oz', calories: 50, protein: 7, carbs: 0, fat: 2.5 },
  { name: 'Salmon', unit: 'oz', calories: 58, protein: 7, carbs: 0, fat: 3 },
  { name: 'Eggs', unit: 'large', calories: 70, protein: 6, carbs: 0.5, fat: 5 },
  { name: 'Greek Yogurt', unit: 'cup', calories: 100, protein: 17, carbs: 6, fat: 0.7 },
  { name: 'Cottage Cheese', unit: 'cup', calories: 220, protein: 25, carbs: 8, fat: 10 },
  { name: 'Tofu', unit: 'oz', calories: 22, protein: 2.5, carbs: 0.5, fat: 1.3 },
  // Carbs
  { name: 'White Rice (cooked)', unit: 'cup', calories: 205, protein: 4, carbs: 45, fat: 0.4 },
  { name: 'Brown Rice (cooked)', unit: 'cup', calories: 215, protein: 5, carbs: 45, fat: 1.8 },
  { name: 'Pasta (cooked)', unit: 'cup', calories: 220, protein: 8, carbs: 43, fat: 1 },
  { name: 'Bread (white)', unit: 'slice', calories: 75, protein: 2, carbs: 14, fat: 1 },
  { name: 'Oatmeal (cooked)', unit: 'cup', calories: 150, protein: 5, carbs: 27, fat: 3 },
  { name: 'Sweet Potato', unit: 'medium', calories: 100, protein: 2, carbs: 24, fat: 0 },
  { name: 'Banana', unit: 'medium', calories: 105, protein: 1, carbs: 27, fat: 0.4 },
  { name: 'Apple', unit: 'medium', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  // Fats
  { name: 'Avocado', unit: 'whole', calories: 320, protein: 4, carbs: 17, fat: 29 },
  { name: 'Olive Oil', unit: 'tbsp', calories: 120, protein: 0, carbs: 0, fat: 14 },
  { name: 'Peanut Butter', unit: 'tbsp', calories: 95, protein: 4, carbs: 3, fat: 8 },
  { name: 'Almonds', unit: 'oz', calories: 165, protein: 6, carbs: 6, fat: 14 },
  { name: 'Cheese (cheddar)', unit: 'oz', calories: 115, protein: 7, carbs: 0.4, fat: 9.5 },
  { name: 'Parmesan', unit: 'tbsp', calories: 22, protein: 2, carbs: 0.2, fat: 1.5 },
  // Vegetables
  { name: 'Romaine Lettuce', unit: 'head', calories: 25, protein: 2, carbs: 4, fat: 0.5 },
  { name: 'Spinach', unit: 'cup', calories: 7, protein: 1, carbs: 1, fat: 0.1 },
  { name: 'Broccoli', unit: 'cup', calories: 55, protein: 4, carbs: 11, fat: 0.5 },
  { name: 'Carrots', unit: 'medium', calories: 25, protein: 0.5, carbs: 6, fat: 0 },
  { name: 'Tomato', unit: 'medium', calories: 22, protein: 1, carbs: 5, fat: 0.3 },
  // Dressings & Sauces
  { name: 'Caesar Dressing', unit: 'tbsp', calories: 80, protein: 0.5, carbs: 0.5, fat: 8.5 },
  { name: 'Ranch Dressing', unit: 'tbsp', calories: 75, protein: 0.3, carbs: 1, fat: 8 },
  { name: 'Balsamic Vinaigrette', unit: 'tbsp', calories: 45, protein: 0, carbs: 3, fat: 4 },
  // Beverages
  { name: 'Coffee (black)', unit: 'cup', calories: 2, protein: 0, carbs: 0, fat: 0 },
  { name: 'Milk (whole)', unit: 'cup', calories: 150, protein: 8, carbs: 12, fat: 8 },
  { name: 'Protein Shake', unit: 'scoop', calories: 120, protein: 25, carbs: 3, fat: 1 },
  { name: 'Water', unit: 'cup', calories: 0, protein: 0, carbs: 0, fat: 0 },
]

// Fast food / Restaurant items (rough estimates)
export const RESTAURANT_FOODS: Array<{ name: string; restaurant?: string; calories: number; protein: number; carbs: number; fat: number }> = [
  { name: 'Double Quarter Pounder with Cheese', restaurant: 'McDonald\'s', calories: 740, protein: 48, carbs: 43, fat: 42 },
  { name: 'Big Mac', restaurant: 'McDonald\'s', calories: 550, protein: 25, carbs: 45, fat: 30 },
  { name: 'Whopper', restaurant: 'Burger King', calories: 660, protein: 28, carbs: 49, fat: 40 },
  { name: 'Chipotle Burrito Bowl', restaurant: 'Chipotle', calories: 700, protein: 40, carbs: 50, fat: 35 },
  { name: 'Subway 6" Turkey Sub', restaurant: 'Subway', calories: 280, protein: 18, carbs: 40, fat: 4 },
]

// Estimate macros from food name using simple matching
export function estimateFoodNutrition(name: string, quantity = 1, unit = 'serving'): Partial<FoodItem> {
  const lower = name.toLowerCase()

  // Check common foods first
  for (const food of COMMON_FOODS) {
    if (lower.includes(food.name.toLowerCase())) {
      return {
        name: food.name,
        quantity,
        unit: unit === 'serving' ? food.unit : unit,
        calories: Math.round(food.calories * quantity),
        protein: Math.round(food.protein * quantity),
        carbs: Math.round(food.carbs * quantity),
        fat: Math.round(food.fat * quantity),
      }
    }
  }

  // Check restaurant foods
  for (const food of RESTAURANT_FOODS) {
    if (lower.includes(food.name.toLowerCase())) {
      return {
        name: food.name,
        quantity,
        unit: 'item',
        calories: Math.round(food.calories * quantity),
        protein: Math.round(food.protein * quantity),
        carbs: Math.round(food.carbs * quantity),
        fat: Math.round(food.fat * quantity),
      }
    }
  }

  // Default estimate based on keywords
  if (/salad/i.test(name)) return { calories: 150, protein: 5, carbs: 15, fat: 8 }
  if (/sandwich/i.test(name)) return { calories: 400, protein: 20, carbs: 40, fat: 15 }
  if (/burger/i.test(name)) return { calories: 600, protein: 30, carbs: 45, fat: 35 }
  if (/pizza.*slice/i.test(name)) return { calories: 285, protein: 12, carbs: 36, fat: 10 }
  if (/steak/i.test(name)) return { calories: 300, protein: 40, carbs: 0, fat: 15 }
  if (/smoothie/i.test(name)) return { calories: 300, protein: 10, carbs: 50, fat: 5 }

  return { name, quantity, unit }
}

// Parse meal from natural language
export function parseMealFromText(text: string): Partial<Meal> | null {
  const items: FoodItem[] = []
  const lower = text.toLowerCase()

  // Detect meal type
  let mealType: MealType = 'snack'
  if (/\b(breakfast|morning)\b/i.test(text)) mealType = 'breakfast'
  else if (/\b(lunch|midday)\b/i.test(text)) mealType = 'lunch'
  else if (/\b(dinner|supper|evening)\b/i.test(text)) mealType = 'dinner'
  else if (/\b(coffee|tea|water|drink|smoothie|shake)\b/i.test(text)) mealType = 'drink'

  // Parse patterns like "2 heads of romaine" or "6oz chicken"
  const quantityPatterns = [
    /(\d+(?:\.\d+)?)\s*(?:oz|ounces?)\s+(?:of\s+)?([a-zA-Z][a-zA-Z\s]+)/gi,
    /(\d+(?:\.\d+)?)\s+(?:servings?\s+(?:of\s+)?)?([a-zA-Z][a-zA-Z\s]+)/gi,
    /(\d+(?:\.\d+)?)\s+(?:cups?\s+(?:of\s+)?)?([a-zA-Z][a-zA-Z\s]+)/gi,
    /(\d+(?:\.\d+)?)\s+(?:heads?\s+(?:of\s+)?)?([a-zA-Z][a-zA-Z\s]+)/gi,
  ]

  const seen = new Set<string>()
  for (const pattern of quantityPatterns) {
    for (const match of text.matchAll(pattern)) {
      const quantity = parseFloat(match[1])
      const foodName = match[2].trim()
      const key = foodName.toLowerCase()
      if (seen.has(key) || foodName.length < 3) continue
      seen.add(key)

      const estimated = estimateFoodNutrition(foodName, quantity)
      items.push({
        id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: estimated.name ?? foodName,
        quantity,
        unit: estimated.unit ?? 'serving',
        calories: estimated.calories,
        protein: estimated.protein,
        carbs: estimated.carbs,
        fat: estimated.fat,
      })
    }
  }

  // Parse simple food mentions without quantities
  const simplePattern = /\bhad\s+(?:a\s+|an\s+)?([a-zA-Z][a-zA-Z\s]{2,20})/gi
  for (const match of text.matchAll(simplePattern)) {
    const foodName = match[1].trim()
    const key = foodName.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const estimated = estimateFoodNutrition(foodName, 1)
    items.push({
      id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: estimated.name ?? foodName,
      quantity: 1,
      unit: estimated.unit ?? 'serving',
      calories: estimated.calories,
      protein: estimated.protein,
      carbs: estimated.carbs,
      fat: estimated.fat,
    })
  }

  if (items.length === 0) return null

  // Calculate totals
  const totalCalories = items.reduce((sum, item) => sum + (item.calories ?? 0), 0)
  const macros: Macros = {
    protein: items.reduce((sum, item) => sum + (item.protein ?? 0), 0),
    carbs: items.reduce((sum, item) => sum + (item.carbs ?? 0), 0),
    fat: items.reduce((sum, item) => sum + (item.fat ?? 0), 0),
  }

  return {
    type: mealType,
    items,
    totalCalories,
    macros,
    tags: ['#food', `#${mealType}`],
  }
}

// Storage functions using Dexie
export async function saveMeal(meal: Meal): Promise<string> {
  const now = Date.now()
  const toSave = {
    ...meal,
    createdAt: meal.createdAt ?? now,
    updatedAt: now,
  }
  await db.meals.put(toSave)
  return toSave.id
}

export async function getMeal(id: string): Promise<Meal | undefined> {
  return db.meals.get(id)
}

export async function getMealsByEvent(eventId: string): Promise<Meal[]> {
  return db.meals.where('eventId').equals(eventId).toArray()
}

export async function getMealsByDateRange(startMs: number, endMs: number): Promise<Meal[]> {
  return db.meals
    .where('eatenAt')
    .between(startMs, endMs)
    .toArray()
}

export async function getRecentMeals(limit = 20): Promise<Meal[]> {
  return db.meals
    .orderBy('eatenAt')
    .reverse()
    .limit(limit)
    .toArray()
}

export async function deleteMeal(id: string): Promise<void> {
  await db.meals.delete(id)
}

export async function getDailyNutritionStats(dayMs: number): Promise<{
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  mealCount: number
  meals: Meal[]
}> {
  const dayStart = new Date(dayMs)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayMs)
  dayEnd.setHours(23, 59, 59, 999)

  const meals = await getMealsByDateRange(dayStart.getTime(), dayEnd.getTime())

  return {
    totalCalories: meals.reduce((sum, m) => sum + m.totalCalories, 0),
    totalProtein: meals.reduce((sum, m) => sum + m.macros.protein, 0),
    totalCarbs: meals.reduce((sum, m) => sum + m.macros.carbs, 0),
    totalFat: meals.reduce((sum, m) => sum + m.macros.fat, 0),
    mealCount: meals.length,
    meals,
  }
}

export async function getWeeklyNutritionStats(weekStartMs: number): Promise<Array<{
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
}>> {
  const stats: Array<{ date: string; calories: number; protein: number; carbs: number; fat: number }> = []

  for (let i = 0; i < 7; i++) {
    const dayMs = weekStartMs + i * 24 * 60 * 60 * 1000
    const dayStats = await getDailyNutritionStats(dayMs)
    const date = new Date(dayMs).toISOString().split('T')[0]
    stats.push({
      date: date!,
      calories: dayStats.totalCalories,
      protein: dayStats.totalProtein,
      carbs: dayStats.totalCarbs,
      fat: dayStats.totalFat,
    })
  }

  return stats
}
