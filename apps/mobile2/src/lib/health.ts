export type WorkoutType = 'strength' | 'cardio' | 'mobility' | 'recovery' | 'mixed';

export type WeightUnit = 'lbs' | 'kg';
export type DistanceUnit = 'mi' | 'km';

export type ExerciseSet = {
  reps?: number;
  weight?: number;
  weightUnit?: WeightUnit; // User's preferred unit (lbs or kg)
  duration?: number; // seconds
  distance?: number; // numeric distance
  distanceUnit?: DistanceUnit;
  rpe?: number;
  restSeconds?: number;
};

export type Exercise = {
  id: string;
  name: string;
  type: WorkoutType;
  sets: ExerciseSet[];
  notes?: string;
  muscleGroups?: string[];
};

export type WorkoutEntry = {
  id: string;
  title: string;
  type: WorkoutType;
  exercises: Exercise[];
  startAt: number;
  endAt?: number | null;
  totalDuration?: number; // minutes
  estimatedCalories?: number;
  overallRpe?: number;
  notes?: string;
  sourceCaptureId?: string | null;
};

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink';

// Extended macros with full micronutrients
export type ExtendedMacros = {
  protein: number;       // grams
  carbs: number;         // grams
  fat: number;           // grams
  fiber?: number;        // grams
  saturatedFat?: number; // grams
  transFat?: number;     // grams
  sugar?: number;        // grams
  sodium?: number;       // milligrams
  potassium?: number;    // milligrams
  cholesterol?: number;  // milligrams
};

export type FoodItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories?: number;
  // Macronutrients (grams)
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  // Extended micronutrients
  saturatedFat?: number; // grams
  transFat?: number;     // grams
  sugar?: number;        // grams
  sodium?: number;       // milligrams
  potassium?: number;    // milligrams
  cholesterol?: number;  // milligrams
  // Metadata
  brand?: string;
  notes?: string;
  confidence?: number;   // 0-1, how confident the AI estimate is
  source?: 'manual' | 'ai_estimate' | 'database';
};

export type MealEntry = {
  id: string;
  title: string;
  type: MealType;
  items: FoodItem[];
  totalCalories: number;
  macros: ExtendedMacros;
  location?: string | null;
  notes?: string;
  eatenAt: number;
  createdAt: number;
  updatedAt: number;
  sourceCaptureId?: string | null;
  estimationModel?: string; // e.g., "gpt-4o", "gpt-4o-mini"
};

type CommonFood = {
  name: string;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  potassium?: number;
  saturatedFat?: number;
  sugar?: number;
  cholesterol?: number;
  confidence?: number;
};

const COMMON_FOODS: CommonFood[] = [
  { name: 'Chicken Breast', unit: 'oz', calories: 46, protein: 8.8, carbs: 0, fat: 1 },
  { name: 'Rotisserie Chicken White Meat', unit: 'oz', calories: 47, protein: 8.5, carbs: 0, fat: 1.5, sodium: 110, potassium: 70, confidence: 0.7 },
  { name: 'Ground Beef (90% lean)', unit: 'oz', calories: 50, protein: 7, carbs: 0, fat: 2.5 },
  { name: 'Salmon', unit: 'oz', calories: 58, protein: 7, carbs: 0, fat: 3 },
  { name: 'Eggs', unit: 'large', calories: 70, protein: 6, carbs: 0.5, fat: 5 },
  { name: 'Greek Yogurt', unit: 'cup', calories: 100, protein: 17, carbs: 6, fat: 0.7 },
  { name: 'White Rice (cooked)', unit: 'cup', calories: 205, protein: 4, carbs: 45, fat: 0.4 },
  { name: 'Brown Rice (cooked)', unit: 'cup', calories: 215, protein: 5, carbs: 45, fat: 1.8 },
  { name: 'Extreme Wellness Wrap', unit: 'wrap', calories: 50, protein: 5, carbs: 12, fat: 1.5, fiber: 7, sodium: 200, potassium: 90, confidence: 0.7 },
  { name: 'Low Carb Tortilla', unit: 'tortilla', calories: 70, protein: 5, carbs: 15, fat: 2, fiber: 6, sodium: 210, confidence: 0.6 },
  { name: 'Oatmeal (cooked)', unit: 'cup', calories: 150, protein: 5, carbs: 27, fat: 3 },
  { name: 'Banana', unit: 'medium', calories: 105, protein: 1, carbs: 27, fat: 0.4 },
  { name: 'Avocado', unit: 'whole', calories: 320, protein: 4, carbs: 17, fat: 29 },
  { name: 'Olive Oil', unit: 'tbsp', calories: 120, protein: 0, carbs: 0, fat: 14 },
  { name: 'Peanut Butter', unit: 'tbsp', calories: 95, protein: 4, carbs: 3, fat: 8 },
  { name: 'Coffee (black)', unit: 'cup', calories: 2, protein: 0, carbs: 0, fat: 0 },
  { name: 'Protein Shake', unit: 'scoop', calories: 120, protein: 25, carbs: 3, fat: 1 },
  { name: 'Water', unit: 'cup', calories: 0, protein: 0, carbs: 0, fat: 0 },
  { name: 'Havarti Cheese', unit: 'slice', calories: 120, protein: 7, carbs: 1, fat: 9, sodium: 180, saturatedFat: 6, confidence: 0.7 },
  { name: 'Pizza Slice', unit: 'slice', calories: 285, protein: 12, carbs: 36, fat: 10 },
  { name: 'Hot Dog', unit: 'item', calories: 150, protein: 5, carbs: 2, fat: 13 },
];

type RestaurantFood = {
  name: string;
  restaurant?: string;
  aliases?: string[];
  unit?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  potassium?: number;
  saturatedFat?: number;
  transFat?: number;
  sugar?: number;
  cholesterol?: number;
  confidence?: number;
};

const RESTAURANT_FOODS: RestaurantFood[] = [
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
];

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clampRpe(value: number) {
  if (!Number.isFinite(value)) return undefined;
  return Math.max(1, Math.min(10, Math.round(value)));
}

function inferRpe(text: string): number | undefined {
  const lowered = text.toLowerCase();
  const explicit = lowered.match(/\b(?:rpe|difficulty|intensity)\s*(?:was|of|:)?\s*(\d{1,2})/i);
  if (explicit?.[1]) return clampRpe(Number(explicit[1]));
  if (/\b(max|all[-\s]?out)\b/.test(lowered)) return 10;
  if (/\b(really hard|very hard|brutal)\b/.test(lowered)) return 9;
  if (/\bhard\b/.test(lowered)) return 8;
  if (/\bmoderate|medium\b/.test(lowered)) return 6;
  if (/\beasy|light\b/.test(lowered)) return 4;
  return undefined;
}

function normalizeWorkoutType(text: string): WorkoutType {
  const hasCardio = /\b(cardio|run|running|treadmill|elliptical|cycle|cycling|zone 2)\b/i.test(text);
  const hasStrength = /\b(lift|strength|bench|squat|deadlift|weights?)\b/i.test(text);
  const hasMobility = /\b(yoga|stretch|mobility|foam roll)\b/i.test(text);
  const hasRecovery = /\b(sauna|cold plunge|recovery|massage)\b/i.test(text);

  const flags = [hasCardio, hasStrength, hasMobility, hasRecovery].filter(Boolean).length;
  if (flags > 1) return 'mixed';
  if (hasCardio) return 'cardio';
  if (hasStrength) return 'strength';
  if (hasMobility) return 'mobility';
  if (hasRecovery) return 'recovery';
  return 'mixed';
}

function parseDurationMinutes(value: string, unit: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  if (/h|hr|hour/.test(unit)) return Math.round(amount * 60);
  return Math.round(amount);
}

export function parseWorkoutFromText(text: string) {
  const lower = text.toLowerCase();
  const exercises: Exercise[] = [];
  const workoutType = normalizeWorkoutType(text);
  const overallRpe = inferRpe(text);
  const seenBodyweight = new Set<string>();

  const BODYWEIGHT_RE = '(?:push[-\\s]?ups?|pull[-\\s]?ups?|sit[-\\s]?ups?|burpees|squats|lunges|jumping jacks|dips?)';
  const addBodyweight = (rawName: string, reps: number) => {
    const name = rawName.replace(/\s+/g, ' ').trim();
    if (!Number.isFinite(reps)) return;
    const key = `${name.toLowerCase()}|${reps}`;
    if (seenBodyweight.has(key)) return;
    seenBodyweight.add(key);
    exercises.push({
      id: makeId('ex'),
      name: name.charAt(0).toUpperCase() + name.slice(1),
      type: 'strength',
      sets: [{ reps }],
    });
  };

  const setPatterns = [
    /(\d+)\s*(?:sets?\s+(?:of\s+)?)?(\d+)\s*(?:reps?)?\s*([a-zA-Z][a-zA-Z\s-]{2,40})\s*(?:at|@)\s*(\d+)/gi,
    /(\d+)\s*(?:sets?\s+(?:of\s+)?)?(\d+)\s*(?:reps?)?\s*(?:at|@)\s*(\d+)/gi,
    /(\d+)\s*x\s*(\d+)\s*(?:at|@)\s*(\d+)/gi,
  ];

  for (const pattern of setPatterns) {
    for (const match of text.matchAll(pattern)) {
      const numSets = parseInt(match[1], 10);
      const reps = parseInt(match[2], 10);
      const hasInlineName = match.length > 4;
      const weight = parseFloat(hasInlineName ? match[4] : match[3]);
      const beforeMatch = text.slice(0, match.index ?? 0).trim();
      const inlineName = hasInlineName ? match[3]?.trim() : '';
      const exerciseName = inlineName || beforeMatch.split(/[,.]/).pop()?.trim() || 'Exercise';
      const sets: ExerciseSet[] = Array(numSets).fill(null).map(() => ({ reps, weight }));
      exercises.push({
        id: makeId('ex'),
        name: exerciseName,
        type: 'strength',
        sets,
      });
    }
  }

  const pairedBodyweightPattern = new RegExp(`(${BODYWEIGHT_RE})\\s*(\\d+)\\s*(${BODYWEIGHT_RE})`, 'gi');
  for (const match of text.matchAll(pairedBodyweightPattern)) {
    const reps = parseInt(match[2], 10);
    addBodyweight(match[1], reps);
    addBodyweight(match[3], reps);
  }

  const exerciseFirstPattern = new RegExp(`(${BODYWEIGHT_RE})\\s*(\\d+)`, 'gi');
  for (const match of text.matchAll(exerciseFirstPattern)) {
    const reps = parseInt(match[2], 10);
    addBodyweight(match[1], reps);
  }

  for (const match of text.matchAll(/(\d+)\s*(push[-\s]?ups?|pull[-\s]?ups?|sit[-\s]?ups?|burpees|squats|lunges|jumping jacks|dips?)/gi)) {
    const reps = parseInt(match[1], 10);
    addBodyweight(match[2], reps);
  }

  const cardioMatch =
    text.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\s*(?:on\s+)?(treadmill|elliptical|running|cycling|bike|rower|rowing|walk|walking)/i) ??
    text.match(/(?:ran|run|walked|jogged|cycled|biked)\s*(\d+(?:\.\d+)?)\s*(miles?|mi|kilometers?|km)\s*(?:in\s*)?(\d+(?:\.\d+)?)?\s*(?:minutes?|mins?|m)?/i) ??
    text.match(/(\d+(?:\.\d+)?)\s*(miles?|mi|kilometers?|km)\s*(?:in\s*)?(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)/i);

  if (cardioMatch) {
    let durationMinutes: number | null = null;
    let distance: number | null = null;
    let distanceUnit: ExerciseSet['distanceUnit'] = 'mi';
    let name = 'Cardio';

    if (cardioMatch[2] && /treadmill|elliptical|running|cycling|bike|rower|rowing|walk/i.test(cardioMatch[2])) {
      durationMinutes = parseDurationMinutes(cardioMatch[1], 'm');
      name = cardioMatch[2];
    } else {
      distance = Number(cardioMatch[1]);
      distanceUnit = /km|kilometer/.test(cardioMatch[2] ?? '') ? 'km' : 'mi';
      if (cardioMatch[3]) durationMinutes = parseDurationMinutes(cardioMatch[3], 'm');
      name = /run|ran|running/.test(lower) ? 'Run' : /walk/.test(lower) ? 'Walk' : 'Cardio';
    }

    const durationSeconds = durationMinutes != null ? Math.max(1, durationMinutes) * 60 : undefined;
    exercises.push({
      id: makeId('ex'),
      name,
      type: 'cardio',
      sets: [{ duration: durationSeconds, distance: distance ?? undefined, distanceUnit, rpe: overallRpe }],
    });
  }

  const recoveryMatch = text.match(/\b(sauna|cold plunge|massage|stretch(?:ing)?|yoga|mobility|equestrian|horseback)\b.*?(\d+(?:\.\d+)?)\s*(minutes?|mins?|m|hours?|hrs?|h)\b/i);
  if (recoveryMatch) {
    const durationMinutes = parseDurationMinutes(recoveryMatch[2], recoveryMatch[3]);
    const name = recoveryMatch[1].replace(/\b\w/g, (c) => c.toUpperCase());
    exercises.push({
      id: makeId('ex'),
      name,
      type: /\b(sauna|cold plunge|massage)\b/i.test(recoveryMatch[1]) ? 'recovery' : 'mobility',
      sets: durationMinutes ? [{ duration: durationMinutes * 60 }] : [],
    });
  }

  if (exercises.length === 0) return null;

  const totalDuration = exercises
    .flatMap((ex) => ex.sets)
    .reduce((sum, set) => sum + (set.duration ?? 0), 0);

  return {
    type: workoutType,
    exercises,
    overallRpe,
    totalDuration: totalDuration ? Math.round(totalDuration / 60) : undefined,
  };
}

export function estimateWorkoutCalories(workout: Pick<WorkoutEntry, 'type' | 'exercises' | 'overallRpe'>, bodyWeightKg = 80) {
  let total = 0;
  for (const exercise of workout.exercises) {
    const sets = exercise.sets.length || 1;
    const avgReps = exercise.sets.reduce((sum, s) => sum + (s.reps ?? 0), 0) / sets || 10;
    const avgWeight = exercise.sets.reduce((sum, s) => sum + (s.weight ?? 0), 0) / sets || 0;
    const durationMinutes = exercise.sets.reduce((sum, s) => sum + (s.duration ?? 0), 0) / 60;
    switch (exercise.type) {
      case 'strength':
        total += sets * avgReps * (avgWeight * 0.453592) * 0.05;
        break;
      case 'cardio': {
        const intensity = workout.overallRpe ?? 6;
        total += durationMinutes * (6 + intensity * 0.6);
        break;
      }
      case 'mobility':
      case 'recovery':
        total += durationMinutes * 3.5;
        break;
    }
  }
  const weightAdj = Math.max(0.75, Math.min(1.25, bodyWeightKg / 80));
  return Math.round(total * weightAdj);
}

export function estimateFoodNutrition(name: string, quantity = 1, unit = 'serving'): Partial<FoodItem> {
  const lower = name.toLowerCase();

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
      };
    }
  }

  for (const food of RESTAURANT_FOODS) {
    const nameMatch = lower.includes(food.name.toLowerCase());
    const aliasMatch = food.aliases?.some((alias) => lower.includes(alias.toLowerCase()));
    const restaurantMatch = food.restaurant && lower.includes(food.restaurant.toLowerCase());
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
      };
    }
  }

  if (/salad/i.test(name)) return { calories: 150, protein: 5, carbs: 15, fat: 8, confidence: 0.4, source: 'database' };
  if (/sandwich/i.test(name)) return { calories: 400, protein: 20, carbs: 40, fat: 15, confidence: 0.4, source: 'database' };
  if (/burger/i.test(name)) return { calories: 600, protein: 30, carbs: 45, fat: 35, confidence: 0.4, source: 'database' };
  if (/pizza/i.test(name)) return { calories: 285, protein: 12, carbs: 36, fat: 10, confidence: 0.5, source: 'database' };
  if (/hot\s*dog/i.test(name)) return { calories: 150, protein: 5, carbs: 2, fat: 13, confidence: 0.5, source: 'database' };
  if (/steak/i.test(name)) return { calories: 300, protein: 40, carbs: 0, fat: 15, confidence: 0.45, source: 'database' };
  if (/smoothie/i.test(name)) return { calories: 300, protein: 10, carbs: 50, fat: 5, confidence: 0.35, source: 'database' };
  if (/wrap|tortilla/i.test(name)) return { calories: 120, protein: 4, carbs: 22, fat: 3, fiber: 4, confidence: 0.35, source: 'database' };
  if (/chipotle/i.test(name) && /bowl|burrito/i.test(name)) {
    return { calories: 700, protein: 40, carbs: 50, fat: 35, confidence: 0.6, source: 'database' };
  }

  return { name, quantity, unit, confidence: 0.25, source: 'database' };
}

const FOOD_CUE_RE = /\b(ate|eat|eating|meal|breakfast|lunch|dinner|snack|drink|drank|coffee|tea|smoothie|shake|pizza|hot dog|chipotle|burrito|bowl|salad|sandwich|burger|rice|pasta|chicken|beef|fish|fruit|veggie|vegetable|costco|grocery|mcdonalds|mcflurry|mc\s*flurry|quarter\s+pounder|big\s+mac|whopper)\b/i;
const WORKOUT_CUE_RE = /\b(run|ran|jog|walk|cycle|bike|mile|miles|km|minutes?|mins?|reps?|sets?|bench|press|squat|deadlift|treadmill|cardio|rpe|gym)\b/i;

function isWorkoutToken(name: string) {
  return WORKOUT_CUE_RE.test(name);
}

function singularizeUnit(raw: string) {
  const cleaned = raw.trim().toLowerCase();
  if (cleaned.endsWith('s')) return cleaned.slice(0, -1);
  return cleaned;
}

function normalizeFoodName(raw: string) {
  return raw
    .replace(/\b(of|a|an|the|some)\b/gi, ' ')
    .replace(/\b(wraps)\b/gi, 'wrap')
    .replace(/\b(tortillas)\b/gi, 'tortilla')
    .replace(/\b(slices)\b/gi, 'slice')
    .replace(/\b(pieces)\b/gi, 'piece')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeFoodKey(raw: string) {
  return normalizeFoodName(raw).toLowerCase();
}

function inferMealTypeFromTime(nowMs: number): MealType {
  const hour = new Date(nowMs).getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'snack';
}

export function parseMealFromText(text: string, opts?: { nowMs?: number }) {
  const items: FoodItem[] = [];

  let mealType: MealType | null = null;
  if (/\b(breakfast|morning)\b/i.test(text)) mealType = 'breakfast';
  else if (/\b(lunch|midday)\b/i.test(text)) mealType = 'lunch';
  else if (/\b(dinner|supper|evening)\b/i.test(text)) mealType = 'dinner';
  else if (/\b(coffee|tea|water|drink|smoothie|shake)\b/i.test(text)) mealType = 'drink';
  if (!mealType && opts?.nowMs != null) mealType = inferMealTypeFromTime(opts.nowMs);
  if (!mealType) mealType = 'snack';

  const hasFoodCue = FOOD_CUE_RE.test(text) || /\b(wraps?|tortillas?|cheese|rotisserie|havarti)\b/i.test(text);
  if (!hasFoodCue && WORKOUT_CUE_RE.test(text)) return null;

  const seen = new Set<string>();
  const UNIT_LEAD_RE = /^(?:oz|ounce|ounces|cup|cups|head|heads|slice|slices|piece|pieces|wrap|wraps|tortilla|tortillas|serving|servings)\b/i;
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
  };
  const parseWordQuantity = (raw?: string) => {
    if (!raw) return null;
    const cleaned = raw.toLowerCase();
    if (cleaned === 'a' || cleaned === 'an') return 1;
    return WORD_QUANTITIES[cleaned] ?? null;
  };

  const recordItem = (foodNameRaw: string, quantity: number, unit: string) => {
    const cleaned = normalizeFoodName(foodNameRaw);
    if (!cleaned || cleaned.length < 3) return;
    if (isWorkoutToken(cleaned)) return;
    const key = normalizeFoodKey(cleaned);
    if (!key || seen.has(key)) return;
    seen.add(key);

    const estimated = estimateFoodNutrition(cleaned, quantity, unit);
    items.push({
      id: makeId('food'),
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
    });
  };

  const explicitUnitPatterns = [
    /(\d+(?:\.\d+)?)\s*(slice|slices|piece|pieces|serving|servings|wrap|wraps|tortilla|tortillas|cup|cups)\s*(?:of\s+)?([a-zA-Z][a-zA-Z\s]+)/gi,
  ];

  for (const pattern of explicitUnitPatterns) {
    for (const match of text.matchAll(pattern)) {
      const quantity = parseFloat(match[1]);
      const unit = singularizeUnit(match[2] ?? 'serving');
      let foodName = match[3].trim();
      if ((unit === 'wrap' || unit === 'tortilla') && !new RegExp(`\\b${unit}\\b`, 'i').test(foodName)) {
        foodName = `${foodName} ${unit}`;
      }
      recordItem(foodName, quantity, unit);
    }
  }

  const trailingUnitPattern = /(\d+(?:\.\d+)?)\s+([a-zA-Z][a-zA-Z\s]{2,40}?)\s+(wraps?|tortillas?)\b/gi;
  for (const match of text.matchAll(trailingUnitPattern)) {
    const quantity = parseFloat(match[1]);
    const unit = singularizeUnit(match[3] ?? 'serving');
    let foodName = match[2].trim();
    if (!new RegExp(`\\b${unit}\\b`, 'i').test(foodName)) {
      foodName = `${foodName} ${unit}`;
    }
    recordItem(foodName, quantity, unit);
  }

  const quantityPatterns: Array<{ regex: RegExp; unit: string }> = [
    { regex: /(\d+(?:\.\d+)?)\s*(?:oz|ounces?)\s+(?:of\s+)?([a-zA-Z][a-zA-Z\s]+)/gi, unit: 'oz' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:cups?)\s+(?:of\s+)?([a-zA-Z][a-zA-Z\s]+)/gi, unit: 'cup' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:heads?)\s+(?:of\s+)?([a-zA-Z][a-zA-Z\s]+)/gi, unit: 'head' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:servings?)\s+(?:of\s+)?([a-zA-Z][a-zA-Z\s]+)/gi, unit: 'serving' },
  ];

  for (const { regex, unit } of quantityPatterns) {
    for (const match of text.matchAll(regex)) {
      const quantity = parseFloat(match[1]);
      const foodName = match[2].trim();
      recordItem(foodName, quantity, unit);
    }
  }

  if (hasFoodCue) {
    const wordQuantityPattern = /\b(one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+([a-zA-Z][a-zA-Z\s]{2,40})/gi;
    for (const match of text.matchAll(wordQuantityPattern)) {
      const quantity = parseWordQuantity(match[1]);
      const foodName = match[2].trim();
      if (!quantity) continue;
      if (UNIT_LEAD_RE.test(foodName)) continue;
      recordItem(foodName, quantity, 'serving');
    }

    const numericQuantityPattern = /(\d+(?:\.\d+)?)\s+([a-zA-Z][a-zA-Z\s]+)/gi;
    for (const match of text.matchAll(numericQuantityPattern)) {
      const quantity = parseFloat(match[1]);
      const foodName = match[2].trim();
      if (UNIT_LEAD_RE.test(foodName)) continue;
      recordItem(foodName, quantity, 'serving');
    }
  }

  const chipotleMatch = /\bchipotle\b/i.test(text);
  if (chipotleMatch && !items.find((item) => /chipotle/i.test(item.name))) {
    recordItem('Chipotle Burrito Bowl', 1, 'item');
  }

  const simplePattern = /\b(?:had|ate|having|got)\s+(?:(one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+)?([a-zA-Z][a-zA-Z\s]{2,40})/gi;
  for (const match of text.matchAll(simplePattern)) {
    const quantity = parseWordQuantity(match[1]) ?? 1;
    const foodName = match[2].trim();
    recordItem(foodName, quantity, 'serving');
  }

  if (items.length === 0) return null;

  const totalCalories = items.reduce((sum, item) => sum + (item.calories ?? 0), 0);
  const sumOptional = (key: keyof FoodItem) => {
    let total = 0;
    let has = false;
    for (const item of items) {
      const value = item[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        total += value;
        has = true;
      }
    }
    return has ? total : undefined;
  };
  const macros = {
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
  };

  return { type: mealType, items, totalCalories, macros };
}
