# CONVOY 3 SECTION 4: Entity Crossover Prevention

**Document Version:** 1.0
**Date:** January 18, 2026
**Report Type:** Unified Architecture Specification - Section 4
**Word Count Target:** ~8,000 words
**Status:** Production Specification

---

## Executive Summary

Entity crossover—the unintended bleeding of data, classification, or context between different entity types—represents one of the most critical challenges in Insight 5.2's voice-first architecture. When a user says "Did my workout, feeling great, mood is 8," the system must cleanly extract three distinct entities (WorkoutSession, implicit mood expression, explicit TrackerLog) without conflating their boundaries, duplicating data, or creating orphaned relationships.

This section provides comprehensive specifications for preventing entity crossover through:
1. **Entity Type Taxonomy and Boundaries** - Clear definitions of where each entity type begins and ends
2. **Signal-Based Disambiguation** - Pattern-matching rules that identify entity type ownership
3. **Context Isolation Patterns** - Architectural separation to prevent data bleeding
4. **Multi-Entity Extraction Rules** - Algorithms for cleanly separating compound inputs
5. **Conflict Resolution Strategies** - Priority hierarchies when entities compete for ownership
6. **Implementation Patterns** - Production-ready code structures

The goal is a system where entities remain distinct, traceable, and correctly attributed even when user input is ambiguous, compound, or spans multiple domains.

---

# PART 4.1: The Entity Crossover Problem

## 4.1.1 Defining Crossover

Entity crossover occurs when the boundaries between distinct entity types become unclear, leading to one or more of the following failure modes:

### Data Bleeding
Data intended for one entity type appears in or affects another:
```typescript
// PROBLEM: User says "Morning workout, felt energized, 45 minutes"
// Incorrect extraction:
{
  type: 'WorkoutSession',
  durationMinutes: 45,
  feeling: 'energized'  // BLEEDING: mood data in workout entity
}

// CORRECT extraction:
[
  { type: 'WorkoutSession', durationMinutes: 45 },
  { type: 'MoodEntry', overallRating: 7, emotions: ['energized'], linkedTo: 'workout-id' }
]
```

### Classification Confusion
The system cannot determine which entity type owns a piece of input:
```typescript
// PROBLEM: "Reading for 30 minutes"
// Could be:
// - HabitInstance (if "Reading" is a tracked habit)
// - Event (if this is a one-time occurrence)
// - JournalEntry (if part of reflection about reading)
```

### Duplicate Creation
The same data creates multiple redundant entities:
```typescript
// PROBLEM: User says "Completed my morning meditation habit"
// Incorrect:
[
  { type: 'HabitInstance', habitName: 'meditation' },
  { type: 'Event', title: 'Morning meditation' },  // DUPLICATE
  { type: 'TrackerLog', key: 'meditation', value: true }  // DUPLICATE
]
```

### Context Contamination
Context from one entity inappropriately affects another:
```typescript
// PROBLEM: "Worked out at the gym, then called Mom"
// Incorrect: Location "gym" applied to phone call event
{
  type: 'Event',
  title: 'Called Mom',
  location: 'gym'  // CONTAMINATION: location from earlier context
}
```

### XP Double-Counting
The same activity earns XP from multiple sources inappropriately:
```typescript
// PROBLEM: Workout that completes a habit
// Incorrect XP:
workoutXP = 50;        // Full workout calculation
habitXP = 45;          // Full habit calculation
totalXP = 95;          // DOUBLE-COUNTED effort

// Correct XP:
workoutXP = 50;        // Primary activity
habitLinkBonus = 10;   // Flat bonus for habit link
totalXP = 60;          // Proper attribution
```

## 4.1.2 Why Crossover Happens

Entity crossover stems from fundamental characteristics of natural language voice input:

### 1. Compound Statements
Users naturally combine multiple thoughts:
> "Did my workout and meditation, feeling great, had a protein shake after."

This single utterance references:
- WorkoutSession (exercise)
- HabitInstance (meditation, if tracked)
- MoodEntry (feeling great)
- NutritionLog (protein shake)

### 2. Implicit Relationships
Users assume context without explicit markers:
> "Morning run was 5 miles, PR pace."

Implicit entities:
- WorkoutSession (the run)
- PersonalRecord (PR detection)
- Event (morning timeframe)

### 3. Shared Vocabulary
Many words have legitimate meanings across domains:
- "energy" → Mood dimension OR workout intensity
- "30 minutes" → Duration of workout OR habit OR event
- "good" → Mood rating OR workout quality OR food taste

### 4. Temporal Ambiguity
Time references can apply to multiple entities:
> "Yesterday at 7pm"

Could anchor:
- When workout started
- When mood was recorded
- When event occurred

### 5. Nested Contexts
Some entities legitimately contain others:
- Routine contains multiple Habits
- Event can link to Mood
- Workout can complete Habit

---

# PART 4.2: Entity Type Taxonomy and Boundaries

## 4.2.1 The Entity Hierarchy

Insight 5.2 defines six primary entity types with clear ownership boundaries:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTITY TYPE HIERARCHY                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐                                               │
│  │   ROUTINE    │ ← Contains ordered sequence of habits         │
│  └──────┬───────┘                                               │
│         │ aggregates                                            │
│         ▼                                                       │
│  ┌──────────────┐      ┌──────────────┐                        │
│  │    HABIT     │ ◄───►│   WORKOUT    │ ← Can be linked        │
│  └──────────────┘      └──────────────┘                        │
│         │                     │                                 │
│         │                     │ both can trigger                │
│         ▼                     ▼                                 │
│  ┌──────────────┐      ┌──────────────┐                        │
│  │    MOOD      │ ◄───►│    EVENT     │ ← Correlated          │
│  └──────────────┘      └──────────────┘                        │
│         │                     │                                 │
│         │                     │                                 │
│         ▼                     ▼                                 │
│  ┌──────────────┐      ┌──────────────┐                        │
│  │   TRACKER    │      │   JOURNAL    │                        │
│  └──────────────┘      └──────────────┘                        │
│                                                                  │
│  Cross-cutting: TrackerLogs can attach to ANY entity type       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 4.2.2 Entity Ownership Rules

### TASK Entity
**Owns:** Future actions the user intends to complete
**Boundary:** Ends when action is in the past (becomes Event/Habit)

```typescript
interface TaskBoundary {
  // Ownership signals (presence = likely Task)
  ownershipSignals: [
    'need to', 'have to', 'should', 'must',
    'remember to', 'don\'t forget', 'want to',
    'planning to', 'will', 'gonna', 'gotta',
    'todo:', 'task:', 'remind me'
  ];

  // Exclusion signals (presence = NOT Task)
  exclusionSignals: [
    'did', 'finished', 'completed', 'done',
    'had', 'went', 'was', 'yesterday'
  ];

  // Temporal requirement
  temporalRule: 'future_or_unspecified';
}
```

### EVENT Entity
**Owns:** Time-bounded occurrences (past or scheduled future)
**Boundary:** Has temporal anchor, not recurring by nature

```typescript
interface EventBoundary {
  ownershipSignals: [
    'at [TIME]', 'from [TIME] to [TIME]',
    '@[person]', '![location]',
    'meeting', 'appointment', 'call',
    'lunch with', 'dinner at'
  ];

  exclusionSignals: [
    'every day', 'daily', 'weekly', 'habit'
  ];

  temporalRule: 'requires_time_anchor';
}
```

### HABIT Entity
**Owns:** Recurring intentional behaviors being tracked
**Boundary:** Matches existing habit definition OR has recurring intent

```typescript
interface HabitBoundary {
  ownershipSignals: [
    'did my [X]', 'completed [X]',
    'finished my', 'my [X] habit',
    'streak', 'daily [X]'
  ];

  // Critical: Must match existing definition OR create new
  matchRequirement: 'existing_definition_or_explicit_creation';

  exclusionSignals: [
    'first time', 'tried', 'new activity'
  ];
}
```

### WORKOUT Entity
**Owns:** Physical exercise sessions with performance metrics
**Boundary:** Contains exercise vocabulary, sets/reps/weights, or cardio metrics

```typescript
interface WorkoutBoundary {
  ownershipSignals: [
    // Exercise vocabulary
    'workout', 'gym', 'run', 'lift', 'cardio',
    'bench', 'squat', 'deadlift', 'push-up',
    // Metric patterns
    /\d+\s*x\s*\d+/,  // Sets x reps
    /\d+\s*(lbs?|kg)/,  // Weight
    /\d+:\d{2}\s*pace/,  // Running pace
    'AMRAP', 'EMOM', 'WOD', 'RPE'
  ];

  exclusionSignals: [
    'thinking about', 'planning', 'will do'  // Future = Task
  ];
}
```

### MOOD Entity
**Owns:** Subjective emotional/energy state at a point in time
**Boundary:** Contains rating, emotion words, or explicit mood declaration

```typescript
interface MoodBoundary {
  ownershipSignals: [
    '#mood', 'feeling', 'mood is', 'mood:',
    'energy', 'anxiety', 'focus', 'motivation',
    // Sentiment words
    'great', 'terrible', 'okay', 'stressed',
    'happy', 'sad', 'anxious', 'calm'
  ];

  // Special: Can be extracted from other entities
  extractionRule: 'can_be_inferred_from_context';

  exclusionSignals: [
    // Avoid extracting when clearly about something else
    'the food was great',  // Food quality, not mood
    'great workout'  // Workout quality, not mood
  ];
}
```

### JOURNAL/NOTE Entity
**Owns:** Long-form reflective prose without actionable structure
**Boundary:** Word count > threshold, narrative style, no clear entity signals

```typescript
interface JournalBoundary {
  ownershipSignals: [
    // Length-based
    'word_count > 50',
    // Reflective language
    'I\'ve been thinking', 'Looking back',
    'I notice', 'I realize', 'reflecting on'
  ];

  // Lowest priority - fallback for unstructured content
  priority: 'lowest';

  exclusionSignals: [
    // Structured content should go to specific domains
    '#', '@', '!',  // Tracker/mention/location syntax
    /\d+\s*x\s*\d+/  // Workout notation
  ];
}
```

### TRACKER Entity
**Owns:** Quantified metric values
**Boundary:** Explicit #key(value) syntax OR known tracker key with value

```typescript
interface TrackerBoundary {
  ownershipSignals: [
    /#[a-z]+\([^)]+\)/,  // #mood(8), #energy(7)
    // Known tracker keys with values
    'mood [NUMBER]', 'energy [NUMBER]',
    'weight [NUMBER]', 'sleep [NUMBER]'
  ];

  // Special: Can attach to other entities
  attachmentRule: 'attaches_to_parent_or_standalone';
}
```

## 4.2.3 The Facets System

Entities use a `facets` array to indicate multi-type nature:

```typescript
// An entry can have multiple facets
interface MobileEvent {
  facets: ('event' | 'habit' | 'workout' | 'log' | 'episode' | 'note')[];
  kind: 'log' | 'episode' | 'task' | 'note';
}

// Example: Workout that completes a habit
{
  facets: ['event', 'habit', 'workout'],
  kind: 'episode'
}
```

**Facet Rules:**
1. `facets` describes *what the entry represents* (can be multiple)
2. `kind` describes *how to display/treat it* (single value)
3. Primary entity type determines XP calculation source
4. Secondary facets enable linking without duplication

---

# PART 4.3: Signal-Based Disambiguation

## 4.3.1 The Signal Priority Matrix

When input contains signals for multiple entity types, use this priority order:

| Priority | Entity Type | Trigger Signal Examples | Confidence Boost |
|----------|-------------|------------------------|------------------|
| 1 | Explicit Command | "Create habit", "Log workout", "Add task" | +0.30 |
| 2 | Query | "Show me", "What's my", "How many" | +0.25 |
| 3 | Workout | Exercise names, sets/reps/weight | +0.20 |
| 4 | Nutrition | Meal words, food items, "ate", "had for" | +0.15 |
| 5 | Habit | Past tense + possession ("did my X") | +0.10 |
| 6 | Mood | "feeling", #mood, sentiment words | +0.10 |
| 7 | Event | Time anchors, @mentions, locations | +0.05 |
| 8 | Journal | Long-form, narrative, reflection | 0.00 |

## 4.3.2 Signal Extraction Pipeline

```typescript
interface SignalExtractionResult {
  input: string;
  extractedSignals: Signal[];
  dominantType: EntityType | null;
  secondaryTypes: EntityType[];
  confidence: number;
}

interface Signal {
  type: EntityType;
  pattern: string;
  matchedText: string;
  position: { start: number; end: number };
  strength: number;  // 0.0 - 1.0
}

function extractSignals(input: string): SignalExtractionResult {
  const signals: Signal[] = [];

  // 1. Extract explicit commands (highest priority)
  const commandSignals = extractCommandSignals(input);
  signals.push(...commandSignals);

  // 2. Extract workout signals
  const workoutSignals = extractWorkoutSignals(input);
  signals.push(...workoutSignals);

  // 3. Extract nutrition signals
  const nutritionSignals = extractNutritionSignals(input);
  signals.push(...nutritionSignals);

  // 4. Extract habit signals
  const habitSignals = extractHabitSignals(input);
  signals.push(...habitSignals);

  // 5. Extract mood signals
  const moodSignals = extractMoodSignals(input);
  signals.push(...moodSignals);

  // 6. Extract event signals
  const eventSignals = extractEventSignals(input);
  signals.push(...eventSignals);

  // 7. Extract tracker signals (can attach to any)
  const trackerSignals = extractTrackerSignals(input);
  signals.push(...trackerSignals);

  // Calculate dominant type
  const typeScores = calculateTypeScores(signals);
  const dominantType = getHighestScoringType(typeScores);
  const secondaryTypes = getSecondaryTypes(typeScores, dominantType);

  return {
    input,
    extractedSignals: signals,
    dominantType,
    secondaryTypes,
    confidence: typeScores[dominantType] || 0
  };
}
```

## 4.3.3 Workout Signal Extraction

Workouts have the most distinctive vocabulary:

```typescript
const EXERCISE_VOCABULARY: Record<string, string[]> = {
  // Compound movements
  'bench_press': ['bench', 'flat bench', 'bb bench', 'barbell bench', 'bench press'],
  'back_squat': ['squat', 'squats', 'bb squat', 'barbell squat', 'back squat'],
  'deadlift': ['dl', 'deads', 'deadlift', 'conventional', 'sumo'],
  'overhead_press': ['ohp', 'shoulder press', 'military press', 'press'],

  // Isolation
  'bicep_curl': ['curls', 'curl', 'bicep curl', 'hammer curl'],
  'tricep_extension': ['tricep extension', 'skull crusher', 'pushdown'],

  // Cardio
  'running': ['run', 'ran', 'running', 'jog', 'jogging', 'sprint'],
  'cycling': ['bike', 'cycling', 'rode', 'peloton', 'spin'],
  'swimming': ['swim', 'swam', 'swimming', 'laps'],

  // CrossFit/HIIT
  'amrap': ['amrap', 'as many rounds'],
  'emom': ['emom', 'every minute'],
  'wod': ['wod', 'workout of the day']
};

const WORKOUT_PATTERNS = [
  // Sets x reps
  /(\d+)\s*[xX×]\s*(\d+)/g,
  // Weight
  /(\d+(?:\.\d+)?)\s*(lbs?|kg|pounds?|kilos?)/gi,
  // Duration + activity
  /(\d+)\s*(min|minute|hour|hr)s?\s+(run|walk|bike|swim|cardio|workout)/gi,
  // Pace
  /(\d+):(\d{2})\s*(pace|min\/mile|per mile)/gi,
  // Distance
  /(\d+(?:\.\d+)?)\s*(miles?|km|kilometers?|meters?|m)\b/gi
];

function extractWorkoutSignals(input: string): Signal[] {
  const signals: Signal[] = [];
  const lowerInput = input.toLowerCase();

  // Check exercise vocabulary
  for (const [canonical, aliases] of Object.entries(EXERCISE_VOCABULARY)) {
    for (const alias of aliases) {
      const index = lowerInput.indexOf(alias);
      if (index !== -1) {
        signals.push({
          type: 'workout',
          pattern: `exercise:${canonical}`,
          matchedText: alias,
          position: { start: index, end: index + alias.length },
          strength: 0.8
        });
      }
    }
  }

  // Check workout patterns
  for (const pattern of WORKOUT_PATTERNS) {
    let match;
    while ((match = pattern.exec(input)) !== null) {
      signals.push({
        type: 'workout',
        pattern: 'metric',
        matchedText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        strength: 0.9
      });
    }
  }

  return signals;
}
```

## 4.3.4 Habit Signal Extraction

Habits are detected by possessive patterns and existing definitions:

```typescript
const HABIT_PATTERNS = [
  // Possessive + activity
  /\b(did|finished|completed|done)\s+(my|the)\s+(\w+)/gi,
  // Streak mentions
  /streak/gi,
  // Daily/routine language
  /\b(daily|morning|evening)\s+(\w+)/gi
];

async function extractHabitSignals(
  input: string,
  userId: string
): Promise<Signal[]> {
  const signals: Signal[] = [];

  // Get user's habit definitions
  const userHabits = await getHabitDefinitions(userId);
  const habitNames = userHabits.map(h => h.name.toLowerCase());

  // Check for exact habit name matches
  for (const habit of userHabits) {
    const habitLower = habit.name.toLowerCase();
    const index = input.toLowerCase().indexOf(habitLower);
    if (index !== -1) {
      signals.push({
        type: 'habit',
        pattern: `exact_match:${habit.id}`,
        matchedText: habit.name,
        position: { start: index, end: index + habit.name.length },
        strength: 0.95  // High confidence for exact match
      });
    }
  }

  // Check pattern matches
  for (const pattern of HABIT_PATTERNS) {
    let match;
    while ((match = pattern.exec(input)) !== null) {
      // "did my X" pattern - check if X could be a habit
      if (match[3]) {
        const potentialHabit = match[3].toLowerCase();
        const isKnownHabit = habitNames.some(h =>
          h.includes(potentialHabit) || potentialHabit.includes(h)
        );

        signals.push({
          type: 'habit',
          pattern: 'possessive_completion',
          matchedText: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          strength: isKnownHabit ? 0.9 : 0.6
        });
      }
    }
  }

  return signals;
}
```

## 4.3.5 Mood Signal Extraction

Mood signals include explicit ratings and sentiment:

```typescript
const MOOD_SIGNALS = {
  explicit: [
    /#mood\s*\(\s*(\d+)\s*\)/gi,
    /\bmood\s*(?:is|was|:)?\s*(\d+)/gi,
    /\benergy\s*(?:is|was|:)?\s*(\d+)/gi,
    /\banxiety\s*(?:is|was|:)?\s*(\d+)/gi
  ],
  sentiment: {
    positive: ['great', 'amazing', 'fantastic', 'wonderful', 'happy', 'excited', 'energized'],
    neutral: ['okay', 'fine', 'alright', 'so-so', 'meh'],
    negative: ['terrible', 'awful', 'sad', 'stressed', 'anxious', 'tired', 'exhausted']
  },
  prefix: ['feeling', 'felt', 'i am', "i'm"]
};

function extractMoodSignals(input: string): Signal[] {
  const signals: Signal[] = [];
  const lowerInput = input.toLowerCase();

  // Check explicit mood ratings
  for (const pattern of MOOD_SIGNALS.explicit) {
    let match;
    while ((match = pattern.exec(input)) !== null) {
      signals.push({
        type: 'mood',
        pattern: 'explicit_rating',
        matchedText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        strength: 1.0  // Explicit ratings are definitive
      });
    }
  }

  // Check sentiment words with mood prefix
  const hasMoodPrefix = MOOD_SIGNALS.prefix.some(p => lowerInput.includes(p));

  for (const [sentiment, words] of Object.entries(MOOD_SIGNALS.sentiment)) {
    for (const word of words) {
      const index = lowerInput.indexOf(word);
      if (index !== -1) {
        signals.push({
          type: 'mood',
          pattern: `sentiment:${sentiment}`,
          matchedText: word,
          position: { start: index, end: index + word.length },
          strength: hasMoodPrefix ? 0.85 : 0.5  // Context-dependent
        });
      }
    }
  }

  return signals;
}
```

## 4.3.6 Conflict Detection

When signals from multiple types overlap, detect and resolve:

```typescript
interface SignalConflict {
  signals: Signal[];
  overlapRange: { start: number; end: number };
  conflictType: 'same_text' | 'overlapping_span' | 'semantic';
  resolution: 'primary_wins' | 'split' | 'both' | 'clarify';
}

function detectConflicts(signals: Signal[]): SignalConflict[] {
  const conflicts: SignalConflict[] = [];

  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      const s1 = signals[i];
      const s2 = signals[j];

      // Check for overlapping spans
      if (spansOverlap(s1.position, s2.position)) {
        conflicts.push({
          signals: [s1, s2],
          overlapRange: mergeSpans(s1.position, s2.position),
          conflictType: 'overlapping_span',
          resolution: determineResolution(s1, s2)
        });
      }
    }
  }

  return conflicts;
}

function determineResolution(s1: Signal, s2: Signal): ConflictResolution {
  // Same type - merge, don't conflict
  if (s1.type === s2.type) {
    return 'both';
  }

  // Tracker attaches to other entities
  if (s1.type === 'tracker' || s2.type === 'tracker') {
    return 'both';  // Tracker attaches to the other
  }

  // Workout + Habit - legitimate dual nature
  if ((s1.type === 'workout' && s2.type === 'habit') ||
      (s1.type === 'habit' && s2.type === 'workout')) {
    return 'both';  // Can be both with facets
  }

  // Event + Mood - correlation, not conflict
  if ((s1.type === 'event' && s2.type === 'mood') ||
      (s1.type === 'mood' && s2.type === 'event')) {
    return 'both';  // Mood linked to event
  }

  // Otherwise, higher strength wins
  return 'primary_wins';
}
```

---

# PART 4.4: Context Isolation Patterns

## 4.4.1 The Context Window

Each entity extraction operates within an isolated context window:

```typescript
interface ExtractionContext {
  // Input boundaries
  inputText: string;
  inputSpan: { start: number; end: number };

  // Temporal context
  anchorTimestamp: number;
  timezone: string;

  // User context
  userId: string;
  persona: PersonaType;
  recentEntities: RecentEntity[];  // Last 5 entries for context

  // Extraction state
  extractedEntities: ExtractedEntity[];
  remainingText: string;
  usedSpans: { start: number; end: number }[];
}
```

## 4.4.2 Span Ownership

Each extracted entity "owns" a span of text, preventing double-extraction:

```typescript
function markSpanUsed(
  context: ExtractionContext,
  span: { start: number; end: number },
  entityId: string,
  exclusive: boolean
): void {
  if (exclusive) {
    // Exclusive span - no other entity can claim
    context.usedSpans.push({ ...span, owner: entityId, exclusive: true });
  } else {
    // Shared span - attachments allowed
    context.usedSpans.push({ ...span, owner: entityId, exclusive: false });
  }
}

function isSpanAvailable(
  context: ExtractionContext,
  span: { start: number; end: number },
  forExclusive: boolean
): boolean {
  for (const used of context.usedSpans) {
    if (spansOverlap(span, used)) {
      if (used.exclusive || forExclusive) {
        return false;  // Conflict with exclusive span
      }
    }
  }
  return true;
}
```

## 4.4.3 Entity Extraction Order

Entities are extracted in a specific order to prevent contamination:

```typescript
async function extractEntities(
  input: string,
  context: ExtractionContext
): Promise<ExtractedEntity[]> {
  const entities: ExtractedEntity[] = [];

  // Phase 1: Extract explicit trackers (regex-only, highest confidence)
  const trackers = extractExplicitTrackers(input);
  for (const tracker of trackers) {
    markSpanUsed(context, tracker.span, tracker.id, false);  // Non-exclusive
    entities.push(tracker);
  }

  // Phase 2: Extract @mentions and !locations (structural markers)
  const mentions = extractMentions(input);
  const locations = extractLocations(input);
  // These attach to other entities, don't claim exclusive spans

  // Phase 3: Extract primary entity (workout/habit/event)
  const primarySignals = await extractPrimarySignals(input, context);
  const primaryEntity = await classifyPrimaryEntity(input, primarySignals, context);
  if (primaryEntity) {
    markSpanUsed(context, primaryEntity.span, primaryEntity.id, true);  // Exclusive
    primaryEntity.mentions = mentions;
    primaryEntity.locations = locations;
    entities.push(primaryEntity);
  }

  // Phase 4: Extract secondary entities from remaining text
  const remainingText = getRemainingText(input, context.usedSpans);
  if (remainingText.length > 10) {
    const secondaryEntities = await extractSecondaryEntities(remainingText, context);
    entities.push(...secondaryEntities);
  }

  // Phase 5: Infer linked mood if sentiment detected
  const moodInference = inferMoodFromContext(input, entities, context);
  if (moodInference && moodInference.confidence > 0.7) {
    entities.push(moodInference);
  }

  return entities;
}
```

## 4.4.4 Temporal Isolation

Temporal expressions are resolved once and shared:

```typescript
interface TemporalContext {
  primaryAnchor: Date | null;
  expressionUsed: string | null;
  isRetroactive: boolean;
  daysDifference: number;
}

function resolveTemporalContext(
  input: string,
  now: Date,
  timezone: string
): TemporalContext {
  // Extract temporal expressions
  const expressions = extractTemporalExpressions(input);

  if (expressions.length === 0) {
    return {
      primaryAnchor: now,
      expressionUsed: null,
      isRetroactive: false,
      daysDifference: 0
    };
  }

  // Use the most specific expression
  const primary = expressions.sort((a, b) => b.specificity - a.specificity)[0];
  const anchor = resolveToDate(primary, now, timezone);

  const daysDiff = differenceInDays(now, anchor);

  return {
    primaryAnchor: anchor,
    expressionUsed: primary.text,
    isRetroactive: daysDiff > 0,
    daysDifference: daysDiff
  };
}

// All entities share the same temporal context
function applyTemporalContext(
  entities: ExtractedEntity[],
  temporal: TemporalContext
): void {
  for (const entity of entities) {
    // Apply temporal anchor
    if (!entity.timestamp) {
      entity.timestamp = temporal.primaryAnchor.getTime();
    }

    // Mark retroactive
    if (temporal.isRetroactive) {
      entity.frontmatter = entity.frontmatter || {};
      entity.frontmatter.retroactive = true;
      entity.frontmatter.loggedAt = Date.now();
    }
  }
}
```

## 4.4.5 Location and Person Isolation

Locations and people attach only to their syntactically-closest entity:

```typescript
function attachContextualMetadata(
  entities: ExtractedEntity[],
  mentions: Mention[],
  locations: Location[]
): void {
  for (const mention of mentions) {
    // Find the entity whose span is closest to this mention
    const closestEntity = findClosestEntity(entities, mention.position);
    if (closestEntity) {
      closestEntity.people = closestEntity.people || [];
      closestEntity.people.push(mention.name);
    }
  }

  for (const location of locations) {
    // Locations attach to the entity they appear within
    const containingEntity = findContainingEntity(entities, location.position);
    if (containingEntity) {
      containingEntity.location = location.resolved;
    }
  }
}

function findClosestEntity(
  entities: ExtractedEntity[],
  position: number
): ExtractedEntity | null {
  let closest: ExtractedEntity | null = null;
  let minDistance = Infinity;

  for (const entity of entities) {
    // Distance to entity's span
    const distance = position < entity.span.start
      ? entity.span.start - position
      : position > entity.span.end
        ? position - entity.span.end
        : 0;  // Within span

    if (distance < minDistance) {
      minDistance = distance;
      closest = entity;
    }
  }

  return closest;
}
```

---

# PART 4.5: Multi-Entity Extraction Rules

## 4.5.1 The Compound Input Problem

Single voice inputs often describe multiple entities:

```
"Morning update. Had coffee at 6:30, did my meditation,
feeling good #mood(8) #energy(7) #focus(8)."
```

Expected entities:
1. **Event**: "Had coffee at 6:30"
2. **HabitInstance**: "did my meditation"
3. **TrackerLog**: mood=8
4. **TrackerLog**: energy=7
5. **TrackerLog**: focus=8
6. **MoodEntry**: "feeling good" (inferred from trackers)

## 4.5.2 Segmentation Algorithm

```typescript
interface Segment {
  text: string;
  position: { start: number; end: number };
  type: 'separator' | 'content';
  dominantSignal: EntityType | null;
}

function segmentInput(input: string): Segment[] {
  const segments: Segment[] = [];

  // Sentence-level segmentation
  const sentences = input.split(/[.!?]+/).filter(s => s.trim());

  // Within sentences, check for list markers
  for (const sentence of sentences) {
    const listItems = sentence.split(/[,;]|\band\b|\bthen\b/i);

    if (listItems.length > 1) {
      // Multiple items in sentence
      for (const item of listItems) {
        if (item.trim()) {
          segments.push({
            text: item.trim(),
            position: findPosition(input, item),
            type: 'content',
            dominantSignal: detectDominantSignal(item)
          });
        }
      }
    } else {
      // Single item
      segments.push({
        text: sentence.trim(),
        position: findPosition(input, sentence),
        type: 'content',
        dominantSignal: detectDominantSignal(sentence)
      });
    }
  }

  return segments;
}
```

## 4.5.3 Entity Merging Rules

When segments could combine into a single entity:

```typescript
interface MergeDecision {
  shouldMerge: boolean;
  reason: string;
  mergedType?: EntityType;
}

function shouldMergeSegments(
  seg1: Segment,
  seg2: Segment
): MergeDecision {
  // Same entity type + sequential = merge
  if (seg1.dominantSignal === seg2.dominantSignal) {
    // Check if they describe the same activity
    if (seg1.dominantSignal === 'workout') {
      // "Bench 4x8, then incline 3x10" = same workout
      return { shouldMerge: true, reason: 'same_workout_session' };
    }
    if (seg1.dominantSignal === 'event') {
      // Check temporal continuity
      const time1 = extractTime(seg1.text);
      const time2 = extractTime(seg2.text);
      if (time1 && time2 && Math.abs(time1 - time2) < 30 * 60 * 1000) {
        return { shouldMerge: true, reason: 'sequential_events' };
      }
    }
  }

  // Habit within Routine = link, don't merge
  if (seg1.dominantSignal === 'habit' && seg2.dominantSignal === 'habit') {
    // Check for routine context
    if (hasRoutineContext(seg1.text, seg2.text)) {
      return { shouldMerge: false, reason: 'routine_chain' };
    }
  }

  // Different types = don't merge
  return { shouldMerge: false, reason: 'different_types' };
}
```

## 4.5.4 The "Also" Pattern

Users often add additional entities with transitional words:

```typescript
const TRANSITION_PATTERNS = [
  /\balso\b/i,
  /\band then\b/i,
  /\bplus\b/i,
  /\boh and\b/i,
  /\bby the way\b/i,
  /\bseparately\b/i
];

function detectTransitions(input: string): TransitionPoint[] {
  const transitions: TransitionPoint[] = [];

  for (const pattern of TRANSITION_PATTERNS) {
    let match;
    while ((match = pattern.exec(input)) !== null) {
      transitions.push({
        position: match.index,
        marker: match[0],
        // Text after this point is a separate entity
        signalsNewEntity: true
      });
    }
  }

  return transitions;
}
```

## 4.5.5 Tracker Attachment Logic

Trackers attach to existing entities or stand alone:

```typescript
function attachTrackersToEntities(
  trackers: TrackerLog[],
  entities: ExtractedEntity[]
): void {
  for (const tracker of trackers) {
    // Find the entity this tracker relates to
    const relatedEntity = findRelatedEntity(tracker, entities);

    if (relatedEntity) {
      // Attach to entity
      relatedEntity.trackerLogs = relatedEntity.trackerLogs || [];
      relatedEntity.trackerLogs.push(tracker);
      tracker.attachedTo = relatedEntity.id;
    } else {
      // Standalone tracker
      tracker.attachedTo = null;
    }
  }
}

function findRelatedEntity(
  tracker: TrackerLog,
  entities: ExtractedEntity[]
): ExtractedEntity | null {
  // Mood trackers attach to mood entities or standalone
  if (['mood', 'energy', 'anxiety', 'focus', 'motivation'].includes(tracker.key)) {
    const moodEntity = entities.find(e => e.type === 'mood');
    if (moodEntity) return moodEntity;
  }

  // RPE attaches to workouts
  if (tracker.key === 'rpe') {
    const workout = entities.find(e => e.type === 'workout');
    if (workout) return workout;
  }

  // Positional attachment - attach to nearest entity
  const nearestEntity = findNearestByPosition(tracker.position, entities);
  return nearestEntity;
}
```

---

# PART 4.6: Conflict Resolution Strategies

## 4.6.1 The Priority Hierarchy

When entities compete for the same data:

```typescript
const ENTITY_PRIORITY: Record<EntityType, number> = {
  command: 100,     // Explicit commands always win
  query: 90,        // Queries take precedence
  workout: 80,      // Structured workout data
  nutrition: 70,    // Food tracking
  habit: 60,        // Habit completion
  mood: 50,         // Mood logging
  event: 40,        // General events
  journal: 30,      // Freeform notes
  tracker: 20       // Standalone trackers (usually attach)
};

function resolveEntityConflict(
  entity1: ExtractedEntity,
  entity2: ExtractedEntity
): ConflictResolution {
  const priority1 = ENTITY_PRIORITY[entity1.type];
  const priority2 = ENTITY_PRIORITY[entity2.type];

  if (priority1 > priority2) {
    return { winner: entity1, loser: entity2, action: 'promote_primary' };
  } else if (priority2 > priority1) {
    return { winner: entity2, loser: entity1, action: 'promote_primary' };
  } else {
    // Same priority - use confidence
    if (entity1.confidence > entity2.confidence) {
      return { winner: entity1, loser: entity2, action: 'confidence_based' };
    } else {
      return { winner: entity2, loser: entity1, action: 'confidence_based' };
    }
  }
}
```

## 4.6.2 Dual-Nature Entities

Some inputs legitimately create multiple entity types:

```typescript
interface DualNatureRule {
  types: [EntityType, EntityType];
  condition: (input: string, context: ExtractionContext) => boolean;
  resolution: 'both_with_link' | 'primary_with_facet' | 'clarify';
}

const DUAL_NATURE_RULES: DualNatureRule[] = [
  {
    // Workout that completes a habit
    types: ['workout', 'habit'],
    condition: (input, context) => {
      const workoutSignals = extractWorkoutSignals(input);
      const habitMatch = findHabitMatch(input, context.userId);
      return workoutSignals.length > 0 && habitMatch !== null;
    },
    resolution: 'primary_with_facet'  // Primary = Workout, facets include 'habit'
  },
  {
    // Event with mood correlation
    types: ['event', 'mood'],
    condition: (input, context) => {
      const hasEventSignals = extractEventSignals(input).length > 0;
      const hasMoodSignals = extractMoodSignals(input).length > 0;
      return hasEventSignals && hasMoodSignals;
    },
    resolution: 'both_with_link'  // Create both, link mood to event
  },
  {
    // Habit within routine
    types: ['routine', 'habit'],
    condition: (input, context) => {
      return detectRoutineContext(input) && extractHabitSignals(input).length > 0;
    },
    resolution: 'both_with_link'  // Routine completion + individual habit instances
  }
];

function handleDualNature(
  input: string,
  types: [EntityType, EntityType],
  context: ExtractionContext
): ExtractedEntity[] {
  const rule = DUAL_NATURE_RULES.find(r =>
    arraysEqual(r.types, types) && r.condition(input, context)
  );

  if (!rule) {
    // No dual-nature rule applies - use priority
    return [extractPrimaryEntity(input, types, context)];
  }

  switch (rule.resolution) {
    case 'both_with_link':
      const primary = extractEntity(input, types[0], context);
      const secondary = extractEntity(input, types[1], context);
      secondary.linkedTo = primary.id;
      return [primary, secondary];

    case 'primary_with_facet':
      const entity = extractEntity(input, types[0], context);
      entity.facets = entity.facets || [];
      entity.facets.push(types[1]);
      return [entity];

    case 'clarify':
      // Return partial entities, prompt user
      return extractPartialEntities(input, types, context);
  }
}
```

## 4.6.3 XP Conflict Resolution

Prevent double-counting XP for linked entities:

```typescript
interface XPCalculation {
  entityId: string;
  entityType: EntityType;
  baseXP: number;
  multipliers: XPMultiplier[];
  linkedBonuses: LinkedBonus[];
  totalXP: number;
}

interface LinkedBonus {
  sourceEntityId: string;
  bonusType: 'habit_link' | 'routine_chain' | 'correlation';
  bonusAmount: number;
  reason: string;
}

function calculateXPWithoutDoubleCount(
  entities: ExtractedEntity[]
): XPCalculation[] {
  const calculations: XPCalculation[] = [];
  const processedEffort: Set<string> = new Set();

  // Sort by priority - highest priority gets full calculation
  const sorted = [...entities].sort((a, b) =>
    ENTITY_PRIORITY[b.type] - ENTITY_PRIORITY[a.type]
  );

  for (const entity of sorted) {
    const effortKey = generateEffortKey(entity);

    if (processedEffort.has(effortKey)) {
      // Effort already counted - only add link bonus
      calculations.push({
        entityId: entity.id,
        entityType: entity.type,
        baseXP: 0,
        multipliers: [],
        linkedBonuses: [{
          sourceEntityId: findPrimaryEntity(entities, effortKey).id,
          bonusType: 'habit_link',
          bonusAmount: 10,  // Flat bonus for link
          reason: 'Linked to primary activity'
        }],
        totalXP: 10
      });
    } else {
      // First time counting this effort
      const calculation = calculateFullXP(entity);
      calculations.push(calculation);
      processedEffort.add(effortKey);
    }
  }

  return calculations;
}

function generateEffortKey(entity: ExtractedEntity): string {
  // Generate a key that represents the "effort" being counted
  // Same workout + habit should share a key

  if (entity.type === 'workout' && entity.linkedHabitId) {
    return `effort:${entity.linkedHabitId}:${dateKey(entity.timestamp)}`;
  }

  if (entity.type === 'habit' && entity.linkedWorkoutId) {
    return `effort:${entity.id}:${dateKey(entity.timestamp)}`;
  }

  return `effort:${entity.id}`;
}
```

## 4.6.4 Retroactive Conflict Resolution

Retroactive entries have special conflict rules:

```typescript
interface RetroactiveConflict {
  existingEntity: ExtractedEntity;
  retroactiveEntity: ExtractedEntity;
  overlapType: 'same_time' | 'same_habit' | 'same_activity';
  resolution: 'merge' | 'reject' | 'update' | 'create_duplicate';
}

function resolveRetroactiveConflict(
  conflict: RetroactiveConflict
): ResolvedConflict {
  const { existingEntity, retroactiveEntity, overlapType } = conflict;

  switch (overlapType) {
    case 'same_habit':
      // Can't complete same habit twice in same day
      if (isSameDay(existingEntity.timestamp, retroactiveEntity.timestamp)) {
        return {
          action: 'reject',
          reason: 'Habit already completed for this date',
          message: 'You already logged this habit for that day.'
        };
      }
      return { action: 'create_duplicate' };

    case 'same_time':
      // Events at exact same time - merge or update
      if (existingEntity.confidence < retroactiveEntity.confidence) {
        return {
          action: 'update',
          updatedEntity: mergeEntities(existingEntity, retroactiveEntity)
        };
      }
      return { action: 'reject', reason: 'Lower confidence than existing' };

    case 'same_activity':
      // Same workout/activity - likely correction
      return {
        action: 'update',
        updatedEntity: mergeEntities(existingEntity, retroactiveEntity),
        preserveField: 'original_timestamp'
      };
  }
}
```

---

# PART 4.7: Implementation Patterns

## 4.7.1 The Entity Extraction Service

```typescript
class EntityExtractionService {
  private signalExtractor: SignalExtractor;
  private contextBuilder: ContextBuilder;
  private conflictResolver: ConflictResolver;
  private entityFactory: EntityFactory;

  async extract(
    input: string,
    userId: string,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    // 1. Build extraction context
    const context = await this.contextBuilder.build(userId, input, options);

    // 2. Pre-parse regex patterns
    const preParsed = this.preparse(input);
    context.trackers = preParsed.trackers;
    context.mentions = preParsed.mentions;
    context.locations = preParsed.locations;

    // 3. Extract signals
    const signals = await this.signalExtractor.extract(input, context);

    // 4. Detect conflicts
    const conflicts = this.conflictResolver.detect(signals);

    // 5. Resolve conflicts
    const resolvedSignals = this.conflictResolver.resolve(signals, conflicts);

    // 6. Segment input
    const segments = this.segmentInput(input, resolvedSignals);

    // 7. Extract entities from segments
    const entities: ExtractedEntity[] = [];
    for (const segment of segments) {
      const entity = await this.entityFactory.create(segment, context);
      if (entity) {
        entities.push(entity);
        this.markSpanUsed(context, entity.span);
      }
    }

    // 8. Link entities
    this.linkEntities(entities, context);

    // 9. Attach trackers
    this.attachTrackers(entities, context.trackers);

    // 10. Apply temporal context
    this.applyTemporalContext(entities, context.temporal);

    // 11. Calculate XP without double-counting
    const xpCalculations = calculateXPWithoutDoubleCount(entities);

    return {
      entities,
      xpCalculations,
      confidence: this.calculateOverallConfidence(entities),
      requiresClarification: this.needsClarification(entities, context)
    };
  }
}
```

## 4.7.2 The Conflict Resolution Pipeline

```typescript
class ConflictResolver {
  detect(signals: Signal[]): SignalConflict[] {
    const conflicts: SignalConflict[] = [];

    // Spatial conflicts (overlapping spans)
    const spatial = this.detectSpatialConflicts(signals);
    conflicts.push(...spatial);

    // Semantic conflicts (incompatible types)
    const semantic = this.detectSemanticConflicts(signals);
    conflicts.push(...semantic);

    // Priority conflicts (same span, different priorities)
    const priority = this.detectPriorityConflicts(signals);
    conflicts.push(...priority);

    return conflicts;
  }

  resolve(
    signals: Signal[],
    conflicts: SignalConflict[]
  ): Signal[] {
    const resolved: Signal[] = [...signals];

    for (const conflict of conflicts) {
      const resolution = this.getResolution(conflict);

      switch (resolution.action) {
        case 'remove_lower_priority':
          this.removeSignal(resolved, resolution.signalToRemove);
          break;

        case 'merge_signals':
          this.mergeSignals(resolved, conflict.signals);
          break;

        case 'keep_both':
          // No action needed
          break;

        case 'flag_for_clarification':
          conflict.signals.forEach(s => s.needsClarification = true);
          break;
      }
    }

    return resolved;
  }

  private getResolution(conflict: SignalConflict): Resolution {
    // Apply resolution rules in order
    for (const rule of RESOLUTION_RULES) {
      if (rule.matches(conflict)) {
        return rule.resolve(conflict);
      }
    }

    // Default: higher priority wins
    return {
      action: 'remove_lower_priority',
      signalToRemove: this.getLowerPrioritySignal(conflict)
    };
  }
}
```

## 4.7.3 Entity Factory Pattern

```typescript
class EntityFactory {
  private factories: Map<EntityType, BaseEntityFactory>;

  constructor() {
    this.factories = new Map([
      ['workout', new WorkoutEntityFactory()],
      ['habit', new HabitEntityFactory()],
      ['mood', new MoodEntityFactory()],
      ['event', new EventEntityFactory()],
      ['nutrition', new NutritionEntityFactory()],
      ['journal', new JournalEntityFactory()],
      ['tracker', new TrackerEntityFactory()]
    ]);
  }

  async create(
    segment: Segment,
    context: ExtractionContext
  ): Promise<ExtractedEntity | null> {
    const factory = this.factories.get(segment.dominantSignal);

    if (!factory) {
      // No factory for this type - fall back to generic
      return this.createGenericEntity(segment, context);
    }

    // Factory-specific creation
    const entity = await factory.create(segment, context);

    // Apply common post-processing
    if (entity) {
      entity.id = generateId();
      entity.createdAt = Date.now();
      entity.userId = context.userId;
      entity.source = 'voice';
    }

    return entity;
  }
}

abstract class BaseEntityFactory {
  abstract create(
    segment: Segment,
    context: ExtractionContext
  ): Promise<ExtractedEntity | null>;

  protected extractCommonFields(segment: Segment): CommonFields {
    return {
      rawText: segment.text,
      span: segment.position,
      confidence: segment.dominantSignal ? 0.8 : 0.5
    };
  }
}

class WorkoutEntityFactory extends BaseEntityFactory {
  async create(
    segment: Segment,
    context: ExtractionContext
  ): Promise<WorkoutEntity | null> {
    const common = this.extractCommonFields(segment);

    // Extract workout-specific data
    const exercises = this.extractExercises(segment.text);
    const duration = this.extractDuration(segment.text);
    const metrics = this.extractMetrics(segment.text);

    if (exercises.length === 0 && !duration && !metrics.rpe) {
      // Not enough workout data
      return null;
    }

    // Check for linked habit
    const linkedHabit = await this.findLinkedHabit(
      exercises,
      context.userId
    );

    return {
      type: 'workout',
      facets: linkedHabit ? ['workout', 'habit'] : ['workout'],
      ...common,
      title: this.generateTitle(exercises, segment.text),
      exercises,
      durationMinutes: duration,
      perceivedExertion: metrics.rpe,
      linkedHabitId: linkedHabit?.id
    };
  }
}
```

## 4.7.4 Testing Entity Isolation

```typescript
describe('Entity Crossover Prevention', () => {
  describe('Data Bleeding Prevention', () => {
    it('should not bleed mood data into workout entity', async () => {
      const input = "Morning workout, felt energized, 45 minutes";
      const result = await extractor.extract(input, userId);

      const workout = result.entities.find(e => e.type === 'workout');
      const mood = result.entities.find(e => e.type === 'mood');

      // Workout should not have feeling field
      expect(workout).not.toHaveProperty('feeling');
      expect(workout.durationMinutes).toBe(45);

      // Mood should be separate entity
      expect(mood).toBeDefined();
      expect(mood.emotions).toContain('energized');
    });

    it('should not apply location to unrelated entities', async () => {
      const input = "Worked out at the gym, then called Mom";
      const result = await extractor.extract(input, userId);

      const workout = result.entities.find(e =>
        e.type === 'workout' || e.title?.includes('workout')
      );
      const call = result.entities.find(e =>
        e.title?.includes('called Mom')
      );

      expect(workout.location).toBe('gym');
      expect(call.location).toBeUndefined();
    });
  });

  describe('Duplicate Prevention', () => {
    it('should not create duplicate entities for habit completion', async () => {
      const input = "Completed my morning meditation habit";
      const result = await extractor.extract(input, userId);

      // Should create exactly one habit instance
      const habits = result.entities.filter(e => e.type === 'habit');
      expect(habits.length).toBe(1);

      // Should not also create an event
      const events = result.entities.filter(e =>
        e.type === 'event' && e.title?.includes('meditation')
      );
      expect(events.length).toBe(0);
    });
  });

  describe('XP Double-Counting Prevention', () => {
    it('should not double-count workout that completes habit', async () => {
      const input = "Finished my 5K run habit";
      const result = await extractor.extract(input, userId);

      const totalXP = result.xpCalculations.reduce(
        (sum, calc) => sum + calc.totalXP,
        0
      );

      // Should have primary XP + link bonus, not full workout + full habit
      expect(totalXP).toBeLessThan(100);  // Not doubled

      // Should have exactly one baseXP > 0
      const withBaseXP = result.xpCalculations.filter(c => c.baseXP > 0);
      expect(withBaseXP.length).toBe(1);
    });
  });

  describe('Multi-Entity Extraction', () => {
    it('should correctly segment compound input', async () => {
      const input = "Morning update. Had coffee at 6:30, did my meditation, feeling good #mood(8)";
      const result = await extractor.extract(input, userId);

      expect(result.entities.length).toBeGreaterThanOrEqual(3);

      // Should have event for coffee
      const coffee = result.entities.find(e =>
        e.title?.toLowerCase().includes('coffee')
      );
      expect(coffee).toBeDefined();
      expect(coffee.timestamp).toBeDefined();  // 6:30 today

      // Should have habit for meditation
      const meditation = result.entities.find(e =>
        e.type === 'habit' && e.habitName?.includes('meditation')
      );
      expect(meditation).toBeDefined();

      // Should have tracker for mood
      const moodTracker = result.entities.find(e =>
        e.type === 'tracker' && e.key === 'mood'
      );
      expect(moodTracker).toBeDefined();
      expect(moodTracker.value).toBe(8);
    });
  });
});
```

---

# PART 4.8: Persona-Specific Crossover Handling

## 4.8.1 Optimizer: Precision-First Resolution

The Optimizer expects clear entity separation with explicit linking:

```typescript
const OPTIMIZER_CONFIG: CrossoverConfig = {
  clarificationThreshold: 0.85,  // High bar - ask if unsure
  preferExplicitLinks: true,      // Show linked entities separately
  showEntityBreakdown: true,      // Display all extracted entities
  xpBreakdownVisible: true,       // Show XP by entity

  conflictResolution: {
    default: 'clarify',           // Ask rather than assume
    workoutHabit: 'both_with_link',
    eventMood: 'both_with_link'
  }
};

// Optimizer UI response for compound input
{
  feedback: {
    primary: "Logged 3 entities:",
    entities: [
      { type: "Workout", title: "Push Day", xp: 45 },
      { type: "Habit", title: "Gym Session", xp: 10, linkedTo: "Workout" },
      { type: "Mood", rating: 8, linkedTo: "Workout" }
    ],
    totalXP: 55
  }
}
```

## 4.8.2 Dabbler: Minimal Friction Resolution

The Dabbler should not see entity complexity:

```typescript
const DABBLER_CONFIG: CrossoverConfig = {
  clarificationThreshold: 0.50,   // Low bar - assume if possible
  preferExplicitLinks: false,     // Hide linking complexity
  showEntityBreakdown: false,     // Just show "Logged!"
  xpBreakdownVisible: false,      // No XP display

  conflictResolution: {
    default: 'primary_wins',      // Don't ask, pick best guess
    workoutHabit: 'primary_with_facet',
    eventMood: 'primary_wins'
  }
};

// Dabbler UI response
{
  feedback: {
    primary: "Got it! Logged.",
    // No entity breakdown
    // No XP display
  }
}
```

## 4.8.3 Neurodivergent: Patient Clarification

The Neurodivergent user may produce ambiguous, stream-of-consciousness input:

```typescript
const NEURODIVERGENT_CONFIG: CrossoverConfig = {
  clarificationThreshold: 0.70,   // Moderate - allow some ambiguity
  preferExplicitLinks: false,     // Don't add cognitive load
  showEntityBreakdown: false,     // Minimal feedback
  xpBreakdownVisible: false,

  conflictResolution: {
    default: 'best_guess_with_undo',  // Guess, but make undo easy
    workoutHabit: 'primary_with_facet',
    eventMood: 'primary_wins'
  },

  // Special: Handle self-correction in stream
  selfCorrectionHandling: 'apply_final_value',

  // Special: No judgment for ambiguity
  ambiguityMessage: "I logged what I understood. You can always adjust it later, no worries!"
};
```

## 4.8.4 Biohacker: Metric Precision

The Biohacker expects all metrics extracted correctly:

```typescript
const BIOHACKER_CONFIG: CrossoverConfig = {
  clarificationThreshold: 0.90,   // Very high - metrics must be right
  preferExplicitLinks: true,
  showEntityBreakdown: true,
  xpBreakdownVisible: true,

  conflictResolution: {
    default: 'clarify',
    workoutHabit: 'both_with_link',
    eventMood: 'both_with_link'
  },

  // Special: All trackers extracted and shown
  trackerDisplay: 'full_list',

  // Special: Supplement parsing precision
  supplementParsing: 'strict',

  // Feedback with all metrics
  feedbackTemplate: `Logged: {entities}
Trackers: {trackers}
Biometrics: {biometrics}
XP: {xp}`
};
```

---

# PART 4.9: Quality Metrics and Monitoring

## 4.9.1 Crossover Detection Metrics

```typescript
interface CrossoverMetrics {
  // Prevention metrics
  dataBleedingRate: number;        // % of extractions with bleeding
  duplicateCreationRate: number;   // % with duplicate entities
  contextContaminationRate: number;
  xpDoubleCountRate: number;

  // Quality metrics
  correctSegmentationRate: number; // % correct entity count
  linkAccuracy: number;            // % correct entity links
  conflictResolutionAccuracy: number;

  // User experience
  clarificationRate: number;       // % requiring user clarification
  undoRate: number;                // % of extractions undone by user
  editRate: number;                // % edited after creation
}

async function measureCrossoverMetrics(
  extractions: ExtractionResult[],
  groundTruth: GroundTruth[]
): Promise<CrossoverMetrics> {
  let dataBleedingCount = 0;
  let duplicateCount = 0;
  let contaminationCount = 0;
  let doubleCountCount = 0;

  for (let i = 0; i < extractions.length; i++) {
    const extraction = extractions[i];
    const truth = groundTruth[i];

    // Check for data bleeding
    if (hasDataBleeding(extraction, truth)) {
      dataBleedingCount++;
    }

    // Check for duplicates
    if (hasDuplicates(extraction)) {
      duplicateCount++;
    }

    // Check for context contamination
    if (hasContamination(extraction, truth)) {
      contaminationCount++;
    }

    // Check for XP double-counting
    if (hasDoubleCount(extraction)) {
      doubleCountCount++;
    }
  }

  const total = extractions.length;

  return {
    dataBleedingRate: dataBleedingCount / total,
    duplicateCreationRate: duplicateCount / total,
    contextContaminationRate: contaminationCount / total,
    xpDoubleCountRate: doubleCountCount / total,
    // ... other metrics
  };
}
```

## 4.9.2 Target Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Data Bleeding Rate | < 1% | > 3% |
| Duplicate Creation Rate | < 0.5% | > 2% |
| Context Contamination Rate | < 1% | > 3% |
| XP Double-Count Rate | < 0.1% | > 0.5% |
| Correct Segmentation Rate | > 95% | < 90% |
| Link Accuracy | > 93% | < 88% |
| Clarification Rate | < 10% | > 20% |
| Undo Rate | < 5% | > 10% |

---

# PART 4.10: Summary and Key Takeaways

## 4.10.1 Core Principles

1. **Entity Ownership is Exclusive for Primary Data**
   - Each piece of user input belongs to exactly one primary entity
   - Trackers and metadata can attach to entities without claiming ownership
   - Facets indicate multi-type nature without duplication

2. **Signal Priority Determines Conflicts**
   - Clear hierarchy: Command > Query > Workout > Nutrition > Habit > Mood > Event > Journal
   - Higher priority signals claim disputed spans
   - Same-priority conflicts resolve by confidence score

3. **Context Isolation Prevents Contamination**
   - Temporal context resolved once, shared across entities
   - Location/person context attaches to syntactically-closest entity
   - Span ownership prevents double-extraction

4. **XP Attribution Follows Effort**
   - Primary activity gets full XP calculation
   - Linked entities get flat bonuses, not duplicate calculations
   - Effort keys prevent double-counting same activity

5. **Persona Configuration Shapes Experience**
   - Optimizer: Precision and explicit linking
   - Dabbler: Minimal friction, best-guess resolution
   - Neurodivergent: Patient handling of ambiguity
   - Biohacker: Metric accuracy paramount

## 4.10.2 Implementation Checklist

- [ ] Implement signal extraction pipeline with priority hierarchy
- [ ] Build span ownership tracking in extraction context
- [ ] Create entity factories with dual-nature support
- [ ] Implement XP calculation with double-count prevention
- [ ] Add persona-specific crossover configuration
- [ ] Build comprehensive test suite for crossover scenarios
- [ ] Set up metrics monitoring with alerts

## 4.10.3 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Complex inputs overwhelming classifier | Segment first, classify segments |
| Edge cases causing data loss | Always preserve raw input |
| XP exploitation via entity duplication | Effort key tracking |
| Context contamination across time | Isolate temporal resolution |
| User confusion about entity linking | Persona-appropriate feedback |

---

**Document Prepared By:** Convoy 3 Section 4 Agent
**Review Status:** Pending Codex Peer Review
**Integration:** Part of CONVOY3_UNIFIED_ARCHITECTURE_NLP_STRATEGY.md

---

## Appendix A: Signal Pattern Reference

### A.1 Workout Signal Patterns

```typescript
const WORKOUT_PATTERNS = {
  // Exercise vocabulary (comprehensive)
  exercises: {
    compound: ['bench', 'squat', 'deadlift', 'press', 'row', 'pull-up', 'chin-up'],
    isolation: ['curl', 'extension', 'fly', 'raise', 'pushdown'],
    cardio: ['run', 'jog', 'sprint', 'bike', 'cycle', 'swim', 'row'],
    functional: ['burpee', 'box jump', 'kettlebell', 'clean', 'snatch']
  },

  // Metric patterns
  metrics: {
    setsReps: /(\d+)\s*[xX×]\s*(\d+)/g,
    weight: /(\d+(?:\.\d+)?)\s*(lbs?|kg|pounds?)/gi,
    distance: /(\d+(?:\.\d+)?)\s*(miles?|km|meters?|m)\b/gi,
    duration: /(\d+)\s*(min|minute|hour|hr)s?/gi,
    pace: /(\d+):(\d{2})\s*(pace|\/mile|per mile)/gi,
    rpe: /\brpe\s*(\d+)/gi
  },

  // Workout type indicators
  types: {
    strength: ['push day', 'pull day', 'leg day', 'upper', 'lower', 'full body'],
    cardio: ['cardio', 'conditioning', 'endurance'],
    hiit: ['amrap', 'emom', 'wod', 'tabata', 'circuit'],
    flexibility: ['yoga', 'stretch', 'mobility']
  }
};
```

### A.2 Mood Signal Patterns

```typescript
const MOOD_PATTERNS = {
  // Explicit ratings
  explicit: [
    /#mood\s*\(\s*(\d+)\s*\)/gi,
    /\bmood\s*(?:is|was|:)?\s*(\d+)/gi,
    /\bfeeling\s+(?:like\s+)?a?\s*(\d+)/gi
  ],

  // Dimension patterns
  dimensions: {
    energy: /\benergy\s*(?:is|was|:)?\s*(\d+)/gi,
    anxiety: /\banxiety\s*(?:is|was|:)?\s*(\d+)/gi,
    focus: /\bfocus\s*(?:is|was|:)?\s*(\d+)/gi,
    motivation: /\bmotivation\s*(?:is|was|:)?\s*(\d+)/gi
  },

  // Sentiment vocabulary
  sentiment: {
    very_positive: ['amazing', 'fantastic', 'incredible', 'wonderful', 'ecstatic'],
    positive: ['good', 'great', 'happy', 'pleased', 'content', 'energized'],
    neutral: ['okay', 'fine', 'alright', 'so-so', 'meh', 'neutral'],
    negative: ['bad', 'sad', 'down', 'tired', 'stressed', 'frustrated'],
    very_negative: ['terrible', 'awful', 'horrible', 'miserable', 'devastated']
  },

  // Context phrases
  context: ['feeling', 'felt', 'i am', "i'm", 'been feeling']
};
```

### A.3 Habit Signal Patterns

```typescript
const HABIT_PATTERNS = {
  // Completion phrases
  completion: [
    /\b(did|finished|completed|done)\s+(my|the)\s+(\w+)/gi,
    /\b(\w+)\s+(done|completed|finished)\b/gi,
    /\bmarking\s+(\w+)\s+(as\s+)?(done|complete)/gi
  ],

  // Creation phrases
  creation: [
    /\b(start|create|add|new)\s+(a\s+)?(habit|daily)\b/gi,
    /\bwant\s+to\s+(start|track)\s+(\w+)/gi
  ],

  // Streak references
  streak: [
    /\bstreak/gi,
    /\b(\d+)\s+days?\s+in\s+a\s+row/gi,
    /\bconsecutive\s+days?/gi
  ],

  // Frequency indicators
  frequency: [
    'daily', 'every day', 'each day',
    'weekly', 'every week',
    'morning', 'evening', 'before bed'
  ]
};
```

---

## Appendix B: Conflict Resolution Decision Tree

```
START: Multiple entity types detected for same input span
│
├── Is one type COMMAND or QUERY?
│   └── YES → That type wins (priority 100/90)
│
├── Is there a WORKOUT signal with exercise vocabulary?
│   └── YES → Workout is primary
│       ├── Also HABIT signal for same activity?
│       │   └── Add 'habit' to facets, link habit definition
│       └── Also MOOD signal?
│           └── Create linked MoodEntry
│
├── Is there a NUTRITION signal with food vocabulary?
│   └── YES → Nutrition is primary
│       └── Also MOOD signal?
│           └── Create linked MoodEntry
│
├── Is there a HABIT signal with existing definition match?
│   └── YES → Habit is primary
│       └── Also MOOD signal?
│           └── Create linked MoodEntry
│
├── Is there a MOOD signal with explicit rating?
│   └── YES → Mood is primary
│
├── Is there an EVENT signal with time anchor?
│   └── YES → Event is primary
│       └── Also MOOD signal?
│           └── Create linked MoodEntry
│
└── Default → Journal/Note (lowest priority)
```

---

## Appendix C: Test Cases for Crossover Prevention

### C.1 Data Bleeding Test Cases

```typescript
const DATA_BLEEDING_TESTS = [
  {
    input: "Morning workout, felt energized, 45 minutes",
    expectEntities: 2,
    expectWorkout: {
      durationMinutes: 45,
      notHaveProperty: 'feeling'
    },
    expectMood: {
      emotions: ['energized']
    }
  },
  {
    input: "Great run today, mood was 8",
    expectEntities: 2,
    expectWorkout: {
      type: 'cardio',
      notHaveProperty: 'moodRating'
    },
    expectMood: {
      overallRating: 8
    }
  }
];
```

### C.2 XP Double-Count Test Cases

```typescript
const XP_DOUBLE_COUNT_TESTS = [
  {
    input: "Completed my 5K run habit",
    expectXPCalculations: 2,
    expectPrimaryXP: { entityType: 'workout', hasBaseXP: true },
    expectSecondaryXP: { entityType: 'habit', baseXP: 0, hasLinkBonus: true },
    expectTotalXP: 'less_than_sum_of_individuals'
  },
  {
    input: "Morning routine done - meditation, cold shower, journaling",
    expectRoutineXP: true,
    expectHabitXP: false,  // Habits within routine don't get separate XP
    expectChainBonus: true
  }
];
```

---

# PART 4.11: Peer Review Amendments (P0 Critical Fixes)

Following peer review validation, the following critical issues were identified and addressed:

## 4.11.1 AMENDMENT: Corrected Signal Priority Hierarchy

**Issue:** Original hierarchy placed explicit tracker syntax (#mood(8)) at lowest priority, which is incorrect. Explicit syntax should rank higher than implicit signals.

**Corrected Priority Matrix:**

| Priority | Entity Type | Confidence Boost | Notes |
|----------|-------------|------------------|-------|
| 1 | Explicit Command | +0.30 | "Create habit", "Log workout" |
| 2 | Query | +0.25 | "Show me", "What's my" |
| 3 | **Explicit Tracker Syntax** | **+0.25** | **#key(value) format** |
| 4 | Task | +0.20 | "Need to", "Remember to" |
| 5 | Workout | +0.20 | Exercise vocabulary, metrics |
| 6 | Nutrition | +0.15 | Meal words, food items |
| 7 | Habit | +0.10 | "Did my", possession patterns |
| 8 | Mood | +0.10 | "Feeling", sentiment words |
| 9 | Event | +0.05 | Time anchors, @mentions |
| 10 | Journal | 0.00 | Long-form, narrative |
| 11 | Implicit Tracker | 0.00 | Inferred values |

```typescript
const ENTITY_PRIORITY: Record<EntityType, number> = {
  command: 100,
  query: 90,
  explicit_tracker: 85,    // NEW: Explicit #syntax
  task: 82,                // NEW: Added Task entity
  workout: 80,
  nutrition: 70,
  habit: 60,
  mood: 50,
  event: 40,
  journal: 30,
  implicit_tracker: 20
};
```

## 4.11.2 AMENDMENT: Task Entity Priority Resolution

**Issue:** Task entity defined but not included in conflict resolution priority.

**Resolution:** Tasks are added at priority 82, resolving the edge case:

```typescript
// Input: "Need to log my workout from yesterday"
// Resolution order:
// 1. "Need to" → Task signal (priority 82)
// 2. "workout" → Workout signal (priority 80)
// 3. "yesterday" → Temporal modifier (not entity type)
//
// Result: Task entity wins (higher priority)
// Task.linkedWorkout = placeholder for future workout log
```

**Task Boundary Definition:**

```typescript
interface TaskBoundary {
  ownershipSignals: [
    'need to', 'have to', 'should', 'must',
    'remember to', 'don\'t forget', 'want to',
    'planning to', 'will', 'gonna', 'gotta',
    'todo:', 'task:', 'remind me'
  ];

  exclusionSignals: [
    'did', 'finished', 'completed', 'done',
    'had', 'went', 'was'  // Past tense = not Task
  ];

  temporalRule: 'future_or_unspecified';

  // NEW: Handle retroactive logging intent
  retroactiveLoggingPattern: /\blog\s+(my\s+)?(\w+)\s+from\s+(yesterday|last\s+\w+)/i;
}
```

## 4.11.3 AMENDMENT: XP Timestamp Gaming Prevention

**Issue:** Using `entity.timestamp` (log time) instead of `entity.occurredAt` (event time) allows gaming by logging same workout at 11:59 PM and 12:01 AM.

**Corrected Effort Key Generation:**

```typescript
function generateEffortKey(entity: ExtractedEntity): string {
  // CRITICAL: Use occurredAt (when activity happened), NOT timestamp (when logged)
  const activityTime = entity.occurredAt || entity.startAt || entity.timestamp;
  const activityDate = dateKey(activityTime);

  // For linked workout-habit scenarios
  if (entity.type === 'workout' && entity.linkedHabitId) {
    return `effort:${entity.linkedHabitId}:${activityDate}`;
  }

  if (entity.type === 'habit' && entity.linkedWorkoutId) {
    return `effort:${entity.id}:${activityDate}`;
  }

  // For routine completions, block all contained habits
  if (entity.type === 'routine') {
    // Pre-register all habit effort keys
    for (const habitId of entity.containedHabitIds) {
      processedEffort.add(`effort:${habitId}:${activityDate}`);
    }
    return `effort:routine:${entity.id}:${activityDate}`;
  }

  return `effort:${entity.id}:${activityDate}`;
}

// Additional safeguard: Content-based deduplication
function generateContentHash(entity: ExtractedEntity): string {
  const content = {
    type: entity.type,
    exercises: entity.exercises?.map(e => e.normalizedName).sort(),
    duration: Math.round(entity.durationMinutes / 5) * 5,  // 5-min buckets
    habitId: entity.linkedHabitId
  };
  return sha256(JSON.stringify(content)).substring(0, 12);
}

function isDuplicateEffort(
  entity: ExtractedEntity,
  processedKeys: Set<string>,
  processedHashes: Set<string>
): boolean {
  const effortKey = generateEffortKey(entity);
  const contentHash = generateContentHash(entity);

  // Check both key AND content hash
  if (processedKeys.has(effortKey)) return true;
  if (processedHashes.has(contentHash)) return true;

  return false;
}
```

## 4.11.4 AMENDMENT: Negation Handling

**Issue:** Document did not address negation patterns ("Didn't do my workout", "Skipped meditation").

**Negation Detection and Handling:**

```typescript
const NEGATION_PATTERNS = [
  // Explicit negation
  /\b(didn't|did not|haven't|have not|hasn't|has not)\s+(\w+)/gi,
  /\b(skipped|missed|forgot|failed)\s+(my\s+)?(\w+)/gi,
  /\bno\s+(workout|exercise|run|meditation|habit)/gi,
  /\b(couldn't|could not|can't|cannot)\s+(\w+)/gi,

  // Implicit negation
  /\btoo\s+(tired|busy|sick)\s+to\s+(\w+)/gi,
  /\bwasn't\s+able\s+to\s+(\w+)/gi
];

interface NegatedEntity {
  type: 'habit_skip' | 'workout_skip' | 'negated_intent';
  originalEntityType: EntityType;
  negationPattern: string;
  reason?: string;
  affectsStreak: boolean;
}

function detectNegation(input: string): NegationResult | null {
  for (const pattern of NEGATION_PATTERNS) {
    const match = pattern.exec(input);
    if (match) {
      return {
        detected: true,
        pattern: match[0],
        negatedActivity: extractNegatedActivity(match),
        position: match.index
      };
    }
  }
  return null;
}

function handleNegatedInput(
  input: string,
  context: ExtractionContext
): ExtractedEntity[] {
  const negation = detectNegation(input);

  if (!negation) {
    return extractEntities(input, context);  // Normal flow
  }

  // Check if negated activity is a tracked habit
  const habit = await findHabitByActivity(
    negation.negatedActivity,
    context.userId
  );

  if (habit) {
    // Create habit skip record (for streak tracking)
    return [{
      type: 'habit_skip',
      habitDefinitionId: habit.id,
      skippedAt: Date.now(),
      reason: extractSkipReason(input),
      frontmatter: {
        affectsStreak: !hasProtection(habit),
        originalInput: input
      }
    }];
  }

  // Not a habit - may be informational only
  return [{
    type: 'note',
    content: input,
    frontmatter: {
      containsNegation: true,
      negatedActivity: negation.negatedActivity
    }
  }];
}

// Streak impact rules for negation
function processNegatedHabit(
  habit: HabitDefinition,
  skip: HabitSkip
): StreakUpdate {
  // Check protection mechanisms
  if (habit.freezeTokensRemaining > 0 && skip.usesFreezeToken) {
    return {
      streakBroken: false,
      tokenUsed: true,
      message: "Streak protected with freeze token"
    };
  }

  // Check if reason qualifies for grace
  if (skip.reason && GRACE_REASONS.includes(skip.reason)) {
    return {
      streakBroken: false,
      graceApplied: true,
      message: "Streak protected - we understand!"
    };
  }

  // Streak breaks
  return {
    streakBroken: true,
    previousStreak: habit.currentStreak,
    message: "That's okay. Ready to start fresh when you are."
  };
}
```

## 4.11.5 Additional Test Cases for Amendments

```typescript
describe('Peer Review Amendment Tests', () => {
  describe('Corrected Priority Hierarchy', () => {
    it('should prioritize explicit tracker syntax over implicit mood', async () => {
      const input = "Feeling great #mood(8)";
      const result = await extractor.extract(input, userId);

      // Explicit tracker should be extracted with higher confidence
      const tracker = result.entities.find(e => e.type === 'tracker');
      const mood = result.entities.find(e => e.type === 'mood');

      expect(tracker.confidence).toBeGreaterThan(mood?.confidence || 0);
      expect(tracker.value).toBe(8);
    });

    it('should resolve Task vs Workout priority correctly', async () => {
      const input = "Need to log my workout from yesterday";
      const result = await extractor.extract(input, userId);

      // Should be Task (logging intent), not Workout
      expect(result.entities[0].type).toBe('task');
      expect(result.entities[0].linkedEntityType).toBe('workout');
    });
  });

  describe('XP Timestamp Gaming Prevention', () => {
    it('should use occurredAt for effort key, not timestamp', async () => {
      // Log workout that happened at 11pm yesterday
      const input1 = "Did my workout yesterday at 11pm";
      const result1 = await extractor.extract(input1, userId);

      // Try to log same workout again (logged at 1am today)
      const input2 = "Also finished my gym session last night";
      const result2 = await extractor.extract(input2, userId);

      // Second should be flagged as duplicate effort
      expect(result2.xpCalculations[0].isDuplicate).toBe(true);
      expect(result2.xpCalculations[0].totalXP).toBe(0);
    });
  });

  describe('Negation Handling', () => {
    it('should detect and handle negation patterns', async () => {
      const input = "Didn't do my meditation today";
      const result = await extractor.extract(input, userId);

      // Should create habit_skip, not habit_completion
      expect(result.entities[0].type).toBe('habit_skip');
      expect(result.entities[0].habitDefinitionId).toBeDefined();
    });

    it('should not award XP for skipped habits', async () => {
      const input = "Skipped my workout this morning";
      const result = await extractor.extract(input, userId);

      expect(result.xpCalculations.length).toBe(0);
    });

    it('should handle streak protection for valid skip reasons', async () => {
      const input = "Too sick to exercise today";
      const result = await extractor.extract(input, userId);

      // Should create skip with grace protection
      expect(result.entities[0].frontmatter.affectsStreak).toBe(false);
    });
  });
});
```

---

## 4.11.6 Peer Review Summary

**Review Status:** Conditionally Approved with P0 Fixes Applied

**Critical Issues Addressed:**
1. ✅ Tracker priority corrected (explicit syntax at priority 85)
2. ✅ Task entity added to priority matrix (priority 82)
3. ✅ XP timestamp gaming prevented (use occurredAt, content hashing)
4. ✅ Negation handling implemented

**Remaining P1/P2 Items for Future Iterations:**
- Conflicting temporal resolution (P1)
- Self-correction detection details (P1)
- Partial completion handling (P1)
- ML-based classification for scalability (P2)
- i18n architecture (P2)
- User learning feedback loop (P2)

---

**End of Section 4: Entity Crossover Prevention**

**Document Prepared By:** Convoy 3 Section 4 Agent
**Peer Review By:** Codex Peer Reviewer
**Final Status:** Approved with Amendments
**Integration Target:** CONVOY3_UNIFIED_ARCHITECTURE_NLP_STRATEGY.md Part 4
