import { callOpenAiText } from '../openai'

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
}

// Nutrition parsing types
export type LlmParsedFoodItem = {
  name: string
  quantity: number
  unit: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  brand?: string
}

export type LlmParsedMeal = {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink'
  title?: string
  items: LlmParsedFoodItem[]
  totalCalories?: number
  macros?: { protein: number; carbs: number; fat: number }
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

export async function parseCaptureWithLlm(opts: { apiKey: string; text: string; anchorMs: number; model?: string }): Promise<LlmParseResult> {
  const anchor = new Date(opts.anchorMs)
  const model = opts.model ?? 'gpt-4.1-mini'
  const supportsResponseFormat = !/^gpt-5/i.test(model) && !/^o[1-9]/i.test(model)
  const system = [
    'You are a private, local-first journaling/calendar parser.',
    'Return ONLY valid JSON, no markdown.',
    'Goal: extract a compact structured plan (tasks + events + logs + episodes) from the user text, including key metadata fields.',
    'Rules:',
    '- Use ISO timestamps (local time) for all times.',
    '- Always include endAtIso; if unknown, infer a reasonable duration (default 30m for events, 5m for logs).',
    '- If the user speaks in past tense ("I went", "I ate", "I did"), mark tasks as done and schedule events in the past (same day unless clearly different).',
    '- If the user is planning the future (tomorrow/next week) and there is NO explicit time, prefer creating TASKS (not events).',
    '- Create EVENTS only when there is an explicit time/range, or the user clearly started/stopped something (start/stop workout/sleep).',
    '- Use tags like "#food", "#workout", "#sleep", "#mood", "#pain", "#period" when relevant.',
    '- Also tag common intents: "#work", "#clinic", "#call", "#finance" when obvious.',
    '- Extract people/places ONLY when explicitly present as: @mentions, "with <Name>", or "at/in/to <Place>". If unsure, leave empty.',
    '- People must be real names or relations (e.g., "Mom", "Dr. Torres"). Never extract roles/common nouns (patient, nursing, staff, clinic).',
    '- If the user indicates spending/budget (e.g., "$40", "spend 40 dollars"), set costUsd and add a tag like "#money" or "#shopping".',
    '- If the user lists items to buy (comma-separated after "buy/get/pick up"), put them in notes as a short checklist (e.g., "- [ ] apples").',
    '- For meals: add one log event titled "nutrition: <kcal> kcal P<g> C<g> F<g>" if you can estimate; otherwise omit nutrition log.',
    '- Do not hallucinate people/places; only use explicit @mentions or obvious items in text.',
    '- Keep results small and high-signal: <= 10 tasks, <= 12 events. Prefer grouping contiguous blocks into a single event with segment notes.',
    '- If the text contains any explicit time ranges, you MUST return at least one event per time range (or a consolidated block). Do not return empty arrays.',
    '- For tracker logs (mood, pain, energy, stress, sleep, workout, hydration/water), create log events with trackerKey set to the tracker name and startAtIso near when mentioned. If it appears inside a timed block, place it within that block (e.g., midpoint).',
    '- Notes must be a left-justified markdown outline. Use short bullets, include actionable items as checkboxes (e.g., "- [ ] apples"). If you add sub-bullets, include at most 2. Keep notes detailed but compact (max ~12 lines per event).',
    '- For timed blocks, include time-stamped outline bullets like: "- **HH:MM** - note" so the timeline can show segments.',
    '- Event titles must be short and natural (e.g., "Work", "Clinic", "Call bank"). Do NOT output filler fragments.',
    '- If the user describes multiple parts inside one longer event (e.g., "work 8–4; 4h inpatient, 4h clinic"), create ONE event and put segments in `notes` as lines like: "- **HH:MM** - Label".',
    '- If a task has a date (e.g., tomorrow) but no time, set scheduledAtIso to 09:00 local on that date and set estimateMinutes.',
    '- Omit optional fields you cannot confidently infer.',
    '- Always include importance (1-10) and difficulty/energy (1-10) for events and tasks based on effort/impact described.',
    '- When relevant, include character traits as an array from: ["STR","INT","CON","PER"].',
    'JSON schema:',
    '{ "tasks": LlmParsedTask[], "events": LlmParsedEvent[] }',
  ].join('\n')

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
      people: Array.isArray(t.people) ? t.people : undefined,
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
      people: Array.isArray(e.people) ? e.people : undefined,
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
}): Promise<LlmBlockParseResult> {
  const anchor = new Date(opts.anchorMs)
  const model = opts.model ?? 'gpt-4.1-mini'
  const supportsResponseFormat = !/^gpt-5/i.test(model) && !/^o[1-9]/i.test(model)

  // Split into blocks first
  const rawBlocks = splitOnDividers(opts.text)
  const hasMultipleBlocks = rawBlocks.length > 1

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
    '## Workout Parsing',
    'Detect workout descriptions and extract structured data:',
    '- "3x10 bench at 225" → 3 sets of 10 reps at 225lbs bench press',
    '- "30 min treadmill" → cardio, 30 min duration',
    '- "100 push-ups" → bodyweight, 1 set of 100 reps',
    '- RPE (rate of perceived exertion) if mentioned',
    '- Estimate calories based on exercise type and duration',
    '',
    '## Nutrition Parsing',
    'Detect meal/food descriptions and extract structured data:',
    '- Meal type: breakfast, lunch, dinner, snack, drink',
    '- Food items with quantities and units',
    '- Estimate macros (protein, carbs, fat) when possible',
    '- Common foods: eggs (6g P, 0g C, 5g F), chicken breast (31g P per 4oz), rice (45g C per cup)',
    '',
    '## General Rules',
    '- Use ISO timestamps (local time) for all times.',
    '- If past tense, mark tasks done and events in the past.',
    '- Extract people only when explicit (@mentions, "with Name").',
    '- Include importance (1-10) and difficulty (1-10) for events/tasks.',
    '- Keep output compact: <=10 tasks, <=12 events per block.',
    '',
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

  function normalizeWorkout(w: any): LlmParsedWorkout | null {
    if (!w || typeof w !== 'object') return null
    if (!Array.isArray(w.exercises) || w.exercises.length === 0) return null
    return {
      type: w.type ?? 'mixed',
      title: typeof w.title === 'string' ? w.title : undefined,
      exercises: w.exercises.map((ex: any) => ({
        name: ex.name ?? 'Unknown',
        type: ex.type,
        sets: Array.isArray(ex.sets) ? ex.sets : [],
        muscleGroups: Array.isArray(ex.muscleGroups) ? ex.muscleGroups : undefined,
        notes: typeof ex.notes === 'string' ? ex.notes : undefined,
      })),
      totalDuration: typeof w.totalDuration === 'number' ? w.totalDuration : undefined,
      estimatedCalories: typeof w.estimatedCalories === 'number' ? w.estimatedCalories : undefined,
      overallRpe: typeof w.overallRpe === 'number' ? w.overallRpe : undefined,
      notes: typeof w.notes === 'string' ? w.notes : undefined,
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
        protein: typeof item.protein === 'number' ? item.protein : undefined,
        carbs: typeof item.carbs === 'number' ? item.carbs : undefined,
        fat: typeof item.fat === 'number' ? item.fat : undefined,
        brand: typeof item.brand === 'string' ? item.brand : undefined,
      })),
      totalCalories: typeof m.totalCalories === 'number' ? m.totalCalories : undefined,
      macros: m.macros && typeof m.macros === 'object' ? {
        protein: m.macros.protein ?? 0,
        carbs: m.macros.carbs ?? 0,
        fat: m.macros.fat ?? 0,
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
      people: Array.isArray(t.people) ? t.people : undefined,
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
      people: Array.isArray(e.people) ? e.people : undefined,
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
