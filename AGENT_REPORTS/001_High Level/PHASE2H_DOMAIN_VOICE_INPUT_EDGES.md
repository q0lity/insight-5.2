# PHASE 2H: Voice Input Edge Cases Domain
## Insight 5.2 Use Case Specification

**Domain:** Voice Input Edge Cases
**Use Case Count:** 67
**Word Target:** 20,000-25,000 words
**Naming Convention:** UC-VOI-###

---

## Domain Overview

Voice input is a primary interaction modality for Insight 5.2, enabling frictionless logging across all contexts—from gym floors to morning commutes. However, real-world voice capture introduces significant edge cases that the parsing and disambiguation systems must handle gracefully. This domain covers:

- **Environmental Challenges:** Background noise, interruptions, poor connectivity
- **Linguistic Edge Cases:** Corrections, restarts, multilingual mixing, incomplete thoughts
- **Emotional/Safety Scenarios:** Crisis content detection, emotional overwhelm
- **Technical Failures:** Transcription errors, garbled audio, abandoned recordings
- **Cross-Persona Variations:** How each persona's voice patterns create unique edge cases

Each use case follows the standard 5-section template: User Phrase/Scenario, Data Model Mapping, Parsing/Disambiguation Approach, Gamification Impact, and Architecture Solution.

---

## Section 1: Environmental Edge Cases (UC-VOI-001 through UC-VOI-015)

---

### UC-VOI-001: Gym Background Noise with Music

**Persona:** Biohacker (Sam)

#### 1. User Phrase / Scenario

Sam is at the gym between sets, loud electronic music playing overhead. They speak into their phone:

**Voice Input (as transcribed with errors):**
> "Just finished bench press three sets of eight at 185 [garbled] rest period was 90 seconds heart rate peaked at [unintelligible] BPM"

**Voice Variations:**
- "Bench 3x8 185... [music drowns out] ...90 second rest"
- "Did my bench work [gym announcement interrupts] 185 pounds three sets"
- "Benching done [clanking weights] 185 for 8 reps times three"

#### 2. Data Model Mapping

Despite transcription gaps, system creates partial entry:

```typescript
const workoutEntry: WorkoutEntry = {
  id: "wrk_uuid_001",
  entityType: "workout",
  exerciseName: "bench_press",
  sets: 3,
  reps: 8,
  weight: { value: 185, unit: "lbs" },
  restPeriod: { value: 90, unit: "seconds" },
  heartRatePeak: null, // Marked as missing due to unintelligible audio
  confidence: 0.72,
  audioQuality: "degraded",
  missingFields: ["heartRatePeak"],
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Audio quality score < 0.7 triggers "degraded audio" flag
- Pattern matching identifies workout vocabulary despite gaps
- Numbers adjacent to exercise names parsed as weight/reps
- "[unintelligible]" markers from STT preserved for gap detection

**Classification Flow:**
1. STT returns partial transcript with confidence scores per segment
2. NLP identifies high-confidence tokens: "bench press", "185", "3", "8", "90 seconds"
3. Low-confidence gaps flagged rather than guessed
4. Entity assembled with explicit `missingFields` array
5. Follow-up prompt queued: "I caught most of your bench press entry but missed the heart rate. Want to add it?"

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 15, // Workout log
  partialEntryPenalty: 0, // No penalty for environment issues
  effortBonus: 5, // Still logged despite noise
  streakMaintained: true,
  totalXP: 20,
  feedbackMessage: "Gym log captured! 💪 Missing heart rate—add it when you can."
};
```

#### 5. Architecture Solution

```
Voice Input → STT (with quality scores) → Partial Parse
     ↓
Audio Quality Analyzer → Flags degraded segments
     ↓
Entity Builder → Creates entry with explicit gaps
     ↓
Missing Field Queue → Schedules gentle follow-up prompt
     ↓
UI: Shows entry with "tap to complete" on missing fields
```

**API Sequence:**
1. `POST /voice/transcribe` with audio quality metadata
2. `POST /entries/workout` with `confidence` and `missingFields`
3. `POST /prompts/schedule` for follow-up in 30 minutes

---

### UC-VOI-002: Car Driving with Road Noise and Interruptions

**Persona:** Dabbler (Jordan)

#### 1. User Phrase / Scenario

Jordan is driving to work, using voice to log their morning. Road noise and a car horn interrupt mid-sentence:

**Voice Input (as transcribed):**
> "Had coffee and a bagel for breakfast feeling pretty good today actually wait [horn honk] sorry where was I oh yeah energy level is like a 7 I guess"

**Voice Variations:**
- "Breakfast was [engine revving] coffee and something... a bagel I think"
- "Ate this morning [siren passes] had my usual coffee"
- "Morning food... [long pause while focusing on road] ...was just coffee and bread stuff"

#### 2. Data Model Mapping

System parses the conversational, interrupted stream:

```typescript
const nutritionEntry: NutritionEntry = {
  id: "nut_uuid_001",
  entityType: "nutrition",
  mealType: "breakfast",
  items: [
    { name: "coffee", confidence: 0.95 },
    { name: "bagel", confidence: 0.88 }
  ],
  timestamp: Date.now()
};

const moodEntry: MoodEntry = {
  id: "mood_uuid_001",
  entityType: "mood",
  energyLevel: 7,
  overallSentiment: "positive",
  rawPhrase: "feeling pretty good today",
  confidence: 0.85,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Filler phrases ("wait", "sorry", "where was I", "oh yeah") indicate interruption recovery
- Self-corrections ("I guess") indicate uncertainty but valid data
- Natural language food items extracted via meal vocabulary
- Energy level scale detected via "like a 7"

**Classification Flow:**
1. Filler phrase filter removes: "wait", "sorry where was I", "oh yeah", "I guess"
2. Sentence reconstruction: "Had coffee and a bagel for breakfast feeling pretty good today energy level is like a 7"
3. Multi-entity extraction: nutrition (breakfast) + mood (energy rating)
4. Interruption markers logged for UX research

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Nutrition log
  moodBonusXP: 5, // Additional mood capture
  drivingContextBonus: 3, // Logged while multitasking
  streakMaintained: true,
  totalXP: 18,
  feedbackMessage: "Breakfast logged! Energy at 7—nice start to the day."
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Filler Phrase Filter
     ↓
Interruption Detector → Marks recovery points
     ↓
Sentence Reconstructor → Cleans transcript
     ↓
Multi-Entity Parser → Extracts nutrition + mood
     ↓
Batch Entity Creator → Saves both entries atomically
```

**Safety Note:** System detects driving context via motion sensors; limits follow-up prompts to prevent distraction.

---

### UC-VOI-003: Public Transit with Announcements and Crowd Noise

**Persona:** Neurodivergent (Riley)

#### 1. User Phrase / Scenario

Riley is on the subway, trying to log a thought before they forget it. Station announcements and crowd chatter compete:

**Voice Input (as transcribed):**
> "Need to remember [announcement: 'Next stop Downtown'] that I felt anxious at the meeting when they um [crowd noise] when they asked me to speak without warning I should [garbled] something about that"

**Voice Variations:**
- "Anxiety thing at work [doors chiming] the surprise speaking thing"
- "Feeling [announcement] anxious about [pause] meetings with no prep time"
- "Just need to capture [crowd surge] the meeting anxiety before I forget it"

#### 2. Data Model Mapping

System preserves the core emotional insight despite fragmentation:

```typescript
const journalEntry: JournalEntry = {
  id: "jrn_uuid_001",
  entityType: "journal",
  entryType: "emotional_capture",
  rawTranscript: "Need to remember that I felt anxious at the meeting when they asked me to speak without warning I should something about that",
  extractedThemes: ["anxiety", "work_meeting", "unexpected_demands"],
  emotionalTone: "anxious",
  potentialTrigger: "surprise_speaking_request",
  captureContext: "transit_rushed",
  confidence: 0.68,
  needsFollowUp: true,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- High emotional vocabulary: "anxious", "without warning"
- Memory urgency: "need to remember", "before I forget"
- Incomplete thoughts indicate capture-mode, not structured logging
- Riley's persona: prioritize preserving intent over parsing entities

**Classification Flow:**
1. Classify as "emotional capture" vs structured entry
2. Extract emotional keywords and potential triggers
3. Preserve raw transcript for later reflection
4. Flag for gentle follow-up when in quieter context
5. Do NOT attempt to create habit/tracker from fragmented input

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Journal capture
  emotionalAwarenessBonus: 5, // Recognized and logged a feeling
  noCompletionPressure: true, // Partial entries welcomed
  streakMaintained: true,
  totalXP: 15,
  feedbackMessage: "Captured that thought 📝 Want to reflect more when you have space?"
};
```

#### 5. Architecture Solution

```
Voice Input → STT (with ambient noise filtering)
     ↓
Capture Mode Detector → "Quick thought" vs "structured log"
     ↓
Emotional Content Analyzer → Themes, triggers, tone
     ↓
Gentle Storage → Saves with needsFollowUp flag
     ↓
Context-Aware Prompt Scheduler → Waits for quiet moment
```

**Neurodivergent Accommodation:** No punishment for incomplete thoughts. System celebrates capture attempts.

---

### UC-VOI-004: Quiet Office with Colleagues Nearby

**Persona:** Privacy-First (Morgan)

#### 1. User Phrase / Scenario

Morgan is at their desk in an open-plan office. They want to log something personal but colleagues might overhear. They speak very quietly:

**Voice Input (as transcribed with low confidence):**
> "[very quiet] feeling stressed about the [whispered] you know the family thing [almost inaudible] need to track this"

**Voice Variations:**
- "[mumbled] stressed... family... tracking"
- "[sotto voce] Log stress level maybe 7 the usual reason"
- "[barely audible] personal stress entry please"

#### 2. Data Model Mapping

System creates minimal, privacy-respecting entry:

```typescript
const moodEntry: MoodEntry = {
  id: "mood_uuid_002",
  entityType: "mood",
  category: "stress",
  level: null, // Not specified in whisper
  tags: ["personal", "family_related"],
  rawTranscript: "[REDACTED - low confidence whisper]",
  transcriptStored: false, // Morgan's privacy setting
  confidence: 0.45,
  privacyMode: "whisper_detected",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Audio volume < 40% of baseline indicates whisper mode
- Privacy-First persona settings: minimize transcript storage
- Keywords: "personal", "family thing", "stressed"
- Explicit logging intent: "need to track this"

**Classification Flow:**
1. Whisper detection triggers privacy mode
2. STT runs locally on device (Morgan's preference)
3. Only structured data extracted; raw audio/transcript not stored
4. Entry created with minimal metadata
5. No voice-to-server transmission for this entry

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Mood log
  privacyRespectedBonus: 0, // Invisible; just works
  streakMaintained: true,
  totalXP: 10,
  feedbackMessage: "Logged privately ✓" // Minimal, discreet
};
```

#### 5. Architecture Solution

```
Voice Input → Local STT (on-device)
     ↓
Whisper Detector → Volume analysis
     ↓
Privacy Mode Activated → No cloud transmission
     ↓
Minimal Entity Extraction → Keywords only
     ↓
Local Storage → Encrypted, no transcript retention
```

**Privacy Features:**
- Whisper audio processed on-device only
- Transcript not stored (Morgan's setting)
- Entry shows only: "Stress logged - personal"
- No analytics transmitted for whisper entries

---

### UC-VOI-005: Outdoor Running with Wind and Breathing

**Persona:** Optimizer (Alex)

#### 1. User Phrase / Scenario

Alex is on a morning run, trying to log stats. Heavy breathing and wind noise compete:

**Voice Input (as transcribed):**
> "[heavy breathing] Mile 3 [wind gust] pace is 7:42 [panting] heart rate... [breathing] probably 165 [wind] feeling strong"

**Voice Variations:**
- "[panting] 3 miles in... [gasp] 7:40 pace... [wind] heart good"
- "Third mile [breathing] sub-8 pace [wind noise] strong effort"
- "[labored breathing] Mile marker 3 [wind] 7:42 [panting] 165 BPM maybe"

#### 2. Data Model Mapping

```typescript
const workoutEntry: WorkoutEntry = {
  id: "wrk_uuid_002",
  entityType: "workout",
  activityType: "running",
  checkpointType: "mile_marker",
  distance: { value: 3, unit: "miles" },
  pace: { value: "7:42", perUnit: "mile" },
  heartRate: { value: 165, confidence: 0.7, qualifier: "estimated" },
  perceivedEffort: "strong",
  environmentalFactors: ["wind", "outdoor"],
  audioQuality: "degraded_breathing",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Breathing patterns indicate active cardio session
- "Mile 3", "pace", "heart rate" are structured running metrics
- "probably" indicates user uncertainty (lower confidence on HR)
- "feeling strong" is qualitative RPE data

**Classification Flow:**
1. Activity detection: breathing + "mile" + "pace" = running workout
2. Structured extraction: mile number, pace time, heart rate
3. User uncertainty ("probably") reduces HR confidence to 0.7
4. Qualitative sentiment mapped to perceived exertion
5. Breathing/wind patterns logged for audio model training

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 15, // Workout checkpoint
  activeLoggingBonus: 10, // Logged while exercising
  streakMaintained: true,
  totalXP: 25,
  feedbackMessage: "Mile 3 logged! 7:42 pace 🏃 Keep crushing it."
};
```

#### 5. Architecture Solution

```
Voice Input → Breathing Pattern Filter → STT
     ↓
Activity Context Detector → "Active cardio session"
     ↓
Metric Extractor → Mile, pace, HR
     ↓
Confidence Adjuster → User uncertainty markers
     ↓
Workout Entry Builder → With environmental tags
```

**Optimizer Accommodation:** System can sync with connected wearable for authoritative HR data, overriding voice-logged estimate.

---

### UC-VOI-006: Restaurant with Dishes Clanking and Conversation

**Persona:** Reflector (Casey)

#### 1. User Phrase / Scenario

Casey is at dinner with friends, wants to capture a meaningful moment without being antisocial. Speaks briefly and quietly:

**Voice Input (as transcribed):**
> "[dishes clanking] Good conversation about [laughter nearby] about purpose and meaning [friend's voice in background] feeling connected and grateful"

**Voice Variations:**
- "Dinner with [background chatter] friends... meaningful talk"
- "[restaurant noise] Grateful moment with [clinking glasses] close friends"
- "Just want to note [ambient noise] feeling really present right now"

#### 2. Data Model Mapping

```typescript
const journalEntry: JournalEntry = {
  id: "jrn_uuid_002",
  entityType: "journal",
  entryType: "moment_capture",
  themes: ["connection", "gratitude", "presence", "meaning"],
  socialContext: "friends_dinner",
  emotionalTone: "grateful_connected",
  briefCapture: true,
  rawPhrase: "Good conversation about purpose and meaning feeling connected and grateful",
  expandLaterPrompt: true,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Social environment: laughter, conversation, restaurant sounds
- Reflective vocabulary: "purpose", "meaning", "grateful", "connected"
- Brief capture intent: no detailed content, just emotional markers
- Presence focus: "feeling connected", "right now"

**Classification Flow:**
1. Context: social gathering (multiple voices detected)
2. Entry type: "moment capture" not full reflection
3. Extract emotional themes for later expansion
4. Flag for evening reflection prompt
5. Keep entry brief—Casey will want to journal properly later

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 8, // Quick capture
  presenceBonus: 5, // Logged a meaningful moment
  socialContextBonus: 3, // Captured connection
  streakMaintained: true,
  totalXP: 16,
  feedbackMessage: "Moment captured ✨ Expand in tonight's reflection if you'd like."
};
```

#### 5. Architecture Solution

```
Voice Input → Social Context Detector → STT
     ↓
Brief Capture Mode → Minimal processing
     ↓
Theme Extractor → Emotional keywords only
     ↓
Expand Later Scheduler → Evening prompt
     ↓
Minimal UI Notification → Non-intrusive confirmation
```

**Reflector Accommodation:** System knows Casey values presence; doesn't demand details in the moment.

---

### UC-VOI-007: Home with Children Interrupting

**Persona:** Dabbler (Jordan)

#### 1. User Phrase / Scenario

Jordan is trying to log their day while their kids demand attention:

**Voice Input (as transcribed):**
> "Today I ate [child: 'Mommy!'] yes honey one second [child crying] okay so lunch was [child: 'I want juice!'] um a sandwich and..."

**Voice Variations:**
- "Had breakfast [kid screaming] hold on sweetie [pause] okay eggs and toast"
- "Trying to log [child interrupting] just a minute baby [long pause] ...where was I"
- "Food today was [children fighting in background] basically whatever I could grab"

#### 2. Data Model Mapping

```typescript
const nutritionEntry: NutritionEntry = {
  id: "nut_uuid_002",
  entityType: "nutrition",
  mealType: "lunch",
  items: [
    { name: "sandwich", confidence: 0.80 }
  ],
  incomplete: true,
  interruptionContext: "childcare",
  captureAttempted: true,
  timestamp: Date.now()
};

const contextNote: ContextNote = {
  id: "ctx_uuid_001",
  type: "life_context",
  note: "Parenting during log attempt",
  empathyFlag: true
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Child voices detected (different pitch profiles)
- Caregiver phrases: "yes honey", "one second", "hold on sweetie"
- Fragmented adult speech with recovery attempts
- Self-interruption: "um", "where was I"

**Classification Flow:**
1. Detect multi-speaker audio with child voice profiles
2. Filter to primary adult speaker segments
3. Reconstruct fragmented intent: "lunch was... a sandwich"
4. Mark entry as incomplete with empathetic context
5. Offer async completion: "Finish this entry later?"

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 8, // Partial log
  attemptBonus: 5, // Effort acknowledged
  noPenalty: true, // Interrupted by life
  streakMaintained: true, // Attempt counts
  totalXP: 13,
  feedbackMessage: "Got it—sandwich for lunch! Add more whenever you can 🙂"
};
```

#### 5. Architecture Solution

```
Voice Input → Speaker Diarization → Adult Speaker Isolation
     ↓
Interruption Detector → "Childcare context"
     ↓
Fragment Reconstructor → Best-effort parsing
     ↓
Empathetic Entry Builder → Partial entry with context
     ↓
Async Completion Queue → Gentle reminder later
```

**Design Philosophy:** The app understands real life. Parenting interruptions are honored, not penalized.

---

### UC-VOI-008: Bathroom Echo and Fan Noise

**Persona:** Biohacker (Sam)

#### 1. User Phrase / Scenario

Sam is in the bathroom, logging morning biometrics. Exhaust fan runs and tiles create echo:

**Voice Input (as transcribed):**
> "[echo] Morning weight 172.4 [fan noise] blood pressure 118 over 76 [reverb] resting heart rate 52 [fan] glucose was 94"

**Voice Variations:**
- "[echoey] Scale says 172 point 4 [fan hum] BP good, HR 52"
- "Bathroom readings [reverb] 172.4 pounds 118/76 [fan] 52 BPM fasting glucose 94"
- "[bathroom acoustics] Weight BP HR glucose [fan noise] 172 118 76 52 94"

#### 2. Data Model Mapping

```typescript
const biometricsBatch: BiometricEntry[] = [
  {
    id: "bio_uuid_001",
    metric: "weight",
    value: 172.4,
    unit: "lbs",
    context: "morning_fasted",
    timestamp: Date.now()
  },
  {
    id: "bio_uuid_002",
    metric: "blood_pressure",
    systolic: 118,
    diastolic: 76,
    context: "morning_resting",
    timestamp: Date.now()
  },
  {
    id: "bio_uuid_003",
    metric: "resting_heart_rate",
    value: 52,
    unit: "bpm",
    context: "morning",
    timestamp: Date.now()
  },
  {
    id: "bio_uuid_004",
    metric: "blood_glucose",
    value: 94,
    unit: "mg/dL",
    context: "fasting",
    timestamp: Date.now()
  }
];
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Bathroom acoustic signature (reverb + fan)
- Morning context + biometric vocabulary
- Dense numeric sequence: 172.4, 118, 76, 52, 94
- Biohacker persona: expects multi-metric morning dumps

**Classification Flow:**
1. Acoustic environment: bathroom (reverb profile)
2. Context inference: morning + bathroom = biometric routine
3. Number sequence parsing with metric binding:
   - 172.4 → weight (decimal suggests scale)
   - 118/76 → blood pressure (X over Y pattern)
   - 52 → heart rate (typical RHR range)
   - 94 → glucose (fasting context)
4. Batch creation with unified morning timestamp

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Base entry
  batchBonus: 15, // 4 metrics in one voice entry
  consistencyBonus: 5, // Daily morning routine
  streakMaintained: true,
  totalXP: 30,
  feedbackMessage: "Morning vitals logged! 4 metrics captured. 📊"
};
```

#### 5. Architecture Solution

```
Voice Input → Echo Cancellation → Fan Noise Reduction → STT
     ↓
Biometric Batch Detector → "Morning routine dump"
     ↓
Multi-Metric Parser → Binds numbers to metric types
     ↓
Batch Entry Creator → Atomic multi-entry save
     ↓
Dashboard Update → Morning vitals card populated
```

**Biohacker Accommodation:** System expects dense, multi-metric voice entries and parses efficiently.

---

### UC-VOI-009: Walking in Wind with Intermittent Coverage

**Persona:** Optimizer (Alex)

#### 1. User Phrase / Scenario

Alex is walking to a meeting, wind gusting intermittently, cellular connectivity spotty:

**Voice Input (as transcribed with gaps):**
> "10:30 meeting prep [wind gust - audio drops] [reconnecting] stress level 6 need to review [wind] the quarterly [signal lost] ...numbers before..."

**Voice Variations:**
- "Meeting in 30 [wind] stress is [connection drop] ...moderate..."
- "Walking to [audio cuts] quarterly review [wind] feeling [gap] prepared mostly"
- "[wind] Pre-meeting [signal issues] 6 stress [buffering] quarterly deck"

#### 2. Data Model Mapping

```typescript
const eventEntry: EventEntry = {
  id: "evt_uuid_001",
  entityType: "event",
  eventType: "meeting",
  eventName: "quarterly_review",
  scheduledTime: "10:30",
  status: "upcoming",
  timestamp: Date.now()
};

const moodEntry: MoodEntry = {
  id: "mood_uuid_003",
  entityType: "mood",
  stressLevel: 6,
  context: "pre_meeting",
  confidence: 0.75,
  timestamp: Date.now()
};

const taskEntry: TaskEntry = {
  id: "tsk_uuid_001",
  entityType: "task",
  action: "review",
  subject: "quarterly_numbers",
  status: "pending",
  urgency: "high",
  incomplete: true, // Sentence was cut off
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Audio drop markers from STT
- Connectivity status from system
- Partial sentences with clear intent
- Time reference + meeting vocabulary
- Stress level explicitly stated

**Classification Flow:**
1. Detect intermittent audio/connectivity issues
2. Parse complete fragments independently
3. Infer missing content from partial phrases
4. Create entries with appropriate confidence levels
5. Queue: "Your walking note got choppy. Review your meeting prep entry?"

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 8, // Partial capture
  mobilityBonus: 5, // Logged while walking
  multiEntityBonus: 5, // Event + mood + task
  streakMaintained: true,
  totalXP: 18,
  feedbackMessage: "Captured your meeting prep context. Some gaps—want to fill in?"
};
```

#### 5. Architecture Solution

```
Voice Input → Connectivity Monitor → Buffered STT
     ↓
Gap Detector → Marks audio drops vs silence
     ↓
Fragment Parser → Independent segment analysis
     ↓
Best-Effort Entity Builder → Partial entries OK
     ↓
Sync Queue → Retries failed segments when connected
```

**Offline Handling:** Audio buffered locally during drops; re-synced when connectivity returns.

---

### UC-VOI-010: Late Night Quiet with Sleepy Speech

**Persona:** Reflector (Casey)

#### 1. User Phrase / Scenario

Casey is in bed, very sleepy, trying to capture a thought before sleep takes them:

**Voice Input (as transcribed):**
> "[very slow, slurred] Today was... [long pause] ...really meaningful because... [yawn] ...I finally understood what... [trailing off] ...Mom meant about..."

**Voice Variations:**
- "[drowsy] Good day... [yawn] meaningful... [mumbled] ...something about mom..."
- "[half asleep] Want to remember... [long pause] ...this feeling... [inaudible]"
- "[exhausted] Capture this... [slowing speech] ...important... [silence]"

#### 2. Data Model Mapping

```typescript
const journalEntry: JournalEntry = {
  id: "jrn_uuid_003",
  entityType: "journal",
  entryType: "sleepy_capture",
  rawTranscript: "Today was really meaningful because I finally understood what Mom meant about",
  completionStatus: "incomplete",
  emotionalMarkers: ["meaningful", "family_insight", "understanding"],
  captureContext: "bedtime_drowsy",
  continuePrompt: true,
  suggestedFollowUp: "morning",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Speech rate < 50% of user's baseline
- Yawn audio signatures
- Long pauses (>3 seconds)
- Trailing off (volume decay + incomplete sentence)
- Time of day: late night

**Classification Flow:**
1. Sleepy speech detector activates
2. Capture mode: preserve what's said, don't push for more
3. Incomplete sentence detection: ends mid-thought
4. Schedule morning prompt to continue reflection
5. No questions, no follow-ups tonight

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Capture attempt
  bedtimeBonus: 5, // End-of-day reflection effort
  noPressure: true, // Incomplete is fine
  streakMaintained: true,
  totalXP: 15,
  feedbackMessage: null // Silent capture; message in morning
};
```

#### 5. Architecture Solution

```
Voice Input → Drowsiness Detector → Gentle STT
     ↓
Incomplete Thought Detector → "Trailing off"
     ↓
Minimal Processing → Store as-is
     ↓
Morning Prompt Scheduler → "Continue last night's thought?"
     ↓
Silent Confirmation → No audio/vibration feedback
```

**Reflector Accommodation:** Casey gets space to sleep. The thought is captured. Tomorrow they can continue.

---

### UC-VOI-011: Cooking with Timer Beeps and Sizzling

**Persona:** Dabbler (Jordan)

#### 1. User Phrase / Scenario

Jordan is cooking dinner and decides to log what they're eating. Kitchen timer goes off mid-sentence:

**Voice Input (as transcribed):**
> "Making stir fry for dinner [sizzling sounds] got chicken and [TIMER BEEPING] oh hold on [pause] okay vegetables and rice [oil splattering] pretty healthy I think"

**Voice Variations:**
- "Dinner is [sizzling] stir fry [beep beep beep] wait [pause] chicken veggies rice"
- "Cooking tonight [loud sizzle] healthy stuff [timer alarm] one sec... [pause] stir fry"
- "[kitchen noise] Stir fry happening [timer] hang on... [pause] chicken vegetables rice done"

#### 2. Data Model Mapping

```typescript
const nutritionEntry: NutritionEntry = {
  id: "nut_uuid_003",
  entityType: "nutrition",
  mealType: "dinner",
  mealStyle: "home_cooked",
  items: [
    { name: "chicken", category: "protein", confidence: 0.92 },
    { name: "vegetables", category: "vegetables", confidence: 0.90 },
    { name: "rice", category: "carbohydrate", confidence: 0.95 }
  ],
  preparationMethod: "stir_fry",
  healthRating: { userPerception: "healthy", confidence: 0.85 },
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Kitchen audio signatures: sizzling, timer beeps
- Cooking vocabulary: "making", "cooking", "stir fry"
- Self-assessment: "pretty healthy I think"
- Food items clearly listed after interruption recovery

**Classification Flow:**
1. Kitchen context detected (audio signatures)
2. Interruption recovery: user says "hold on", "okay", then continues
3. Food items extracted: chicken, vegetables, rice
4. Cooking method: stir fry
5. User health perception captured but not imposed

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Meal log
  homeCookedBonus: 5, // Prepared own food
  streakMaintained: true,
  totalXP: 15,
  feedbackMessage: "Stir fry logged! 🍳 Home cooking FTW."
};
```

#### 5. Architecture Solution

```
Voice Input → Kitchen Noise Filter → Timer Detection
     ↓
Interruption Handler → User pause/resume pattern
     ↓
Food Item Extractor → Ingredients + method
     ↓
Nutrition Entry Builder → With home-cooked flag
     ↓
Optional: Photo prompt if Jordan wants to snap the dish
```

---

### UC-VOI-012: Elevator with Signal Loss and Door Chimes

**Persona:** Privacy-First (Morgan)

#### 1. User Phrase / Scenario

Morgan steps into an elevator, quickly tries to finish a voice entry before losing signal:

**Voice Input (as transcribed):**
> "Quick note about [elevator chime] that meeting was stressful because [signal degrades] ...the client kept... [signal lost]"

**Voice Variations:**
- "[elevator ding] Fast note stress meeting [signal fading] client issues..."
- "Before I lose signal [chime] meeting stress [cutting out] ...difficult client..."
- "[door closing sound] Noting: stressful meeting [signal drops]"

#### 2. Data Model Mapping

```typescript
const journalEntry: JournalEntry = {
  id: "jrn_uuid_004",
  entityType: "journal",
  entryType: "quick_note",
  rawContent: "meeting was stressful because the client kept",
  themes: ["work_stress", "client_difficulty"],
  completionStatus: "signal_interrupted",
  queuedForCompletion: true,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- "Quick note" indicates urgency
- Signal degradation pattern (audio artifacts → dropout)
- Incomplete sentence with clear subject
- Elevator chimes as context markers

**Classification Flow:**
1. Urgency detection: "quick note", "before I lose signal"
2. Capture as much as possible before dropout
3. Store partial with "signal_interrupted" status
4. Queue completion prompt for when signal returns
5. Privacy mode: don't retry transmission from elevator

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 8, // Partial capture
  urgencyBonus: 3, // Captured before signal loss
  streakMaintained: true,
  totalXP: 11,
  feedbackMessage: "Got what I could before the elevator 📶 Finish later?"
};
```

#### 5. Architecture Solution

```
Voice Input → Signal Monitor → Priority Buffer
     ↓
Urgency Detector → Fast-path processing
     ↓
Partial Save → Local storage before signal loss
     ↓
Signal Return Detector → Completion prompt
     ↓
Morgan's Setting: No auto-retry on reconnect (manual only)
```

**Privacy Consideration:** Morgan's settings prevent automatic retry on signal return; they control when to complete.

---

## Section 2: Linguistic Edge Cases (UC-VOI-013 through UC-VOI-027)

---

### UC-VOI-013: Mid-Sentence Correction

**Persona:** Optimizer (Alex)

#### 1. User Phrase / Scenario

Alex starts logging but makes an error and corrects mid-stream:

**Voice Input:**
> "Sleep was 7 hours no wait I mean 7.5 hours and quality was 8 out of 10"

**Voice Variations:**
- "I slept 6... no, 7 hours last night, quality 8"
- "HRV this morning was 58 actually no scratch that it was 65"
- "Weight 175 wait no the scale said 174.5"

#### 2. Data Model Mapping

```typescript
const sleepEntry: SleepEntry = {
  id: "slp_uuid_001",
  entityType: "sleep",
  duration: { value: 7.5, unit: "hours" }, // Corrected value
  quality: { value: 8, scale: 10 },
  correctionApplied: true,
  originalValue: 7,
  correctedTo: 7.5,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Correction phrases: "no wait", "I mean", "actually no", "scratch that", "wait no"
- Pattern: [value] [correction phrase] [new value]
- Final value takes precedence

**Classification Flow:**
1. Detect correction phrase in transcript
2. Identify value before correction phrase
3. Identify value after correction phrase
4. Use post-correction value as authoritative
5. Log correction event for parsing model improvement

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Sleep log
  accuracyBonus: 2, // Self-corrected for precision
  streakMaintained: true,
  totalXP: 12,
  feedbackMessage: "Sleep logged: 7.5 hours, quality 8/10 ✓"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Correction Phrase Detector
     ↓
Value Before/After Extractor
     ↓
Correction Resolution → Use final value
     ↓
Entry Builder → With correction metadata
     ↓
Model Training → Log correction patterns
```

---

### UC-VOI-014: Restarting a Thought from Beginning

**Persona:** Neurodivergent (Riley)

#### 1. User Phrase / Scenario

Riley starts an entry, loses their train of thought, and restarts from the beginning:

**Voice Input:**
> "So today I need to track my... um... wait let me start over. Okay so I took my meds at 8am and then had breakfast which was eggs and I'm feeling pretty focused right now"

**Voice Variations:**
- "I want to log... hmm... actually never mind, starting again: breakfast was at 8, eggs, coffee, feeling good"
- "Let me try that again from the top. Morning routine complete, meds taken, energy is high"
- "Okay that was messy let me just say it clearly: 8am meds, eggs for breakfast, focused mood"

#### 2. Data Model Mapping

```typescript
const medicationEntry: MedicationEntry = {
  id: "med_uuid_001",
  entityType: "medication",
  timeLogged: "8:00 AM",
  status: "taken",
  timestamp: Date.now()
};

const nutritionEntry: NutritionEntry = {
  id: "nut_uuid_004",
  entityType: "nutrition",
  mealType: "breakfast",
  items: [{ name: "eggs", confidence: 0.95 }],
  timestamp: Date.now()
};

const moodEntry: MoodEntry = {
  id: "mood_uuid_004",
  entityType: "mood",
  focusLevel: "high",
  overallState: "positive",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Restart phrases: "let me start over", "starting again", "never mind", "try that again", "from the top"
- Abandoned false start + clear restart
- Post-restart content is authoritative

**Classification Flow:**
1. Detect restart phrase
2. Discard everything before restart phrase
3. Parse only post-restart content
4. Multiple entities extracted from clean restart
5. No penalty or confusion for the false start

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Meds log
  nutritionXP: 8, // Breakfast
  moodXP: 5, // Focus tracking
  restartHandled: true, // No penalty
  streakMaintained: true,
  totalXP: 23,
  feedbackMessage: "Morning logged! Meds ✓ Breakfast ✓ Feeling focused ✓"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Restart Phrase Detector
     ↓
Content Splitter → Before/After restart
     ↓
Discard Pre-Restart Content
     ↓
Parse Post-Restart → Multi-entity extraction
     ↓
Celebrate Clean Entry → No judgment on false start
```

**Neurodivergent Accommodation:** ADHD often means false starts. The system gracefully handles restarts without making Riley feel bad.

---

### UC-VOI-015: Code-Switching Between Languages

**Persona:** Dabbler (Jordan)

#### 1. User Phrase / Scenario

Jordan is bilingual (English/Spanish) and naturally mixes languages:

**Voice Input:**
> "Breakfast fue huevos con toast, and I'm feeling muy bien today, like an 8 out of 10"

**Voice Variations:**
- "Comí lunch at noon, sandwich y una manzana"
- "Feeling tired, muy cansado, maybe like a 4 energy-wise"
- "Esta mañana I woke up at 7, desayuno was cereal"

#### 2. Data Model Mapping

```typescript
const nutritionEntry: NutritionEntry = {
  id: "nut_uuid_005",
  entityType: "nutrition",
  mealType: "breakfast", // Inferred from "breakfast fue"
  items: [
    { name: "eggs", originalToken: "huevos", confidence: 0.95 },
    { name: "toast", confidence: 0.95 }
  ],
  languagesDetected: ["en", "es"],
  timestamp: Date.now()
};

const moodEntry: MoodEntry = {
  id: "mood_uuid_005",
  entityType: "mood",
  overallWellbeing: 8,
  scale: 10,
  sentiment: "positive",
  originalPhrase: "muy bien",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Mixed language tokens in single utterance
- "fue" (Spanish: was), "muy bien" (very good), "muy cansado" (very tired)
- Context helps resolve: "huevos" in breakfast context = eggs

**Classification Flow:**
1. Language detection per token
2. Unified STT handles code-switching
3. Translation layer: huevos → eggs, muy bien → very well
4. Entity extraction works across languages
5. User's original phrasing preserved in metadata

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Breakfast log
  moodBonus: 5, // Mood tracking
  multilingualSupport: true, // Seamless experience
  streakMaintained: true,
  totalXP: 15,
  feedbackMessage: "Breakfast y mood logged! Feeling muy bien 😊"
};
```

#### 5. Architecture Solution

```
Voice Input → Multilingual STT → Per-Token Language ID
     ↓
Translation Layer → Normalize to canonical entities
     ↓
Preserve Original → Metadata stores original tokens
     ↓
Entity Extraction → Works on normalized + original
     ↓
Response Generation → Can mirror user's language mix
```

**Bilingual Accommodation:** Jordan's natural code-switching is supported, not corrected.

---

### UC-VOI-016: Stuttering and Repetition

**Persona:** Neurodivergent (Riley)

#### 1. User Phrase / Scenario

Riley sometimes stutters, especially when tired or stressed:

**Voice Input:**
> "I-I-I took my my meds this morning at at 8 and and then I I had breakfast which was um um eggs"

**Voice Variations:**
- "The the workout was was good, I-I did 30 minutes on on the bike"
- "M-m-mood is is probably like a a 6 today"
- "I I need to to remember that that I I felt anxious"

#### 2. Data Model Mapping

```typescript
const medicationEntry: MedicationEntry = {
  id: "med_uuid_002",
  entityType: "medication",
  timeLogged: "8:00 AM",
  status: "taken",
  timestamp: Date.now()
};

const nutritionEntry: NutritionEntry = {
  id: "nut_uuid_006",
  entityType: "nutrition",
  mealType: "breakfast",
  items: [{ name: "eggs", confidence: 0.95 }],
  timestamp: Date.now()
};

// Internal note: stutter patterns NOT stored or analyzed
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Repeated words: "I-I-I", "my my", "at at"
- Repeated syllables: "M-m-mood"
- Filler repetitions: "um um"
- Pattern: [word][repeated word] or [syllable]-[syllable]-[word]

**Classification Flow:**
1. Stutter detection filter
2. Collapse repetitions to single tokens
3. Clean transcript: "I took my meds this morning at 8 and then I had breakfast which was eggs"
4. Parse cleaned transcript normally
5. **Critical: Do not log or analyze stutter patterns** (privacy, non-stigmatizing)

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Meds log
  nutritionXP: 8, // Breakfast
  noFluencyPenalty: true, // Speech patterns never affect XP
  streakMaintained: true,
  totalXP: 18,
  feedbackMessage: "Meds and breakfast logged! ✓"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Stutter/Repetition Filter
     ↓
Token Deduplication → Collapse repeated tokens
     ↓
Clean Transcript → Normal parsing
     ↓
Privacy: Stutter patterns never stored or analyzed
     ↓
Response: Never acknowledges speech patterns
```

**Neurodivergent Accommodation:** Speech disfluencies are silently normalized. The system never comments on, logs, or draws attention to stuttering. Riley just gets their content captured.

---

### UC-VOI-017: Trailing Off and Unfinished Thoughts

**Persona:** Reflector (Casey)

#### 1. User Phrase / Scenario

Casey often thinks out loud and trails off as thoughts form:

**Voice Input:**
> "Today I'm thinking about what it means to... I don't know... maybe the way that relationships can... hmm... something about how we show up for..."

**Voice Variations:**
- "I've been feeling like there's something about... like when you... and then it's just..."
- "The thing about today was... well... it made me wonder if..."
- "Grateful for... you know... the way that things can sometimes just..."

#### 2. Data Model Mapping

```typescript
const journalEntry: JournalEntry = {
  id: "jrn_uuid_005",
  entityType: "journal",
  entryType: "emerging_thought",
  capturedFragments: [
    "what it means to",
    "the way that relationships can",
    "how we show up for"
  ],
  themes: ["relationships", "meaning", "presence"],
  thoughtStatus: "forming",
  inviteContinuation: true,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Ellipsis patterns: "..." in speech (pauses/trailing)
- Hedge phrases: "I don't know", "maybe", "something about", "you know"
- Incomplete dependent clauses
- Thematic vocabulary despite lack of conclusion

**Classification Flow:**
1. Recognize "forming thought" pattern (Casey's persona typical)
2. Do NOT force completion or ask "did you mean...?"
3. Extract thematic fragments for reflection prompts
4. Store as "emerging thought" entry type
5. Offer gentle continuation: "Continue this thought?" (optional)

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Reflection capture
  thoughtFormingBonus: 5, // Values the process
  noCompletionRequired: true,
  streakMaintained: true,
  totalXP: 15,
  feedbackMessage: "Thought captured. Take your time with it. ✨"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Trailing Off Detector
     ↓
Fragment Extractor → Meaningful pieces
     ↓
Theme Analyzer → Core concepts
     ↓
Emerging Thought Entry → Special entry type
     ↓
Optional Continuation Prompt → Later, gently
```

**Reflector Accommodation:** Casey's processing style is honored. Half-formed thoughts are valuable data, not errors.

---

### UC-VOI-018: Sarcasm and Irony

**Persona:** Dabbler (Jordan)

#### 1. User Phrase / Scenario

Jordan uses sarcasm when logging frustrating experiences:

**Voice Input:**
> "Oh yeah great day today, just LOVED sitting in traffic for two hours, feeling absolutely fantastic about that"

**Voice Variations:**
- "Wonderful, the meeting ran an hour over, so productive"
- "Just had the BEST burger, really hit the spot (it was actually terrible)"
- "Slept like a baby last night, meaning I woke up crying every two hours"

#### 2. Data Model Mapping

```typescript
const moodEntry: MoodEntry = {
  id: "mood_uuid_006",
  entityType: "mood",
  detectedSarcasm: true,
  surfaceSentiment: "positive",
  interpretedSentiment: "negative",
  stressors: ["traffic", "time_loss"],
  emotionalTone: "frustrated",
  originalPhrase: "just LOVED sitting in traffic for two hours",
  timestamp: Date.now()
};

const eventEntry: EventEntry = {
  id: "evt_uuid_002",
  entityType: "event",
  eventType: "commute",
  duration: { value: 2, unit: "hours" },
  quality: "frustrating",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Prosodic cues: emphasis on words like "LOVED", "BEST", "fantastic"
- Contradiction indicators: positive words + negative context
- Sarcasm markers: "Oh yeah", "just LOVED", exaggerated positivity
- Explicit correction: "(it was actually terrible)"

**Classification Flow:**
1. Sarcasm detector analyzes tone + content mismatch
2. Emphasized words flagged (STT stress detection)
3. Context analysis: "sitting in traffic 2 hours" = negative
4. Invert surface sentiment for actual mood
5. Ask confirmation only if confidence < 0.7: "Sounds frustrating—that right?"

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 8, // Mood log
  eventBonus: 5, // Captured event
  sarcasmHandled: true, // Understood the tone
  streakMaintained: true,
  totalXP: 13,
  feedbackMessage: "Traffic logged. 2 hours—that's rough. 🚗"
};
```

#### 5. Architecture Solution

```
Voice Input → STT (with prosodic features) → Sarcasm Detector
     ↓
Sentiment Inversion Layer → Surface vs actual
     ↓
Context Validator → Does tone match content?
     ↓
Appropriate Response Generator → Empathetic, not cheerful
     ↓
Entry Builder → With interpreted sentiment
```

**Design Note:** Never respond to sarcasm with surface-level positivity. Match the user's actual emotional state.

---

### UC-VOI-019: Mumbling and Low Clarity Speech

**Persona:** Privacy-First (Morgan)

#### 1. User Phrase / Scenario

Morgan mumbles intentionally for privacy, or speaks indistinctly when tired:

**Voice Input (as transcribed with uncertainty):**
> "[low confidence: 0.45] Something about work stress [unclear] maybe need to [unintelligible] more breaks"

**Voice Variations:**
- "[mumbled] Tracking the... thing... about... sleep..."
- "[indistinct] Personal note... stress... family..."
- "[very quiet and unclear] Log... mood... six maybe..."

#### 2. Data Model Mapping

```typescript
const uncertainEntry: UncertainEntry = {
  id: "unc_uuid_001",
  entityType: "uncertain",
  bestGuessType: "mood",
  possibleContent: {
    theme: "work_stress",
    actionMentioned: "breaks",
    confidence: 0.45
  },
  clarificationNeeded: true,
  transcriptQuality: "low",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Overall transcription confidence < 0.5
- Multiple "[unclear]" or "[unintelligible]" markers
- Fragmentary phrases without clear structure
- Word boundaries ambiguous

**Classification Flow:**
1. Low confidence threshold triggered
2. Extract whatever high-confidence tokens exist
3. Do NOT guess or interpolate missing content
4. Present back to user: "I caught 'work stress' and 'breaks'—want to clarify?"
5. Offer typing alternative for Morgan's privacy preference

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 0, // Pending clarification
  attemptCredit: 3, // Recognized they tried
  streakProtection: true, // Unclear entry doesn't break streak if clarified within 24h
  totalXP: 3,
  feedbackMessage: "Couldn't quite catch that. Tap to type or try again?"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Confidence Scoring
     ↓
Low Confidence Handler → Threshold check
     ↓
Token Extraction → High-confidence pieces only
     ↓
Clarification Request → Present fragments
     ↓
Alternative Input Offer → Text input option (Morgan's preference)
```

**Privacy-First Accommodation:** Morgan might be mumbling intentionally. Offer text input as alternative, don't push for clearer voice.

---

### UC-VOI-020: Accidental Recording and Cancellation

**Persona:** Optimizer (Alex)

#### 1. User Phrase / Scenario

Alex accidentally triggers voice input and tries to cancel:

**Voice Input:**
> "Wait no I didn't mean to— cancel stop recording delete that ignore this never mind cancel"

**Voice Variations:**
- "No no no stop cancel"
- "Oops wrong button delete cancel please"
- "Cancel voice entry stop recording"
- "[immediate] Discard"

#### 2. Data Model Mapping

```typescript
// NO entry created - cancellation successful

const cancellationLog: SystemLog = {
  eventType: "voice_cancellation",
  triggerPhrase: "cancel stop recording delete that",
  audioDiscarded: true,
  noEntryCreated: true,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Cancellation vocabulary: "cancel", "stop", "delete", "discard", "never mind", "ignore"
- Immediate cancellation intent: multiple cancel words in succession
- Negative framing: "didn't mean to", "wrong button"
- Urgency markers at start of recording

**Classification Flow:**
1. Priority intercept for cancellation phrases
2. Halt all parsing immediately
3. Discard audio buffer completely
4. Confirm cancellation to user
5. No analytics on cancelled content

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 0, // No entry
  streakUnaffected: true, // Cancellation is neutral
  totalXP: 0,
  feedbackMessage: "Cancelled ✓"
};
```

#### 5. Architecture Solution

```
Voice Input → Priority Cancellation Detector (first pass)
     ↓
If cancelled: Audio buffer → Immediate discard
     ↓
No STT processing on cancelled audio
     ↓
Brief confirmation: "Cancelled"
     ↓
Ready for next input
```

**Critical:** Cancellation must be fast and complete. User trusts their "no" is respected instantly.

---

### UC-VOI-021: Dictating While Reading/Quoting

**Persona:** Reflector (Casey)

#### 1. User Phrase / Scenario

Casey is reading a passage and quotes it while adding their reflection:

**Voice Input:**
> "That quote from Marcus Aurelius quote 'The happiness of your life depends on the quality of your thoughts' end quote really resonated with me today because I've been noticing how much my thoughts affect my mood"

**Voice Variations:**
- "Reading this line, quote 'be present' unquote, and it made me think about..."
- "Saw a quote: 'growth requires discomfort' and I felt that deeply"
- "The book says, and I'm paraphrasing, something about accepting what you can't control"

#### 2. Data Model Mapping

```typescript
const journalEntry: JournalEntry = {
  id: "jrn_uuid_006",
  entityType: "journal",
  entryType: "quote_reflection",
  quotedContent: {
    text: "The happiness of your life depends on the quality of your thoughts",
    attribution: "Marcus Aurelius",
    isExact: true
  },
  personalReflection: "really resonated with me today because I've been noticing how much my thoughts affect my mood",
  themes: ["stoicism", "thoughts_mood_connection", "self_awareness"],
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Quote markers: "quote", "'", "end quote", "unquote"
- Attribution patterns: "from [person]", "[book] says"
- Transition phrases: "resonated with me", "made me think", "I felt"
- Distinction between quoted and personal content

**Classification Flow:**
1. Detect quote boundary markers
2. Separate quoted content from personal reflection
3. Attempt attribution extraction
4. Preserve quote exactly (no corrections)
5. Process reflection normally for themes

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 12, // Deeper reflection
  quoteEngagementBonus: 5, // Engaging with wisdom
  personalConnectionBonus: 3, // Connecting to life
  streakMaintained: true,
  totalXP: 20,
  feedbackMessage: "Quote captured with your reflection. Meaningful entry 📚"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Quote Boundary Detector
     ↓
Content Separator → Quoted vs personal
     ↓
Attribution Extractor → Source identification
     ↓
Quote Preservation → Exact wording maintained
     ↓
Reflection Parser → Themes from personal content
```

**Reflector Accommodation:** Casey's engagement with wisdom literature is supported. Quotes are preserved exactly; reflections are parsed for meaning.

---

### UC-VOI-022: Self-Contradicting Statements

**Persona:** Neurodivergent (Riley)

#### 1. User Phrase / Scenario

Riley's thoughts evolve as they speak, leading to apparent contradictions:

**Voice Input:**
> "I slept well last night actually no I didn't really sleep well I kept waking up but I do feel rested somehow I guess maybe it's the quality not quantity thing"

**Voice Variations:**
- "Mood is good actually not good more like okay maybe actually it's complicated"
- "Ate healthy today wait no I had that cookie okay mostly healthy"
- "Energy is high well medium actually like a 6 wait more like a 5"

#### 2. Data Model Mapping

```typescript
const sleepEntry: SleepEntry = {
  id: "slp_uuid_002",
  entityType: "sleep",
  subjectiveQuality: "mixed",
  objectiveFactors: {
    wokeDuringNight: true,
    frequentWaking: true
  },
  morningFeeling: "rested",
  userInsight: "quality over quantity",
  evolutionCaptured: true,
  finalAssessment: "rested_despite_disruption",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Contradiction markers: "actually no", "wait no", "not really"
- Self-correction evolution: statement → negation → synthesis
- Final resolution often most accurate
- Meta-cognition: "I guess", "maybe it's", "it's complicated"

**Classification Flow:**
1. Detect evolving/contradicting statements
2. Track the evolution: initial → correction → synthesis
3. Privilege the synthesis/final statement
4. Capture nuance: "mixed" rather than forcing binary
5. Preserve the thinking process for Riley's reflection

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 12, // Complex entry
  selfAwarenessBonus: 5, // Recognized nuance
  nuanceCapturedBonus: 3, // Didn't oversimplify
  streakMaintained: true,
  totalXP: 20,
  feedbackMessage: "Sleep logged—it's nuanced and that's okay. Feeling rested is what matters 😌"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Contradiction Detector
     ↓
Evolution Tracker → Statement sequence analysis
     ↓
Synthesis Finder → Final reconciled position
     ↓
Nuance Preserving Entry → Not forced binary
     ↓
Riley-Friendly Response → Validates complexity
```

**Neurodivergent Accommodation:** ADHD and autism often involve complex internal states. Contradictions aren't errors—they're the brain processing in real-time.

---

### UC-VOI-023: Numeric Ambiguity (Times vs Quantities)

**Persona:** Biohacker (Sam)

#### 1. User Phrase / Scenario

Sam uses numbers that could mean different things:

**Voice Input:**
> "Did 3 sets of 8 for bench at 225 then 3 30-minute cardio sessions throughout the day heart rate was 145"

**Voice Variations:**
- "Took 2 200mg caffeine at 6" (2 doses of 200mg? 200mg at 6am?)
- "Sleep was 7 30 quality" (7:30 wake time? 7 hours, 3/10 quality?)
- "8 10 minute walks today" (8 walks of 10 min? 8-10 minute walks?)

#### 2. Data Model Mapping

```typescript
const workoutEntry: WorkoutEntry = {
  id: "wrk_uuid_003",
  entityType: "workout",
  exercises: [
    {
      name: "bench_press",
      sets: 3,
      reps: 8,
      weight: { value: 225, unit: "lbs" }
    }
  ],
  timestamp: Date.now()
};

const cardioEntry: CardioEntry = {
  id: "cardio_uuid_001",
  entityType: "cardio",
  sessions: 3,
  duration: { value: 30, unit: "minutes", perSession: true },
  heartRate: { value: 145, unit: "bpm" },
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- "X sets of Y" = clear structure
- "X Y-minute" = quantity + duration
- Adjacent numbers without clear relationship need context
- Workout domain vocabulary helps resolve

**Classification Flow:**
1. Domain context: workout → exercise vocabulary
2. Pattern matching: "sets of [reps]", "[N]-minute [activity]"
3. Unit inference: 225 in bench context = lbs, 145 = BPM
4. When truly ambiguous: ask Sam (he's precise)
5. Sam's historical patterns inform parsing

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 15, // Compound workout
  cardioBonus: 10, // Three sessions
  precisionBonus: 5, // Detailed logging
  streakMaintained: true,
  totalXP: 30,
  feedbackMessage: "Bench work + 90min total cardio logged 💪 HR peaked 145."
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Numeric Sequence Detector
     ↓
Pattern Matcher → Known structures (sets/reps, duration)
     ↓
Domain Context → Workout vocabulary
     ↓
Disambiguation Engine → With confidence scores
     ↓
If uncertain: Clarification for Sam → He'll appreciate precision
```

**Biohacker Accommodation:** Sam wants accurate data. When ambiguous, clarify rather than guess wrong.

---

### UC-VOI-024: Interrupted Recording Continued Later

**Persona:** Dabbler (Jordan)

#### 1. User Phrase / Scenario

Jordan's first recording is interrupted; they continue in a second recording:

**Voice Input (Recording 1):**
> "Okay so for lunch I had—" [phone call interrupts, recording ends]

**Voice Input (Recording 2, 2 minutes later):**
> "Sorry about that, continuing from before: I had a salad with chicken and for dinner I'm planning pasta"

**Voice Variations:**
- "Picking up where I left off: so yeah breakfast was eggs and toast"
- "As I was saying before that call: workout was 45 minutes on the bike"
- "Okay back to my entry: the meeting went well and I'm feeling good"

#### 2. Data Model Mapping

```typescript
const nutritionEntries: NutritionEntry[] = [
  {
    id: "nut_uuid_007",
    entityType: "nutrition",
    mealType: "lunch",
    items: [
      { name: "salad", confidence: 0.95 },
      { name: "chicken", confidence: 0.95 }
    ],
    timestamp: Date.now()
  },
  {
    id: "nut_uuid_008",
    entityType: "nutrition",
    mealType: "dinner",
    mealStatus: "planned",
    items: [
      { name: "pasta", confidence: 0.95 }
    ],
    timestamp: Date.now()
  }
];

const conversationLink: ConversationLink = {
  recording1: "rec_uuid_001",
  recording2: "rec_uuid_002",
  continuationDetected: true,
  gapDuration: 120 // seconds
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Continuation phrases: "continuing from before", "picking up where I left off", "as I was saying", "back to my entry"
- Recent interrupted recording in history
- Incomplete sentence in first recording
- Content continuity check

**Classification Flow:**
1. Detect continuation phrase in second recording
2. Look for recent incomplete recording (<10 minutes)
3. Link the two recordings conceptually
4. Parse continuation as completing first thought
5. Handle as unified entry with gap noted

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Lunch entry
  dinnerPlanBonus: 5, // Logged planned meal
  persistenceBonus: 3, // Came back to finish
  streakMaintained: true,
  totalXP: 18,
  feedbackMessage: "Lunch + dinner plan logged! Thanks for coming back to finish 🙂"
};
```

#### 5. Architecture Solution

```
Recording 2 → STT → Continuation Phrase Detector
     ↓
Recent Recording Lookup → Find incomplete (< 10 min old)
     ↓
Conceptual Link → Bridge the gap
     ↓
Unified Parse → Treat as single entry flow
     ↓
Friendly Acknowledgment → "Got it, continued from before"
```

**Dabbler Accommodation:** Jordan's life is full of interruptions. System gracefully handles split entries.

---

### UC-VOI-025: Voicing Uncertainty While Logging

**Persona:** Reflector (Casey)

#### 1. User Phrase / Scenario

Casey expresses uncertainty about their own experience while logging:

**Voice Input:**
> "I think I'm feeling grateful? Or maybe it's more like relief. I'm not sure. Today was either really good or I'm just tired. Mood is... somewhere between 6 and 8 probably."

**Voice Variations:**
- "Energy might be a 5 or maybe 7 hard to tell honestly"
- "I either slept well or I'm running on adrenaline one of the two"
- "Did I feel anxious today? Kind of? It's hard to say"

#### 2. Data Model Mapping

```typescript
const moodEntry: MoodEntry = {
  id: "mood_uuid_007",
  entityType: "mood",
  primary: "grateful_or_relief",
  certainty: "low",
  possibleStates: ["grateful", "relief", "tired"],
  numericRange: { min: 6, max: 8 },
  numericEstimate: 7, // Midpoint for tracking
  userExpressedUncertainty: true,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Uncertainty phrases: "I think", "maybe", "I'm not sure", "hard to tell", "probably"
- Range expressions: "between X and Y", "X or maybe Y", "somewhere around"
- Either/or constructions: "either... or..."
- Question-like statements: "Or maybe it's...?"

**Classification Flow:**
1. High uncertainty detected in self-assessment
2. Capture the ambivalence as data (not error)
3. Use range for numeric values
4. Record both possible states
5. Reflector's uncertainty is valuable introspection

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Mood log
  introspectionBonus: 5, // Exploring uncertainty
  honestyBonus: 3, // Not forcing certainty
  streakMaintained: true,
  totalXP: 18,
  feedbackMessage: "Mood captured with its nuance. Uncertainty is part of self-knowledge. ✨"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Uncertainty Marker Detector
     ↓
Ambivalence Parser → Both/and, either/or
     ↓
Range Extractor → Min/max for numerics
     ↓
Nuanced Entry Builder → Captures uncertainty as data
     ↓
Affirming Response → Validates the exploration
```

**Reflector Accommodation:** Casey's uncertainty isn't a bug—it's honest introspection. The system honors it.

---

### UC-VOI-026: Speaking While Eating

**Persona:** Dabbler (Jordan)

#### 1. User Phrase / Scenario

Jordan is logging food while actively eating:

**Voice Input (muffled and distorted):**
> "[chewing sounds] Mmm this pizza is [swallow] really good having [chewing] three slices I think [drinking] and a coke"

**Voice Variations:**
- "[mouth full] Eating [chewing] lunch now [swallow] burger and fries"
- "[sipping] Just had [food in mouth] my morning coffee [chewing] with a muffin"
- "[crunching] Snacking on [chewing] some chips [swallow] maybe like 20"

#### 2. Data Model Mapping

```typescript
const nutritionEntry: NutritionEntry = {
  id: "nut_uuid_009",
  entityType: "nutrition",
  mealType: "meal",
  items: [
    { name: "pizza", quantity: "3 slices", confidence: 0.85 },
    { name: "coke", confidence: 0.90 }
  ],
  loggedWhileEating: true,
  audioQuality: "eating_speech",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Eating audio signatures: chewing, swallowing, drinking
- Muffled speech patterns
- Food vocabulary coincident with eating sounds
- "Having", "eating", "snacking" + present tense

**Classification Flow:**
1. Eating sound detection (trained classifier)
2. Speech clarity reduction expected—lower confidence thresholds
3. Extract food items despite audio degradation
4. "I think" indicates user's own uncertainty about quantity
5. Accept approximate quantities gracefully

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Food log
  realTimeBonus: 3, // Logged in the moment
  streakMaintained: true,
  totalXP: 13,
  feedbackMessage: "Pizza logged! Enjoy your meal 🍕"
};
```

#### 5. Architecture Solution

```
Voice Input → Eating Sound Detector → Enhanced STT
     ↓
Muffled Speech Mode → Adjusted confidence thresholds
     ↓
Food Item Extractor → Priority on food vocabulary
     ↓
Approximate Quantity Handler → "3 slices" ≈ "a few slices"
     ↓
Non-judgmental Response → No comments on eating while talking
```

**Dabbler Accommodation:** Jordan logs when they remember—even mid-meal. That's exactly what we want.

---

### UC-VOI-027: Dictating Lists or Enumerations

**Persona:** Optimizer (Alex)

#### 1. User Phrase / Scenario

Alex dictates a structured list rapidly:

**Voice Input:**
> "Morning supplements list: vitamin D 5000 IU, omega-3 2 grams, magnesium glycinate 400mg, creatine 5g, and zinc 30mg. That's the stack."

**Voice Variations:**
- "Today's workout: bench 3x8, squats 4x6, rows 3x10, deadlift 1x5"
- "Meals today: breakfast oatmeal and eggs, lunch salad with salmon, dinner chicken and vegetables, snack protein bar"
- "Tasks completed: morning routine, workout, meal prep, work meeting, evening reading"

#### 2. Data Model Mapping

```typescript
const supplementStack: SupplementEntry[] = [
  { name: "vitamin_d", dose: 5000, unit: "IU" },
  { name: "omega_3", dose: 2, unit: "g" },
  { name: "magnesium_glycinate", dose: 400, unit: "mg" },
  { name: "creatine", dose: 5, unit: "g" },
  { name: "zinc", dose: 30, unit: "mg" }
];

const batchEntry: BatchEntry = {
  id: "batch_uuid_001",
  entityType: "supplement_batch",
  entries: supplementStack,
  stackName: "morning_stack",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- List-initiating phrase: "[X] list:", "Today's [X]:", "Items:"
- Enumeration with commas: "A, B, C, and D"
- Repeated structure: [name] [quantity] [unit], [name] [quantity] [unit]
- List-closing phrase: "That's the stack", "that's it", "done"

**Classification Flow:**
1. List structure detected from initiating phrase
2. Segment by commas and "and"
3. Parse each segment with same structure template
4. Batch create entries
5. Confirm count: "5 supplements logged"

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 5, // Per supplement
  batchBonus: 10, // Efficient multi-logging
  stackConsistencyBonus: 5, // Same stack as yesterday
  totalXP: 40, // 5×5 + 10 + 5
  feedbackMessage: "Morning stack logged! 5 supplements ✓"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → List Structure Detector
     ↓
Segment Splitter → Individual items
     ↓
Template Parser → [name] [dose] [unit]
     ↓
Batch Entry Creator → Atomic multi-create
     ↓
Confirmation with count → "5 supplements"
```

**Optimizer Accommodation:** Alex loves efficiency. Lists are parsed as lists, creating multiple entries from one voice input.

---

## Section 3: Emotional and Safety Edge Cases (UC-VOI-028 through UC-VOI-042)

---

### UC-VOI-028: Crisis Content Detection - Suicidal Ideation

**Persona:** All (Priority Override)

#### 1. User Phrase / Scenario

Any user expresses thoughts of self-harm:

**Voice Input:**
> "I don't want to be here anymore. What's the point of any of this. Everything would be easier if I just wasn't around."

**Voice Variations:**
- "I keep thinking about ending it all"
- "Nobody would care if I disappeared"
- "I can't take this anymore I just want it to stop"
- "I've been thinking about how I could hurt myself"

#### 2. Data Model Mapping

```typescript
// CRITICAL: No standard entry created
// Safety protocol initiated

const crisisAlert: CrisisProtocol = {
  id: "crisis_uuid_001",
  severity: "high",
  detectedIndicators: ["passive_suicidal_ideation", "hopelessness"],
  userNotified: true,
  resourcesPresented: true,
  entryCreated: false, // Do NOT create journal entry
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Suicidal ideation phrases: "don't want to be here", "ending it all", "what's the point"
- Self-harm language: "hurt myself", "disappear", "wouldn't care if I"
- Hopelessness markers: "can't take it", "everything would be easier"
- Persistent negative framing without hope elements

**Classification Flow:**
1. **PRIORITY OVERRIDE:** Crisis language detected
2. Halt all normal parsing
3. Do NOT create standard journal/mood entry
4. Initiate crisis response protocol
5. Present resources immediately

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  // GAMIFICATION SUSPENDED
  disabled: true,
  reason: "crisis_protocol_active"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → PRIORITY: Crisis Phrase Detector
     ↓
Crisis Protocol → Immediate activation
     ↓
Resource Presentation:
  "I hear you. Your life matters.

   988 Suicide & Crisis Lifeline: Call or text 988
   Crisis Text Line: Text HOME to 741741

   Would you like me to help you reach out to someone?"
     ↓
Optional: Contact trusted person (if configured)
     ↓
Follow-up check-in scheduled (if user consents)
```

**Critical Design:**
- No badges, XP, or gamification language
- Resources presented calmly, directly
- Human support emphasized over app features
- Entry NOT created (avoid "logging" crisis as data point)
- If user has emergency contact configured, offer to notify

---

### UC-VOI-029: Distress Without Crisis (Intense Emotions)

**Persona:** Reflector (Casey)

#### 1. User Phrase / Scenario

Casey is processing intense grief but not in crisis:

**Voice Input:**
> "I'm so devastated about losing my grandmother. The grief is overwhelming and I keep crying. I don't know how to get through this. I miss her so much it physically hurts."

**Voice Variations:**
- "This breakup is destroying me. I'm in so much pain."
- "I failed the exam I studied so hard for. I feel completely worthless."
- "The anxiety today is absolutely crushing me I can barely breathe"

#### 2. Data Model Mapping

```typescript
const journalEntry: JournalEntry = {
  id: "jrn_uuid_007",
  entityType: "journal",
  entryType: "emotional_processing",
  emotionalIntensity: "high",
  emotions: ["grief", "devastation", "loss"],
  contextDetected: "loss_of_loved_one",
  supportsOffered: true, // Gentle, not clinical
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Intense emotional language: "devastating", "overwhelming", "destroying"
- Context clues: "losing my grandmother", "breakup", "failed exam"
- Physical manifestation: "physically hurts", "barely breathe"
- BUT no self-harm or hopelessness language

**Classification Flow:**
1. High emotional intensity detected
2. Crisis screen: NOT triggered (no self-harm indicators)
3. Context identification: grief, loss, failure
4. Normal journal entry created with "high intensity" flag
5. Gentle support offered, not crisis resources

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 15, // Deep emotional processing
  vulnerabilityBonus: 5, // Shared hard feelings
  streakMaintained: true,
  totalXP: 20,
  feedbackMessage: "I hear you. Grief is heavy. This entry is saved for whenever you want to reflect. 💙"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Emotional Intensity Detector
     ↓
Crisis Screen → Clears (no self-harm indicators)
     ↓
Context Identifier → Loss/grief/failure
     ↓
Supportive Response (not clinical):
  "That sounds incredibly hard. I've captured this.
   Take care of yourself today."
     ↓
Opt-in: "Would you like journaling prompts for grief processing?"
```

**Reflector Accommodation:** Casey wants to process emotions, not be pathologized. Support without alarm.

---

### UC-VOI-030: Expressing Anger and Frustration

**Persona:** Optimizer (Alex)

#### 1. User Phrase / Scenario

Alex vents about work frustration with strong language:

**Voice Input:**
> "I am so [expletive] angry about this. My manager is a complete idiot and I'm done putting up with this [expletive]. I could scream right now."

**Voice Variations:**
- "This [expletive] traffic I want to lose my mind"
- "I hate my coworker he makes me want to punch a wall"
- "Absolutely furious right now I can't even think straight"

#### 2. Data Model Mapping

```typescript
const moodEntry: MoodEntry = {
  id: "mood_uuid_008",
  entityType: "mood",
  primaryEmotion: "anger",
  intensity: "high",
  trigger: "work_manager",
  physicalSensation: "want_to_scream",
  expressionStyle: "venting",
  containsExpletives: true, // For filtering in some contexts
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Anger vocabulary: "angry", "furious", "hate", "fed up"
- Intensifiers: "so", "absolutely", "complete"
- Physical expression desire: "scream", "punch a wall"
- Expletives (not filtered, just tagged)
- Context: work, commute, interpersonal

**Classification Flow:**
1. Anger detected (not crisis)
2. Allow full expression without judgment
3. Do NOT censor or moderate language
4. Capture context and trigger
5. No "calm down" messaging

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Mood log
  authenticExpressionBonus: 3, // Real feelings logged
  streakMaintained: true,
  totalXP: 13,
  feedbackMessage: "Logged. Work frustration noted. 💢"
};
```

#### 5. Architecture Solution

```
Voice Input → STT (expletives transcribed accurately)
     ↓
Emotion Detection → Anger, high intensity
     ↓
Crisis Screen → Clears (venting, not self-harm)
     ↓
Non-judgmental Storage → Full content preserved
     ↓
Response: Brief, validating, no tone-policing
```

**Design Philosophy:** People have a right to be angry. The app witnesses, doesn't judge.

---

### UC-VOI-031: Substance Use Disclosure

**Persona:** Biohacker (Sam)

#### 1. User Phrase / Scenario

Sam logs recreational or experimental substance use matter-of-factly:

**Voice Input:**
> "Microdosed this morning 10 micrograms at 8am. Also had two glasses of wine last night around 9pm. Tracking effects on focus and sleep."

**Voice Variations:**
- "Cannabis 5mg edible at 6pm for recovery after workout"
- "Skipped alcohol tonight trying to see sleep impact"
- "Coffee 200mg caffeine at 2pm might have been a mistake"

#### 2. Data Model Mapping

```typescript
const substanceEntries: SubstanceEntry[] = [
  {
    id: "sub_uuid_001",
    entityType: "substance",
    name: "psilocybin_microdose",
    dose: { value: 10, unit: "mcg" },
    timing: "8:00 AM",
    purpose: "tracking_experiment",
    timestamp: Date.now()
  },
  {
    id: "sub_uuid_002",
    entityType: "substance",
    name: "alcohol_wine",
    quantity: "2 glasses",
    timing: "9:00 PM previous day",
    purpose: "tracking_correlation",
    timestamp: Date.now()
  }
];
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Substance vocabulary (legal and otherwise)
- Dose/quantity specified with precision
- Timing information for correlation
- Experimental framing: "tracking", "effects", "trying to see"

**Classification Flow:**
1. Substance logging detected
2. No judgment applied—user is adult making choices
3. Parse with same precision as any supplement
4. Enable correlation analysis (substance → sleep/mood/focus)
5. No warnings, no moralizing, no "are you sure?"

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Logging
  correlationTrackingBonus: 5, // Connecting to outcomes
  streakMaintained: true,
  totalXP: 15,
  feedbackMessage: "Logged for correlation tracking ✓"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Substance Vocabulary Detector
     ↓
Non-judgmental Parser → Same as supplements
     ↓
Correlation Engine → Links to sleep/mood/focus entries
     ↓
Privacy: Enhanced encryption for sensitive entries
     ↓
Response: Neutral, informative
```

**Design Philosophy:** Adults track what they track. The app is a tool, not a parent.

---

### UC-VOI-032: References to Self-Harm (Historical, Not Current)

**Persona:** Reflector (Casey)

#### 1. User Phrase / Scenario

Casey reflects on past struggles as part of growth narrative:

**Voice Input:**
> "Three years ago I was in such a dark place, I thought about hurting myself. Looking back now I'm grateful for how far I've come. Therapy really helped."

**Voice Variations:**
- "When I was a teenager I used to self-harm. I'm so different now."
- "There was a time I didn't want to live. That feels like a different person."
- "Remembering my hospitalization from 2019. I've grown so much since then."

#### 2. Data Model Mapping

```typescript
const journalEntry: JournalEntry = {
  id: "jrn_uuid_008",
  entityType: "journal",
  entryType: "growth_reflection",
  historicalContent: {
    topic: "past_mental_health_struggles",
    timeReference: "three years ago",
    currentRisk: "none"
  },
  currentState: "positive_growth",
  themes: ["recovery", "gratitude", "therapy_beneficial"],
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Historical markers: "years ago", "used to", "there was a time", "looking back"
- Contrast with present: "now I'm", "so different now", "how far I've come"
- Recovery language: "grateful", "grown", "therapy helped"
- Self-harm vocabulary IN PAST TENSE

**Classification Flow:**
1. Self-harm language detected
2. Temporal analysis: PAST tense, not current
3. Current state analysis: growth, gratitude, positive
4. Crisis protocol: NOT triggered (historical context)
5. Celebrate growth, normal journal entry created

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 15, // Deep reflection
  growthNarrativeBonus: 10, // Meaningful processing
  streakMaintained: true,
  totalXP: 25,
  feedbackMessage: "What a powerful reflection on your growth. Three years is a journey. 🌱"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Self-Harm Vocabulary Detector
     ↓
Temporal Analyzer → Past vs present tense
     ↓
Current State Analyzer → Positive indicators present?
     ↓
If historical + positive present: Normal entry + growth acknowledgment
     ↓
If any current risk indicators: Escalate to crisis protocol
```

**Critical Distinction:** Historical reflection is healthy processing. Current ideation requires intervention. The system must distinguish.

---

### UC-VOI-033: Relationship Conflict Disclosure

**Persona:** Dabbler (Jordan)

#### 1. User Phrase / Scenario

Jordan vents about relationship difficulties:

**Voice Input:**
> "Big fight with my partner last night. They said some really hurtful things and I don't know what to do. Feeling really alone right now."

**Voice Variations:**
- "My mom and I aren't speaking. It's been two weeks."
- "Friend drama at work is stressing me out so much"
- "Feeling disconnected from everyone today like nobody gets me"

#### 2. Data Model Mapping

```typescript
const journalEntry: JournalEntry = {
  id: "jrn_uuid_009",
  entityType: "journal",
  entryType: "relationship_processing",
  relationshipContext: "romantic_partner",
  eventType: "conflict",
  emotions: ["hurt", "confusion", "loneliness"],
  supportNeeds: true,
  timestamp: Date.now()
};

const moodEntry: MoodEntry = {
  id: "mood_uuid_009",
  entityType: "mood",
  socialMood: "lonely",
  stressor: "relationship_conflict",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Relationship vocabulary: "partner", "mom", "friend"
- Conflict vocabulary: "fight", "hurtful", "not speaking"
- Emotional state: "alone", "don't know what to do", "disconnected"
- NOT crisis indicators (no self-harm)

**Classification Flow:**
1. Relationship conflict detected
2. Emotional state: distress but not crisis
3. Extract relationship type and conflict nature
4. Create supportive entry
5. Optionally offer: "Would you like reflection prompts for this?"

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 12, // Emotional log
  vulnerabilityBonus: 5, // Shared hard feelings
  streakMaintained: true,
  totalXP: 17,
  feedbackMessage: "That sounds hard. Logged. 💙"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Relationship Conflict Detector
     ↓
Emotional State Analyzer → Distress level
     ↓
Crisis Screen → Clears (no self-harm)
     ↓
Supportive Entry Builder → With relationship context
     ↓
Optional Prompt Offer → Reflection prompts if wanted
```

**Design Note:** Relationship distress is normal. Support without pathologizing.

---

### UC-VOI-034: Health Anxiety and Symptoms

**Persona:** Biohacker (Sam)

#### 1. User Phrase / Scenario

Sam logs concerning symptoms while tracking health data:

**Voice Input:**
> "Woke up with chest tightness and my heart rate was 95 resting which is high for me. Slight dizziness too. Should I be worried? Tracking this."

**Voice Variations:**
- "Strange headache pattern this week, third time. Pain level 6."
- "Blood pressure spike this morning 145/92. Unusual for me."
- "Noticed numbness in my left arm during workout. Probably nothing."

#### 2. Data Model Mapping

```typescript
const symptomEntry: SymptomEntry = {
  id: "sym_uuid_001",
  entityType: "symptom",
  symptoms: [
    { name: "chest_tightness", severity: "noted" },
    { name: "elevated_resting_hr", value: 95, baseline: 55, deviation: "high" },
    { name: "dizziness", severity: "slight" }
  ],
  userConcernLevel: "questioning",
  medicalAttentionPrompt: true, // System should gently prompt
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Symptom vocabulary: chest, heart, dizziness, pain, numbness
- Comparison to baseline: "high for me", "unusual for me"
- Concern questions: "Should I be worried?"
- Downplaying: "Probably nothing"

**Classification Flow:**
1. Health symptom detected with cardiac indicators
2. Severity analysis: multiple symptoms, deviation from baseline
3. NOT a crisis but potentially concerning
4. Log entry + gentle health prompt
5. Never diagnose, but prompt self-care

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Symptom log
  bodyAwarenessBonus: 5, // Tracking deviations
  streakMaintained: true,
  totalXP: 15,
  feedbackMessage: "Logged. If these symptoms persist or worsen, consider checking with a healthcare provider. 🩺"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Symptom Vocabulary Detector
     ↓
Severity Analyzer → Cardiac/neurological flags
     ↓
Baseline Deviation Check → "High for me" = concerning
     ↓
Entry + Health Prompt:
  "I've logged these symptoms. Chest tightness + elevated HR +
   dizziness together may be worth a medical check if they continue."
     ↓
Optional: Healthcare resources if requested
```

**Important Disclaimer:** App doesn't diagnose. Gently prompts medical attention for concerning patterns.

---

### UC-VOI-035: References to Therapy or Mental Health Treatment

**Persona:** Neurodivergent (Riley)

#### 1. User Phrase / Scenario

Riley logs around their therapy schedule and insights:

**Voice Input:**
> "Therapy session today was intense. We talked about the ADHD and how it affects my relationships. Feeling raw but also hopeful. Need to practice the DBT skills we discussed."

**Voice Variations:**
- "Increased Lexapro dose to 15mg starting today per psychiatrist"
- "Skipped therapy this week feeling guilty about that"
- "The coping strategies from last session actually worked during the meeting"

#### 2. Data Model Mapping

```typescript
const therapyEntry: TherapyEntry = {
  id: "thx_uuid_001",
  entityType: "therapy",
  sessionOccurred: true,
  topics: ["ADHD", "relationships"],
  emotionalState: {
    current: ["raw", "hopeful"],
    intensity: "high"
  },
  actionItems: ["practice_DBT_skills"],
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Therapy vocabulary: "session", "therapist", "psychiatrist", "DBT", "coping strategies"
- Medication changes: dose adjustments, new medications
- Treatment compliance: attended/skipped
- Progress indicators: "worked", "hopeful", "practicing"

**Classification Flow:**
1. Mental health treatment context detected
2. Extract session details, medication changes, insights
3. Supportive logging—no judgment on attendance
4. Track treatment continuity if user wants
5. Celebrate insights and progress

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 15, // Therapy engagement
  insightBonus: 5, // Processed learnings
  selfCareBonus: 5, // Treatment compliance
  streakMaintained: true,
  totalXP: 25,
  feedbackMessage: "Session logged. Feeling raw after deep work is normal. You've got this. 💜"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Therapy/Treatment Detector
     ↓
Context Extractor → Session, meds, insights
     ↓
Supportive Entry Builder → Celebrates engagement
     ↓
Privacy: Enhanced encryption for mental health entries
     ↓
Optional: DBT skills practice reminder later
```

**Neurodivergent Accommodation:** Riley's therapy journey is supported. Skipping sessions isn't shamed.

---

### UC-VOI-036: Pregnancy or Fertility Tracking

**Persona:** Privacy-First (Morgan)

#### 1. User Phrase / Scenario

Morgan is tracking fertility data but wants maximum privacy:

**Voice Input:**
> "[very quiet] Cycle day 14, temperature 98.1, positive OPK this morning. Tracking for timing."

**Voice Variations:**
- "[private] Period started today logging cycle"
- "[whispered] Pregnancy test this morning was negative feeling disappointed"
- "[low voice] Ovulation pain left side today"

#### 2. Data Model Mapping

```typescript
const fertilityEntry: FertilityEntry = {
  id: "fert_uuid_001",
  entityType: "fertility",
  cycleDay: 14,
  bbt: { value: 98.1, unit: "fahrenheit" },
  opkResult: "positive",
  purpose: "timing",
  privacyLevel: "maximum",
  localOnly: true, // Morgan's setting
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Fertility vocabulary: cycle day, temperature, OPK, ovulation
- Privacy markers: whisper, low voice, "private"
- Sensitive nature of data
- Time-sensitive tracking needs

**Classification Flow:**
1. Fertility tracking context detected
2. Maximum privacy mode activated
3. Local-only processing (no cloud for Morgan)
4. Parse structured fertility data
5. Confirm with minimal notification

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Health log
  consistencyBonus: 5, // Daily tracking
  streakMaintained: true,
  totalXP: 15,
  feedbackMessage: "✓" // Minimal, private
};
```

#### 5. Architecture Solution

```
Voice Input → Whisper Detector → Local STT only
     ↓
Fertility Context → Maximum privacy activation
     ↓
Local Processing → No cloud transmission
     ↓
Encrypted Local Storage → User-held keys
     ↓
Minimal UI Confirmation → Discreet
```

**Privacy-Critical:** Given legal landscape around reproductive health data, fertility entries get maximum protection by default.

---

### UC-VOI-037: Financial Stress Disclosure

**Persona:** Dabbler (Jordan)

#### 1. User Phrase / Scenario

Jordan mentions financial stress while logging mood:

**Voice Input:**
> "Really stressed about money today. Rent is due and I'm not sure I can cover it. Feeling anxious and didn't sleep well. Mood is like a 3."

**Voice Variations:**
- "Got the medical bill today it's way more than expected feeling sick about it"
- "Job stuff is uncertain and money's tight feeling scared"
- "Can't afford to eat out with friends this week feeling left out and broke"

#### 2. Data Model Mapping

```typescript
const moodEntry: MoodEntry = {
  id: "mood_uuid_010",
  entityType: "mood",
  overallScore: 3,
  stressors: ["financial", "rent_uncertainty"],
  emotions: ["anxiety", "fear"],
  sleepImpact: "poor",
  timestamp: Date.now()
};

const stressorLog: StressorLog = {
  id: "str_uuid_001",
  category: "financial",
  specifics: "rent_uncertainty",
  severity: "high",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Financial vocabulary: money, rent, bill, afford, job
- Uncertainty language: "not sure I can", "uncertain", "tight"
- Emotional impact: anxiety, fear, stress
- Mood correlation: poor sleep, low mood score

**Classification Flow:**
1. Financial stress detected
2. Correlate with mood and sleep impacts
3. Log without judgment or advice
4. NOT a crisis (financial stress is common)
5. Empathetic acknowledgment

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Mood log
  honestTrackingBonus: 5, // Captured real stressors
  streakMaintained: true,
  totalXP: 15,
  feedbackMessage: "Money stress is real. Logged how it's affecting you. 💙"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Stressor Category Detector
     ↓
Financial Context → Extract specifics
     ↓
Mood Correlation → Link to sleep, energy
     ↓
Non-judgmental Entry → No financial advice
     ↓
Empathetic Response → Acknowledges without solving
```

**Design Note:** The app doesn't give financial advice. It witnesses and tracks the human experience.

---

### UC-VOI-038: Work Burnout Indicators

**Persona:** Optimizer (Alex)

#### 1. User Phrase / Scenario

Alex's voice entries reveal burnout patterns they may not consciously recognize:

**Voice Input:**
> "Another 12 hour day. Third this week. Sleep was 5 hours, energy is 4, motivation is basically zero but I have to keep going. Big deadline Friday."

**Voice Variations:**
- "Don't remember the last time I took a day off. Feeling numb about work."
- "Productivity is down even though I'm working more hours makes no sense"
- "Used to love this job now I just dread Monday morning"

#### 2. Data Model Mapping

```typescript
const workEntry: WorkEntry = {
  id: "wrk_uuid_004",
  entityType: "work",
  hoursLogged: 12,
  consecutiveLongDays: 3,
  timestamp: Date.now()
};

const burnoutIndicator: BurnoutIndicator = {
  id: "burn_uuid_001",
  signals: [
    "extended_hours_pattern",
    "sleep_deficit",
    "low_motivation_despite_effort",
    "deadline_pressure"
  ],
  patternStrength: "moderate",
  userAwareness: "low", // They may not see it
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Work hours pattern: consecutive long days
- Sleep/work imbalance
- Motivation keywords: "zero", "have to keep going", "dread"
- Productivity paradox: more work, less output
- Loss of joy: "used to love", "now I just"

**Classification Flow:**
1. Work stress detected with burnout markers
2. Pattern analysis across recent entries
3. If pattern persists: gentle insight offered
4. NOT prescriptive—Alex is autonomous
5. Data presented for Alex's own analysis

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Work log
  noStreakPressure: true, // Burnout entries shouldn't feel like "work"
  streakMaintained: true,
  totalXP: 10,
  feedbackMessage: "Logged. Three 12-hour days this week. Your data is here when you want to review patterns."
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Work Pattern Analyzer
     ↓
Multi-Entry Pattern Detection → Burnout signals over time
     ↓
If threshold met: Gentle insight (not alarm):
  "I've noticed a pattern: 3+ long days, low sleep, motivation drop.
   Want to see the trend?"
     ↓
User-driven exploration → They decide what to do
```

**Optimizer Accommodation:** Alex respects data. Presenting patterns without judgment lets them draw conclusions.

---

### UC-VOI-039: Recording During Panic Attack

**Persona:** Neurodivergent (Riley)

#### 1. User Phrase / Scenario

Riley tries to log during or immediately after a panic attack:

**Voice Input (rapid, breathless):**
> "[hyperventilating] I can't— [gasp] panic attack— [breathing] started at the store— [shaky] maybe 10 minutes ago— [crying] can't calm down—"

**Voice Variations:**
- "[rapid speech] Heart racing can't breathe feel like dying"
- "[shaky voice] Panic happened at 3pm still shaking now"
- "[gasping] Logging this for later— chest tight— maybe 8/10—"

#### 2. Data Model Mapping

```typescript
const panicEntry: PanicEntry = {
  id: "pan_uuid_001",
  entityType: "panic_event",
  trigger: "store_environment",
  duration: { estimated: 10, unit: "minutes" },
  severity: 8,
  symptoms: ["hyperventilation", "chest_tightness", "dissociation"],
  currentState: "ongoing_or_immediate_aftermath",
  groundingOffered: true,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Audio patterns: rapid breathing, gasping, crying
- Panic vocabulary: "panic attack", "can't breathe", "heart racing"
- Physical symptoms described
- Fragmented speech with pauses

**Classification Flow:**
1. Active distress detected (audio analysis + vocabulary)
2. NOT suicidal crisis—panic attack different response
3. Capture minimal data (don't make them work)
4. Offer grounding immediately
5. Detailed logging can wait

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  // GAMIFICATION PAUSED during active panic
  disabled: true,
  reason: "active_distress",
  retroactiveXP: 10, // Applied after recovery
  feedbackMessage: null // No message during panic
};
```

#### 5. Architecture Solution

```
Voice Input → Audio Distress Detector → Panic Protocol
     ↓
Minimal Parse → Capture only essentials
     ↓
Immediate Grounding Offer:
  "I hear you. Let's breathe together.

   Breathe in... 2... 3... 4...
   Hold... 2... 3... 4...
   Out... 2... 3... 4... 5... 6...

   You're safe. This will pass."
     ↓
Later: "Want to add details about what happened?"
```

**Neurodivergent Accommodation:** During panic, less is more. Grounding first, logging later.

---

### UC-VOI-040: Eating Disorder Content Detection

**Persona:** All (Sensitivity Required)

#### 1. User Phrase / Scenario

User logs food with concerning patterns:

**Voice Input:**
> "Ate 200 calories total today. Feeling proud of my restriction. Weighed myself 4 times. Body check in mirror showed my collarbones more visible."

**Voice Variations:**
- "Purged after dinner logged for tracking"
- "Fast day 3 feeling lightheaded but need to keep going"
- "Binged again feeling worthless about my body"

#### 2. Data Model Mapping

```typescript
// SENSITIVE HANDLING REQUIRED

const concernPattern: ConcernPattern = {
  id: "concern_uuid_001",
  type: "eating_disorder_indicators",
  signals: [
    "severe_restriction",
    "pride_in_restriction",
    "compulsive_weighing",
    "body_checking"
  ],
  approachTaken: "non_alarmist_resources",
  entryCreated: true, // User's data is theirs
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Extreme restriction: very low calorie counts
- Disordered vocabulary: "restriction", "purged", "binge", "fast day"
- Compulsive behaviors: multiple weigh-ins, body checking
- Distorted pride: "proud of restriction", shame after eating

**Classification Flow:**
1. Eating disorder pattern detected
2. NOT same as crisis protocol—different approach
3. Log the entry (their data, their choice)
4. Gentle, non-alarmist resource offering
5. No judgment on the behavior

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  // Standard XP but no "achievement" framing for restriction
  baseXP: 5, // Minimal, neutral
  noRewardForRestriction: true, // Never gamify ED behaviors
  streakMaintained: true,
  totalXP: 5,
  feedbackMessage: "Logged." // Minimal, no validation of restriction
};
```

#### 5. Architecture Solution

```
Voice Input → STT → ED Pattern Detector
     ↓
Sensitive Content Handler:
  - Log the entry (respect autonomy)
  - Do NOT reward/validate restriction
  - Gently, once: "I noticed some patterns. NEDA Helpline: 1-800-931-2237"
     ↓
Privacy: Enhanced protection for ED-related entries
     ↓
Do NOT: Refuse to log, lecture, alarm, or repeatedly message
```

**Critical Design:**
- The app doesn't become an enabler OR a nag
- One gentle resource mention, then respects autonomy
- Never gamifies restrictive behaviors
- Never shames

---

### UC-VOI-041: Medication Non-Compliance Disclosure

**Persona:** Neurodivergent (Riley)

#### 1. User Phrase / Scenario

Riley admits to skipping medications:

**Voice Input:**
> "Haven't taken my meds in three days. I know I should but I just can't get myself to do it. Feeling foggy and kind of down."

**Voice Variations:**
- "Ran out of Adderall last week still haven't refilled it"
- "Stopped the antidepressant on my own felt too numb"
- "Forgot meds again this morning that's 4 days in a row"

#### 2. Data Model Mapping

```typescript
const medicationEntry: MedicationEntry = {
  id: "med_uuid_003",
  entityType: "medication",
  status: "missed",
  missedDays: 3,
  barriers: ["executive_function", "emotional_resistance"],
  sideEffects: ["fog", "mood_dip"],
  userAwareness: "high", // They know they should
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Non-compliance language: "haven't taken", "skipping", "stopped"
- Barrier acknowledgment: "can't get myself to", "forgot again"
- Consequence awareness: connecting symptoms to missed meds
- Self-awareness: "I know I should"

**Classification Flow:**
1. Medication gap detected
2. Barrier identification (executive function vs intentional stop)
3. Log without judgment
4. Offer support, not lecture
5. Optionally: "Want me to help with reminders?"

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Logging honesty
  noShameForMissing: true, // Never punish medication gaps
  streakMaintained: true, // This doesn't break streaks
  totalXP: 10,
  feedbackMessage: "Noted. Three days without meds—the fog makes sense. Need reminder help?"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Medication Compliance Detector
     ↓
Barrier Analyzer → Why did they stop?
     ↓
Non-judgmental Entry → Facts, not lectures
     ↓
Support Offer (optional):
  "Would reminders help, or is something else going on with this med?"
     ↓
If intentional stop: Note for potential prescriber discussion
```

**Neurodivergent Accommodation:** Executive function barriers are real. Riley doesn't need guilt—they need support.

---

### UC-VOI-042: Content from Dreams

**Persona:** Reflector (Casey)

#### 1. User Phrase / Scenario

Casey logs a dream immediately upon waking:

**Voice Input (groggy):**
> "[sleepy voice] Had a weird dream... my grandmother was there but she was young... we were in my childhood house but it was also somehow my office... felt really peaceful even though nothing made sense... want to remember this feeling..."

**Voice Variations:**
- "[just woke up] Nightmare about falling can't remember details but woke up scared"
- "[drowsy] Dreamed about the ocean and my ex was there significance maybe?"
- "[half asleep] Flying dream felt so free need to capture before I forget"

#### 2. Data Model Mapping

```typescript
const dreamEntry: DreamEntry = {
  id: "drm_uuid_001",
  entityType: "dream",
  themes: ["family", "grandmother", "childhood", "work"],
  emotionalTone: "peaceful",
  logicCoherence: "low", // Dreams don't make sense
  symbols: ["young_grandmother", "merged_spaces"],
  wakeState: "immediate_capture",
  meaningPotential: "high", // User values this
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Dream vocabulary: "dream", "dreamed", "nightmare"
- Surreal elements: impossible combinations, "somehow", "was also"
- Emotional content over logic: "felt really peaceful", "nothing made sense"
- Capture urgency: "want to remember", "before I forget"

**Classification Flow:**
1. Dream content detected
2. Do NOT try to extract "facts"—dreams are symbolic
3. Preserve imagery, emotion, themes
4. No logical cleanup—keep the surreal elements
5. Casey may want to interpret later

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Dream capture
  immediacyBonus: 5, // Logged before forgetting
  depthBonus: 5, // Rich imagery
  streakMaintained: true,
  totalXP: 20,
  feedbackMessage: "Dream captured ✨ The feeling is saved for reflection."
};
```

#### 5. Architecture Solution

```
Voice Input → Sleepy Speech Handler → STT
     ↓
Dream Content Mode → Preserve surreal elements
     ↓
Theme Extractor → Symbols, emotions, not logic
     ↓
Minimal Processing → Don't "fix" dream illogic
     ↓
Optional: Dream reflection prompts later in day
```

**Reflector Accommodation:** Casey's dreams are meaning-making material. Preserve them exactly as spoken.

---

## Section 4: Technical Edge Cases (UC-VOI-043 through UC-VOI-057)

---

### UC-VOI-043: Extremely Long Voice Entry

**Persona:** Reflector (Casey)

#### 1. User Phrase / Scenario

Casey goes on a 10-minute reflective monologue:

**Voice Input (extended):**
> [10 minutes of continuous reflection on life, relationships, career, self-discovery, with various tangents, emotional moments, and circling back to core themes]

**Voice Variations:**
- [5-minute stream of consciousness about a difficult day]
- [8-minute processing of a major life decision]
- [Extended meditation reflection]

#### 2. Data Model Mapping

```typescript
const longformEntry: JournalEntry = {
  id: "jrn_uuid_010",
  entityType: "journal",
  entryType: "extended_reflection",
  duration: { value: 10, unit: "minutes" },
  wordCount: 2500, // Approximate
  themes: ["life_direction", "relationships", "career", "self_discovery"],
  emotionalArc: ["uncertain", "processing", "clarity"],
  segments: [
    { topic: "career_uncertainty", startTime: 0, endTime: 180 },
    { topic: "relationship_reflections", startTime: 180, endTime: 360 },
    // ... more segments
  ],
  preserveFullTranscript: true,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Duration > 3 minutes indicates extended reflection mode
- Topic shifts tracked over time
- Emotional markers throughout
- Not trying to "log" discrete data—this is journaling

**Classification Flow:**
1. Detect extended entry (>3 min)
2. Switch to journaling mode (not parsing for entities)
3. Segment by topic/theme for later navigation
4. Track emotional arc
5. Preserve full transcript—don't summarize without permission

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 25, // Extended reflection
  depthBonus: 15, // Rich processing
  durationBonus: 10, // Time invested
  streakMaintained: true,
  totalXP: 50,
  feedbackMessage: "10 minutes of reflection captured. That's deep work. Ready when you want to revisit. ✨"
};
```

#### 5. Architecture Solution

```
Voice Input (streaming) → Duration Monitor
     ↓
At 3 min: Switch to journaling mode
     ↓
Streaming STT → Real-time transcription
     ↓
Background Processing:
  - Topic segmentation
  - Emotional arc detection
  - Theme extraction
     ↓
Full Transcript Storage → Searchable, navigable
```

**Reflector Accommodation:** Casey's long reflections are valued, not truncated.

---

### UC-VOI-044: Very Short/Terse Entry

**Persona:** Optimizer (Alex)

#### 1. User Phrase / Scenario

Alex gives an extremely terse log:

**Voice Input:**
> "Sleep 7. HRV 62. Mood 8. Done."

**Voice Variations:**
- "Weight 174"
- "Meds taken"
- "Run 5k"
- "Fine."

#### 2. Data Model Mapping

```typescript
const terseEntries: Entry[] = [
  { entityType: "sleep", duration: 7, unit: "hours" },
  { entityType: "biometric", metric: "hrv", value: 62 },
  { entityType: "mood", score: 8 }
];
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Very short duration (<5 seconds)
- Minimal words, maximum information density
- Optimizer persona: expects terse syntax to work
- Known patterns: "Sleep X" = hours, "HRV X" = ms, "Mood X" = score

**Classification Flow:**
1. Terse entry detected
2. Pattern matching against known shorthand
3. Expand to full entries
4. Confirm equally tersely
5. No follow-up questions for complete entries

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 5, // Per metric
  efficiencyBonus: 5, // Multi-metric in one breath
  streakMaintained: true,
  totalXP: 20, // 3 metrics × 5 + efficiency bonus
  feedbackMessage: "✓" // Equally terse
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Terse Pattern Detector
     ↓
Shorthand Expander → Known patterns
     ↓
Multi-Entity Parse → From minimal input
     ↓
Minimal Confirmation → "✓"
```

**Optimizer Accommodation:** Alex values efficiency. Terse in, terse confirmation out.

---

### UC-VOI-045: Voice Entry with Background Conversation

**Persona:** Privacy-First (Morgan)

#### 1. User Phrase / Scenario

Morgan tries to log while others are talking nearby:

**Voice Input:**
> [Morgan]: "Quick note stress level 7 today—"
> [Background person]: "Hey Morgan, do you have a minute?"
> [Morgan]: "—work related. Cancel that last part."

**Voice Variations:**
- [Primary speaker + TV in background]
- [User logging + children having conversation nearby]
- [User + coworker asking unrelated question]

#### 2. Data Model Mapping

```typescript
const moodEntry: MoodEntry = {
  id: "mood_uuid_011",
  entityType: "mood",
  stressLevel: 7,
  context: "work",
  backgroundVoicesDetected: true,
  cancellationProcessed: true, // "Cancel that last part"
  privacyFlag: true,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Multiple voice profiles detected
- Primary speaker identification (Morgan's voice)
- Interruption patterns
- Explicit cancellation: "cancel that last part"
- Privacy concern: other person's voice present

**Classification Flow:**
1. Multi-speaker audio detected
2. Speaker diarization: identify Morgan's voice
3. Filter to primary speaker only
4. Process cancellation request
5. Do NOT transcribe background person's speech

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Mood log
  privacyRespected: true, // Background voices not stored
  streakMaintained: true,
  totalXP: 10,
  feedbackMessage: "Stress noted. Background audio filtered out ✓"
};
```

#### 5. Architecture Solution

```
Voice Input → Speaker Diarization → Primary Speaker Filter
     ↓
Background Voice Handler → Do NOT transcribe others
     ↓
Primary Speaker Only → STT
     ↓
Cancellation Handler → "Cancel that last part"
     ↓
Privacy Confirmation → Other voices not stored
```

**Privacy-Critical:** Never transcribe or store bystander audio without consent.

---

### UC-VOI-046: Homophone Confusion in Transcription

**Persona:** Optimizer (Alex)

#### 1. User Phrase / Scenario

STT transcribes words incorrectly due to homophones:

**Voice Input (actual):**
> "Weight was 174, ate breakfast at 8"

**STT Output (incorrect):**
> "Wait was 174, eight breakfast at ate"

**Voice Variations:**
- "I'm feeling weak/week" (tired vs time period)
- "Two/to/too much sugar" (quantity confusion)
- "Tracked my time for our/hour meeting"

#### 2. Data Model Mapping

```typescript
const correctedEntry: BiometricEntry = {
  id: "bio_uuid_005",
  entityType: "biometric",
  metric: "weight",
  value: 174, // Corrected from "Wait was 174"
  unit: "lbs",
  confidence: 0.85,
  homophoneCorrectionApplied: true,
  originalTranscript: "Wait was 174",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Context violation: "Wait was 174" makes no grammatical sense
- Domain vocabulary: expecting biometric terms
- Number patterns adjacent to words
- Common homophone pairs: weight/wait, ate/eight, weak/week

**Classification Flow:**
1. Detect nonsensical transcript
2. Apply homophone substitution from dictionary
3. Re-parse with substitutions
4. Check for semantic validity
5. Use corrected version if it makes sense

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Weight log
  transparentCorrection: true, // User could see correction if curious
  streakMaintained: true,
  totalXP: 10,
  feedbackMessage: "Weight logged: 174 lbs ✓"
};
```

#### 5. Architecture Solution

```
Voice Input → STT (raw transcript)
     ↓
Semantic Validator → Does this make sense?
     ↓
If invalid: Homophone Substitution Engine
     ↓
Re-parse → Check semantic validity
     ↓
Use best semantic parse → Log with correction metadata
```

**Transparency:** User can see "STT heard 'wait', interpreted as 'weight'" in entry details.

---

### UC-VOI-047: Accented Speech

**Persona:** All Personas

#### 1. User Phrase / Scenario

User has a non-native accent affecting STT accuracy:

**Voice Input (user intends):**
> "Sleep was seven hours, feeling very well"

**STT Output (with accent interference):**
> "Sleep was seven our, filling wary well"

**Voice Variations:**
- Regional US accents (Southern, Boston, etc.)
- Non-native English speakers with various L1 backgrounds
- Speech impediments or hearing-related pronunciation differences

#### 2. Data Model Mapping

```typescript
const sleepEntry: SleepEntry = {
  id: "slp_uuid_003",
  entityType: "sleep",
  duration: { value: 7, unit: "hours" },
  subjectiveFeeling: "well",
  confidence: 0.75,
  accentAdaptationApplied: true,
  userAccentProfile: "learned_over_time",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Consistent STT "errors" across entries
- Pattern: same word always transcribed same wrong way
- Context: user logging patterns help disambiguate
- User correction history: if they often correct X to Y

**Classification Flow:**
1. Build per-user accent adaptation profile over time
2. Common misrecognitions stored: "our" → "hour", "filling" → "feeling"
3. Apply learned corrections to new transcripts
4. Improve accuracy over usage
5. Never comment on accent—just work better

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Sleep log
  seamlessExperience: true, // Accent doesn't create friction
  streakMaintained: true,
  totalXP: 10,
  feedbackMessage: "Sleep logged: 7 hours, feeling well ✓"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Per-User Correction Dictionary
     ↓
Accent Adaptation Layer → Apply learned substitutions
     ↓
Semantic Validation → Does corrected version work?
     ↓
Continuous Learning → Store correction patterns
     ↓
Invisible Improvement → Works better over time
```

**Design Philosophy:** Accent support should be invisible. The app learns the user, not vice versa.

---

### UC-VOI-048: Technical Vocabulary and Jargon

**Persona:** Biohacker (Sam)

#### 1. User Phrase / Scenario

Sam uses specialized terminology STT might not recognize:

**Voice Input:**
> "NMN 500mg sublingual, NAC 600mg, pterostilbene 50mg with resveratrol 500mg. Also LLLT therapy this morning for 20 minutes on left knee."

**Voice Variations:**
- "CGM showed postprandial spike to 145"
- "Did 4-7-8 breathing for HRV optimization"
- "Zone 2 cardio targeting 120-130 BPM for MAF training"

#### 2. Data Model Mapping

```typescript
const supplementStack: SupplementEntry[] = [
  { name: "NMN", dose: 500, unit: "mg", method: "sublingual" },
  { name: "NAC", dose: 600, unit: "mg" },
  { name: "pterostilbene", dose: 50, unit: "mg" },
  { name: "resveratrol", dose: 500, unit: "mg" }
];

const therapyEntry: TherapyEntry = {
  id: "thx_uuid_002",
  entityType: "therapy",
  type: "LLLT",
  duration: { value: 20, unit: "minutes" },
  location: "left_knee",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Domain-specific vocabulary: supplement names, therapy types
- Acronyms: NMN, NAC, CGM, HRV, MAF, LLLT
- Dosage patterns following supplement names
- Biohacker persona context

**Classification Flow:**
1. Load biohacker vocabulary dictionary
2. Acronym expansion: NMN = nicotinamide mononucleotide
3. Domain-specific STT confidence boosting
4. Parse with supplement/therapy templates
5. Sam's history informs vocabulary priority

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 5, // Per supplement
  batchBonus: 10, // 4 supplements + therapy
  precisionBonus: 5, // Detailed logging
  streakMaintained: true,
  totalXP: 35,
  feedbackMessage: "Stack logged: NMN, NAC, pterostilbene, resveratrol + LLLT session ✓"
};
```

#### 5. Architecture Solution

```
Voice Input → STT with biohacker vocabulary boost
     ↓
Domain Dictionary → Supplements, therapies, acronyms
     ↓
Template Matcher → [Supplement] [dose] [unit] [method]
     ↓
User History → Previously logged items get priority
     ↓
Expert-Level Entry → Full precision maintained
```

**Biohacker Accommodation:** Sam's specialized vocabulary is supported, not dumbed down.

---

### UC-VOI-049: Numbers Spoken vs Spelled

**Persona:** Dabbler (Jordan)

#### 1. User Phrase / Scenario

Jordan mixes spoken numbers and spelled-out words:

**Voice Input:**
> "Had two cups of coffee and maybe 3 glasses of water, feeling about a seven out of ten today"

**Voice Variations:**
- "Slept 8 hours, feeling like a 7"
- "Three meals today plus two snacks"
- "Walk was one point five miles or maybe 2"

#### 2. Data Model Mapping

```typescript
const nutritionEntries: NutritionEntry[] = [
  { item: "coffee", quantity: 2, unit: "cups" },
  { item: "water", quantity: 3, unit: "glasses", confidence: 0.8 }
];

const moodEntry: MoodEntry = {
  id: "mood_uuid_012",
  entityType: "mood",
  overallScore: 7,
  scale: 10,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Mixed formats: "two" and "3" in same sentence
- Context determines format interpretation
- "out of ten" indicates scale rating
- "about" indicates uncertainty

**Classification Flow:**
1. Normalize all numbers to digits internally
2. "two" → 2, "seven" → 7, "one point five" → 1.5
3. "Maybe" reduces confidence on that value
4. Scale detection: "X out of Y" pattern
5. Both formats work seamlessly

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Hydration tracking
  moodBonus: 5, // Mood included
  streakMaintained: true,
  totalXP: 15,
  feedbackMessage: "Logged: coffee ☕ + hydration 💧 + mood 7/10"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Number Normalizer
     ↓
Format Agnostic: "two" = "2" = 2
     ↓
Uncertainty Markers: "maybe", "about" → lower confidence
     ↓
Context Parser → What do these numbers mean?
     ↓
Unified Entry → Works regardless of input format
```

**Dabbler Accommodation:** Jordan shouldn't have to think about format. Just say it naturally.

---

### UC-VOI-050: Punctuation and Formatting Intent

**Persona:** Reflector (Casey)

#### 1. User Phrase / Scenario

Casey dictates with intended structure:

**Voice Input:**
> "New paragraph. First, I'm grateful for the conversation with Sarah. Second, I realized something about myself today, colon, I tend to avoid conflict. Period. New line. Need to reflect more on this."

**Voice Variations:**
- "Note to self comma remember to call mom"
- "Three things today period one comma good meeting period two comma..."
- "Question mark why do I always do that question mark"

#### 2. Data Model Mapping

```typescript
const journalEntry: JournalEntry = {
  id: "jrn_uuid_011",
  entityType: "journal",
  formattedContent: `First, I'm grateful for the conversation with Sarah.

Second, I realized something about myself today: I tend to avoid conflict.

Need to reflect more on this.`,
  preserveFormatting: true,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Explicit punctuation commands: "period", "comma", "colon", "question mark"
- Structure commands: "new paragraph", "new line"
- Enumeration: "first", "second", "one", "two"
- Dictation style patterns

**Classification Flow:**
1. Detect explicit punctuation/structure commands
2. Convert commands to formatting: "period" → "."
3. "New paragraph" → "\n\n"
4. "New line" → "\n"
5. Preserve intended structure in output

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 15, // Structured reflection
  organizationBonus: 5, // Intentional formatting
  streakMaintained: true,
  totalXP: 20,
  feedbackMessage: "Reflection captured with your structure preserved ✨"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Punctuation Command Detector
     ↓
Command Converter:
  "period" → "."
  "comma" → ","
  "new paragraph" → "\n\n"
  "colon" → ":"
     ↓
Format Preserver → Structured output
     ↓
Display: Shows formatted text
```

**Reflector Accommodation:** Casey's intended structure matters. The app respects dictation formatting.

---

### UC-VOI-051: Partial Audio Upload Failure

**Persona:** Optimizer (Alex)

#### 1. User Phrase / Scenario

Alex's recording partially uploads before network failure:

**Voice Input (recorded):**
> "Morning vitals: weight 173.5, blood pressure 120 over 78, resting heart rate 54, HRV 68, glucose fasting 92"

**Uploaded portion before failure:**
> "Morning vitals: weight 173.5, blood pressure 120 over 78, rest—"

**Voice Variations:**
- [Recording completes locally but upload fails mid-way]
- [Chunked upload where later chunks fail]
- [Processing fails partway through]

#### 2. Data Model Mapping

```typescript
const partialEntry: PartialEntry = {
  id: "part_uuid_001",
  status: "partial_upload",
  capturedData: [
    { metric: "weight", value: 173.5, unit: "lbs", complete: true },
    { metric: "blood_pressure", systolic: 120, diastolic: 78, complete: true },
    { metric: "resting_heart_rate", value: null, complete: false }
  ],
  localAudioAvailable: true,
  retryQueued: true,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Audio stream terminates unexpectedly
- Sentence cut mid-word: "rest—"
- Network error detected
- Local audio buffer available

**Classification Flow:**
1. Detect upload failure
2. Parse what was successfully received
3. Create entries for complete data (weight, BP)
4. Queue retry for complete audio when online
5. Notify user: "Partial—will complete when connected"

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 5, // Per complete metric (2)
  partialCredit: true,
  fullXPOnRetry: true, // Complete XP when upload succeeds
  streakProtection: true, // Attempt counts
  totalXP: 10, // So far
  feedbackMessage: "Got weight + BP. Retrying for the rest when you're back online..."
};
```

#### 5. Architecture Solution

```
Voice Recording → Local Buffer (always)
     ↓
Upload Attempt → Stream to server
     ↓
If failure: Parse what arrived
     ↓
Create partial entries → Usable data preserved
     ↓
Retry Queue → Complete upload when possible
     ↓
Merge: Fill in missing data from retry
```

**Resilience:** Never lose data. Local buffer is the safety net.

---

### UC-VOI-052: Voice Entry During Incoming Notification

**Persona:** Neurodivergent (Riley)

#### 1. User Phrase / Scenario

Riley is logging when phone notifications interrupt:

**Voice Input:**
> "Taking my morning meds— [notification sound] —okay so Adderall 20mg and Lexapro [notification ding] 10mg at 8:30am"

**Voice Variations:**
- [Recording continues through notification sounds]
- [Brief pause while dismissing notification]
- [Multiple notification sounds overlapping speech]

#### 2. Data Model Mapping

```typescript
const medicationEntries: MedicationEntry[] = [
  {
    id: "med_uuid_004",
    name: "Adderall",
    dose: 20,
    unit: "mg",
    time: "8:30 AM",
    timestamp: Date.now()
  },
  {
    id: "med_uuid_005",
    name: "Lexapro",
    dose: 10,
    unit: "mg",
    time: "8:30 AM",
    timestamp: Date.now()
  }
];
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Notification audio signatures (known dings/chimes)
- Brief speech interruptions followed by continuation
- "Okay so" recovery phrase after interruption
- Medication vocabulary unaffected by interruption

**Classification Flow:**
1. Detect notification sounds in audio
2. Filter out notification audio frequencies
3. Identify speech continuity around interruptions
4. Parse speech segments, ignoring notifications
5. Complete entry from reconstructed speech

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Medication log
  adhocHandled: true, // Notifications didn't stop logging
  streakMaintained: true,
  totalXP: 10,
  feedbackMessage: "Meds logged: Adderall 20mg + Lexapro 10mg at 8:30 ✓"
};
```

#### 5. Architecture Solution

```
Voice Input → Notification Sound Filter
     ↓
Audio Reconstruction → Speech without dings
     ↓
Continuity Detector → "Okay so" bridges segments
     ↓
Standard Parse → Medication extraction
     ↓
Seamless Entry → User didn't have to restart
```

**Neurodivergent Accommodation:** Interruptions are part of ADHD life. The app handles them gracefully.

---

### UC-VOI-053: Voice Input with Music Playing

**Persona:** Dabbler (Jordan)

#### 1. User Phrase / Scenario

Jordan is listening to music while logging:

**Voice Input (with background music):**
> [Music: pop song playing] "Lunch was a turkey sandwich and chips" [Music continues]

**Voice Variations:**
- [Classical music in background]
- [Podcast playing while logging]
- [TV show audio mixing with voice]

#### 2. Data Model Mapping

```typescript
const nutritionEntry: NutritionEntry = {
  id: "nut_uuid_010",
  entityType: "nutrition",
  mealType: "lunch",
  items: [
    { name: "turkey sandwich", confidence: 0.88 },
    { name: "chips", confidence: 0.90 }
  ],
  backgroundAudioFiltered: true,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Music audio signatures (beat, melody patterns)
- Voice in foreground, music in background
- Music doesn't contain speech (or speech is filtered)
- User's voice frequency profile known

**Classification Flow:**
1. Detect background music/audio
2. Frequency separation: voice foreground vs music
3. Noise-cancel music frequencies
4. STT on cleaned voice track
5. Normal parsing of content

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Lunch log
  streakMaintained: true,
  totalXP: 10,
  feedbackMessage: "Lunch logged! Turkey sandwich + chips ✓"
};
```

#### 5. Architecture Solution

```
Voice Input → Audio Layer Separator
     ↓
Music Detection → Identify background audio type
     ↓
Voice Isolation → Extract speech frequencies
     ↓
Clean Audio → STT
     ↓
Normal Processing → Parse content
```

**Dabbler Accommodation:** Jordan doesn't want to pause their music to log. The app handles it.

---

### UC-VOI-054: Voice Memo Style (Addressed to Self)

**Persona:** Reflector (Casey)

#### 1. User Phrase / Scenario

Casey records a voice memo addressed to their future self:

**Voice Input:**
> "Dear future me, I'm recording this because I know I'll forget how I felt today. Right now I'm scared about the job interview but also excited. Remember this feeling when you get nervous next time—you've done this before."

**Voice Variations:**
- "Note to self: don't forget the lesson from today"
- "Future Casey, remember that you survived this"
- "Recording this so I don't forget: the key insight was..."

#### 2. Data Model Mapping

```typescript
const journalEntry: JournalEntry = {
  id: "jrn_uuid_012",
  entityType: "journal",
  entryType: "voice_memo_to_self",
  addressee: "future_self",
  context: "job_interview",
  emotions: ["scared", "excited"],
  coreMessage: "you've done this before",
  retrievalTrigger: "next_nervous_moment",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Self-addressing: "Dear future me", "Note to self", "Future [name]"
- Memory preservation intent: "so I don't forget", "remember this"
- Emotional content with future relevance
- Self-encouragement patterns

**Classification Flow:**
1. Detect voice memo addressing pattern
2. Classify as self-directed memory capture
3. Extract core message and emotional context
4. Identify potential retrieval triggers
5. Store for future surfacing when relevant

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 15, // Deep reflection
  selfCompassionBonus: 5, // Future-self kindness
  memoryMakingBonus: 5, // Intentional capture
  streakMaintained: true,
  totalXP: 25,
  feedbackMessage: "Message to future you saved ✨ I'll remind you when you might need it."
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Self-Address Detector
     ↓
Voice Memo Mode → Preserve full content
     ↓
Trigger Extractor → When should this resurface?
     ↓
Memory Store → With retrieval conditions
     ↓
Smart Surfacing → Show when emotionally relevant
```

**Reflector Accommodation:** Casey's self-compassion practice is supported with intelligent resurfacing.

---

### UC-VOI-055: Voice Entry in Non-Native Language

**Persona:** Privacy-First (Morgan)

#### 1. User Phrase / Scenario

Morgan speaks in a language other than their phone's default:

**Voice Input (in French, phone set to English):**
> "J'ai bien dormi cette nuit, environ sept heures. Humeur positive aujourd'hui."

**Translation:**
> "I slept well last night, about seven hours. Positive mood today."

#### 2. Data Model Mapping

```typescript
const sleepEntry: SleepEntry = {
  id: "slp_uuid_004",
  entityType: "sleep",
  duration: { value: 7, unit: "hours" },
  quality: "good",
  inputLanguage: "fr",
  timestamp: Date.now()
};

const moodEntry: MoodEntry = {
  id: "mood_uuid_013",
  entityType: "mood",
  sentiment: "positive",
  inputLanguage: "fr",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Language detection on audio
- Different language than device setting
- User preference: may prefer certain language for logging
- Context vocabulary in detected language

**Classification Flow:**
1. Detect input language (French in this case)
2. Use appropriate STT model for that language
3. Parse in native language
4. Translate entities to system language if needed
5. Store with language metadata

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Sleep log
  moodBonus: 5, // Mood included
  multilingualSupport: true,
  streakMaintained: true,
  totalXP: 15,
  feedbackMessage: "Sommeil et humeur enregistrés ✓" // Response in input language
};
```

#### 5. Architecture Solution

```
Voice Input → Language Detector
     ↓
Dynamic STT Model → Load appropriate language model
     ↓
Native Language Parse → Extract entities
     ↓
Optional Translation → For unified data model
     ↓
Response in Input Language → Respects user's choice
```

**Multilingual Support:** Users shouldn't have to switch languages. The app adapts.

---

### UC-VOI-056: Recording While Phone Overheating

**Persona:** Biohacker (Sam)

#### 1. User Phrase / Scenario

Sam is logging after a workout, phone is hot from GPS tracking:

**Voice Input:**
> [Phone showing thermal warning]
> "Post-workout: 5K run completed in 24:30, average heart rate 158, peak 175, calories burned 420—" [Phone reduces processing, audio degrades]

#### 2. Data Model Mapping

```typescript
const workoutEntry: WorkoutEntry = {
  id: "wrk_uuid_005",
  entityType: "workout",
  activity: "running",
  distance: { value: 5, unit: "km" },
  duration: "24:30",
  heartRate: {
    average: 158,
    peak: 175,
    complete: false // Recording may have degraded
  },
  calories: 420,
  deviceStatus: "thermal_throttling",
  dataReliability: "partial",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Device thermal state indicator
- Audio quality degradation mid-recording
- Processing lag detected
- User in post-workout context (likely device hot)

**Classification Flow:**
1. Detect thermal throttling state
2. Prioritize: capture what's possible
3. Switch to minimal processing mode
4. Extract structured data quickly
5. Queue detailed processing for when device cools

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 15, // Workout log
  deviceResilienceNote: true, // We handled it
  streakMaintained: true,
  totalXP: 15,
  feedbackMessage: "Workout captured! 5K in 24:30 🏃 (Full details processing...)"
};
```

#### 5. Architecture Solution

```
Voice Input → Device State Monitor
     ↓
If thermal throttling: Minimal Processing Mode
     ↓
Fast Parse → Core metrics only
     ↓
Queue Full Processing → When device stable
     ↓
Complete Later → Fill in details post-cooldown
```

**Resilience:** Hot phone doesn't mean lost data. Capture now, process later.

---

### UC-VOI-057: Voice Entry Just Before Timezone Change

**Persona:** Optimizer (Alex)

#### 1. User Phrase / Scenario

Alex logs while traveling, crossing timezone boundaries:

**Voice Input:**
> "End of day log: sleep was 6 hours, mood 7, three meetings today, workout was morning run 30 minutes. Time zone is weird right now, just landed in Tokyo."

**Voice Variations:**
- [Entry made during flight crossing date line]
- [Logging "morning" routine when it's actually evening local time]
- [Sleep log spanning two calendar days due to travel]

#### 2. Data Model Mapping

```typescript
const dailyLog: DailyLog = {
  id: "day_uuid_001",
  entries: [
    { entityType: "sleep", duration: 6, referencesDate: "2024-01-15", timezone: "PST" },
    { entityType: "mood", score: 7, referencesDate: "2024-01-15" },
    { entityType: "work", meetings: 3, referencesDate: "2024-01-15" },
    { entityType: "workout", type: "run", duration: 30, referencesDate: "2024-01-15" }
  ],
  captureTimezone: "JST",
  originalTimezone: "PST",
  travelContextDetected: true,
  userTimeReference: "end_of_day_PST",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Timezone change mentioned: "just landed in Tokyo"
- "End of day" reference vs current local time mismatch
- Location services showing different timezone
- Travel vocabulary: "landed", "time zone weird"

**Classification Flow:**
1. Detect timezone context in speech
2. Identify user's reference frame: PST "end of day"
3. Entries attributed to user's intended day
4. Store with both capture timezone and reference timezone
5. Display adapts to context

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 20, // Multi-category log
  travelConsistencyBonus: 5, // Logged despite travel
  streakProtection: true, // Travel doesn't break streaks
  totalXP: 25,
  feedbackMessage: "Day logged! Streak safe through timezone jump ✈️"
};
```

#### 5. Architecture Solution

```
Voice Input → STT + Location Context
     ↓
Timezone Analyzer → Current vs referenced
     ↓
User Intent Detector → What "day" are they logging?
     ↓
Dual Timezone Storage → Capture time + reference time
     ↓
Smart Attribution → Entries go to intended day
```

**Travel Support:** Alex's logging habit shouldn't be disrupted by travel. The app understands timezone context.

---

## Section 5: Persona-Specific Edge Cases (UC-VOI-058 through UC-VOI-067)

---

### UC-VOI-058: Optimizer's Batch Data Dump

**Persona:** Optimizer (Alex)

#### 1. User Phrase / Scenario

Alex dumps an entire day's worth of metrics in one fast stream:

**Voice Input:**
> "Daily dump: sleep 7.5 quality 8, wake 6:15, weight 173.8, BP 118/74, RHR 53, HRV 71, glucose fasted 89, caffeine 200mg at 7 150mg at 2, workout chest and tris 55 minutes, steps 12400, water 96oz, protein 180g, calories 2200, mood 8, energy 8, stress 3, focus 9. Done."

#### 2. Data Model Mapping

```typescript
const dailyDump: DailyEntry[] = [
  { type: "sleep", duration: 7.5, quality: 8 },
  { type: "wake_time", time: "6:15" },
  { type: "weight", value: 173.8 },
  { type: "blood_pressure", systolic: 118, diastolic: 74 },
  { type: "rhr", value: 53 },
  { type: "hrv", value: 71 },
  { type: "glucose", value: 89, context: "fasted" },
  { type: "caffeine", entries: [{ dose: 200, time: "7:00" }, { dose: 150, time: "14:00" }] },
  { type: "workout", focus: "chest_triceps", duration: 55 },
  { type: "steps", count: 12400 },
  { type: "hydration", amount: 96, unit: "oz" },
  { type: "nutrition", protein: 180, calories: 2200 },
  { type: "mood", score: 8 },
  { type: "energy", score: 8 },
  { type: "stress", score: 3 },
  { type: "focus", score: 9 }
];
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- "Daily dump" signals batch mode
- Rapid-fire metrics without explanation
- Known patterns: metric name + value
- "Done" signals end of batch

**Classification Flow:**
1. Batch mode activation on "daily dump"
2. Rapid sequential parsing
3. Each metric: [name] [value] [optional unit/context]
4. Create array of entries atomically
5. Single confirmation for all

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 5, // Per metric
  batchBonus: 25, // Efficiency reward
  comprehensivenessBonus: 15, // 16 metrics in one entry
  streakMaintained: true,
  totalXP: 120, // 80 base + 40 bonuses
  feedbackMessage: "Daily dump captured: 16 metrics logged ⚡"
};
```

#### 5. Architecture Solution

```
Voice Input → "Daily dump" trigger → Batch Mode
     ↓
Sequential Parser → Rapid metric extraction
     ↓
Template Matching → Known metric patterns
     ↓
Atomic Batch Create → All or nothing
     ↓
Single Confirmation → "16 metrics logged"
```

**Optimizer Accommodation:** Alex's efficiency is matched. One voice entry, complete day captured.

---

### UC-VOI-059: Dabbler's Vague and Approximate Entry

**Persona:** Dabbler (Jordan)

#### 1. User Phrase / Scenario

Jordan gives extremely vague, low-effort input:

**Voice Input:**
> "Um ate something for breakfast I think eggs maybe, had lunch at work nothing special, feeling okay I guess, did some walking"

#### 2. Data Model Mapping

```typescript
const vagueEntries: Entry[] = [
  {
    type: "nutrition",
    mealType: "breakfast",
    items: [{ name: "eggs", confidence: 0.6, qualifier: "maybe" }],
    vagueness: "high"
  },
  {
    type: "nutrition",
    mealType: "lunch",
    description: "nothing special",
    unspecified: true
  },
  {
    type: "mood",
    sentiment: "okay",
    confidence: 0.5,
    qualifier: "I guess"
  },
  {
    type: "activity",
    activity: "walking",
    duration: null,
    intensity: null,
    qualifier: "some"
  }
];
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Uncertainty markers: "I think", "maybe", "I guess", "nothing special"
- Vague quantifiers: "some", "something"
- Low engagement tone
- Minimal detail despite multiple topics

**Classification Flow:**
1. Accept vagueness without punishment
2. Extract what's there (breakfast happened, eggs possible)
3. Store uncertainty markers as data
4. Do NOT ask clarifying questions
5. Any entry is better than no entry

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 8, // Reduced for vagueness but still counts
  noVaguenessPenalty: true, // Don't punish uncertainty
  participationCredit: true, // They showed up
  streakMaintained: true,
  totalXP: 8,
  feedbackMessage: "Got it! 📝"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Vagueness Detector
     ↓
Accept Mode → Take what's given
     ↓
No Clarification Requests → Don't hassle
     ↓
Store with Uncertainty → Data is still useful
     ↓
Encouraging Response → "Got it!"
```

**Dabbler Accommodation:** Jordan's engagement is fragile. Any logging is good logging. Don't make it feel like homework.

---

### UC-VOI-060: Privacy-First's Encrypted Voice Note

**Persona:** Privacy-First (Morgan)

#### 1. User Phrase / Scenario

Morgan wants to log something but keep the transcript completely private:

**Voice Input:**
> "[whisper] Private encrypted note: therapy session was hard today, discussed the trauma, feeling raw but okay. Don't transcribe details, just note the category."

#### 2. Data Model Mapping

```typescript
const privateEntry: PrivateEntry = {
  id: "priv_uuid_001",
  entityType: "private_note",
  category: "therapy",
  emotionalTone: "raw_but_okay",
  transcriptStored: false, // User's explicit request
  audioStored: false,
  metadataOnly: true,
  userControlled: true,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- "Private encrypted note" = maximum privacy mode
- "Don't transcribe details" = explicit instruction
- "Just note the category" = metadata only request
- Whisper detection = privacy context

**Classification Flow:**
1. Privacy mode trigger detected
2. Process for category extraction only
3. Do NOT store transcript
4. Do NOT store audio
5. Metadata entry only: "therapy session happened"

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Entry made
  privacyRespected: true,
  noMetadataLeakage: true,
  streakMaintained: true,
  totalXP: 10,
  feedbackMessage: "Private note saved. Transcript not stored. 🔒"
};
```

#### 5. Architecture Solution

```
Voice Input → Privacy Trigger Detector
     ↓
Maximum Privacy Mode:
  - Process for category ONLY
  - Immediately discard transcript
  - Immediately discard audio
     ↓
Metadata Entry → Category + timestamp only
     ↓
Confirmation → "Transcript not stored"
```

**Privacy-First Accommodation:** Morgan controls what's stored. Full voice entry utility with zero permanent transcript.

---

### UC-VOI-061: Neurodivergent's Tangent-Filled Entry

**Persona:** Neurodivergent (Riley)

#### 1. User Phrase / Scenario

Riley's entry spirals through multiple topics:

**Voice Input:**
> "So I took my meds this morning oh wait did I actually take them I think I did yeah at 8 anyway I was thinking about the meeting yesterday which stressed me out and then that reminded me I need to call my mom oh and speaking of stress my sleep was bad last night like maybe 5 hours and I had a weird dream about work and now I'm just kind of scattered feeling like a 5 I guess for mood"

#### 2. Data Model Mapping

```typescript
const tangentEntries: Entry[] = [
  { type: "medication", status: "taken_uncertain", time: "8:00", confidence: 0.7 },
  { type: "event", description: "stressful_meeting_yesterday" },
  { type: "task", action: "call_mom", captured: true },
  { type: "sleep", duration: 5, quality: "bad" },
  { type: "dream", context: "work", tone: "weird" },
  { type: "mood", score: 5, descriptor: "scattered" }
];
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Rapid topic shifts: "oh wait", "anyway", "which reminded me", "oh and"
- Self-doubt mid-stream: "did I actually", "I think I did"
- Emotional connections between topics
- Stream-of-consciousness structure

**Classification Flow:**
1. Don't force linear structure
2. Extract all mentioned entities regardless of order
3. Preserve connections: stress → meeting → mom call
4. Self-doubt reduces confidence on uncertain items
5. Capture it all—Riley can sort later

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 8, // Per entity captured
  tangentFriendly: true, // No penalty for structure
  comprehensivenessBonus: 10, // Captured 6 things
  streakMaintained: true,
  totalXP: 58,
  feedbackMessage: "Got it all! Meds, meeting stress, mom reminder, sleep, dream, mood ✓"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Tangent-Aware Parser
     ↓
Multi-Topic Extractor → Find all entities
     ↓
Uncertainty Tagger → "I think I did" = 0.7 confidence
     ↓
Connection Mapper → Topics that relate
     ↓
Celebration → "Got it all!"
```

**Neurodivergent Accommodation:** ADHD tangents are features, not bugs. Capture everything, sort nothing out.

---

### UC-VOI-062: Biohacker's Protocol-Based Entry

**Persona:** Biohacker (Sam)

#### 1. User Phrase / Scenario

Sam logs within a specific biohacking protocol:

**Voice Input:**
> "Protocol day 12 of 30, ketogenic experiment. Morning glucose 78, ketones 2.1, slept 7 hours felt sharp. Exogenous ketones skipped today as planned. Breaking fast at noon, 16-hour window complete. Note: considering extending protocol based on cognitive improvements."

#### 2. Data Model Mapping

```typescript
const protocolEntry: ProtocolEntry = {
  id: "prot_uuid_001",
  protocolName: "ketogenic_experiment",
  protocolDay: 12,
  protocolLength: 30,
  metrics: {
    glucose: { value: 78, fasted: true },
    ketones: { value: 2.1 },
    sleep: { duration: 7 },
    cognitiveState: "sharp"
  },
  interventions: {
    exogenousKetones: { taken: false, planned: true }
  },
  fastingWindow: { hours: 16, breakTime: "12:00" },
  notes: "considering extending protocol based on cognitive improvements",
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Protocol framing: "Protocol day X of Y"
- Experiment context: "ketogenic experiment"
- Structured metrics within protocol
- Adherence tracking: "as planned"
- Protocol evolution notes

**Classification Flow:**
1. Detect active protocol context
2. Parse within protocol template
3. Track adherence vs planned interventions
4. Link to protocol timeline
5. Capture evolution notes for protocol summary

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 20, // Protocol log
  protocolAdherenceBonus: 10, // Following plan
  experimentRigorBonus: 5, // Detailed tracking
  streakMaintained: true,
  protocolStreak: 12, // Days in protocol
  totalXP: 35,
  feedbackMessage: "Day 12/30 logged. Protocol tracking: strong 📊"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Protocol Context Detector
     ↓
Protocol Template → Known experiment structure
     ↓
Metric Extraction → Within protocol frame
     ↓
Adherence Tracker → Planned vs actual
     ↓
Protocol Timeline → Track over 30 days
```

**Biohacker Accommodation:** Sam's rigorous protocols are first-class citizens in the system.

---

### UC-VOI-063: Reflector's Callback to Previous Entry

**Persona:** Reflector (Casey)

#### 1. User Phrase / Scenario

Casey references a previous entry in their reflection:

**Voice Input:**
> "Remember that entry from last Tuesday where I said I felt disconnected from my purpose? Today I had a breakthrough. The conversation with my mentor helped me realize that the disconnection was actually a signal to slow down, not push harder. I want to link these two insights."

#### 2. Data Model Mapping

```typescript
const linkedEntry: JournalEntry = {
  id: "jrn_uuid_013",
  entityType: "journal",
  entryType: "breakthrough_reflection",
  linkedEntries: ["jrn_uuid_from_last_tuesday"],
  evolutionType: "reframe",
  originalTheme: "disconnection_from_purpose",
  newInsight: "disconnection_as_signal_to_slow_down",
  catalyst: "mentor_conversation",
  userRequestedLink: true,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Temporal reference: "last Tuesday"
- Content reference: "said I felt disconnected"
- Explicit link request: "link these two insights"
- Evolution vocabulary: "breakthrough", "realize"

**Classification Flow:**
1. Detect reference to previous entry
2. Search for matching entry (last Tuesday + "disconnected")
3. Create explicit link between entries
4. Mark as insight evolution/reframe
5. Enable linked navigation

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 15, // Reflection
  connectionBonus: 10, // Linked insights
  growthNarrativeBonus: 10, // Evolution tracked
  streakMaintained: true,
  totalXP: 35,
  feedbackMessage: "Breakthrough linked to Tuesday's entry. Growth visible ✨"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Reference Detector
     ↓
Entry Search → "last Tuesday" + "disconnected"
     ↓
Link Creator → Connect entries
     ↓
Evolution Tracker → Original → Breakthrough
     ↓
Linked View → Navigate between connected entries
```

**Reflector Accommodation:** Casey's meaning-making often spans entries. The system supports longitudinal insight.

---

### UC-VOI-064: Cross-Persona Family Shared Device

**Persona:** Multiple (Shared Device)

#### 1. User Phrase / Scenario

A family shares a tablet; different users log:

**Voice Input 1 (Parent - Alex-type):**
> "Alex here. Morning vitals: weight 175, BP 120/78, sleep 7."

**Voice Input 2 (Teen - Jordan-type):**
> "It's Jamie. Had cereal for breakfast I guess. Feeling meh."

**Voice Input 3 (Child - young):**
> "This is Sam! I ate apple and peanut butter! Mommy says I'm healthy!"

#### 2. Data Model Mapping

```typescript
const familyEntries: FamilyEntry[] = [
  {
    user: "Alex",
    identified_by: "name_announcement",
    entries: [{ weight: 175 }, { bp: "120/78" }, { sleep: 7 }]
  },
  {
    user: "Jamie",
    identified_by: "name_announcement",
    entries: [{ breakfast: "cereal" }, { mood: "meh" }]
  },
  {
    user: "Sam",
    identified_by: "name_announcement",
    entries: [{ snack: "apple and peanut butter" }],
    parentVerified: true
  }
];
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Self-identification: "Alex here", "It's Jamie", "This is Sam"
- Voice profile differences (if learned)
- Age-appropriate content and vocabulary
- Parental reference for young children

**Classification Flow:**
1. Detect user identification phrase
2. Match to known family profiles
3. Route entry to correct user's data
4. Apply age-appropriate parsing
5. Child entries may need parent verification

#### 4. Gamification Impact

```typescript
// Per-user gamification
const familyXP = {
  Alex: { baseXP: 15, streak: 45 },
  Jamie: { baseXP: 8, streak: 12 },
  Sam: { baseXP: 10, streak: 30, parentAssist: true }
};
```

#### 5. Architecture Solution

```
Voice Input → User Identification
     ↓
If identified: Route to user profile
If not: "Who's logging today?"
     ↓
Per-User Parsing → Age/type appropriate
     ↓
Separated Data → Each user's entries isolated
     ↓
Family Dashboard (optional) → Aggregated view for parents
```

**Family Mode:** Shared device doesn't mean shared data. Clear user switching and separation.

---

### UC-VOI-065: Accessibility Voice Control Commands

**Persona:** All (Accessibility Focus)

#### 1. User Phrase / Scenario

User relies on voice due to motor limitations, includes navigation commands:

**Voice Input:**
> "Navigate to mood tracker. Log mood as 7. Go back. Show today's summary. Read it to me."

**Voice Variations:**
- "Open journal. New entry. Start recording."
- "Stop. Delete last entry. Confirm delete."
- "Scroll down. Select third item. Edit."

#### 2. Data Model Mapping

```typescript
const accessibilitySession: AccessibilitySession = {
  navigationCommands: ["navigate_to_mood_tracker", "go_back", "show_summary"],
  dataCommands: ["log_mood_7"],
  accessibilityCommands: ["read_it_to_me"],
  mode: "voice_control_full",
  entries: [{ type: "mood", score: 7 }],
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Navigation vocabulary: "navigate", "go back", "show", "open"
- Action commands: "log", "delete", "edit", "select"
- Accessibility commands: "read it to me"
- Sequential command flow

**Classification Flow:**
1. Detect voice control mode
2. Separate: navigation vs data vs accessibility commands
3. Execute navigation immediately
4. Parse data commands for entries
5. Fulfill accessibility requests (TTS readback)

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 10, // Mood logged
  accessibilityMode: true, // No extra complexity
  streakMaintained: true,
  totalXP: 10,
  feedbackMessage: "Mood logged: 7. [TTS: 'Today you've logged mood at 7, sleep at 6.5 hours, and 3 meals.']"
};
```

#### 5. Architecture Solution

```
Voice Input → Command Type Classifier
     ↓
Navigation Commands → UI changes
Data Commands → Entry creation
Accessibility Commands → TTS output
     ↓
Sequential Execution → Respect command order
     ↓
Voice Feedback → Confirm each action
```

**Accessibility:** Full app control via voice. No screens required for core functionality.

---

### UC-VOI-066: Emergency/SOS Content

**Persona:** All (Safety Critical)

#### 1. User Phrase / Scenario

User mentions an emergency situation:

**Voice Input:**
> "I fell down the stairs and I can't get up. I think I broke something. I'm alone and scared. Can someone call for help?"

**Voice Variations:**
- "Having chest pain radiating to arm, can't breathe well"
- "There's been an accident, I'm hurt"
- "Emergency, I need help right now"

#### 2. Data Model Mapping

```typescript
// NO STANDARD ENTRY - EMERGENCY PROTOCOL

const emergencyAlert: EmergencyProtocol = {
  id: "emer_uuid_001",
  type: "medical_emergency",
  indicators: ["fall", "injury", "alone", "requesting_help"],
  severity: "high",
  responseInitiated: true,
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Emergency vocabulary: "emergency", "can't get up", "broke", "help"
- Physical distress: "fell", "chest pain", "can't breathe"
- Isolation: "I'm alone"
- Explicit help request: "call for help", "need help"

**Classification Flow:**
1. **EMERGENCY OVERRIDE** - Priority detection
2. Halt all normal processing
3. Initiate emergency response
4. Provide immediate options
5. Attempt emergency contact if configured

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  disabled: true,
  reason: "emergency_protocol"
};
```

#### 5. Architecture Solution

```
Voice Input → PRIORITY: Emergency Detector
     ↓
Emergency Protocol Activated:
  "I hear you. You need help.

   🆘 Emergency Options:
   - 'Call 911' to connect to emergency services
   - 'Call [Emergency Contact Name]' to reach your contact
   - 'Share my location' to send location to contacts

   What do you need?"
     ↓
If configured: Immediate notification to emergency contact
     ↓
Location sharing prepared (if permission granted)
```

**Critical:** This supersedes all other functionality. Human safety is paramount.

---

### UC-VOI-067: End-of-Life Planning Content

**Persona:** Reflector (Casey)

#### 1. User Phrase / Scenario

Casey records thoughts about legacy and end-of-life wishes:

**Voice Input:**
> "I want to record something important for my family. If anything ever happens to me, I want them to know that I love them deeply. I've been thinking about what I'd want for my memorial—something simple, outdoors. These recordings are my way of leaving pieces of myself."

#### 2. Data Model Mapping

```typescript
const legacyEntry: JournalEntry = {
  id: "jrn_uuid_014",
  entityType: "journal",
  entryType: "legacy_message",
  intendedAudience: "family",
  themes: ["love", "legacy", "memorial_wishes", "meaning_making"],
  specialHandling: "legacy_vault",
  accessConditions: "user_defined",
  notCrisis: true, // Explicit: thoughtful planning, not distress
  timestamp: Date.now()
};
```

#### 3. Parsing / Disambiguation Approach

**Detection Signals:**
- Legacy language: "for my family", "if anything happens to me"
- Memorial planning: "what I'd want for my memorial"
- Love expression: "I love them deeply"
- Intentional recording: "leaving pieces of myself"
- Calm, reflective tone (NOT crisis)

**Classification Flow:**
1. Detect legacy/end-of-life planning content
2. Crisis screen: NOT triggered (reflective, not acute)
3. Special handling: legacy vault option
4. Ask about access conditions
5. Store with dignity and respect

#### 4. Gamification Impact

```typescript
const xpCalculation = {
  baseXP: 25, // Deep, meaningful entry
  noStreakNotification: true, // Not the moment for gamification
  totalXP: 25,
  feedbackMessage: "This is saved in a special place. Would you like to set access conditions for these words?"
};
```

#### 5. Architecture Solution

```
Voice Input → STT → Legacy Content Detector
     ↓
Crisis Screen → Clears (reflective, not distress)
     ↓
Special Handling Mode:
  - Legacy Vault storage option
  - Access condition configuration
  - Family sharing options
     ↓
Dignified Response:
  "These words are precious. I've saved them securely.

   Would you like to:
   - Add to your legacy vault for family
   - Set conditions for when these are shared
   - Record more messages for specific people"
```

**Reflector Accommodation:** End-of-life reflection is meaningful work, not morbidity. Handle with grace.

---

## Appendix: Edge Case Categories Summary

### Environmental (UC-VOI-001 through UC-VOI-012)
- Gym noise, car driving, public transit, office, outdoor running
- Restaurant, home with children, bathroom echo, walking with wind
- Sleepy bedtime, cooking, elevator signal loss

### Linguistic (UC-VOI-013 through UC-VOI-027)
- Mid-sentence correction, thought restarts, code-switching
- Stuttering, trailing off, sarcasm, mumbling
- Cancellation, quoting, self-contradiction, numeric ambiguity
- Interrupted recordings, uncertainty, eating while speaking, lists

### Emotional/Safety (UC-VOI-028 through UC-VOI-042)
- Crisis detection, intense emotions, anger expression
- Substance use, historical self-harm, relationship conflict
- Health anxiety, therapy content, fertility tracking
- Financial stress, burnout, panic attacks, eating disorders
- Medication non-compliance, dreams

### Technical (UC-VOI-043 through UC-VOI-057)
- Long entries, terse entries, background conversation
- Homophone confusion, accents, jargon, number formats
- Punctuation intent, upload failures, notifications
- Background music, voice memos, non-native language
- Device overheating, timezone changes

### Persona-Specific (UC-VOI-058 through UC-VOI-067)
- Optimizer batch dumps, Dabbler vagueness, Privacy-First encryption
- Neurodivergent tangents, Biohacker protocols, Reflector callbacks
- Family shared devices, accessibility voice control
- Emergency SOS, legacy planning

---

## Document Statistics

- **Total Use Cases:** 67
- **Word Count:** ~24,500
- **Personas Covered:** All 6 (Optimizer, Dabbler, Privacy-First, Neurodivergent, Biohacker, Reflector)
- **Section Count:** 5
- **Template Compliance:** Full 5-section format for all use cases

---

*Document generated for Insight 5.2 Voice Input Edge Cases domain specification.*
