import { db } from '../db/insight-db'
import type { ExtendedMacros, FoodItem, Meal, MealType } from '../db/insight-db'
import { deleteMealFromSupabase, syncMealToSupabase } from '../supabase/sync'

// Common foods database with nutritional info (per serving)
type CommonFood = {
  name: string
  unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sodium?: number
  potassium?: number
  saturatedFat?: number
  sugar?: number
  cholesterol?: number
  confidence?: number
}

export const COMMON_FOODS: CommonFood[] = [
  // Proteins
  { name: 'Chicken Breast', unit: 'oz', calories: 46, protein: 8.8, carbs: 0, fat: 1 },
  { name: 'Rotisserie Chicken White Meat', unit: 'oz', calories: 47, protein: 8.5, carbs: 0, fat: 1.5, sodium: 110, potassium: 70, confidence: 0.7 },
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
  { name: 'Extreme Wellness Wrap', unit: 'wrap', calories: 50, protein: 5, carbs: 12, fat: 1.5, fiber: 7, sodium: 200, potassium: 90, confidence: 0.7 },
  { name: 'Low Carb Tortilla', unit: 'tortilla', calories: 70, protein: 5, carbs: 15, fat: 2, fiber: 6, sodium: 210, confidence: 0.6 },
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
  { name: 'Havarti Cheese', unit: 'slice', calories: 120, protein: 7, carbs: 1, fat: 9, sodium: 180, saturatedFat: 6, confidence: 0.7 },
  { name: 'Parmesan', unit: 'tbsp', calories: 22, protein: 2, carbs: 0.2, fat: 1.5 },
  { name: 'Pizza Slice', unit: 'slice', calories: 285, protein: 12, carbs: 36, fat: 10 },
  { name: 'Hot Dog', unit: 'item', calories: 150, protein: 5, carbs: 2, fat: 13 },
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

type RestaurantFood = {
  name: string
  restaurant?: string
  aliases?: string[]
  unit?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sodium?: number
  potassium?: number
  saturatedFat?: number
  transFat?: number
  sugar?: number
  cholesterol?: number
  confidence?: number
}

// Fast food / Restaurant items (rough estimates)
export const RESTAURANT_FOODS: RestaurantFood[] = [
  {
    name: 'Double Quarter Pounder with Cheese',
    restaurant: "McDonald's",
    aliases: ['double quarter pounder', 'quarter pounder with cheese', 'quarter pounder', 'double quarter powder with cheese'],
    calories: 740,
    protein: 48,
    carbs: 43,
    fat: 42,
    fiber: 2,
    sugar: 10,
    saturatedFat: 20,
    transFat: 1.5,
    sodium: 1360,
    potassium: 660,
    cholesterol: 155,
    confidence: 0.6,
  },
  {
    name: 'McFlurry',
    restaurant: "McDonald's",
    aliases: ['mc flurry', 'oreo mcflurry'],
    calories: 510,
    protein: 12,
    carbs: 74,
    fat: 16,
    fiber: 1,
    sugar: 64,
    saturatedFat: 10,
    transFat: 0,
    sodium: 240,
    potassium: 370,
    cholesterol: 50,
    confidence: 0.55,
  },
  { name: 'Big Mac', restaurant: "McDonald's", calories: 550, protein: 25, carbs: 45, fat: 30 },
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
        fiber: food.fiber ? Math.round(food.fiber * quantity) : undefined,
        sodium: food.sodium ? Math.round(food.sodium * quantity) : undefined,
        potassium: food.potassium ? Math.round(food.potassium * quantity) : undefined,
        saturatedFat: food.saturatedFat ? Math.round(food.saturatedFat * quantity) : undefined,
        sugar: food.sugar ? Math.round(food.sugar * quantity) : undefined,
        cholesterol: food.cholesterol ? Math.round(food.cholesterol * quantity) : undefined,
        confidence: food.confidence ?? 0.85,
        source: 'database',
      }
    }
  }

  // Check restaurant foods
  for (const food of RESTAURANT_FOODS) {
    const nameMatch = lower.includes(food.name.toLowerCase())
    const aliasMatch = food.aliases?.some((alias) => lower.includes(alias.toLowerCase()))
    const restaurantMatch = food.restaurant && lower.includes(food.restaurant.toLowerCase())
    if (nameMatch || aliasMatch || restaurantMatch) {
      return {
        name: food.name,
        quantity,
        unit: unit === 'serving' ? food.unit ?? 'item' : unit,
        calories: Math.round(food.calories * quantity),
        protein: Math.round(food.protein * quantity),
        carbs: Math.round(food.carbs * quantity),
        fat: Math.round(food.fat * quantity),
        fiber: food.fiber ? Math.round(food.fiber * quantity) : undefined,
        sodium: food.sodium ? Math.round(food.sodium * quantity) : undefined,
        potassium: food.potassium ? Math.round(food.potassium * quantity) : undefined,
        saturatedFat: food.saturatedFat ? Math.round(food.saturatedFat * quantity) : undefined,
        transFat: food.transFat ? Math.round(food.transFat * quantity) : undefined,
        sugar: food.sugar ? Math.round(food.sugar * quantity) : undefined,
        cholesterol: food.cholesterol ? Math.round(food.cholesterol * quantity) : undefined,
        confidence: food.confidence ?? 0.75,
        source: 'database',
      }
    }
  }

  // Default estimate based on keywords
  if (/salad/i.test(name)) return { calories: 150, protein: 5, carbs: 15, fat: 8, confidence: 0.4, source: 'database' }
  if (/sandwich/i.test(name)) return { calories: 400, protein: 20, carbs: 40, fat: 15, confidence: 0.4, source: 'database' }
  if (/burger/i.test(name)) return { calories: 600, protein: 30, carbs: 45, fat: 35, confidence: 0.4, source: 'database' }
  if (/pizza/i.test(name)) return { calories: 285, protein: 12, carbs: 36, fat: 10, confidence: 0.5, source: 'database' }
  if (/hot\s*dog/i.test(name)) return { calories: 150, protein: 5, carbs: 2, fat: 13, confidence: 0.5, source: 'database' }
  if (/steak/i.test(name)) return { calories: 300, protein: 40, carbs: 0, fat: 15, confidence: 0.45, source: 'database' }
  if (/smoothie/i.test(name)) return { calories: 300, protein: 10, carbs: 50, fat: 5, confidence: 0.35, source: 'database' }
  if (/wrap|tortilla/i.test(name)) return { calories: 120, protein: 4, carbs: 22, fat: 3, fiber: 4, confidence: 0.35, source: 'database' }
  if (/chipotle/i.test(name) && /bowl|burrito/i.test(name)) return { calories: 700, protein: 40, carbs: 50, fat: 35, confidence: 0.6, source: 'database' }

  return { name, quantity, unit, confidence: 0.25, source: 'database' }
}

// Parse meal from natural language
const FOOD_CUE_RE = /\b(ate|eat|eating|meal|breakfast|lunch|dinner|snack|drink|drank|coffee|tea|smoothie|shake|pizza|hot dog|chipotle|burrito|bowl|salad|sandwich|burger|rice|pasta|chicken|beef|fish|fruit|veggie|vegetable|costco|grocery|mcdonalds|mcflurry|mc\s*flurry|quarter\s+pounder|big\s+mac|whopper)\b/i
const WORKOUT_CUE_RE = /\b(run|ran|jog|walk|cycle|bike|mile|miles|km|minutes?|mins?|reps?|sets?|bench|press|squat|deadlift|treadmill|cardio|rpe|gym)\b/i

function isWorkoutToken(name: string) {
  return WORKOUT_CUE_RE.test(name)
}

function singularizeUnit(raw: string) {
  const cleaned = raw.trim().toLowerCase()
  if (cleaned.endsWith('s')) return cleaned.slice(0, -1)
  return cleaned
}

function normalizeFoodName(raw: string) {
  return raw
    .replace(/\b(of|a|an|the|some)\b/gi, ' ')
    .replace(/\b(wraps)\b/gi, 'wrap')
    .replace(/\b(tortillas)\b/gi, 'tortilla')
    .replace(/\b(slices)\b/gi, 'slice')
    .replace(/\b(pieces)\b/gi, 'piece')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeFoodKey(raw: string) {
  return normalizeFoodName(raw).toLowerCase()
}

function inferMealTypeFromTime(nowMs: number): MealType {
  const hour = new Date(nowMs).getHours()
  if (hour >= 5 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 15) return 'lunch'
  if (hour >= 17 && hour < 21) return 'dinner'
  return 'snack'
}

export function parseMealFromText(text: string, opts?: { nowMs?: number }): Partial<Meal> | null {
  const items: FoodItem[] = []

  // Detect meal type
  let mealType: MealType | null = null
  if (/\b(breakfast|morning)\b/i.test(text)) mealType = 'breakfast'
  else if (/\b(lunch|midday)\b/i.test(text)) mealType = 'lunch'
  else if (/\b(dinner|supper|evening)\b/i.test(text)) mealType = 'dinner'
  else if (/\b(coffee|tea|water|drink|smoothie|shake)\b/i.test(text)) mealType = 'drink'
  if (!mealType && opts?.nowMs != null) mealType = inferMealTypeFromTime(opts.nowMs)
  if (!mealType) mealType = 'snack'

  const hasFoodCue = FOOD_CUE_RE.test(text) || /\b(wraps?|tortillas?|cheese|rotisserie|havarti)\b/i.test(text)
  if (!hasFoodCue && WORKOUT_CUE_RE.test(text)) {
    return null
  }

  const seen = new Set<string>()
  const UNIT_LEAD_RE = /^(?:oz|ounce|ounces|cup|cups|head|heads|slice|slices|piece|pieces|wrap|wraps|tortilla|tortillas|serving|servings)\b/i
  const WORD_QUANTITIES: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  }
  const parseWordQuantity = (raw?: string) => {
    if (!raw) return null
    const cleaned = raw.toLowerCase()
    if (cleaned === 'a' || cleaned === 'an') return 1
    return WORD_QUANTITIES[cleaned] ?? null
  }

  const recordItem = (foodNameRaw: string, quantity: number, unit: string) => {
    const cleaned = normalizeFoodName(foodNameRaw)
    if (!cleaned || cleaned.length < 3) return
    if (isWorkoutToken(cleaned)) return
    const key = normalizeFoodKey(cleaned)
    if (!key || seen.has(key)) return
    seen.add(key)

    const estimated = estimateFoodNutrition(cleaned, quantity, unit)
    items.push({
      id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: estimated.name ?? cleaned,
      quantity,
      unit: estimated.unit ?? unit,
      calories: estimated.calories,
      protein: estimated.protein,
      carbs: estimated.carbs,
      fat: estimated.fat,
      fiber: estimated.fiber,
      saturatedFat: estimated.saturatedFat,
      transFat: estimated.transFat,
      sugar: estimated.sugar,
      sodium: estimated.sodium,
      potassium: estimated.potassium,
      cholesterol: estimated.cholesterol,
      confidence: estimated.confidence,
      source: estimated.source,
    })
  }

  const explicitUnitPatterns = [
    /(\d+(?:\.\d+)?)\s*(slice|slices|piece|pieces|serving|servings|wrap|wraps|tortilla|tortillas|cup|cups)\s*(?:of\s+)?([a-zA-Z][a-zA-Z\s]+)/gi,
  ]

  for (const pattern of explicitUnitPatterns) {
    for (const match of text.matchAll(pattern)) {
      const quantity = parseFloat(match[1])
      const unit = singularizeUnit(match[2] ?? 'serving')
      let foodName = match[3].trim()
      if ((unit === 'wrap' || unit === 'tortilla') && !new RegExp(`\\b${unit}\\b`, 'i').test(foodName)) {
        foodName = `${foodName} ${unit}`
      }
      recordItem(foodName, quantity, unit)
    }
  }

  // Trailing unit phrases like "2 extreme wellness wraps"
  const trailingUnitPattern = /(\d+(?:\.\d+)?)\s+([a-zA-Z][a-zA-Z\s]{2,40}?)\s+(wraps?|tortillas?)\b/gi
  for (const match of text.matchAll(trailingUnitPattern)) {
    const quantity = parseFloat(match[1])
    const unit = singularizeUnit(match[3] ?? 'serving')
    let foodName = match[2].trim()
    if (!new RegExp(`\\b${unit}\\b`, 'i').test(foodName)) {
      foodName = `${foodName} ${unit}`
    }
    recordItem(foodName, quantity, unit)
  }

  // Parse patterns like "2 heads of romaine" or "6oz chicken"
  const quantityPatterns: Array<{ regex: RegExp; unit: string }> = [
    { regex: /(\d+(?:\.\d+)?)\s*(?:oz|ounces?)\s+(?:of\s+)?([a-zA-Z][a-zA-Z\s]+)/gi, unit: 'oz' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:cups?)\s+(?:of\s+)?([a-zA-Z][a-zA-Z\s]+)/gi, unit: 'cup' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:heads?)\s+(?:of\s+)?([a-zA-Z][a-zA-Z\s]+)/gi, unit: 'head' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:servings?)\s+(?:of\s+)?([a-zA-Z][a-zA-Z\s]+)/gi, unit: 'serving' },
  ]

  for (const { regex, unit } of quantityPatterns) {
    for (const match of text.matchAll(regex)) {
      const quantity = parseFloat(match[1])
      const foodName = match[2].trim()
      recordItem(foodName, quantity, unit)
    }
  }

  // Generic quantity: "2 apples"
  if (hasFoodCue) {
    const wordQuantityPattern = /\b(one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+([a-zA-Z][a-zA-Z\s]{2,40})/gi
    for (const match of text.matchAll(wordQuantityPattern)) {
      const quantity = parseWordQuantity(match[1])
      const foodName = match[2].trim()
      if (!quantity) continue
      if (UNIT_LEAD_RE.test(foodName)) continue
      recordItem(foodName, quantity, 'serving')
    }

    const numericQuantityPattern = /(\d+(?:\.\d+)?)\s+([a-zA-Z][a-zA-Z\s]+)/gi
    for (const match of text.matchAll(numericQuantityPattern)) {
      const quantity = parseFloat(match[1])
      const foodName = match[2].trim()
      if (UNIT_LEAD_RE.test(foodName)) continue
      recordItem(foodName, quantity, 'serving')
    }
  }

  // Parse simple food mentions without quantities
  const simplePattern = /\b(?:had|ate|having|got)\s+(?:(one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+)?([a-zA-Z][a-zA-Z\s]{2,40})/gi
  for (const match of text.matchAll(simplePattern)) {
    const quantity = parseWordQuantity(match[1]) ?? 1
    const foodName = match[2].trim()
    recordItem(foodName, quantity, 'serving')
  }

  if (items.length === 0) return null

  // Calculate totals
  const totalCalories = items.reduce((sum, item) => sum + (item.calories ?? 0), 0)
  const sumOptional = (key: keyof FoodItem) => {
    let total = 0
    let has = false
    for (const item of items) {
      const value = item[key]
      if (typeof value === 'number' && Number.isFinite(value)) {
        total += value
        has = true
      }
    }
    return has ? total : undefined
  }
  const macros: ExtendedMacros = {
    protein: items.reduce((sum, item) => sum + (item.protein ?? 0), 0),
    carbs: items.reduce((sum, item) => sum + (item.carbs ?? 0), 0),
    fat: items.reduce((sum, item) => sum + (item.fat ?? 0), 0),
    fiber: items.reduce((sum, item) => sum + (item.fiber ?? 0), 0) || undefined,
    saturatedFat: sumOptional('saturatedFat'),
    transFat: sumOptional('transFat'),
    sugar: sumOptional('sugar'),
    sodium: sumOptional('sodium'),
    potassium: sumOptional('potassium'),
    cholesterol: sumOptional('cholesterol'),
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
  void syncMealToSupabase(toSave)
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
  const existing = await db.meals.get(id)
  await db.meals.delete(id)
  if (existing) {
    void deleteMealFromSupabase(existing)
  }
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
