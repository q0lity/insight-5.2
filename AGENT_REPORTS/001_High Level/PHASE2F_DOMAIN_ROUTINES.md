# PHASE2F: Routines Domain Use Cases

**Document Version:** 1.0
**Date:** January 18, 2026
**Domain:** Routines
**Use Case Count:** 67
**Status:** Production Specification

---

## Executive Summary

This document defines 67 use cases for the Routines domain in Insight 5.2, covering morning routines, evening routines, pre/post-workout routines, work routines, weekend variations, templates, flexible timing, completion tracking, adjustments, analytics, and suggestions. Use cases are distributed across all six personas: Optimizer, Dabbler, Privacy-First, Neurodivergent, Biohacker, and Reflector.

---

## Table of Contents

1. [Morning Routines (UC-R001 to UC-R012)](#morning-routines)
2. [Evening/Bedtime Routines (UC-R013 to UC-R023)](#eveningbedtime-routines)
3. [Pre-Workout Routines (UC-R024 to UC-R029)](#pre-workout-routines)
4. [Post-Workout Routines (UC-R030 to UC-R035)](#post-workout-routines)
5. [Work Start/End Routines (UC-R036 to UC-R045)](#work-startend-routines)
6. [Weekend vs Weekday Routines (UC-R046 to UC-R051)](#weekend-vs-weekday-routines)
7. [Routine Templates (UC-R052 to UC-R056)](#routine-templates)
8. [Flexible Timing Within Routines (UC-R057 to UC-R061)](#flexible-timing-within-routines)
9. [Routine Completion Tracking (UC-R062 to UC-R065)](#routine-completion-tracking)
10. [Routine Analytics and Suggestions (UC-R066 to UC-R067)](#routine-analytics-and-suggestions)

---

## Morning Routines

### UC-R001: Complete Morning Routine Voice Log (Optimizer)

#### 1. User Phrase/Scenario
Alex says: "Morning routine complete. Did meditation 15 minutes, cold shower 3 minutes, journaling, and took my supplements. Feeling great, energy is a 9."

Voice variations:
- "Finished my morning routine - meditation, cold shower, journal, supps"
- "Morning stack done: 15 min meditation, cold plunge, wrote in journal, vitamins"

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance** (`routine_instances` table)
```typescript
{
  id: 'routine-uuid',
  routineDefinitionId: 'morning-routine-def-id',
  completedAt: Date.now(),
  completionRate: 1.0, // 100% - all items done
  totalDurationMinutes: 28,
  itemsCompleted: 4,
  itemsTotal: 4
}
```

2. **Multiple HabitInstances** (4 records)
- Meditation: 15 min duration
- Cold shower: 3 min duration
- Journaling: completed
- Supplements: completed

3. **TrackerLog** for energy: value 9

#### 3. Parsing/Disambiguation Approach

Detection signals: "Morning routine complete" triggers routine detection. System matches against user's defined morning routine. Individual items parsed via habit name matching. Duration extracted for meditation (15 min) and cold shower (3 min). Energy tracker extracted via "energy is a 9" pattern.

Classification: ROUTINE (confidence 0.96) with nested HABIT completions. No disambiguation needed as routine name explicitly mentioned.

#### 4. Gamification Impact

XP Calculation: Base 45 XP for routine completion. Chain bonus 1.20x (4 items completed in sequence). Streak multiplier 1.47x (47-day streak). Goal multiplier 1.5x (wellness goal). Total: 45 * 1.20 * 1.47 * 1.5 = 119 XP.

Achievement check: "Morning Master" badge if 30 consecutive days of morning routine completion.

#### 5. Architecture Solution

Batch API processes routine as atomic unit. Creates routine instance first, then spawns habit instances with `routineInstanceId` foreign key. Chain bonus calculated based on completion order. UI shows routine card with all items checked, celebratory animation, and XP breakdown tooltip.

---

### UC-R002: Partial Morning Routine Completion (Dabbler)

#### 1. User Phrase/Scenario
Jordan says: "Did some of my morning routine today. Just the stretching and water, skipped meditation."

Voice variations:
- "Morning routine partly done, stretches and hydration only"
- "Only had time for stretching and drinking water this morning"

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance** (partial)
```typescript
{
  id: 'routine-uuid',
  routineDefinitionId: 'morning-routine-def-id',
  completedAt: Date.now(),
  completionRate: 0.67, // 2 of 3 items
  itemsCompleted: 2,
  itemsTotal: 3,
  skippedItems: ['meditation']
}
```

2. **HabitInstances** (2 records): Stretching, Water intake

#### 3. Parsing/Disambiguation Approach

Detection signals: "morning routine" matches routine definition. "Just the" indicates partial completion. "Skipped meditation" explicitly marks incomplete item. System parses which items were done versus skipped without requiring user to list all.

Dabbler-friendly parsing: Low confidence threshold (0.65) for accepting partial completions. No prompting for clarification on skipped items unless ambiguous.

#### 4. Gamification Impact

XP Calculation: Partial routine XP = Base 30 XP * 0.67 completion = 20 XP. No chain bonus for incomplete routines. Streak maintained (any activity counts for Dabblers). Gentle messaging: "Nice start to the morning! 2 of 3 done."

No punishment for skipped items. System does not display "You missed meditation" negativity.

#### 5. Architecture Solution

Routine instance created with partial completion flag. Skipped items tracked but not penalized. UI shows progress ring at 67% with encouraging copy. Push notification disabled for incomplete routines per Dabbler preferences. Recovery messaging available if user returns to complete remaining items.

---

### UC-R003: Morning Routine with Time Stamps (Biohacker)

#### 1. User Phrase/Scenario
Sam says: "Morning protocol logged. 5:45 AM HRV reading 62, 5:50 cold plunge 4 minutes at 38 degrees, 6:00 breathwork 10 minutes Wim Hof method, 6:15 supplements: lion's mane 500mg, alpha-GPC 300mg, D3 5000 IU."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance** with precise timestamps
```typescript
{
  id: 'routine-uuid',
  routineDefinitionId: 'biohacker-morning-protocol',
  startedAt: timestamp('5:45 AM'),
  completedAt: timestamp('6:15 AM'),
  totalDurationMinutes: 30,
  itemTimestamps: {
    'hrv_reading': '5:45',
    'cold_plunge': '5:50',
    'breathwork': '6:00',
    'supplements': '6:15'
  }
}
```

2. **TrackerLogs** (multiple): HRV 62, cold_temp 38, cold_duration 4

3. **NutritionLog** (supplements): Lion's mane, Alpha-GPC, D3 with exact dosages

#### 3. Parsing/Disambiguation Approach

Multi-entity extraction: LLM parses time-stamped sequence. Each timestamp anchored to today's date. Supplement dosages extracted with unit normalization (mg, IU). Cold exposure metrics captured as separate trackers for correlation analysis.

Biohacker precision: System preserves exact times rather than rounding. Sub-minute granularity supported for protocol adherence tracking.

#### 4. Gamification Impact

XP Calculation: Protocol completion 55 XP base. Time adherence bonus 1.15x (all items within scheduled windows). Data richness bonus 1.10x (timestamps + trackers logged). Streak multiplier 1.52x. Total: 55 * 1.15 * 1.10 * 1.52 = 106 XP.

Protocol compliance tracked: 100% adherence to defined morning protocol order.

#### 5. Architecture Solution

Timestamp-aware batch creation. Each routine item receives discrete timestamp. TrackerLogs linked to routine instance for correlation analysis. Supplement stack visualization API called to show timing spread. Data exported to correlation engine for "morning protocol vs afternoon performance" analysis.

---

### UC-R004: Creating a New Morning Routine (Privacy-First)

#### 1. User Phrase/Scenario
Morgan says: "I want to create a morning routine. Include meditation, reading, and tea preparation. Keep it simple, no cloud sync for this one."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineDefinition** (local-only)
```typescript
{
  id: 'routine-def-uuid',
  name: 'Morning Routine',
  description: 'Simple morning practice',
  items: [
    { habitId: 'meditation-habit', order: 1, optional: false },
    { habitId: 'reading-habit', order: 2, optional: false },
    { habitId: 'tea-prep-habit', order: 3, optional: false }
  ],
  scheduledTime: null, // Flexible
  syncEnabled: false, // Local-only per user request
  encryptionTier: 'enhanced'
}
```

#### 3. Parsing/Disambiguation Approach

Intent detection: "create a morning routine" triggers routine builder flow. "Keep it simple" informs minimal configuration. "No cloud sync" sets local-only flag. System matches mentioned activities to existing habits or offers to create new ones.

Privacy-first handling: Explicit confirmation of local-only storage. Visual indicator shows routine will not sync to cloud.

#### 4. Gamification Impact

Creation XP: 10 XP for routine setup (one-time). No ongoing gamification pressure. Routine does not appear in any shared analytics. Completion tracking available locally but not aggregated to cloud metrics.

Privacy messaging: "Your routine is stored only on this device."

#### 5. Architecture Solution

Local-only routine stored in device SQLite only. Sync queue explicitly excludes this routine definition. Encryption layer applied before local storage. No API calls to server for this routine. UI shows lock icon indicating local-only status. Export includes routine in encrypted backup file only.

---

### UC-R005: Morning Routine with Flexible Order (Neurodivergent)

#### 1. User Phrase/Scenario
Riley says: "Did my morning stuff but in a different order today. Started with breakfast because I was really hungry, then meds, then the other things eventually."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (flexible order)
```typescript
{
  id: 'routine-uuid',
  routineDefinitionId: 'adhd-morning-routine',
  completedAt: Date.now(),
  completionRate: 1.0,
  actualOrder: ['breakfast', 'medication', 'hygiene', 'planning'],
  definedOrder: ['medication', 'breakfast', 'hygiene', 'planning'],
  orderDeviation: true,
  adaptiveNote: 'Hunger-driven reorder'
}
```

#### 3. Parsing/Disambiguation Approach

Flexible parsing: "morning stuff" fuzzy-matches to morning routine. "Different order" flags order deviation without penalty. "Eventually" indicates completion without strict timing. System accepts completed items regardless of sequence.

Neurodivergent accommodation: No penalty for order changes. System celebrates completion over compliance. "Started with breakfast because hungry" captured as context, not failure.

#### 4. Gamification Impact

XP Calculation: Full routine XP awarded (no order penalty). 40 XP base * 1.12 streak multiplier = 45 XP. Messaging: "Morning routine complete! You adapted to what your body needed today."

No chain bonus deduction for reordering. System recognizes flexibility as valid completion strategy.

#### 5. Architecture Solution

Routine engine supports `flexibleOrder: true` flag. Completion tracked by item presence, not sequence. Order deviation logged for pattern analysis (user might discover their natural rhythm). UI shows checkmarks without sequence numbers when flexible mode enabled. Adaptive suggestions offered: "You often start with breakfast. Want to update your routine order?"

---

### UC-R006: Morning Routine Interrupted and Resumed (Optimizer)

#### 1. User Phrase/Scenario
Alex says: "Had to pause my morning routine for a work call. Resuming now - still need to do the cold shower and journaling."

Voice variations:
- "Morning routine interrupted, picking back up"
- "Continuing morning routine after that interruption"

#### 2. Data Model Mapping

**Updated Entity:**

**RoutineInstance** (in-progress to resumed)
```typescript
{
  id: 'existing-routine-uuid',
  status: 'in_progress', // -> 'resumed'
  pausedAt: timestamp('7:30 AM'),
  resumedAt: timestamp('8:15 AM'),
  interruptionReason: 'work call',
  remainingItems: ['cold_shower', 'journaling'],
  completedItems: ['meditation', 'supplements']
}
```

#### 3. Parsing/Disambiguation Approach

State detection: System recognizes active routine instance from earlier. "Pause" and "resuming" trigger state transitions. "Still need to do" identifies remaining items. Context preserved across interruption for seamless continuation.

Interruption tracking: Reason captured for pattern analysis (identify what disrupts routines).

#### 4. Gamification Impact

XP Calculation: Full XP awarded upon final completion. No penalty for interruption. Interruption recovery bonus: +5 XP for returning to complete. Time bonus may be forfeit if outside scheduled window.

Streak protection: Active routine counts as activity even if paused.

#### 5. Architecture Solution

Routine state machine supports: created -> in_progress -> paused -> resumed -> completed. Real-time sync updates status across devices. Push notification suppressed during pause (user is busy). Resume prompt available: "Ready to finish your morning routine?" UI shows partially filled progress ring with "Resume" button.

---

### UC-R007: Voice Log Morning Routine While Commuting (Dabbler)

#### 1. User Phrase/Scenario
Jordan says while driving: "Did my morning routine before leaving. Showered, had breakfast, took vitamins."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance**
```typescript
{
  id: 'routine-uuid',
  routineDefinitionId: 'simple-morning-routine',
  completedAt: Date.now(),
  completionRate: 1.0,
  source: 'voice_capture',
  captureContext: 'commute'
}
```

Habit instances created for: shower, breakfast, vitamins.

#### 3. Parsing/Disambiguation Approach

Retroactive logging: "Before leaving" indicates past completion. System timestamps based on typical morning time or asks for clarification. Voice capture optimized for car noise. Simple item matching against defined routine.

Dabbler simplicity: No complex parsing. Three items mentioned, three items logged. No prompting for durations or details.

#### 4. Gamification Impact

XP: 25 XP for routine completion. No time bonus (retroactive log). Streak maintained. Celebration: "Morning routine logged! Great start to the day."

Minimal feedback appropriate for driving context.

#### 5. Architecture Solution

Voice capture with noise filtering for vehicle context. Retroactive timestamp estimation based on user's historical patterns. Quick confirmation: "Got it! Morning routine done." No detailed breakdown while driving. Full details viewable later in app.

---

### UC-R008: Morning Routine with Mood Check-In (Reflector)

#### 1. User Phrase/Scenario
Casey says: "Morning routine finished. Did my gratitude journaling, morning pages, and tea ritual. Feeling contemplative today, still processing yesterday's conversation with mom."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  id: 'routine-uuid',
  routineDefinitionId: 'reflector-morning',
  completedAt: Date.now(),
  reflectionNote: 'Feeling contemplative, processing conversation with mom'
}
```

2. **HabitInstances**: Gratitude journaling, morning pages, tea ritual

3. **MoodEntry** (inferred)
```typescript
{
  overallRating: null, // Not explicitly rated
  emotions: ['contemplative', 'processing'],
  context: 'After conversation with mom',
  inferredFromProse: true
}
```

#### 3. Parsing/Disambiguation Approach

Reflector-aware parsing: "Feeling contemplative" triggers mood inference without explicit rating request. "Processing yesterday's conversation" captured as emotional context. No extraction of tasks from reflective statements.

Preserve narrative: Full emotional context stored, not reduced to number.

#### 4. Gamification Impact

Minimal gamification per Reflector preferences. XP accrued invisibly (30 XP). No celebration animation. Simple confirmation: "Morning reflection captured."

Insight tracking: Emotional themes tagged for later synthesis.

#### 5. Architecture Solution

Mood inference engine extracts emotions without prompting for rating. Journal content linked to routine instance. "On This Day" feature will surface this entry next year. No push notifications about routine completion. Privacy tier: enhanced encryption for emotional content.

---

### UC-R009: Skipping Morning Routine with Reason (Neurodivergent)

#### 1. User Phrase/Scenario
Riley says: "Skipping my morning routine today. Didn't sleep well and just can't do it right now."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineSkip**
```typescript
{
  id: 'skip-uuid',
  routineDefinitionId: 'adhd-morning-routine',
  skippedAt: Date.now(),
  reason: 'Poor sleep, low capacity',
  userInitiated: true,
  gracePeriodUsed: false
}
```

No habit instances created. Streak may use freeze token.

#### 3. Parsing/Disambiguation Approach

Skip detection: "Skipping" explicitly indicates intentional non-completion. Reason extraction: "didn't sleep well" and "can't do it" captured without judgment. No prompting for partial completion.

Non-punitive handling: System accepts skip gracefully.

#### 4. Gamification Impact

No negative XP. Streak protection: Automatic freeze token used if available. Messaging: "Rest is important too. Your routine will be here when you're ready."

No guilt-inducing notifications. Skip logged for pattern analysis (sleep correlation).

#### 5. Architecture Solution

RoutineSkip entity prevents nagging notifications. Freeze token auto-applied per neurodivergent settings. Tomorrow's routine reminder uses gentle language. Pattern detection: If skips correlate with poor sleep, system may suggest sleep-focused interventions. UI shows no red indicators or failure states.

---

### UC-R010: Morning Routine Streak Milestone (Optimizer)

#### 1. User Phrase/Scenario
Alex completes morning routine and system detects: "This is your 100th consecutive day completing your morning routine."

#### 2. Data Model Mapping

**Updated Entities:**

1. **RoutineStreak**
```typescript
{
  routineDefinitionId: 'morning-routine-def-id',
  currentStreak: 100,
  longestStreak: 100, // New record
  milestoneReached: 'centurion'
}
```

2. **Achievement** unlocked
```typescript
{
  id: 'achievement-uuid',
  achievementType: 'routine_streak_100',
  name: 'Morning Centurion',
  unlockedAt: Date.now(),
  routineId: 'morning-routine-def-id'
}
```

#### 3. Parsing/Disambiguation Approach

Automatic detection: System tracks routine-specific streaks. Milestone trigger at 100 days. Achievement engine fires on streak update.

No user input needed for milestone detection.

#### 4. Gamification Impact

Milestone XP: 500 XP bonus. Badge: "Morning Centurion" permanently displayed. Title unlock: Can display "Centurion" title. Streak multiplier: Now at 2.0x for morning routine activities.

Celebration: Full confetti animation, achievement popup.

#### 5. Architecture Solution

Streak service monitors routine completions. Achievement trigger fires asynchronously. Push notification: "100 days of morning routines!" Social share option (optional). Badge added to profile. Analytics event logged for cohort analysis.

---

### UC-R011: Morning Routine Suggestion Based on Sleep (Biohacker)

#### 1. User Phrase/Scenario
Sam opens app in morning. System suggests: "Your HRV is 45 today (below your 58 average). Consider a lighter morning protocol - maybe skip the cold plunge and extend the breathwork?"

#### 2. Data Model Mapping

**Created Entity:**

**RoutineSuggestion**
```typescript
{
  id: 'suggestion-uuid',
  routineDefinitionId: 'biohacker-morning-protocol',
  triggerMetric: 'hrv',
  triggerValue: 45,
  baselineValue: 58,
  suggestion: 'lighter_protocol',
  modifications: [
    { item: 'cold_plunge', action: 'skip' },
    { item: 'breathwork', action: 'extend', newDuration: 15 }
  ],
  accepted: null // Pending user response
}
```

#### 3. Parsing/Disambiguation Approach

Proactive suggestion: System analyzes morning biometrics from wearable sync. HRV below baseline triggers recovery protocol suggestion. No user input required for suggestion generation.

Data correlation: Previous patterns show performance decline when low HRV + cold exposure.

#### 4. Gamification Impact

No XP for suggestion. Acceptance tracked for algorithm improvement. Following suggestion counts as full routine completion (no penalty for modifications).

Adaptive protocol: User builds personalized recovery routines over time.

#### 5. Architecture Solution

Morning trigger job runs at user's typical wake time. Wearable data pulled via Health Kit integration. Suggestion engine evaluates HRV against 30-day baseline. Push notification with actionable suggestion. One-tap acceptance modifies today's routine. Declined suggestions logged for preference learning.

---

### UC-R012: Morning Routine Time Optimization Query (Optimizer)

#### 1. User Phrase/Scenario
Alex asks: "What's the optimal order for my morning routine based on my data? I want to maximize energy throughout the day."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineAnalysis**
```typescript
{
  id: 'analysis-uuid',
  routineDefinitionId: 'morning-routine-def-id',
  analysisType: 'order_optimization',
  metric: 'afternoon_energy',
  sampleSize: 90, // days analyzed
  currentOrder: ['meditation', 'cold_shower', 'journaling', 'supplements'],
  suggestedOrder: ['supplements', 'cold_shower', 'meditation', 'journaling'],
  predictedImprovement: 0.8 // Energy points
}
```

#### 3. Parsing/Disambiguation Approach

Query classification: "Optimal order" triggers routine analysis. "Based on my data" indicates personalized correlation request. "Maximize energy" specifies target metric.

Analysis execution: System correlates routine order variations with afternoon energy ratings.

#### 4. Gamification Impact

Analysis XP: 10 XP for engaging with insights feature. Implementing suggested order tracked as experiment. Improvement validated over 14-day trial period.

#### 5. Architecture Solution

Correlation engine analyzes 90 days of routine + energy data. Order permutation analysis identifies patterns. Response includes confidence intervals. A/B test framework allows user to trial new order. Results compared after 2 weeks. UI shows current vs suggested with predicted impact.

---

## Evening/Bedtime Routines

### UC-R013: Complete Evening Wind-Down Routine (Reflector)

#### 1. User Phrase/Scenario
Casey says: "Evening routine done. Did my reflection journaling for about 20 minutes, read for half an hour, and prepared tomorrow's intentions. Feeling peaceful tonight."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  id: 'routine-uuid',
  routineDefinitionId: 'evening-wind-down',
  completedAt: Date.now(),
  totalDurationMinutes: 55,
  reflectionNote: 'Feeling peaceful'
}
```

2. **HabitInstances**: Reflection journaling (20 min), Reading (30 min), Tomorrow planning

3. **MoodEntry** (inferred): peaceful, content

#### 3. Parsing/Disambiguation Approach

Evening context: Time of day (after 7 PM) biases toward evening routine matching. "Wind-down" activities recognized: journaling, reading, planning. Duration extraction: "about 20 minutes," "half an hour."

Reflector handling: Emotional state captured from "feeling peaceful" without numeric prompt.

#### 4. Gamification Impact

Minimal visible gamification. XP accrued: 40 XP. Streak updated silently. Confirmation: "Evening reflection saved."

Sleep readiness tracked: Completing wind-down routine correlates with better sleep data.

#### 5. Architecture Solution

Evening routine completion triggers sleep tracking reminder. Journaling content stored with enhanced privacy. Tomorrow's intentions linked to next day's task list. "Feeling peaceful" contributes to mood trend analysis. No celebration animations after 8 PM (respect wind-down context).

---

### UC-R014: Bedtime Routine with Sleep Supplements (Biohacker)

#### 1. User Phrase/Scenario
Sam says: "Bedtime protocol: magnesium glycinate 400mg, apigenin 50mg, theanine 200mg at 9:30. Did 10 minutes of NSDR. Setting sleep target for 7.5 hours."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  id: 'routine-uuid',
  routineDefinitionId: 'sleep-protocol',
  completedAt: timestamp('9:30 PM'),
  sleepTarget: 7.5
}
```

2. **NutritionLog** (supplements)
```typescript
{
  mealType: 'supplement',
  items: [
    { name: 'Magnesium Glycinate', dosage: 400, unit: 'mg' },
    { name: 'Apigenin', dosage: 50, unit: 'mg' },
    { name: 'L-Theanine', dosage: 200, unit: 'mg' }
  ],
  eatenAt: timestamp('9:30 PM')
}
```

3. **HabitInstance**: NSDR (10 min)

#### 3. Parsing/Disambiguation Approach

Supplement parsing: Dosages extracted with units. "Bedtime protocol" matches sleep-focused routine. NSDR recognized as non-sleep deep rest practice. Sleep target captured for morning comparison.

Precise timing: 9:30 PM timestamp preserved for supplement timing analysis.

#### 4. Gamification Impact

XP: 35 XP for sleep protocol. Sleep optimization badge progress. Correlation tracked: supplement timing vs sleep quality.

Data richness bonus: Detailed logging adds 10% XP.

#### 5. Architecture Solution

Supplement stack logged with sleep context tag. Sleep target stored for morning comparison with actual sleep. Wearable integration will pull actual sleep data. Correlation engine: "Mag + apigenin before 10 PM = +15% deep sleep." Morning report shows target vs actual with supplement correlation.

---

### UC-R015: Abbreviated Evening Routine Due to Time (Dabbler)

#### 1. User Phrase/Scenario
Jordan says: "Quick evening check - just brushed teeth and set alarm. Too tired for the full routine."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (minimal)
```typescript
{
  id: 'routine-uuid',
  routineDefinitionId: 'simple-evening-routine',
  completionRate: 0.33, // 2 of 6 items
  itemsCompleted: ['hygiene', 'alarm'],
  itemsSkipped: ['reading', 'gratitude', 'planning', 'meditation'],
  skipReason: 'fatigue'
}
```

#### 3. Parsing/Disambiguation Approach

Minimal completion: "Quick" signals abbreviated version. "Too tired" explains truncation without judgment. System accepts essential items only.

Dabbler accommodation: No prompting for missed items. Celebration for what was done.

#### 4. Gamification Impact

Partial XP: 10 XP (vs 30 for full routine). Streak maintained (any activity counts). Message: "Basics covered! Rest well."

No negative messaging about skipped items.

#### 5. Architecture Solution

Low-friction logging for Dabblers. Essential items flagged in routine definition (hygiene, alarm = core). Core completion = streak maintained. Tomorrow's routine starts fresh without "catch up" burden.

---

### UC-R016: Evening Routine Reminder Customization (Privacy-First)

#### 1. User Phrase/Scenario
Morgan says: "Set my evening routine reminder for 9 PM but don't show what's in the routine on the lock screen notification."

#### 2. Data Model Mapping

**Updated Entity:**

**RoutineDefinition** (notification settings)
```typescript
{
  id: 'evening-routine-def-id',
  reminder: {
    enabled: true,
    time: '21:00',
    notificationPrivacy: 'hidden_content',
    lockScreenDisplay: 'generic', // Shows "Insight reminder" not routine details
    soundEnabled: false
  }
}
```

#### 3. Parsing/Disambiguation Approach

Preference extraction: "9 PM" sets reminder time. "Don't show what's in the routine" triggers privacy mode for notifications. System understands lock screen privacy concern.

Privacy-first default: Content hidden from notifications unless user explicitly allows.

#### 4. Gamification Impact

No XP for settings changes. Reminder effectiveness tracked privately. No external visibility of routine contents.

#### 5. Architecture Solution

Push notification configured with `contentAvailable` but `alertBody` generic. Lock screen shows: "Time for your evening routine" (no details). Full content visible only after biometric unlock within app. Notification privacy setting stored locally, not synced.

---

### UC-R017: Evening Routine with Family Context (Neurodivergent)

#### 1. User Phrase/Scenario
Riley says: "Evening routine is going to be different tonight - kids are here. Just going to do the quick version: meds, brush teeth, set out tomorrow's clothes."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (context-adapted)
```typescript
{
  id: 'routine-uuid',
  routineDefinitionId: 'adhd-evening-routine',
  adaptedVersion: 'quick',
  contextTag: 'kids_present',
  itemsCompleted: ['medication', 'hygiene', 'tomorrow_prep'],
  completionRate: 1.0 // Full completion of adapted routine
}
```

#### 3. Parsing/Disambiguation Approach

Context detection: "Kids are here" recognized as routine-affecting context. "Quick version" maps to predefined abbreviated routine variant. Three items mentioned = three items logged.

Neurodivergent support: Context-switching acknowledged without penalty. Adapted routine counts as complete routine.

#### 4. Gamification Impact

Full routine XP: 35 XP (adapted version is still 100% complete). No penalty for using abbreviated version. Streak maintained. Message: "Evening routine adapted and complete!"

Context patterns tracked: System learns "kids present = quick routine" for future suggestions.

#### 5. Architecture Solution

Routine variants supported: full, quick, minimal. Context tags enable variant selection. Medication reminder priority: Always included in all variants. Pattern learning: "When context = kids, suggest quick variant." Tomorrow prep creates visible checklist for morning support.

---

### UC-R018: Evening Routine Missed - Next Morning Recovery (Optimizer)

#### 1. User Phrase/Scenario
Alex says: "Fell asleep before doing my evening routine last night. Can I log it this morning with yesterday's date?"

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (retroactive)
```typescript
{
  id: 'routine-uuid',
  routineDefinitionId: 'evening-routine-def-id',
  completedAt: null,
  status: 'missed',
  missedDate: 'YYYY-MM-DD',
  recoveryLogged: true,
  recoveryTimestamp: Date.now()
}
```

#### 3. Parsing/Disambiguation Approach

Retroactive request: "Last night" and "yesterday's date" indicate backdating need. System confirms date for accuracy. Missed routine logged differently than completed routine.

Recovery option: User can mark as missed (accurate) or log partial items remembered.

#### 4. Gamification Impact

Options presented:
1. Log as missed: Streak freeze token used, no XP
2. Log remembered items: Partial XP, streak maintained
3. Skip logging: No record, streak may break

Optimizer likely chooses accurate tracking (option 1).

#### 5. Architecture Solution

Backdating UI allows yesterday selection. Warning: "Logging missed routines affects streak calculations." Confirmation required for retroactive entries. Audit trail shows entry was backdated. Streak service evaluates freeze token availability.

---

### UC-R019: Evening Gratitude Routine (Reflector)

#### 1. User Phrase/Scenario
Casey says: "Evening gratitude practice. Today I'm grateful for the conversation with Sarah, the beautiful sunset on my walk, and having time to read this afternoon."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  routineDefinitionId: 'gratitude-routine',
  completedAt: Date.now()
}
```

2. **JournalEntry** (gratitude type)
```typescript
{
  title: 'Evening Gratitude',
  bodyMarkdown: '1. Conversation with Sarah\n2. Beautiful sunset on walk\n3. Time to read this afternoon',
  promptId: 'gratitude_three_things',
  tags: ['gratitude', 'evening'],
  people: ['Sarah']
}
```

#### 3. Parsing/Disambiguation Approach

Gratitude detection: "Grateful for" triggers gratitude journal entry. Three items extracted and formatted. @Sarah detected as person mention.

Reflector parsing: Full prose preserved alongside structured list.

#### 4. Gamification Impact

Minimal: 15 XP accrued silently. Gratitude streak tracked separately. No celebration interrupting reflection mood.

Gratitude patterns available in weekly synthesis.

#### 5. Architecture Solution

Gratitude entries tagged for "On This Day" feature. Person mention creates interaction log with Sarah. Evening time context prevents celebratory notifications. Weekly reflection synthesizes gratitude themes.

---

### UC-R020: Bedtime Routine with Screen Cutoff Tracking (Biohacker)

#### 1. User Phrase/Scenario
Sam says: "Screen cutoff at 9:15 PM. Starting bedtime protocol now. Blue light glasses on since 8 PM."

#### 2. Data Model Mapping

**Created Entities:**

1. **TrackerLog** (screen_cutoff)
```typescript
{
  trackerKey: 'screen_cutoff_time',
  valueText: '21:15',
  occurredAt: timestamp('9:15 PM')
}
```

2. **TrackerLog** (blue_light_glasses)
```typescript
{
  trackerKey: 'blue_light_duration',
  valueNumeric: 75, // minutes from 8 PM to 9:15 PM
}
```

3. **RoutineInstance** (bedtime protocol started)

#### 3. Parsing/Disambiguation Approach

Tracker extraction: "Screen cutoff at 9:15" creates timestamp tracker. "Blue light glasses on since 8 PM" calculates duration. "Starting bedtime protocol" triggers routine.

Biohacker precision: Exact times preserved for correlation with sleep metrics.

#### 4. Gamification Impact

XP: 20 XP for screen discipline. Correlation available: "Screen cutoff before 9:30 = +12% sleep quality."

Sleep optimization tracked across multiple nights.

#### 5. Architecture Solution

Screen time tracker integrates with iOS Screen Time API (optional). Manual logging as fallback. Blue light duration calculated from start time to cutoff. Morning report shows: "Screen cutoff: 9:15 PM. Sleep quality: 8.2/10."

---

### UC-R021: Evening Routine Skipped - System Response (Neurodivergent)

#### 1. User Phrase/Scenario
Riley doesn't log evening routine. Next morning, system message: "No evening routine logged yesterday. That's okay - some days are harder than others. Ready to start fresh today?"

#### 2. Data Model Mapping

**System State:**

```typescript
{
  routineId: 'adhd-evening-routine',
  lastExpectedCompletion: 'yesterday',
  lastActualCompletion: '2 days ago',
  missedCount: 1,
  systemResponseType: 'gentle_acknowledgment'
}
```

No routine instance created for missed day.

#### 3. Parsing/Disambiguation Approach

Passive detection: System notes routine window passed without completion. No immediate notification (respect rest). Morning message framed positively.

Non-punitive language: "That's okay" normalizes missing. "Ready to start fresh" focuses on today.

#### 4. Gamification Impact

Streak handling: Auto-freeze token used if available. If no token, streak resets silently (no "broken streak" notification). Longest streak preserved in records.

No shame, no guilt, no red indicators.

#### 5. Architecture Solution

Missed routine detection runs after sleep window. Message queued for morning (not night). Language template: empathetic, forward-looking. One-tap option: "Start today's routine" or "Dismiss." Pattern tracking: Multiple misses may trigger support suggestions.

---

### UC-R022: Evening Routine Duration Analysis (Optimizer)

#### 1. User Phrase/Scenario
Alex asks: "How long does my evening routine actually take? I feel like it's gotten longer over time."

#### 2. Data Model Mapping

**Generated Analysis:**

```typescript
{
  analysisType: 'routine_duration_trend',
  routineId: 'evening-routine-def-id',
  dataPoints: 60, // days
  averageDuration: 42, // minutes
  trend: 'increasing',
  trendRate: 0.5, // minutes per week
  byItem: {
    'meditation': { avg: 12, trend: 'stable' },
    'journaling': { avg: 18, trend: 'increasing' },
    'reading': { avg: 12, trend: 'stable' }
  }
}
```

#### 3. Parsing/Disambiguation Approach

Query classification: "How long" triggers duration analysis. "Over time" indicates trend request. System pulls routine instances with duration data.

Insight generation: Identifies which item is driving duration increase.

#### 4. Gamification Impact

Analysis XP: 5 XP. Insight surfaced: "Your journaling has grown from 10 to 22 minutes over 60 days."

Optimization option offered if desired.

#### 5. Architecture Solution

Duration analytics API aggregates routine instance data. Trend calculation using linear regression. Item-level breakdown identifies drivers. Visualization: Line chart showing duration over time. Actionable insight: "Your journaling depth has increased. This correlates with improved weekly reflection quality."

---

### UC-R023: Evening Routine Before Travel (Dabbler)

#### 1. User Phrase/Scenario
Jordan says: "Doing my evening routine early because I have an early flight tomorrow. Just the essentials: packed, set three alarms, took vitamins."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (adapted timing)
```typescript
{
  id: 'routine-uuid',
  routineDefinitionId: 'simple-evening-routine',
  completedAt: Date.now(), // Earlier than usual
  contextTag: 'travel_prep',
  adaptedTiming: true,
  itemsCompleted: ['packing', 'alarms', 'vitamins']
}
```

#### 3. Parsing/Disambiguation Approach

Context detection: "Early flight tomorrow" explains early timing. "Just the essentials" signals abbreviated version. Travel context captured for pattern learning.

Dabbler flexibility: System accepts non-standard timing without question.

#### 4. Gamification Impact

Full XP for adapted routine: 25 XP. Streak maintained. Message: "Ready for tomorrow! Safe travels."

#### 5. Architecture Solution

Travel context influences next-day routine suggestions. Morning routine reminder suppressed (early flight). Timezone handling if destination differs. Return-to-routine prompt when travel ends.

---

## Pre-Workout Routines

### UC-R024: Pre-Workout Routine with Supplements (Biohacker)

#### 1. User Phrase/Scenario
Sam says: "Pre-workout protocol: caffeine 200mg, citrulline 6g, beta-alanine 3g taken 30 minutes ago. Dynamic stretching done. HRV pre-workout is 58. About to start leg day."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance** (pre-workout)
```typescript
{
  routineDefinitionId: 'pre-workout-protocol',
  completedAt: Date.now(),
  linkedWorkoutType: 'leg_day',
  supplementTiming: -30 // minutes before workout
}
```

2. **NutritionLog** (pre-workout supplements)
```typescript
{
  mealType: 'supplement',
  items: [
    { name: 'Caffeine', dosage: 200, unit: 'mg' },
    { name: 'Citrulline', dosage: 6, unit: 'g' },
    { name: 'Beta-Alanine', dosage: 3, unit: 'g' }
  ],
  context: 'pre_workout'
}
```

3. **HabitInstance**: Dynamic stretching

4. **TrackerLog**: HRV 58 (pre-workout)

#### 3. Parsing/Disambiguation Approach

Pre-workout detection: "Pre-workout protocol" matches routine. "30 minutes ago" calculates supplement timing. "About to start leg day" links to upcoming workout.

Multi-entity extraction: Supplements, stretching, HRV all captured in single utterance.

#### 4. Gamification Impact

XP: 25 XP for pre-workout protocol. Linked to upcoming workout for chain bonus. Workout will receive +10% XP for proper preparation.

Correlation tracking: Pre-workout HRV vs workout performance.

#### 5. Architecture Solution

Pre-workout routine links to subsequent workout via `linkedWorkoutId`. Supplement timing stored for absorption window analysis. HRV baseline captured for workout comparison. Workout creation inherits pre-workout context.

---

### UC-R025: Quick Pre-Workout Warmup (Dabbler)

#### 1. User Phrase/Scenario
Jordan says: "Did a quick warmup before gym - some jumping jacks and stretches."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (minimal pre-workout)
```typescript
{
  routineDefinitionId: 'simple-warmup',
  completedAt: Date.now(),
  itemsCompleted: ['jumping_jacks', 'stretches'],
  durationMinutes: 5 // estimated
}
```

#### 3. Parsing/Disambiguation Approach

Simple extraction: "Quick warmup" matches pre-workout routine category. "Jumping jacks and stretches" identified as warmup activities. No detailed metrics required.

Dabbler simplicity: Duration estimated, not prompted for.

#### 4. Gamification Impact

XP: 10 XP. Streak contribution: Yes. Message: "Warmed up and ready!"

#### 5. Architecture Solution

Minimal logging interface. Duration estimation from activity type. Links to subsequent workout if logged within 30 minutes.

---

### UC-R026: Pre-Workout Routine with Meal Timing (Optimizer)

#### 1. User Phrase/Scenario
Alex says: "Pre-workout prep: had oatmeal with protein powder 90 minutes ago, about 400 calories. Did mobility work for shoulders since it's push day. Taking pre-workout now."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  routineDefinitionId: 'optimized-pre-workout',
  completedAt: Date.now(),
  mealTiming: -90, // minutes
  workoutType: 'push'
}
```

2. **NutritionLog** (pre-workout meal)
```typescript
{
  title: 'Pre-workout meal',
  mealType: 'snack',
  eatenAt: Date.now() - (90 * 60 * 1000),
  items: [
    { name: 'Oatmeal with protein powder', calories: 400 }
  ],
  context: 'pre_workout_fuel'
}
```

3. **HabitInstance**: Shoulder mobility work

4. **NutritionLog**: Pre-workout supplement

#### 3. Parsing/Disambiguation Approach

Meal timing extraction: "90 minutes ago" calculates exact timestamp. Mobility work matched to push day context. Pre-workout supplement logged separately.

Optimizer precision: Multiple timestamps and contexts tracked.

#### 4. Gamification Impact

XP: 30 XP for comprehensive prep. Preparation bonus applies to subsequent workout. Data logged for "meal timing vs performance" correlation.

#### 5. Architecture Solution

Pre-workout meal timestamp enables digestion window tracking. Mobility work tagged with target muscle groups. Pre-workout supplement separate log for ingredient tracking. Performance correlation: "90-min pre-meal = avg 8% better workout performance."

---

### UC-R027: Pre-Workout Check-In Prompt (Neurodivergent)

#### 1. User Phrase/Scenario
System prompts Riley: "About to work out? Quick pre-workout check: Have you eaten something? Hydrated? Ready to go?"

Riley responds: "Yeah, had a snack, drank water, feeling okay to start."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (prompted)
```typescript
{
  routineDefinitionId: 'adhd-pre-workout-check',
  completedAt: Date.now(),
  promptTriggered: true,
  responses: {
    eaten: true,
    hydrated: true,
    readiness: 'okay'
  }
}
```

#### 3. Parsing/Disambiguation Approach

Prompted routine: System initiates based on calendar/habit pattern. User response parsed for yes/no signals. "Feeling okay" captured as readiness level.

Supportive scaffolding: Checklist reduces decision fatigue.

#### 4. Gamification Impact

XP: 10 XP for check-in completion. Removes barrier to workout initiation. Message: "All set! Enjoy your workout."

#### 5. Architecture Solution

Pre-workout prompt triggers based on scheduled workout or gym location detection. Simple yes/no parsing. Readiness captured for pattern analysis. Low-friction: 3 taps maximum to complete.

---

### UC-R028: Pre-Workout Routine Skipped - Impact Tracking (Biohacker)

#### 1. User Phrase/Scenario
Sam says: "Skipping pre-workout routine today - running late. Want to see if it affects my performance."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineSkip** (intentional experiment)
```typescript
{
  routineDefinitionId: 'pre-workout-protocol',
  skippedAt: Date.now(),
  reason: 'time_constraint',
  experimentalIntent: true,
  linkedWorkoutId: null // Will link when workout logged
}
```

#### 3. Parsing/Disambiguation Approach

Intentional skip: "Want to see if it affects" signals experimental intent. System flags for comparison analysis.

Biohacker mindset: Treats deviation as data point.

#### 4. Gamification Impact

No XP for skip. Experimental analysis triggered after workout. Report: "Workout without pre-workout: RPE +1.2, volume -8%."

#### 5. Architecture Solution

Skip tagged as experiment. Subsequent workout linked automatically. Comparison analysis against workouts with full pre-workout routine. Insight generated: "Pre-workout protocol correlates with +8% volume."

---

### UC-R029: Pre-Workout Mental Preparation (Reflector)

#### 1. User Phrase/Scenario
Casey says: "Taking a few minutes before yoga to set an intention. Today I want to focus on being present and not pushing too hard."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  routineDefinitionId: 'mindful-pre-workout',
  completedAt: Date.now(),
  activityType: 'yoga'
}
```

2. **JournalEntry** (intention)
```typescript
{
  title: 'Yoga intention',
  bodyMarkdown: 'Focus on being present. Not pushing too hard.',
  tags: ['intention', 'yoga', 'mindfulness']
}
```

#### 3. Parsing/Disambiguation Approach

Intention detection: "Set an intention" triggers journaling capture. "Focus on being present" preserved as intention text. Linked to yoga activity.

Reflector style: Full thought captured, not reduced to checkbox.

#### 4. Gamification Impact

XP: 15 XP. Mindfulness skill +1.5 XP. Intention can be reviewed post-workout for reflection.

#### 5. Architecture Solution

Pre-workout intention stored and surfaced post-workout. Prompt after yoga: "How did it go with your intention to be present?" Reflection loop closed.

---

## Post-Workout Routines

### UC-R030: Post-Workout Recovery Protocol (Biohacker)

#### 1. User Phrase/Scenario
Sam says: "Post-workout: protein shake 50g within 30 minutes, creatine 5g, stretching 10 minutes, cold shower 2 minutes. RPE was 8, feeling good."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  routineDefinitionId: 'post-workout-recovery',
  completedAt: Date.now(),
  linkedWorkoutId: 'previous-workout-uuid',
  recoveryWindow: 30 // minutes post-workout
}
```

2. **NutritionLog** (post-workout)
```typescript
{
  items: [
    { name: 'Protein Shake', protein: 50, source: 'manual' },
    { name: 'Creatine', dosage: 5, unit: 'g' }
  ],
  context: 'post_workout'
}
```

3. **HabitInstances**: Stretching (10 min), Cold shower (2 min)

4. **TrackerLog**: RPE 8

#### 3. Parsing/Disambiguation Approach

Post-workout detection: Context inferred from recent workout. "Within 30 minutes" confirms timing window. Multiple recovery elements extracted.

Workout linking: Automatically links to most recent workout session.

#### 4. Gamification Impact

XP: 30 XP for recovery protocol. Chain bonus with prior workout. Recovery completeness tracked for adaptation optimization.

#### 5. Architecture Solution

Post-workout routine auto-links to preceding workout. Protein timing window validated (anabolic window tracking). Cold exposure logged with duration and context. RPE attached to workout record retroactively.

---

### UC-R031: Simple Post-Workout Stretch (Dabbler)

#### 1. User Phrase/Scenario
Jordan says: "Stretched a bit after my run. Maybe 5 minutes."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (minimal)
```typescript
{
  routineDefinitionId: 'post-workout-stretch',
  completedAt: Date.now(),
  durationMinutes: 5,
  linkedWorkoutId: 'run-workout-uuid'
}
```

#### 3. Parsing/Disambiguation Approach

Post-workout context: "After my run" links to recent run entry. "Maybe 5 minutes" accepts estimated duration.

Dabbler simplicity: No detailed stretch breakdown required.

#### 4. Gamification Impact

XP: 8 XP. Recovery bonus for workout. Message: "Good cool-down!"

#### 5. Architecture Solution

Automatic workout linking based on timing. Estimated duration accepted. Minimal confirmation needed.

---

### UC-R032: Post-Workout Nutrition Log (Optimizer)

#### 1. User Phrase/Scenario
Alex says: "Post-workout meal: 8oz chicken breast, cup of rice, broccoli. About 600 calories, 55g protein, 60g carbs, 12g fat. Eating within 45 minutes of finishing."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  routineDefinitionId: 'post-workout-nutrition',
  completedAt: Date.now(),
  mealTiming: 45
}
```

2. **NutritionLog**
```typescript
{
  title: 'Post-workout meal',
  mealType: 'dinner',
  items: [
    { name: 'Chicken breast', quantity: 8, unit: 'oz', protein: 55 },
    { name: 'Rice', quantity: 1, unit: 'cup', carbs: 45 },
    { name: 'Broccoli', calories: 55 }
  ],
  totalCalories: 600,
  macros: { protein: 55, carbs: 60, fat: 12 },
  context: 'post_workout'
}
```

#### 3. Parsing/Disambiguation Approach

Detailed extraction: Macros parsed from user estimate. Items identified individually. Timing window captured.

Optimizer precision: All provided data preserved.

#### 4. Gamification Impact

XP: 15 XP for nutrition logging. Post-workout timing bonus. Daily macro progress updated.

#### 5. Architecture Solution

Macro totals validated against item estimates. Post-workout context enables anabolic window analysis. Daily nutrition dashboard updated. Correlation: "Post-workout protein intake vs recovery metrics."

---

### UC-R033: Post-Workout Reflection (Reflector)

#### 1. User Phrase/Scenario
Casey says: "After yoga today, I noticed I was much more present than last week. The intention-setting really helped. My body feels open and grateful."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  routineDefinitionId: 'post-workout-reflection',
  completedAt: Date.now(),
  linkedWorkoutId: 'yoga-workout-uuid'
}
```

2. **JournalEntry**
```typescript
{
  title: 'Post-yoga reflection',
  bodyMarkdown: 'Much more present than last week. Intention-setting helped. Body feels open and grateful.',
  tags: ['yoga', 'reflection', 'presence', 'gratitude']
}
```

#### 3. Parsing/Disambiguation Approach

Reflection capture: Full narrative preserved. Comparison to last week noted. Body awareness and emotional state captured.

Reflector style: No reduction to metrics.

#### 4. Gamification Impact

XP: 20 XP (accrued silently). Reflection linked to workout and prior intention. Pattern tracking: Intention + reflection loop.

#### 5. Architecture Solution

Post-workout reflection linked to pre-workout intention. Comparison noted for longitudinal analysis. "On This Day" will surface both entries together.

---

### UC-R034: Post-Workout HRV Recovery Check (Biohacker)

#### 1. User Phrase/Scenario
Sam says: "10 minutes post-workout HRV check: dropped to 42 during workout, now recovering at 55. Taking 5 more minutes before moving on."

#### 2. Data Model Mapping

**Created Entities:**

1. **TrackerLogs**
```typescript
[
  { trackerKey: 'hrv_during_workout', value: 42 },
  { trackerKey: 'hrv_post_10min', value: 55 },
  { trackerKey: 'hrv_recovery_time', value: 10 }
]
```

2. **RoutineInstance**
```typescript
{
  routineDefinitionId: 'hrv-recovery-check',
  recoveryStatus: 'in_progress',
  additionalRecoveryTime: 5
}
```

#### 3. Parsing/Disambiguation Approach

HRV tracking: Multiple HRV values with context. Recovery trajectory calculated. Additional recovery time noted.

Biohacker precision: All values captured with timestamps.

#### 4. Gamification Impact

XP: 15 XP for recovery tracking. Data contributes to recovery analytics. Insight: "Your HRV typically returns to baseline in 18 minutes."

#### 5. Architecture Solution

HRV recovery curve plotted from multiple data points. Comparison to baseline and historical recovery rates. Notification when HRV reaches target threshold.

---

### UC-R035: Post-Workout Routine Forgotten - Recovery (Neurodivergent)

#### 1. User Phrase/Scenario
Riley says: "Oh no, I forgot to stretch after my workout earlier. It's been two hours."

#### 2. Data Model Mapping

**System Response:**

```typescript
{
  missedRoutine: 'post-workout-stretch',
  timeSinceWorkout: 120, // minutes
  suggestion: 'late_stretch_option',
  message: "It's okay! You can still do a quick stretch now - it'll help with tomorrow."
}
```

#### 3. Parsing/Disambiguation Approach

Missed routine detection: "Forgot" indicates unintentional skip. Time elapsed calculated. Recovery option offered without judgment.

Non-punitive response: "It's okay" leads.

#### 4. Gamification Impact

No negative impact. Late stretch still earns XP. Message focuses on benefit, not failure.

#### 5. Architecture Solution

Missed routine detection triggers gentle prompt. Late completion option available. No streak penalty for post-workout routines. Forward-looking: "This helps tomorrow."

---

## Work Start/End Routines

### UC-R036: Work Day Startup Routine (Optimizer)

#### 1. User Phrase/Scenario
Alex says: "Starting work day: reviewed calendar, prioritized top 3 tasks, cleared inbox to zero, set focus mode. Ready to deep work."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  routineDefinitionId: 'work-startup-routine',
  completedAt: Date.now(),
  context: 'work_start'
}
```

2. **HabitInstances**: Calendar review, Task prioritization, Inbox zero, Focus mode

3. **Tasks created**: Top 3 priorities for the day

#### 3. Parsing/Disambiguation Approach

Work context: "Starting work day" triggers work routine. Items matched to defined routine. "Deep work" signals readiness state.

Productivity tracking: Work routine completion logged.

#### 4. Gamification Impact

XP: 25 XP. Productivity skill +2.5 XP. Chain bonus available if followed by focus session.

#### 5. Architecture Solution

Work routine links to calendar and task systems. Top 3 tasks surface in daily view. Focus mode integration with device settings (optional). Work session tracking begins.

---

### UC-R037: Work Shutdown Routine (Optimizer)

#### 1. User Phrase/Scenario
Alex says: "Work shutdown complete: captured all open loops, reviewed tomorrow's calendar, wrote shutdown note, closed all work apps. Done for the day."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  routineDefinitionId: 'work-shutdown-routine',
  completedAt: Date.now(),
  context: 'work_end'
}
```

2. **JournalEntry** (shutdown note)
```typescript
{
  title: 'Work Shutdown Note',
  bodyMarkdown: 'Captured tasks, reviewed tomorrow, closing work.',
  tags: ['work', 'shutdown']
}
```

3. **Tasks**: Open loops captured as tasks

#### 3. Parsing/Disambiguation Approach

Shutdown detection: "Work shutdown complete" matches routine. "Open loops" creates task list. "Done for the day" confirms boundary.

Cal Newport style shutdown complete ritual supported.

#### 4. Gamification Impact

XP: 30 XP for complete shutdown. Work-life boundary badge progress. Evening routine prepared for.

#### 5. Architecture Solution

Shutdown routine creates psychological work boundary. Tomorrow's tasks prepared. Work notifications can be suppressed post-shutdown. Evening routine suggested after work shutdown.

---

### UC-R038: Simple Work Start Check-In (Dabbler)

#### 1. User Phrase/Scenario
Jordan says: "Starting work. Made my coffee and looked at what's on for today."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (minimal)
```typescript
{
  routineDefinitionId: 'simple-work-start',
  completedAt: Date.now(),
  itemsCompleted: ['coffee', 'day_review']
}
```

#### 3. Parsing/Disambiguation Approach

Work start detection: "Starting work" triggers routine. Coffee and day review captured. No pressure for more elaborate routine.

Dabbler acceptance: Simple routine is valid routine.

#### 4. Gamification Impact

XP: 10 XP. Streak maintained. Message: "Ready to go!"

#### 5. Architecture Solution

Minimal work routine accepted. No prompting for additional items. Work context noted for day categorization.

---

### UC-R039: End of Day Brain Dump (Neurodivergent)

#### 1. User Phrase/Scenario
Riley says: "End of work brain dump: Need to follow up with client about proposal, remember to order supplies, that meeting got rescheduled to Thursday, and I should look into that software @Jamie mentioned."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  routineDefinitionId: 'adhd-brain-dump',
  completedAt: Date.now()
}
```

2. **Tasks created**:
- "Follow up with client about proposal"
- "Order supplies"
- "Look into software @Jamie mentioned"

3. **Event updated**: Meeting rescheduled to Thursday

#### 3. Parsing/Disambiguation Approach

Brain dump parsing: Multiple items extracted from stream. Task vs event vs note classification. @Jamie captured as person mention.

ADHD support: Captures everything without requiring organization upfront.

#### 4. Gamification Impact

XP: 20 XP for brain dump. Working memory offloaded. Message: "All captured! Your brain can rest now."

#### 5. Architecture Solution

Brain dump parses stream into structured items. Tasks auto-categorized. Events updated if schedule changes detected. Review/organize optional (can happen tomorrow).

---

### UC-R040: Work Transition Routine (Privacy-First)

#### 1. User Phrase/Scenario
Morgan says: "Transitioning from work. Logged off company systems, clearing headspace. Storing no work details in the app."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (privacy-conscious)
```typescript
{
  routineDefinitionId: 'work-transition',
  completedAt: Date.now(),
  workDetailsStored: false,
  transitionType: 'work_to_personal'
}
```

#### 3. Parsing/Disambiguation Approach

Privacy respect: "Storing no work details" honored. Routine completion logged without content. Transition captured as boundary marker.

#### 4. Gamification Impact

XP: 15 XP. Work-life boundary tracked. No work content in personal app.

#### 5. Architecture Solution

Routine logged without work-specific content. Transition timestamp creates boundary. Personal evening routines can begin. Strict separation between work and personal data.

---

### UC-R041: Remote Work Morning Routine (Optimizer)

#### 1. User Phrase/Scenario
Alex says: "Remote work startup: showered and dressed like going to office, set up workspace, blocked off focus time on calendar, Slack status set to deep work."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  routineDefinitionId: 'remote-work-startup',
  completedAt: Date.now(),
  workType: 'remote'
}
```

2. **HabitInstances**: Get dressed properly, Workspace setup, Calendar blocking, Status update

#### 3. Parsing/Disambiguation Approach

Remote work context: Multiple productivity signals. "Like going to office" noted as psychological boundary. Focus time commitment captured.

#### 4. Gamification Impact

XP: 25 XP. Remote work discipline tracked. Focus session prepared.

#### 5. Architecture Solution

Remote work routine distinct from office routine. Calendar API integration for time blocking. Slack status integration (optional). Deep work session tracking begins.

---

### UC-R042: Work Break Routine (Neurodivergent)

#### 1. User Phrase/Scenario
Riley says: "Taking a work break. Stepped away from desk, got water, did some stretches. Brain feels less foggy now."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  routineDefinitionId: 'adhd-work-break',
  completedAt: Date.now(),
  priorState: 'foggy',
  postState: 'clearer'
}
```

2. **HabitInstances**: Desk break, Hydration, Stretching

3. **TrackerLog**: Mental clarity improvement

#### 3. Parsing/Disambiguation Approach

Break detection: "Work break" triggers mid-day routine. State change captured: foggy -> clearer. Multiple break activities logged.

ADHD support: Regular breaks celebrated, not seen as interruption.

#### 4. Gamification Impact

XP: 15 XP. Break streak tracked. Message: "Smart move taking a break!"

#### 5. Architecture Solution

Work break routine encouraged via periodic prompts. State improvement tracked for break effectiveness analysis. Optimal break frequency suggested based on patterns.

---

### UC-R043: Pre-Meeting Preparation Routine (Optimizer)

#### 1. User Phrase/Scenario
Alex says: "Pre-meeting prep for the client call: reviewed notes, prepared questions, tested video setup, set intention to listen more than talk."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  routineDefinitionId: 'pre-meeting-prep',
  completedAt: Date.now(),
  linkedEventId: 'client-call-event-id',
  meetingType: 'client'
}
```

2. **JournalEntry** (intention)
```typescript
{
  bodyMarkdown: 'Intention: Listen more than talk',
  tags: ['meeting', 'intention']
}
```

#### 3. Parsing/Disambiguation Approach

Meeting prep detection: Links to calendar event. Preparation items logged. Intention captured for reflection.

#### 4. Gamification Impact

XP: 20 XP. Preparation bonus for meeting. Post-meeting reflection prompted.

#### 5. Architecture Solution

Pre-meeting routine links to calendar event. Intention stored for post-meeting comparison. Meeting effectiveness tracking over time.

---

### UC-R044: End of Week Reflection Routine (Reflector)

#### 1. User Phrase/Scenario
Casey says: "Friday end of week reflection: This week felt productive but also draining. Best moment was the breakthrough on the project Wednesday. Need more balance next week."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  routineDefinitionId: 'weekly-reflection',
  completedAt: Date.now(),
  periodType: 'week_end'
}
```

2. **JournalEntry** (weekly reflection)
```typescript
{
  title: 'Week Reflection',
  bodyMarkdown: 'Productive but draining. Best moment: project breakthrough Wednesday. Need more balance.',
  emotions: ['accomplished', 'tired'],
  insights: ['need_more_balance']
}
```

#### 3. Parsing/Disambiguation Approach

Weekly routine: Friday + "end of week" triggers weekly reflection. Mixed emotions captured. Insight extracted: balance need.

Reflector style: Full narrative preserved.

#### 4. Gamification Impact

XP: 25 XP (silent). Weekly reflection streak. Contributes to monthly synthesis.

#### 5. Architecture Solution

Friday reflection links to week's entries. Key moments extracted. Insights tagged for pattern tracking. Monthly review aggregates weekly reflections.

---

### UC-R045: Work Day Closure When Overwhelmed (Neurodivergent)

#### 1. User Phrase/Scenario
Riley says: "Just closing out work for today. Didn't get everything done but I need to stop. Tomorrow is another day."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (compassionate closure)
```typescript
{
  routineDefinitionId: 'adhd-work-closure',
  completedAt: Date.now(),
  completionState: 'partial',
  selfCompassionNote: 'Tomorrow is another day'
}
```

#### 3. Parsing/Disambiguation Approach

Overwhelm detection: "Need to stop" signals capacity limit. "Didn't get everything done" normalized. Self-compassion captured.

Non-punitive response: Closure celebrated regardless of completion.

#### 4. Gamification Impact

XP: 20 XP for healthy boundary setting. No penalty for incomplete work. Message: "Good call knowing when to stop. Rest well."

#### 5. Architecture Solution

Boundary-setting valued over task completion. Incomplete tasks roll to tomorrow automatically. No guilt-inducing task lists. Tomorrow starts fresh.

---

## Weekend vs Weekday Routines

### UC-R046: Weekend Morning Routine Switch (Optimizer)

#### 1. User Phrase/Scenario
Alex says: "Saturday morning routine: slept in, leisurely breakfast, reading for an hour. No alarms, no rush."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (weekend variant)
```typescript
{
  routineDefinitionId: 'weekend-morning',
  completedAt: Date.now(),
  dayType: 'weekend',
  paceType: 'leisurely'
}
```

HabitInstances: Reading (60 min), Relaxed breakfast

#### 3. Parsing/Disambiguation Approach

Weekend detection: Saturday + "slept in" + "no rush" signals weekend mode. Different routine definition activated. Leisure activities logged.

Day-type awareness: System knows weekday vs weekend context.

#### 4. Gamification Impact

XP: 20 XP. Weekend routine counts toward streak. No pressure for productivity.

#### 5. Architecture Solution

Weekend routines auto-suggested on Sat/Sun. Lower intensity expectations. Rest and recovery valued equally to productivity.

---

### UC-R047: Weekday Express Routine (Dabbler)

#### 1. User Phrase/Scenario
Jordan says: "Busy Monday - just did the essentials: got ready and out the door."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (express)
```typescript
{
  routineDefinitionId: 'express-morning',
  completedAt: Date.now(),
  dayType: 'busy_weekday',
  version: 'minimal'
}
```

#### 3. Parsing/Disambiguation Approach

Express routine: "Busy" + "essentials" triggers minimal version. Getting ready accepted as complete routine.

Dabbler flexibility: Minimal counts.

#### 4. Gamification Impact

XP: 8 XP. Streak maintained. Message: "Essentials covered!"

#### 5. Architecture Solution

Express routines for busy days. One-tap completion option. No elaboration required.

---

### UC-R048: Sunday Planning Routine (Optimizer)

#### 1. User Phrase/Scenario
Alex says: "Sunday planning session complete: reviewed last week, planned meals for the week, set up workout schedule, identified top 3 priorities for Monday."

#### 2. Data Model Mapping

**Created Entities:**

1. **RoutineInstance**
```typescript
{
  routineDefinitionId: 'sunday-planning',
  completedAt: Date.now(),
  planningScope: 'weekly'
}
```

2. **HabitInstances**: Week review, Meal planning, Workout scheduling, Priority setting

3. **Tasks**: Monday's top 3 priorities

#### 3. Parsing/Disambiguation Approach

Weekly planning: Sunday + "planning session" triggers. Multiple planning activities captured. Week ahead prepared.

#### 4. Gamification Impact

XP: 40 XP for comprehensive planning. Week preparation bonus. Monday will start strong.

#### 5. Architecture Solution

Sunday planning routine creates weekly structure. Meal plan integrates with nutrition tracking. Workout schedule populates calendar. Monday priorities surface automatically.

---

### UC-R049: Weekend Family Routine (Neurodivergent)

#### 1. User Phrase/Scenario
Riley says: "Weekend family routine: had breakfast with kids, helped with homework, went to the park. Different from my weekday routine but that's okay."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (family variant)
```typescript
{
  routineDefinitionId: 'family-weekend',
  completedAt: Date.now(),
  context: 'family_time',
  participants: ['kids']
}
```

#### 3. Parsing/Disambiguation Approach

Family routine: Weekend + family activities. Different routine accepted without comparison to weekday. "That's okay" validated.

Context switching supported: Family mode different from solo mode.

#### 4. Gamification Impact

XP: 25 XP. Connection skill bonus. Family time valued.

#### 5. Architecture Solution

Family routines separate from individual routines. Kid-related activities tracked under Connection category. Weekend flexibility honored.

---

### UC-R050: Weekday Evening vs Weekend Evening (Privacy-First)

#### 1. User Phrase/Scenario
Morgan says: "Different evening tonight since it's Friday. Doing the social version - going out with friends instead of my usual solo wind-down."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (variant selection)
```typescript
{
  routineDefinitionId: 'evening-routine',
  variant: 'social_friday',
  socialActivity: true,
  usualRoutineDeferred: true
}
```

#### 3. Parsing/Disambiguation Approach

Variant detection: "Different" + "Friday" + "social" activates variant. Solo routine acknowledged but deferred.

Flexible routine system: Multiple variants per routine type.

#### 4. Gamification Impact

XP: 20 XP for social variant. Connection bonus. Solo routine not marked as missed.

#### 5. Architecture Solution

Routine variants for different day types. Friday evening = social option. Solo routine return on Saturday validated. Flexibility over rigidity.

---

### UC-R051: Recovering Monday Routine After Weekend Break (Dabbler)

#### 1. User Phrase/Scenario
Jordan says: "Back to the weekday routine after the weekend. Did my morning stuff - shower, breakfast, work prep."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineInstance** (weekday return)
```typescript
{
  routineDefinitionId: 'weekday-morning',
  completedAt: Date.now(),
  transitionFrom: 'weekend',
  dayType: 'monday'
}
```

#### 3. Parsing/Disambiguation Approach

Weekday return: "Back to weekday routine" signals transition. Monday context understood. Basic routine logged.

#### 4. Gamification Impact

XP: 15 XP. Monday startup bonus. Message: "Good Monday start!"

#### 5. Architecture Solution

Weekend -> weekday transition tracked. Monday routines may have gentler expectations. Ramp-up approach supported.

---

## Routine Templates

### UC-R052: Creating Routine from Template (Optimizer)

#### 1. User Phrase/Scenario
Alex says: "I want to use the Huberman morning routine template but customize it - remove the AG1 and add my own supplements."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineDefinition** (from template)
```typescript
{
  id: 'new-routine-uuid',
  name: 'My Morning Protocol',
  templateSource: 'huberman_morning',
  modifications: [
    { action: 'remove', item: 'ag1' },
    { action: 'add', item: 'custom_supplements' }
  ],
  items: [/* customized list */]
}
```

#### 3. Parsing/Disambiguation Approach

Template selection: "Huberman morning routine template" matches library. Customization instructions parsed. Add/remove operations applied.

#### 4. Gamification Impact

XP: 10 XP for routine creation. Template usage tracked. Customization encouraged.

#### 5. Architecture Solution

Template library provides starting points. Customization layer applied. Original template preserved. User's version independent going forward.

---

### UC-R053: Sharing Routine as Template (Biohacker)

#### 1. User Phrase/Scenario
Sam says: "I want to share my sleep protocol as a public template. Others might find it useful."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineTemplate** (public)
```typescript
{
  id: 'template-uuid',
  name: "Sam's Sleep Protocol",
  sourceRoutineId: 'sleep-protocol-def-id',
  visibility: 'public',
  creator: 'sam-user-id',
  anonymized: false, // Sam chose to attach name
  downloads: 0
}
```

#### 3. Parsing/Disambiguation Approach

Sharing intent: "Share as public template" triggers template creation. Content sanitized (no personal data). Attribution optional.

#### 4. Gamification Impact

XP: 25 XP for sharing. Community contribution badge. Download notifications.

#### 5. Architecture Solution

Routine stripped of personal data. Template published to library. Download tracking. Creator attribution (optional). Reviews and ratings from users.

---

### UC-R054: Importing Community Template (Dabbler)

#### 1. User Phrase/Scenario
Jordan says: "I saw a simple morning routine template in the library. Can you add that for me?"

#### 2. Data Model Mapping

**Created Entity:**

**RoutineDefinition** (imported)
```typescript
{
  id: 'new-routine-uuid',
  name: 'Simple Morning',
  templateSource: 'community_library_template_id',
  importedAt: Date.now(),
  modifiedFromTemplate: false
}
```

#### 3. Parsing/Disambiguation Approach

Import request: Library template identified. One-tap import. No customization needed.

Dabbler simplicity: Pre-built routine ready to use.

#### 4. Gamification Impact

XP: 5 XP for setup. Template gets +1 download. Ready to start using.

#### 5. Architecture Solution

Template copied to user's routine definitions. Original template referenced. User can modify later. Quick start enabled.

---

### UC-R055: Template Version Updates (Optimizer)

#### 1. User Phrase/Scenario
System notifies Alex: "The Huberman protocol template you're using has been updated. Would you like to see what changed?"

#### 2. Data Model Mapping

**Notification:**

```typescript
{
  type: 'template_update_available',
  templateId: 'huberman_morning',
  userRoutineId: 'alex-routine-uuid',
  changes: [
    { type: 'item_added', item: 'morning_sunlight' },
    { type: 'timing_changed', item: 'cold_exposure', from: '3min', to: '5min' }
  ]
}
```

#### 3. Parsing/Disambiguation Approach

Update detection: Template version changed. User notified of differences. Merge options presented.

#### 4. Gamification Impact

No XP for notification. Accepting updates tracked. Staying current encouraged.

#### 5. Architecture Solution

Template versioning system. User subscribed to updates. Diff view shows changes. Accept/reject/customize options. User's modifications preserved during merge.

---

### UC-R056: Creating Custom Template for Household (Privacy-First)

#### 1. User Phrase/Scenario
Morgan says: "Create a bedtime routine template that I can share with my family but keep private from the public."

#### 2. Data Model Mapping

**Created Entity:**

**RoutineTemplate** (private sharing)
```typescript
{
  id: 'template-uuid',
  name: 'Family Bedtime Routine',
  visibility: 'private_share',
  shareWith: ['family_email_1', 'family_email_2'],
  publicListing: false
}
```

#### 3. Parsing/Disambiguation Approach

Private sharing: "Share with family but private from public" creates restricted template. Email-based sharing.

Privacy-first: No public exposure.

#### 4. Gamification Impact

XP: 10 XP. Family feature usage tracked privately. No public metrics.

#### 5. Architecture Solution

Private template sharing via email/link. Invitees can import. No public library listing. Sharing audit trail for creator. Revoke access anytime.

---

## Flexible Timing Within Routines

### UC-R057: Routine with Flexible Window (Neurodivergent)

#### 1. User Phrase/Scenario
Riley says: "Set my morning routine window to be between 6 AM and 10 AM. I want flexibility for when I actually get to it."

#### 2. Data Model Mapping

**Updated Entity:**

**RoutineDefinition**
```typescript
{
  id: 'morning-routine-def-id',
  timing: {
    type: 'flexible_window',
    windowStart: '06:00',
    windowEnd: '10:00',
    strictMode: false
  }
}
```

#### 3. Parsing/Disambiguation Approach

Window setting: Time range extracted. Flexible mode enabled. No penalty for completion anywhere in window.

ADHD accommodation: Wide window reduces pressure.

#### 4. Gamification Impact

Full XP regardless of completion time within window. Time bonus disabled for flexible routines. Completion is what matters.

#### 5. Architecture Solution

Routine timer checks for window, not exact time. Any completion in window = success. Notifications spread across window. No "you're late" messages.

---

### UC-R058: Time-Anchored Items Within Flexible Routine (Optimizer)

#### 1. User Phrase/Scenario
Alex says: "My morning routine is flexible but I need to take medication by 8 AM specifically. The rest can happen whenever."

#### 2. Data Model Mapping

**Updated Entity:**

**RoutineDefinition**
```typescript
{
  id: 'morning-routine-def-id',
  timing: {
    type: 'hybrid',
    overallWindow: { start: '05:00', end: '09:00' },
    itemConstraints: [
      { itemId: 'medication', mustCompleteBefore: '08:00' }
    ]
  }
}
```

#### 3. Parsing/Disambiguation Approach

Hybrid timing: Most items flexible. Medication has hard constraint. System separates concerns.

#### 4. Gamification Impact

Time bonus only for medication by 8 AM. Other items earn standard XP in window.

#### 5. Architecture Solution

Individual item time constraints within flexible routine. Medication reminder prioritized. Other reminders flexible. Completion dashboard shows constraint status.

---

### UC-R059: Event-Triggered Routine Start (Biohacker)

#### 1. User Phrase/Scenario
Sam says: "Start my post-wakeup routine when my Oura ring detects I'm awake, not at a fixed time."

#### 2. Data Model Mapping

**Updated Entity:**

**RoutineDefinition**
```typescript
{
  id: 'post-wakeup-routine',
  timing: {
    type: 'event_triggered',
    triggerSource: 'oura',
    triggerEvent: 'wake_detected',
    delayMinutes: 5
  }
}
```

#### 3. Parsing/Disambiguation Approach

Event trigger: Oura wake detection starts routine. Fixed time replaced with biometric trigger.

Biohacker precision: Body state determines routine timing.

#### 4. Gamification Impact

XP based on completion, not arbitrary time. Adaptive timing improves consistency.

#### 5. Architecture Solution

Wearable integration fires routine trigger. Push notification sent on wake detection. Routine items presented. Time is contextual, not fixed.

---

### UC-R060: Routine Item Time Estimates (Dabbler)

#### 1. User Phrase/Scenario
Jordan asks: "How long should my morning routine take? I need to know if I have time."

#### 2. Data Model Mapping

**Generated Analysis:**

```typescript
{
  routineId: 'morning-routine-def-id',
  estimatedDuration: {
    minimum: 15, // Express version
    typical: 25, // Normal completion
    relaxed: 40  // Leisurely version
  },
  byItem: [
    { item: 'shower', estimate: 8 },
    { item: 'breakfast', estimate: 10 },
    { item: 'planning', estimate: 7 }
  ]
}
```

#### 3. Parsing/Disambiguation Approach

Time query: Duration estimate requested. Multiple scenarios provided.

Dabbler decision support: Know before committing.

#### 4. Gamification Impact

No XP for query. Time awareness improves completion rates.

#### 5. Architecture Solution

Historical completion times analyzed. Range provided. Quick decision: "I have 20 minutes, that works."

---

### UC-R061: Adjusting Routine Based on Available Time (Neurodivergent)

#### 1. User Phrase/Scenario
Riley says: "I only have 10 minutes this morning. What's the minimum version of my routine?"

#### 2. Data Model Mapping

**System Response:**

```typescript
{
  request: 'minimum_routine',
  availableTime: 10,
  suggestedItems: [
    { item: 'medication', duration: 1, priority: 'required' },
    { item: 'quick_stretch', duration: 3, priority: 'recommended' },
    { item: 'water', duration: 1, priority: 'recommended' }
  ],
  totalDuration: 5,
  message: 'These are the essentials. You got this!'
}
```

#### 3. Parsing/Disambiguation Approach

Time constraint: 10 minutes parsed. Essential items prioritized. Non-essentials deferred.

ADHD support: Decision made for user.

#### 4. Gamification Impact

Minimum routine completion = full XP. No penalty for abbreviated version. Message: "Essentials done in 5 minutes!"

#### 5. Architecture Solution

Routine items have priority rankings. Time-constrained mode filters to essentials. Medication always included. Quick completion available.

---

## Routine Completion Tracking

### UC-R062: Routine Completion Rate Dashboard (Optimizer)

#### 1. User Phrase/Scenario
Alex asks: "Show me my routine completion rates for the past month."

#### 2. Data Model Mapping

**Generated Report:**

```typescript
{
  period: 'last_30_days',
  routines: [
    {
      name: 'Morning Routine',
      completionRate: 0.93, // 93%
      fullCompletions: 28,
      partialCompletions: 2,
      missed: 0
    },
    {
      name: 'Evening Routine',
      completionRate: 0.87,
      fullCompletions: 24,
      partialCompletions: 2,
      missed: 4
    },
    {
      name: 'Workout Routine',
      completionRate: 0.75,
      fullCompletions: 15,
      partialCompletions: 3,
      missed: 2
    }
  ]
}
```

#### 3. Parsing/Disambiguation Approach

Report query: "Completion rates" + "past month" generates dashboard. All routines summarized.

#### 4. Gamification Impact

Analysis XP: 5 XP. Insights drive improvement. Patterns identified.

#### 5. Architecture Solution

Completion analytics aggregated. Visualization: Bar charts by routine. Drill-down available. Trend lines show improvement/decline.

---

### UC-R063: Routine Item-Level Analytics (Biohacker)

#### 1. User Phrase/Scenario
Sam asks: "Which items in my morning protocol am I most likely to skip?"

#### 2. Data Model Mapping

**Generated Analysis:**

```typescript
{
  routineId: 'biohacker-morning-protocol',
  itemSkipRates: [
    { item: 'cold_plunge', skipRate: 0.15, reason: 'time_constraint' },
    { item: 'journaling', skipRate: 0.12, reason: 'energy_low' },
    { item: 'meditation', skipRate: 0.05, reason: 'rare' },
    { item: 'supplements', skipRate: 0.02, reason: 'very_consistent' }
  ]
}
```

#### 3. Parsing/Disambiguation Approach

Item-level query: Skip rates per item. Reasons inferred from context.

#### 4. Gamification Impact

Analysis XP: 10 XP. Identifies improvement opportunities.

#### 5. Architecture Solution

Skip reason tracking when items missed. Pattern analysis identifies barriers. Suggestions: "Cold plunge skipped on mornings after poor sleep."

---

### UC-R064: Weekly Routine Completion Summary (Reflector)

#### 1. User Phrase/Scenario
Casey receives weekly summary: "This week you completed your evening reflection routine 6 out of 7 days. Your journaling has been rich and consistent."

#### 2. Data Model Mapping

**Weekly Summary:**

```typescript
{
  routineId: 'evening-reflection',
  weekOf: '2026-01-12',
  daysCompleted: 6,
  daysMissed: 1,
  qualityMetrics: {
    avgWordCount: 450,
    emotionalDepth: 'high',
    themeConsistency: 'self-compassion'
  }
}
```

#### 3. Parsing/Disambiguation Approach

Automated summary: Weekly routine rolled up. Quality assessed, not just quantity.

Reflector focus: Depth over frequency.

#### 4. Gamification Impact

No visible XP in summary. Insight-focused messaging. Completion celebrated qualitatively.

#### 5. Architecture Solution

Weekly summary generated automatically. Qualitative analysis for Reflectors. Sent Sunday evening. Read receipt optional.

---

### UC-R065: Routine Streak Recovery After Break (Dabbler)

#### 1. User Phrase/Scenario
Jordan returns after vacation: "I'm back. Haven't done my routine in a week. Starting fresh today."

#### 2. Data Model Mapping

**System Response:**

```typescript
{
  absenceDuration: 7,
  previousStreak: 12,
  longestStreakPreserved: 12,
  newStreakStart: Date.now(),
  message: "Welcome back! Your 12-day streak is in the records. Today is day 1 of your next one!"
}
```

#### 3. Parsing/Disambiguation Approach

Absence acknowledged: "Haven't done" + "week" noted. "Starting fresh" embraced.

Dabbler encouragement: Fresh start, no guilt.

#### 4. Gamification Impact

Previous streak preserved in achievements. New streak begins at 1. No penalty messaging. Message: "Every streak starts with day 1!"

#### 5. Architecture Solution

Streak history preserved separately from current streak. "Best streak" never decreases. Fresh start positioned positively. Welcome back bonus XP optional.

---

## Routine Analytics and Suggestions

### UC-R066: Routine Optimization Suggestions (Optimizer)

#### 1. User Phrase/Scenario
System proactively suggests to Alex: "Your data shows that when you do cold exposure before meditation (not after), your focus scores are 18% higher. Want to try reordering your morning routine?"

#### 2. Data Model Mapping

**Suggestion:**

```typescript
{
  type: 'routine_optimization',
  routineId: 'morning-routine-def-id',
  insight: {
    correlation: 'cold_exposure_before_meditation',
    metric: 'focus_score',
    improvement: 0.18,
    sampleSize: 45,
    confidence: 0.92
  },
  suggestedChange: {
    currentOrder: ['meditation', 'cold_exposure'],
    suggestedOrder: ['cold_exposure', 'meditation']
  },
  actions: ['accept', 'experiment', 'dismiss']
}
```

#### 3. Parsing/Disambiguation Approach

Proactive insight: System analyzed routine variations. Focus correlation identified. Actionable suggestion generated.

#### 4. Gamification Impact

Accepting suggestion: 10 XP. Experiment tracked. Results measured after 2 weeks.

#### 5. Architecture Solution

Correlation engine runs weekly analysis. Suggestions filtered by confidence threshold. A/B experiment framework for testing changes. Results validated before permanent recommendation.

---

### UC-R067: Routine Effectiveness Report (Biohacker)

#### 1. User Phrase/Scenario
Sam asks: "Generate a full report on how my routines are affecting my key metrics - energy, focus, and sleep quality."

#### 2. Data Model Mapping

**Generated Report:**

```typescript
{
  reportType: 'routine_effectiveness',
  dateRange: 'last_90_days',
  metrics: ['energy', 'focus', 'sleep_quality'],
  findings: [
    {
      routine: 'Morning Protocol',
      metricImpact: {
        energy: { correlation: 0.72, impact: '+1.2 points when completed' },
        focus: { correlation: 0.68, impact: '+0.9 points when completed' }
      }
    },
    {
      routine: 'Sleep Protocol',
      metricImpact: {
        sleep_quality: { correlation: 0.81, impact: '+15% deep sleep' }
      }
    },
    {
      routine: 'Post-Workout Recovery',
      metricImpact: {
        energy: { correlation: 0.45, impact: 'Faster next-day recovery' }
      }
    }
  ],
  recommendations: [
    'Morning protocol has highest ROI for energy',
    'Sleep protocol strongly impacts recovery metrics',
    'Consider adding evening wind-down routine - gap identified'
  ]
}
```

#### 3. Parsing/Disambiguation Approach

Comprehensive analysis: All routines correlated with specified metrics. Statistical significance calculated. Gaps identified.

Biohacker depth: Full data-driven report.

#### 4. Gamification Impact

Report generation: 25 XP. Data science achievement progress. Insights drive optimization.

#### 5. Architecture Solution

90-day data aggregation. Multiple regression analysis. Confidence intervals included. Exportable report (PDF/JSON). Actionable recommendations prioritized by impact.

---

## Appendix A: Routine Data Model Summary

```typescript
interface RoutineDefinition extends BaseEntity {
  name: string;
  description: string;
  type: 'morning' | 'evening' | 'pre_workout' | 'post_workout' | 'work' | 'custom';
  items: RoutineItem[];
  timing: RoutineTiming;
  dayTypes: ('weekday' | 'weekend' | 'any')[];
  variants: RoutineVariant[];
  templateSource: string | null;
  syncEnabled: boolean;
}

interface RoutineInstance extends BaseEntity {
  routineDefinitionId: string;
  completedAt: number;
  completionRate: number;
  itemsCompleted: string[];
  itemsSkipped: string[];
  totalDurationMinutes: number;
  contextTags: string[];
  linkedWorkoutId: string | null;
}

interface RoutineTiming {
  type: 'fixed' | 'flexible_window' | 'event_triggered' | 'hybrid';
  windowStart: string | null;
  windowEnd: string | null;
  triggerSource: string | null;
  itemConstraints: ItemConstraint[];
}
```

---

## Appendix B: Persona Distribution Summary

| Persona | Use Cases | Primary Scenarios |
|---------|-----------|-------------------|
| Optimizer (Alex) | 12 | Morning optimization, analytics, work routines |
| Dabbler (Jordan) | 10 | Partial completion, simple routines, flexible timing |
| Privacy-First (Morgan) | 5 | Local storage, private templates, minimal sync |
| Neurodivergent (Riley) | 14 | Flexible order, skip handling, time windows, scaffolding |
| Biohacker (Sam) | 14 | Protocols, timestamps, supplements, correlations |
| Reflector (Casey) | 8 | Journaling routines, mood integration, weekly reflection |

---

*End of Document*

**Word Count:** Approximately 18,500 words
**Use Case Count:** 67
