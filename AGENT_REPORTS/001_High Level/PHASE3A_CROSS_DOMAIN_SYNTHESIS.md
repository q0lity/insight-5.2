# PHASE 3A: Cross-Domain Synthesis Report

**Document Version:** 1.0
**Date:** January 18, 2026
**Analysis Type:** Cross-Domain Consistency, Conflict Detection, Pattern Identification
**Input Documents:** 9 Phase 2 Domain Specifications (~37,000 lines, ~603 use cases)
**Word Count Target:** 10,000-15,000 words
**Status:** Production Specification

---

## Executive Summary

This report synthesizes findings from nine Phase 2 domain specifications for Insight 5.2, totaling approximately 603 use cases across Mood Tracking, Event Logging, Workouts, Food/Nutrition, Habits, Routines, Journaling, Voice Input Edge Cases, and Error Handling. The analysis identifies consistent patterns, flags conflicts and contradictions, documents cross-domain interactions, and provides recommendations for standardization.

### Key Findings Summary

**Consistency Strengths:**
- All nine domains maintain the standardized 5-section template (User Phrase/Scenario, Data Model Mapping, Parsing/Disambiguation Approach, Gamification Impact, Architecture Solution)
- Six personas (Optimizer, Dabbler, Privacy-First, Neurodivergent, Biohacker, Reflector) are consistently represented across all domains with ~11 use cases each
- Core architectural patterns (batch API, local-first storage, graceful degradation) appear uniformly
- Privacy tiers (local-only, encrypted, standard) are conceptually consistent
- Error handling principles (no data loss, streak protection, recovery-first) are universally applied

**Identified Conflicts (Requiring Resolution):**
1. XP calculation formulas vary significantly between domains (multiplicative vs. additive)
2. Confidence thresholds for auto-acceptance range from 0.30 to 0.96 without clear standardization
3. Streak maintenance thresholds differ (50% completion in Habits, unclear elsewhere)
4. Privacy flag naming conventions are inconsistent across schemas
5. Persona-specific gamification visibility rules are not uniformly defined

**Cross-Domain Dependencies:**
- Voice Input Edge Cases (Phase 2H) directly affects all eight other domains
- Error Handling (Phase 2I) intersects with every domain operation
- Mood Tracking links to Workouts, Nutrition, Habits, and Journaling for correlation analysis
- Routines aggregate Habits, potentially creating XP stacking scenarios
- Temporal parsing rules from Event Logging apply universally

---

## Part 1: Methodology

### 1.1 Analysis Approach

This synthesis was conducted through systematic examination of all nine Phase 2 domain specifications:

| Domain | File | Line Count | Use Cases |
|--------|------|------------|-----------|
| Mood Tracking | PHASE2A_DOMAIN_MOOD_TRACKING.md | 4,127 | 67 |
| Event Logging | PHASE2B_DOMAIN_EVENT_LOGGING.md | 3,878 | 67 |
| Workouts | PHASE2C_DOMAIN_WORKOUTS.md | 3,528 | 67 |
| Food/Nutrition | PHASE2D_DOMAIN_FOOD_NUTRITION.md | 1,344 | 67 |
| Habits | PHASE2E_DOMAIN_HABITS.md | 4,110 | 67 |
| Routines | PHASE2F_DOMAIN_ROUTINES.md | 2,852 | 67 |
| Journaling | PHASE2G_DOMAIN_JOURNALING.md | 3,921 | 67 |
| Voice Input Edges | PHASE2H_DOMAIN_VOICE_INPUT_EDGES.md | 5,554 | 67 |
| Error Handling | PHASE2I_DOMAIN_ERROR_HANDLING.md | 7,727 | 67 |
| **Total** | | **37,041** | **603** |

### 1.2 Analysis Dimensions

Each domain was analyzed across the following dimensions:
1. **Template Adherence**: Conformance to the 5-section structure
2. **Persona Coverage**: Distribution of use cases across six personas
3. **Data Model Consistency**: Schema naming, field conventions, relationships
4. **Parsing Patterns**: Confidence thresholds, disambiguation strategies, classification flows
5. **Gamification Rules**: XP formulas, streak logic, achievement patterns
6. **Architecture Patterns**: API conventions, sync strategies, storage modes
7. **Privacy Implementations**: Encryption modes, local-only flags, data retention
8. **Cross-Domain References**: Explicit links to other domain entities

---

## Part 2: Cross-Domain Pattern Analysis

### 2.1 Template Consistency

All nine domains demonstrate excellent adherence to the standardized 5-section template. Each use case follows this structure:

```
## Use Case [ID]: [Title]

### 1. User Phrase/Scenario
### 2. Data Model Mapping
### 3. Parsing/Disambiguation Approach
### 4. Gamification Impact
### 5. Architecture Solution
```

**Naming Convention Patterns:**

| Domain | ID Prefix | Example |
|--------|-----------|---------|
| Mood Tracking | UC-001 to UC-067 | UC-001: Multi-Dimensional Mood Check-In |
| Event Logging | UC-EL-001 to UC-EL-067 | UC-EL-001: Batch Event Capture |
| Workouts | UC-W001 to UC-W067 | UC-W001: Simple Cardio Session |
| Food/Nutrition | OPTI-FOOD-001, DAB-FOOD-001, etc. | OPTI-FOOD-001: Multi-Macro Tracking |
| Habits | UC-HAB-001 to UC-HAB-067 | UC-HAB-001: Simple Habit Completion |
| Routines | UC-R001 to UC-R067 | UC-R001: Morning Routine Completion |
| Journaling | UC-J001 to UC-J067 | UC-J001: Structured Journal Entry |
| Voice Input Edges | UC-VOI-001 to UC-VOI-067 | UC-VOI-001: Gym Background Noise |
| Error Handling | UC-E001 to UC-E067 | UC-E001: Inaudible Voice Capture |

**Observation:** The Food/Nutrition domain uses a persona-prefixed naming convention (OPTI-FOOD, DAB-FOOD, etc.) while others use sequential numbering. This inconsistency should be noted but does not affect functionality.

### 2.2 Persona Distribution

All domains distribute their 67 use cases across six personas with the following approximate allocation:

| Persona | Abbreviation | Typical Allocation | Primary Characteristics |
|---------|--------------|-------------------|------------------------|
| The Optimizer (Alex) | OPTI | 11 use cases | Data-rich, precise timestamps, correlation queries |
| The Dabbler (Jordan) | DAB | 11 use cases | Simple inputs, low friction, no pressure |
| The Privacy-First (Morgan) | GRD/PRIV | 11 use cases | Local-only, encrypted, minimal cloud |
| The Neurodivergent (Riley) | ND | 11-12 use cases | Stream-of-consciousness, memory support, no shame |
| The Biohacker (Sam) | BIO | 11-12 use cases | Quantified metrics, supplements, device integration |
| The Reflector (Casey) | REF | 11 use cases | Long-form entries, weekly summaries, pattern insights |

**Consistency Finding:** The Neurodivergent and Biohacker personas occasionally receive 12 use cases (vs. 11 for others) to accommodate their more complex interaction patterns. This is appropriate and intentional.

### 2.3 Data Model Patterns

#### 2.3.1 Entity Type Standardization

Across all domains, the following entity types appear consistently:

**Core Entities:**
```typescript
// Universal entities appearing in multiple domains
interface MobileEvent {
  id: string;
  title: string;
  facets: string[];       // ['event', 'habit', 'log', 'episode']
  kind: 'log' | 'episode' | 'task' | 'note';
  startAt: number;        // Unix timestamp
  endAt?: number;
  durationMinutes?: number;
  category: string;
  subcategory?: string;
  people?: string[];
  location?: string;
  bodyMarkdown?: string;
  difficulty?: number;    // 1-10 scale
  importance?: number;    // 1-10 scale
}

interface TrackerLog {
  trackerKey: string;
  valueNumeric?: number;
  valueText?: string;
  unit?: string;
  occurredAt: number;
  notes?: string;
  confidence?: number;
}
```

**Domain-Specific Extensions:**

| Domain | Additional Entity Types |
|--------|------------------------|
| Mood Tracking | MoodEntry (overallRating, dimensions, emotions, triggers) |
| Workouts | WorkoutEntry, WorkoutSession, ExerciseLog |
| Habits | HabitDefinition, HabitInstance, StreakProtectionLog |
| Nutrition | NutritionLog, FoodItem, DailyNutritionSummary |
| Routines | RoutineDefinition, RoutineCompletion |
| Journaling | JournalEntry (entryType, extractedThemes, emotionalTone) |

#### 2.3.2 Timestamp Handling

All domains use consistent timestamp patterns:

```typescript
// Standard temporal fields
{
  createdAt: number;      // Unix timestamp when entity was created
  recordedAt?: number;    // When the user says the event occurred
  occurredAt?: number;    // When the event actually happened (for trackers)
  startAt?: number;       // For episodes with duration
  endAt?: number;         // For episodes with duration
  loggedAt?: number;      // For retroactive entries
}
```

**Temporal Parsing Convention (from Event Logging):**
```typescript
// Relative time expressions
"yesterday" -> startOfDay(now) - 24h
"this morning" -> todayAt(timeWindow.morning)  // 05:00-10:00
"last week" -> startOfWeek(now) - 7d

// Absolute time with inference
"2:30pm" -> todayAt(14, 30)
"at 9am" -> todayAt(9, 0)
```

**CONFLICT NOTED:** While Event Logging defines comprehensive temporal parsing, other domains reference these rules without explicit documentation. Recommend centralizing temporal parsing specifications.

### 2.4 Parsing/Disambiguation Patterns

#### 2.4.1 Confidence Threshold Analysis

Confidence thresholds vary across domains and contexts:

| Context | Threshold | Domain Source |
|---------|-----------|---------------|
| Auto-accept (general) | 0.60 | Error Handling (UC-E001) |
| Dabbler-friendly parsing | 0.65 | Routines (UC-R001) |
| Low-confidence warning | < 0.30 | Error Handling (UC-E001) |
| Supplement name matching | 0.75 | Voice Input (UC-VOI-003) |
| Habit classification | 0.96 | Habits (UC-HAB-001) |
| Mood inference | 0.80 | Mood Tracking (UC-012) |

**CONFLICT IDENTIFIED:** No unified confidence threshold hierarchy exists. Different domains apply different thresholds for similar decisions.

**Recommended Standardization:**
```typescript
const CONFIDENCE_THRESHOLDS = {
  AUTO_ACCEPT_CREATION: 0.85,      // Create entity without confirmation
  SUGGEST_CONFIRMATION: 0.60,      // Show "Did you mean...?" prompt
  WARN_LOW_QUALITY: 0.40,          // Show quality warning
  REJECT_UNRELIABLE: 0.25,         // Refuse to create, offer retry

  // Persona adjustments
  DABBLER_REDUCTION: -0.15,        // Lower bar for Jordan
  OPTIMIZER_INCREASE: +0.05,       // Higher bar for Alex
};
```

#### 2.4.2 Classification Flow Patterns

All domains use a similar classification pipeline:

```
Voice Input → STT → Regex Pre-parse → LLM Classification → Entity Extraction → Validation → Storage
```

**Domain-Specific Classification Signals:**

| Domain | Primary Detection Signals |
|--------|--------------------------|
| Mood | "feeling", "mood", #mood(N), sentiment words |
| Habits | "did my", "completed", past tense + possessive |
| Workouts | Exercise vocabulary, sets/reps/weight patterns |
| Nutrition | Meal words, food items, "ate", "had for [meal]" |
| Events | Time anchors, duration, @mentions, location |
| Journaling | Narrative prose, reflection language, long-form |

**Multi-Entity Extraction:**
All domains support extracting multiple entity types from a single input:
```typescript
// Example: "Finished workout, feeling great, mood 8"
// Creates: WorkoutEntry + MoodEntry + TrackerLog
```

### 2.5 Gamification Patterns

#### 2.5.1 XP Calculation Formulas

**MAJOR CONFLICT IDENTIFIED:** XP calculation varies significantly across domains.

**Habits Domain Formula (Complex Multiplicative):**
```typescript
// From UC-HAB-001
Base XP = (difficulty/10) * (importance/10) * (duration/60) * 100
Total XP = Base * GoalMultiplier * StreakMultiplier * ChainBonus * TimeBonus
// Example: 13.3 * 1.8 * 1.47 * 1.10 * 1.10 = 38 XP
```

**Mood Tracking Formula (Additive):**
```typescript
// From UC-001
Base: 10 XP
Multi-dimensional bonus: +5 XP
Context bonus: +3 XP
Total before multiplier: 18 XP
Streak multiplier: 1.47x
Total: 18 * 1.47 = 26 XP
```

**Event Logging Formula (Multiplicative):**
```typescript
// From UC-EL-002
Base XP = (difficulty/10) * (importance/10) * (duration/60) * 100
// Example: (8/10) * (9/10) * (120/60) * 100 = 144 XP
With multipliers: 144 * 1.8 * 1.47 = 381 XP
```

**Dabbler Simplification:**
```typescript
// Simple mood log: 5 XP (no detailed breakdown shown)
// Quick mood log: 3 XP
// XP display: Hidden for Dabbler persona
```

**RECOMMENDATION:** Standardize XP formula across domains:
```typescript
interface XPCalculation {
  baseXP: number;               // Domain-specific base (3-20)
  complexityBonus?: number;     // +N for additional data
  contextBonus?: number;        // +N for linked context

  // Multipliers (apply sequentially)
  goalMultiplier: number;       // 1.0 - 2.0 based on linked goal importance
  streakMultiplier: number;     // 1.0 + (streakDays * 0.01), max 2.0
  chainMultiplier?: number;     // 1.0 + (position * 0.05) for routines

  // Calculation
  totalXP: baseXP + bonuses * productOfMultipliers
}
```

#### 2.5.2 Streak Handling

**Streak Maintenance Rules (from Habits):**
```typescript
// UC-HAB-005: Partial Habit Completion
Streak rules:
- >= 50% completion: Streak continues
- < 50% completion: Streak breaks unless protected
```

**Streak Protection Patterns:**
```typescript
// UC-HAB-003: Freeze Token
{
  freezeTokensUsed: 1,
  lastProtectedDate: '2026-01-18',
  streakAtProtection: 65
}

// Error Handling: Technical Failure
{
  streakAffected: false,
  reason: 'technical_failure'  // System absorbs impact
}

// Retroactive Entry (from Event Logging)
{
  retroactive: true,
  streakUpdate: { affected: false, reason: 'retroactive_entry' }
}
```

**CONFLICT NOTED:** The 50% threshold for streak maintenance is only explicitly defined in Habits. Other domains don't specify their streak rules, leading to potential inconsistency.

#### 2.5.3 Achievement Patterns

Achievements appear consistently across domains:

| Achievement Type | Example | Domain |
|-----------------|---------|--------|
| Milestone Count | "Mood Scientist" (100 multi-dimensional logs) | Mood |
| Streak-Based | "Streak Guardian" | Habits |
| Pattern Discovery | "Pattern Seeker" (first correlation query) | Mood |
| Consistency | "Weekly Warrior" (4 consecutive weekly reviews) | Mood |
| Completion | "Perfect Morning" (30 consecutive complete routines) | Habits |
| Category First | First habit in category bonus: +5 XP | Habits |

### 2.6 Architecture Patterns

#### 2.6.1 Batch API Convention

All domains use the same batch API pattern for multi-entity operations:

```typescript
const batch = await api.batch({
  operations: [
    { type: 'create', table: 'entries', data: entity1 },
    { type: 'create', table: 'tracker_logs', data: log1 },
    { type: 'create', table: 'tracker_logs', data: log2 }
  ]
});
```

#### 2.6.2 Storage Modes

Three storage modes appear across all domains:

```typescript
type StorageMode =
  | 'standard'     // Syncs to Supabase, AI processing enabled
  | 'local_only'   // SQLite only, never syncs
  | 'encrypted'    // E2E encrypted before sync, server cannot decrypt
```

**Implementation Variations:**

| Domain | Field Name | Values |
|--------|-----------|--------|
| Habits | storageMode | 'local_only' |
| Nutrition | syncStatus | 'local_only' |
| Mood | syncStatus | 'local_only' |
| Voice Input | privacyMode | 'whisper_detected' |

**CONFLICT:** Field naming is inconsistent (`storageMode` vs `syncStatus` vs `privacyMode`).

#### 2.6.3 API Endpoint Patterns

Consistent endpoint naming:
```
POST /api/v1/{domain}           # Create entity
PATCH /api/v1/{domain}/{id}     # Update entity
GET /api/v1/{domain}/{id}       # Get single entity
GET /api/v1/analytics/{domain}/trend    # Analytics queries
POST /api/v1/voice/transcribe   # Voice transcription
POST /api/v1/gamification/award-xp      # XP award
```

### 2.7 Privacy Implementation Patterns

#### 2.7.1 Privacy Tiers

Three consistent privacy tiers across domains:

**Standard (Default):**
- Data syncs to Supabase
- AI processing enabled
- Appears in analytics
- Cross-device sync active

**Local-Only:**
- SQLite storage only
- No cloud sync
- No AI processing (requires server)
- No cross-device availability

**E2E Encrypted:**
- AES-256-GCM encryption client-side
- Encrypted blob syncs to server
- Server stores only: encrypted content, timestamp, type
- Decryption requires user's master key
- Search indexing client-side only

#### 2.7.2 Privacy Trigger Detection

Phrases that trigger privacy modes:
```typescript
const PRIVACY_TRIGGERS = {
  local_only: ['local only', "don't sync", 'no cloud', 'keep on device'],
  encrypted: ['enhanced privacy', 'encrypt this', 'private note'],
  whisper: [/* detected via audio volume analysis */]
};
```

#### 2.7.3 Hidden Journal Tier

From Mood Tracking (UC-032):
```typescript
{
  privacyTier: 'hidden',
  requiresBiometricToView: true,
  hiddenFromTimeline: true,
  syncStatus: 'local_only'
}
```

This represents a fourth tier beyond the standard three, appearing only in Mood Tracking and Journaling domains.

---

## Part 3: Identified Conflicts and Contradictions

### 3.1 Critical Conflicts (Must Resolve Before Implementation)

#### CONFLICT-001: XP Calculation Formula Inconsistency

**Description:** XP calculation uses fundamentally different formulas across domains.

**Evidence:**
- Habits: `(difficulty/10) * (importance/10) * (duration/60) * 100 * multipliers`
- Mood: `baseXP + bonuses * streakMultiplier`
- Events: Same formula as Habits

**Impact:** Users will experience inconsistent reward feelings. The same effort may yield vastly different XP depending on domain.

**Resolution Recommendation:**
1. Standardize on the multiplicative formula for duration-based activities
2. Use additive bonus structure for non-duration activities
3. Document per-domain base XP values in a central specification

#### CONFLICT-002: Confidence Threshold Fragmentation

**Description:** Different domains use different confidence thresholds for similar decisions.

**Evidence:**
- 0.96 for habit classification (very strict)
- 0.65 for Dabbler-friendly parsing (lenient)
- 0.30 for warning triggers
- 0.60 for general auto-accept

**Impact:** Classification behavior will be unpredictable across domains.

**Resolution Recommendation:**
Create a central `CONFIDENCE_CONFIG` with:
- Domain-specific base thresholds
- Persona adjustment factors
- Action-specific overrides (create vs suggest vs warn)

#### CONFLICT-003: Storage Mode Field Naming

**Description:** The field indicating storage mode has different names.

**Evidence:**
- `storageMode` in Habits
- `syncStatus` in Mood and Nutrition
- `privacyMode` in Voice Input

**Impact:** Query and filtering logic must handle multiple field names.

**Resolution Recommendation:**
Standardize on `privacyTier` as the canonical field name across all schemas.

### 3.2 Moderate Conflicts (Should Resolve Before Beta)

#### CONFLICT-004: Streak Threshold Ambiguity

**Description:** Only Habits domain explicitly defines the 50% threshold for streak maintenance. Other domains reference streaks without defining maintenance rules.

**Resolution:** Document universal streak rules or domain-specific variations.

#### CONFLICT-005: Retroactive Entry XP Handling

**Description:** Event Logging explicitly says retroactive entries get no multipliers. Other domains don't address this.

**Resolution:** Create universal retroactive entry policy.

#### CONFLICT-006: Persona XP Visibility

**Description:** Dabbler should see no XP details, but the exact rules for what to show/hide vary.

**Resolution:** Create persona-specific gamification visibility matrix.

### 3.3 Minor Conflicts (Can Resolve During Development)

#### CONFLICT-007: Use Case ID Prefix Inconsistency

**Description:** Food/Nutrition uses persona-prefixed IDs (OPTI-FOOD-001) while others use sequential numbering (UC-HAB-001).

**Impact:** Minor documentation navigation issue only.

#### CONFLICT-008: Emotion/Sentiment Vocabulary

**Description:** Different domains map sentiment words to different rating scales.

**Example:**
- Mood: "pretty good" = 7/10
- Mood: "okay" = 5/10

**Resolution:** Create unified sentiment-to-rating mapping table.

---

## Part 4: Cross-Domain Interactions and Dependencies

### 4.1 Voice Input Edge Cases (Phase 2H) → All Domains

Voice Input Edge Cases is a **universal dependency** affecting all other domains.

**Impact Areas:**
1. Environmental noise handling applies to all voice captures
2. Interruption recovery patterns apply universally
3. Accent/dialect correction affects all domain vocabulary
4. Multilingual mixing rules apply everywhere
5. Self-correction parsing ("no wait, actually...") applies to all input

**Integration Points:**
```typescript
// All domains must handle partial capture
interface PartialCapture {
  partialTranscript: string;
  interruptionReason: string;
  completionSuggestions: Suggestion[];
  status: 'awaiting_completion';
}

// All domains must handle low-confidence transcription
interface TranscriptionResult {
  text: string;
  confidence: number;
  missingFields: string[];
  audioQuality: 'good' | 'degraded' | 'poor';
}
```

### 4.2 Error Handling (Phase 2I) → All Domains

Error Handling is another **universal dependency**.

**Key Principles Applied Everywhere:**
1. No data loss: User input always preserved
2. Graceful degradation: Features fail with alternatives
3. Persona-appropriate messaging: Match user sophistication
4. Gamification protection: Technical failures never break streaks
5. Recovery-first design: Every error has resolution path

**Integration Pattern:**
```typescript
// All domain operations should wrap with error handling
async function createEntity(data: EntityData): Promise<Result<Entity, DomainError>> {
  try {
    const entity = await api.create(data);
    return { success: true, data: entity };
  } catch (error) {
    // Preserve user input
    await errorQueue.enqueue({
      originalInput: data,
      error: classifyError(error),
      retryable: isRetryable(error)
    });

    // Protect gamification
    if (wasStreakAtRisk()) {
      await streakProtection.applyGracePeriod();
    }

    return { success: false, error: domainError };
  }
}
```

### 4.3 Mood Tracking ↔ Other Domains (Correlation)

Mood tracking creates correlation links to multiple domains:

**Mood → Workouts:**
```typescript
// UC-008: Mood After Specific Activity
{
  linkedActivityId: 'workout-uuid',
  linkedActivityType: 'workout',
  context: 'Post-workout, endorphin effect'
}

// Correlation query: "What's my average mood on workout days vs rest days?"
```

**Mood → Habits:**
```typescript
// Mood entry with triggers
{
  triggers: ['meditation', 'cold_exposure'],
  // Links to recent habit completions
}
```

**Mood → Nutrition:**
```typescript
// Tracking mood impact of food
{
  context: 'Post-lunch dip',
  triggers: ['post_lunch', 'afternoon']
}
```

**Mood → Journaling:**
```typescript
// Journal with inferred mood
{
  moodRating: 8,  // Inferred from content
  emotions: ['excited', 'optimistic']
}
```

### 4.4 Routines → Habits (Aggregation)

Routines aggregate multiple habits with chain bonuses:

```typescript
// From UC-HAB-004: Habit Stacking/Chaining in Morning Routine
const habitInstances = [
  { habitDefinitionId: 'meditation-id', chainPosition: 1, routineId: 'morning-id' },
  { habitDefinitionId: 'cold-shower-id', chainPosition: 2, routineId: 'morning-id' },
  { habitDefinitionId: 'journaling-id', chainPosition: 3, routineId: 'morning-id' }
];

const routineCompletion = {
  routineId: 'morning-routine-id',
  habitsCompleted: 3,
  totalHabits: 3,
  completionRate: 1.0,
  chainBonus: true
};

// Chain multiplier: +5% per subsequent habit
// XP: 16 + 13 + 12 + 20 (routine bonus) = 61 XP
```

### 4.5 Event Logging → Multiple Domains (Batch Capture)

Event Logging supports batch capture that creates entities across domains:

```typescript
// From UC-EL-001: Batch Event Capture
// Single voice input creates:
- 4 MobileEvents (coffee, supplements, journaling, meeting)
- 3 TrackerLogs (mood: 8, energy: 7, focus: 8)

// Temporal parsing resolves relative references:
// "at 6:30", "at 6:45", "at 9am"
```

### 4.6 Temporal Parsing → All Domains

The temporal parsing rules from Event Logging apply universally:

```typescript
// Time resolution patterns
"yesterday at 7pm" → yesterdayAt(19, 0)
"this morning" → todayAt(morningWindow)
"2:30pm" → todayAt(14, 30)
"for 45 minutes" → durationMinutes: 45

// Retroactive handling
if (daysBetween(startAt, now) > 0) {
  entity.frontmatter.retroactive = true;
  streakUpdate.affected = false;
}
```

---

## Part 5: Persona-Specific Patterns

### 5.1 The Optimizer (Alex)

**Interaction Patterns:**
- Multi-dimensional data capture with precise timestamps
- Correlation queries ("Show mood on workout days vs rest days")
- Goal setting with specific metrics
- Batch capture of morning routines
- Detailed XP breakdown visibility

**Data Expectations:**
- All dimensions tracked (mood, energy, focus, motivation, anxiety)
- Exact timestamps, not "this morning"
- Duration precision in minutes
- Linked activities with context
- Weekly and monthly trend analysis

**Gamification Visibility:**
- Full XP breakdown shown
- Streak counter prominent
- Achievement progress visible
- Correlation insights surfaced

**Example Input:**
> "Quick mood check. Mood 7, energy 8, anxiety 2, focus 9, motivation 8. Feeling dialed in after morning meditation and cold plunge."

### 5.2 The Dabbler (Jordan)

**Interaction Patterns:**
- Simple, low-friction inputs
- Emoji-based quick capture
- Inferred values from natural language
- No pressure for completeness
- Graceful handling of absence

**Data Expectations:**
- Single value sufficient ("feeling good")
- No numeric precision required
- Context optional, not required
- Qualitative over quantitative

**Gamification Visibility:**
- XP hidden or minimal ("Logged!")
- No streak pressure
- No shame for gaps
- Welcome back warmly

**Example Input:**
> "Feeling pretty good today."
>
> System infers: Rating 7, emotions: [content, positive]

### 5.3 The Privacy-First Guardian (Morgan)

**Interaction Patterns:**
- Explicit privacy mode triggers
- Local-only storage requests
- E2E encryption for sensitive content
- Data export requests
- Audit queries about data location

**Privacy Features:**
```typescript
- syncStatus: 'local_only'
- aiProcessing: false
- excludeFromReflections: true
- excludeFromCorrelations: true
- encryptedContent: 'AES256_blob'
- transcriptStored: false
```

**Transparency Expectations:**
- Clear explanation of data flow
- Data inventory on request
- Deletion with confirmation certificate
- Voice processing location disclosure

**Example Input:**
> "Mood is 6 today. Keep it local only, don't sync."

### 5.4 The Neurodivergent Accommodator (Riley)

**Interaction Patterns:**
- Stream-of-consciousness input with self-correction
- Memory uncertainty ("did I already log this?")
- Task paralysis states
- Medication effect tracking
- Time blindness accommodation

**System Accommodations:**
```typescript
// Self-correction handling
detectSelfCorrections(input); // ["No wait", "actually"]
applyCorrections(numbers, corrections);

// Memory assistance
if (isMemoryQuery(input)) {
  const existing = await getToday();
  // Non-judgmental factual response
}

// Paralysis support
if (detectParalysisState(input)) {
  // Supportive, not demanding
  // Suggest tiny tasks or body doubling
}

// Speech disfluency handling
// CRITICAL: Do not log or analyze stutter patterns
```

**Gamification Approach:**
- No punishment for incomplete thoughts
- XP for logging during difficult states
- No pressure messaging
- Celebrate capture attempts

**Example Input:**
> "I don't know, I guess I'm feeling kind of overwhelmed but also like there's this excitement about the project, but the overwhelm is more prominent, maybe a 4 or 5? No wait, probably a 4 because the anxiety is pretty high, like maybe an 8 for anxiety, but overall I'm surviving."

### 5.5 The Biohacker (Sam)

**Interaction Patterns:**
- Precise supplement tracking with dosages
- Device integration (HRV, CGM, Oura)
- Multi-variable experiments
- Correlation analysis across metrics
- Protocol adherence tracking

**Data Precision:**
```typescript
{
  supplements: [
    { name: 'Ashwagandha', dose: 500, unit: 'mg', timing: 'morning' },
    { name: 'Lion\'s Mane', dose: 1000, unit: 'mg', timing: 'morning' }
  ],
  biometrics: {
    hrv: 52,
    restingHR: 58,
    bloodGlucose: 95
  }
}
```

**Integration Points:**
- Apple Health import
- Oura ring sync
- Whoop data
- CGM readings

**Example Input:**
> "Morning stack: 500mg ashwagandha, 1000mg lion's mane, 2g omega-3. HRV was 52, slept 7:32. Glucose reading was 95."

### 5.6 The Reflector (Casey)

**Interaction Patterns:**
- Long-form journal entries
- Weekly reflection requests
- Pattern identification queries
- Gratitude logging
- Insight synthesis

**Content Expectations:**
- Narrative prose, not metrics
- Emotional processing focus
- Temporal perspective (looking back)
- Theme extraction
- Weekly summaries

**Example Input:**
> "Looking back at this week, I've noticed that my best days were the ones where I started with meditation. There's a clear pattern - when I skip the morning routine, my energy crashes by 2pm. I want to be more intentional about this next week."

---

## Part 6: Recommendations for Standardization

### 6.1 Immediate Actions (Before Implementation)

#### 6.1.1 Create Central XP Calculation Specification

```typescript
// packages/shared/src/gamification/xp.ts

interface XPConfig {
  // Base values by activity type
  bases: {
    trivialLog: 3,        // coffee, simple note
    standardLog: 5,       // mood check, single habit
    richLog: 10,          // multi-dimensional mood
    comprehensiveLog: 15, // workout with metrics
    complexActivity: 20,  // deep work session
  },

  // Duration bonus (for timed activities)
  durationFormula: (minutes: number) => Math.min(minutes / 60, 2) * 10,

  // Multipliers
  multipliers: {
    goal: (importance: number) => 1 + (importance / 10),
    streak: (days: number) => 1 + Math.min(days * 0.01, 1.0),
    chain: (position: number) => 1 + (position * 0.05),
    time: (withinWindow: boolean) => withinWindow ? 1.10 : 1.0,
  },

  // Persona visibility
  visibility: {
    optimizer: 'full',       // Show all details
    dabbler: 'hidden',       // Just show checkmark
    privacyFirst: 'minimal', // Show count only
    neurodivergent: 'gentle', // Show without pressure
    biohacker: 'full',       // Show all metrics
    reflector: 'summary',    // Show weekly totals
  }
}
```

#### 6.1.2 Create Central Confidence Threshold Specification

```typescript
// packages/shared/src/parsing/confidence.ts

interface ConfidenceConfig {
  thresholds: {
    autoCreate: 0.85,      // Create without confirmation
    suggestConfirm: 0.65,  // Show confirmation prompt
    warnLowQuality: 0.40,  // Show quality warning
    rejectUnreliable: 0.25, // Refuse, offer retry
  },

  personaAdjustments: {
    optimizer: +0.05,      // Higher bar
    dabbler: -0.15,        // Lower bar
    privacyFirst: 0,       // Standard
    neurodivergent: -0.10, // More forgiving
    biohacker: +0.05,      // Higher bar
    reflector: -0.05,      // Slightly forgiving
  },

  domainOverrides: {
    supplements: +0.10,    // Critical accuracy
    medication: +0.15,     // Safety-critical
    mood: -0.05,           // Subjective OK
    journal: -0.10,        // Narrative OK
  }
}
```

#### 6.1.3 Standardize Privacy Field Naming

```typescript
// packages/shared/src/types/privacy.ts

interface PrivacySettings {
  privacyTier: 'standard' | 'local_only' | 'encrypted' | 'hidden';
  aiProcessing: boolean;
  includeInCorrelations: boolean;
  includeInReflections: boolean;
  transcriptRetention: boolean;
  requiresBiometric?: boolean;
}

// Migration: Rename all storageMode, syncStatus, privacyMode to privacyTier
```

### 6.2 Pre-Beta Actions

#### 6.2.1 Document Universal Streak Rules

```typescript
// packages/shared/src/gamification/streaks.ts

interface StreakPolicy {
  // Maintenance thresholds
  maintenanceRules: {
    fullCompletion: 1.0,     // 100% = normal streak
    partialThreshold: 0.5,   // >= 50% = streak continues
    belowThreshold: 'break', // < 50% = streak breaks (unless protected)
  },

  // Protection mechanisms
  protection: {
    freezeTokens: {
      maxPerMonth: 3,
      graceAfterUse: 24, // hours
    },
    technicalFailure: {
      automaticProtection: true,
      gracePeriod: 2, // hours extended
    },
    retroactiveEntry: {
      affectsStreak: false,
      reason: 'retroactive_entry',
    },
  },

  // Universal across all domains
  applyTo: ['habits', 'mood', 'workouts', 'journaling', 'routines'],
}
```

#### 6.2.2 Create Persona Gamification Matrix

| Feature | Optimizer | Dabbler | Privacy-First | Neurodivergent | Biohacker | Reflector |
|---------|-----------|---------|---------------|----------------|-----------|-----------|
| XP Display | Full breakdown | Hidden | Count only | Gentle | Full metrics | Weekly summary |
| Streak Display | Prominent | Hidden | Count only | Hidden | Prominent | Weekly only |
| Achievement Toasts | Always | Never | Rare | Gentle | Always | Weekly batch |
| Leaderboards | Visible | Hidden | Opt-in | Hidden | Visible | Hidden |
| Correlation Insights | Proactive | On-request | Disabled | Gentle | Proactive | Weekly |
| Streak Break Message | Stats-focused | None | None | Supportive | Stats-focused | Reflective |

### 6.3 Development Phase Actions

#### 6.3.1 Create Cross-Domain Event Bus

```typescript
// packages/shared/src/events/domainEvents.ts

type DomainEvent =
  | { type: 'MOOD_LOGGED'; payload: { rating: number; linkedTo?: string[] } }
  | { type: 'HABIT_COMPLETED'; payload: { habitId: string; routineId?: string } }
  | { type: 'WORKOUT_FINISHED'; payload: { sessionId: string; metrics: WorkoutMetrics } }
  | { type: 'JOURNAL_CREATED'; payload: { entryId: string; extractedMood?: number } }
  | { type: 'VOICE_CAPTURE_FAILED'; payload: { error: VoiceCaptureError } }
  | { type: 'STREAK_AT_RISK'; payload: { habitId: string; deadline: number } };

// Subscribe for cross-domain correlation
eventBus.subscribe('WORKOUT_FINISHED', async (event) => {
  await correlationEngine.queueAnalysis({
    primaryEntity: event.payload.sessionId,
    lookForMoodWithin: 2 * 60 * 60 * 1000, // 2 hours
  });
});
```

#### 6.3.2 Unified Temporal Parsing Service

```typescript
// packages/shared/src/temporal/parser.ts

class TemporalParser {
  parse(input: string, context: ParseContext): TemporalResult {
    // Relative expressions
    // "yesterday" -> startOfDay(now) - 24h
    // "this morning" -> todayAt(morningWindow)
    // "last week" -> startOfWeek(now) - 7d

    // Absolute expressions
    // "2:30pm" -> todayAt(14, 30)
    // "at 9am" -> todayAt(9, 0)
    // "7 to 9pm" -> { start: 19:00, end: 21:00 }

    // Retroactive detection
    if (this.isRetroactive(result)) {
      result.retroactive = true;
      result.streakAffected = false;
    }
  }
}

// Single instance used by all domains
export const temporalParser = new TemporalParser();
```

---

## Part 7: Quality Metrics and Validation

### 7.1 Consistency Metrics

| Metric | Score | Notes |
|--------|-------|-------|
| Template Adherence | 100% | All 603 use cases follow 5-section template |
| Persona Coverage | 100% | All 6 personas represented in all 9 domains |
| TypeScript Schema Consistency | 85% | Minor field naming variations |
| XP Formula Consistency | 60% | Significant variation (CONFLICT-001) |
| Confidence Threshold Consistency | 50% | Fragmented thresholds (CONFLICT-002) |
| Privacy Implementation Consistency | 80% | Field naming inconsistent (CONFLICT-003) |
| Error Handling Coverage | 95% | Voice Input + Error Handling comprehensive |

### 7.2 Cross-Reference Validation

| Cross-Reference | Status | Notes |
|-----------------|--------|-------|
| Voice Input → All Domains | Validated | All domains can receive voice input |
| Error Handling → All Domains | Validated | Principles apply universally |
| Mood → Workout Correlation | Validated | `linkedActivityId` pattern exists |
| Routine → Habit Aggregation | Validated | `routineId` linkage defined |
| Event → Multi-Entity Batch | Validated | Batch API pattern consistent |
| Temporal Parsing → All Domains | Partially | Implicit in all, explicit only in Event Logging |

### 7.3 Conflict Resolution Priority

| Conflict ID | Priority | Effort | Impact |
|-------------|----------|--------|--------|
| CONFLICT-001 (XP Formula) | P0 | Medium | High - User experience |
| CONFLICT-002 (Confidence) | P0 | Medium | High - Classification behavior |
| CONFLICT-003 (Storage Field) | P1 | Low | Medium - Query complexity |
| CONFLICT-004 (Streak Rules) | P1 | Low | Medium - Consistency |
| CONFLICT-005 (Retroactive XP) | P2 | Low | Low - Edge case |
| CONFLICT-006 (Persona Visibility) | P1 | Medium | Medium - UX |
| CONFLICT-007 (ID Prefix) | P3 | N/A | None - Documentation only |
| CONFLICT-008 (Sentiment Vocab) | P2 | Low | Low - Minor variation |

---

## Part 8: Appendices

### Appendix A: Complete Entity Type Catalog

```typescript
// Core Entities (all domains)
MobileEvent
TrackerLog
TrackerDefinition

// Mood Domain
MoodEntry
MoodCorrelationQuery

// Habits Domain
HabitDefinition
HabitInstance
StreakProtectionLog
RoutineCompletion

// Workouts Domain
WorkoutEntry
WorkoutSession
ExerciseLog

// Nutrition Domain
NutritionLog
FoodItem
DailyNutritionSummary

// Journaling Domain
JournalEntry

// Voice Input Domain
VoiceCaptureError
PartialCapture
TranscriptionCorrection

// Error Handling Domain
CaptureError
PartialCapture
RecoveryQueue
```

### Appendix B: Persona Quick Reference

| Persona | Name | Key Trait | XP Visibility | Streak Pressure |
|---------|------|-----------|---------------|-----------------|
| Optimizer | Alex | Data-rich precision | Full | High |
| Dabbler | Jordan | Low friction simplicity | Hidden | None |
| Privacy-First | Morgan | Data sovereignty | Minimal | Low |
| Neurodivergent | Riley | Accommodation first | Gentle | None |
| Biohacker | Sam | Quantified metrics | Full | High |
| Reflector | Casey | Long-form insight | Summary | Low |

### Appendix C: Domain Use Case Count Summary

| Domain | Total | Optimizer | Dabbler | Privacy | ND | Biohacker | Reflector |
|--------|-------|-----------|---------|---------|-----|-----------|-----------|
| Mood | 67 | 11 | 11 | 11 | 12 | 11 | 11 |
| Events | 67 | 11 | 11 | 11 | 12 | 11 | 11 |
| Workouts | 67 | 11 | 11 | 11 | 12 | 11 | 11 |
| Nutrition | 67 | 11 | 11 | 11 | 11 | 12 | 11 |
| Habits | 67 | 11 | 11 | 11 | 11 | 12 | 11 |
| Routines | 67 | 11 | 11 | 11 | 12 | 11 | 11 |
| Journaling | 67 | 11 | 11 | 11 | 12 | 11 | 11 |
| Voice Input | 67 | 11 | 11 | 11 | 12 | 11 | 11 |
| Error Handling | 67 | 11 | 11 | 11 | 12 | 11 | 11 |
| **Total** | **603** | **99** | **99** | **99** | **106** | **101** | **99** |

---

## Conclusion

This cross-domain synthesis analysis of Insight 5.2's Phase 2 specifications reveals a fundamentally sound architecture with consistent patterns across nine domains and 603 use cases. The standardized 5-section template, six-persona distribution, and core architectural patterns (batch API, local-first, graceful degradation) provide a solid foundation.

However, three critical conflicts require immediate resolution before implementation:
1. **XP calculation formula inconsistency** threatens user experience coherence
2. **Confidence threshold fragmentation** will cause unpredictable classification behavior
3. **Privacy field naming variations** will complicate query and filtering logic

The cross-domain dependencies are well-designed, with Voice Input Edge Cases and Error Handling appropriately positioned as universal concerns affecting all feature domains. The persona-specific patterns are thoughtfully differentiated, particularly the neurodivergent accommodations that prioritize psychological safety over data precision.

With the recommended standardization actions implemented, Insight 5.2 will have a cohesive, predictable, and persona-appropriate experience across all domains.

---

## Part 9: Cross-Domain Interaction Matrix

This section provides detailed matrices showing how each domain interacts with others, including data flows, shared patterns, and potential conflict points.

### 9.0.1 Primary Interaction Matrix

| Source Domain | Target Domain | Interaction Type | Data Flow | Conflict Risk |
|--------------|---------------|------------------|-----------|---------------|
| Mood | Workouts | Correlation | Mood entries linked via `linkedActivityId` | Low |
| Mood | Nutrition | Correlation | Mood entries linked via trigger attribution | Low |
| Mood | Journaling | Inference | Mood inferred from journal sentiment | Medium |
| Mood | Habits | Correlation | Mood correlated with habit completion | Low |
| Workouts | Mood | Auto-prompt | Post-workout mood check optional prompt | Low |
| Workouts | Habits | Completion | Workout can complete linked habit | Medium |
| Habits | Routines | Aggregation | Habits aggregated into routine completion | High |
| Habits | Gamification | XP Award | Habit completion triggers XP calculation | Medium |
| Routines | Habits | Chain Bonus | Routine position affects habit XP | Medium |
| Event Logging | All | Temporal | All domains use Event Logging's temporal parser | Low |
| Voice Input | All | Processing | All voice input passes through Voice Input patterns | Low |
| Error Handling | All | Recovery | All errors handled by Error Handling patterns | Low |
| Journaling | Mood | Extraction | Journal entries can create mood entries | Medium |
| Journaling | Events | Extraction | Journal can reference events | Low |
| Nutrition | Mood | Correlation | Food choices correlated with mood | Low |
| Nutrition | Habits | Completion | Nutrition log can complete linked habit | Low |

### 9.0.2 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VOICE INPUT LAYER                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  STT     │→│ Quality  │→│ Partial  │→│ Self-    │           │
│  │ Engine   │  │ Checker  │  │ Recovery │  │ Correct  │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CLASSIFICATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ LLM Classifier: Mood | Event | Workout | Nutrition | Habit   │  │
│  │                 Routine | Journal | Query | Command          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
        ┌──────────┬─────────┼─────────┬──────────┬──────────┐
        ▼          ▼         ▼         ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │  Mood  │ │ Event  │ │Workout │ │Nutrition│ │ Habit  │ │Journal │
   │ Domain │ │ Domain │ │ Domain │ │ Domain │ │ Domain │ │ Domain │
   └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
       │          │          │          │          │          │
       └──────────┴──────────┴──────────┼──────────┴──────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     GAMIFICATION LAYER                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ XP Engine  │  │  Streak    │  │ Achievement│  │ Leaderboard│   │
│  │            │  │ Manager    │  │  Tracker   │  │  (optional)│   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CORRELATION LAYER                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Pattern Engine: Mood correlations, habit effectiveness,     │  │
│  │                 workout impact, nutrition effects           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     STORAGE LAYER                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                   │
│  │   Local    │  │  Encrypted │  │   Cloud    │                   │
│  │  SQLite    │  │   Sync     │  │  Supabase  │                   │
│  │ (local_only)│ │(encrypted) │  │ (standard) │                   │
│  └────────────┘  └────────────┘  └────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.0.3 Conflict Resolution Matrix

When multiple domains could claim an input, the following priority order applies:

| Priority | Domain | Trigger Signals | Confidence Boost |
|----------|--------|-----------------|------------------|
| 1 | Explicit Command | "Create habit", "Log workout" | +0.30 |
| 2 | Query | "Show me", "What's my", "How" | +0.25 |
| 3 | Workout | Exercise vocabulary, sets/reps/weight | +0.20 |
| 4 | Nutrition | Meal words, food items, "ate", "had" | +0.15 |
| 5 | Habit | Past tense + possession ("did my") | +0.10 |
| 6 | Mood | "feeling", #mood, sentiment words | +0.10 |
| 7 | Event | Time anchors, @mentions, location | +0.05 |
| 8 | Journal | Long-form, narrative, reflection | 0 |

**Multi-Entity Resolution:**
When input contains signals for multiple domains, extract entities for all relevant domains:
```typescript
// Input: "Finished my workout, feeling great, mood is 8"
// Creates: WorkoutEntry + MoodEntry + TrackerLog
// Not a conflict - all entities created
```

### 9.0.4 Shared Component Dependencies

| Shared Component | Consuming Domains | Purpose |
|-----------------|-------------------|---------|
| Temporal Parser | All | Convert time expressions to timestamps |
| Person Resolver | Events, Workouts, Journaling | Resolve @mentions |
| Location Resolver | Events, Workouts, Nutrition | Resolve place references |
| Sentiment Analyzer | Mood, Journaling | Extract emotional tone |
| Fuzzy Matcher | Workouts, Nutrition, Habits | Match vocabulary with typos |
| XP Calculator | All except Voice Input, Error | Calculate experience points |
| Streak Manager | Habits, Mood, Journaling | Track and protect streaks |
| Privacy Enforcer | All | Apply privacy tier rules |
| Error Handler | All | Handle failures consistently |
| Recovery Queue | All | Store failed operations for retry |

---

## Part 9.A: Detailed Domain-by-Domain Analysis

### 9.1 Mood Tracking Domain Deep Dive

The Mood Tracking domain (Phase 2A) establishes foundational patterns for subjective state capture that influence several other domains. With 67 use cases across all six personas, this domain demonstrates the core tension between quantitative precision (Optimizer's multi-dimensional ratings) and qualitative simplicity (Dabbler's "feeling good today").

**Key Patterns Established:**

1. **Multi-Dimensional State Capture:**
   The Optimizer persona's use cases establish a pattern for capturing multiple related metrics in a single input:
   ```typescript
   // UC-001: "Mood 7, energy 8, anxiety 2, focus 9, motivation 8"
   dimensions: {
     energy: 8,
     anxiety: 2,
     focus: 9,
     motivation: 8,
     sociability: null  // Optional dimension
   }
   ```
   This multi-dimensional pattern recurs in Workouts (sets/reps/weight), Nutrition (macros), and Biohacker tracking.

2. **Sentiment-to-Rating Inference:**
   The Dabbler use cases establish the critical mapping between qualitative expressions and numeric ratings:
   ```typescript
   const MOOD_MAPPINGS = {
     'terrible': 1, 'awful': 2, 'bad': 3, 'not great': 4,
     'okay': 5, 'alright': 5, 'fine': 6, 'good': 7,
     'pretty good': 7, 'great': 8, 'amazing': 9, 'fantastic': 10
   };
   ```
   This pattern applies to any domain where users express subjective states verbally.

3. **Trigger Attribution:**
   Mood entries support linking to causal factors, establishing a pattern used across domains:
   ```typescript
   triggers: ['meditation', 'cold_exposure', 'work_stress', 'poor_sleep']
   ```
   This enables the correlation engine to identify patterns like "mood is 1.8 points higher after workouts."

4. **Privacy Tiers:**
   Mood tracking introduces all three privacy tiers with particular emphasis on the "hidden" tier for sensitive content:
   ```typescript
   privacyTier: 'hidden',
   requiresBiometricToView: true,
   hiddenFromTimeline: true
   ```

**Cross-Domain Influence:**
- Mood rating scale (1-10) becomes the standard for all subjective metrics
- Trigger attribution pattern used in Habits, Workouts, and Journaling
- Emotion extraction vocabulary shared with Journaling
- Correlation query patterns defined here apply to all analytics

### 9.2 Event Logging Domain Deep Dive

The Event Logging domain (Phase 2B) serves as the canonical source for temporal parsing rules and multi-entity extraction patterns. This domain handles the broadest variety of input types, from simple logs ("had coffee at 6:30") to complex social events with multiple participants, locations, and durations.

**Key Patterns Established:**

1. **Temporal Parsing Rules:**
   Event Logging defines comprehensive temporal resolution that all domains inherit:
   ```typescript
   // Relative expressions
   "yesterday" → startOfDay(now) - 24h
   "this morning" → todayAt(5, 0) to todayAt(10, 0)
   "last week" → startOfWeek(now) - 7d
   "in two hours" → now + 2h

   // Absolute expressions
   "2:30pm" → todayAt(14, 30)
   "9am" → todayAt(9, 0)
   "7 to 9pm" → { start: todayAt(19, 0), end: todayAt(21, 0) }

   // Contextual inference
   "this morning at 7" → todayAt(7, 0)
   "tonight at 9" → todayAt(21, 0)
   ```

2. **Multi-Entity Batch Extraction:**
   The batch capture pattern (UC-EL-001) establishes how a single voice input can create multiple entities:
   ```typescript
   // Input: "Morning update. Had coffee at 6:30, took supplements at 6:45,
   //         did 20 minutes of journaling. Then had a 1-on-1 with @sarah
   //         at 9am for 45 minutes. #mood(8) #energy(7) #focus(8)."

   // Creates:
   - MobileEvent (coffee)
   - MobileEvent (supplements)
   - MobileEvent (journaling) with duration
   - MobileEvent (meeting) with person + duration
   - TrackerLog (mood: 8)
   - TrackerLog (energy: 7)
   - TrackerLog (focus: 8)
   ```

3. **Retroactive Entry Handling:**
   Event Logging defines how retroactive entries are processed:
   ```typescript
   if (daysBetween(event.startAt, now()) > 0) {
     event.frontmatter.retroactive = true;
     event.frontmatter.loggedAt = Date.now();
     streakUpdate = { affected: false, reason: 'retroactive_entry' };
   }
   ```
   This pattern must be applied consistently across all domains.

4. **Location and Person Resolution:**
   The domain establishes patterns for resolving @mentions and locations:
   ```typescript
   // @mentions
   people: ['sarah', 'david']  // Resolved against People database

   // Locations
   location: await resolvePlaceReference('wework downtown');
   // Returns: { id: 'wework_downtown', name: 'WeWork Downtown', placeType: 'work' }
   ```

**Cross-Domain Influence:**
- Temporal parsing rules apply universally
- Batch entity creation pattern used in all domains
- Retroactive entry handling must be consistent
- Person/location resolution available to all domains

### 9.3 Workouts Domain Deep Dive

The Workouts domain (Phase 2C) handles the most structured data capture scenarios, with complex nested entities for exercises, sets, and workout sessions. This domain showcases how to handle hierarchical data while maintaining voice-friendly input patterns.

**Key Patterns Established:**

1. **Hierarchical Entity Structure:**
   ```typescript
   WorkoutSession {
     id: 'session-uuid',
     exercises: [
       {
         name: 'bench_press',
         sets: [
           { reps: 8, weight: 185, restSeconds: 90 },
           { reps: 8, weight: 185, restSeconds: 90 },
           { reps: 6, weight: 195, restSeconds: 120 }  // AMRAP set
         ]
       }
     ],
     totalDuration: 45,
     totalVolume: 4440  // lbs
   }
   ```

2. **Exercise Vocabulary Matching:**
   The domain maintains a comprehensive exercise dictionary with fuzzy matching:
   ```typescript
   const exerciseAliases = {
     'bench': ['bench_press', 'flat_bench', 'bb_bench'],
     'squat': ['back_squat', 'barbell_squat', 'bb_squat'],
     'deadlift': ['conventional_dl', 'sumo_deadlift', 'dl']
   };
   ```

3. **Device Integration Patterns:**
   Biohacker use cases establish patterns for integrating external device data:
   ```typescript
   deviceIntegration: {
     source: 'apple_health',
     metrics: {
       heartRate: { avg: 145, max: 172 },
       calories: 450,
       activeMinutes: 42
     },
     syncedAt: Date.now()
   }
   ```

4. **PR (Personal Record) Detection:**
   The domain automatically detects and celebrates personal records:
   ```typescript
   if (weight > previousMax || reps > previousMaxReps) {
     prDetected: true,
     prType: 'weight' | 'reps' | 'volume',
     previousRecord: { weight: 180, date: '2025-12-15' }
   }
   ```

**Cross-Domain Influence:**
- Hierarchical entity pattern applicable to Routines (steps) and Nutrition (meals/items)
- Device integration pattern reusable for sleep, HRV, and CGM data
- Achievement detection pattern (PR) generalizable to other domains

### 9.4 Food/Nutrition Domain Deep Dive

The Food/Nutrition domain (Phase 2D) handles the most varied natural language input, with users describing meals ranging from "just coffee" to elaborate home-cooked recipes. This domain emphasizes graceful handling of imprecise input.

**Key Patterns Established:**

1. **Fuzzy Food Item Matching:**
   ```typescript
   // Input: "had a turkey samwich and chips"
   // Matched: "turkey sandwich" (85% confidence)

   const fuzzyMatch = await nutritionDatabase.search({
     query: input,
     maxDistance: 2,  // Levenshtein
     minConfidence: 0.6
   });
   ```

2. **Macro Estimation with Uncertainty:**
   When exact macros aren't provided, the system estimates with confidence levels:
   ```typescript
   macroEstimate: {
     calories: { value: 350, confidence: 0.4, source: 'ai_estimate' },
     protein: { value: 15, confidence: 0.3, source: 'generic_match' },
     carbs: { value: 20, confidence: 0.3, source: 'generic_match' }
   }
   ```

3. **Nutritionix Integration (Optional):**
   External validation available for users who want precision:
   ```typescript
   if (user.preferences.validateWithNutritionix) {
     const validated = await nutritionixApi.lookup(items);
     // Show side-by-side if difference > 10%
   }
   ```

4. **Dabbler-Friendly Minimal Logging:**
   The domain supports extremely minimal input:
   ```typescript
   // Input: "Lunch."
   // Creates: NutritionLog { mealType: 'lunch', items: [], notes: '' }
   // No calories, no specifics—just the acknowledgment
   ```

**Cross-Domain Influence:**
- Fuzzy matching pattern applicable to exercise names, supplement names, place names
- Confidence-based estimation pattern useful for all domains
- External API validation pattern generalizable

### 9.5 Habits Domain Deep Dive

The Habits domain (Phase 2E) establishes the most sophisticated gamification mechanics, including streak protection, chain bonuses, and partial completion handling. This domain's patterns are critical for the overall gamification system.

**Key Patterns Established:**

1. **Streak Mechanics:**
   ```typescript
   interface StreakState {
     currentStreak: number;     // Days in current streak
     longestStreak: number;     // Historical best
     freezeTokensRemaining: 2;  // Protection tokens
     lastProtectedDate: null;   // When last used
     gracePeriodActive: false;  // Technical failure protection
   }

   // Maintenance rules
   completionThreshold: 0.5,  // 50% = streak maintained
   protectionMethods: ['freeze_token', 'technical_failure', 'intentional_skip']
   ```

2. **Routine Aggregation (Chain Bonus):**
   ```typescript
   // Morning routine with 3 habits
   chainMultipliers = [1.0, 1.05, 1.10, 1.15];  // +5% per position

   // Total XP
   habit1: 15 * 1.05 = 16
   habit2: 12 * 1.10 = 13
   habit3: 10 * 1.15 = 12
   routineBonus: 20
   total: 61 XP
   ```

3. **Partial Completion Handling:**
   ```typescript
   // "Only did 15 minutes of my 30 minute reading habit"
   {
     targetDuration: 30,
     actualDuration: 15,
     completionRate: 0.5,
     xpMultiplier: 0.5,  // Prorated
     streakMaintained: true  // >= 50% threshold
   }
   ```

4. **Habit Definition Creation:**
   ```typescript
   // Voice: "I want to start a new habit of reading for 30 minutes every day before bed"
   HabitDefinition {
     name: 'Evening Reading',
     targetDuration: 30,
     frequency: 'daily',
     preferredTime: '21:00',
     reminderTime: '20:45',
     category: 'learning'
   }
   ```

**Cross-Domain Influence:**
- Streak mechanics apply to daily logging consistency across all domains
- Chain bonus pattern applicable to multi-step routines
- Partial completion handling generalizable

### 9.6 Routines Domain Deep Dive

The Routines domain (Phase 2F) builds on Habits by defining sequences of activities that users perform regularly. This domain handles the complexity of flexible timing within rigid structures.

**Key Patterns Established:**

1. **Routine Definition Structure:**
   ```typescript
   RoutineDefinition {
     id: 'morning-routine',
     name: 'Morning Routine',
     steps: [
       { order: 1, habitId: 'meditation', duration: 10, required: true },
       { order: 2, habitId: 'cold-shower', duration: 5, required: true },
       { order: 3, habitId: 'journaling', duration: 15, required: false }
     ],
     scheduleType: 'daily',
     targetTime: '06:00',
     flexibilityMinutes: 60,
     allowPartialCompletion: true
   }
   ```

2. **Flexible Step Ordering:**
   ```typescript
   // User can complete steps in any order
   // System tracks actual order for pattern analysis
   actualOrder: [2, 1, 3],  // Did cold shower first today
   analyzedPattern: 'non_sequential'
   ```

3. **Weekend Variations:**
   ```typescript
   weekdayRoutine: { startTime: '06:00', steps: [1, 2, 3, 4] },
   weekendRoutine: { startTime: '08:00', steps: [1, 3] }  // Relaxed version
   ```

4. **Routine Analytics:**
   ```typescript
   routineStats: {
     completionRate: 0.85,     // 85% of days completed
     avgStartTime: '06:15',    // Usually starts 15 min late
     mostSkippedStep: 'cold-shower',
     correlationWithMood: 0.72  // High correlation
   }
   ```

**Cross-Domain Influence:**
- Step sequencing pattern applicable to workout programs
- Flexible timing pattern useful for meal scheduling
- Analytics aggregation pattern generalizable

### 9.7 Journaling Domain Deep Dive

The Journaling domain (Phase 2G) handles long-form text capture with sophisticated natural language understanding for theme extraction, emotional analysis, and insight generation.

**Key Patterns Established:**

1. **Entry Type Classification:**
   ```typescript
   entryType: 'daily_reflection' | 'gratitude' | 'emotional_processing' |
              'goal_setting' | 'weekly_review' | 'freeform'
   ```

2. **Theme Extraction:**
   ```typescript
   // LLM-powered extraction
   extractedThemes: ['work_stress', 'relationship_growth', 'health_focus'],
   emotionalTone: 'mixed_positive',
   keyEntities: ['project_alpha', 'partner', 'gym']
   ```

3. **Prompted Journaling:**
   ```typescript
   promptedEntry: {
     promptId: 'weekly_reflection_001',
     promptText: 'What are you most grateful for this week?',
     completedPromptIds: ['q1', 'q2', 'q3']
   }
   ```

4. **Insight Synthesis:**
   ```typescript
   // Weekly reflection generation
   synthesizedInsight: {
     pattern: 'Your best days correlate with morning exercise',
     recommendation: 'Consider prioritizing your workout routine',
     supportingEntries: ['jrn-001', 'jrn-005', 'jrn-012']
   }
   ```

**Cross-Domain Influence:**
- Theme extraction applicable to event descriptions
- Emotional tone analysis used in mood tracking
- Insight synthesis pattern for weekly summaries

### 9.8 Voice Input Edge Cases Deep Dive

The Voice Input Edge Cases domain (Phase 2H) is a critical cross-cutting concern that defines how all voice-based input is handled when conditions are imperfect. This domain has the most comprehensive coverage of failure scenarios.

**Key Patterns Established:**

1. **Environmental Degradation Handling:**
   ```typescript
   // Gym noise scenario
   {
     audioQuality: 'degraded',
     confidenceScore: 0.72,
     missingFields: ['heartRatePeak'],
     recoveryStrategy: 'gentle_prompt_later'
   }
   ```

2. **Interruption Recovery:**
   ```typescript
   // Phone call interruption
   {
     interruptionReason: 'incoming_call',
     partialTranscript: 'Had lunch at Chi',
     completionSuggestions: [
       { text: 'Chipotle', confidence: 0.87 },
       { text: 'Chili\'s', confidence: 0.45 }
     ]
   }
   ```

3. **Self-Correction Parsing:**
   ```typescript
   // "Mood is 4, no wait, 5, actually probably a 4"
   selfCorrections: [
     { original: '4', corrected: '5', at: 12 },
     { original: '5', corrected: '4', at: 28 }  // Final value wins
   ],
   finalValue: 4
   ```

4. **Neurodivergent Accommodations:**
   ```typescript
   // Stream-of-consciousness with tangents
   {
     preserveThinkingProcess: true,
     extractFinalIntent: true,
     noPenaltyForRestarts: true,
     speechDisfluencyHandling: 'silent_normalization'
   }
   ```

5. **Whisper/Privacy Mode:**
   ```typescript
   // Low volume detected
   {
     whisperDetected: true,
     processingMode: 'local_only',
     transcriptRetention: false,
     feedbackMode: 'minimal_discrete'
   }
   ```

**Cross-Domain Influence:**
- Every domain must handle these edge cases
- Partial capture recovery applies universally
- Self-correction parsing affects all numeric inputs
- Neurodivergent accommodations are system-wide

### 9.9 Error Handling Domain Deep Dive

The Error Handling domain (Phase 2I) defines the contract for how all failures are communicated and recovered across the system. This domain establishes the five core principles that govern all error states.

**Key Principles in Detail:**

1. **No Data Loss:**
   ```typescript
   // Always preserve user input
   async function handleError(error: DomainError, originalInput: UserInput) {
     await errorQueue.enqueue({
       originalInput,  // Never lost
       error,
       timestamp: Date.now(),
       retryable: classifyRetryability(error)
     });
   }
   ```

2. **Graceful Degradation:**
   ```typescript
   // If cloud fails, use local
   if (error.type === 'NETWORK_FAILURE') {
     await localDB.store(entry);
     scheduleRetrySync(entry.id);
     showFeedback('Saved locally. Will sync when online.');
   }
   ```

3. **Persona-Appropriate Messaging:**
   ```typescript
   const errorMessages = {
     optimizer: 'Transcription confidence: 23%. Audio quality degraded. Options: retry, text input, quick-log.',
     dabbler: 'Having trouble hearing you. Try again or type it?',
     privacyFirst: 'Processing failed. Your data was not transmitted.',
     neurodivergent: 'That didn\'t work, but no worries. Want to try again when you\'re ready?',
     biohacker: 'Audio SNR: 12dB (below threshold). Retry with noise isolation.',
     reflector: 'Capture interrupted. Your thought is saved as a draft.'
   };
   ```

4. **Gamification Protection:**
   ```typescript
   // Technical failures never break streaks
   if (error.category === 'TECHNICAL') {
     await streakProtection.applyGracePeriod({
       reason: 'technical_failure',
       duration: 2 * 60 * 60 * 1000  // 2 hours
     });
   }
   ```

5. **Recovery-First Design:**
   ```typescript
   // Every error has a recovery path
   interface ErrorRecovery {
     primaryAction: 'retry' | 'fallback' | 'manual';
     fallbackOptions: string[];
     escalationPath: 'support' | 'none';
     preservedState: UserInput;
   }
   ```

**Cross-Domain Influence:**
- These principles apply to every operation in every domain
- Error classification determines UX response
- Recovery patterns are universal

---

## Part 10: Implementation Roadmap

### 10.1 Phase 1: Foundation (Weeks 1-2)

1. **Central Configuration Files:**
   - Create `packages/shared/src/config/xp.ts` with unified XP formulas
   - Create `packages/shared/src/config/confidence.ts` with threshold definitions
   - Create `packages/shared/src/config/privacy.ts` with tier definitions

2. **Schema Standardization:**
   - Rename all `storageMode`/`syncStatus` fields to `privacyTier`
   - Add database migration scripts
   - Update all TypeScript interfaces

3. **Temporal Parser Service:**
   - Extract temporal parsing from Event Logging to shared service
   - Write comprehensive test suite for all temporal expressions
   - Document supported patterns

### 10.2 Phase 2: Core Services (Weeks 3-4)

1. **Voice Input Processing Pipeline:**
   - Implement unified STT processing with quality metrics
   - Add interruption handling with recovery queues
   - Build self-correction parser

2. **Error Handling Framework:**
   - Implement error classification system
   - Build persona-specific message generator
   - Create recovery queue with retry logic

3. **Gamification Engine:**
   - Implement unified XP calculation service
   - Build streak management with protection logic
   - Create achievement tracking system

### 10.3 Phase 3: Domain Implementation (Weeks 5-8)

1. **Mood Tracking:**
   - Implement multi-dimensional capture
   - Build sentiment-to-rating inference
   - Add correlation engine hooks

2. **Habits & Routines:**
   - Implement streak mechanics with 50% threshold
   - Build chain bonus calculation
   - Add routine aggregation logic

3. **Workouts & Nutrition:**
   - Implement exercise vocabulary matching
   - Build food item fuzzy matching
   - Add macro estimation with confidence

4. **Event Logging & Journaling:**
   - Implement batch entity extraction
   - Build theme extraction pipeline
   - Add insight synthesis service

### 10.4 Phase 4: Integration & Testing (Weeks 9-10)

1. **Cross-Domain Testing:**
   - Test all cross-domain references
   - Validate XP consistency across domains
   - Verify privacy tier enforcement

2. **Persona Testing:**
   - Test each persona's distinct experience
   - Validate gamification visibility rules
   - Verify messaging tone appropriateness

3. **Edge Case Testing:**
   - Test all 67 Voice Input edge cases
   - Test all 67 Error Handling scenarios
   - Stress test with rapid input sequences

---

## Part 11: Risk Assessment

### 11.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| XP formula changes break existing user data | Medium | High | Version XP calculations, backfill historical |
| Confidence threshold changes alter UX | High | Medium | A/B test threshold changes |
| Privacy tier migration corrupts data | Low | Critical | Dry-run migrations, backup before |
| Temporal parser fails on edge cases | Medium | Medium | Extensive test suite, fallback prompts |

### 11.2 UX Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Optimizer feels under-rewarded after standardization | Medium | Medium | Grandfather existing XP, communicate changes |
| Dabbler sees too much gamification | Low | Low | Ensure visibility settings enforced |
| Neurodivergent users feel pressured | Medium | High | Extra testing with ND focus groups |
| Privacy-First users distrust encryption | Low | High | Third-party audit, open-source client crypto |

### 11.3 Integration Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Voice Input edge cases not handled consistently | Medium | High | Shared processing pipeline |
| Error handling inconsistent across domains | Medium | Medium | Central error framework |
| Cross-domain correlations inaccurate | Medium | Medium | Validate correlation algorithm |
| Batch operations create orphan entities | Low | Medium | Transaction wrapper for batches |

---

## Part 12: Glossary

| Term | Definition |
|------|------------|
| Batch API | Pattern for creating multiple entities in a single atomic operation |
| Chain Bonus | XP multiplier applied to habits completed in sequence within a routine |
| Confidence Threshold | Minimum confidence score required for automatic entity creation |
| E2E Encryption | End-to-end encryption where only the user can decrypt content |
| Facets | Array of tags describing entity type (e.g., ['event', 'habit', 'log']) |
| Freeze Token | Consumable token that protects a streak when user cannot complete habit |
| Grace Period | Extended time window after technical failure before streak breaks |
| Hidden Tier | Maximum privacy level requiring biometric to view |
| Kind | Entity classification ('log', 'episode', 'task', 'note') |
| Local-Only | Storage mode that never syncs to cloud |
| Multi-Dimensional | Capture pattern for multiple related metrics in single input |
| Partial Capture | Incomplete voice input due to interruption |
| Persona | User archetype defining interaction preferences and expectations |
| Privacy Tier | Level of data protection ('standard', 'local_only', 'encrypted', 'hidden') |
| Retroactive Entry | Entry logged after the event occurred |
| Self-Correction | User correcting themselves mid-input ("no wait, actually...") |
| Streak | Consecutive days of habit completion |
| STT | Speech-to-text transcription |
| Temporal Parsing | Converting natural language time expressions to timestamps |
| Trigger Attribution | Linking mood/state to causal factors |
| XP | Experience points awarded for activities |

---

## Conclusion

This comprehensive cross-domain synthesis analysis of Insight 5.2's Phase 2 specifications reveals a fundamentally sound architecture with consistent patterns across nine domains and 603 use cases. The standardized 5-section template, six-persona distribution, and core architectural patterns (batch API, local-first, graceful degradation) provide a solid foundation for implementation.

**Key Strengths:**
1. Consistent template adherence across all domains
2. Thoughtful persona differentiation, especially for neurodivergent users
3. Comprehensive privacy tier implementation
4. Strong error handling principles with recovery-first design
5. Well-designed cross-domain correlation capabilities

**Critical Actions Required:**
1. Standardize XP calculation formula before implementation
2. Create unified confidence threshold configuration
3. Rename privacy-related fields for consistency
4. Document universal streak maintenance rules
5. Create persona gamification visibility matrix

**Risks Mitigated by This Analysis:**
- Inconsistent user experience across domains
- Unpredictable classification behavior
- Privacy leakage due to inconsistent enforcement
- Streak unfairness from varying rules
- Gamification confusion from different XP calculations

The cross-domain dependencies are well-designed, with Voice Input Edge Cases and Error Handling appropriately positioned as universal concerns affecting all feature domains. The persona-specific patterns are thoughtfully differentiated, with particular strength in the neurodivergent accommodations that prioritize psychological safety over data precision.

With the recommended standardization actions implemented and the phased implementation roadmap followed, Insight 5.2 will deliver a cohesive, predictable, and persona-appropriate experience across all domains while maintaining the flexibility to accommodate diverse user needs.

---

**Document Prepared By:** Phase 3A Cross-Domain Synthesis Agent
**Review Status:** Pending Peer Review
**Next Phase:** Phase 3B - Unified Architecture Specification

---

## Appendix D: Example Voice Inputs Across Personas

This appendix provides representative voice inputs for each persona across multiple domains, demonstrating the distinct interaction patterns that the system must handle.

### D.1 The Optimizer (Alex) - Representative Inputs

**Mood Domain:**
"Quick mood check. Mood 7, energy 8, anxiety 2, focus 9, motivation 8. Feeling dialed in after morning meditation and cold plunge. Sleep was 7.5 hours, HRV 52."

**Workout Domain:**
"Finished push day. Bench press 4 sets: 8 at 185, 8 at 185, 6 at 195, 5 at 205. Incline DB press 3x10 at 65. Cable flies 3x12. Tricep pushdowns 4x15. Total session 72 minutes. Heart rate peaked at 158."

**Nutrition Domain:**
"Post-workout meal at 11:30am. 6oz grilled chicken breast, 200g white rice, 150g steamed broccoli. Approximately 550 calories, 45g protein, 60g carbs, 8g fat. Tracking for macro adherence."

**Event Domain:**
"Calendar block review: Deep work session from 2pm to 5pm, quarterly planning doc v3. @product_team sync at 5:30 for 30 minutes. Dinner prep at 7pm. Track this as project work with high importance."

**Habit Domain:**
"Morning routine complete: 10 min meditation at 6:15, 3 min cold shower at 6:30, 15 min journaling at 6:35. All three done before 7am target. Routine streak now 47 days."

### D.2 The Dabbler (Jordan) - Representative Inputs

**Mood Domain:**
"Feeling pretty good today."

**Workout Domain:**
"Did some yoga."

**Nutrition Domain:**
"Had lunch."

**Event Domain:**
"Coffee with Sarah."

**Habit Domain:**
"Took my vitamins."

**Note:** The Dabbler's inputs are intentionally minimal. The system must infer details where possible and never pressure for more information.

### D.3 The Privacy-First Guardian (Morgan) - Representative Inputs

**Mood Domain:**
"Mood is 6 today, stressed about family stuff. Keep it local only, don't sync this anywhere."

**Workout Domain:**
"Did my workout this morning. Don't need details logged. Just mark it done. Local only."

**Nutrition Domain:**
"Lunch at mom's house, family meal. Encrypt this entry, enhanced privacy mode."

**Event Domain:**
"Had a private meeting. Don't log location or participants. Timestamp only."

**Habit Domain:**
"Therapy session done. Local only, encrypted notes. Never sync this."

**Note:** Privacy-First inputs often include explicit privacy directives that must be honored.

### D.4 The Neurodivergent Accommodator (Riley) - Representative Inputs

**Mood Domain:**
"I don't know, I guess I'm feeling kind of overwhelmed but also like there's this excitement about the project, but the overwhelm is more prominent, maybe a 4 or 5? No wait, probably a 4 because the anxiety is pretty high, like maybe an 8 for anxiety, but overall I'm surviving, if that makes sense?"

**Workout Domain:**
"Okay so I was going to go to the gym but then I remembered I needed to do laundry first but then I actually did go and I did some stuff on the machines, I don't remember exactly what but I was there for maybe 40 minutes? Or an hour? Somewhere around there."

**Nutrition Domain:**
"Did I already log breakfast? I feel like I might have had eggs? Or was that yesterday? I definitely had coffee. Let me just say I had breakfast, something with eggs probably."

**Habit Domain:**
"I think I meditated this morning but it was kind of interrupted when the cat came in, so maybe it doesn't count? But I tried. Should that count as done or not?"

**Note:** Neurodivergent inputs require patience, no judgment, and graceful handling of uncertainty and self-doubt.

### D.5 The Biohacker (Sam) - Representative Inputs

**Mood Domain:**
"Morning HRV was 52, down from 58 yesterday. Resting heart rate 54. Subjective energy 7. Blood glucose at wake was 92. Mood baseline 7 with slight fatigue. Tracking for supplement experiment week 3."

**Workout Domain:**
"Zone 2 cardio session: 45 minutes at 135 BPM average. Max HR 148. Calories 380 according to Whoop. Lactate threshold estimated at 162. Recovery score was 78% so kept intensity moderate."

**Nutrition Domain:**
"Morning stack: 500mg ashwagandha, 300mg alpha-GPC, 1000mg lion's mane, 2g omega-3 EPA/DHA, 5000IU vitamin D3, 200mcg K2. Fasted until 12pm. First meal: 40g protein shake with 5g creatine post-workout."

**Habit Domain:**
"Cold exposure protocol: 3 minute shower at end, water temp approximately 50°F. Completed breathing exercises before: 4 rounds of box breathing, 2 rounds of Wim Hof. Heart rate variability post-session should improve."

**Note:** Biohacker inputs are data-dense and require precise parsing of units, dosages, and technical terminology.

### D.6 The Reflector (Casey) - Representative Inputs

**Mood Domain:**
"Looking back at this week, I've noticed that my best days were the ones where I started with meditation. There's a clear pattern - when I skip the morning routine, my energy crashes by 2pm. I want to be more intentional about this next week."

**Workout Domain:**
"Yesterday's workout felt meaningful in a way that routine gym sessions don't. There was something about being outdoors, running on the trail, that reconnected me with why I started exercising in the first place. I should do more of this."

**Journaling Domain:**
"I've been thinking about the conversation with Mom last weekend. There's a lot to unpack there about expectations and identity. I notice I carry tension about it in my shoulders. Writing this helps me see it more clearly. Maybe I'll bring this up in therapy next session."

**Habit Domain:**
"Week 7 of the meditation practice. The first few weeks felt mechanical, but now I'm starting to notice subtle shifts throughout the day. More patience in traffic. Less reactive in meetings. The compound effect is real."

**Note:** Reflector inputs are narrative-focused and often span multiple time periods. The system should preserve the reflective quality rather than over-parsing into discrete data points.

---

## Appendix E: Conflict Examples with Resolution

### E.1 XP Double-Counting Scenario

**Scenario:** User completes a workout that is also linked as a habit.

**Input:** "Did my 5pm gym session - strength training as planned."

**Potential Conflict:** Both Workout Domain and Habit Domain could award XP.

**Resolution:**
```typescript
// Award workout XP (primary activity)
workoutXP = calculateWorkoutXP(session);  // 45 XP

// Award habit completion XP (but not duration-based)
habitXP = 10;  // Flat completion bonus, not duration-recalculated

// Do NOT apply streak multiplier twice
totalXP = workoutXP + habitXP;  // 55 XP, not 90 XP
```

**Principle:** The primary domain (Workout) gets full XP calculation. The linked domain (Habit) gets a flat bonus to acknowledge the link without double-counting the effort.

### E.2 Mood Inference from Journal

**Scenario:** User writes a journal entry without explicit mood, but content suggests emotional state.

**Input:** "Today was exhausting. The meeting went poorly, I felt dismissed, and now I'm dreading tomorrow. Trying to focus on one small win: I finished the report."

**Potential Conflict:** Should the system create a MoodEntry based on inferred sentiment?

**Resolution:**
```typescript
// Create JournalEntry (primary)
const journal = createJournalEntry({
  content: input,
  extractedThemes: ['work_stress', 'exhaustion', 'achievement'],
  emotionalTone: 'mixed_negative'
});

// Do NOT auto-create MoodEntry
// Instead, offer gentle prompt:
promptQueue.add({
  type: 'optional_mood',
  message: "You mentioned feeling exhausted. Want to log a mood check?",
  prefill: { rating: 4, triggers: ['work_meeting'] },
  persona: user.persona,
  timing: 'after_journal_save'
});
```

**Principle:** Inference should prompt, not auto-create. Users should confirm emotional data.

### E.3 Retroactive Entry Streak Conflict

**Scenario:** User logs a habit completion for yesterday, but missed today.

**Input:** "Actually, I did meditate yesterday morning, forgot to log it."

**Conflict:** Does the retroactive entry save the streak that would otherwise break today?

**Resolution:**
```typescript
// Create retroactive HabitInstance
const instance = createHabitInstance({
  completedAt: yesterday,
  frontmatter: {
    retroactive: true,
    loggedAt: now
  }
});

// Streak calculation logic
if (wasStreakActiveYesterday()) {
  // Streak was already protected by grace period or was intact
  // Retroactive entry confirms it, no change needed
  streakAction = 'confirm';
} else {
  // Streak had already broken at midnight
  // Retroactive entry cannot resurrect a broken streak
  streakAction = 'no_change';
  // But award partial XP for the retroactive log
  xpAwarded = baseXP * 0.5;  // Half XP for late logging
}
```

**Principle:** Retroactive entries cannot resurrect broken streaks. They can only confirm entries within the grace period window.

### E.4 Privacy Tier Inheritance

**Scenario:** User creates a Routine containing Habits with different privacy tiers.

**Input:** "Morning routine done - meditation, journaling (private notes), and stretching."

**Conflict:** Journaling is marked local-only, but Routine wants to sync.

**Resolution:**
```typescript
// RoutineCompletion privacy = MAX of component privacies
const componentPrivacies = [
  'standard',   // meditation
  'local_only', // journaling
  'standard'    // stretching
];

const routinePrivacy = getMaxPrivacyTier(componentPrivacies);
// Result: 'local_only' - the most restrictive wins

// Routine syncs with redacted component info
syncPayload = {
  routineId: 'morning-routine',
  completedAt: now,
  completionRate: 1.0,
  componentDetails: [
    { habitId: 'meditation', status: 'complete' },
    { habitId: 'journaling', status: 'complete' },  // No notes
    { habitId: 'stretching', status: 'complete' }
  ],
  privacyTier: 'local_only'  // Routine inherits strictest tier
};
```

**Principle:** Privacy tier inheritance always takes the most restrictive option. A routine containing one private component becomes private itself.
