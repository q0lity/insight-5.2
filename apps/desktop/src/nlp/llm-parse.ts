import { callOpenAiText } from '../openai'
import { buildPatternContext, formatPatternHints, type PatternContext } from '../learning/context'

export type LlmParsedTask = {
  title: string
  status?: 'todo' | 'in_progress' | 'done'
  tags?: string[]
  notes?: string
  estimateMinutes?: number | null
  dueAtIso?: string | null
  scheduledAtIso?: string | null
  location?: string | null
  people?: string[]
  costUsd?: number | null
  goal?: string | null
  project?: string | null
  importance?: number | null
  difficulty?: number | null
}

export type LlmParsedEvent = {
  title: string
  startAtIso: string
  endAtIso: string
  allDay?: boolean
  kind?: 'event' | 'task' | 'log' | 'episode'
  tags?: string[]
  notes?: string
  icon?: string | null
  color?: string | null
  estimateMinutes?: number | null
  location?: string | null
  people?: string[]
  skills?: string[]
  character?: string[]
  trackerKey?: string | null
  active?: boolean
  importance?: number | null
  difficulty?: number | null
  costUsd?: number | null
  goal?: string | null
  project?: string | null
}

export type LlmParseResult = {
  tasks: LlmParsedTask[]
  events: LlmParsedEvent[]
}

// Workout parsing types
export type LlmParsedExerciseSet = {
  reps?: number
  weight?: number
  weightUnit?: 'lbs' | 'kg'
  duration?: number
  distance?: number
  distanceUnit?: 'mi' | 'km' | 'm'
  rpe?: number
  restSeconds?: number
}

export type LlmParsedExercise = {
  name: string
  type?: 'strength' | 'cardio' | 'mobility' | 'recovery'
  sets: LlmParsedExerciseSet[]
  muscleGroups?: string[]
  notes?: string
}

export type LlmParsedWorkout = {
  type: 'strength' | 'cardio' | 'mobility' | 'recovery' | 'mixed'
  title?: string
  exercises: LlmParsedExercise[]
  totalDuration?: number
  estimatedCalories?: number
  overallRpe?: number
  notes?: string
  // Smart context for set additions
  isSetAddition?: boolean      // True if this is adding to a previous exercise
  targetExerciseName?: string  // Exercise to add set to (if known)
}

// Extended macros with full micronutrients
export type LlmParsedExtendedMacros = {
  protein: number       // grams
  carbs: number         // grams
  fat: number           // grams
  fiber?: number        // grams
  saturatedFat?: number // grams
  transFat?: number     // grams
  sugar?: number        // grams
  sodium?: number       // milligrams
  potassium?: number    // milligrams
  cholesterol?: number  // milligrams
}

// Nutrition parsing types
export type LlmParsedFoodItem = {
  name: string
  quantity: number
  unit: string
  calories?: number
  // Macronutrients (grams)
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  // Extended micronutrients
  saturatedFat?: number // grams
  transFat?: number     // grams
  sugar?: number        // grams
  sodium?: number       // milligrams
  potassium?: number    // milligrams
  cholesterol?: number  // milligrams
  // Metadata
  brand?: string
  confidence?: number   // 0-1, how confident the AI estimate is
}

export type LlmParsedMeal = {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink'
  title?: string
  items: LlmParsedFoodItem[]
  totalCalories?: number
  macros?: LlmParsedExtendedMacros
  location?: string
  notes?: string
}

// Block-based parsing types
export type LlmParsedBlock = {
  blockIndex: number
  rawText: string
  summary?: string
  tasks: LlmParsedTask[]
  events: LlmParsedEvent[]
  workout?: LlmParsedWorkout
  meal?: LlmParsedMeal
  trackers: Array<{ key: string; value: number }>
  people: string[]
  tags: string[]
  contexts: string[]
  locations: string[]
}

export type LlmBlockParseResult = {
  blocks: LlmParsedBlock[]
  tasks: LlmParsedTask[]
  events: LlmParsedEvent[]
  workouts: LlmParsedWorkout[]
  meals: LlmParsedMeal[]
}

function cleanTitle(raw: string) {
  return raw.replace(/\s+/g, ' ').trim()
}

function isGarbageTitle(title: string) {
  const t = cleanTitle(title)
  if (t.length < 2) return true
  if (t.length > 140) return true
  if (/\n|\r/.test(t)) return true
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length > 16) return true
  if (/^(ok|okay|um|uh)\b/i.test(t) && words.length <= 2) return true
  if (/\b(i'm|im|gonna|need to|have to)\b/i.test(t) && words.length > 6) return true
  return false
}

function extractJsonObject(raw: string) {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return raw.slice(start, end + 1)
}

function stripCodeFences(raw: string) {
  return raw.replace(/```(?:json)?/gi, '').trim()
}

function safeJsonParse(raw: string): any | null {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function parseCaptureWithLlm(opts: {
  apiKey: string
  text: string
  anchorMs: number
  model?: string
  patternContext?: PatternContext | null
}): Promise<LlmParseResult> {
  const anchor = new Date(opts.anchorMs)
  const model = opts.model ?? 'gpt-4.1-mini'
  const supportsResponseFormat = !/^gpt-5/i.test(model) && !/^o[1-9]/i.test(model)

  // Build pattern hints from learned user behavior
  let patternHints = ''
  if (opts.patternContext) {
    patternHints = formatPatternHints(opts.patternContext)
  } else {
    // Auto-build context if not provided
    try {
      const ctx = await buildPatternContext(opts.text)
      patternHints = formatPatternHints(ctx)
      if (patternHints) {
        console.log('[LlmParse] Injecting learned patterns into prompt:', {
          categories: ctx.suggestedCategories.length,
          skills: ctx.suggestedSkills.length,
          goals: ctx.suggestedGoals.length,
          personContexts: ctx.personContexts.length,
          locationFills: ctx.locationFills.length,
        })
      }
    } catch (err) {
      console.warn('[LlmParse] Failed to build pattern context:', err)
    }
  }

  const system = [
    'You are a private, local-first journaling/calendar parser.',
    'Return ONLY valid JSON, no markdown.',
    'Goal: extract a compact structured plan (tasks + events + logs + episodes) from the user text, including key metadata fields.',
    '',
    '## Title Rules (CRITICAL):',
    '- Titles must be SPECIFIC and DESCRIPTIVE about WHAT is being done.',
    '- Include the object/target of the action in the title.',
    '- Good titles: "Costco Shopping", "Claude Code Job Application", "Pay Rent", "House Cleaning", "Gym Workout"',
    '- Bad titles: "Errands", "Work", "Personal", "Task", "Thing to do"',
    '- For stores/places, include the store name: "go to Costco" → title: "Costco Shopping" or "Costco Grocery Run"',
    '- For applications, include what: "job application for Claude Code" → title: "Claude Code Application"',
    '- The title answers "What specifically am I doing?" not "What category is this?"',
    '',
    '## People Extraction Rules (STRICT):',
    '- ONLY extract actual human names that are EXPLICITLY mentioned.',
    '- Valid: "Mom", "Dad", "Dr. Torres", "John Smith", "Alex", relations like "my sister"',
    '- NEVER extract: transcription artifacts, partial sentences, product/company names',
    '- NEVER include names with periods (e.g., "Cloud Code.", "That\'s") - these are transcription errors',
    '- NEVER extract: "staff", "patient", "doctor", "nurse", "the", "that", "this", "work", "home"',
    '- If you see something like "Cloud Code. That\'s" - this is NOT a person, ignore it completely',
    '- When in doubt, leave people array EMPTY rather than hallucinate',
    '',
    '## Location Extraction:',
    '- Extract location when a place is explicitly mentioned: "at Costco" → location: "Costco"',
    '- For errands at stores, set location to the store name',
    '',
    '## Importance & Difficulty (ALWAYS ESTIMATE):',
    '- Always include importance (1-10) based on urgency and life impact',
    '- Always include difficulty (1-10) based on effort, time, and cognitive load',
    '- If uncertain, use 5 as default but try to infer from context',
    '- Examples:',
    '  * "pay rent" → importance: 9 (critical deadline), difficulty: 2 (easy task)',
    '  * "workout" → importance: 7 (health goal), difficulty: 6 (physical effort)',
    '  * "job application" → importance: 8 (career), difficulty: 5 (moderate effort)',
    '  * "go to Costco" → importance: 5 (routine errand), difficulty: 3 (easy but time)',
    '  * "clean house" → importance: 4 (maintenance), difficulty: 4 (moderate effort)',
    '',
    '## Time & Event Rules:',
    '- Use ISO timestamps (local time) for all times.',
    '- Always include endAtIso; if unknown, infer a reasonable duration (default 30m for events, 5m for logs).',
    '- If the user speaks in past tense ("I went", "I ate", "I did"), mark tasks as done and schedule events in the past (same day unless clearly different).',
    '- If the user is planning the future (tomorrow/next week) and there is NO explicit time, prefer creating TASKS (not events).',
    '- Create EVENTS only when there is an explicit time/range, or the user clearly started/stopped something (start/stop workout/sleep).',
    '',
    '## Tags:',
    '- Use tags like "#food", "#workout", "#sleep", "#mood", "#pain", "#period" when relevant.',
    '- Also tag common intents: "#work", "#clinic", "#call", "#finance", "#errand", "#shopping" when obvious.',
    '',
    '## Other Rules:',
    '- If the user indicates spending/budget (e.g., "$40", "spend 40 dollars"), set costUsd and add a tag like "#money" or "#shopping".',
    '- If the user lists items to buy (comma-separated after "buy/get/pick up"), put them in notes as a short checklist (e.g., "- [ ] apples").',
    '- For meals: add one log event titled "nutrition: <kcal> kcal P<g> C<g> F<g>" if you can estimate; otherwise omit nutrition log.',
    '- Keep results small and high-signal: <= 10 tasks, <= 12 events. Prefer grouping contiguous blocks into a single event with segment notes.',
    '- If the text contains any explicit time ranges, you MUST return at least one event per time range (or a consolidated block). Do not return empty arrays.',
    '- For tracker logs (mood, pain, energy, stress, sleep, workout, hydration/water), create log events with trackerKey set to the tracker name and startAtIso near when mentioned.',
    '- Notes must be a left-justified markdown outline. Use short bullets, include actionable items as checkboxes (e.g., "- [ ] apples"). Keep notes compact (max ~12 lines per event).',
    '- For timed blocks, include time-stamped outline bullets like: "- **HH:MM** - note" so the timeline can show segments.',
    '- If a task has a date (e.g., tomorrow) but no time, set scheduledAtIso to 09:00 local on that date and set estimateMinutes.',
    '- When relevant, include character traits as an array from: ["STR","INT","CON","PER"].',
    '',
    // Inject learned patterns if available
    patternHints ? '## User\'s Learned Patterns (IMPORTANT - Apply these when relevant):' : '',
    patternHints || '',
    patternHints ? '' : '',
    'JSON schema:',
    '{ "tasks": LlmParsedTask[], "events": LlmParsedEvent[] }',
  ].filter(Boolean).join('\n')

  const user = [
    `Anchor (local): ${anchor.toString()}`,
    'Text:',
    opts.text,
  ].join('\n\n')

  const content = await callOpenAiText({
    apiKey: opts.apiKey,
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.1,
    maxOutputTokens: 2000,
    responseFormat: supportsResponseFormat ? { type: 'json_object' } : null,
  })

  const cleanedContent = stripCodeFences(content)
  const jsonRaw = extractJsonObject(cleanedContent) ?? cleanedContent
  let parsed = safeJsonParse(jsonRaw)
  if (!parsed || typeof parsed !== 'object') {
    const repairSystem = [
      'You fix invalid JSON and return ONLY valid JSON.',
      'Return a JSON object with schema: { "tasks": LlmParsedTask[], "events": LlmParsedEvent[] }',
      'If the JSON is incomplete, re-derive from the original text.',
      'Omit unknown fields; keep output compact (<=10 tasks, <=12 events).',
    ].join('\n')
    const repairUser = [
      `Anchor (local): ${anchor.toString()}`,
      'Original text:',
      opts.text,
      'Broken JSON:',
      cleanedContent.slice(0, 4000),
    ].join('\n\n')
    const repaired = await callOpenAiText({
      apiKey: opts.apiKey,
      model,
      messages: [
        { role: 'system', content: repairSystem },
        { role: 'user', content: repairUser },
      ],
      temperature: 0,
      maxOutputTokens: 1600,
      responseFormat: supportsResponseFormat ? { type: 'json_object' } : null,
    })
    const cleanedRepair = stripCodeFences(repaired)
    const repairRaw = extractJsonObject(cleanedRepair) ?? cleanedRepair
    parsed = safeJsonParse(repairRaw)
    if (!parsed || typeof parsed !== 'object') {
      const snippet = cleanedContent.replace(/\s+/g, ' ').trim().slice(0, 200)
      throw new Error(`LLM parse failed: invalid JSON. ${snippet ? `Snippet: ${snippet}` : ''}`)
    }
  }

  const tasks = Array.isArray((parsed as any).tasks) ? (parsed as any).tasks : []
  const events = Array.isArray((parsed as any).events) ? (parsed as any).events : []

  // Validate people names to filter out hallucinated/garbage entries
  function validatePeople(people: string[] | undefined): string[] | undefined {
    if (!people || !Array.isArray(people)) return undefined
    const filtered = people.filter(p => {
      if (typeof p !== 'string') return false
      const name = p.trim()
      // Reject empty or very short names
      if (name.length < 2) return false
      // Reject names with periods (transcription artifacts like "Cloud Code.")
      if (name.includes('.')) return false
      // Reject common transcription artifacts
      const artifacts = ['that', "that's", 'this', 'the', 'code', 'cloud', 'okay', 'um', 'uh', 'like', 'you know', 'gonna', 'wanna']
      if (artifacts.some(a => name.toLowerCase() === a || name.toLowerCase().startsWith(a + ' '))) return false
      // Reject names that are clearly not people (roles, places, common nouns)
      const nonPeople = ['staff', 'patient', 'doctor', 'nurse', 'work', 'home', 'clinic', 'hospital', 'office', 'store', 'gym', 'bank']
      if (nonPeople.includes(name.toLowerCase())) return false
      // Reject names that look like partial sentences or fragments
      if (name.split(/\s+/).length > 4) return false
      // Reject names with multiple consecutive spaces or weird characters
      if (/\s{2,}|[^\w\s'-]/.test(name)) return false
      return true
    })
    return filtered.length > 0 ? filtered : undefined
  }

  function normTask(t: any): LlmParsedTask | null {
    if (!t || typeof t.title !== 'string') return null
    const title = cleanTitle(t.title)
    if (isGarbageTitle(title)) return null
    return {
      title,
      status: t.status,
      tags: Array.isArray(t.tags) ? t.tags : undefined,
      notes: typeof t.notes === 'string' ? t.notes : undefined,
      estimateMinutes: typeof t.estimateMinutes === 'number' ? t.estimateMinutes : null,
      dueAtIso: typeof t.dueAtIso === 'string' ? t.dueAtIso : null,
      scheduledAtIso: typeof t.scheduledAtIso === 'string' ? t.scheduledAtIso : null,
      location: typeof t.location === 'string' ? t.location : null,
      people: validatePeople(t.people),
      costUsd: typeof t.costUsd === 'number' ? t.costUsd : null,
      goal: typeof t.goal === 'string' ? t.goal : null,
      project: typeof t.project === 'string' ? t.project : null,
      importance: typeof t.importance === 'number' ? t.importance : null,
      difficulty: typeof t.difficulty === 'number' ? t.difficulty : null,
    }
  }

  function normEvent(e: any): LlmParsedEvent | null {
    if (!e || typeof e.title !== 'string') return null
    if (typeof e.startAtIso !== 'string' || typeof e.endAtIso !== 'string') return null
    const title = cleanTitle(e.title)
    if (isGarbageTitle(title)) return null
    return {
      title,
      startAtIso: e.startAtIso,
      endAtIso: e.endAtIso,
      allDay: Boolean(e.allDay),
      kind: e.kind,
      tags: Array.isArray(e.tags) ? e.tags : undefined,
      notes: typeof e.notes === 'string' ? e.notes : undefined,
      icon: typeof e.icon === 'string' ? e.icon : null,
      color: typeof e.color === 'string' ? e.color : null,
      estimateMinutes: typeof e.estimateMinutes === 'number' ? e.estimateMinutes : null,
      location: typeof e.location === 'string' ? e.location : null,
      people: validatePeople(e.people),
      skills: Array.isArray(e.skills) ? e.skills : undefined,
      character: Array.isArray(e.character) ? e.character : undefined,
      trackerKey: typeof e.trackerKey === 'string' ? e.trackerKey : null,
      active: typeof e.active === 'boolean' ? e.active : undefined,
      importance: typeof e.importance === 'number' ? e.importance : null,
      difficulty: typeof e.difficulty === 'number' ? e.difficulty : null,
      costUsd: typeof e.costUsd === 'number' ? e.costUsd : null,
      goal: typeof e.goal === 'string' ? e.goal : null,
      project: typeof e.project === 'string' ? e.project : null,
    }
  }

  const normTasks = tasks.map(normTask).filter(Boolean).slice(0, 10) as LlmParsedTask[]
  const normEvents = events.map(normEvent).filter(Boolean).slice(0, 12) as LlmParsedEvent[]
  if (normTasks.length === 0 && normEvents.length === 0) {
    const snippet = jsonRaw.replace(/\s+/g, ' ').trim().slice(0, 200)
    throw new Error(`LLM parse empty. ${snippet ? `Snippet: ${snippet}` : ''}`)
  }
  return { tasks: normTasks, events: normEvents }
}

/**
 * Split text on horizontal dividers (---, ***, ___) into separate blocks.
 */
function splitOnDividers(text: string): string[] {
  const dividerPattern = /^[\t ]*(?:[-]{3,}|[*]{3,}|[_]{3,})[\t ]*$/gm
  const parts = text.split(dividerPattern)
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

/**
 * Parse capture text with multi-block and workout/nutrition awareness.
 * Splits on --- dividers and parses each block independently for:
 * - Tasks and events
 * - Workout data (exercises, sets, reps, weight)
 * - Nutrition data (meals, food items, macros)
 * - Entity extraction (people, tags, contexts, locations, trackers)
 */
export async function parseCaptureWithBlocksLlm(opts: {
  apiKey: string
  text: string
  anchorMs: number
  model?: string
  patternContext?: PatternContext | null
}): Promise<LlmBlockParseResult> {
  const anchor = new Date(opts.anchorMs)
  const model = opts.model ?? 'gpt-4.1-mini'
  const supportsResponseFormat = !/^gpt-5/i.test(model) && !/^o[1-9]/i.test(model)

  // Split into blocks first
  const rawBlocks = splitOnDividers(opts.text)
  const hasMultipleBlocks = rawBlocks.length > 1

  // Build pattern hints from learned user behavior
  let patternHints = ''
  if (opts.patternContext) {
    patternHints = formatPatternHints(opts.patternContext)
  } else {
    // Auto-build context if not provided
    try {
      const ctx = await buildPatternContext(opts.text)
      patternHints = formatPatternHints(ctx)
      if (patternHints) {
        console.log('[LlmParse/Blocks] Injecting learned patterns into prompt:', {
          categories: ctx.suggestedCategories.length,
          skills: ctx.suggestedSkills.length,
          goals: ctx.suggestedGoals.length,
          personContexts: ctx.personContexts.length,
          locationFills: ctx.locationFills.length,
        })
      }
    } catch (err) {
      console.warn('[LlmParse] Failed to build pattern context for blocks:', err)
    }
  }

  const system = [
    'You are a private, local-first journaling/calendar parser with workout and nutrition awareness.',
    'Return ONLY valid JSON, no markdown.',
    '',
    hasMultipleBlocks ? 'The text is divided into BLOCKS separated by "---". Parse each block independently.' : '',
    '',
    '## Token Syntax',
    '- Tags: #tag (e.g., #work, #gym)',
    '- People: @person or @"Full Name" (e.g., @mom, @"Dr. Smith")',
    '- Contexts: *context (e.g., *focus, *home)',
    '- Locations: !location or !"Full Location" (e.g., !gym, !"123 Main St")',
    '- Trackers: #tracker(value) or #tracker:value (e.g., #mood(7), #pain:5)',
    '',
    '## Workout Parsing (ENHANCED)',
    'Detect workout descriptions and extract structured data with PRECISE set parsing:',
    '',
    '### Set Pattern Recognition:',
    '- "3x15 at 135" → 3 sets of 15 reps each at 135 weight',
    '- "3 sets of 10 bench at 225" → 3 sets, 10 reps, 225 weight, exercise: "Bench Press"',
    '- "did 4x8 squats 185" → 4 sets, 8 reps, 185 weight, exercise: "Squats"',
    '- "bench 225 for 3x10" → 3 sets, 10 reps, 225 weight',
    '- "100 push-ups" → 1 set, 100 reps, bodyweight exercise',
    '- "30 min treadmill" → cardio, 30 min duration',
    '- "ran 3 miles in 24 minutes" → cardio, 3 miles, 24 min duration',
    '',
    '### Smart Context for Additional Sets:',
    '- If user says "I did this set at 140" or "another set at 140" without specifying exercise:',
    '  - Set isSetAddition: true',
    '  - This is an ADDITION to the most recent exercise',
    '  - Create a single set with weight=140',
    '  - Infer reps from previous set if not specified',
    '- "added a set" or "one more set" → isSetAddition: true',
    '- If user names the exercise like "another bench set at 140" → targetExerciseName: "Bench Press"',
    '',
    '### RPE Detection:',
    '- "RPE 8" or "rpe was 8" → rpe: 8',
    '- "really hard" or "brutal" → rpe: 9',
    '- "moderate" or "medium effort" → rpe: 6',
    '- "easy" or "light" → rpe: 4',
    '',
    '### Muscle Group Inference:',
    '- Bench Press → chest, triceps, shoulders',
    '- Squats → quads, glutes, hamstrings',
    '- Deadlift → back, glutes, hamstrings',
    '- Pull-ups → back, biceps',
    '- Push-ups → chest, triceps, shoulders',
    '',
    '## Nutrition Parsing (COMPREHENSIVE)',
    'Detect meal/food descriptions and extract structured data with FULL micronutrients:',
    '',
    '### Required Fields:',
    '- Meal type: breakfast, lunch, dinner, snack, drink',
    '- Food items with quantities and units',
    '',
    '### Estimate ALL Micronutrients (when possible):',
    '- calories: total kcal',
    '- protein: grams (P)',
    '- carbs: total carbohydrates in grams (C)',
    '- fat: total fat in grams (F)',
    '- fiber: dietary fiber in grams',
    '- saturatedFat: saturated fat in grams',
    '- transFat: trans fat in grams (usually 0)',
    '- sugar: total sugars in grams',
    '- sodium: milligrams (mg)',
    '- potassium: milligrams (mg)',
    '- cholesterol: milligrams (mg)',
    '',
    '### Common Foods Reference (per standard serving):',
    '- Egg: 70cal, 6P, 0C, 5F, 186mg cholesterol, 70mg sodium',
    '- Chicken Breast (4oz): 140cal, 31P, 0C, 3F, 85mg cholesterol, 60mg sodium',
    '- White Rice (1 cup): 205cal, 4P, 45C, 0.4F, 400mg potassium',
    '- Banana: 105cal, 1P, 27C, 0.4F, 422mg potassium, 1mg sodium',
    '- Avocado: 320cal, 4P, 17C, 29F, 15g fiber, 975mg potassium',
    '- Pizza slice: 285cal, 12P, 36C, 10F, 5g saturated fat, 640mg sodium',
    '- Chipotle bowl: 700cal, 40P, 50C, 35F, 8g sat fat, 1200mg sodium',
    '',
    '### Confidence Guidelines:',
    '- 0.9+: Well-known packaged food or restaurant with published nutrition',
    '- 0.7-0.9: Common food with typical preparation',
    '- 0.5-0.7: Custom/varied preparation, estimated from components',
    '- <0.5: Very uncertain, highly variable',
    '',
    '## General Rules',
    '- Use ISO timestamps (local time) for all times.',
    '- If past tense, mark tasks done and events in the past.',
    '- Extract people only when explicit (@mentions, "with Name").',
    '- Include importance (1-10) and difficulty (1-10) for events/tasks.',
    '- Keep output compact: <=10 tasks, <=12 events per block.',
    '',
    // Inject learned patterns if available
    patternHints ? '## User\'s Learned Patterns (IMPORTANT - Apply these when relevant):' : '',
    patternHints || '',
    patternHints ? '' : '',
    '## JSON Schema',
    hasMultipleBlocks
      ? '{ "blocks": LlmParsedBlock[] } where each block has: { blockIndex, rawText, summary, tasks, events, workout?, meal?, trackers, people, tags, contexts, locations }'
      : '{ "tasks": LlmParsedTask[], "events": LlmParsedEvent[], "workout"?: LlmParsedWorkout, "meal"?: LlmParsedMeal, "trackers": [{key, value}], "people": string[], "tags": string[], "contexts": string[], "locations": string[] }',
  ].filter(Boolean).join('\n')

  const user = [
    `Anchor (local): ${anchor.toString()}`,
    '',
    'Text:',
    opts.text,
  ].join('\n')

  const content = await callOpenAiText({
    apiKey: opts.apiKey,
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.1,
    maxOutputTokens: 3000,
    responseFormat: supportsResponseFormat ? { type: 'json_object' } : null,
  })

  const cleanedContent = stripCodeFences(content)
  const jsonRaw = extractJsonObject(cleanedContent) ?? cleanedContent
  let parsed = safeJsonParse(jsonRaw)

  if (!parsed || typeof parsed !== 'object') {
    // Fallback to simple parse
    const simple = await parseCaptureWithLlm(opts)
    return {
      blocks: [{
        blockIndex: 0,
        rawText: opts.text,
        tasks: simple.tasks,
        events: simple.events,
        trackers: [],
        people: [],
        tags: [],
        contexts: [],
        locations: [],
      }],
      tasks: simple.tasks,
      events: simple.events,
      workouts: [],
      meals: [],
    }
  }

  // Normalize the response
  const blocks: LlmParsedBlock[] = []
  const allTasks: LlmParsedTask[] = []
  const allEvents: LlmParsedEvent[] = []
  const allWorkouts: LlmParsedWorkout[] = []
  const allMeals: LlmParsedMeal[] = []

  // Validate people names to filter out hallucinated/garbage entries
  function validatePeople(people: string[] | undefined): string[] | undefined {
    if (!people || !Array.isArray(people)) return undefined
    const filtered = people.filter(p => {
      if (typeof p !== 'string') return false
      const name = p.trim()
      // Reject empty or very short names
      if (name.length < 2) return false
      // Reject names with periods (transcription artifacts like "Cloud Code.")
      if (name.includes('.')) return false
      // Reject common transcription artifacts
      const artifacts = ['that', "that's", 'this', 'the', 'code', 'cloud', 'okay', 'um', 'uh', 'like', 'you know', 'gonna', 'wanna']
      if (artifacts.some(a => name.toLowerCase() === a || name.toLowerCase().startsWith(a + ' '))) return false
      // Reject names that are clearly not people (roles, places, common nouns)
      const nonPeople = ['staff', 'patient', 'doctor', 'nurse', 'work', 'home', 'clinic', 'hospital', 'office', 'store', 'gym', 'bank']
      if (nonPeople.includes(name.toLowerCase())) return false
      // Reject names that look like partial sentences or fragments
      if (name.split(/\s+/).length > 4) return false
      // Reject names with multiple consecutive spaces or weird characters
      if (/\s{2,}|[^\w\s'-]/.test(name)) return false
      return true
    })
    return filtered.length > 0 ? filtered : undefined
  }

  function normalizeWorkout(w: any): LlmParsedWorkout | null {
    if (!w || typeof w !== 'object') return null
    // Allow set additions even without exercises array
    const isSetAddition = Boolean(w.isSetAddition)
    if (!isSetAddition && (!Array.isArray(w.exercises) || w.exercises.length === 0)) return null
    return {
      type: w.type ?? 'mixed',
      title: typeof w.title === 'string' ? w.title : undefined,
      exercises: Array.isArray(w.exercises) ? w.exercises.map((ex: any) => ({
        name: ex.name ?? 'Unknown',
        type: ex.type,
        sets: Array.isArray(ex.sets) ? ex.sets.map((s: any) => ({
          reps: typeof s.reps === 'number' ? s.reps : undefined,
          weight: typeof s.weight === 'number' ? s.weight : undefined,
          weightUnit: s.weightUnit === 'kg' ? 'kg' : 'lbs',
          duration: typeof s.duration === 'number' ? s.duration : undefined,
          distance: typeof s.distance === 'number' ? s.distance : undefined,
          distanceUnit: s.distanceUnit,
          rpe: typeof s.rpe === 'number' ? s.rpe : undefined,
          restSeconds: typeof s.restSeconds === 'number' ? s.restSeconds : undefined,
        })) : [],
        muscleGroups: Array.isArray(ex.muscleGroups) ? ex.muscleGroups : undefined,
        notes: typeof ex.notes === 'string' ? ex.notes : undefined,
      })) : [],
      totalDuration: typeof w.totalDuration === 'number' ? w.totalDuration : undefined,
      estimatedCalories: typeof w.estimatedCalories === 'number' ? w.estimatedCalories : undefined,
      overallRpe: typeof w.overallRpe === 'number' ? w.overallRpe : undefined,
      notes: typeof w.notes === 'string' ? w.notes : undefined,
      // Smart context for set additions
      isSetAddition,
      targetExerciseName: typeof w.targetExerciseName === 'string' ? w.targetExerciseName : undefined,
    }
  }

  function normalizeMeal(m: any): LlmParsedMeal | null {
    if (!m || typeof m !== 'object') return null
    if (!Array.isArray(m.items) || m.items.length === 0) return null
    return {
      type: m.type ?? 'snack',
      title: typeof m.title === 'string' ? m.title : undefined,
      items: m.items.map((item: any) => ({
        name: item.name ?? 'Unknown',
        quantity: typeof item.quantity === 'number' ? item.quantity : 1,
        unit: typeof item.unit === 'string' ? item.unit : 'serving',
        calories: typeof item.calories === 'number' ? item.calories : undefined,
        // Macronutrients
        protein: typeof item.protein === 'number' ? item.protein : undefined,
        carbs: typeof item.carbs === 'number' ? item.carbs : undefined,
        fat: typeof item.fat === 'number' ? item.fat : undefined,
        fiber: typeof item.fiber === 'number' ? item.fiber : undefined,
        // Extended micronutrients
        saturatedFat: typeof item.saturatedFat === 'number' ? item.saturatedFat : undefined,
        transFat: typeof item.transFat === 'number' ? item.transFat : undefined,
        sugar: typeof item.sugar === 'number' ? item.sugar : undefined,
        sodium: typeof item.sodium === 'number' ? item.sodium : undefined,
        potassium: typeof item.potassium === 'number' ? item.potassium : undefined,
        cholesterol: typeof item.cholesterol === 'number' ? item.cholesterol : undefined,
        // Metadata
        brand: typeof item.brand === 'string' ? item.brand : undefined,
        confidence: typeof item.confidence === 'number' ? item.confidence : undefined,
      })),
      totalCalories: typeof m.totalCalories === 'number' ? m.totalCalories : undefined,
      macros: m.macros && typeof m.macros === 'object' ? {
        protein: m.macros.protein ?? 0,
        carbs: m.macros.carbs ?? 0,
        fat: m.macros.fat ?? 0,
        fiber: typeof m.macros.fiber === 'number' ? m.macros.fiber : undefined,
        saturatedFat: typeof m.macros.saturatedFat === 'number' ? m.macros.saturatedFat : undefined,
        transFat: typeof m.macros.transFat === 'number' ? m.macros.transFat : undefined,
        sugar: typeof m.macros.sugar === 'number' ? m.macros.sugar : undefined,
        sodium: typeof m.macros.sodium === 'number' ? m.macros.sodium : undefined,
        potassium: typeof m.macros.potassium === 'number' ? m.macros.potassium : undefined,
        cholesterol: typeof m.macros.cholesterol === 'number' ? m.macros.cholesterol : undefined,
      } : undefined,
      location: typeof m.location === 'string' ? m.location : undefined,
      notes: typeof m.notes === 'string' ? m.notes : undefined,
    }
  }

  function normalizeBlock(b: any, index: number): LlmParsedBlock {
    const tasks = Array.isArray(b.tasks)
      ? b.tasks.map((t: any) => normTask(t)).filter(Boolean)
      : []
    const events = Array.isArray(b.events)
      ? b.events.map((e: any) => normEvent(e)).filter(Boolean)
      : []
    const workout = normalizeWorkout(b.workout)
    const meal = normalizeMeal(b.meal)

    if (workout) allWorkouts.push(workout)
    if (meal) allMeals.push(meal)

    return {
      blockIndex: index,
      rawText: typeof b.rawText === 'string' ? b.rawText : rawBlocks[index] ?? '',
      summary: typeof b.summary === 'string' ? b.summary : undefined,
      tasks,
      events,
      workout: workout ?? undefined,
      meal: meal ?? undefined,
      trackers: Array.isArray(b.trackers) ? b.trackers.filter((t: any) => t.key && typeof t.value === 'number') : [],
      people: Array.isArray(b.people) ? b.people.filter((p: any) => typeof p === 'string') : [],
      tags: Array.isArray(b.tags) ? b.tags.filter((t: any) => typeof t === 'string') : [],
      contexts: Array.isArray(b.contexts) ? b.contexts.filter((c: any) => typeof c === 'string') : [],
      locations: Array.isArray(b.locations) ? b.locations.filter((l: any) => typeof l === 'string') : [],
    }
  }

  function normTask(t: any): LlmParsedTask | null {
    if (!t || typeof t.title !== 'string') return null
    const title = cleanTitle(t.title)
    if (isGarbageTitle(title)) return null
    return {
      title,
      status: t.status,
      tags: Array.isArray(t.tags) ? t.tags : undefined,
      notes: typeof t.notes === 'string' ? t.notes : undefined,
      estimateMinutes: typeof t.estimateMinutes === 'number' ? t.estimateMinutes : null,
      dueAtIso: typeof t.dueAtIso === 'string' ? t.dueAtIso : null,
      scheduledAtIso: typeof t.scheduledAtIso === 'string' ? t.scheduledAtIso : null,
      location: typeof t.location === 'string' ? t.location : null,
      people: validatePeople(t.people),
      costUsd: typeof t.costUsd === 'number' ? t.costUsd : null,
      goal: typeof t.goal === 'string' ? t.goal : null,
      project: typeof t.project === 'string' ? t.project : null,
      importance: typeof t.importance === 'number' ? t.importance : null,
      difficulty: typeof t.difficulty === 'number' ? t.difficulty : null,
    }
  }

  function normEvent(e: any): LlmParsedEvent | null {
    if (!e || typeof e.title !== 'string') return null
    if (typeof e.startAtIso !== 'string' || typeof e.endAtIso !== 'string') return null
    const title = cleanTitle(e.title)
    if (isGarbageTitle(title)) return null
    return {
      title,
      startAtIso: e.startAtIso,
      endAtIso: e.endAtIso,
      allDay: Boolean(e.allDay),
      kind: e.kind,
      tags: Array.isArray(e.tags) ? e.tags : undefined,
      notes: typeof e.notes === 'string' ? e.notes : undefined,
      icon: typeof e.icon === 'string' ? e.icon : null,
      color: typeof e.color === 'string' ? e.color : null,
      estimateMinutes: typeof e.estimateMinutes === 'number' ? e.estimateMinutes : null,
      location: typeof e.location === 'string' ? e.location : null,
      people: validatePeople(e.people),
      skills: Array.isArray(e.skills) ? e.skills : undefined,
      character: Array.isArray(e.character) ? e.character : undefined,
      trackerKey: typeof e.trackerKey === 'string' ? e.trackerKey : null,
      active: typeof e.active === 'boolean' ? e.active : undefined,
      importance: typeof e.importance === 'number' ? e.importance : null,
      difficulty: typeof e.difficulty === 'number' ? e.difficulty : null,
      costUsd: typeof e.costUsd === 'number' ? e.costUsd : null,
      goal: typeof e.goal === 'string' ? e.goal : null,
      project: typeof e.project === 'string' ? e.project : null,
    }
  }

  if (Array.isArray((parsed as any).blocks)) {
    // Multi-block response
    for (let i = 0; i < (parsed as any).blocks.length; i++) {
      const block = normalizeBlock((parsed as any).blocks[i], i)
      blocks.push(block)
      allTasks.push(...block.tasks)
      allEvents.push(...block.events)
    }
  } else {
    // Single block response
    const block = normalizeBlock(parsed, 0)
    blocks.push(block)
    allTasks.push(...block.tasks)
    allEvents.push(...block.events)
  }

  return {
    blocks,
    tasks: allTasks.slice(0, 32),
    events: allEvents.slice(0, 64),
    workouts: allWorkouts,
    meals: allMeals,
  }
}
