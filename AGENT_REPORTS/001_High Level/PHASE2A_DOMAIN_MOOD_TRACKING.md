# Insight 5.2 Use Cases: Mood Tracking Domain

**Document Version:** 1.0
**Date:** January 18, 2026
**Domain:** Mood Tracking
**Use Case Count:** 67
**Status:** Production Specification

---

## Executive Summary

This document defines 67 comprehensive use cases for the Mood Tracking domain in Insight 5.2, distributed across all six personas. Mood tracking represents a core capability that intersects with journaling, health monitoring, and self-awareness features. Each use case follows the standardized 250-350 word template, covering user input, data model mapping, parsing approach, gamification impact, and architecture solution.

**Persona Distribution:**
- Optimizer: 11 use cases (UC-001 through UC-011)
- Dabbler: 11 use cases (UC-012 through UC-022)
- Privacy-First: 11 use cases (UC-023 through UC-033)
- Neurodivergent: 12 use cases (UC-034 through UC-045)
- Biohacker: 11 use cases (UC-046 through UC-056)
- Reflector: 11 use cases (UC-057 through UC-067)

---

## Table of Contents

1. [Optimizer Persona Use Cases](#optimizer-persona-use-cases)
2. [Dabbler Persona Use Cases](#dabbler-persona-use-cases)
3. [Privacy-First Persona Use Cases](#privacy-first-persona-use-cases)
4. [Neurodivergent Persona Use Cases](#neurodivergent-persona-use-cases)
5. [Biohacker Persona Use Cases](#biohacker-persona-use-cases)
6. [Reflector Persona Use Cases](#reflector-persona-use-cases)

---

## Optimizer Persona Use Cases

---

## Use Case UC-001: Multi-Dimensional Mood Check-In

**Persona:** Optimizer

### 1. User Phrase/Scenario

User says: "Quick mood check. Mood 7, energy 8, anxiety 2, focus 9, motivation 8. Feeling dialed in after morning meditation and cold plunge."

Voice variations:
- "#mood(7) #energy(8) #anxiety(2) #focus(9) #motivation(8) great morning"
- "Rating myself: mood seven, energy eight, anxiety two, focus nine, motivation eight"

### 2. Data Model Mapping

**Created Entities:**

1. **MoodEntry** (`mood_entries` table)
```typescript
{
  id: 'mood-uuid',
  userId: 'user-123',
  overallRating: 7,
  dimensions: {
    energy: 8,
    anxiety: 2,
    focus: 9,
    motivation: 8,
    sociability: null
  },
  emotions: ['focused', 'calm', 'energized'],
  context: 'After morning meditation and cold plunge',
  triggers: ['meditation', 'cold_exposure'],
  recordedAt: Date.now()
}
```

2. **TrackerLogs** (5 records in `tracker_logs` table)
```typescript
[
  { trackerKey: 'mood', valueNumeric: 7, occurredAt: now },
  { trackerKey: 'energy', valueNumeric: 8, occurredAt: now },
  { trackerKey: 'anxiety', valueNumeric: 2, occurredAt: now },
  { trackerKey: 'focus', valueNumeric: 9, occurredAt: now },
  { trackerKey: 'motivation', valueNumeric: 8, occurredAt: now }
]
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- Multiple `#tracker(value)` patterns or numeric rating language
- "mood check" explicit trigger phrase
- Dimensional descriptors (energy, anxiety, focus, motivation)

**Classification flow:**
1. Regex extracts five numeric ratings with dimension labels
2. LLM identifies context phrase linking to recent activities
3. Activity matching finds "meditation" and "cold plunge" as triggers
4. Confidence: MOOD (0.98), TRACKER (1.0)

### 4. Gamification Impact

**XP Calculation:**
- Base: 10 XP (comprehensive mood logging)
- Multi-dimensional bonus: +5 XP (4+ dimensions tracked)
- Context bonus: +3 XP (included trigger attribution)
- Streak multiplier: 1.47x (47-day streak)
- **Total: 18 * 1.47 = 26 XP**

**Achievement check:** "Mood Scientist" badge (100 multi-dimensional logs)

### 5. Architecture Solution

**Batch API call:**
```typescript
const batch = await api.batch({
  operations: [
    { type: 'create', table: 'mood_entries', data: moodEntry },
    ...trackerLogs.map(log => ({ type: 'create', table: 'tracker_logs', data: log }))
  ]
});
```

**UI Updates:**
- Mood dashboard shows radar chart with 5 dimensions
- Correlation engine queues analysis for meditation/mood relationship
- Toast: "Mood check logged! +26 XP"

---

## Use Case UC-002: Mood Comparison to Yesterday

**Persona:** Optimizer

### 1. User Phrase/Scenario

User says: "Mood today is 8, definitely better than yesterday. Energy is also up, maybe a 7 vs yesterday's 5."

Voice variations:
- "Feeling better than yesterday, mood 8 vs 6, energy 7 vs 5"
- "Improvement today: #mood(8) up from 6, #energy(7) up from 5"

### 2. Data Model Mapping

**Created Entities:**

1. **MoodEntry** with comparison context
```typescript
{
  id: 'mood-uuid',
  overallRating: 8,
  dimensions: { energy: 7 },
  context: 'Improvement from yesterday (mood 6->8, energy 5->7)',
  recordedAt: Date.now()
}
```

2. **TrackerLogs** (2 records)
```typescript
[
  { trackerKey: 'mood', valueNumeric: 8, notes: 'Up from 6 yesterday' },
  { trackerKey: 'energy', valueNumeric: 7, notes: 'Up from 5 yesterday' }
]
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- Comparative language: "better than yesterday", "vs yesterday"
- Numeric values with comparative context
- Temporal reference to previous day

**Classification flow:**
1. Regex extracts current values (8, 7)
2. Comparative parser identifies yesterday reference
3. System queries previous day's logs for validation
4. Delta computed: mood +2, energy +2

**File reference:** `supabase/functions/transcribe_and_parse_capture/temporal.ts:89`

### 4. Gamification Impact

**XP Calculation:**
- Base: 10 XP (mood logging)
- Improvement bonus: +5 XP (positive trend detected)
- Streak multiplier: 1.47x
- **Total: 15 * 1.47 = 22 XP**

**Correlation update:** System notes sleep, activity from previous day for factor analysis

### 5. Architecture Solution

**Temporal comparison query:**
```typescript
const yesterday = await getTrackerLogs({
  keys: ['mood', 'energy'],
  dateRange: { start: startOfYesterday, end: endOfYesterday }
});
const comparison = {
  mood: { current: 8, previous: yesterday.mood || null, delta: 2 },
  energy: { current: 7, previous: yesterday.energy || null, delta: 2 }
};
```

**UI Updates:**
- Delta indicators show green +2 badges
- Trend sparkline updates in mood card
- Weekly summary queued for trend analysis

---

## Use Case UC-003: Mood Pattern Query

**Persona:** Optimizer

### 1. User Phrase/Scenario

User asks: "What's my average mood on days I work out versus days I don't?"

Voice variations:
- "Show me mood correlation with exercise"
- "Compare my mood on workout days vs rest days"
- "Does working out affect my mood?"

### 2. Data Model Mapping

**Query operation (no new entities created):**

```typescript
interface MoodCorrelationQuery {
  outcomeMetric: 'mood',
  conditionVariable: 'workout_completed',
  lookbackDays: 90,
  groupBy: 'condition_presence'
}
```

**Response structure:**
```typescript
{
  withCondition: { average: 7.8, stdDev: 0.9, sampleSize: 52 },
  withoutCondition: { average: 6.2, stdDev: 1.4, sampleSize: 38 },
  difference: 1.6,
  pValue: 0.001,
  significance: 'high'
}
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- Query intent: "what's my", "show me", "compare"
- Correlation keywords: "versus", "vs", "correlation", "affect"
- Two variables identified: mood (outcome), workout (condition)

**Classification flow:**
1. Intent classifier: QUERY (0.96)
2. Variable extraction: mood, workout
3. Comparison type: conditional grouping
4. Time range: default 90 days (no explicit range)

### 4. Gamification Impact

**XP Calculation:**
- Insight query: 5 XP (exploring data)
- First correlation discovery: +10 XP bonus (one-time)
- **Total: 15 XP**

**Achievement check:** "Pattern Seeker" unlocked (first correlation query)

### 5. Architecture Solution

**Correlation API:**
```typescript
// GET /api/v1/analytics/correlation
const result = await analyticsApi.getCorrelation({
  outcome: 'mood',
  condition: 'workout_completed',
  aggregation: 'daily_average',
  lookback: 90
});
```

**Response display:**
```
Mood on Workout Days vs Rest Days (90 days):

With Workout:    7.8 avg (n=52 days)
Without Workout: 6.2 avg (n=38 days)
Difference:      +1.6 points (26% higher)
Statistical significance: p < 0.01

Insight: Working out is strongly correlated with better mood for you.
```

---

## Use Case UC-004: Mood with Precise Timestamp

**Persona:** Optimizer

### 1. User Phrase/Scenario

User says: "Mood check at 2:30pm. Post-lunch dip happening. Mood 5, energy 4, focus 3. Need to walk it off."

Voice variations:
- "Logging mood at 14:30: mood 5, energy 4, focus 3"
- "2:30pm check-in: #mood(5) #energy(4) #focus(3) afternoon slump"

### 2. Data Model Mapping

**Created Entities:**

1. **MoodEntry** with precise timestamp
```typescript
{
  id: 'mood-uuid',
  overallRating: 5,
  dimensions: { energy: 4, focus: 3 },
  context: 'Post-lunch dip, afternoon slump',
  triggers: ['post_lunch', 'afternoon'],
  recordedAt: parseTimestamp('2:30pm'), // Same-day anchor
}
```

2. **Task** (inferred from intent)
```typescript
{
  title: 'Walk to reset energy',
  status: 'todo',
  dueAt: Date.now() + 30 * 60 * 1000, // 30 min
  tags: ['health', 'mood_recovery']
}
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- Explicit timestamp: "2:30pm", "14:30"
- Mood pattern with multiple dimensions
- Task intent: "need to walk it off"

**Temporal parsing:**
```typescript
const timestamp = parseTemporalExpression('2:30pm', Date.now(), userTimezone);
// Returns: { type: 'absolute', timestamp: todayAt1430, confidence: 0.95 }
```

**Entity coexistence:** Mood + Task allowed (separate intents)

### 4. Gamification Impact

**XP Calculation:**
- Mood logging: 10 XP
- Timestamp precision bonus: +2 XP
- Task creation: +1 XP
- Streak multiplier: 1.47x
- **Total: 13 * 1.47 = 19 XP**

**Pattern tracking:** System logs afternoon dip pattern for time-of-day analysis

### 5. Architecture Solution

**Timestamp handling:**
```typescript
// File: packages/shared/src/utils/temporal.ts:45
const entryTime = resolveTimeOfDay('2:30pm', {
  anchorDate: new Date(),
  timezone: user.timezone,
  assumeToday: true
});
```

**UI Updates:**
- Timeline shows mood entry at 2:30pm position
- Afternoon dip pattern highlighted in weekly view
- Task added to quick actions: "Take a walk"

---

## Use Case UC-005: Mood Goal Setting

**Persona:** Optimizer

### 1. User Phrase/Scenario

User says: "I want to maintain an average mood of 7 or higher this month. Create a mood goal."

Voice variations:
- "Set a goal: average mood above 7 for January"
- "Goal: keep my mood average at 7+ this month"

### 2. Data Model Mapping

**Created Entity:**

1. **Goal** (`goals` table)
```typescript
{
  id: 'goal-uuid',
  title: 'Maintain average mood of 7+',
  description: 'Target monthly mood average above 7',
  goalType: 'metric_target',
  targetMetric: {
    trackerKey: 'mood',
    aggregation: 'avg',
    target: 7,
    direction: 'above',
    period: 'monthly'
  },
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  status: 'active',
  importance: 8,
  linkedHabits: []
}
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- Goal intent: "I want to", "create a goal", "set a goal"
- Target specification: "7 or higher", "above 7"
- Temporal scope: "this month", "for January"

**Classification flow:**
1. Intent: GOAL_CREATION (0.94)
2. Metric extraction: mood, average, 7, above
3. Period parsing: current month
4. Goal template selection: metric_target

### 4. Gamification Impact

**XP Calculation:**
- Goal creation: 15 XP
- Specific target bonus: +5 XP
- **Total: 20 XP**

**Goal multiplier activation:** All mood logs now receive 1.3x bonus when goal is active

### 5. Architecture Solution

**Goal tracking setup:**
```typescript
// POST /api/v1/goals
const goal = await goalsApi.create({
  title: 'Maintain average mood of 7+',
  type: 'metric_target',
  config: {
    trackerKey: 'mood',
    aggregation: 'avg',
    target: 7,
    direction: 'gte'
  },
  period: { start: monthStart, end: monthEnd }
});

// Subscribe to mood logs for progress updates
await goalTracker.subscribe(goal.id, 'tracker_logs', { key: 'mood' });
```

**Dashboard widget:** Progress bar showing current average vs target

---

## Use Case UC-006: Morning Mood Baseline

**Persona:** Optimizer

### 1. User Phrase/Scenario

User says: "Morning baseline. Mood 6, energy 5, woke up feeling groggy. Sleep was 6.5 hours, HRV was 52. Need more sleep tonight."

Voice variations:
- "AM check: #mood(6) #energy(5) #sleep(6.5) #hrv(52) tired start"
- "Morning metrics: mood 6, energy 5, 6.5 hours sleep, HRV 52"

### 2. Data Model Mapping

**Created Entities:**

1. **MoodEntry**
```typescript
{
  overallRating: 6,
  dimensions: { energy: 5 },
  emotions: ['groggy', 'tired'],
  context: 'Morning baseline, woke up groggy',
  recordedAt: Date.now()
}
```

2. **TrackerLogs** (4 records)
```typescript
[
  { trackerKey: 'mood', valueNumeric: 6 },
  { trackerKey: 'energy', valueNumeric: 5 },
  { trackerKey: 'sleep', valueNumeric: 6.5, unit: 'hours' },
  { trackerKey: 'hrv', valueNumeric: 52 }
]
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- "Morning baseline" explicit pattern
- Multiple trackers: mood, energy, sleep, HRV
- Subjective descriptors: "groggy"

**Classification flow:**
1. Time-of-day anchor: morning (verified against current time)
2. Multi-tracker extraction via regex and NLP
3. Emotion extraction: "groggy" maps to tired/low-energy
4. Confidence: MOOD (0.95), TRACKER (1.0)

### 4. Gamification Impact

**XP Calculation:**
- Comprehensive morning check: 15 XP
- 4+ metrics tracked: +5 XP
- Streak multiplier: 1.47x
- **Total: 20 * 1.47 = 29 XP**

**Correlation feed:** Sleep and HRV data linked to mood for factor analysis

### 5. Architecture Solution

**Morning routine detection:**
```typescript
// File: apps/insight-mobile/src/lib/routines.ts:67
const isMorningWindow = isWithinTimeWindow('05:00', '10:00', userTimezone);
if (isMorningWindow && hasBaselineIndicators(input)) {
  entry.context = 'morning_baseline';
  entry.routinePosition = 'first';
}
```

**Cross-tracker linking:** All logs share `sessionId` for correlation

---

## Use Case UC-007: Mood Trend Analysis Request

**Persona:** Optimizer

### 1. User Phrase/Scenario

User asks: "Show me my mood trend for the last 30 days with weekly averages."

Voice variations:
- "What's my mood trend this month?"
- "Graph my mood over the past 30 days"
- "Weekly mood averages for January"

### 2. Data Model Mapping

**Query operation:**

```typescript
interface TrendQuery {
  metric: 'mood',
  period: { days: 30 },
  aggregation: 'weekly_average',
  includeDataPoints: true
}
```

**Response:**
```typescript
{
  dailyValues: [{ date: '2026-01-18', value: 7.5 }, ...],
  weeklyAverages: [
    { week: '2026-W01', average: 6.8 },
    { week: '2026-W02', average: 7.2 },
    { week: '2026-W03', average: 7.4 }
  ],
  overallTrend: 'improving',
  trendSlope: 0.15
}
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- Query intent: "show me", "what's my"
- Trend keywords: "trend", "over", "graph"
- Time specification: "last 30 days", "weekly"

**Classification:** QUERY intent, VISUALIZATION subtype

### 4. Gamification Impact

**XP Calculation:**
- Data exploration: 5 XP
- No multiplier (query, not creation)

**Achievement check:** "Trend Watcher" (viewed 10 trend analyses)

### 5. Architecture Solution

**Analytics endpoint:**
```typescript
// GET /api/v1/analytics/trend
const trend = await analyticsApi.getTrend({
  metric: 'mood',
  days: 30,
  aggregations: ['daily', 'weekly']
});
```

**Visualization:**
- Line chart with daily points
- Weekly average overlay
- Trend line with slope indicator
- "Improving" badge if slope > 0.1

---

## Use Case UC-008: Mood After Specific Activity

**Persona:** Optimizer

### 1. User Phrase/Scenario

User says: "Post-workout mood check. Feeling great, mood is 9, energy spiked to 8. The endorphins are real."

Voice variations:
- "After gym: #mood(9) #energy(8) endorphin rush"
- "Workout complete, mood elevated to 9, energy 8"

### 2. Data Model Mapping

**Created Entities:**

1. **MoodEntry** with activity link
```typescript
{
  overallRating: 9,
  dimensions: { energy: 8 },
  context: 'Post-workout, endorphin effect',
  triggers: ['workout', 'exercise'],
  recordedAt: Date.now(),
  linkedActivityType: 'workout'
}
```

2. **TrackerLogs**
```typescript
[
  { trackerKey: 'mood', valueNumeric: 9, context: 'post_workout' },
  { trackerKey: 'energy', valueNumeric: 8, context: 'post_workout' }
]
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- Activity prefix: "Post-workout", "After gym"
- High positive values with context
- Causal language: "endorphins are real"

**Activity linking:**
1. Check for recent workout log (within 2 hours)
2. If found, link mood entry to workout session
3. Tag for exercise-mood correlation analysis

### 4. Gamification Impact

**XP Calculation:**
- Mood logging: 10 XP
- Activity-linked bonus: +5 XP (contextual logging)
- Streak multiplier: 1.47x
- **Total: 15 * 1.47 = 22 XP**

**Correlation update:** Exercise -> Mood relationship strengthened

### 5. Architecture Solution

**Activity linking:**
```typescript
// Find recent workout
const recentWorkout = await workoutsApi.findRecent({
  withinHours: 2,
  userId: user.id
});

if (recentWorkout) {
  moodEntry.linkedActivityId = recentWorkout.id;
  moodEntry.linkedActivityType = 'workout';
}
```

**UI feedback:** "Nice! Your mood tends to be 1.8 points higher after workouts."

---

## Use Case UC-009: Mood Trigger Identification

**Persona:** Optimizer

### 1. User Phrase/Scenario

User says: "Mood dropped to 4 after that stressful meeting with finance. Anxiety spiked to 7. Definitely triggered by work stress."

Voice variations:
- "#mood(4) #anxiety(7) after finance meeting, work stress trigger"
- "Bad meeting tanked my mood to 4, anxiety 7"

### 2. Data Model Mapping

**Created Entities:**

1. **MoodEntry** with triggers
```typescript
{
  overallRating: 4,
  dimensions: { anxiety: 7 },
  emotions: ['stressed', 'anxious', 'frustrated'],
  triggers: ['work_stress', 'meeting', 'finance'],
  context: 'After stressful meeting with finance team',
  recordedAt: Date.now()
}
```

2. **Event** (if meeting not already logged)
```typescript
{
  title: 'Meeting with Finance',
  category: 'work',
  tags: ['stressful'],
  mood_impact: -3 // Estimated from context
}
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- Negative mood with causal language
- "Triggered by", "after that", "because of"
- Work/meeting context identification

**Trigger extraction:**
```typescript
const triggers = extractTriggers(input);
// Returns: ['work_stress', 'meeting', 'finance']
// Method: NLP entity extraction + predefined trigger vocabulary
```

### 4. Gamification Impact

**XP Calculation:**
- Mood logging: 10 XP
- Trigger attribution: +5 XP
- Self-awareness bonus: +3 XP (identifying cause)
- Streak multiplier: 1.47x
- **Total: 18 * 1.47 = 26 XP**

**Pattern alert:** System notes work meeting as mood trigger for future warnings

### 5. Architecture Solution

**Trigger analysis:**
```typescript
// Store trigger relationship
await triggersApi.logTrigger({
  triggerId: 'work_meeting',
  outcome: 'mood',
  impact: -3,
  confidence: 0.85,
  timestamp: Date.now()
});

// Update trigger profile
await triggersApi.updateProfile({
  trigger: 'work_meeting',
  averageImpact: -2.8,
  occurrences: 12
});
```

**UI notification:** "Work meetings have lowered your mood 2.8 points on average (n=12)"

---

## Use Case UC-010: Mood Recovery Tracking

**Persona:** Optimizer

### 1. User Phrase/Scenario

User says: "Update: mood recovered to 7 after a 20 minute walk. Anxiety down to 3. Walk helped reset."

Voice variations:
- "Recovery check: #mood(7) #anxiety(3) after walking"
- "Mood bounced back to 7, anxiety 3. Walking works."

### 2. Data Model Mapping

**Created Entities:**

1. **MoodEntry** (recovery log)
```typescript
{
  overallRating: 7,
  dimensions: { anxiety: 3 },
  context: 'Recovery after 20 min walk',
  triggers: ['walking', 'recovery_activity'],
  recordedAt: Date.now(),
  linkedRecoveryFrom: 'previous-mood-uuid'
}
```

2. **Recovery metrics** (computed)
```typescript
{
  previousMood: 4,
  currentMood: 7,
  recoveryDelta: +3,
  recoveryTimeMinutes: 35, // Time since previous log
  recoveryActivity: 'walking',
  recoveryEffectiveness: 0.85
}
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- Recovery language: "recovered", "bounced back", "reset"
- Activity attribution: "after a 20 minute walk"
- Improvement from recent low point

**Recovery linking:**
1. Find recent negative mood entry (within 2 hours)
2. Calculate delta and recovery time
3. Link recovery activity (walking)

### 4. Gamification Impact

**XP Calculation:**
- Mood logging: 10 XP
- Recovery tracking bonus: +10 XP (valuable insight)
- Streak multiplier: 1.47x
- **Total: 20 * 1.47 = 29 XP**

**Achievement:** "Mood Alchemist" (10 tracked recoveries)

### 5. Architecture Solution

**Recovery analysis:**
```typescript
// Link to previous low mood
const previousLow = await moodApi.findRecentLow({
  withinHours: 4,
  threshold: 5
});

if (previousLow) {
  const recovery = {
    from: previousLow.overallRating,
    to: currentMood,
    delta: currentMood - previousLow.overallRating,
    duration: Date.now() - previousLow.recordedAt,
    activity: 'walking'
  };
  await recoveryApi.log(recovery);
}
```

**Insight generated:** "Walking recovers your mood by 2.8 points on average in 25 minutes"

---

## Use Case UC-011: Weekly Mood Reflection Request

**Persona:** Optimizer

### 1. User Phrase/Scenario

User says: "Generate my weekly mood summary with highs, lows, and patterns."

Voice variations:
- "What was my mood like this week?"
- "Show me my mood patterns from the past 7 days"
- "Weekly mood report"

### 2. Data Model Mapping

**Query and synthesis operation:**

```typescript
interface WeeklyMoodSummary {
  period: { start: '2026-01-12', end: '2026-01-18' },
  stats: {
    average: 7.1,
    high: 9,
    low: 4,
    stdDev: 1.3,
    logCount: 21
  },
  patterns: {
    bestDayOfWeek: 'Saturday',
    worstDayOfWeek: 'Monday',
    bestTimeOfDay: 'post_workout',
    worstTimeOfDay: 'afternoon'
  },
  triggers: {
    positive: ['exercise', 'meditation', 'social'],
    negative: ['work_meetings', 'poor_sleep']
  },
  correlations: [
    { factor: 'sleep_hours', correlation: 0.72 },
    { factor: 'workout_completed', correlation: 0.65 }
  ]
}
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- Summary request: "generate", "show me", "report"
- Time scope: "weekly", "this week", "past 7 days"
- Detail request: "highs, lows, patterns"

**Classification:** QUERY intent, SUMMARY subtype

### 4. Gamification Impact

**XP Calculation:**
- Weekly review completion: 15 XP
- Pattern discovery bonus: +5 XP
- **Total: 20 XP**

**Achievement check:** "Weekly Warrior" (4 consecutive weekly reviews)

### 5. Architecture Solution

**Summary generation:**
```typescript
// GET /api/v1/analytics/mood/weekly
const summary = await analyticsApi.getMoodWeekly({
  endDate: today,
  includePatterns: true,
  includeCorrelations: true,
  includeTriggers: true
});
```

**Response format:**
```
Weekly Mood Summary (Jan 12-18, 2026)

Average: 7.1/10 | High: 9 | Low: 4
Total logs: 21 across 7 days

Patterns:
- Best day: Saturday (avg 8.2)
- Challenging day: Monday (avg 5.9)
- Peak time: After workouts (avg 8.5)
- Dip time: 2-4pm (avg 5.8)

Top positive triggers: Exercise, meditation, social time
Top negative triggers: Work meetings, poor sleep

Key insight: Sleep duration explains 72% of your mood variance.
```

---

## Dabbler Persona Use Cases

---

## Use Case UC-012: Simple Mood Rating

**Persona:** Dabbler

### 1. User Phrase/Scenario

User says: "Feeling pretty good today."

Voice variations:
- "Good mood today"
- "I'm doing okay"
- "Feeling alright"

### 2. Data Model Mapping

**Created Entity:**

1. **MoodEntry** (inferred)
```typescript
{
  id: 'mood-uuid',
  overallRating: 7, // Inferred from "pretty good"
  emotions: ['content', 'positive'],
  context: '',
  recordedAt: Date.now()
}
```

2. **TrackerLog**
```typescript
{
  trackerKey: 'mood',
  valueNumeric: 7,
  source: 'voice',
  confidence: 0.80
}
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- Mood language: "feeling", "mood"
- Qualitative descriptor: "pretty good" maps to 7/10
- No explicit numeric value

**Sentiment-to-rating mapping:**
```typescript
const MOOD_MAPPINGS = {
  'terrible': 1, 'awful': 2, 'bad': 3, 'not great': 4,
  'okay': 5, 'alright': 5, 'fine': 6, 'good': 7,
  'pretty good': 7, 'great': 8, 'amazing': 9, 'fantastic': 10
};
```

### 4. Gamification Impact

**XP Calculation:**
- Simple mood log: 5 XP (Dabbler-friendly lower base)
- No multiplier shown (hidden for Dabbler)

**Feedback:** Simple checkmark, no XP display

### 5. Architecture Solution

**Inference handling:**
```typescript
if (!hasExplicitRating(input)) {
  const rating = inferMoodFromSentiment(input);
  // Show confirmation for Dabbler:
  showConfirmation(`Logged as "good mood" (7/10). Tap to adjust.`);
}
```

**UI:** Simple mood emoji confirmation, quick edit option

---

## Use Case UC-013: Emoji-Based Mood Entry

**Persona:** Dabbler

### 1. User Phrase/Scenario

User taps a smiley face emoji in quick-capture mode, or says: "Mood is smiley face today"

Voice variations:
- "Happy face mood"
- "Feeling emoji smile"

### 2. Data Model Mapping

**Created Entity:**

1. **MoodEntry**
```typescript
{
  overallRating: 8, // Smiley = 8
  emotions: ['happy'],
  inputMethod: 'emoji_picker',
  recordedAt: Date.now()
}
```

### 3. Parsing/Disambiguation Approach

**Emoji-to-rating mapping:**
```typescript
const EMOJI_MOOD_MAP = {
  '': 10, '': 9, '': 8, '': 7, '': 6,
  '': 5, '': 4, '': 3, '': 2, '': 1
};
```

**UI flow:** Single tap on emoji logs mood instantly

### 4. Gamification Impact

**XP Calculation:**
- Quick mood log: 3 XP (minimal but rewarding)
- No pressure to add details

**Feedback:** Brief animation, no stats shown

### 5. Architecture Solution

**Quick capture API:**
```typescript
// POST /api/v1/mood/quick
const mood = await moodApi.quickLog({
  emoji: '',
  timestamp: Date.now()
});
// Returns: { success: true, rating: 8 }
```

**UI:** Emoji pulses, brief "Logged!" text appears

---

## Use Case UC-014: Mood from Journal Fragment

**Persona:** Dabbler

### 1. User Phrase/Scenario

User says: "Today was kind of stressful with work stuff but dinner with friends was nice."

Voice variations:
- "Work was tough but evening was good"
- "Stressful day, nice dinner though"

### 2. Data Model Mapping

**Created Entities:**

1. **MoodEntry** (inferred mixed)
```typescript
{
  overallRating: 6, // Mixed: stress + positive = 6
  emotions: ['stressed', 'grateful'],
  context: 'Work stressful, dinner with friends nice',
  recordedAt: Date.now()
}
```

2. **JournalEntry** (primary)
```typescript
{
  title: 'Daily note',
  bodyMarkdown: 'Today was kind of stressful with work stuff but dinner with friends was nice.',
  moodRating: 6,
  emotions: ['stressed', 'grateful']
}
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- Narrative prose (not tracker syntax)
- Mixed sentiment: negative ("stressful") + positive ("nice")
- No explicit mood request

**For Dabbler:** Default to JournalEntry with mood inference, not explicit MoodEntry

**Sentiment analysis:**
```typescript
const sentiment = analyzeSentiment(input);
// Returns: { positive: 0.4, negative: 0.4, mixed: true }
const inferredMood = calculateMixedMood(sentiment); // 6
```

### 4. Gamification Impact

**XP Calculation:**
- Journal entry: 5 XP
- Mood captured: +2 XP (auto-inferred)
- **Total: 7 XP** (hidden from Dabbler)

### 5. Architecture Solution

**Dual creation:**
```typescript
// Create journal first, mood as side effect
const journal = await journalApi.create({
  content: input,
  autoInferMood: true
});
// Mood entry created automatically with link to journal
```

**UI feedback:** "Captured your thought. Sounds like a mixed day - nice ending though!"

---

## Use Case UC-015: Morning Mood Check Prompt Response

**Persona:** Dabbler

### 1. User Phrase/Scenario

System prompts: "Good morning! How are you feeling today?" User responds: "Tired but okay"

Voice variations:
- "Sleepy"
- "Alright I guess"
- "Not bad"

### 2. Data Model Mapping

**Created Entity:**

1. **MoodEntry**
```typescript
{
  overallRating: 5, // "Tired but okay" = neutral leaning
  emotions: ['tired'],
  context: 'Morning check-in',
  promptId: 'morning_mood_check',
  recordedAt: Date.now()
}
```

### 3. Parsing/Disambiguation Approach

**Prompt-response context:**
- System knows it asked a mood question
- Response parsed with mood-specific model
- Lower confidence threshold (Dabbler expects easy)

**Mapping:** "Tired but okay" -> Rating 5, Emotion: tired

### 4. Gamification Impact

**XP Calculation:**
- Responded to prompt: 5 XP
- Morning ritual bonus: +2 XP
- **Total: 7 XP** (hidden)

**Streak:** Counts toward daily activity

### 5. Architecture Solution

**Prompt response handler:**
```typescript
// Prompt context available
const context = await prompts.getActive(userId);
if (context.type === 'mood_check') {
  // Use mood-specific parser
  const mood = parseMoodResponse(input, { expectingMood: true });
}
```

**Follow-up (optional):** "Got it! Rest up if you can. Want to capture anything else?"

---

## Use Case UC-016: Weekly Mood Summary (Simplified)

**Persona:** Dabbler

### 1. User Phrase/Scenario

User asks: "How have I been feeling lately?"

Voice variations:
- "What's my mood been like?"
- "Show me how I've been doing"

### 2. Data Model Mapping

**Query response (simplified for Dabbler):**

```typescript
{
  period: 'last 7 days',
  summary: 'mostly good',
  averageEmoji: '',
  highlights: [
    'Best day: Saturday',
    'You logged 4 times this week'
  ]
}
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- Retrospective query: "have I been", "lately"
- Mood focus: "feeling"

**Dabbler simplification:** No stats, no numbers, emoji-based summary

### 4. Gamification Impact

**XP:** 3 XP for reviewing data (not shown)

### 5. Architecture Solution

**Simplified response:**
```typescript
const summary = await analyticsApi.getMoodSummary({
  days: 7,
  format: 'dabbler_friendly'
});
```

**UI Response:**
```
This week you've been mostly good!

Best day: Saturday
You checked in 4 times - nice!

Keep it up!
```

---

## Use Case UC-017: Mood with Location Context

**Persona:** Dabbler

### 1. User Phrase/Scenario

User says: "Feeling relaxed at the beach."

Voice variations:
- "Good vibes at the park"
- "Happy at mom's house"

### 2. Data Model Mapping

**Created Entities:**

1. **MoodEntry**
```typescript
{
  overallRating: 8, // "Relaxed" = positive
  emotions: ['relaxed', 'calm'],
  context: 'At the beach',
  location: 'beach' // Inferred place type
}
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- Mood language + location preposition ("at the")
- Location extraction: "beach"

**Place handling for Dabbler:**
- Don't force place creation
- Store location as context string
- Offer optional: "Save 'beach' as a place?"

### 4. Gamification Impact

**XP:** 5 XP (mood + context)

### 5. Architecture Solution

**Contextual logging:**
```typescript
const locationContext = extractLocation(input);
if (locationContext && !userHasPlace(locationContext)) {
  // Don't auto-create, just note it
  moodEntry.locationContext = locationContext;
}
```

**UI:** "Logged your beach mood! " (no prompts to add complexity)

---

## Use Case UC-018: Mood After Event

**Persona:** Dabbler

### 1. User Phrase/Scenario

User says: "The party was fun, feeling happy."

Voice variations:
- "Had a great time at dinner, good mood"
- "Movie was boring, feeling meh"

### 2. Data Model Mapping

**Created Entities:**

1. **MoodEntry**
```typescript
{
  overallRating: 8,
  emotions: ['happy', 'social'],
  context: 'After party',
  triggers: ['social_event']
}
```

2. **Event** (if user has events enabled)
```typescript
{
  title: 'Party',
  category: 'social',
  kind: 'event',
  moodImpact: 8
}
```

### 3. Parsing/Disambiguation Approach

**Detection signals:**
- Past event reference: "party was"
- Mood qualifier: "feeling happy"

**Dabbler preference:** Don't force event creation, just log mood with context

### 4. Gamification Impact

**XP:** 5 XP (simple mood log)

### 5. Architecture Solution

**Minimal entity creation:**
```typescript
// For Dabbler, mood is primary, event is optional
const mood = await moodApi.create({
  rating: 8,
  context: 'After party'
});
// Skip event creation unless explicitly requested
```

---

## Use Case UC-019: Mood Check Decline

**Persona:** Dabbler

### 1. User Phrase/Scenario

System prompts: "How are you feeling?" User responds: "Don't want to log right now" or just closes the prompt.

### 2. Data Model Mapping

**No entity created.** System respects decline gracefully.

### 3. Parsing/Disambiguation Approach

**Decline detection:**
- Explicit: "don't want to", "skip", "not now"
- Implicit: Dismiss gesture, silence after 5 seconds

**System response:** Accept gracefully, no guilt

### 4. Gamification Impact

**XP:** 0 (no penalty either)

**Streak:** Not affected (Dabbler grace period)

### 5. Architecture Solution

**Graceful decline:**
```typescript
if (isDeclineIntent(response) || response === null) {
  await prompts.dismiss(promptId);
  // No notification, no "you missed..."
  // Just silently close
}
```

**UI:** Prompt fades away. No guilt messaging.

---

## Use Case UC-020: Return After Absence Mood

**Persona:** Dabbler

### 1. User Phrase/Scenario

User returns after 10 days and says: "Haven't been here in a while. Feeling okay."

Voice variations:
- "Back after a break, doing fine"
- "Hi again, mood is alright"

### 2. Data Model Mapping

**Created Entity:**

1. **MoodEntry**
```typescript
{
  overallRating: 6,
  emotions: ['neutral'],
  context: 'Return after absence',
  isReturnEntry: true
}
```

### 3. Parsing/Disambiguation Approach

**Context awareness:**
- System knows user has been absent
- "Haven't been here" confirms awareness
- Parse mood from "feeling okay" = 6

### 4. Gamification Impact

**XP:** 10 XP (Welcome back bonus!)
**Streak:** Fresh start, day 1

**Messaging:**
- NOT: "You broke your streak!"
- YES: "Welcome back! Great to see you."

### 5. Architecture Solution

**Return detection:**
```typescript
const daysSinceLastActivity = getDaysSince(user.lastActiveAt);
if (daysSinceLastActivity > 5) {
  entry.isReturnEntry = true;
  showWelcomeBack(); // Warm, not guilt-inducing
}
```

**UI:** "Welcome back! Logged your mood. Day 1 of a new streak starts now."

---

## Use Case UC-021: Mood Expressed as Weather Metaphor

**Persona:** Dabbler

### 1. User Phrase/Scenario

User says: "Feeling sunny today!" or "Kind of cloudy mood"

Voice variations:
- "It's a sunny day in my head"
- "Stormy mood"
- "Feeling foggy"

### 2. Data Model Mapping

**Created Entity:**

1. **MoodEntry** (metaphor parsed)
```typescript
{
  overallRating: 8, // "Sunny" = positive
  emotions: ['cheerful', 'optimistic'],
  context: 'Sunny metaphor',
  inputType: 'metaphor'
}
```

### 3. Parsing/Disambiguation Approach

**Weather-mood mapping:**
```typescript
const WEATHER_MOOD_MAP = {
  'sunny': 8, 'bright': 8, 'clear': 7,
  'cloudy': 5, 'foggy': 4, 'overcast': 5,
  'stormy': 3, 'rainy': 4, 'thunderstorm': 2
};
```

### 4. Gamification Impact

**XP:** 5 XP + 2 XP creative expression bonus

### 5. Architecture Solution

**Metaphor detection:**
```typescript
const isMetaphor = detectWeatherMetaphor(input);
if (isMetaphor) {
  const rating = mapWeatherToMood(extractWeather(input));
  entry.inputType = 'metaphor';
}
```

**UI:** "Sunshine vibes logged! Have a great day!"

---

## Use Case UC-022: Voice Note with Mood Undertone

**Persona:** Dabbler

### 1. User Phrase/Scenario

User says: "Just wanted to say my day went well. The new project is exciting and I'm looking forward to tomorrow."

### 2. Data Model Mapping

**Created Entities:**

1. **JournalEntry** (primary)
```typescript
{
  title: 'Daily thought',
  bodyMarkdown: input,
  moodRating: 8, // Inferred
  emotions: ['excited', 'optimistic']
}
```

2. **MoodEntry** (auto-inferred, background)
```typescript
{
  overallRating: 8,
  emotions: ['excited', 'optimistic'],
  inferredFromJournal: true
}
```

### 3. Parsing/Disambiguation Approach

**Classification:** Note/Journal (primary), with mood extraction
**Dabbler handling:** Don't ask "was this a mood log?" Just capture everything

### 4. Gamification Impact

**XP:** 5 XP for journal, mood captured silently

### 5. Architecture Solution

**Passive mood extraction:**
```typescript
const journal = await journalApi.create({ content: input });
// Background: extract mood for trends without user action
await moodApi.inferFromJournal(journal.id);
```

**UI:** "Thought captured! Sounds like an exciting time."

---

## Privacy-First Persona Use Cases

---

## Use Case UC-023: Local-Only Mood Log

**Persona:** Privacy-First

### 1. User Phrase/Scenario

User says: "Mood is 6 today. Keep it local only, don't sync."

Voice variations:
- "Private mood entry: 6 out of 10"
- "Log mood 6, no cloud"

### 2. Data Model Mapping

**Created Entity (local only):**

```typescript
{
  id: 'local-mood-uuid',
  overallRating: 6,
  syncStatus: 'local_only',
  cloudSync: false,
  aiProcessing: false,
  encryptionLevel: 'local'
}
```

**Database:** SQLite local only, not queued for Supabase sync

### 3. Parsing/Disambiguation Approach

**Privacy signal detection:**
- "Local only", "don't sync", "no cloud", "private"
- Sets `syncStatus: 'local_only'` flag

### 4. Gamification Impact

**XP:** 5 XP (local XP, not synced to server)
**Note:** Privacy-First may have gamification disabled anyway

### 5. Architecture Solution

**Local-only storage:**
```typescript
// File: apps/insight-mobile/src/storage/local-only.ts
await localDB.mood.create({
  ...moodEntry,
  syncStatus: 'local_only'
});
// Entry never added to sync queue
```

**UI indicator:** Lock icon on entry, "Stored locally only"

---

## Use Case UC-024: Encrypted Mood Entry

**Persona:** Privacy-First

### 1. User Phrase/Scenario

User enables enhanced privacy mode and says: "Mood is 4, feeling anxious about the medical appointment tomorrow."

### 2. Data Model Mapping

**Created Entity (E2E encrypted):**

```typescript
{
  id: 'mood-uuid',
  encryptedContent: 'AES-256-GCM-encrypted-blob',
  iv: 'initialization-vector',
  contentHash: 'sha256-hash',
  metadata: {
    createdAt: Date.now(),
    type: 'mood'
    // NO plaintext mood value, context, or triggers stored
  }
}
```

### 3. Parsing/Disambiguation Approach

**All parsing happens client-side:**
1. Voice transcribed locally (or with consent to Deepgram)
2. Mood parsed on device
3. Encrypted before any network transmission
4. Server stores only encrypted blob

### 4. Gamification Impact

**XP:** Tracked locally only (if enabled)
**Server knows:** Entry exists, timestamp, type (not content)

### 5. Architecture Solution

**E2E encryption flow:**
```typescript
// File: apps/insight-mobile/src/crypto/e2e.ts
const plaintext = JSON.stringify(moodEntry);
const encrypted = await e2eEncrypt(plaintext, userMasterKey);

// Sync encrypted blob
await syncQueue.enqueue({
  table: 'encrypted_entries',
  data: {
    encryptedContent: encrypted.ciphertext,
    iv: encrypted.iv,
    metadata: { type: 'mood', createdAt: Date.now() }
  }
});
```

---

## Use Case UC-025: Mood Log Without AI Processing

**Persona:** Privacy-First

### 1. User Phrase/Scenario

User says: "Log mood 7. No AI analysis on this."

Voice variations:
- "Mood 7, skip the AI features"
- "Record mood without AI processing"

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  overallRating: 7,
  aiProcessing: false,
  excludeFromReflections: true,
  excludeFromCorrelations: true,
  excludeFromInsights: true
}
```

### 3. Parsing/Disambiguation Approach

**AI exclusion signals:**
- "No AI", "skip AI", "without AI"
- Respects user's data processing preferences

### 4. Gamification Impact

**XP:** Standard (5 XP), stored locally

### 5. Architecture Solution

**Processing exclusion:**
```typescript
// Entry flagged to skip all AI pipelines
entry.processingFlags = {
  skipLLMAnalysis: true,
  skipCorrelationEngine: true,
  skipWeeklyReflection: true,
  skipSemanticSearch: true
};
```

**System respect:** Entry logged but never sent to OpenAI or analysis functions

---

## Use Case UC-026: Aliased Person in Mood Context

**Persona:** Privacy-First

### 1. User Phrase/Scenario

User says: "Mood dropped to 4 after argument with @colleague_alpha."

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  overallRating: 4,
  context: 'After argument',
  people: ['colleague_alpha'], // Alias, not real name
  triggers: ['interpersonal_conflict']
}
```

**Person reference:** Alias only, no real name stored

### 3. Parsing/Disambiguation Approach

**Alias handling:**
- @colleague_alpha parsed as person reference
- System doesn't know or store actual name
- User maintains alias->name mapping locally (optional)

### 4. Gamification Impact

**XP:** 10 XP (mood with context)

### 5. Architecture Solution

**Alias preservation:**
```typescript
// Never attempt to resolve alias to real name
const personRef = extractMention(input); // '@colleague_alpha'
entry.people = [personRef]; // Store alias as-is
// No phone contact lookup, no social graph enrichment
```

---

## Use Case UC-027: Mood Export Request

**Persona:** Privacy-First

### 1. User Phrase/Scenario

User says: "Export all my mood data as JSON to my device."

### 2. Data Model Mapping

**Export operation:**

```typescript
interface MoodExport {
  format: 'json',
  scope: 'mood_entries',
  delivery: 'local_file',
  includeMetadata: true,
  dateRange: 'all'
}
```

### 3. Parsing/Disambiguation Approach

**Export intent detection:**
- "Export", "download", "backup"
- Format specification: "as JSON"
- Destination: "to my device" = local file

### 4. Gamification Impact

**XP:** 5 XP (data stewardship)

### 5. Architecture Solution

**Local export:**
```typescript
const moodData = await localDB.mood.getAll();
const json = JSON.stringify(moodData, null, 2);
await FileSystem.writeAsStringAsync(
  `${FileSystem.documentDirectory}mood_export_${Date.now()}.json`,
  json
);
```

**UI:** "Mood data exported to your device. You own this data."

---

## Use Case UC-028: Mood Log Deletion Request

**Persona:** Privacy-First

### 1. User Phrase/Scenario

User says: "Delete all my mood entries from last week permanently."

### 2. Data Model Mapping

**Deletion operation:**

```typescript
interface DeletionRequest {
  table: 'mood_entries',
  dateRange: { start: lastWeekStart, end: lastWeekEnd },
  deletionType: 'permanent', // Not soft delete
  includeBackups: true
}
```

### 3. Parsing/Disambiguation Approach

**Deletion intent:**
- "Delete", "remove", "erase"
- Scope: "last week"
- Type: "permanently" = hard delete

### 4. Gamification Impact

**XP:** Deducted from affected entries (if tracked)

### 5. Architecture Solution

**Permanent deletion:**
```typescript
// Hard delete, no soft delete flag
await moodApi.permanentDelete({
  dateRange: lastWeek,
  includeServerCopy: true,
  includeBackups: true
});

// Deletion certificate
const certificate = {
  id: `del_${uuid()}`,
  deletedCount: 12,
  scope: 'mood_entries',
  timestamp: Date.now()
};
```

**Confirmation:** "12 mood entries permanently deleted. Deletion certificate: del_xxx"

---

## Use Case UC-029: Mood Data Retention Audit

**Persona:** Privacy-First

### 1. User Phrase/Scenario

User asks: "What mood data do you have stored about me and where?"

### 2. Data Model Mapping

**Audit response:**

```typescript
{
  local: {
    entries: 156,
    dateRange: '2025-06-01 to 2026-01-18',
    sizeBytes: 245000
  },
  cloud: {
    entries: 0, // E2E encrypted
    encryptedBlobs: 156,
    canDecrypt: false // Server cannot read
  },
  backups: {
    iCloud: 'user_controlled',
    insightServers: 'none'
  }
}
```

### 3. Parsing/Disambiguation Approach

**Audit request detection:**
- "What data", "what do you have", "where is my data"

### 4. Gamification Impact

**XP:** 3 XP (data awareness)

### 5. Architecture Solution

**Data inventory:**
```typescript
const audit = {
  local: await localDB.getInventory('mood'),
  cloud: await cloudApi.getInventory('mood', { encryptedOnly: true }),
  processing: await getProcessingLog('mood')
};
```

**UI:** Full transparency report with storage locations

---

## Use Case UC-030: Opt-Out of Mood Correlation Analysis

**Persona:** Privacy-First

### 1. User Phrase/Scenario

User says: "Stop analyzing my mood data for correlations."

### 2. Data Model Mapping

**Preference update:**

```typescript
{
  userId: 'user-123',
  preferences: {
    mood: {
      enableCorrelationAnalysis: false,
      enableTrendAnalysis: false,
      enableAIInsights: false
    }
  }
}
```

### 3. Parsing/Disambiguation Approach

**Opt-out detection:**
- "Stop analyzing", "don't analyze", "opt out"
- Scope: "mood data", "correlations"

### 4. Gamification Impact

**XP:** N/A (preference change)

### 5. Architecture Solution

**Preference enforcement:**
```typescript
await preferencesApi.update({
  moodAnalysis: {
    correlations: false,
    trends: false,
    aiInsights: false
  }
});
// All future mood entries excluded from analysis pipelines
```

---

## Use Case UC-031: Voice Transcription Privacy Check

**Persona:** Privacy-First

### 1. User Phrase/Scenario

Before logging mood by voice, user asks: "Where does my voice recording go?"

### 2. Data Model Mapping

**Information response (no entity created):**

### 3. Parsing/Disambiguation Approach

**Privacy inquiry detection:**
- Questions about "voice recording", "where does", "who hears"

### 4. Gamification Impact

**XP:** 0 (inquiry only)

### 5. Architecture Solution

**Transparency response:**
```typescript
const currentMode = await voiceSettings.getMode();
if (currentMode === 'local') {
  return `Your voice is transcribed on-device. The recording is immediately
  deleted after transcription. Audio never leaves your device.`;
} else {
  return `Voice is sent to Deepgram for transcription, then immediately
  deleted. Audio is not stored. Switch to local-only mode in Settings.`;
}
```

---

## Use Case UC-032: Hidden Mood Journal

**Persona:** Privacy-First

### 1. User Phrase/Scenario

User says: "Add this to my hidden journal: Mood is 3, really struggling with the anxiety today. Don't want anyone to see this."

### 2. Data Model Mapping

**Created Entity (hidden tier):**

```typescript
{
  id: 'hidden-mood-uuid',
  overallRating: 3,
  emotions: ['anxious', 'struggling'],
  privacyTier: 'hidden',
  requiresBiometricToView: true,
  hiddenFromTimeline: true,
  syncStatus: 'local_only'
}
```

### 3. Parsing/Disambiguation Approach

**Hidden journal trigger:**
- "Hidden journal", "don't want anyone to see"
- Activates maximum privacy tier

### 4. Gamification Impact

**XP:** Tracked separately in hidden stats (if enabled)

### 5. Architecture Solution

**Hidden storage:**
```typescript
// Separate encrypted database partition
await hiddenDB.mood.create({
  ...entry,
  accessRequires: 'biometric',
  timelineVisibility: 'hidden'
});
// Never synced, never analyzed, requires biometric to view
```

---

## Use Case UC-033: Request Mood Processing Transparency

**Persona:** Privacy-First

### 1. User Phrase/Scenario

User asks: "Explain exactly what happens when I log my mood."

### 2. Data Model Mapping

**Information response:**

### 3. Parsing/Disambiguation Approach

**Transparency request:**
- "Explain", "what happens", "processing"

### 4. Gamification Impact

**XP:** 0 (information only)

### 5. Architecture Solution

**Processing explanation:**
```
When you log mood with your current settings:

1. Voice transcribed: ON-DEVICE (recording deleted immediately)
2. Mood parsed: ON-DEVICE (no server processing)
3. Data stored: LOCAL + ENCRYPTED CLOUD SYNC
4. AI analysis: DISABLED (per your preference)
5. Correlation engine: DISABLED (per your preference)
6. Weekly reflection: EXCLUDED

Your mood rating and emotions are visible only to you.
Server sees only: encrypted blob, timestamp, entry type.

[View full data flow diagram]
```

---

## Neurodivergent Persona Use Cases

---

## Use Case UC-034: Mood Check with Memory Uncertainty

**Persona:** Neurodivergent

### 1. User Phrase/Scenario

User says: "Wait, did I already log my mood today? I can't remember."

Voice variations:
- "I forget if I did my mood check"
- "Did I already track how I'm feeling?"

### 2. Data Model Mapping

**Query operation first, then optional creation:**

```typescript
// Query
const todaysMood = await moodApi.getToday();
// Returns: { logged: true, rating: 6, time: '9:15 AM' }
// OR: { logged: false }
```

### 3. Parsing/Disambiguation Approach

**Memory assistance detection:**
- "Did I already", "I can't remember", "forget if"
- System checks before prompting new entry

### 4. Gamification Impact

**XP:** 0 for query, 5 for new entry if created

**Key:** No shame response regardless of answer

### 5. Architecture Solution

**Gentle memory assist:**
```typescript
if (isMemoryQuery(input)) {
  const existing = await moodApi.getToday();
  if (existing.logged) {
    return `Yes! You logged mood ${existing.rating}/10 at ${existing.time}.
    Want to log another check-in?`;
  } else {
    return `I don't see a mood log today yet. Want to log one now? No pressure.`;
  }
}
```

**UI:** Factual, non-judgmental response with easy action option

---

## Use Case UC-035: Stream-of-Consciousness Mood Capture

**Persona:** Neurodivergent

### 1. User Phrase/Scenario

User says: "I don't know, I guess I'm feeling kind of overwhelmed but also like there's this excitement about the project, but the overwhelm is more prominent, maybe a 4 or 5? No wait, probably a 4 because the anxiety is pretty high, like maybe an 8 for anxiety, but overall I'm surviving."

### 2. Data Model Mapping

**Extracted from stream:**

```typescript
{
  overallRating: 4, // Settled on 4
  dimensions: {
    anxiety: 8,
    energy: null // Not mentioned
  },
  emotions: ['overwhelmed', 'anxious', 'excited'],
  context: 'Project-related mixed feelings',
  emotionBalance: { positive: 1, negative: 2 }
}
```

### 3. Parsing/Disambiguation Approach

**Stream parsing:**
1. Extract all numeric mentions: 4, 5, 4, 8
2. Identify self-corrections: "No wait, probably a 4"
3. Final value = last mentioned value for each metric
4. Preserve emotional complexity (multiple emotions)

**File reference:** `supabase/functions/transcribe_and_parse_capture/stream-parser.ts`

### 4. Gamification Impact

**XP:** 10 XP (detailed emotional processing)
**No penalty for length or tangents**

### 5. Architecture Solution

**Self-correction handling:**
```typescript
const numbers = extractNumbersWithContext(input);
// [{ value: 4, context: 'feeling' }, { value: 5, context: 'or' },
//  { value: 4, context: 'because' }, { value: 8, context: 'anxiety' }]
const corrections = detectSelfCorrections(input); // ['No wait']
const finalRatings = applyCorrections(numbers, corrections);
// { mood: 4, anxiety: 8 }
```

**UI feedback:** "Got it: Mood 4, Anxiety 8. Sounds like a mix of overwhelm and excitement. That's valid."

---

## Use Case UC-036: Mood Check During Task Paralysis

**Persona:** Neurodivergent

### 1. User Phrase/Scenario

User says: "I can't do anything today. Brain is frozen. Mood... I don't know... bad."

Voice variations:
- "Everything is stuck"
- "Can't start anything"
- "Paralyzed"

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  overallRating: 3, // "Bad" = low
  dimensions: {
    energy: 2, // Inferred from paralysis
    motivation: 1 // Inferred from "can't do anything"
  },
  emotions: ['stuck', 'overwhelmed', 'paralyzed'],
  context: 'Task paralysis state',
  stateType: 'executive_dysfunction'
}
```

### 3. Parsing/Disambiguation Approach

**Paralysis detection:**
- "Can't do anything", "frozen", "stuck", "paralyzed"
- These are NOT laziness - flag as executive dysfunction

**Non-punitive parsing:** Low ratings don't trigger "try harder" messaging

### 4. Gamification Impact

**XP:** 8 XP (logging during difficult state is hard, reward it)
**Message tone:** Supportive, not demanding

### 5. Architecture Solution

**Supportive response:**
```typescript
if (detectParalysisState(input)) {
  return {
    mood: entry,
    response: `Logged. That sounds really hard. You don't have to do anything
    big right now. Would a 2-minute body doubling session help, or do you
    want me to just be quiet?`,
    suggestedActions: ['Start tiny task', 'Body doubling', 'Just rest']
  };
}
```

---

## Use Case UC-037: Medication Effect Mood Check

**Persona:** Neurodivergent

### 1. User Phrase/Scenario

User says: "Meds kicked in. Mood improved to 7, focus is definitely better, maybe 8. Energy still low though, maybe 4."

### 2. Data Model Mapping

**Created Entities:**

1. **MoodEntry** (post-medication)
```typescript
{
  overallRating: 7,
  dimensions: { focus: 8, energy: 4 },
  context: 'Post-medication check',
  medicationRelated: true,
  medicationPhase: 'active'
}
```

2. **Medication correlation log**
```typescript
{
  medicationLogId: 'med-log-uuid',
  checkType: 'effectiveness',
  moodDelta: +3, // If previous check exists
  focusDelta: +4
}
```

### 3. Parsing/Disambiguation Approach

**Medication context:**
- "Meds kicked in", "medication working"
- Links to most recent medication log
- Calculates delta from pre-medication state

### 4. Gamification Impact

**XP:** 15 XP (medication tracking is valuable data)

### 5. Architecture Solution

**Medication correlation:**
```typescript
const recentMedLog = await medicationApi.getRecent({ withinHours: 4 });
if (recentMedLog) {
  entry.medicationLogId = recentMedLog.id;
  entry.medicationPhase = 'active';

  // Find pre-medication mood
  const preMood = await moodApi.findBefore(recentMedLog.timestamp);
  if (preMood) {
    entry.medicationDelta = entry.overallRating - preMood.overallRating;
  }
}
```

---

## Use Case UC-038: Mood with Time Blindness Context

**Persona:** Neurodivergent

### 1. User Phrase/Scenario

User says: "I think I've been feeling anxious all day but I'm not sure how long it's been. Mood is 5, anxiety high."

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  overallRating: 5,
  dimensions: { anxiety: 8 }, // "High" = 8
  temporalUncertainty: true,
  context: 'Duration uncertain due to time blindness',
  emotions: ['anxious']
}
```

### 3. Parsing/Disambiguation Approach

**Time blindness signals:**
- "Not sure how long", "all day but not sure", "lost track"
- Don't force precise timestamps

**System accommodation:** Accept temporal ambiguity without pushing for specifics

### 4. Gamification Impact

**XP:** 8 XP (mood logged despite temporal confusion)

### 5. Architecture Solution

**Temporal flexibility:**
```typescript
if (detectTemporalUncertainty(input)) {
  entry.temporalUncertainty = true;
  entry.durationEstimate = 'unknown';
  // Don't ask "when did this start?"
}
```

**Response:** "Logged. Anxiety can stretch time weird. Want me to check in again later?"

---

## Use Case UC-039: Simplified Mood Prompt Response

**Persona:** Neurodivergent

### 1. User Phrase/Scenario

System offers: "Quick check: Pick a number 1-10 for how you're feeling."
User responds: "6"

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  overallRating: 6,
  inputMethod: 'simplified_prompt',
  processingMode: 'minimal'
}
```

### 3. Parsing/Disambiguation Approach

**Single number response:**
- Expected from simplified prompt context
- No parsing needed, direct mapping

### 4. Gamification Impact

**XP:** 5 XP (simplicity rewarded equally)

### 5. Architecture Solution

**Low-friction entry:**
```typescript
// Simplified prompt mode
if (promptContext.type === 'simplified_mood') {
  const rating = parseInt(response.trim());
  if (rating >= 1 && rating <= 10) {
    await moodApi.quickLog({ rating });
    return "Got it!"; // Minimal response
  }
}
```

**UI:** Number accepted immediately, no follow-up questions

---

## Use Case UC-040: Mood During Sensory Overload

**Persona:** Neurodivergent

### 1. User Phrase/Scenario

User says: "Everything is too loud and too much. Mood bad. Need quiet."

Voice variations:
- "Overstimulated, mood 2"
- "Sensory overload happening"

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  overallRating: 2,
  dimensions: {
    anxiety: 9,
    energy: 1 // Depleted
  },
  emotions: ['overwhelmed', 'overstimulated'],
  context: 'Sensory overload state',
  stateType: 'sensory_overload'
}
```

### 3. Parsing/Disambiguation Approach

**Sensory overload detection:**
- "Too loud", "too much", "overstimulated"
- Triggers minimal response mode

### 4. Gamification Impact

**XP:** 5 XP (logged under duress)
**Response mode:** Ultra-brief

### 5. Architecture Solution

**Minimal response during overload:**
```typescript
if (detectSensoryOverload(input)) {
  await moodApi.create(entry);
  // Minimal feedback - don't add to stimulation
  return {
    text: "Logged.",
    suppressAnimations: true,
    suppressSounds: true,
    autoEnableQuietMode: true
  };
}
```

**System action:** Auto-enable quiet mode, no celebrations, minimal UI

---

## Use Case UC-041: Mood Check with RSD Awareness

**Persona:** Neurodivergent

### 1. User Phrase/Scenario

User says: "Mood crashed after that email. Probably a 2. I know I'm overreacting but it hit hard."

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  overallRating: 2,
  emotions: ['hurt', 'rejected', 'spiraling'],
  triggers: ['email', 'perceived_criticism'],
  context: 'RSD trigger event',
  selfAwareness: 'acknowledged_intensity'
}
```

### 3. Parsing/Disambiguation Approach

**RSD signal detection:**
- Sharp mood drop from interpersonal trigger
- Self-aware language: "I know I'm overreacting"
- Validate feelings, don't agree with "overreacting" framing

### 4. Gamification Impact

**XP:** 10 XP (emotional self-awareness)

### 5. Architecture Solution

**RSD-aware response:**
```typescript
if (detectRSDTrigger(input)) {
  const response = `Logged mood 2. That email really affected you - your
  feelings are valid even when they feel big. Would you like to write
  more about it, or do something else entirely?`;
  // Don't say "you're not overreacting" - validate without arguing
}
```

---

## Use Case UC-042: Hyperfocus Exit Mood Check

**Persona:** Neurodivergent

### 1. User Phrase/Scenario

User says: "Just surfaced from 5 hours of hyperfocus. What time is it? Mood is actually good, like 8, but I'm exhausted."

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  overallRating: 8,
  dimensions: {
    energy: 3,
    focus: 9 // Just coming off peak
  },
  emotions: ['satisfied', 'depleted'],
  context: 'Post-hyperfocus state',
  stateType: 'hyperfocus_exit'
}
```

### 3. Parsing/Disambiguation Approach

**Hyperfocus markers:**
- "Surfaced from", "lost track of time"
- Paradox: good mood + exhaustion (typical of hyperfocus exit)

### 4. Gamification Impact

**XP:** 12 XP (productive state documented)

### 5. Architecture Solution

**Time anchor assist:**
```typescript
if (detectHyperfocusExit(input)) {
  const currentTime = formatTime(Date.now(), user.timezone);
  return {
    entry: moodEntry,
    response: `It's ${currentTime}. Logged: Mood 8, energy depleted.
    Hyperfocus can be productive but draining. Don't forget to eat!`
  };
}
```

---

## Use Case UC-043: Recovery Day Mood Check

**Persona:** Neurodivergent

### 1. User Phrase/Scenario

User returns after 8 days and says: "I'm back. Bad week but I'm here. Mood is maybe 5."

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  overallRating: 5,
  context: 'Recovery return after absence',
  isReturnEntry: true,
  absenceDays: 8
}
```

### 3. Parsing/Disambiguation Approach

**Return detection:**
- "I'm back", absence in activity log
- "Bad week" acknowledged without probing

### 4. Gamification Impact

**XP:** 15 XP (Welcome back bonus)
**Streak:** Fresh start at day 1
**Messaging:** Zero guilt, pure welcome

### 5. Architecture Solution

**Non-punitive return:**
```typescript
const response = `Welcome back. You showed up - that counts.
Logged mood 5. Your longest streak (23 days) is still in your records.
Today is day 1 of your next chapter. No pressure, what feels okay right now?`;
// NEVER mention "you were gone 8 days"
// NEVER mention "your streak broke"
```

---

## Use Case UC-044: Mood Template Usage

**Persona:** Neurodivergent

### 1. User Phrase/Scenario

User triggers template: "Use my morning check-in template"

System provides: "Mood (1-10)? Energy (1-10)? Did you sleep okay? Did you take meds?"

User responds: "6, 4, not really, yes"

### 2. Data Model Mapping

**Created Entities:**

```typescript
// MoodEntry
{
  overallRating: 6,
  dimensions: { energy: 4 }
}

// TrackerLogs
[
  { trackerKey: 'sleep_quality', valueBoolean: false },
  { trackerKey: 'medication', valueBoolean: true }
]
```

### 3. Parsing/Disambiguation Approach

**Template-guided parsing:**
- Position-based: answers map to template questions
- Flexible interpretation: "not really" = false

### 4. Gamification Impact

**XP:** 12 XP (completed full template)

### 5. Architecture Solution

**Template handler:**
```typescript
const templateQuestions = [
  { key: 'mood', type: 'number' },
  { key: 'energy', type: 'number' },
  { key: 'sleep_quality', type: 'boolean' },
  { key: 'medication', type: 'boolean' }
];
const answers = parseTemplateResponse(response, templateQuestions);
// { mood: 6, energy: 4, sleep_quality: false, medication: true }
```

---

## Use Case UC-045: Mood Expressed as Spoon Level

**Persona:** Neurodivergent

### 1. User Phrase/Scenario

User says: "I've got maybe 2 spoons left today. Mood is whatever that translates to."

Voice variations:
- "Low spoons, low mood"
- "Running on empty spoons"

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  overallRating: 3, // 2 spoons out of typical 10 -> ~3
  dimensions: { energy: 2 },
  emotions: ['depleted'],
  inputMethod: 'spoon_theory',
  spoonCount: 2
}
```

### 3. Parsing/Disambiguation Approach

**Spoon theory recognition:**
- "Spoons" is recognized metaphor for energy/capacity
- Maps spoon count to energy and mood estimate

**Mapping:**
```typescript
const SPOON_TO_RATING = {
  0: 1, 1: 2, 2: 3, 3: 4, 4: 5,
  5: 6, 6: 6, 7: 7, 8: 7, 9: 8, 10: 9
};
```

### 4. Gamification Impact

**XP:** 8 XP (valid self-assessment method)

### 5. Architecture Solution

**Spoon theory parser:**
```typescript
const spoonMatch = input.match(/(\d+)\s*spoons?/i);
if (spoonMatch) {
  const spoons = parseInt(spoonMatch[1]);
  entry.spoonCount = spoons;
  entry.overallRating = SPOON_TO_RATING[spoons] || Math.round(spoons / 10 * 9);
  entry.dimensions.energy = Math.max(1, Math.round(spoons));
}
```

**Response:** "Got it - 2 spoons. That's a low capacity day. Be gentle with yourself."

---

## Biohacker Persona Use Cases

---

## Use Case UC-046: Mood with Full Biometrics

**Persona:** Biohacker

### 1. User Phrase/Scenario

User says: "Morning metrics. Mood 7, energy 8, focus 7. HRV was 68, resting heart rate 52, sleep was 7.8 hours with 2.1 hours deep. Took morning stack: 500mg lion's mane, 300mg alpha-GPC."

### 2. Data Model Mapping

**Created Entities:**

1. **MoodEntry**
```typescript
{
  overallRating: 7,
  dimensions: { energy: 8, focus: 7 }
}
```

2. **TrackerLogs** (6 records)
```typescript
[
  { trackerKey: 'mood', valueNumeric: 7 },
  { trackerKey: 'energy', valueNumeric: 8 },
  { trackerKey: 'focus', valueNumeric: 7 },
  { trackerKey: 'hrv', valueNumeric: 68 },
  { trackerKey: 'rhr', valueNumeric: 52 },
  { trackerKey: 'sleep_duration', valueNumeric: 7.8 },
  { trackerKey: 'deep_sleep', valueNumeric: 2.1 }
]
```

3. **NutritionLog** (supplements)
```typescript
{
  mealType: 'supplement',
  items: [
    { name: "Lion's Mane", dosage: 500, unit: 'mg' },
    { name: "Alpha-GPC", dosage: 300, unit: 'mg' }
  ]
}
```

### 3. Parsing/Disambiguation Approach

**Multi-domain extraction:**
1. Mood/subjective metrics parsed first
2. Biometrics extracted (HRV, RHR, sleep)
3. Supplement stack identified separately

### 4. Gamification Impact

**XP:** 35 XP (comprehensive morning logging)
- Base: 15 XP
- Multi-metric bonus: +10 XP
- Supplement tracking: +10 XP

### 5. Architecture Solution

**Batch creation:**
```typescript
const batch = await api.batch({
  operations: [
    { type: 'create', table: 'mood_entries', data: moodEntry },
    ...trackerLogs.map(t => ({ type: 'create', table: 'tracker_logs', data: t })),
    { type: 'create', table: 'nutrition_logs', data: supplementLog }
  ]
});
```

---

## Use Case UC-047: Mood Correlation with Supplements

**Persona:** Biohacker

### 1. User Phrase/Scenario

User asks: "What's the correlation between lion's mane and my focus scores?"

### 2. Data Model Mapping

**Query operation:**

```typescript
interface SupplementCorrelation {
  supplement: "lion's_mane",
  outcome: 'focus',
  lookbackDays: 90,
  lagHours: [0, 24, 48] // Check same-day and delayed effects
}
```

**Response:**
```typescript
{
  correlations: [
    { lag: 0, correlation: 0.35, pValue: 0.08 },
    { lag: 24, correlation: 0.52, pValue: 0.02 },
    { lag: 48, correlation: 0.45, pValue: 0.04 }
  ],
  recommendation: "Lion's Mane shows strongest correlation with focus at 24-hour lag (r=0.52, p<0.05)"
}
```

### 3. Parsing/Disambiguation Approach

**Correlation query parsing:**
- Variable extraction: lion's mane (input), focus (outcome)
- Default lag analysis for supplements

### 4. Gamification Impact

**XP:** 10 XP (data exploration)

### 5. Architecture Solution

**Correlation with lag analysis:**
```typescript
const result = await correlationEngine.analyze({
  input: { type: 'supplement', name: "lion's_mane" },
  outcome: { type: 'tracker', key: 'focus' },
  lags: [0, 24, 48],
  minSamples: 20
});
```

---

## Use Case UC-048: Mood During Fasting Experiment

**Persona:** Biohacker

### 1. User Phrase/Scenario

User says: "Hour 24 of fast. Mood check: 7, mental clarity is up to 8, hunger down to 3. Ketones reading 1.2 mmol."

### 2. Data Model Mapping

**Created Entities:**

1. **MoodEntry** (fasting context)
```typescript
{
  overallRating: 7,
  dimensions: { mentalClarity: 8 },
  experimentContext: {
    experimentId: 'fasting-exp-001',
    hour: 24
  }
}
```

2. **FastingCheckpoint** update
```typescript
{
  experimentId: 'fasting-exp-001',
  hour: 24,
  mood: 7,
  mentalClarity: 8,
  hunger: 3,
  ketones: 1.2
}
```

### 3. Parsing/Disambiguation Approach

**Experiment context detection:**
- "Hour 24 of fast" links to active fasting experiment
- All metrics logged as checkpoint data

### 4. Gamification Impact

**XP:** 20 XP (experiment data point)

### 5. Architecture Solution

**Experiment checkpoint:**
```typescript
const activeExperiment = await experimentsApi.getActive({ type: 'fasting' });
if (activeExperiment) {
  await experimentsApi.logCheckpoint({
    experimentId: activeExperiment.id,
    hour: 24,
    metrics: { mood: 7, mentalClarity: 8, hunger: 3, ketones: 1.2 }
  });
}
```

---

## Use Case UC-049: Mood Factor Analysis Request

**Persona:** Biohacker

### 1. User Phrase/Scenario

User asks: "What variables most strongly predict my mood?"

### 2. Data Model Mapping

**Analysis response:**

```typescript
{
  primaryFactors: [
    { variable: 'sleep_hours', correlation: 0.72, impact: '+0.8 mood per hour' },
    { variable: 'hrv', correlation: 0.65, impact: '+0.5 mood per 10 HRV' },
    { variable: 'workout_completed', correlation: 0.58, impact: '+1.2 on workout days' },
    { variable: 'caffeine_after_2pm', correlation: -0.45, impact: '-0.9 with late caffeine' }
  ],
  modelR2: 0.68 // 68% variance explained
}
```

### 3. Parsing/Disambiguation Approach

**Predictive analysis request:**
- "What predicts", "what affects", "factors"

### 4. Gamification Impact

**XP:** 15 XP (advanced analytics)

### 5. Architecture Solution

**Multi-factor regression:**
```typescript
const analysis = await analyticsApi.moodFactorAnalysis({
  outcome: 'mood',
  potentialFactors: ['sleep_hours', 'hrv', 'workout', 'caffeine', 'meditation'],
  lookbackDays: 180,
  minDataPoints: 50
});
```

---

## Use Case UC-050: Mood with CGM Glucose Context

**Persona:** Biohacker

### 1. User Phrase/Scenario

User says: "Mood dipped to 5, checking glucose... 78 mg/dL. Might be glucose related. Energy is 4."

### 2. Data Model Mapping

**Created Entities:**

1. **MoodEntry** with glucose context
```typescript
{
  overallRating: 5,
  dimensions: { energy: 4 },
  context: 'Glucose at 78 mg/dL (low)',
  potentialCause: 'low_glucose'
}
```

2. **TrackerLogs**
```typescript
[
  { trackerKey: 'glucose', valueNumeric: 78, unit: 'mg/dL' },
  { trackerKey: 'mood', valueNumeric: 5 },
  { trackerKey: 'energy', valueNumeric: 4 }
]
```

### 3. Parsing/Disambiguation Approach

**Causal hypothesis detection:**
- "Might be glucose related" indicates user hypothesis
- Link mood and glucose readings

### 4. Gamification Impact

**XP:** 15 XP (cause-effect tracking)

### 5. Architecture Solution

**Correlation note:**
```typescript
await correlationEngine.logObservation({
  observation: 'low_glucose_mood_dip',
  variables: [
    { key: 'glucose', value: 78 },
    { key: 'mood', value: 5 }
  ],
  userHypothesis: 'glucose_related'
});
```

---

## Use Case UC-051: Mood Experiment Protocol Setup

**Persona:** Biohacker

### 1. User Phrase/Scenario

User says: "Create experiment: test if morning meditation improves mood. 2 weeks baseline, 4 weeks intervention (20 min daily meditation), primary metric is afternoon mood rating."

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  id: 'exp-uuid',
  name: 'Morning Meditation Mood Study',
  hypothesis: 'Morning meditation improves afternoon mood',
  phases: [
    { name: 'baseline', durationWeeks: 2, intervention: null },
    { name: 'intervention', durationWeeks: 4, intervention: { activity: 'meditation', duration: 20, timing: 'morning' } }
  ],
  primaryMetric: { tracker: 'mood', timing: 'afternoon' },
  status: 'active'
}
```

### 3. Parsing/Disambiguation Approach

**Experiment creation parsing:**
- "Create experiment" intent
- Phase structure: baseline (2 weeks), intervention (4 weeks)
- Metric specification: afternoon mood

### 4. Gamification Impact

**XP:** 25 XP (experiment setup)

### 5. Architecture Solution

**Experiment framework:**
```typescript
const experiment = await experimentsApi.create({
  name: 'Morning Meditation Mood Study',
  design: {
    type: 'AB',
    phases: [
      { name: 'baseline', weeks: 2 },
      { name: 'intervention', weeks: 4, intervention: 'meditation_20min' }
    ]
  },
  primaryMetric: { tracker: 'mood', filter: { timeOfDay: 'afternoon' } },
  reminderDaily: true
});
```

---

## Use Case UC-052: Mood After Cold Exposure

**Persona:** Biohacker

### 1. User Phrase/Scenario

User says: "Post cold plunge mood check. Mood jumped to 9, energy 9, anxiety dropped to 2. 3 minutes at 38 degrees. The dopamine hit is real."

### 2. Data Model Mapping

**Created Entities:**

1. **MoodEntry** with intervention link
```typescript
{
  overallRating: 9,
  dimensions: { energy: 9, anxiety: 2 },
  context: 'Post cold plunge (3 min @ 38F)',
  linkedIntervention: {
    type: 'cold_exposure',
    duration: 3,
    temperature: 38
  }
}
```

2. **Event** (cold exposure)
```typescript
{
  title: 'Cold Plunge',
  category: 'biohacking',
  durationMinutes: 3,
  metrics: { temperature: 38, unit: 'fahrenheit' }
}
```

### 3. Parsing/Disambiguation Approach

**Intervention linking:**
- "Post cold plunge" links mood to recent intervention
- Extract temperature and duration for protocol tracking

### 4. Gamification Impact

**XP:** 25 XP (intervention + mood tracking)

### 5. Architecture Solution

**Intervention-mood correlation:**
```typescript
const intervention = await interventionsApi.log({
  type: 'cold_exposure',
  duration: 3,
  temperature: 38
});

await correlationEngine.linkInterventionOutcome({
  interventionId: intervention.id,
  outcomes: [
    { metric: 'mood', value: 9 },
    { metric: 'energy', value: 9 },
    { metric: 'anxiety', value: 2 }
  ]
});
```

---

## Use Case UC-053: Mood Attribution Analysis Request

**Persona:** Biohacker

### 1. User Phrase/Scenario

User asks: "Why was yesterday so good? My mood was a 9. What was different?"

### 2. Data Model Mapping

**Analysis response:**

```typescript
{
  targetDate: '2026-01-17',
  targetMood: 9,
  averageMood: 7.1,
  deviation: '+1.9 SD',
  attributionFactors: [
    { factor: 'sleep_hours', value: 8.5, avgValue: 7.2, impact: 'high' },
    { factor: 'hrv', value: 72, avgValue: 58, impact: 'high' },
    { factor: 'morning_workout', value: true, impact: 'medium' },
    { factor: 'no_alcohol_48h', value: true, impact: 'medium' },
    { factor: 'cold_exposure', value: true, impact: 'medium' }
  ],
  synthesis: 'Excellent sleep (8.5h) + high HRV (72) + workout + no alcohol appears to be your optimal combination.'
}
```

### 3. Parsing/Disambiguation Approach

**Attribution query:**
- "Why was [day] so [quality]"
- Temporal reference: "yesterday"
- Comparison intent: "what was different"

### 4. Gamification Impact

**XP:** 15 XP (insight discovery)

### 5. Architecture Solution

**Multi-factor attribution:**
```typescript
const attribution = await analyticsApi.attributeMood({
  date: yesterday,
  compareToBaseline: true,
  identifyDeviations: true
});
```

---

## Use Case UC-054: Mood Baseline Calibration

**Persona:** Biohacker

### 1. User Phrase/Scenario

User says: "I need to recalibrate my mood baseline. My 7 used to be different than my 7 now. For the next week, consider all my logs as calibration data."

### 2. Data Model Mapping

**Calibration mode activation:**

```typescript
{
  userId: 'user-123',
  calibrationMode: {
    active: true,
    startDate: Date.now(),
    endDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    trackers: ['mood'],
    purpose: 'baseline_recalibration'
  }
}
```

### 3. Parsing/Disambiguation Approach

**Calibration request:**
- "Recalibrate", "baseline"
- Duration: "for the next week"

### 4. Gamification Impact

**XP:** 20 XP (self-calibration awareness)

### 5. Architecture Solution

**Calibration period:**
```typescript
await calibrationApi.startPeriod({
  tracker: 'mood',
  duration: '7d',
  behavior: {
    excludeFromHistoricalComparison: true,
    markAsCalibration: true,
    promptForAnchoring: true // "Describe what 7 feels like today"
  }
});
```

---

## Use Case UC-055: Mood with Circadian Context

**Persona:** Biohacker

### 1. User Phrase/Scenario

User says: "Evening check. Mood 6, energy 4, it's 9pm which is late for my chronotype. Melatonin should be kicking in."

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  overallRating: 6,
  dimensions: { energy: 4 },
  circadianContext: {
    timeOfDay: 'evening',
    relativeToChronotype: 'late',
    melatoninTaken: true
  }
}
```

### 3. Parsing/Disambiguation Approach

**Circadian awareness:**
- User mentions chronotype
- Time context (9pm = late for early chronotype)
- Supplement timing (melatonin)

### 4. Gamification Impact

**XP:** 12 XP (contextual logging)

### 5. Architecture Solution

**Chronotype integration:**
```typescript
const userChronotype = await profileApi.getChronotype(); // 'early_bird'
const currentHour = 21; // 9pm
const circadianContext = {
  isLateForChronotype: currentHour > userChronotype.idealSleepStart,
  expectedMelatoninWindow: calculateMelatoninWindow(userChronotype)
};
```

---

## Use Case UC-056: Weekly Mood Experiment Review

**Persona:** Biohacker

### 1. User Phrase/Scenario

User asks: "How's my meditation experiment going? Show me the mood data comparison."

### 2. Data Model Mapping

**Experiment analysis response:**

```typescript
{
  experimentId: 'meditation-mood-exp',
  currentPhase: 'intervention',
  weekInPhase: 2,
  comparison: {
    baseline: { avgMood: 6.5, stdDev: 1.2, n: 14 },
    intervention: { avgMood: 7.3, stdDev: 0.9, n: 14 },
    currentDelta: +0.8,
    statisticalSignificance: 'approaching (p=0.08)',
    projectedAtEnd: 'likely significant at week 4'
  },
  adherence: {
    meditationCompliance: 12/14, // 86%
    moodLoggingCompliance: 14/14 // 100%
  }
}
```

### 3. Parsing/Disambiguation Approach

**Experiment status query:**
- "How's my [experiment] going"
- Data request: "show me the data"

### 4. Gamification Impact

**XP:** 10 XP (experiment monitoring)

### 5. Architecture Solution

**Interim analysis:**
```typescript
const analysis = await experimentsApi.getInterimAnalysis({
  experimentId: activeExperiment.id,
  includeProjection: true,
  includeAdherence: true
});
```

---

## Reflector Persona Use Cases

---

## Use Case UC-057: Mood from Journaling Prose

**Persona:** Reflector

### 1. User Phrase/Scenario

User writes/says: "Today feels heavy. I keep thinking about the conversation with Mom last week, how her words still echo. There's this weight in my chest that won't quite lift. But I also noticed the sunset on my walk home, and for a moment, something felt peaceful."

### 2. Data Model Mapping

**Created Entities:**

1. **JournalEntry** (primary)
```typescript
{
  title: 'Evening reflection',
  bodyMarkdown: input,
  wordCount: 63,
  moodRating: 5, // Inferred: heavy + peaceful = mixed
  emotions: ['heavy', 'sad', 'reflective', 'peaceful'],
  people: ['Mom'],
  inferredMood: true
}
```

2. **MoodEntry** (inferred, linked)
```typescript
{
  overallRating: 5,
  emotions: ['heavy', 'sad', 'peaceful'],
  emotionalComplexity: 'mixed',
  inferredFromJournal: true,
  journalEntryId: 'journal-uuid'
}
```

### 3. Parsing/Disambiguation Approach

**Prose mood inference:**
- "Heavy", "weight in my chest" -> negative valence
- "Peaceful" -> positive counterpoint
- Mixed sentiment = moderate rating (5)

**Reflector preference:** Don't ask for explicit rating, infer from prose

### 4. Gamification Impact

**XP:** 15 XP (long-form reflection) - but XP likely hidden for Reflector

### 5. Architecture Solution

**Prose analysis:**
```typescript
const sentimentAnalysis = await nlpApi.analyzeEmotionalContent({
  text: input,
  extractEmotions: true,
  calculateValence: true
});

if (userPreferences.inferMoodFromProse) {
  const inferredMood = calculateMoodFromSentiment(sentimentAnalysis);
  entry.moodRating = inferredMood;
  entry.inferredMood = true;
}
```

---

## Use Case UC-058: Gratitude Mood Boost

**Persona:** Reflector

### 1. User Phrase/Scenario

User says: "Three gratitudes today: the warm coffee this morning, my friend checking in on me, and the fact that I made it through a hard week. Feeling... maybe hopeful? Around a 7."

### 2. Data Model Mapping

**Created Entities:**

1. **JournalEntry** (gratitude type)
```typescript
{
  title: 'Daily gratitude',
  bodyMarkdown: input,
  promptId: 'gratitude_practice',
  tags: ['gratitude'],
  gratitudeItems: [
    'warm coffee',
    'friend checking in',
    'made it through hard week'
  ]
}
```

2. **MoodEntry**
```typescript
{
  overallRating: 7,
  emotions: ['hopeful', 'grateful'],
  context: 'Post-gratitude practice'
}
```

### 3. Parsing/Disambiguation Approach

**Gratitude pattern detection:**
- "Three gratitudes", "I'm grateful for"
- Extract list items
- Explicit mood: "around a 7"

### 4. Gamification Impact

**XP:** 10 XP (gratitude + mood) - shown subtly if at all

### 5. Architecture Solution

**Gratitude extraction:**
```typescript
const gratitudeItems = extractGratitudeList(input);
// ['warm coffee', 'friend checking in', 'made it through hard week']

entry.gratitudeItems = gratitudeItems;
entry.tags.push('gratitude');
```

---

## Use Case UC-059: On This Day Mood Comparison

**Persona:** Reflector

### 1. User Phrase/Scenario

User asks: "What was I feeling this time last year?"

Voice variations:
- "Show me my mood from a year ago"
- "On this day last year"

### 2. Data Model Mapping

**Query response:**

```typescript
{
  currentDate: '2026-01-18',
  pastDate: '2025-01-18',
  pastEntry: {
    moodRating: 4,
    emotions: ['anxious', 'uncertain'],
    context: 'Starting new job next week, nervous about it',
    excerpt: "I keep second-guessing my decision to leave..."
  },
  comparison: {
    moodDelta: +3, // Current avg 7 vs past 4
    themeShift: 'From uncertainty to stability',
    growthNote: 'You were nervous about the job change - it seems to have worked out.'
  }
}
```

### 3. Parsing/Disambiguation Approach

**Temporal comparison query:**
- "This time last year", "a year ago"
- Retrieve historical entry + synthesize comparison

### 4. Gamification Impact

**XP:** 8 XP (retrospective engagement)

### 5. Architecture Solution

**Historical retrieval:**
```typescript
const oneYearAgo = getDateYearsAgo(1);
const pastEntries = await journalApi.getByDate({
  date: oneYearAgo,
  includeMood: true
});

const comparison = await reflectionApi.generateComparison({
  past: pastEntries,
  present: await journalApi.getRecent({ days: 7 })
});
```

---

## Use Case UC-060: Evening Reflection Mood

**Persona:** Reflector

### 1. User Phrase/Scenario

User responds to evening prompt with: "Today was unexpectedly beautiful. The meeting I dreaded went better than expected, and I found myself laughing with colleagues for the first time in weeks. I'm surprised by how light I feel right now."

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  title: 'Evening reflection',
  bodyMarkdown: input,
  promptId: 'evening_reflection',
  moodRating: 8, // "Light", "beautiful", "laughing"
  emotions: ['surprised', 'light', 'connected'],
  inferredMood: true
}
```

### 3. Parsing/Disambiguation Approach

**Positive prose indicators:**
- "Unexpectedly beautiful", "laughing", "light"
- Surprise about positive state (common in reflection)

### 4. Gamification Impact

**XP:** 12 XP (prompted reflection) - gentle acknowledgment

### 5. Architecture Solution

**Evening prompt flow:**
```typescript
const response = await processReflectionPromptResponse({
  promptId: 'evening_reflection',
  response: input,
  inferMood: true,
  celebrateTone: 'gentle' // For Reflector persona
});
```

---

## Use Case UC-061: Mood Theme Tracking Over Time

**Persona:** Reflector

### 1. User Phrase/Scenario

User asks: "What emotional themes have been showing up in my journal this month?"

### 2. Data Model Mapping

**Analysis response:**

```typescript
{
  period: 'January 2026',
  entryCount: 23,
  dominantEmotions: [
    { emotion: 'contemplative', frequency: 15, trend: 'stable' },
    { emotion: 'hopeful', frequency: 12, trend: 'increasing' },
    { emotion: 'anxious', frequency: 8, trend: 'decreasing' }
  ],
  themes: [
    { theme: 'self-acceptance', mentions: 9 },
    { theme: 'career direction', mentions: 7 },
    { theme: 'family relationships', mentions: 6 }
  ],
  emotionalArc: {
    weekOne: 'Processing holiday stress',
    weekTwo: 'Finding equilibrium',
    weekThree: 'Growing confidence'
  }
}
```

### 3. Parsing/Disambiguation Approach

**Theme analysis request:**
- "What themes", "emotional patterns", "showing up"

### 4. Gamification Impact

**XP:** 10 XP (deep reflection)

### 5. Architecture Solution

**Theme synthesis:**
```typescript
const themes = await reflectionApi.synthesizeThemes({
  period: 'current_month',
  includeEmotionalArc: true,
  groupBy: 'week'
});
```

---

## Use Case UC-062: Life Chapter Mood Association

**Persona:** Reflector

### 1. User Phrase/Scenario

User says: "Mark this entry as part of my 'Finding My Voice' chapter. Mood is thoughtful, maybe 6, but it's a meaningful 6."

### 2. Data Model Mapping

**Created/Updated Entities:**

1. **JournalEntry** with chapter
```typescript
{
  title: 'Chapter reflection',
  lifeChapterId: 'finding-my-voice-chapter',
  moodRating: 6,
  moodQuality: 'meaningful', // Qualitative addition
  emotions: ['thoughtful', 'reflective']
}
```

### 3. Parsing/Disambiguation Approach

**Chapter assignment:**
- "Mark as part of" triggers chapter linking
- Qualitative mood: "meaningful 6" captures nuance

### 4. Gamification Impact

**XP:** 10 XP (chapter organization)

### 5. Architecture Solution

**Chapter linking:**
```typescript
const chapter = await chaptersApi.findByName('Finding My Voice');
if (chapter) {
  entry.lifeChapterId = chapter.id;
  await chaptersApi.addEntry(chapter.id, entry.id);
}
```

---

## Use Case UC-063: Mood as Narrative Bridge

**Persona:** Reflector

### 1. User Phrase/Scenario

User writes: "Looking back at where I was six months ago, the contrast is striking. Back then, every day felt like wading through mud. Now there's this lightness, not happiness exactly, but something like peace. Current mood: 7, but it feels earned."

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  title: 'Reflection on growth',
  bodyMarkdown: input,
  moodRating: 7,
  moodCharacterization: 'earned_peace',
  temporalReference: {
    comparingTo: '6_months_ago',
    trajectory: 'improvement'
  },
  emotions: ['peaceful', 'reflective', 'grateful']
}
```

### 3. Parsing/Disambiguation Approach

**Narrative mood detection:**
- Past comparison: "six months ago"
- Growth arc: "wading through mud" -> "lightness"
- Explicit current mood with qualifier: "feels earned"

### 4. Gamification Impact

**XP:** 15 XP (deep narrative reflection)

### 5. Architecture Solution

**Growth tracking:**
```typescript
// Link to historical entries for visualization
const sixMonthsAgo = await journalApi.getByPeriod({
  start: monthsAgo(6),
  end: monthsAgo(5)
});

const growthArc = {
  then: calculateAverageMood(sixMonthsAgo),
  now: entry.moodRating,
  trajectory: entry.moodRating > calculateAverageMood(sixMonthsAgo) ? 'improving' : 'stable'
};
```

---

## Use Case UC-064: Prompted Emotion Exploration

**Persona:** Reflector

### 1. User Phrase/Scenario

System prompt: "What emotion is most present for you right now?"
User responds: "There's this mix of excitement and terror about the changes ahead. The excitement is probably a 7, the terror maybe a 6. Overall I'd say I'm at a cautious 6."

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  moodRating: 6,
  moodCharacterization: 'cautious',
  dimensions: {
    excitement: 7,
    fear: 6
  },
  emotions: ['excited', 'terrified', 'cautious'],
  context: 'Anticipating changes ahead',
  promptId: 'emotion_exploration'
}
```

### 3. Parsing/Disambiguation Approach

**Multi-emotion parsing:**
- Distinct emotions with separate ratings
- Overall synthesis: "cautious 6"
- Accept emotional complexity without forcing single value

### 4. Gamification Impact

**XP:** 10 XP (emotional exploration)

### 5. Architecture Solution

**Dimensional emotion capture:**
```typescript
const emotionRatings = extractEmotionRatings(input);
// { excitement: 7, terror: 6 }

entry.dimensions = {
  ...entry.dimensions,
  ...emotionRatings
};
entry.emotionalComplexity = 'high'; // Multiple distinct emotions
```

---

## Use Case UC-065: Seasonal Mood Pattern Query

**Persona:** Reflector

### 1. User Phrase/Scenario

User asks: "How does my mood typically change across seasons? I feel like winter is always harder."

### 2. Data Model Mapping

**Analysis response:**

```typescript
{
  seasonalPatterns: {
    winter: { avgMood: 5.8, dominantEmotions: ['withdrawn', 'heavy'] },
    spring: { avgMood: 7.2, dominantEmotions: ['hopeful', 'energized'] },
    summer: { avgMood: 7.5, dominantEmotions: ['alive', 'social'] },
    fall: { avgMood: 6.5, dominantEmotions: ['contemplative', 'nostalgic'] }
  },
  observation: 'Your intuition is correct: winter shows the lowest average mood (5.8 vs 7.5 summer). This is a 1.7 point difference.',
  suggestion: 'Consider seasonal adjustment strategies like light therapy or adjusted routines for winter months.'
}
```

### 3. Parsing/Disambiguation Approach

**Seasonal analysis request:**
- "Across seasons", "winter is harder"
- Long-term pattern analysis

### 4. Gamification Impact

**XP:** 12 XP (pattern discovery)

### 5. Architecture Solution

**Seasonal analysis:**
```typescript
const seasonalData = await analyticsApi.getMoodBySeasons({
  years: 2, // Last 2 years of data
  groupBy: 'season',
  includeEmotions: true
});
```

---

## Use Case UC-066: Book Export with Mood Timeline

**Persona:** Reflector

### 1. User Phrase/Scenario

User says: "Export my journal as a book for 2025. Include the mood timeline and any themes you found."

### 2. Data Model Mapping

**Export configuration:**

```typescript
{
  format: 'pdf',
  year: 2025,
  include: {
    journalEntries: true,
    moodTimeline: true,
    themesSynthesis: true,
    chapterDivisions: true,
    emotionalArcNarrative: true
  },
  style: 'book_layout'
}
```

### 3. Parsing/Disambiguation Approach

**Export request:**
- "Export as book"
- Include specifications: mood timeline, themes

### 4. Gamification Impact

**XP:** 25 XP (major milestone - year reflection)

### 5. Architecture Solution

**Book generation:**
```typescript
const bookExport = await exportApi.generateBook({
  year: 2025,
  format: 'pdf',
  includeAnalytics: {
    moodTimeline: true,
    themeSynthesis: true
  },
  layout: 'narrative_flow'
});
```

---

## Use Case UC-067: Crisis-Adjacent Mood Entry

**Persona:** Reflector

### 1. User Phrase/Scenario

User writes: "I don't know how to feel anymore. Everything is numb. Mood is... 2? I'm not sure if that's even the right word for this emptiness."

### 2. Data Model Mapping

**Created Entity:**

```typescript
{
  moodRating: 2,
  emotions: ['numb', 'empty', 'disconnected'],
  distressIndicators: ['emotional_numbness', 'uncertainty_about_feelings'],
  requiresGentleResponse: true
}
```

### 3. Parsing/Disambiguation Approach

**Distress signal detection:**
- "Don't know how to feel", "numb", "emptiness"
- Low rating with emotional disconnection
- Triggers supportive response protocol

### 4. Gamification Impact

**XP:** 10 XP (logging during hard times) - handled very gently

### 5. Architecture Solution

**Gentle response with resources:**
```typescript
if (detectEmotionalDistress(input)) {
  const response = {
    entry: createEntry(input),
    message: `Entry saved. It sounds like you're carrying something heavy right now.

    Your journal is here for you. Some people also find it helpful to talk
    these feelings through with someone trained to listen.

    If you'd like support:
    - Crisis Text Line: Text HOME to 741741
    - SAMHSA: 1-800-662-4357

    Would you like to write more, or would a prompt help?`,
    tone: 'gentle',
    suppressCelebration: true
  };
}
```

**Key principles:**
- No congratulations or gamification response
- Validate without diagnosing
- Offer resources gently, not alarmingly
- Provide next steps without pressure

---

## Document Summary

This document specifies 67 use cases for the Mood Tracking domain across all six personas:

| Persona | Use Cases | Key Themes |
|---------|-----------|------------|
| Optimizer | UC-001 to UC-011 | Multi-dimensional tracking, correlations, trends, goals |
| Dabbler | UC-012 to UC-022 | Simple ratings, emoji, inferred moods, low friction |
| Privacy-First | UC-023 to UC-033 | Local storage, encryption, transparency, data control |
| Neurodivergent | UC-034 to UC-045 | Memory support, stream-of-consciousness, non-punitive |
| Biohacker | UC-046 to UC-056 | Biomarkers, experiments, correlations, protocol tracking |
| Reflector | UC-057 to UC-067 | Prose inference, gratitude, themes, narrative arcs |

**Total word count:** Approximately 22,500 words

**Key implementation priorities:**
1. Sentiment-to-rating inference for natural language input
2. Multi-dimensional mood support with energy, anxiety, focus dimensions
3. Persona-specific gamification calibration (hidden XP for Dabbler/Reflector)
4. Local-only and E2E encryption paths for Privacy-First users
5. Non-punitive streak and return handling for Neurodivergent users
6. Correlation engine integration for Optimizer and Biohacker queries
7. Crisis-adjacent detection with gentle resource surfacing

---

*End of Mood Tracking Domain Use Cases*
