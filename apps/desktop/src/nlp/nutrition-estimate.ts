import { callOpenAiText } from '../openai'
import type { OpenAiMessage } from '../openai'
import type { ExtendedMacros, FoodItem } from '../db/insight-db'

export type NutritionEstimateResult = {
  items: FoodItem[]
  totalCalories: number
  macros: ExtendedMacros
  confidence: number // Overall confidence 0-1
  model: string // Model used for estimation
}

export type NutritionEstimateOptions = {
  apiKey: string
  model: string // e.g., 'gpt-4o', 'gpt-4o-mini', 'gpt-4.1'
  foodDescription: string
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink'
  restaurant?: string // Optional restaurant name for better accuracy
  portionContext?: string // e.g., "large portion", "small bowl"
}

const NUTRITION_SYSTEM_PROMPT = `You are a precise nutrition estimation AI. Given a food description, estimate the complete nutritional breakdown.

## Output Format
Return a JSON object with this exact structure:
{
  "items": [
    {
      "name": "Food item name",
      "quantity": 1,
      "unit": "serving",
      "calories": 250,
      "protein": 15,
      "carbs": 30,
      "fat": 8,
      "fiber": 3,
      "saturatedFat": 2,
      "transFat": 0,
      "sugar": 5,
      "sodium": 400,
      "potassium": 300,
      "cholesterol": 50,
      "confidence": 0.85
    }
  ],
  "totalCalories": 250,
  "macros": {
    "protein": 15,
    "carbs": 30,
    "fat": 8,
    "fiber": 3,
    "saturatedFat": 2,
    "transFat": 0,
    "sugar": 5,
    "sodium": 400,
    "potassium": 300,
    "cholesterol": 50
  },
  "overallConfidence": 0.85
}

## Units
- calories: kcal
- protein, carbs, fat, fiber, saturatedFat, transFat, sugar: grams
- sodium, potassium, cholesterol: milligrams

## Confidence Guidelines
- 0.9-1.0: Well-known packaged food with published nutrition facts, or common restaurant with known nutrition
- 0.7-0.89: Common food with typical preparation, standard portions
- 0.5-0.69: Custom preparation, variable portions, estimated from components
- 0.3-0.49: Very uncertain, highly variable preparation
- <0.3: Mostly guessing, incomplete information

## Restaurant Portion Adjustments
- Fast food: Use published nutrition when available
- Casual dining: Portions typically 1.5-2x home cooking
- Fine dining: Portions typically smaller but richer
- Chipotle/similar: Build from components

## Common Reference Points (per standard serving)
- Egg (large): 70cal, 6P, 0C, 5F, 186mg cholesterol, 70mg sodium
- Chicken Breast (4oz cooked): 140cal, 31P, 0C, 3F, 85mg cholesterol
- White Rice (1 cup): 205cal, 4P, 45C, 0.4F, 400mg potassium
- Banana (medium): 105cal, 1P, 27C, 0.4F, 422mg potassium
- Pizza slice (cheese): 285cal, 12P, 36C, 10F, 5g sat fat, 640mg sodium
- Chipotle burrito bowl: 700-1000cal depending on toppings

## Rules
1. Always provide ALL micronutrients even if estimated
2. Break compound foods into components when helpful
3. Account for cooking method (fried adds fat, grilled is leaner)
4. Consider typical American portion sizes unless specified
5. If restaurant is mentioned, look up typical nutrition for that chain
6. Return ONLY valid JSON, no markdown or explanation`

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export async function estimateNutritionWithLlm(
  opts: NutritionEstimateOptions
): Promise<NutritionEstimateResult> {
  const userPrompt = buildUserPrompt(opts)

  const messages: OpenAiMessage[] = [
    { role: 'system', content: NUTRITION_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]

  const response = await callOpenAiText({
    apiKey: opts.apiKey,
    model: opts.model,
    messages,
    temperature: 0.2,
    maxOutputTokens: 1500,
    responseFormat: { type: 'json_object' },
  })

  const parsed = parseNutritionResponse(response, opts.model)
  return parsed
}

function buildUserPrompt(opts: NutritionEstimateOptions): string {
  const parts: string[] = [`Estimate nutrition for: ${opts.foodDescription}`]

  if (opts.mealType) {
    parts.push(`Meal type: ${opts.mealType}`)
  }

  if (opts.restaurant) {
    parts.push(`Restaurant: ${opts.restaurant}`)
  }

  if (opts.portionContext) {
    parts.push(`Portion: ${opts.portionContext}`)
  }

  return parts.join('\n')
}

function parseNutritionResponse(response: string, model: string): NutritionEstimateResult {
  try {
    const json = JSON.parse(response)

    // Parse items
    const items: FoodItem[] = (json.items || []).map((item: any) => ({
      id: makeId(),
      name: item.name || 'Unknown',
      quantity: typeof item.quantity === 'number' ? item.quantity : 1,
      unit: item.unit || 'serving',
      calories: typeof item.calories === 'number' ? item.calories : undefined,
      protein: typeof item.protein === 'number' ? item.protein : undefined,
      carbs: typeof item.carbs === 'number' ? item.carbs : undefined,
      fat: typeof item.fat === 'number' ? item.fat : undefined,
      fiber: typeof item.fiber === 'number' ? item.fiber : undefined,
      saturatedFat: typeof item.saturatedFat === 'number' ? item.saturatedFat : undefined,
      transFat: typeof item.transFat === 'number' ? item.transFat : undefined,
      sugar: typeof item.sugar === 'number' ? item.sugar : undefined,
      sodium: typeof item.sodium === 'number' ? item.sodium : undefined,
      potassium: typeof item.potassium === 'number' ? item.potassium : undefined,
      cholesterol: typeof item.cholesterol === 'number' ? item.cholesterol : undefined,
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.7,
      source: 'ai_estimate' as const,
    }))

    // Parse macros
    const macrosRaw = json.macros || {}
    const macros: ExtendedMacros = {
      protein: typeof macrosRaw.protein === 'number' ? macrosRaw.protein : 0,
      carbs: typeof macrosRaw.carbs === 'number' ? macrosRaw.carbs : 0,
      fat: typeof macrosRaw.fat === 'number' ? macrosRaw.fat : 0,
      fiber: typeof macrosRaw.fiber === 'number' ? macrosRaw.fiber : undefined,
      saturatedFat: typeof macrosRaw.saturatedFat === 'number' ? macrosRaw.saturatedFat : undefined,
      transFat: typeof macrosRaw.transFat === 'number' ? macrosRaw.transFat : undefined,
      sugar: typeof macrosRaw.sugar === 'number' ? macrosRaw.sugar : undefined,
      sodium: typeof macrosRaw.sodium === 'number' ? macrosRaw.sodium : undefined,
      potassium: typeof macrosRaw.potassium === 'number' ? macrosRaw.potassium : undefined,
      cholesterol: typeof macrosRaw.cholesterol === 'number' ? macrosRaw.cholesterol : undefined,
    }

    // Calculate totals if not provided
    const totalCalories = typeof json.totalCalories === 'number'
      ? json.totalCalories
      : items.reduce((sum, item) => sum + (item.calories || 0), 0)

    const confidence = typeof json.overallConfidence === 'number'
      ? json.overallConfidence
      : items.length > 0
        ? items.reduce((sum, item) => sum + (item.confidence || 0.7), 0) / items.length
        : 0.5

    return {
      items,
      totalCalories,
      macros,
      confidence,
      model,
    }
  } catch (error) {
    // Fallback for parse errors
    console.error('Failed to parse nutrition response:', error)
    return {
      items: [],
      totalCalories: 0,
      macros: { protein: 0, carbs: 0, fat: 0 },
      confidence: 0,
      model,
    }
  }
}

// Quick estimation for simple foods without full API call
export function quickEstimateFromDatabase(foodName: string): Partial<FoodItem> | null {
  const normalizedName = foodName.toLowerCase().trim()

  // Common foods database (basic version)
  const QUICK_LOOKUP: Record<string, Partial<FoodItem>> = {
    'egg': { calories: 70, protein: 6, carbs: 0.5, fat: 5, cholesterol: 186, sodium: 70, confidence: 0.95 },
    'eggs': { calories: 70, protein: 6, carbs: 0.5, fat: 5, cholesterol: 186, sodium: 70, confidence: 0.95 },
    'banana': { calories: 105, protein: 1, carbs: 27, fat: 0.4, fiber: 3, potassium: 422, confidence: 0.95 },
    'apple': { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4, potassium: 195, confidence: 0.95 },
    'coffee': { calories: 2, protein: 0, carbs: 0, fat: 0, sodium: 5, confidence: 0.9 },
    'black coffee': { calories: 2, protein: 0, carbs: 0, fat: 0, sodium: 5, confidence: 0.95 },
    'water': { calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 1.0 },
  }

  return QUICK_LOOKUP[normalizedName] || null
}
