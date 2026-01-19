# PHASE2I: Error Handling Domain Use Cases

**Document Version:** 1.0
**Date:** January 18, 2026
**Domain:** Error Handling
**Use Case Count:** 67
**Status:** Production Specification

---

## Executive Summary

This document defines 67 use cases for the Error Handling domain in Insight 5.2, covering voice transcription errors, parse/classification failures, sync/network issues, data validation errors, conflict resolution, API/server errors, and recovery flows. Error handling is a critical cross-cutting concern that affects every feature domain and requires persona-specific approaches to maintain user trust and data integrity.

Use cases are distributed across all six personas: Optimizer (Alex), Dabbler (Jordan), Privacy-First (Morgan), Neurodivergent (Riley), Biohacker (Sam), and Reflector (Casey). Each persona has unique error tolerance, communication preferences, and recovery expectations that shape how the system surfaces and resolves errors.

The Error Handling domain is unique in that it intersects with every other domain—habits, routines, workouts, nutrition, journaling, and mood tracking all generate potential error conditions. This document establishes consistent patterns for error detection, user communication, recovery flows, and gamification protection that apply across the entire application.

Key principles governing error handling in Insight 5.2:
1. **No data loss**: User input is always preserved, even when processing fails
2. **Graceful degradation**: Features fail gracefully with clear alternatives
3. **Persona-appropriate messaging**: Error communication matches user sophistication and emotional state
4. **Gamification protection**: Technical failures never break streaks or penalize users
5. **Recovery-first design**: Every error state has a clear path to resolution

---

## Table of Contents

1. [Voice Transcription Errors (UC-E001 to UC-E012)](#voice-transcription-errors) — 12 use cases
2. [Parse/Classification Failures (UC-E013 to UC-E024)](#parseclassification-failures) — 12 use cases
3. [Sync/Network Errors (UC-E025 to UC-E032)](#syncnetwork-errors) — 8 use cases
4. [Data Validation Errors (UC-E033 to UC-E036)](#data-validation-errors) — 4 use cases
5. [Conflict Resolution (UC-E037 to UC-E054)](#conflict-resolution) — 18 use cases
6. [API/Server Errors (UC-E055 to UC-E060)](#apiserver-errors) — 6 use cases
7. [Recovery Flows (UC-E061 to UC-E067)](#recovery-flows) — 7 use cases

---

## Voice Transcription Errors

### UC-E001: Inaudible Voice Capture with Noise (Optimizer)

#### 1. User Phrase/Scenario

Alex attempts to log a workout while at a busy gym. Background music, clanging weights, and nearby conversations overwhelm the microphone. The transcription returns: "Did [inaudible] for [inaudible] sets of [inaudible]." Alex expects the system to handle this gracefully and provide alternatives rather than simply failing silently or creating garbage data.

Voice variations and contexts where this error commonly occurs:
- Recording in noisy environment (gym, restaurant, street traffic)
- Wind noise during outdoor recording while running or cycling
- Overlapping voices in group fitness classes or team environments
- Echo in large indoor spaces like warehouses or parking garages
- Music playing from nearby speakers or headphones

The Optimizer persona has low tolerance for data quality issues and expects the system to clearly communicate what went wrong and offer immediate resolution paths. They would rather re-record or manually enter than have incorrect data pollute their tracking history.

#### 2. Data Model Mapping

**Created Entity (Draft):**

**VoiceCaptureError** (`capture_errors` table)
```typescript
{
  id: 'error-uuid',
  userId: 'user-id',
  captureId: 'original-capture-uuid',
  errorType: 'transcription_inaudible',
  errorSubtype: 'ambient_noise',
  rawAudioUri: 's3://insight/audio/uuid.m4a',
  audioDurationSeconds: 8.4,
  partialTranscript: 'Did [inaudible] for [inaudible] sets of [inaudible]',
  confidenceScore: 0.23,
  confidenceBreakdown: {
    speechRecognition: 0.31,
    noiseLevel: 0.18,
    clarity: 0.22
  },
  noiseProfile: {
    type: 'high_ambient',
    dominantFrequencies: [120, 440, 880],
    estimatedEnvironment: 'gym'
  },
  status: 'pending_retry',
  retryCount: 0,
  createdAt: Date.now(),
  expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days retention
}
```

No entities created in the main data model (entries, workout_sessions, etc.) until the transcription is resolved. The error record preserves the audio for retry and maintains audit trail.

#### 3. Parsing/Disambiguation Approach

Error detection employs multiple signals to identify transcription failures:

**Primary detection signals:**
- Confidence score below 0.60 threshold (system-wide minimum for auto-accept)
- Multiple `[inaudible]` markers (3+ indicates systemic failure vs isolated word)
- Word-level confidence variance exceeding 0.5 (some clear, some inaudible)
- Noise profile analysis detecting known problematic environments

**Classification logic:**
```typescript
function classifyTranscriptionError(result: TranscriptionResult): ErrorClassification {
  if (result.confidenceScore < 0.30 && result.inaudibleCount >= 3) {
    return { type: 'TRANSCRIPTION_FAILURE', subtype: 'ambient_noise', recoverable: true };
  }
  if (result.noiseProfile.type === 'high_ambient') {
    return { type: 'TRANSCRIPTION_FAILURE', subtype: 'environmental', recoverable: true };
  }
  // Additional classification rules...
}
```

System holds entry in draft state rather than creating partial data. Audio retained for retry with enhanced noise-cancellation processing. File reference: `supabase/functions/transcribe_and_parse_capture/error_handlers.ts:78`

#### 4. Gamification Impact

**XP and streak protection:**
- No XP awarded for failed captures—prevents gaming via garbage submissions
- Streak NOT broken because capture was attempted in good faith
- Technical failure is not user failure—system absorbs the impact
- Retry within 1 hour counts as same-day activity for streak purposes
- Grace period extended by 2 hours when transcription failures occur

**User messaging (Optimizer-appropriate):**
The messaging acknowledges the issue directly without being condescending:
- "Having trouble hearing you clearly in this environment. Noise levels are high."
- "Want to try again, use text input, or quick-log this workout?"
- Progress indicator shows: "Capture saved—tap to complete when you're in a quieter spot"

No penalty, no negative feedback, no shame for environmental factors outside user control. The system takes responsibility for its limitations.

#### 5. Architecture Solution

**Immediate response flow:**
1. Audio stored to S3 with 7-day retention for retry and support debugging
2. Real-time waveform visualization turns red/amber during high-noise segments as user speaks
3. Confidence meter shown during recording if below threshold
4. Recording auto-pauses with suggestion: "Very noisy—want to try text instead?"

**Alternative capture paths offered:**
- Quick-entry buttons for user's common workouts (learned from history)
- Text input fallback with voice-to-text keyboard
- "Try again" with countdown timer (3 seconds to prepare)
- Schedule reminder: "Remind me in 30 min to log this"

**Async recovery:**
- Background job attempts enhanced processing (noise cancellation, speaker isolation)
- Push notification if enhanced version succeeds: "We recovered your gym workout log—review it?"
- Deep link directly to draft entry with audio playback option
- User can approve, edit, or discard the recovered transcription

**File references:**
- Audio upload: `apps/insight-mobile/src/capture/AudioCapture.ts:234`
- Error handling: `supabase/functions/transcribe_and_parse_capture/noise_handler.ts:89`
- Recovery job: `supabase/functions/audio_recovery_worker/index.ts:45`

---

### UC-E002: Partial Voice Capture Due to Interruption (Dabbler)

#### 1. User Phrase/Scenario

Jordan is logging a meal while walking to their car after lunch. Mid-capture, an incoming phone call interrupts: "Had lunch at Chi—" (call notification appears, recording stops abruptly). Jordan takes the call and later wonders if the meal was logged. The Dabbler persona expects the system to "just work" without requiring them to remember what happened.

Interruption scenarios this use case covers:
- Incoming phone call (highest priority system interrupt)
- App backgrounded mid-capture (user switches apps accidentally or intentionally)
- Accidental stop button press (fat finger, gesture misfire)
- Phone locked during capture (timeout or accidental side button)
- Notification banner interaction that closes the recording view
- Memory pressure causing app to be killed by OS
- Battery saver mode aggressively suspending audio capture

The Dabbler has high tolerance for imperfection but low tolerance for losing their input entirely. They don't want to re-enter from scratch—any preserved fragment is valuable.

#### 2. Data Model Mapping

**Created Entity (Draft):**

**PartialCapture** (`partial_captures` table)
```typescript
{
  id: 'partial-uuid',
  userId: 'user-id',
  partialTranscript: 'Had lunch at Chi',
  rawAudioUri: 's3://insight/audio/partial-uuid.m4a',
  audioDurationSeconds: 2.3,
  captureStartedAt: 1705591200000,
  captureEndedAt: 1705591202300,
  interruptionReason: 'incoming_call',
  interruptionSource: 'system',
  deviceState: {
    batteryLevel: 0.67,
    networkType: 'wifi',
    freeMemoryMb: 412
  },
  completionSuggestions: [
    { text: 'Had lunch at Chipotle', confidence: 0.87, source: 'user_history' },
    { text: 'Had lunch at Chili\'s', confidence: 0.45, source: 'location_nearby' }
  ],
  status: 'awaiting_completion',
  promptedAt: null,
  completedAt: null,
  expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
}
```

**Suggestion generation logic:**
The system immediately generates completion suggestions based on:
- User history: Jordan has logged "Chipotle" 12 times, "Chili's" twice
- Location context: GPS shows near a Chipotle location
- Time of day: Lunch time, matching past meal patterns
- Partial text matching: "Chi" substring matches both options

#### 3. Parsing/Disambiguation Approach

**Interruption detection architecture:**
System-level event listeners detect interrupts across all platforms:

```typescript
// File: apps/insight-mobile/src/capture/InterruptionHandler.ts
const INTERRUPTION_HANDLERS = {
  'incoming_call': async (capture) => {
    await savePartialCapture(capture);
    scheduleCompletionPrompt(capture.id, { delay: 'after_call' });
  },
  'app_backgrounded': async (capture) => {
    await savePartialCapture(capture);
    scheduleCompletionPrompt(capture.id, { delay: 60000 }); // 1 minute
  },
  'memory_pressure': async (capture) => {
    await savePartialCapture(capture, { priority: 'critical' });
    // No prompt—app may be killed
  }
};
```

**Partial transcript analysis:**
- "Chi—" pattern matched against user's vocabulary
- Location API checked for nearby restaurants matching prefix
- Time-decay weighted history (recent logs weighted higher)
- Fuzzy matching accounts for common abbreviations

**Dabbler-friendly parsing principles:**
- Low confidence threshold (0.65) for accepting auto-completions
- Single-tap confirmation rather than typing
- No prompting for additional details unless ambiguous
- "Good enough" is the goal, not perfection

#### 4. Gamification Impact

**Streak and XP handling:**
- No XP for incomplete entries (prevents accidental partial submissions counting)
- Streak maintained because user initiated the capture—intent was there
- Completion prompt preserves the context: "Finish your lunch log?"
- If completed within 30 minutes: full XP awarded as if uninterrupted
- If completed same-day: 90% XP (minor freshness decay)
- If completed next-day: 75% XP (still worthwhile to complete)

**Dabbler-appropriate messaging:**
- No pressure, no guilt, no urgency
- "Whenever you're ready—your lunch log is waiting"
- Completion UI shows friendly preview: "Chipotle for lunch? 🌯"
- One-tap accept or simple edit affordance
- Option to discard without explanation required

#### 5. Architecture Solution

**Immediate preservation flow:**
1. App lifecycle listener (`AppState.addEventListener`) triggers on background/interrupt
2. Current audio buffer flushed to local storage immediately
3. Transcription of available audio initiated
4. Local SQLite record created with `status: 'interrupted'`
5. Sync queue marks entry as special (don't sync until resolved)

**Resume prompt logic:**
```typescript
// File: apps/insight-mobile/src/notifications/PartialCapturePrompt.ts
async function scheduleCompletionPrompt(captureId: string, options: PromptOptions) {
  if (options.delay === 'after_call') {
    // Listen for call end, then prompt
    CallDetector.onCallEnded(() => showCompletionUI(captureId));
  } else {
    // Scheduled delay
    setTimeout(() => {
      if (!await isCompleted(captureId)) {
        showCompletionUI(captureId);
      }
    }, options.delay);
  }
}
```

**Completion UI features:**
- Pre-filled suggestion (highest confidence option)
- One-tap accept: "Yes, Chipotle for lunch"
- Quick edit: Tap to change restaurant name
- Voice continuation: "Add more details" re-opens capture
- Discard: "Nevermind" clears without guilt

**File references:**
- Interruption handling: `apps/insight-mobile/src/capture/InterruptionHandler.ts:45`
- Completion UI: `apps/insight-mobile/src/components/PartialCaptureSheet.tsx:23`
- Prompt scheduling: `apps/insight-mobile/src/notifications/PartialCapturePrompt.ts:67`

---

### UC-E003: Accent/Dialect Misrecognition (Biohacker)

#### 1. User Phrase/Scenario

Sam, who has a regional Southern accent combined with rapid speech patterns common among biohackers reciting supplement stacks, says: "Took 500 milligrams of ashwagandha this morning with my stack." The transcription returns: "Took 500 milligrams of ash or ganda this morning with my stack." The supplement name is split incorrectly due to accent-influenced pronunciation.

This use case covers recognition challenges including:
- Regional accents (Southern, Boston, Midwest, British, Australian, etc.)
- Non-native English speakers with L1 interference patterns
- Medical and technical terminology pronounced with accent variations
- Brand name mispronunciations (common with supplements)
- Rapid speech patterns typical of users logging complex protocols
- Consonant cluster reductions (dropping sounds in blends)
- Vowel shifts that change word recognition

The Biohacker persona has low tolerance for supplement logging errors because accurate dosage tracking is essential for their N=1 experiments. A misrecognized supplement corrupts correlation analysis and undermines the entire quantified-self enterprise.

#### 2. Data Model Mapping

**Created Entities:**

**TranscriptionCorrection** (`transcription_corrections` table)
```typescript
{
  id: 'correction-uuid',
  userId: 'user-id',
  captureId: 'capture-uuid',
  originalTranscript: 'Took 500 milligrams of ash or ganda this morning with my stack',
  correctedTranscript: 'Took 500 milligrams of ashwagandha this morning with my stack',
  correctionType: 'supplement_name',
  correctionSpan: { start: 24, end: 35 },
  originalFragment: 'ash or ganda',
  correctedFragment: 'ashwagandha',
  correctionSource: 'auto_suggest_confirmed',
  contextSignals: [
    'supplement_domain_detected',
    'dosage_unit_present',
    'user_history_match',
    'time_of_day_pattern'
  ],
  suggestionConfidence: 0.92,
  learningApplied: true,
  userFeedback: 'accepted',
  createdAt: Date.now()
}
```

**After correction, NutritionLog created:**
```typescript
{
  id: 'nutrition-uuid',
  userId: 'user-id',
  title: 'Morning supplement stack',
  mealType: 'supplement',
  eatenAt: Date.now(),
  items: [
    {
      name: 'Ashwagandha',
      brand: null,
      quantity: 500,
      unit: 'mg',
      source: 'voice_corrected'
    }
  ],
  source: 'voice',
  correctionApplied: true
}
```

#### 3. Parsing/Disambiguation Approach

**Multi-signal correction pipeline:**

```typescript
// File: supabase/functions/transcribe_and_parse_capture/supplement_correction.ts
async function correctSupplementName(
  transcript: string,
  context: ParseContext
): Promise<CorrectionResult> {
  const corrections: Correction[] = [];

  // 1. Fuzzy match against supplement dictionary
  const fuzzyMatches = supplementDictionary.fuzzySearch(transcript, {
    maxDistance: 3,  // Levenshtein distance
    minScore: 0.75
  });

  // 2. Check user's supplement history
  const userSupplements = await getUserSupplementHistory(context.userId);
  const historyMatches = userSupplements.filter(s =>
    transcript.toLowerCase().includes(s.name.substring(0, 3).toLowerCase())
  );

  // 3. Context analysis
  const hasDosingPattern = /\d+\s*(mg|g|mcg|iu|ml)/i.test(transcript);
  const timeContext = extractTimeContext(transcript);

  // 4. Combined scoring
  const candidates = mergeCandidates(fuzzyMatches, historyMatches);
  const bestMatch = rankCandidates(candidates, {
    fuzzyWeight: 0.3,
    historyWeight: 0.4,
    contextWeight: 0.3,
    dosingBonus: hasDosingPattern ? 0.1 : 0
  });

  return {
    suggestion: bestMatch,
    confidence: bestMatch.score,
    autoApply: bestMatch.score > 0.90 && context.userPreferences.autoCorrect
  };
}
```

**Correction confidence thresholds:**
- Above 0.95: Auto-apply silently (user enabled auto-correct)
- 0.85-0.95: Show suggestion with one-tap accept
- 0.70-0.85: Show suggestion with confirmation required
- Below 0.70: Present multiple options or manual entry

**Biohacker-specific handling:**
- Supplement dictionary includes 2000+ compounds with common misspellings
- Phonetic matching accounts for accent-induced sound changes
- User's personal supplement vocabulary weighted heavily (40%)
- Dosage context ("500 milligrams") increases supplement classification confidence

#### 4. Gamification Impact

**XP and tracking integrity:**
- XP awarded only after entry confirmed or corrected
- No penalty for transcription errors (not user's fault)
- Correction feedback loop earns bonus: "Thanks for teaching me! +2 XP"
- Streak maintained throughout correction process
- Supplement stack XP calculated on final confirmed items

**Biohacker precision preservation:**
- Correlation analysis only includes confirmed/corrected data
- Uncorrected entries flagged as "low confidence" in analytics
- User can review all auto-corrections in settings
- Option to disable auto-correct for maximum control

**Learning incentive:**
- First correction of a new supplement: "Added to your vocabulary"
- Repeated corrections decrease over time (system learns)
- Monthly summary: "Transcription accuracy improved 12% this month"

#### 5. Architecture Solution

**Custom vocabulary system:**
```typescript
// File: apps/insight-mobile/src/vocabulary/UserVocabulary.ts
interface UserVocabularyEntry {
  term: string;
  category: 'supplement' | 'exercise' | 'food' | 'person' | 'place';
  phonetic: string[];  // Multiple pronunciation variants
  frequency: number;   // Times used
  lastUsed: number;
  corrections: CorrectionHistory[];
}

class UserVocabulary {
  async addFromCorrection(original: string, corrected: string, category: string) {
    // Learn that "ash or ganda" should be "ashwagandha"
    const phonetic = generatePhonetic(original);
    await this.upsert({
      term: corrected,
      category,
      phonetic: [...existing.phonetic, phonetic],
      frequency: existing.frequency + 1,
      lastUsed: Date.now()
    });
  }
}
```

**On-device pronunciation learning:**
- User-specific phonetic models stored locally
- Corrections feed into personalized speech recognition
- Privacy preserved: Pronunciation data never leaves device
- Sync only the term mappings, not audio/phonetic data

**API flow:**
```
POST /api/v1/transcription/feedback
{
  "captureId": "uuid",
  "original": "ash or ganda",
  "corrected": "ashwagandha",
  "category": "supplement",
  "confidence": 0.92
}
```

**UI components:**
- Inline correction: Underlined word with tap-to-fix
- Suggestion bubble: "Did you mean ashwagandha?"
- Quick accept: Single tap confirms
- Manual override: Long-press opens keyboard

**File references:**
- Supplement dictionary: `packages/shared/src/dictionaries/supplements.ts`
- Correction logic: `supabase/functions/transcribe_and_parse_capture/correction.ts:123`
- Vocabulary learning: `apps/insight-mobile/src/vocabulary/UserVocabulary.ts:45`

---

### UC-E004: Whisper/Low Volume Voice Capture (Reflector)

#### 1. User Phrase/Scenario

Casey is journaling late at night in bed while their partner sleeps nearby. Speaking in a whisper to avoid disturbing anyone, Casey reflects: "Feeling grateful for today's quiet moments... [whisper becomes inaudible] ...and hoping tomorrow brings clarity." The transcription captures fragments but misses crucial middle content due to extremely low input volume.

Quiet capture scenarios this use case addresses:
- Late-night journaling in shared sleeping spaces
- Recording in public spaces where discretion is desired (library, waiting room)
- Emotional moments where voice naturally softens (grief, vulnerability)
- Recording while fatigued with reduced vocal energy
- Meditation or breathwork logging with intentionally soft speech
- ASMR-style gentle self-talk during reflection
- Hospital or care facility environments requiring quiet

The Reflector persona prioritizes the preservation of emotional content above all else. Every word carries meaning in their reflective practice. Losing parts of an entry feels like losing pieces of their inner life.

#### 2. Data Model Mapping

**Low Confidence Capture Record:**

```typescript
{
  captureId: 'capture-uuid',
  userId: 'user-id',
  transcript: 'Feeling grateful for today [unclear] moments [unclear] and hoping tomorrow brings clarity',
  rawAudioUri: 's3://insight/audio/capture-uuid.m4a',
  audioMetrics: {
    averageVolumeDb: -42,  // Very low (normal speech: -20 to -10)
    peakVolumeDb: -35,
    noiseFloorDb: -50,
    signalToNoiseRatio: 8  // Poor (good is 20+)
  },
  confidenceScore: 0.51,
  uncertainSegments: [
    { start: 3.2, end: 5.1, text: '[unclear]', confidence: 0.22 },
    { start: 6.8, end: 8.4, text: '[unclear]', confidence: 0.28 }
  ],
  suggestedAction: 'amplification_retry',
  emotionalContext: {
    detected: true,
    primaryEmotion: 'gratitude',
    intensity: 'moderate',
    sensitivity: 'high'
  },
  status: 'review_suggested',
  preserveAudio: true
}
```

**Draft journal entry:**
```typescript
{
  id: 'journal-draft-uuid',
  status: 'draft',
  title: 'Evening Reflection',
  bodyMarkdown: 'Feeling grateful for today [unclear] moments [unclear] and hoping tomorrow brings clarity',
  rawText: null,  // Will be set after review
  wordCount: 11,  // Partial
  hasUnclearSegments: true,
  unclearSegmentCount: 2,
  emotionalSensitivity: 'high',
  createdAt: Date.now()
}
```

#### 3. Parsing/Disambiguation Approach

**Volume analysis pipeline:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/volume_analysis.ts
function analyzeAudioVolume(audioBuffer: AudioBuffer): VolumeAnalysis {
  const rms = calculateRMS(audioBuffer);
  const dbFS = 20 * Math.log10(rms);

  if (dbFS < -35) {
    return {
      classification: 'very_low',
      recommendations: ['amplification', 'noise_reduction'],
      confidenceImpact: 'severe',
      retryLikelihood: 0.6  // 60% chance better processing helps
    };
  }
  // Additional volume classifications...
}
```

**Adaptive gain processing:**
- Input below -35dB triggers automatic gain boost
- Noise gate tuned for whisper frequencies (higher threshold)
- Spectral subtraction removes ambient noise
- Multiple processing passes attempted in background

**Gentle notification strategy (Reflector-appropriate):**
- No alarming error messages during vulnerable moments
- Quiet visual indicator: Subtle highlight on unclear words
- Optional notification: "Some words were quiet—review when ready?"
- No interruption of journaling flow—complete the thought first

**Preserve over perfect:**
- Partial transcript saved immediately
- Audio retained for manual playback and self-transcription
- User can fill in gaps by listening to their own recording
- Never auto-discard content—everything precious

#### 4. Gamification Impact

**Minimal visible gamification (Reflector preferences):**
- Journal saved as draft counts for streak maintenance
- XP calculated but applied invisibly when finalized
- No celebration animations during emotional moments
- No pop-ups, no fanfare, just quiet confirmation

**Content preservation priority:**
- Entry exists in drafts regardless of transcription quality
- Streak protected: "You showed up to reflect—that's what matters"
- Word count based on clear segments (partial credit)
- Completion not required for streak—starting is enough

**Emotional sensitivity handling:**
- If emotional content detected, reduce all notifications
- No "Your entry was unclear" messaging (feels like criticism)
- Instead: "Your reflection is saved. Review anytime."
- Recovery prompts delayed until next natural break (next day)

#### 5. Architecture Solution

**Recording UI adaptations:**
```typescript
// File: apps/insight-mobile/src/capture/VolumeMonitor.tsx
function VolumeMonitor({ threshold = -35 }: Props) {
  const [volume, setVolume] = useState(-60);

  // Subtle visual feedback during recording
  return (
    <View style={styles.container}>
      <VolumeMeter
        level={volume}
        lowThreshold={threshold}
        // Calm colors: no red, gentle amber for low volume
        colors={{ low: '#F5A623', normal: '#7ED321', high: '#7ED321' }}
      />
      {volume < threshold && (
        <Text style={styles.hint}>
          Speaking softly—that's okay, we'll do our best
        </Text>
      )}
    </View>
  );
}
```

**Post-capture options:**
- Review entry with audio playback
- Fill-in-the-blank interface for unclear segments
- Listen and type the missing words
- Accept partial entry as-is
- Schedule review reminder for morning

**Privacy considerations:**
- Low-volume mode assumed to indicate high-privacy context
- Audio stored with enhanced encryption
- Shorter retention period offered (24 hours vs 7 days)
- No cloud processing suggested—keep local if preferred

**Emotional content handling:**
- Gratitude language detected: Entry tagged for "On This Day" feature
- Processing language detected: Therapist resource link available but not prominent
- Crisis keywords trigger gentle resource offering (separate use case)

**File references:**
- Volume analysis: `supabase/functions/transcribe_and_parse_capture/volume_analysis.ts:34`
- Recording UI: `apps/insight-mobile/src/capture/VolumeMonitor.tsx:12`
- Draft saving: `apps/insight-mobile/src/storage/journalDrafts.ts:78`

---

### UC-E005: Multiple Speakers Confusion (Optimizer)

#### 1. User Phrase/Scenario

Alex is logging a workout summary while chatting with a gym buddy. Mid-capture, the friend interjects: "Just finished my push day—yeah I'll be right there, just give me a sec—did bench press 225 for 4 sets of 8." The recording picks up both Alex's workout log and the friend's conversation, creating a confusing transcript that mixes the two voices.

Multi-speaker scenarios this use case covers:
- Gym logging while socializing with workout partners
- Meal logging while dining with family/friends
- Work logging during meetings or casual office chat
- Logging while on speakerphone with someone
- Recording in households with ambient family conversation
- Public space logging with nearby stranger conversations
- Podcasts, TV, or video playing in background (human voices)

The Optimizer persona expects the system to intelligently separate their voice from others and extract only the relevant log content. They want their workout data to be clean and accurate, not polluted with fragments of other people's conversations.

#### 2. Data Model Mapping

**Speaker Diarization Result:**

```typescript
{
  captureId: 'capture-uuid',
  userId: 'user-id',
  diarizationResult: {
    speakersDetected: 2,
    segments: [
      {
        speakerId: 'primary',
        start: 0.0,
        end: 2.5,
        text: 'Just finished my push day',
        confidence: 0.92,
        voiceProfileMatch: 0.94
      },
      {
        speakerId: 'secondary',
        start: 2.5,
        end: 4.1,
        text: 'yeah I will be right there just give me a sec',
        confidence: 0.78,
        voiceProfileMatch: 0.12  // Not the user
      },
      {
        speakerId: 'primary',
        start: 4.1,
        end: 8.2,
        text: 'did bench press 225 for 4 sets of 8',
        confidence: 0.91,
        voiceProfileMatch: 0.96
      }
    ],
    primarySpeakerConfidence: 0.94
  },
  filteredTranscript: 'Just finished my push day did bench press 225 for 4 sets of 8',
  originalTranscript: 'Just finished my push day yeah I will be right there just give me a sec did bench press 225 for 4 sets of 8',
  filteringApplied: true
}
```

**Workout log created from filtered content:**
```typescript
{
  id: 'workout-uuid',
  title: 'Push Day',
  workoutType: 'strength',
  exercises: [
    {
      exerciseName: 'Bench Press',
      normalizedName: 'bench_press',
      sets: [
        { weight: 225, reps: 8 },
        { weight: 225, reps: 8 },
        { weight: 225, reps: 8 },
        { weight: 225, reps: 8 }
      ]
    }
  ],
  source: 'voice_filtered',
  multiSpeakerHandled: true
}
```

#### 3. Parsing/Disambiguation Approach

**Speaker diarization pipeline:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/diarization.ts
async function separateSpeakers(audio: AudioBuffer, userProfile: VoiceProfile): DiarizationResult {
  // 1. Run speaker diarization model
  const segments = await diarizationModel.process(audio);

  // 2. Match each segment to user's voice profile
  for (const segment of segments) {
    const similarity = await compareVoiceProfile(
      segment.voiceFeatures,
      userProfile
    );
    segment.isPrimaryUser = similarity > 0.85;
  }

  // 3. Extract only primary user segments
  const primarySegments = segments.filter(s => s.isPrimaryUser);

  // 4. Reconstruct coherent transcript
  const filtered = reconstructTranscript(primarySegments, {
    preserveContextualCoherence: true,
    fillGaps: false  // Don't interpolate
  });

  return { segments, filteredTranscript: filtered };
}
```

**Voice profile system:**
- Created during onboarding with 30-second enrollment
- Updated continuously from confirmed single-speaker captures
- Stores acoustic features: pitch, timbre, speaking rate, accent markers
- Privacy: Voice profile never leaves device; only comparison scores sent

**Contextual coherence checking:**
- Filtered transcript validated for grammatical flow
- Domain-specific coherence: "bench press 225" relates to "push day"
- Disconnected fragments flagged for review
- High-confidence filtering: Present as final; low-confidence: Show options

#### 4. Gamification Impact

**XP calculation on coherent content only:**
- Workout XP based on filtered/confirmed data
- Interrupted segments don't count against or for
- Clean extraction: Normal XP as if single-speaker
- Confusion requiring resolution: XP pending until resolved

**Optimizer transparency:**
- Show filtered vs original option in entry details
- "We filtered out another speaker" disclosure
- Option to include secondary speaker (couples logging together)
- Accuracy metrics: "Voice separation confidence: 94%"

**Learning and improvement:**
- User corrections improve voice profile
- Repeated corrections from same environment adapt thresholds
- Achievement: "Clear Communicator" for consistently clean captures

#### 5. Architecture Solution

**Real-time speaker detection:**
```typescript
// File: apps/insight-mobile/src/capture/SpeakerDetection.tsx
function useSpeakerDetection() {
  const [speakerStatus, setSpeakerStatus] = useState<'single' | 'multiple'>('single');

  useEffect(() => {
    const detector = new RealTimeSpeakerDetector({
      userProfile: loadUserVoiceProfile(),
      onMultipleSpeakers: () => {
        setSpeakerStatus('multiple');
        // Visual indicator: "Multiple voices detected"
      }
    });
    return () => detector.stop();
  }, []);

  return speakerStatus;
}
```

**UI options for multi-speaker captures:**
- Default: Auto-filter to primary speaker, show as final
- Review mode: Show full transcript with speaker highlighting
- Manual selection: Tap to include/exclude segments
- "Include all" mode: For intentional multi-person logs (family meal)

**Settings for shared contexts:**
- "Gym buddy mode": Less aggressive filtering during social workouts
- "Solo mode": Maximum filtering, treat all other voices as noise
- Per-place settings: Living room = shared, home office = solo

**File references:**
- Diarization: `supabase/functions/transcribe_and_parse_capture/diarization.ts:45`
- Voice profile: `apps/insight-mobile/src/voice/VoiceProfile.ts:23`
- Real-time detection: `apps/insight-mobile/src/capture/SpeakerDetection.tsx:12`

---

### UC-E006: Homophones and Context Errors (Neurodivergent)

#### 1. User Phrase/Scenario

Riley is doing a quick mood check-in after a distracted morning and says: "Feeling really board today, just can't focus on anything." The transcription correctly captures "board" (phonetically accurate) but the context clearly indicates "bored" (the emotion). This type of error can feel embarrassing or frustrating for neurodivergent users who may already struggle with written communication and don't want the app to highlight their mistakes.

Homophone and context error scenarios:
- "Their/there/they're" confusion in any context
- "To/too/two" errors especially in tracking contexts ("too tired" vs "to tired")
- "Weight/wait" in fitness logging ("can't wait to workout" vs "weight workout")
- "Weak/week" in temporal expressions ("feeling weak this week")
- "Affect/effect" in mood and causation descriptions
- "Break/brake" in activity logging
- "Site/sight/cite" in work logging
- Domain-specific homophones causing tracking errors

The Neurodivergent persona has high tolerance for imperfection but appreciates systems that handle mistakes gracefully without drawing attention to them. They want the system to "get it" without making them feel self-conscious about spelling or word choice.

#### 2. Data Model Mapping

**Silent Context Correction:**

```typescript
{
  correctionId: 'correction-uuid',
  captureId: 'capture-uuid',
  correctionType: 'homophone_context',
  original: {
    word: 'board',
    position: 14,
    confidence: 0.89  // ASR was confident in what it heard
  },
  corrected: {
    word: 'bored',
    confidence: 0.94  // Context correction confidence
  },
  contextSignals: {
    sentimentCategory: 'emotion_expression',
    precedingWords: ['feeling', 'really'],
    followingWords: ['today', 'just', 'can\'t', 'focus'],
    domainMatch: 'mood_tracking',
    emotionVocabularyMatch: 'bored'
  },
  correctionVisibility: 'silent',  // Don't highlight to user
  userNotified: false,
  correctionAccuracy: null  // Unknown until implicit/explicit feedback
}
```

**Mood entry created with correct word:**
```typescript
{
  id: 'mood-uuid',
  overallRating: null,  // Not explicitly rated
  emotions: ['bored'],  // Corrected word used
  context: "Feeling really bored today, just can't focus on anything",
  inferredFromProse: true,
  correctionApplied: true,
  source: 'voice'
}
```

#### 3. Parsing/Disambiguation Approach

**Contextual homophone resolution:**
```typescript
// File: packages/shared/src/parsing/homophone_resolver.ts
const HOMOPHONE_RULES: HomophoneRule[] = [
  {
    sounds: ['board', 'bored'],
    resolveBy: 'context',
    contextRules: [
      {
        pattern: /feeling\s+(really\s+)?(\w+)/i,
        capture: 2,  // The word after "feeling"
        prefer: 'bored',
        confidence: 0.95
      },
      {
        pattern: /on\s+the\s+(\w+)/i,
        prefer: 'board',
        confidence: 0.90
      }
    ]
  },
  {
    sounds: ['to', 'too', 'two'],
    resolveBy: 'grammar',
    grammarRules: [
      { pattern: /(\w+)\s+to\s+(\w+)/, checkVerb: true, prefer: 'to' },
      { pattern: /too\s+(tired|much|many|little)/, prefer: 'too' },
      { pattern: /two\s+(of|times|days|hours)/, prefer: 'two' }
    ]
  }
  // Additional homophone rules...
];

function resolveHomophone(word: string, context: string): Resolution {
  const rule = HOMOPHONE_RULES.find(r => r.sounds.includes(word));
  if (!rule) return { word, changed: false };

  for (const contextRule of rule.contextRules) {
    if (contextRule.pattern.test(context)) {
      return {
        word: contextRule.prefer,
        changed: contextRule.prefer !== word,
        confidence: contextRule.confidence
      };
    }
  }
  return { word, changed: false };
}
```

**Silent correction principles:**
- Corrections applied when confidence > 0.90
- User never sees "Did you mean...?" for obvious fixes
- Original preserved in audit log but not shown
- Displayed text shows corrected version seamlessly

**Neurodivergent-sensitive handling:**
- No embarrassing highlights or underlines
- No error counts or correction statistics shown
- Corrections feel like the app "understood" not "fixed"
- Review mode available but opt-in, not default

#### 4. Gamification Impact

**Frictionless tracking:**
- Mood logged correctly without any user correction needed
- XP awarded for successful mood check-in
- Streak maintained
- No cognitive load added for spelling considerations

**Invisible accuracy improvement:**
- System learns user's common patterns
- Corrections become more accurate over time
- No explicit training required from user
- Background learning from implicit feedback (user doesn't re-edit)

**Focus on content, not mechanics:**
- Gamification rewards showing up, not spelling correctly
- "Consistent tracker" achievements based on entries, not accuracy
- Neurodivergent users celebrated for building habits

#### 5. Architecture Solution

**Context-aware post-processing:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/post_processor.ts
async function postProcessTranscript(transcript: string, context: ParseContext): ProcessedTranscript {
  let processed = transcript;
  const corrections: Correction[] = [];

  // 1. Homophone resolution
  const words = tokenize(processed);
  for (const word of words) {
    const resolution = resolveHomophone(word.text, processed);
    if (resolution.changed && resolution.confidence > 0.90) {
      processed = replaceWord(processed, word.position, resolution.word);
      corrections.push({
        type: 'homophone',
        original: word.text,
        corrected: resolution.word,
        visibility: 'silent'
      });
    }
  }

  // 2. Domain-specific corrections
  processed = applyDomainCorrections(processed, context.domain);

  // 3. Grammar smoothing (subtle fixes)
  processed = smoothGrammar(processed, { conservative: true });

  return { text: processed, corrections };
}
```

**No correction UI for silent fixes:**
- Corrected text displayed as if it was always correct
- No strikethrough, no highlighted changes
- Review option buried in settings for those who want it
- Correction history available but not surfaced

**User preference system:**
- "Show me corrections" toggle (default: off)
- "I prefer my exact words" option disables all silent corrections
- Per-category settings (fix mood words, leave journal raw)

**File references:**
- Homophone resolver: `packages/shared/src/parsing/homophone_resolver.ts:23`
- Post-processor: `supabase/functions/transcribe_and_parse_capture/post_processor.ts:45`
- Correction settings: `apps/insight-mobile/src/settings/CorrectionPreferences.tsx:12`

---

### UC-E007: Language Switching Mid-Capture (Privacy-First)

#### 1. User Phrase/Scenario

Morgan, who is bilingual English-French, naturally code-switches during a work reflection: "Had a great meeting with Jean-Pierre—c'était très productif—and scheduled the follow-up for next week." The capture contains both English and French segments reflecting Morgan's natural communication style. The system must handle this gracefully without mangling either language.

Multilingual capture scenarios:
- Natural code-switching between two primary languages
- Borrowed words or phrases from another language ("c'est la vie" in English context)
- Names, places, and proper nouns in non-primary language
- Technical terms that exist only in one language
- Emotional expressions that feel more natural in native language
- Family conversations mixing household languages
- Professional contexts mixing business language with native tongue

The Privacy-First persona has concerns about language data being used for profiling or shared with third parties. They want multilingual support but with guarantees that this data, which may reveal cultural or national identity, remains private.

#### 2. Data Model Mapping

**Multilingual Capture Result:**

```typescript
{
  captureId: 'capture-uuid',
  userId: 'user-id',
  languageAnalysis: {
    primaryLanguage: 'en',
    secondaryLanguages: ['fr'],
    codeSwitching: true,
    segments: [
      {
        start: 0.0,
        end: 3.2,
        language: 'en',
        text: 'Had a great meeting with Jean-Pierre',
        confidence: 0.96
      },
      {
        start: 3.2,
        end: 5.1,
        language: 'fr',
        text: "c'était très productif",
        confidence: 0.94
      },
      {
        start: 5.1,
        end: 7.4,
        language: 'en',
        text: 'and scheduled the follow-up for next week',
        confidence: 0.97
      }
    ]
  },
  unifiedTranscript: "Had a great meeting with Jean-Pierre—c'était très productif—and scheduled the follow-up for next week",
  preserveCodeSwitching: true,
  translationAvailable: true,
  translationConsent: null  // Not yet requested
}
```

**Event created with mixed-language body:**
```typescript
{
  id: 'event-uuid',
  title: 'Meeting with Jean-Pierre',
  bodyMarkdown: "Had a great meeting with Jean-Pierre—c'était très productif—and scheduled the follow-up for next week",
  people: ['jean_pierre'],  // Extracted despite French name
  languages: ['en', 'fr'],
  translateOnDemand: true,
  originalPreserved: true
}
```

#### 3. Parsing/Disambiguation Approach

**Language detection and segmentation:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/multilingual.ts
async function processMultilingual(audio: AudioBuffer, userLanguages: string[]): MultilingualResult {
  // 1. Language identification per segment
  const segments = await languageIdentifier.segment(audio);

  // 2. Transcribe each segment with appropriate model
  for (const segment of segments) {
    const model = getTranscriptionModel(segment.language);
    segment.text = await model.transcribe(segment.audio);
  }

  // 3. Reconstruct unified transcript preserving language flow
  const unified = segments
    .sort((a, b) => a.start - b.start)
    .map(s => s.text)
    .join(' ');

  // 4. Entity extraction across languages
  const entities = await extractEntitiesMultilingual(segments);

  return { segments, unified, entities };
}
```

**Cross-language entity extraction:**
- Person names: "Jean-Pierre" recognized as @person despite French origin
- Dates/times: Handle "mardi" (French Tuesday) and "Tuesday" equivalently
- Locations: "Paris" recognized whether spoken in English or French pronunciation
- Meeting terms: "réunion," "meeting" both map to event type

**Privacy-First language handling:**
- All processing on-device when possible
- Language detection does not profile user for targeting
- Multilingual data not shared with analytics
- User controls which languages are enabled

#### 4. Gamification Impact

**Normal XP for successful capture:**
- Language complexity doesn't affect XP calculation
- Event logged successfully = standard event XP
- Bilingual users not penalized for natural speech
- No bonus XP for multilingual (avoid gamifying identity)

**Language preference learning:**
- System learns which languages user commonly uses
- Improves transcription model selection over time
- User can explicitly set language preferences in settings

#### 5. Architecture Solution

**Multi-language model loading:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/model_selector.ts
const LANGUAGE_MODELS = {
  'en': 'whisper-large-v3-en',
  'fr': 'whisper-large-v3-fr',
  'es': 'whisper-large-v3-es',
  // ... additional languages
  'multilingual': 'whisper-large-v3-multilingual'
};

async function selectModel(audio: AudioBuffer, userLanguages: string[]): Model {
  if (userLanguages.length === 1) {
    return loadModel(LANGUAGE_MODELS[userLanguages[0]]);
  }

  // Multi-language user: Use multilingual model
  return loadModel(LANGUAGE_MODELS['multilingual']);
}
```

**UI language handling:**
- Mixed-language text displays naturally
- Optional inline translation toggle
- Translation appears below original, not replacing it
- Right-to-left languages handled for display

**Privacy settings:**
- "Keep my languages private" option
- Language data excluded from any shared analytics
- On-device language detection preferred
- Cloud processing consent explicit per language

**File references:**
- Multilingual processor: `supabase/functions/transcribe_and_parse_capture/multilingual.ts:34`
- Model selector: `supabase/functions/transcribe_and_parse_capture/model_selector.ts:12`
- Language settings: `apps/insight-mobile/src/settings/LanguagePreferences.tsx:45`

---

### UC-E008: Voice Capture Timeout (Dabbler)

#### 1. User Phrase/Scenario

Jordan starts a voice log for morning activities, gets distracted by a notification, and trails off: "So today I had breakfast and then went to the gym and..." After 8 seconds of silence, the 30-second auto-timeout triggers, stopping the capture before Jordan finished the thought. The Dabbler expects the system to save what was captured and offer an easy way to continue.

Timeout scenarios this use case covers:
- Mid-capture distraction (notification, someone talking to user)
- Thinking pause that extends beyond timeout threshold
- User forgets they're recording and goes silent
- Phone put down while still recording
- User expected shorter timeout and stopped early
- Recording continues but user finished speaking (didn't hit stop)
- Multi-tasking pauses during logging

The Dabbler persona has high tolerance for partial captures but low tolerance for lost work. They expect the system to be forgiving of their scattered attention and make it easy to continue without starting over.

#### 2. Data Model Mapping

**Timeout Capture Record:**

```typescript
{
  captureId: 'capture-uuid',
  userId: 'user-id',
  transcript: 'So today I had breakfast and then went to the gym and',
  rawAudioUri: 's3://insight/audio/capture-uuid.m4a',
  audioDurationSeconds: 22,  // 22 seconds of audio
  speechDurationSeconds: 14, // 14 seconds of actual speech
  silenceDuration: {
    lastSilenceStart: 14.0,  // Silence began at 14s
    lastSilenceDuration: 8.0  // 8 seconds of silence triggered timeout
  },
  timeoutReason: 'silence_threshold',
  status: 'timeout_incomplete',
  parsedEntities: [
    { type: 'event', title: 'Had breakfast', confidence: 0.88 },
    { type: 'event', title: 'Went to the gym', confidence: 0.91 }
  ],
  completable: true,
  continuationPrompt: 'What else did you do?'
}
```

**Draft entries created for detected activities:**
```typescript
[
  {
    id: 'breakfast-draft',
    type: 'event',
    title: 'Breakfast',
    status: 'draft',
    source: 'voice_partial'
  },
  {
    id: 'gym-draft',
    type: 'event',
    title: 'Gym workout',
    status: 'draft',
    source: 'voice_partial',
    detailsNeeded: true
  }
]
```

#### 3. Parsing/Disambiguation Approach

**Timeout detection logic:**
```typescript
// File: apps/insight-mobile/src/capture/TimeoutHandler.ts
const TIMEOUT_CONFIG = {
  maxDuration: 30000,         // 30 second total limit
  silenceThreshold: 8000,     // 8 seconds of silence triggers early stop
  silenceLevel: -45,          // dB threshold for "silence"
  warningSilenceThreshold: 5000  // Warn at 5 seconds of silence
};

function handleTimeout(capture: ActiveCapture, reason: TimeoutReason) {
  // 1. Stop recording
  capture.stop();

  // 2. Analyze what was captured
  const entities = parsePartialTranscript(capture.transcript);

  // 3. Determine completeness
  const trailing = endsWithIncompletePhrase(capture.transcript);

  // 4. Create appropriate draft entries
  if (entities.length > 0) {
    createDraftEntries(entities, { source: 'timeout' });
  }

  // 5. Offer continuation
  if (trailing) {
    showContinuationPrompt(capture);
  }
}
```

**Incomplete phrase detection:**
- Trailing "and" suggests more items coming
- Trailing prepositions indicate incomplete thought
- Sentence fragment analysis
- Domain context: "went to the gym and" suggests workout details coming

**Dabbler-friendly response:**
- Show what was captured as confirmation
- Offer one-tap to add more
- Don't require completion to save

#### 4. Gamification Impact

**Partial credit model:**
- Each detected activity: Eligible for XP when confirmed
- Confirmation can be one-tap (accept parsed events)
- Continuation adds more activities, more XP
- No penalty for timeout—not user's fault

**Streak protection:**
- Partial capture with any activity = streak maintained
- Even draft entries count as engagement
- System errs on side of streak preservation

**Encouraging completion:**
- "Almost there! Tap to add gym details" (positive framing)
- Completion bonus: +5 XP for finishing a timeout capture
- No shame for leaving as partial

#### 5. Architecture Solution

**Configurable timeout settings:**
```typescript
// File: apps/insight-mobile/src/settings/CaptureSettings.ts
interface TimeoutSettings {
  maxDuration: number;    // 30s, 60s, 120s options
  silenceTimeout: number; // 5s, 8s, 15s, or disabled
  showCountdown: boolean; // Visual timer during recording
  vibratWarning: boolean; // Haptic at 5s remaining
}

// Dabbler default profile
const DABBLER_TIMEOUT_DEFAULTS: TimeoutSettings = {
  maxDuration: 30000,
  silenceTimeout: 8000,
  showCountdown: true,
  vibrateWarning: true
};
```

**Continuation UI:**
```typescript
// File: apps/insight-mobile/src/components/ContinuationSheet.tsx
function ContinuationSheet({ capture }: Props) {
  return (
    <Sheet>
      <Title>Capture ended</Title>
      <Preview>
        So today I had breakfast and then went to the gym and...
      </Preview>

      <ParsedItems>
        <Item icon="🍳" label="Breakfast" onConfirm={() => confirm('breakfast')} />
        <Item icon="🏋️" label="Gym workout" onConfirm={() => confirm('gym')} />
      </ParsedItems>

      <Actions>
        <Button primary onPress={continueRecording}>
          Add more
        </Button>
        <Button onPress={saveAsDraft}>
          Save what I have
        </Button>
        <Button subtle onPress={discard}>
          Discard
        </Button>
      </Actions>
    </Sheet>
  );
}
```

**Smart continuation:**
- "Add more" reopens recording, appends to transcript
- Context preserved: System knows "and..." was trailing
- Final parsing combines all segments
- No re-parsing of already confirmed items

**File references:**
- Timeout handler: `apps/insight-mobile/src/capture/TimeoutHandler.ts:23`
- Capture settings: `apps/insight-mobile/src/settings/CaptureSettings.ts:45`
- Continuation UI: `apps/insight-mobile/src/components/ContinuationSheet.tsx:12`

---

### UC-E009: Background App Audio Interference (Biohacker)

#### 1. User Phrase/Scenario

Sam tries to log a morning supplement stack while listening to a biohacking podcast for the walk to work. The recording captures both Sam's voice ("Morning supplements: 500mg lion's mane") and podcast audio ("...studies show that intermittent fasting..."), creating a confusing transcript that mixes the two audio sources.

Background audio interference scenarios:
- Podcast/audiobook playing during capture
- Music with lyrics interfering with speech recognition
- Video content playing on device or nearby screen
- Phone on speaker during call (other party's audio)
- Navigation app voice directions interrupting
- Smart speaker responding to trigger word
- TV/radio in background with speech content

The Biohacker persona logs frequently throughout the day, often while consuming educational content. They expect the system to intelligently separate their voice from background media without requiring them to pause everything first.

#### 2. Data Model Mapping

**Audio Interference Detection:**

```typescript
{
  captureId: 'capture-uuid',
  userId: 'user-id',
  interferenceAnalysis: {
    detected: true,
    type: 'media_playback',
    source: 'podcast',  // Detected audio signature of podcast format
    interferenceLevel: 'moderate',  // Quantified overlap impact
    segments: {
      voiceSegments: [
        { start: 0, end: 1.2, confidence: 0.92 },
        { start: 3.4, end: 5.8, confidence: 0.89 }
      ],
      interferenceSegments: [
        { start: 1.2, end: 3.4, confidence: 0.76 },
        { start: 5.8, end: 7.2, confidence: 0.71 }
      ]
    }
  },
  rawTranscript: 'Morning supplements 500 studies show that intermittent fasting mg lion mane',
  cleanedTranscript: 'Morning supplements 500mg lion mane',
  cleanupConfidence: 0.82
}
```

**Supplement log after cleanup:**
```typescript
{
  id: 'nutrition-uuid',
  title: 'Morning supplements',
  mealType: 'supplement',
  items: [
    { name: "Lion's Mane", quantity: 500, unit: 'mg' }
  ],
  source: 'voice_filtered',
  interferenceFiltered: true
}
```

#### 3. Parsing/Disambiguation Approach

**Audio source separation:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/source_separation.ts
async function separateAudioSources(audio: AudioBuffer): SourceSeparationResult {
  // 1. Detect media playback signature
  const mediaSignature = detectMediaAudio(audio);
  // Podcasts have consistent EQ, compression, single speaker patterns

  // 2. Apply source separation model
  const separated = await sourceSeparationModel.process(audio, {
    targetVoice: 'closest_to_mic',  // Assume user is closest
    rejectPatterns: ['broadcast_audio', 'music', 'synthetic_speech']
  });

  // 3. Transcribe only primary voice channel
  const cleanTranscript = await transcribe(separated.primaryVoice);

  // 4. Validate domain coherence
  const coherenceScore = validateSupplementDomain(cleanTranscript);

  return { cleanTranscript, coherenceScore };
}
```

**Proactive detection and prevention:**
- System detects media playback via audio session info (iOS/Android)
- Pre-capture warning: "Media playing—pause for better accuracy?"
- One-tap pause button that resumes after capture
- Option: Auto-pause media during voice capture (preference)

**Biohacker expectation:**
- System should handle this without user intervention
- Technical solution preferred over behavioral change request
- Accuracy of supplement logging is critical for experiments

#### 4. Gamification Impact

**XP for successful extraction:**
- Cleaned transcript still earns XP
- Supplement logging XP as normal if items parsed correctly
- No penalty for interference—system handled it

**Accuracy tracking:**
- Biohacker dashboard shows capture quality metrics
- "Clean captures" vs "filtered captures" statistics
- Encouragement: "Your captures are 94% clean this week"

#### 5. Architecture Solution

**Auto-ducking feature:**
```typescript
// File: apps/insight-mobile/src/capture/MediaControl.ts
async function handleCaptureStart() {
  const settings = await getCaptureSettings();

  if (settings.autoPauseMedia) {
    // Pause any playing media
    const mediaSession = await AudioSession.getActive();
    if (mediaSession.isPlaying) {
      await mediaSession.pause();
      registerResumeOnCaptureEnd(mediaSession);
    }
  }
}

async function handleCaptureEnd() {
  // Resume previously playing media
  const pending = getResumeQueue();
  for (const session of pending) {
    await session.resume();
  }
}
```

**Real-time interference indicator:**
- Waveform visualization shows dual signals when detected
- Color coding: User voice = green, interference = red
- "Interference detected" badge with suggestion

**Settings options:**
- Auto-pause media: On/Off (Biohacker might want Off if confident in separation)
- Sensitivity: Low (ignore background), Medium (warn), High (always pause)
- Per-app settings: Pause podcasts but not music

**File references:**
- Source separation: `supabase/functions/transcribe_and_parse_capture/source_separation.ts:34`
- Media control: `apps/insight-mobile/src/capture/MediaControl.ts:23`
- Interference UI: `apps/insight-mobile/src/components/InterferenceIndicator.tsx:12`

---

### UC-E010: Dictation Speed Mismatch (Optimizer)

#### 1. User Phrase/Scenario

Alex speaks very quickly while logging multiple activities: "Didtheworkouthadbreakfasttookthesupplementsfeeling great energy 9 out of 10." Words run together at 240+ words per minute, exceeding typical transcription accuracy thresholds. The system must parse this rapid-fire input and extract multiple entities despite the speech pattern.

Fast speech scenarios:
- Power users logging multiple items quickly (efficiency)
- Speaking while walking/exercising (natural speed increase)
- Routine logging that user has done hundreds of times
- Impatience with recording process
- Cognitive processing faster than careful enunciation
- Batch logging several activities at once
- Time pressure situations

The Optimizer persona values efficiency and expects the system to keep up with their pace. They don't want to artificially slow down for the technology—the technology should adapt to them.

#### 2. Data Model Mapping

**Speed Analysis Record:**

```typescript
{
  captureId: 'capture-uuid',
  userId: 'user-id',
  speechMetrics: {
    wordsPerMinute: 245,  // Very fast (normal: 120-150)
    averageWordDuration: 0.24,  // Seconds per word
    pauseBetweenWords: 0.05,  // Minimal pauses
    wordBoundaryClarity: 0.68  // Lower than ideal
  },
  transcriptionResult: {
    rawTranscript: 'Did the workout had breakfast took the supplements feeling great energy 9 out of 10',
    wordConfidences: [0.92, 0.88, 0.76, 0.82, ...],  // Individual word scores
    overallConfidence: 0.78
  },
  parsedEntities: [
    { type: 'workout', title: 'Workout', confidence: 0.89 },
    { type: 'nutrition', title: 'Breakfast', confidence: 0.84 },
    { type: 'nutrition', title: 'Supplements', confidence: 0.87 },
    { type: 'tracker', key: 'energy', value: 9, confidence: 0.94 }
  ],
  confirmationNeeded: false  // High enough confidence overall
}
```

**Batch entry creation:**
```typescript
[
  { type: 'event', title: 'Workout', status: 'created' },
  { type: 'event', title: 'Breakfast', status: 'created' },
  { type: 'nutrition', title: 'Supplements', status: 'created' },
  { type: 'tracker', key: 'energy', value: 9, status: 'created' }
]
```

#### 3. Parsing/Disambiguation Approach

**Fast speech handling:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/fast_speech.ts
function handleFastSpeech(audio: AudioBuffer, transcript: string): FastSpeechResult {
  const wpm = calculateWPM(audio, transcript);

  if (wpm > 200) {
    // Apply enhanced word boundary detection
    const enhancedTranscript = applyWordBoundaryModel(audio, transcript);

    // Use entity-aware parsing to find logical breaks
    const entities = parseWithDomainContext(enhancedTranscript, {
      assumeMultipleEntities: true,
      commonPatterns: ['workout', 'had X', 'took X', 'feeling X']
    });

    return { enhancedTranscript, entities, requiresConfirmation: entities.length > 3 };
  }

  return { transcript, entities: parse(transcript), requiresConfirmation: false };
}
```

**Multi-entity extraction:**
- "Did workout" → Workout event
- "had breakfast" → Meal event
- "took supplements" → Supplement log
- "feeling great energy 9" → Energy tracker
- Pattern matching: "had X," "took X," "did X," "feeling X"

**Optimizer expectations:**
- Batch creation without individual confirmations
- Summary view: "Created 4 entries" with one-tap confirm all
- Edit affordance for any item that parsed incorrectly
- Speed should not impact accuracy significantly

#### 4. Gamification Impact

**Batch XP calculation:**
- Each confirmed item: Individual XP based on type
- Batch bonus: +10% XP for multi-item capture (efficiency reward)
- Speed itself doesn't penalize or bonus (neutral)

**Power user recognition:**
- Achievement: "Speed Logger" for 100+ fast captures
- Stat tracking: "You logged 4 items in 5 seconds"
- Optimizer appreciates efficiency metrics

#### 5. Architecture Solution

**Enhanced transcription for speed:**
- Adaptive model selection based on detected speech rate
- Word boundary post-processing layer
- Domain-specific language model priors
- User history improves prediction

**Confirmation UI for batch:**
```typescript
// File: apps/insight-mobile/src/components/BatchConfirmation.tsx
function BatchConfirmation({ entities }: Props) {
  return (
    <Card>
      <Header>Created {entities.length} entries</Header>

      <EntityList>
        {entities.map(e => (
          <EntityRow
            key={e.id}
            entity={e}
            onEdit={() => editEntity(e)}
            onRemove={() => removeEntity(e)}
          />
        ))}
      </EntityList>

      <Actions>
        <Button primary onPress={confirmAll}>
          Confirm All (+{totalXP} XP)
        </Button>
      </Actions>
    </Card>
  );
}
```

**Speed suggestion (optional):**
- If speed causes repeated issues: Gentle suggestion
- "Tip: Speaking a bit slower improves accuracy"
- Only shown after 3+ fast captures with corrections needed
- Dismissible and respectful of user preference

**File references:**
- Fast speech handler: `supabase/functions/transcribe_and_parse_capture/fast_speech.ts:45`
- Batch confirmation: `apps/insight-mobile/src/components/BatchConfirmation.tsx:23`
- Speed metrics: `packages/shared/src/analytics/speech_metrics.ts:12`

---

### UC-E011: Emotional Speech Distortion (Reflector)

#### 1. User Phrase/Scenario

Casey, processing a difficult day, speaks through tears during an evening reflection: "Today was really hard... [sniffle] ... I'm trying to understand why I feel this way... [voice wavers] ... maybe it's about what Mom said..." The emotional state affects vocal quality—sniffling, wavering, pauses, catching breath—making transcription challenging.

Emotional speech scenarios:
- Crying or near-crying during journaling
- Anger causing clipped or shouting speech
- Grief with long pauses and soft voice
- Anxiety with rapid, breathless speech
- Joy with laughter interrupting words
- Frustration with sighing and incomplete sentences
- Vulnerability with whispered confessions

The Reflector persona uses the journal for emotional processing. These entries are often the most important ones, and losing words during vulnerable moments would feel like a betrayal. The system must handle emotional speech with particular care and sensitivity.

#### 2. Data Model Mapping

**Emotional Speech Capture:**

```typescript
{
  captureId: 'capture-uuid',
  userId: 'user-id',
  emotionalMarkers: {
    detected: true,
    indicators: ['crying', 'long_pauses', 'wavering_voice', 'sniffles'],
    intensity: 'high',
    consistency: 0.72  // Consistent emotional state throughout
  },
  transcript: "Today was really hard [pause] I'm trying to understand why I feel this way [pause] maybe it's about what Mom said",
  transcriptWithEmotionalMarkers: "Today was really hard... [emotional pause] I'm trying to understand why I feel this way... [voice wavering] maybe it's about what Mom said...",
  confidenceScore: 0.71,  // Lower due to speech distortions
  emotionalInference: {
    primaryEmotion: 'sadness',
    secondaryEmotions: ['confusion', 'hurt'],
    confidence: 0.89,
    relationshipContext: '@mom mentioned'
  },
  sensitivityFlags: {
    handleWithCare: true,
    suppressGamification: true,
    delayPrompts: true,
    resourcesAvailable: true
  }
}
```

**Journal entry with emotional metadata:**
```typescript
{
  id: 'journal-uuid',
  title: 'Evening Reflection',
  bodyMarkdown: "Today was really hard... I'm trying to understand why I feel this way... maybe it's about what Mom said...",
  emotions: ['sadness', 'confusion'],
  emotionalIntensity: 'high',
  people: ['mom'],
  moodRating: null,  // Not explicitly rated, inferred
  sensitiveContent: true,
  createdAt: Date.now(),
  status: 'published'
}
```

#### 3. Parsing/Disambiguation Approach

**Emotional speech recognition:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/emotional_speech.ts
async function processEmotionalSpeech(audio: AudioBuffer): EmotionalSpeechResult {
  // 1. Detect emotional markers in audio
  const emotionalAnalysis = await detectEmotionalMarkers(audio);
  // Analyzes: Pitch variation, voice tremor, breathing patterns, pauses

  // 2. Adapt transcription model for emotional speech
  const transcriptionConfig = {
    model: 'whisper-large-v3',
    postProcessing: {
      normalizeEmotionalPauses: true,  // Don't penalize long pauses
      speechDisfluencyTolerance: 'high',
      voiceTremorCompensation: true
    }
  };

  const transcript = await transcribe(audio, transcriptionConfig);

  // 3. Preserve emotional context in transcript
  const enrichedTranscript = preserveEmotionalContext(transcript, emotionalAnalysis);

  // 4. Infer emotions for metadata (not explicit rating)
  const emotions = inferEmotionsFromProse(transcript);

  return { transcript: enrichedTranscript, emotions, sensitivity: 'high' };
}
```

**Reflector-sensitive handling:**
- No error messages during vulnerable moments
- Transcript preserved even if partially unclear
- Gentle handling: "Your reflection is saved" (not "Processing complete!")
- No immediate prompts for clarification
- Audio retained longer for manual review if desired

#### 4. Gamification Impact

**Invisible gamification:**
- XP calculated but not shown during emotional entries
- No celebration animations (inappropriate for the moment)
- No pop-ups, toasts, or fanfare
- Entry saved silently with subtle confirmation

**Streak protection:**
- Entry counts for streak regardless of transcription quality
- "You showed up for yourself" is the metric
- Emotional processing is valuable regardless of data capture

**Next-day gentle acknowledgment (optional):**
- Following day: "Yesterday's reflection is saved. View anytime."
- No pressure to revisit
- "On This Day" will surface appropriately next year

#### 5. Architecture Solution

**Sensitivity detection system:**
```typescript
// File: apps/insight-mobile/src/capture/SensitivityHandler.ts
function adjustUIForSensitivity(sensitivity: SensitivityLevel) {
  if (sensitivity === 'high') {
    // Suppress all celebratory UI
    disableAnimations();
    muteHaptics();

    // Use calm confirmation
    showQuietConfirmation("Your reflection is saved.");

    // Delay any follow-up prompts by 24 hours
    scheduleFollowUp({ delay: '24h', type: 'gentle' });

    // Make resources available but not prominent
    enableCrisisResourceButton({ visibility: 'subtle' });
  }
}
```

**Crisis detection (separate handling):**
- If crisis keywords detected, separate flow triggers
- Resources presented gently, not alarmingly
- Not part of this use case but adjacent system

**Audio preservation:**
```typescript
// Emotional entries retain audio longer for user's own reference
const EMOTIONAL_AUDIO_RETENTION = 30 * 24 * 60 * 60 * 1000; // 30 days
// vs standard 7 days
```

**File references:**
- Emotional speech: `supabase/functions/transcribe_and_parse_capture/emotional_speech.ts:23`
- Sensitivity handler: `apps/insight-mobile/src/capture/SensitivityHandler.ts:45`
- UI adaptations: `apps/insight-mobile/src/components/EmotionalEntryUI.tsx:12`

---

### UC-E012: Voice Capture in Extreme Conditions (Biohacker)

#### 1. User Phrase/Scenario

Sam attempts to log immediately after a cold plunge, voice shaking from the physiological response: "C-c-cold plunge d-done, th-three minutes, f-f-feeling alert." The extreme cold causes stammering, teeth chattering, and breath catching that significantly distorts normal speech patterns.

Extreme condition scenarios:
- Cold exposure (cold plunge, cryotherapy, winter outdoor)
- Heat exposure (post-sauna, hot yoga)
- Intense exercise (breathless, heart rate elevated)
- Altitude (thin air affecting breathing)
- Fasting (low energy, slower cognitive processing)
- Sleep deprivation (slurred speech, slow processing)
- Post-workout exhaustion (heavy breathing, muscle fatigue)

The Biohacker persona logs during and immediately after various physiological interventions. These are often the most valuable data points—capturing subjective experience at the moment of the intervention—and losing them due to speech distortion would undermine the tracking value.

#### 2. Data Model Mapping

**Extreme Condition Capture:**

```typescript
{
  captureId: 'capture-uuid',
  userId: 'user-id',
  environmentalContext: {
    detected: true,
    type: 'cold_exposure',
    indicators: ['stammering', 'breath_catching', 'teeth_chattering'],
    physiologicalState: 'cold_stress_response'
  },
  rawTranscript: 'C-c-cold plunge d-done, th-three minutes, f-f-feeling alert',
  cleanedTranscript: 'Cold plunge done, three minutes, feeling alert',
  cleanupOperations: [
    { type: 'stammer_removal', pattern: 'C-c-c', result: 'C' },
    { type: 'stammer_removal', pattern: 'd-done', result: 'done' },
    { type: 'stammer_removal', pattern: 'th-three', result: 'three' },
    { type: 'stammer_removal', pattern: 'f-f-feeling', result: 'feeling' }
  ],
  confidence: 0.88,  // High after cleanup
  extractedMetrics: {
    activity: 'cold_plunge',
    duration: { value: 3, unit: 'minutes' },
    alertness: 'high'  // Inferred from "feeling alert"
  }
}
```

**Cold exposure log created:**
```typescript
{
  id: 'event-uuid',
  type: 'cold_exposure',
  title: 'Cold Plunge',
  duration: 3,
  durationUnit: 'minutes',
  subjectiveMetrics: {
    alertness: 'high'
  },
  capturedDuringExposure: false,  // Immediately after
  source: 'voice_extreme_condition'
}
```

#### 3. Parsing/Disambiguation Approach

**Physiological speech adaptation:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/physiological_speech.ts
const PHYSIOLOGICAL_PATTERNS = {
  cold_exposure: {
    indicators: [/[a-z]-[a-z]-[a-z]/i, /ch-ch/, /th-th/],  // Stammering
    cleanup: (text) => text.replace(/([a-z])-\1(-\1)*/gi, '$1'),
    confidenceBoost: 0.15
  },
  breathlessness: {
    indicators: [/\[breath\]/, /\*gasp\*/, /\.{3,}/],  // Pauses for breath
    cleanup: (text) => text.replace(/\s*\[breath\]\s*/g, ' '),
    confidenceBoost: 0.10
  },
  fatigue: {
    indicators: [/soooo/, /uhhh/, /ummm/],  // Extended sounds
    cleanup: (text) => text.replace(/(so+|uh+|um+)/gi, '$1'),
    confidenceBoost: 0.05
  }
};

function processPhysiologicalSpeech(transcript: string, audio: AudioBuffer): ProcessedTranscript {
  const patterns = detectPhysiologicalPatterns(audio);
  let cleaned = transcript;

  for (const pattern of patterns) {
    cleaned = PHYSIOLOGICAL_PATTERNS[pattern].cleanup(cleaned);
  }

  return { cleaned, patterns, originalPreserved: transcript };
}
```

**Context-aware parsing:**
- Time of day: 6 AM cold plunge matches user's protocol
- User history: Regular cold exposure logger
- Biohacker vocabulary: "Cold plunge" terminology expected
- Duration extraction despite stammered "th-three"

#### 4. Gamification Impact

**XP for challenging logging:**
- Standard cold exposure XP
- Bonus consideration: Logging during challenge (+5 XP optional)
- Achievement: "Cold Warrior" for consistent cold exposure logging
- Pattern recognition: "You've logged 30 cold plunges this month"

**Data quality preserved:**
- Cleaned transcript ensures accurate duration tracking
- Correlation analysis includes this data point
- No penalty for physiological speech patterns

#### 5. Architecture Solution

**Activity-aware recording mode:**
```typescript
// File: apps/insight-mobile/src/capture/ActivityModes.ts
const ACTIVITY_MODES = {
  cold_exposure: {
    preCaptureHint: "Voice may shake—we'll handle it",
    postProcessing: 'physiological_cleanup',
    quickLogFallback: true,
    quickLogOptions: ['1 min', '2 min', '3 min', '4 min', '5 min']
  },
  post_workout: {
    preCaptureHint: "Catch your breath—we'll wait",
    silenceThreshold: 15000,  // Longer timeout for breathing
    postProcessing: 'breathlessness_cleanup'
  }
};
```

**Quick-log fallback:**
- One-tap buttons for common durations when speech is difficult
- "Cold plunge: [1] [2] [3] [4] [5] min"
- Voice capture optional when conditions are extreme
- Full details can be added later when recovered

**Post-activity prompt:**
- "Add details to your cold plunge?" (when warmed up)
- Link to entry for additional notes
- Temperature, HRV, subjective feelings can be added

**File references:**
- Physiological speech: `supabase/functions/transcribe_and_parse_capture/physiological_speech.ts:34`
- Activity modes: `apps/insight-mobile/src/capture/ActivityModes.ts:23`
- Quick log: `apps/insight-mobile/src/components/QuickLogButtons.tsx:45`

---

## Parse/Classification Failures

### UC-E013: Ambiguous Entity Type (Optimizer)

#### 1. User Phrase/Scenario

Alex says: "Meeting with Sarah about the project." The system cannot determine with confidence: Is this a log of a past meeting that already happened, a task/reminder to schedule a meeting, or a note about an ongoing meeting happening right now? The input lacks temporal markers that would disambiguate.

Ambiguous inputs this use case covers:
- Missing past/present/future tense markers
- Actions that could be events or tasks ("call mom")
- Present tense that could mean now or general ("I run every morning")
- Nominalized verbs ("the workout" - past or planned?)
- Responses to prompts without full context

The Optimizer persona has low tolerance for data quality issues and expects either confident classification or clear prompting for disambiguation. They would rather take 2 seconds to clarify than have the wrong entity type pollute their data.

#### 2. Data Model Mapping

**Disambiguation Queue Entry:**

```typescript
{
  id: 'disambiguation-uuid',
  userId: 'user-id',
  captureId: 'capture-uuid',
  inputText: 'Meeting with Sarah about the project',
  possibleInterpretations: [
    {
      entityType: 'event',
      subtype: 'past_log',
      confidence: 0.42,
      reasoning: 'Default interpretation of "meeting" as event',
      suggestedTitle: 'Meeting with Sarah',
      suggestedTiming: 'today'
    },
    {
      entityType: 'task',
      subtype: 'future_intent',
      confidence: 0.38,
      reasoning: '"Meeting with Sarah" could be something to schedule',
      suggestedTitle: 'Schedule meeting with Sarah',
      suggestedTiming: 'unscheduled'
    },
    {
      entityType: 'event',
      subtype: 'current_activity',
      confidence: 0.20,
      reasoning: 'Could be logging an in-progress meeting',
      suggestedTitle: 'Meeting with Sarah (in progress)',
      suggestedTiming: 'now'
    }
  ],
  maxConfidence: 0.42,  // Below 0.65 threshold
  clarificationRequired: true,
  extractedEntities: {
    people: ['sarah'],
    topics: ['project']
  },
  status: 'awaiting_clarification',
  createdAt: Date.now()
}
```

No main entity created until disambiguation resolved.

#### 3. Parsing/Disambiguation Approach

**Confidence threshold system:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/classifier.ts
const CLASSIFICATION_THRESHOLDS = {
  autoAccept: 0.85,      // Create entity without confirmation
  suggestWithConfirm: 0.65,  // Suggest classification, one-tap confirm
  requireClarification: 0.50, // Must ask user to choose
  fallback: 0.00         // Below this, offer manual entry
};

function classifyWithConfidence(input: string, context: ParseContext): ClassificationResult {
  const scores = calculateEntityTypeScores(input, context);
  const maxScore = Math.max(...Object.values(scores));

  if (maxScore >= CLASSIFICATION_THRESHOLDS.autoAccept) {
    return { type: 'auto', entityType: getTopType(scores), confidence: maxScore };
  }

  if (maxScore >= CLASSIFICATION_THRESHOLDS.requireClarification) {
    return { type: 'suggest', options: getTopOptions(scores, 2), confidence: maxScore };
  }

  return { type: 'clarify', options: getTopOptions(scores, 3), confidence: maxScore };
}
```

**Temporal marker detection:**
- "Had a meeting" → Past (event)
- "Need to have a meeting" → Future (task)
- "In my meeting with" → Current (event, now)
- "Meeting with Sarah" → Ambiguous (no markers)

**Context enhancement:**
- Time of day: Morning input more likely about future; evening about past
- User patterns: Alex usually logs retrospectively
- Recent entries: If workout just logged, "meeting" likely a different event type

#### 4. Gamification Impact

**No XP until resolved:**
- Entry in disambiguation queue doesn't award XP
- Clarification doesn't break streak (input was provided)
- Quick resolution encouraged but not gamified
- Timed out clarifications (24h) archive without penalty

**Optimizer expectations met:**
- Data quality maintained through clarification
- No silent wrong classification
- Resolution process is fast (3 options, one tap)

#### 5. Architecture Solution

**Disambiguation UI:**
```typescript
// File: apps/insight-mobile/src/components/DisambiguationSheet.tsx
function DisambiguationSheet({ item }: Props) {
  return (
    <Sheet>
      <Header>Quick question</Header>
      <Question>"Meeting with Sarah about the project"</Question>

      <Options>
        <Option
          icon="✓"
          label="Already happened"
          description="Log this meeting"
          onSelect={() => resolve('event_past')}
        />
        <Option
          icon="📅"
          label="Need to schedule"
          description="Add to tasks"
          onSelect={() => resolve('task')}
        />
        <Option
          icon="🕐"
          label="Happening now"
          description="Start meeting timer"
          onSelect={() => resolve('event_current')}
        />
      </Options>

      <Alternative>
        <TextButton onPress={manualEntry}>Something else</TextButton>
      </Alternative>
    </Sheet>
  );
}
```

**Smart defaults:**
- Pre-select most likely option based on context
- Time-aware defaults: Evening → "Already happened"
- User pattern learning adjusts defaults over time

**Resolution flow:**
1. User taps option
2. Entity created with selected type
3. Normal processing continues (XP, etc.)
4. Learning feedback stored for future improvement

**File references:**
- Classifier: `supabase/functions/transcribe_and_parse_capture/classifier.ts:56`
- Disambiguation UI: `apps/insight-mobile/src/components/DisambiguationSheet.tsx:23`
- Resolution logic: `apps/insight-mobile/src/capture/DisambiguationResolver.ts:34`

---

### UC-E014: Missing Required Fields (Dabbler)

#### 1. User Phrase/Scenario

Jordan says: "Had a good workout today." The capture is vague—no specific exercises, sets, reps, or duration mentioned. Unlike the Optimizer who provides detailed logs, the Dabbler often speaks in general terms. The system needs to decide whether to prompt for details, accept the incomplete log, or silently infer reasonable defaults.

Common incomplete entry patterns from Dabbler users:
- "Did some yoga this morning" (no duration, no specific poses)
- "Ate pretty healthy today" (no meals or portions specified)
- "Feeling better than yesterday" (no specific mood or numeric rating)
- "Slept okay" (no duration, quality metrics, or time)
- "Got my steps in" (no count, route, or specific activity)
- "Took my vitamins" (which vitamins? full regimen or partial?)

The Dabbler has high error tolerance and prefers minimal friction. They would rather the system make reasonable assumptions than interrupt their flow with clarifying questions. However, they also appreciate when the system learns their patterns to fill in gaps.

#### 2. Data Model Mapping

**Incomplete Entry Record:**

```typescript
{
  id: 'entry-uuid',
  userId: 'user-id',
  entryType: 'workout',
  capturedText: 'Had a good workout today',
  completeness: {
    score: 0.15,  // Very incomplete
    missingFields: ['exercises', 'duration', 'intensity', 'workout_type'],
    inferredFields: {
      workoutType: 'general',
      sentimentPositive: true,
      estimatedDuration: 30  // Based on user's typical patterns
    }
  },
  source: 'voice',
  status: 'complete',  // Accept as-is for Dabbler
  acceptedIncomplete: true,
  inferenceApplied: true
}
```

**Inferred Workout Entry:**
```typescript
{
  id: 'workout-uuid',
  userId: 'user-id',
  title: 'Workout',
  workoutType: 'general',
  durationMinutes: 30,  // Inferred from user history
  intensityLevel: 'moderate',  // Default for positive sentiment
  exercises: [],  // Empty, not tracked
  notes: 'Had a good workout today',
  source: 'voice_inferred',
  gamificationEligible: true  // Still counts for streaks
}
```

#### 3. Parsing/Disambiguation Approach

**Completeness scoring:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/completeness.ts
function assessCompleteness(parsed: ParsedEntry, entryType: string): CompletenessScore {
  const requiredFields = FIELD_REQUIREMENTS[entryType];
  const optionalFields = OPTIONAL_FIELDS[entryType];

  let present = 0, missing = 0;
  const missingList = [];

  for (const field of requiredFields) {
    if (parsed[field] !== undefined && parsed[field] !== null) {
      present++;
    } else {
      missing++;
      missingList.push(field);
    }
  }

  return {
    score: present / (present + missing),
    missingFields: missingList,
    severity: missing > 3 ? 'high' : missing > 1 ? 'medium' : 'low'
  };
}
```

**Persona-based handling:**
- **Optimizer (low tolerance)**: Prompt for missing required fields
- **Dabbler (high tolerance)**: Accept as-is, infer defaults from history
- **Biohacker (low tolerance)**: Prompt but offer quick-fill from patterns
- **Reflector (medium tolerance)**: Accept for journaling, prompt for metrics

**Inference engine for Dabbler:**
- "Good workout" → duration from average of last 5 workouts
- "Pretty healthy" → positive nutrition sentiment, no calorie tracking
- "Feeling better" → mood trend upward, no specific score
- "Slept okay" → 7 hours (system default for neutral sleep comment)

#### 4. Gamification Impact

**Streak protection for incomplete entries:**
- All sincerely attempted logs count for streak maintenance
- "Had a good workout" keeps the workout streak alive
- Quality bonuses require detail—base XP only for vague entries

**XP calculation:**
```typescript
{
  baseXP: 10,  // For logging attempt
  detailBonusXP: 0,  // No exercise details provided
  consistencyBonusXP: 5,  // Logged on consecutive day
  totalXP: 15,
  comparedToFullEntry: 15 / 35 = 0.43  // 43% of a complete entry
}
```

**No penalty messaging:**
- Show: "Got it! ✓" (no mention of missing details)
- Don't show: "Entry incomplete—add details for bonus XP"
- Principle: Dabbler should feel successful, not inadequate

#### 5. Architecture Solution

**Completeness-aware entry flow:**
```
Voice Capture → Transcription → Parse
                                   ↓
                            Check completeness
                                   ↓
                    ┌──────────────┴──────────────┐
                    │ Dabbler/High Tolerance      │ Optimizer/Low Tolerance
                    ↓                             ↓
            Apply inference               Show completion prompt
                    ↓                             ↓
            Create entry                  Await additional input
                    ↓                             ↓
            Show confirmation             Create full entry
```

**Gradual detail encouragement (not prompts):**
- Weekly insight: "You logged 5 workouts! Want to see exercise breakdowns?"
- Milestone celebration: "30-day streak! Detailed tracking unlocks weekly comparisons"
- Optional upgrade path, never mandatory

**File references:**
- Completeness scoring: `supabase/functions/transcribe_and_parse_capture/completeness.ts:23`
- Inference engine: `supabase/functions/transcribe_and_parse_capture/inference.ts:45`
- Dabbler config: `apps/insight-mobile/src/config/personaDefaults.ts:89`

---

### UC-E015: Conflicting Intent Signals (Privacy-First)

#### 1. User Phrase/Scenario

Morgan says: "Delete that... no wait, keep it but mark it private... actually just save it normally." The capture contains multiple contradictory commands issued in rapid succession as Morgan thinks through their privacy preferences. The system must determine the final intent while respecting that the user is security-conscious and may have genuine concerns about data handling.

Conflicting intent scenarios for Privacy-First users:
- "Save this... no, delete... hmm, encrypt it instead"
- "Log my location... actually don't, just save the workout"
- "Share with my trainer... wait, remove the personal notes first"
- "Mark this as public... no, keep it private like everything else"
- "Sync to cloud... no, local only... okay fine, sync it"
- "Add to my journal... but hide it from the summary view"

Privacy-First users often second-guess themselves when it comes to data decisions. They want the system to respect their final decision without judgment while also making it easy to change their mind later.

#### 2. Data Model Mapping

**Intent Resolution Record:**

```typescript
{
  id: 'intent-resolution-uuid',
  captureId: 'capture-uuid',
  userId: 'user-id',
  intentSequence: [
    { intent: 'delete', timestamp: 0.2, confidence: 0.88 },
    { intent: 'save_private', timestamp: 1.8, confidence: 0.91 },
    { intent: 'save_normal', timestamp: 3.5, confidence: 0.85 }
  ],
  conflictDetected: true,
  conflictType: 'sequential_reversal',
  resolution: 'last_stated',  // Apply final intent
  appliedIntent: 'save_normal',
  privacyImplication: 'standard',  // Not elevated privacy
  userConfirmationRequired: true,  // For privacy-conscious users
  resolvedAt: Date.now()
}
```

**Entry with Privacy Audit Trail:**
```typescript
{
  id: 'entry-uuid',
  userId: 'user-id',
  content: '[captured content]',
  privacyLevel: 'standard',
  privacyDecisionHistory: [
    { action: 'delete_requested', at: Date.now() - 3300, source: 'voice' },
    { action: 'private_requested', at: Date.now() - 1700, source: 'voice' },
    { action: 'standard_confirmed', at: Date.now(), source: 'voice' }
  ],
  canChangePrivacy: true,
  privacyExpirationPrompt: null  // Not using enhanced privacy
}
```

#### 3. Parsing/Disambiguation Approach

**Intent sequence analysis:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/intent_resolver.ts
function resolveConflictingIntents(
  intents: IntentSignal[],
  userPersona: Persona
): ResolvedIntent {
  // For Privacy-First: always confirm final intent
  if (userPersona.type === 'privacy_first') {
    const finalIntent = intents[intents.length - 1];
    return {
      intent: finalIntent.intent,
      requiresConfirmation: true,
      showAlternatives: true,
      message: `We'll save this normally. Tap to change privacy settings anytime.`
    };
  }

  // General conflict resolution rules
  if (hasDataDestructionIntent(intents)) {
    // Destruction intents (delete) need explicit confirmation
    return {
      intent: intents[intents.length - 1].intent,
      requiresConfirmation: true
    };
  }

  return { intent: intents[intents.length - 1].intent };
}
```

**Privacy-specific handling:**
- Show clear confirmation of final privacy state
- Offer one-tap access to change privacy level post-save
- Never auto-apply destructive commands (delete)
- Preserve intent history for transparency

#### 4. Gamification Impact

**No gamification during privacy decisions:**
- Privacy settings changes don't affect XP
- Changing mind about privacy is free (no penalty)
- Private entries still earn XP (privacy doesn't reduce rewards)

**Trust-building through transparency:**
```typescript
{
  privacyActions: {
    viewedPrivacyLog: true,  // User checked their privacy history
    trustBonusXP: 5,  // Reward for engaging with privacy features
    message: "Privacy pro! You're in control of your data."
  }
}
```

#### 5. Architecture Solution

**Conflict resolution with confirmation:**
```
Voice Capture → Transcription → Intent Extraction
                                        ↓
                                Detect conflicts
                                        ↓
                            ┌───────────┴───────────┐
                        No conflict              Conflict detected
                            ↓                           ↓
                        Apply intent           Show confirmation UI
                                                        ↓
                                            User confirms or changes
                                                        ↓
                                            Apply final decision
                                                        ↓
                                            Store decision history
```

**UI for Privacy-First conflict resolution:**
```typescript
// File: apps/insight-mobile/src/components/PrivacyConfirmationSheet.tsx
<PrivacyConfirmationSheet
  entry={entry}
  detectedIntents={intents}
  finalIntent={resolved}
  onConfirm={() => saveEntry()}
  onChangePrivacy={() => openPrivacySettings()}
  showHistoryLink={true}
/>
```

**File references:**
- Intent resolver: `supabase/functions/transcribe_and_parse_capture/intent_resolver.ts:34`
- Privacy confirmation: `apps/insight-mobile/src/components/PrivacyConfirmationSheet.tsx:12`
- Privacy history: `apps/insight-mobile/src/storage/privacyAudit.ts:56`

---

### UC-E016: Numeric Value Ambiguity (Biohacker)

#### 1. User Phrase/Scenario

Sam says: "HRV was seventy-two this morning... or was it twenty-seven? Let me check—yeah, seventy-two." The voice capture includes the user's self-correction, but the transcription may not clearly distinguish which number is the intended value. For a Biohacker tracking precise metrics, using the wrong value could corrupt their data integrity.

Numeric ambiguity scenarios in biohacking context:
- "Blood glucose 95... no wait, 59" (medically significant difference)
- "Sleep score 82 or 28, I always mix those up"
- "Ketones at point five... or one point five" (different metabolic states)
- "Resting heart rate fifty-two, not twenty-five"
- "Body fat 15... percent, not 50" (unit/value confusion)
- "Temperature 97.6... wait that's yesterday, today was 98.1"

Biohackers have very low tolerance for data errors because they make decisions based on trends and correlations. A single incorrect value can skew analysis and lead to wrong conclusions.

#### 2. Data Model Mapping

**Numeric Disambiguation Record:**

```typescript
{
  id: 'numeric-resolution-uuid',
  captureId: 'capture-uuid',
  userId: 'user-id',
  metricType: 'hrv',
  detectedValues: [
    { value: 72, position: 'first_mentioned', confidence: 0.91 },
    { value: 27, position: 'correction_candidate', confidence: 0.88 },
    { value: 72, position: 'confirmed', confidence: 0.95 }
  ],
  correctionLanguageDetected: true,
  correctionIndicators: ['or was it', 'let me check', 'yeah'],
  resolvedValue: 72,
  resolutionMethod: 'user_confirmation_in_audio',
  plausibilityScore: 0.94,  // 72 is typical HRV, 27 would be concerning
  userHistoryMatch: 0.89  // User's HRV typically 65-80
}
```

**Biometric Entry with Confidence:**
```typescript
{
  id: 'biometric-uuid',
  userId: 'user-id',
  metricType: 'hrv',
  value: 72,
  unit: 'ms',
  valueConfidence: 0.95,
  source: 'voice',
  ambiguityResolved: true,
  originalCandidates: [72, 27],
  timestamp: Date.now(),
  correlatedDevice: 'whoop_strap'  // If available for validation
}
```

#### 3. Parsing/Disambiguation Approach

**Multi-signal value resolution:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/numeric_resolver.ts
function resolveNumericAmbiguity(
  candidates: NumericCandidate[],
  metricType: string,
  userHistory: MetricHistory
): ResolvedValue {
  // 1. Check for explicit confirmation language
  const confirmed = candidates.find(c => c.hasConfirmationLanguage);
  if (confirmed && confirmed.confidence > 0.90) {
    return { value: confirmed.value, method: 'explicit_confirmation' };
  }

  // 2. Apply plausibility filter
  const plausible = candidates.filter(c =>
    isPlausibleForMetric(c.value, metricType)
  );

  // 3. Check against user's historical range
  const inRange = plausible.filter(c =>
    isWithinUserRange(c.value, userHistory, metricType)
  );

  // 4. For Biohacker: if still ambiguous, require confirmation
  if (inRange.length > 1) {
    return {
      value: null,
      requiresConfirmation: true,
      candidates: inRange,
      message: `Was that ${inRange[0].value} or ${inRange[1].value}?`
    };
  }

  return { value: inRange[0].value, method: 'plausibility_filter' };
}
```

**Plausibility ranges for common biometrics:**
- HRV: 20-150 ms (27 and 72 both plausible, need context)
- Resting HR: 35-100 bpm
- Blood glucose: 50-400 mg/dL
- Ketones: 0.1-8.0 mmol/L
- Body temperature: 95-104°F

#### 4. Gamification Impact

**Data quality rewards for Biohacker:**
```typescript
{
  dataQualityBonus: {
    confirmed: true,
    clarifiedAmbiguity: true,
    bonusXP: 10,
    message: "Precision tracking! Your data integrity is excellent.",
    dataQualityScore: 98.5  // Running accuracy metric
  }
}
```

**Streak protection:**
- Logging attempt counts for streak even if value unconfirmed
- Confirmation can happen later without losing streak credit
- Unconfirmed values marked as "pending review" in analytics

#### 5. Architecture Solution

**Biohacker-optimized numeric flow:**
```
Voice Capture → Transcription → Numeric Extraction
                                        ↓
                                Extract all numbers
                                        ↓
                            Detect correction language
                                        ↓
                    ┌───────────────────┴───────────────────┐
                Correction found                    No correction
                        ↓                                   ↓
                Use confirmed value            Check plausibility
                        ↓                                   ↓
                Apply plausibility           ┌──────────────┴──────────────┐
                        ↓                Single candidate        Multiple candidates
                Save with high               ↓                           ↓
                confidence              Save normally            Prompt confirmation
```

**Device correlation (optional enhancement):**
```typescript
// If user has connected devices, cross-reference
async function validateAgainstDevice(value: number, metric: string): Validation {
  const recentDeviceReading = await getLatestFromWhoop(metric);
  if (recentDeviceReading && Math.abs(recentDeviceReading - value) < 5) {
    return { validated: true, source: 'device_correlation' };
  }
  return { validated: false, discrepancy: Math.abs(recentDeviceReading - value) };
}
```

**File references:**
- Numeric resolver: `supabase/functions/transcribe_and_parse_capture/numeric_resolver.ts:45`
- Biometric validation: `supabase/functions/transcribe_and_parse_capture/biometric_validation.ts:23`
- Device sync: `apps/insight-mobile/src/integrations/whoop.ts:78`

---

### UC-E017: Context-Dependent Parsing (Neurodivergent)

#### 1. User Phrase/Scenario

Riley says: "I did THE thing today." For Riley, "THE thing" has a specific meaning—it's their exercise routine they've been working on consistently. But the parser has no way to know this without context. The phrase is too vague for standard parsing but is completely clear to the user.

Context-dependent patterns common with Neurodivergent users:
- "Did my thing" (established routine with personal meaning)
- "The usual" (consistent habit with known parameters)
- "Avoided the bad place" (sensory-overwhelming location)
- "Made it through" (completed challenging activity)
- "Actually functioned today" (executive function success)
- "The spoons were there" (energy/capacity reference)
- "Brain worked" (focus/medication effectiveness)

Neurodivergent users often develop personal shorthand that is perfectly consistent for them but opaque to systems designed for neurotypical communication patterns.

#### 2. Data Model Mapping

**Personal Lexicon Entry:**

```typescript
{
  id: 'lexicon-uuid',
  userId: 'user-id',
  phrase: 'THE thing',
  normalizedPhrase: 'the thing',
  meaning: {
    entryType: 'workout',
    specificActivity: 'home_exercise_routine',
    parameters: {
      duration: 25,
      exercises: ['stretching', 'light_cardio', 'bodyweight'],
      intensity: 'low'
    }
  },
  frequency: 47,  // Used 47 times
  confidence: 0.96,  // Very consistent usage
  createdAt: Date.now() - (90 * 24 * 60 * 60 * 1000),  // 90 days ago
  lastUsed: Date.now()
}
```

**Resolved Entry:**
```typescript
{
  id: 'workout-uuid',
  userId: 'user-id',
  title: 'Home Exercise Routine',  // Friendly display name
  capturedPhrase: 'THE thing',
  usedPersonalLexicon: true,
  lexiconEntryId: 'lexicon-uuid',
  durationMinutes: 25,
  workoutType: 'home_routine',
  exercises: ['stretching', 'light_cardio', 'bodyweight'],
  intensityLevel: 'low'
}
```

#### 3. Parsing/Disambiguation Approach

**Personal lexicon matching:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/lexicon.ts
async function matchPersonalLexicon(
  text: string,
  userId: string
): LexiconMatch | null {
  const userLexicon = await getLexiconForUser(userId);

  for (const entry of userLexicon) {
    if (textContainsPhrase(text, entry.normalizedPhrase)) {
      // Ensure this isn't a generic usage
      const isPersonalUsage = await checkContextForPersonalUsage(
        text,
        entry,
        userId
      );

      if (isPersonalUsage && entry.confidence > 0.80) {
        return {
          matched: true,
          entry: entry,
          expansionAvailable: true
        };
      }
    }
  }

  return null;
}
```

**Lexicon learning:**
- Track repeated vague phrases
- When "THE thing" appears 3+ times, prompt once to define
- Accept vague input → infer from history → suggest lexicon entry
- Never force definition; suggestion only

**Neurodivergent-specific considerations:**
- Emphasis (capitalization, repetition) often carries meaning
- Personal shorthand is intentional, not lazy
- Consistency within personal system is high
- Definition prompts should be gentle and skippable

#### 4. Gamification Impact

**Celebrating personal systems:**
```typescript
{
  personalSystemBonus: {
    lexiconSize: 12,  // User has 12 personal phrases defined
    consistencyScore: 0.94,
    bonusXP: 15,
    message: "Your personal tracking language is well-established!",
    milestoneUnlocked: 'system_builder'  // Recognize effort
  }
}
```

**No shame for vague entries:**
- "THE thing" earns same XP as detailed log
- Personal lexicon matches are celebrated, not critiqued
- System adapts to user, not user to system

#### 5. Architecture Solution

**Lexicon-enhanced parsing flow:**
```
Voice Capture → Transcription → Lexicon Check
                                      ↓
                    ┌─────────────────┴─────────────────┐
                Lexicon match                    No match
                      ↓                               ↓
            Apply learned meaning            Standard parsing
                      ↓                               ↓
            Create detailed entry     ┌───────────────┴───────────────┐
                                  Parseable              Vague/unclear
                                      ↓                       ↓
                              Create entry          Check for pattern
                                                          ↓
                                            Suggest lexicon entry (gentle)
```

**Lexicon management UI:**
```typescript
// File: apps/insight-mobile/src/screens/PersonalLexiconScreen.tsx
// Accessible, low-pressure interface for managing personal phrases
<LexiconManager
  entries={lexicon}
  onEdit={handleEdit}
  onDelete={handleDelete}
  suggestedNewEntries={suggestions}
  showExplanation="Your personal shorthand—we learn what your phrases mean"
/>
```

**File references:**
- Lexicon matching: `supabase/functions/transcribe_and_parse_capture/lexicon.ts:23`
- Lexicon learning: `supabase/functions/transcribe_and_parse_capture/lexicon_learning.ts:45`
- Lexicon UI: `apps/insight-mobile/src/screens/PersonalLexiconScreen.tsx:12`

---

### UC-E018: Temporal Reference Confusion (Reflector)

#### 1. User Phrase/Scenario

Casey says: "I want to write about what happened last week... or was it the week before? It was definitely after my birthday but before the conference." The Reflector is journaling about a past event but is uncertain about the exact timing. The system needs to help resolve the temporal reference without being pedantic about exact dates.

Temporal confusion patterns in reflective journaling:
- "A few days ago... maybe a week" (fuzzy recent past)
- "Last month sometime" (vague monthly reference)
- "When I was feeling better" (emotion-anchored time)
- "Before things got hard" (event-anchored, not date-anchored)
- "Around the holidays" (cultural anchor)
- "That day when I couldn't stop crying" (emotional memory anchor)
- "When I finally talked to them" (relationship event anchor)

Reflectors use emotional and event-based anchors more than calendar dates. The system should support this natural pattern rather than forcing calendar precision.

#### 2. Data Model Mapping

**Temporal Resolution Context:**

```typescript
{
  id: 'temporal-resolution-uuid',
  userId: 'user-id',
  captureId: 'capture-uuid',
  temporalReferences: [
    { phrase: 'last week', type: 'relative', confidence: 0.75 },
    { phrase: 'week before', type: 'relative', confidence: 0.70 },
    { phrase: 'after my birthday', type: 'event_anchor', eventRef: 'birthday' },
    { phrase: 'before the conference', type: 'event_anchor', eventRef: 'conference' }
  ],
  knownAnchors: {
    birthday: '2026-01-03',  // From user profile or previous entries
    conference: '2026-01-15'
  },
  resolvedRange: {
    earliest: '2026-01-04',
    latest: '2026-01-14',
    confidence: 0.85,
    method: 'event_anchors'
  }
}
```

**Journal Entry with Flexible Timestamp:**
```typescript
{
  id: 'journal-uuid',
  userId: 'user-id',
  content: '[journal content about the past event]',
  temporalReference: {
    type: 'range',
    earliestDate: '2026-01-04',
    latestDate: '2026-01-14',
    displayText: 'Between your birthday and the conference',
    exactDateKnown: false
  },
  createdAt: Date.now(),  // When entry was created
  reflectsOn: 'past',  // Distinguishes from present-moment entries
  emotionalContext: 'processing'
}
```

#### 3. Parsing/Disambiguation Approach

**Event-anchored temporal resolution:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/temporal.ts
async function resolveTemporalReferences(
  refs: TemporalReference[],
  userId: string
): ResolvedTimeframe {
  // 1. Find event anchors in user's data
  const anchors = await findEventAnchors(refs, userId);

  // 2. If both "after X" and "before Y" present, calculate range
  const afterEvent = anchors.find(a => a.type === 'after');
  const beforeEvent = anchors.find(a => a.type === 'before');

  if (afterEvent && beforeEvent) {
    return {
      type: 'bounded_range',
      earliest: afterEvent.date,
      latest: beforeEvent.date,
      displayText: `Between ${afterEvent.label} and ${beforeEvent.label}`,
      confidence: 0.85
    };
  }

  // 3. Fall back to relative resolution
  return resolveRelativeReferences(refs);
}
```

**Event anchor sources:**
- Previous journal entries mentioning events
- Calendar integrations (if connected)
- User profile milestones (birthday, anniversary)
- Recurring events (weekly therapy, monthly check-in)

#### 4. Gamification Impact

**Reflection-focused rewards:**
```typescript
{
  reflectionBonus: {
    pastReflection: true,
    deepProcessing: true,  // Writing about difficult experiences
    bonusXP: 20,
    message: "Taking time to reflect on the past—that takes courage.",
    streakProtection: true  // Reflective entries always count
  }
}
```

**No pressure for precision:**
- Vague dates accepted without penalty
- "Around that time" is valid journaling
- Timeline visualization accommodates uncertainty

#### 5. Architecture Solution

**Temporal resolution with user control:**
```
Voice Capture → Transcription → Extract temporal refs
                                        ↓
                                Find event anchors
                                        ↓
                        ┌───────────────┴───────────────┐
                    Anchors found                No anchors
                        ↓                               ↓
                Calculate range              Use relative date
                        ↓                               ↓
                        └───────────────┬───────────────┘
                                        ↓
                              Show resolved date/range
                                        ↓
                            User can adjust if needed
                                        ↓
                                Save entry
```

**UI for temporal uncertainty:**
```typescript
// File: apps/insight-mobile/src/components/TemporalPicker.tsx
<TemporalPicker
  mode="reflective"
  resolvedRange={range}
  showConfidence={false}  // Don't show technical details
  displayText="Between your birthday and the conference"
  onAdjust={handleAdjust}
  allowFuzzy={true}  // Accept "around that time"
/>
```

**File references:**
- Temporal resolution: `supabase/functions/transcribe_and_parse_capture/temporal.ts:34`
- Event anchors: `supabase/functions/transcribe_and_parse_capture/event_anchors.ts:12`
- Temporal picker: `apps/insight-mobile/src/components/TemporalPicker.tsx:45`

---

### UC-E019: Unit Conversion Errors (Biohacker)

#### 1. User Phrase/Scenario

Sam says: "Weight was 185 this morning" but doesn't specify pounds or kilograms. Sam is American and typically uses pounds, but recently started following a European fitness program that uses kilograms. The system must determine the correct unit to avoid a significant data error (185 lbs vs 185 kg is a 233% difference).

Unit ambiguity scenarios for biohackers:
- Body weight: lbs vs kg (common international confusion)
- Temperature: Fahrenheit vs Celsius (98.6°F vs 37°C baseline)
- Distance: miles vs kilometers (running/cycling logs)
- Fluid intake: oz vs ml vs L (hydration tracking)
- Blood glucose: mg/dL vs mmol/L (US vs international standard)
- Supplement dosage: mg vs mcg vs IU (significant medical difference)
- Macros: grams vs ounces (nutrition tracking)

For Biohackers, unit errors compound across days of tracking and can lead to incorrect correlations or health decisions.

#### 2. Data Model Mapping

**Unit Preference Profile:**

```typescript
{
  userId: 'user-id',
  unitPreferences: {
    weight: { primary: 'lbs', secondary: 'kg', detectFromContext: true },
    distance: { primary: 'miles', secondary: 'km', detectFromContext: true },
    temperature: { primary: 'fahrenheit', secondary: 'celsius' },
    bloodGlucose: { primary: 'mg/dL', secondary: 'mmol/L' },
    fluids: { primary: 'oz', secondary: 'ml' }
  },
  contextClues: {
    europeanProgram: true,  // Currently following EU program
    recentKgReferences: 3,  // Used kg 3 times recently
    travelLocation: null
  },
  lastUpdated: Date.now()
}
```

**Metric Entry with Unit Resolution:**
```typescript
{
  id: 'biometric-uuid',
  userId: 'user-id',
  metricType: 'weight',
  rawValue: 185,
  rawUnit: null,  // Not specified in voice
  resolvedValue: 185,
  resolvedUnit: 'lbs',
  unitResolutionMethod: 'user_preference',
  alternativeInterpretation: {
    value: 83.9,
    unit: 'kg',
    probability: 0.15
  },
  userConfirmed: false,  // Awaiting confirmation for Biohacker
  timestamp: Date.now()
}
```

#### 3. Parsing/Disambiguation Approach

**Unit resolution pipeline:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/unit_resolver.ts
function resolveUnit(
  value: number,
  metricType: string,
  transcript: string,
  userProfile: UnitProfile
): UnitResolution {
  // 1. Check for explicit unit in transcript
  const explicitUnit = extractExplicitUnit(transcript, metricType);
  if (explicitUnit) {
    return { unit: explicitUnit, method: 'explicit', confidence: 0.99 };
  }

  // 2. Check for context clues
  const contextUnit = detectContextUnit(transcript, userProfile);
  if (contextUnit && contextUnit.confidence > 0.80) {
    return { unit: contextUnit.unit, method: 'context', confidence: contextUnit.confidence };
  }

  // 3. Apply plausibility filter
  const plausibleUnits = filterPlausibleUnits(value, metricType);

  // 4. Use user preference if value is plausible
  const preferred = userProfile.unitPreferences[metricType].primary;
  if (plausibleUnits.includes(preferred)) {
    return { unit: preferred, method: 'preference', confidence: 0.85 };
  }

  // 5. For Biohacker: require confirmation if uncertain
  return { unit: null, requiresConfirmation: true, candidates: plausibleUnits };
}
```

**Plausibility ranges by unit:**
```typescript
const WEIGHT_PLAUSIBILITY = {
  lbs: { min: 80, max: 400 },  // Human weight range
  kg: { min: 36, max: 180 }
};
// 185 is plausible for both, so need other signals
```

#### 4. Gamification Impact

**Data quality emphasis for Biohacker:**
```typescript
{
  unitConfirmation: {
    confirmed: true,
    quickConfirmUsed: true,  // One-tap confirmation
    bonusXP: 5,
    dataIntegrityScore: 99.2,
    message: "Units confirmed—your data stays accurate."
  }
}
```

**Streak protection:**
- Entry logged even if unit unconfirmed
- Unconfirmed units flagged for review
- Weekly summary prompts for unresolved entries

#### 5. Architecture Solution

**Unit resolution with confirmation:**
```
Voice Capture → Transcription → Value Extraction
                                        ↓
                                Check explicit unit
                                        ↓
                    ┌───────────────────┴───────────────────┐
                Explicit unit                    No unit specified
                        ↓                               ↓
                Apply and save               Check user preferences
                                                        ↓
                                            Apply plausibility filter
                                                        ↓
                                    ┌───────────────────┴───────────────────┐
                                Confident                    Ambiguous
                                    ↓                               ↓
                            Apply preferred          Show quick confirmation
                                    ↓                               ↓
                            Save entry               User confirms unit
                                                            ↓
                                                    Save with confirmation
```

**Quick unit confirmation UI:**
```typescript
// File: apps/insight-mobile/src/components/UnitConfirmation.tsx
<UnitConfirmation
  value={185}
  metric="weight"
  primaryOption={{ unit: 'lbs', display: '185 lbs' }}
  secondaryOption={{ unit: 'kg', display: '185 kg (83.9 lbs)' }}
  onSelect={handleUnitSelect}
  timeout={5000}  // Auto-accept primary after 5s if no response
/>
```

**File references:**
- Unit resolver: `supabase/functions/transcribe_and_parse_capture/unit_resolver.ts:23`
- Unit confirmation: `apps/insight-mobile/src/components/UnitConfirmation.tsx:45`
- Preference management: `apps/insight-mobile/src/screens/UnitPreferencesScreen.tsx:12`

---

### UC-E020: Intent Classification Failure (Optimizer)

#### 1. User Phrase/Scenario

Alex says: "Track my deadlift progress." The parser cannot determine if this is:
1. A command to log a new deadlift workout
2. A request to view deadlift history/progress
3. A goal-setting action (track progress toward a target)
4. A request to set up deadlift tracking if not already configured

All four interpretations are valid for an Optimizer who meticulously tracks workouts. The system must disambiguate the intent without frustrating the user.

Intent classification challenges:
- "Track X" (log vs view vs configure)
- "Add to my routine" (add entry vs modify routine template)
- "Show me my data" (today vs history vs analytics)
- "Update my weight" (log new vs edit previous)
- "Check my streak" (view vs verify vs troubleshoot)
- "Fix my last entry" (edit vs delete vs investigate error)

Optimizers expect the system to understand their intent from context and not require tedious clarification for common operations.

#### 2. Data Model Mapping

**Intent Classification Result:**

```typescript
{
  id: 'classification-uuid',
  captureId: 'capture-uuid',
  userId: 'user-id',
  rawText: 'Track my deadlift progress',
  candidateIntents: [
    { intent: 'log_workout', confidence: 0.42, parameters: { exercise: 'deadlift' } },
    { intent: 'view_progress', confidence: 0.38, parameters: { exercise: 'deadlift' } },
    { intent: 'set_goal', confidence: 0.15, parameters: { exercise: 'deadlift' } },
    { intent: 'configure_tracking', confidence: 0.05, parameters: { exercise: 'deadlift' } }
  ],
  topConfidence: 0.42,
  confidenceGap: 0.04,  // Too small to auto-select
  requiresDisambiguation: true,
  contextSignals: {
    recentActivity: 'just_finished_workout',
    timeOfDay: 'evening',
    previousCommand: 'logged_bench_press',
    deadliftLoggedToday: false
  }
}
```

**Context-Aware Resolution:**
```typescript
{
  resolution: 'log_workout',  // Based on context
  method: 'context_inference',
  contextRationale: [
    'User just finished workout (logged bench press)',
    'Evening time (typical workout completion window)',
    'Deadlift not yet logged today',
    '"Track" following workout logs typically means "log"'
  ],
  confidence: 0.78,  // Boosted by context
  showQuickConfirmation: true  // For Optimizer, show what we're doing
}
```

#### 3. Parsing/Disambiguation Approach

**Context-enhanced classification:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/intent_classifier.ts
async function classifyIntent(
  text: string,
  userId: string,
  sessionContext: SessionContext
): ClassificationResult {
  // 1. Base classification from NLP
  const baseIntents = await nlpClassifier.classify(text);

  // 2. Apply context boosting
  const boostedIntents = applyContextBoost(baseIntents, sessionContext);

  // 3. Check if confident enough for auto-selection
  const top = boostedIntents[0];
  const runnerUp = boostedIntents[1];

  if (top.confidence > 0.75 && top.confidence - runnerUp.confidence > 0.20) {
    return {
      intent: top.intent,
      confident: true,
      showConfirmation: sessionContext.userPersona === 'optimizer'  // Optimizer likes transparency
    };
  }

  // 4. Disambiguation required
  return {
    intent: null,
    confident: false,
    candidates: boostedIntents.slice(0, 3),  // Top 3 options
    suggestFirst: top.intent  // Highlight most likely
  };
}
```

**Context signals that influence classification:**
- Time of day (morning = planning, evening = logging)
- Recent activities (just logged X → probably logging Y)
- User patterns (Optimizer typically views after logging)
- Session flow (third workout entry = probably logging)

#### 4. Gamification Impact

**Flow preservation:**
```typescript
{
  intentResolution: {
    resolved: true,
    method: 'one_tap_confirmation',
    flowInterrupted: false,  // Minimal friction
    bonusXP: 0,  // No bonus for basic operation
    experienceMessage: null  // Silent success
  }
}
```

**Optimizer-specific UX:**
- Show brief confirmation of interpreted action
- Allow quick correction with single tap
- Learn from corrections to improve future classification

#### 5. Architecture Solution

**Intent classification with context:**
```
Voice Capture → Transcription → Intent Classification
                                        ↓
                                Base NLP classification
                                        ↓
                                Apply context boosting
                                        ↓
                    ┌───────────────────┴───────────────────┐
                Confident (>75%)                    Uncertain
                        ↓                               ↓
            Show quick confirmation          Present top options
                        ↓                               ↓
            User taps or ignores              User selects intent
                        ↓                               ↓
                Execute intent               Learn from selection
                        ↓                               ↓
                Log for learning             Execute intent
```

**Quick confirmation UI for Optimizer:**
```typescript
// File: apps/insight-mobile/src/components/IntentConfirmation.tsx
<IntentConfirmation
  interpretedAs="Log deadlift workout"
  alternatives={['View progress', 'Set goal']}
  onConfirm={executeLogWorkout}
  onChangeIntent={showAlternatives}
  autoConfirmDelay={2000}  // Proceed after 2s if no objection
/>
```

**File references:**
- Intent classifier: `supabase/functions/transcribe_and_parse_capture/intent_classifier.ts:56`
- Context engine: `supabase/functions/transcribe_and_parse_capture/context_engine.ts:34`
- Confirmation UI: `apps/insight-mobile/src/components/IntentConfirmation.tsx:23`

---

### UC-E021: Entity Extraction Failure (Dabbler)

#### 1. User Phrase/Scenario

Jordan says: "Had that thing with the green stuff and bread for lunch." The parser cannot extract a recognizable meal. "That thing" could be a sandwich, salad, avocado toast, or numerous other items. "Green stuff" is ambiguous. Unlike an Optimizer who would say "turkey and avocado sandwich on whole wheat," the Dabbler speaks casually.

Vague entity descriptions common with Dabblers:
- "That thing from the place" (restaurant meal)
- "The usual morning stuff" (breakfast routine)
- "Some exercise" (unspecified workout)
- "My regular sleep" (typical sleep pattern)
- "The healthy option" (better choice, undefined)
- "A walk or something" (vague activity)
- "Food with the family" (social meal, no details)

Dabblers prioritize speed and ease over precision. The system should accommodate this communication style rather than forcing detail extraction.

#### 2. Data Model Mapping

**Vague Entry Record:**

```typescript
{
  id: 'entry-uuid',
  userId: 'user-id',
  entryType: 'meal',
  rawText: 'Had that thing with the green stuff and bread for lunch',
  entityExtraction: {
    success: false,
    reason: 'insufficient_specificity',
    partialEntities: [
      { type: 'ingredient', value: 'green_vegetable', confidence: 0.45 },
      { type: 'ingredient', value: 'bread', confidence: 0.92 },
      { type: 'meal_type', value: 'lunch', confidence: 0.98 }
    ],
    suggestedCategory: 'sandwich_or_salad',
    suggestedConfidence: 0.55
  }
}
```

**Accepted Vague Meal:**
```typescript
{
  id: 'meal-uuid',
  userId: 'user-id',
  mealType: 'lunch',
  description: 'That thing with the green stuff and bread',
  category: 'sandwich_salad',  // Best guess
  ingredients: ['greens', 'bread'],  // Extracted partials
  estimatedCalories: null,  // Cannot estimate reliably
  source: 'voice_vague',
  acceptedAsIs: true,
  dabblerMode: true  // Flag for analytics
}
```

#### 3. Parsing/Disambiguation Approach

**Dabbler-optimized extraction:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/dabbler_parser.ts
function extractForDabbler(text: string, entryType: string): DabblerExtraction {
  // 1. Extract what we can with certainty
  const certain = extractHighConfidenceEntities(text);

  // 2. Make reasonable category guess
  const category = inferCategoryFromPartials(certain, entryType);

  // 3. Accept vagueness - don't prompt for clarification
  return {
    accepted: true,
    entities: certain,
    category: category,
    description: text,  // Preserve original phrasing
    promptForDetail: false,  // Never for Dabbler
    nutritionEstimate: null  // Don't guess nutrition from vague data
  };
}
```

**Key principle:**
- For Dabblers: accept and log what we have
- Never block entry creation for missing details
- Use original text as description when entities unclear
- Learning over time: "green stuff" may become "spinach" if pattern emerges

#### 4. Gamification Impact

**Celebrating logging, not precision:**
```typescript
{
  loggingReward: {
    baseXP: 10,
    detailBonus: 0,  // No penalty for vagueness
    streakMaintained: true,
    message: "Lunch logged! ✓",  // Simple affirmation
    suggestDetail: false  // Don't nag about specifics
  }
}
```

**No shame messaging:**
- "Got it!" not "Entry incomplete"
- Progress tracked at category level
- Weekly summary: "You logged 7 lunches this week!" not "5 were missing details"

#### 5. Architecture Solution

**Vagueness-tolerant entry flow:**
```
Voice Capture → Transcription → Entity Extraction Attempt
                                        ↓
                        ┌───────────────┴───────────────┐
                    Success                    Partial/Failure
                        ↓                               ↓
                Create detailed              Check persona
                entry                               ↓
                                    ┌───────────────┴───────────────┐
                                Optimizer/Bio           Dabbler/Reflector
                                        ↓                       ↓
                            Prompt for detail          Accept as-is
                                        ↓                       ↓
                            Create entry            Create vague entry
```

**Vague entry display:**
```typescript
// File: apps/insight-mobile/src/components/VagueEntryCard.tsx
<VagueEntryCard
  entry={meal}
  showDescription={true}
  showCategory={true}
  showNutrition={false}  // Don't show empty nutrition for vague entries
  editPrompt={null}  // No "add details" for Dabbler
/>
```

**File references:**
- Dabbler parser: `supabase/functions/transcribe_and_parse_capture/dabbler_parser.ts:23`
- Vague entry handling: `apps/insight-mobile/src/storage/vagueEntries.ts:45`
- Entry display: `apps/insight-mobile/src/components/VagueEntryCard.tsx:12`

---

### UC-E022: Multi-Domain Confusion (Privacy-First)

#### 1. User Phrase/Scenario

Morgan says: "Worked out my frustration at the gym, then meditated on it." The capture spans multiple domains: workout (gym), mood (frustration), and mindfulness (meditation). The parser must determine which domains to log entries for while respecting Morgan's privacy preferences—emotional content may require different handling than physical activity.

Multi-domain scenarios requiring careful parsing:
- "Stress-ate some ice cream" (mood + nutrition, sensitive)
- "Ran to clear my head" (workout + mental health)
- "Couldn't sleep because of anxiety" (sleep + mood)
- "Skipped my meds today, felt awful" (medication + mood, medical privacy)
- "Journaled about my workout" (journal + workout)
- "Meditation helped with my pain" (mindfulness + health condition)

Privacy-First users need transparency about which domains will receive entries and assurance that emotional or medical content is handled appropriately.

#### 2. Data Model Mapping

**Multi-Domain Parse Result:**

```typescript
{
  id: 'multidomain-uuid',
  captureId: 'capture-uuid',
  userId: 'user-id',
  detectedDomains: [
    { domain: 'workout', confidence: 0.92, content: 'worked out at the gym' },
    { domain: 'mood', confidence: 0.78, content: 'frustration', sensitive: true },
    { domain: 'mindfulness', confidence: 0.88, content: 'meditated' }
  ],
  crossDomainConnection: 'emotional_regulation',  // Gym+meditation related to frustration
  privacyConsiderations: {
    sensitiveDomains: ['mood'],
    requiresConfirmation: true,
    suggestedPrivacyLevels: {
      workout: 'standard',
      mood: 'private',
      mindfulness: 'standard'
    }
  }
}
```

**Created Entries (pending confirmation):**
```typescript
// Workout entry
{
  id: 'workout-uuid',
  entryType: 'workout',
  description: 'Gym session',
  emotionalContext: 'frustration',  // Linked but not exposed
  privacyLevel: 'standard'
}

// Mood entry
{
  id: 'mood-uuid',
  entryType: 'mood',
  emotion: 'frustration',
  intensityLevel: 'moderate',
  copingAction: 'exercise',
  privacyLevel: 'private',  // Elevated privacy
  linkedEntries: ['workout-uuid', 'mindfulness-uuid']
}

// Mindfulness entry
{
  id: 'mindfulness-uuid',
  entryType: 'mindfulness',
  activity: 'meditation',
  purpose: 'emotional_processing',
  privacyLevel: 'standard'
}
```

#### 3. Parsing/Disambiguation Approach

**Multi-domain with privacy awareness:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/multidomain.ts
async function parseMultiDomain(
  text: string,
  userId: string,
  privacySettings: PrivacySettings
): MultiDomainResult {
  // 1. Identify all domains present
  const domains = await identifyDomains(text);

  // 2. Check for sensitive content
  const sensitive = domains.filter(d =>
    SENSITIVE_DOMAINS.includes(d.domain) || containsSensitiveKeywords(d.content)
  );

  // 3. For Privacy-First users: flag for confirmation
  if (sensitive.length > 0 && privacySettings.confirmSensitive) {
    return {
      domains: domains,
      requiresConfirmation: true,
      message: `This will create entries in: ${domains.map(d => d.domain).join(', ')}. ` +
               `"${sensitive[0].domain}" content will be marked private. OK?`
    };
  }

  // 4. Apply appropriate privacy levels
  return {
    domains: domains.map(d => ({
      ...d,
      privacyLevel: sensitive.includes(d) ? 'private' : 'standard'
    })),
    requiresConfirmation: false
  };
}
```

**Privacy-First specific handling:**
- Show exactly which domains will receive entries
- Offer per-domain privacy level selection
- Default to elevated privacy for emotional/medical content
- Allow suppressing specific domains from logging

#### 4. Gamification Impact

**Respectful cross-domain rewards:**
```typescript
{
  multiDomainLogging: {
    domainsLogged: ['workout', 'mood', 'mindfulness'],
    connectionBonus: true,  // Logged connected activities
    bonusXP: 25,
    message: "Holistic tracking—gym, reflection, and meditation connected.",
    privacyRespected: true
  }
}
```

**Privacy doesn't reduce rewards:**
- Private entries earn same XP as public
- Choosing to skip sensitive domain logging is respected
- No "complete your log" pressure for emotional content

#### 5. Architecture Solution

**Multi-domain with confirmation:**
```
Voice Capture → Transcription → Domain Detection
                                        ↓
                                Identify all domains
                                        ↓
                                Check for sensitive content
                                        ↓
                    ┌───────────────────┴───────────────────┐
                No sensitive                    Sensitive detected
                        ↓                               ↓
            Create all entries              Show confirmation
                                                        ↓
                                            User confirms/adjusts
                                                        ↓
                                            Apply privacy levels
                                                        ↓
                                            Create entries
```

**Multi-domain confirmation UI:**
```typescript
// File: apps/insight-mobile/src/components/MultiDomainConfirmation.tsx
<MultiDomainConfirmation
  domains={[
    { name: 'Workout', icon: '🏋️', privacy: 'standard', included: true },
    { name: 'Mood', icon: '😤', privacy: 'private', included: true },
    { name: 'Meditation', icon: '🧘', privacy: 'standard', included: true }
  ]}
  onToggleInclude={handleToggle}
  onChangePrivacy={handlePrivacy}
  onConfirm={handleConfirm}
/>
```

**File references:**
- Multi-domain parser: `supabase/functions/transcribe_and_parse_capture/multidomain.ts:34`
- Privacy evaluator: `supabase/functions/transcribe_and_parse_capture/privacy_eval.ts:23`
- Confirmation UI: `apps/insight-mobile/src/components/MultiDomainConfirmation.tsx:12`

---

### UC-E023: Sarcasm/Irony Detection (Neurodivergent)

#### 1. User Phrase/Scenario

Riley says: "Oh great, another perfect night of sleep" when they actually had insomnia. The literal interpretation would log a positive sleep entry, but the sarcastic tone indicates the opposite. Neurodivergent users may use sarcasm as a coping mechanism, and the system must either detect it or create safe paths for correction.

Sarcasm detection challenges:
- "Wonderful, I forgot my meds again" (negative event, positive words)
- "Super productive day" (might be genuine or sarcastic)
- "Just fantastic, another headache" (clear sarcasm)
- "Best workout ever" (might be genuine enthusiasm)
- "Really nailed that routine" (could be success or failure)
- "My body is thanking me" (genuine or sarcastic after hard workout)

Neurodivergent users may mask or use irony to process difficult experiences. The system should be careful not to misinterpret emotional coping as positive data.

#### 2. Data Model Mapping

**Sarcasm Detection Result:**

```typescript
{
  id: 'sarcasm-check-uuid',
  captureId: 'capture-uuid',
  userId: 'user-id',
  text: 'Oh great, another perfect night of sleep',
  sarcasmSignals: {
    exaggerationWords: ['perfect'],
    contrastMarkers: ['oh great', 'another'],
    punctuationPattern: null,  // No punctuation in voice
    voiceToneAnalysis: {
      available: true,
      flatAffect: true,  // Monotone delivery
      sighDetected: true
    }
  },
  sarcasmProbability: 0.78,
  literalInterpretation: { sentiment: 'positive', sleep_quality: 'excellent' },
  sarcasticInterpretation: { sentiment: 'negative', sleep_quality: 'poor' },
  recommendation: 'ask_for_clarification'  // Don't assume
}
```

**Clarified Entry:**
```typescript
{
  id: 'sleep-uuid',
  userId: 'user-id',
  entryType: 'sleep',
  quality: 'poor',
  originalText: 'Oh great, another perfect night of sleep',
  sarcasmResolved: true,
  resolutionMethod: 'user_clarification',
  mood: 'frustrated'  // Inferred from sarcasm context
}
```

#### 3. Parsing/Disambiguation Approach

**Sarcasm detection pipeline:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/sarcasm.ts
async function detectSarcasm(
  text: string,
  audioFeatures: AudioAnalysis | null
): SarcasmResult {
  const signals = [];

  // 1. Lexical sarcasm markers
  if (containsExaggeration(text)) signals.push('exaggeration');
  if (containsContrastMarkers(text)) signals.push('contrast_markers');
  if (startsWithOh(text)) signals.push('oh_opener');

  // 2. Voice tone analysis (if available)
  if (audioFeatures) {
    if (audioFeatures.flatAffect) signals.push('flat_tone');
    if (audioFeatures.sighDetected) signals.push('sigh');
    if (audioFeatures.eyeRoll) signals.push('vocal_eyeroll');  // Specific inflection
  }

  // 3. Calculate probability
  const probability = calculateSarcasmProbability(signals);

  // 4. For Neurodivergent users: gentler clarification
  if (probability > 0.60) {
    return {
      detected: true,
      probability,
      action: 'gentle_clarification',
      message: 'Sounds like a tough night. Want to log how it really went?'
    };
  }

  return { detected: false };
}
```

**Neurodivergent-sensitive clarification:**
- No accusatory tone ("Did you mean that sarcastically?")
- Offer binary choice: "Good night or rough night?"
- Acknowledge the emotion behind the sarcasm
- Don't over-explain or make it awkward

#### 4. Gamification Impact

**Emotional validation without judgment:**
```typescript
{
  emotionalProcessing: {
    sarcasmUsed: true,
    copingMechanismRecognized: true,
    bonusXP: 10,
    message: "Tough night logged. Tracking the hard days matters too.",
    trendTracking: true  // Track sleep issues for patterns
  }
}
```

**No penalty for expressive language:**
- Sarcasm is valid communication
- Clarification is quick and judgment-free
- Entry counts for streak regardless of sentiment

#### 5. Architecture Solution

**Sarcasm-aware entry flow:**
```
Voice Capture → Transcription + Audio Analysis
                            ↓
                    Sarcasm Detection
                            ↓
        ┌───────────────────┴───────────────────┐
    Low probability                    High probability
            ↓                               ↓
    Parse literally              Show gentle clarification
            ↓                               ↓
    Create entry                 User confirms intent
                                            ↓
                                Parse with actual meaning
                                            ↓
                                Create corrected entry
```

**Gentle clarification UI:**
```typescript
// File: apps/insight-mobile/src/components/ToneCheck.tsx
<ToneCheck
  originalText={text}
  question="How'd you actually sleep?"
  options={[
    { label: 'Really well', value: 'good', emoji: '😊' },
    { label: 'Not great', value: 'poor', emoji: '😔' }
  ]}
  onSelect={handleSelection}
  skipOption="Log as-is"
/>
```

**File references:**
- Sarcasm detection: `supabase/functions/transcribe_and_parse_capture/sarcasm.ts:23`
- Tone analysis: `supabase/functions/transcribe_and_parse_capture/audio_tone.ts:45`
- Tone check UI: `apps/insight-mobile/src/components/ToneCheck.tsx:12`

---

### UC-E024: Language Model Hallucination (Reflector)

#### 1. User Phrase/Scenario

Casey says: "Spent time with family today." The parser, attempting to be helpful, fills in details that weren't stated: "Had brunch with parents and siblings at a restaurant." Casey only mentioned spending time with family—the specifics were hallucinated by the AI. For a Reflector doing introspective journaling, having words put in their mouth undermines the authenticity of their practice.

Hallucination risks in health tracking:
- Adding specifics not mentioned (meals, exercises, times)
- Inferring relationships (assuming "family" = parents)
- Filling in locations (adding venues not stated)
- Expanding emotional descriptions (assuming sentiment details)
- Creating quantities (guessing portions, reps, durations)
- Inventing context (assuming reasons for activities)

Reflectors value authenticity in their journaling practice. Fabricated details are worse than missing details because they corrupt the record of their actual experience.

#### 2. Data Model Mapping

**Hallucination Prevention Record:**

```typescript
{
  id: 'parse-audit-uuid',
  captureId: 'capture-uuid',
  userId: 'user-id',
  rawText: 'Spent time with family today',
  parserOutput: {
    activity: 'family_time',
    people: ['family'],
    location: null,  // NOT INFERRED
    specificActivities: null,  // NOT INFERRED
    duration: null,  // NOT INFERRED
    mood: null  // NOT INFERRED
  },
  inferredFields: [],  // Empty = no hallucination
  preservedAsSpoken: true,
  hallucination: {
    detected: false,
    blockedInferences: [
      { field: 'location', wouldHaveGuessed: 'restaurant', confidence: 0.35 },
      { field: 'people', wouldHaveGuessed: 'parents', confidence: 0.42 }
    ]
  }
}
```

**Clean Journal Entry:**
```typescript
{
  id: 'journal-uuid',
  userId: 'user-id',
  entryType: 'social',
  content: 'Spent time with family today',
  parsedData: {
    activity: 'family_time',
    category: 'social_connection'
  },
  // No fabricated details
  source: 'voice',
  preservedOriginal: true
}
```

#### 3. Parsing/Disambiguation Approach

**Strict extraction (no inference):**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/strict_parser.ts
function strictExtract(text: string, entryType: string): StrictParseResult {
  const extracted = {};

  // Only extract what is EXPLICITLY stated
  for (const field of EXTRACTABLE_FIELDS[entryType]) {
    const value = extractExplicit(text, field);
    if (value.confidence > 0.85) {
      extracted[field] = value.value;
    }
    // Low confidence = leave null, don't guess
  }

  return {
    parsed: extracted,
    preservedText: text,
    inferenceBlocker: {
      active: true,
      blockedGuesses: logBlockedInferences(text, extracted)
    }
  };
}
```

**Hallucination prevention measures:**
- Confidence threshold 0.85 for extraction (vs 0.60 for inference)
- Explicit list of "never infer" fields (relationships, locations, emotions)
- Audit log of blocked inferences for quality monitoring
- User can enable inference if they prefer (opt-in, not default)

#### 4. Gamification Impact

**Authenticity over completeness:**
```typescript
{
  journalingReward: {
    baseXP: 15,
    authenticityBonus: 5,  // For unedited, original entry
    totalXP: 20,
    message: "Your words, preserved exactly as you said them.",
    reflection: true
  }
}
```

**No detail pressure:**
- Vague entries count fully for journaling streaks
- "Quality" defined by consistency, not specificity
- Optional prompts for reflection, never for detail

#### 5. Architecture Solution

**Hallucination-safe parsing:**
```
Voice Capture → Transcription → Strict Extraction
                                        ↓
                            Extract explicit entities only
                                        ↓
                            Block low-confidence inferences
                                        ↓
                            Log blocked guesses (audit)
                                        ↓
                            Create entry with nulls for unknowns
                                        ↓
                            Preserve original text verbatim
```

**Inference opt-in (advanced setting):**
```typescript
// File: apps/insight-mobile/src/screens/ParsingPreferences.tsx
<ParsingPreference
  name="Allow AI Inference"
  description="Let the system fill in likely details (meal types, durations, etc.)"
  default={false}
  currentValue={userPrefs.allowInference}
  onChange={handleChange}
  warning="Your entries may include guessed details"
/>
```

**File references:**
- Strict parser: `supabase/functions/transcribe_and_parse_capture/strict_parser.ts:23`
- Inference blocker: `supabase/functions/transcribe_and_parse_capture/inference_blocker.ts:45`
- Preferences: `apps/insight-mobile/src/screens/ParsingPreferences.tsx:12`

---

## Sync/Network Errors

### UC-E025: Offline Mode Entry (Optimizer)

#### 1. User Phrase/Scenario

Alex is in an airplane with no connectivity and logs: "Just finished a 5K run at the airport before boarding. 24:32, felt good." The app is in offline mode. Alex expects the entry to be captured locally and synced seamlessly when connectivity returns, without any data loss or degradation.

Offline scenarios requiring robust local storage:
- Air travel (no connectivity for hours)
- International travel (no local SIM)
- Gym basements (poor signal)
- Hiking/outdoor activities (no coverage)
- Subway/underground transit
- Spotty rural connectivity
- Wi-Fi only device with no available network

Optimizers have zero tolerance for data loss. An entry made offline must be indistinguishable from one made online after sync completes.

#### 2. Data Model Mapping

**Offline Queue Entry:**

```typescript
{
  id: 'offline-queue-uuid',
  localId: 'local-entry-uuid',
  userId: 'user-id',
  capturedAt: Date.now(),
  syncStatus: 'pending',
  entryData: {
    entryType: 'workout',
    workoutType: 'running',
    distance: { value: 5, unit: 'km' },
    duration: { minutes: 24, seconds: 32 },
    sentiment: 'positive',
    location: 'airport',
    notes: 'Before boarding'
  },
  audioData: {
    localUri: 'file:///local/audio/uuid.m4a',
    cloudBackupPending: true
  },
  connectivity: {
    offlineAt: Date.now(),
    lastOnlineAt: Date.now() - (2 * 60 * 60 * 1000),  // 2 hours ago
    estimatedOfflineDuration: 'flight'
  },
  queuePosition: 1,
  retryCount: 0
}
```

**Synced Entry (post-connectivity):**
```typescript
{
  id: 'server-uuid',
  localId: 'local-entry-uuid',  // Preserved for reference
  userId: 'user-id',
  entryType: 'workout',
  createdAt: Date.now() - (3 * 60 * 60 * 1000),  // Original capture time
  syncedAt: Date.now(),
  offlineOrigin: true,
  // All data identical to online entry
}
```

#### 3. Parsing/Disambiguation Approach

**Offline parsing:**
```typescript
// File: apps/insight-mobile/src/capture/OfflineProcessor.ts
async function processOffline(capture: VoiceCapture): OfflineResult {
  // 1. Run on-device speech-to-text
  const transcript = await onDeviceSTT(capture.audio);

  // 2. Run lightweight on-device parsing
  const parsed = await localParser.parse(transcript, {
    mode: 'offline',
    confidenceThreshold: 0.70  // Slightly lower for on-device
  });

  // 3. Store in offline queue
  await offlineQueue.add({
    capture,
    transcript,
    parsed,
    requiresCloudValidation: parsed.confidence < 0.85
  });

  // 4. Return optimistic result
  return {
    success: true,
    entry: createLocalEntry(parsed),
    willSyncWhenOnline: true
  };
}
```

**On-device capabilities:**
- Basic speech-to-text (smaller model)
- Entity extraction for common patterns
- Gamification calculation (offline XP tracking)
- Full audio preservation for cloud validation later

#### 4. Gamification Impact

**Streak protection during offline:**
```typescript
{
  offlineEntry: {
    logged: true,
    streakMaintained: true,
    offlineXP: 25,  // Full XP calculated locally
    syncPending: true,
    message: "Entry saved! Will sync when you're back online.",
    offlineStreak: true  // Counts for streak immediately
  }
}
```

**No penalty for connectivity:**
- Entries count the moment they're created
- XP awarded locally, reconciled on sync
- Streak never breaks due to sync delay

#### 5. Architecture Solution

**Offline-first entry flow:**
```
Voice Capture → On-Device STT
                    ↓
            On-Device Parsing
                    ↓
            Store in Offline Queue
                    ↓
            Show Entry in UI (optimistic)
                    ↓
            Award Local XP
                    ↓
    [Later, when online]
                    ↓
            Sync Queue to Server
                    ↓
            Cloud Validation (optional re-parse)
                    ↓
            Reconcile XP (usually no change)
                    ↓
            Remove from Queue
```

**Offline indicator UI:**
```typescript
// File: apps/insight-mobile/src/components/OfflineIndicator.tsx
<OfflineIndicator
  mode="airplane"
  pendingEntries={3}
  message="3 entries will sync when you're back online"
  estimatedSyncTime={null}  // Unknown
/>
```

**File references:**
- Offline processor: `apps/insight-mobile/src/capture/OfflineProcessor.ts:23`
- Offline queue: `apps/insight-mobile/src/storage/offlineQueue.ts:45`
- Sync engine: `apps/insight-mobile/src/sync/SyncEngine.ts:67`

---

### UC-E026: Sync Conflict - Same Entry Modified (Dabbler)

#### 1. User Phrase/Scenario

Jordan logs "Had pizza for dinner" on their phone, then edits it on their tablet to "Had pepperoni pizza for dinner" before the phone syncs. When sync occurs, there are two versions of the same entry. For a Dabbler, the conflict should be resolved automatically—they don't want to think about version control for their dinner log.

Sync conflict scenarios:
- Same entry edited on two devices before sync
- Offline edits conflict with online edits from another device
- Shared account with spouse makes overlapping changes
- Widget quick-edit conflicts with in-app detailed edit
- Watch entry vs phone entry for same workout
- Auto-detected data (GPS, heart rate) conflicts with manual entry

Dabblers expect conflicts to "just resolve themselves" without technical decisions about merge strategies or version picking.

#### 2. Data Model Mapping

**Conflict Record:**

```typescript
{
  id: 'conflict-uuid',
  entryId: 'entry-uuid',
  userId: 'user-id',
  conflictType: 'concurrent_edit',
  versions: [
    {
      source: 'phone',
      modifiedAt: Date.now() - 60000,
      content: { description: 'Had pizza for dinner' },
      changeVector: ['description']
    },
    {
      source: 'tablet',
      modifiedAt: Date.now() - 30000,
      content: { description: 'Had pepperoni pizza for dinner' },
      changeVector: ['description']
    }
  ],
  autoResolution: {
    strategy: 'last_write_wins',
    winner: 'tablet',
    rationale: 'Later modification with more detail',
    userNotification: 'none'  // Silent for Dabbler
  }
}
```

**Resolved Entry:**
```typescript
{
  id: 'entry-uuid',
  description: 'Had pepperoni pizza for dinner',
  conflictResolved: true,
  resolutionMethod: 'auto_merge',
  previousVersions: ['conflict-uuid']  // Audit trail
}
```

#### 3. Parsing/Disambiguation Approach

**Auto-resolution for Dabbler:**
```typescript
// File: apps/insight-mobile/src/sync/ConflictResolver.ts
function resolveConflict(versions: EntryVersion[], persona: Persona): Resolution {
  if (persona.type === 'dabbler') {
    // Auto-resolve: prefer more detailed version
    const mostDetailed = versions.sort((a, b) =>
      b.content.description.length - a.content.description.length
    )[0];

    return {
      strategy: 'auto_detail',
      winner: mostDetailed,
      notify: false,
      preserveOthers: true  // Keep in history
    };
  }

  // For other personas, may require user input
  return { strategy: 'user_choice', candidates: versions };
}
```

**Auto-resolution strategies:**
- More detail wins (longer description)
- Later timestamp wins (for simple entries)
- Merge non-conflicting fields
- Prefer manually entered over auto-detected

#### 4. Gamification Impact

**Conflict never affects streaks:**
```typescript
{
  conflictResolution: {
    resolved: true,
    automatic: true,
    streakProtected: true,
    xpUnaffected: true,
    message: null  // Silent resolution
  }
}
```

**No cognitive overhead:**
- Dabbler never sees "conflict" terminology
- Resolution happens in background
- Entry appears as expected after sync

#### 5. Architecture Solution

**Silent conflict resolution:**
```
Sync Attempt → Conflict Detected
                    ↓
            Check Persona Tolerance
                    ↓
    ┌───────────────┴───────────────┐
Dabbler/High                    Optimizer/Low
        ↓                               ↓
Auto-resolve                    Show conflict UI
        ↓                               ↓
Apply winner                    User chooses
        ↓                               ↓
Preserve history                Apply selection
        ↓                               ↓
Continue silently               Notify resolution
```

**File references:**
- Conflict resolver: `apps/insight-mobile/src/sync/ConflictResolver.ts:45`
- Merge strategies: `apps/insight-mobile/src/sync/MergeStrategies.ts:23`
- Version history: `apps/insight-mobile/src/storage/versionHistory.ts:67`

---

### UC-E027: Network Timeout During Upload (Privacy-First)

#### 1. User Phrase/Scenario

Morgan logs a sensitive journal entry about a therapy session. During upload, the network times out. Morgan needs assurance that: (1) the entry is saved locally, (2) no partial data leaked to the server, (3) the entry will sync when connectivity improves, and (4) their privacy settings will be honored during eventual sync.

Privacy concerns during network failure:
- Did partial data reach the server?
- Will retry expose data to different network conditions?
- Are my privacy settings applied locally while waiting?
- Can I verify nothing was transmitted during failure?
- What happens if I delete before sync completes?

Privacy-First users need transparency about data state during network failures, especially for sensitive content.

#### 2. Data Model Mapping

**Upload State Tracking:**

```typescript
{
  id: 'upload-state-uuid',
  entryId: 'local-entry-uuid',
  userId: 'user-id',
  uploadAttempt: {
    startedAt: Date.now() - 30000,
    timedOutAt: Date.now(),
    bytesTransmitted: 0,  // Nothing sent successfully
    dataLeakage: 'none',
    serverAcknowledged: false
  },
  localState: {
    entryPreserved: true,
    privacyLevel: 'private',
    encryptedLocally: true,
    scheduledRetry: Date.now() + 300000  // 5 minutes
  },
  userNotification: {
    shown: true,
    message: 'Entry saved locally. Will sync securely when connected.',
    privacyAssurance: true
  }
}
```

**Local Entry with Privacy Guarantees:**
```typescript
{
  id: 'local-entry-uuid',
  content: '[encrypted locally]',
  privacyLevel: 'private',
  syncStatus: 'pending_timeout',
  serverKnowsAbout: false,  // Confirmed no server receipt
  localEncryption: {
    algorithm: 'AES-256-GCM',
    keyLocation: 'secure_enclave'
  }
}
```

#### 3. Parsing/Disambiguation Approach

**Secure timeout handling:**
```typescript
// File: apps/insight-mobile/src/sync/SecureUploader.ts
async function handleUploadTimeout(
  entry: LocalEntry,
  timeoutError: TimeoutError
): TimeoutResult {
  // 1. Verify no data reached server
  const serverCheck = await verifyNoPartialUpload(entry.id);

  // 2. Update local state
  await localStore.update(entry.id, {
    syncStatus: 'pending_timeout',
    serverKnowsAbout: !serverCheck.confirmed
  });

  // 3. Schedule secure retry
  await retryQueue.schedule(entry.id, {
    delay: 300000,  // 5 minutes
    requireSecureConnection: entry.privacyLevel === 'private',
    maxRetries: 10
  });

  // 4. Notify user with privacy assurance
  return {
    handled: true,
    userMessage: 'Entry saved locally. Your private data is encrypted and will sync securely.',
    privacyVerified: serverCheck.noLeakage
  };
}
```

**Privacy-First specific assurances:**
- Confirm nothing transmitted during timeout
- Show encryption status
- Offer option to delete before retry
- Allow manual sync trigger when ready

#### 4. Gamification Impact

**Entry counts immediately:**
```typescript
{
  offlineEntry: {
    creditedAt: Date.now(),  // Credit at capture time
    syncPending: true,
    streakMaintained: true,
    message: "Entry secured locally ✓"
  }
}
```

#### 5. Architecture Solution

**Secure timeout recovery:**
```
Upload Attempt → Timeout Detected
                        ↓
            Verify No Partial Upload
                        ↓
            Update Local State
                        ↓
            Encrypt Entry (if not already)
                        ↓
            Schedule Secure Retry
                        ↓
            Notify User (privacy assured)
                        ↓
    [Later]
                        ↓
            Retry on Secure Connection
                        ↓
            Complete Upload
                        ↓
            Verify Server State
```

**File references:**
- Secure uploader: `apps/insight-mobile/src/sync/SecureUploader.ts:34`
- Retry queue: `apps/insight-mobile/src/sync/RetryQueue.ts:23`
- Privacy verifier: `apps/insight-mobile/src/sync/PrivacyVerifier.ts:56`

---

### UC-E028: Background Sync Failure (Biohacker)

#### 1. User Phrase/Scenario

Sam's phone was syncing overnight biometric data from their Oura ring when the sync failed mid-stream. Morning shows: 47 HRV readings from the night partially synced. Sam needs to know: which readings made it, which didn't, and can the gap be filled? Data completeness is critical for trend analysis.

Background sync failure scenarios:
- Sleep data sync interrupted by phone restart
- Workout sync failed during low-battery shutdown
- Wearable data import stopped mid-stream
- Batch journal sync failed partway through
- Photo/media sync incomplete before network change
- Large data export failed at 80%

Biohackers need precise understanding of data completeness for accurate analysis.

#### 2. Data Model Mapping

**Partial Sync Record:**

```typescript
{
  id: 'sync-record-uuid',
  userId: 'user-id',
  syncType: 'background_wearable',
  source: 'oura_ring',
  status: 'partial_failure',
  progress: {
    totalRecords: 47,
    successfulRecords: 28,
    failedRecords: 19,
    lastSuccessfulTimestamp: '2026-01-18T03:42:00Z',
    firstFailedTimestamp: '2026-01-18T03:43:00Z'
  },
  gap: {
    startTime: '2026-01-18T03:43:00Z',
    endTime: '2026-01-18T06:00:00Z',
    duration: 137,  // minutes
    affectedMetrics: ['hrv', 'heart_rate', 'respiratory_rate']
  },
  recovery: {
    canRecover: true,
    source: 'oura_cloud',
    estimatedRecoveryTime: 45  // seconds
  }
}
```

**Data Completeness View:**
```typescript
{
  date: '2026-01-18',
  sleepData: {
    completeness: 0.60,  // 60% complete
    gapStart: '03:43',
    gapEnd: '06:00',
    totalReadings: 28,
    expectedReadings: 47,
    recovered: false
  }
}
```

#### 3. Parsing/Disambiguation Approach

**Gap detection and recovery:**
```typescript
// File: apps/insight-mobile/src/sync/GapRecovery.ts
async function detectAndRecoverGaps(
  syncResult: SyncResult,
  source: DataSource
): RecoveryResult {
  // 1. Identify gaps
  const gaps = identifyDataGaps(syncResult.successfulRecords, syncResult.expectedRange);

  // 2. Check recovery options
  const recoveryOptions = await checkRecoveryOptions(gaps, source);

  // 3. For Biohacker: prioritize data completeness
  if (recoveryOptions.cloudRecoveryAvailable) {
    // Attempt automatic recovery
    const recovered = await recoverFromCloud(gaps, source);
    return {
      success: recovered.complete,
      gapsFilled: recovered.records,
      remainingGaps: recovered.remaining
    };
  }

  // 4. Show data gap notification
  return {
    success: false,
    notification: `Missing ${gaps.length} readings from ${gaps[0].start} to ${gaps[0].end}. ` +
                  `Open Oura app to resync.`,
    actionRequired: true
  };
}
```

**Biohacker-specific handling:**
- Show exact gap times and affected metrics
- Attempt automatic recovery from source cloud
- Preserve partial data (don't discard incomplete)
- Flag affected analysis periods

#### 4. Gamification Impact

**Honest data quality metrics:**
```typescript
{
  dataCompleteness: {
    date: '2026-01-18',
    overallScore: 0.85,  // 85% complete
    streakProtection: true,  // Sync failure doesn't break streak
    message: "Sleep data 60% complete. Tap to recover missing readings.",
    analysisWarning: "Trend analysis may be affected by data gap."
  }
}
```

**No false analytics:**
- Incomplete data clearly marked
- Affected insights show warning
- Recovery prompt offered before analysis

#### 5. Architecture Solution

**Background sync recovery:**
```
Background Sync → Failure Detected
                        ↓
            Identify Successful Records
                        ↓
            Calculate Gap Range
                        ↓
            Check Recovery Sources
                        ↓
    ┌───────────────────┴───────────────────┐
Recovery Available                No Recovery
        ↓                               ↓
Auto-recover                    Notify User
        ↓                               ↓
Fill Gaps                       Mark Incomplete
        ↓                               ↓
Update Completeness             Show Recovery Options
```

**File references:**
- Gap recovery: `apps/insight-mobile/src/sync/GapRecovery.ts:34`
- Completeness tracker: `apps/insight-mobile/src/analytics/CompletenessTracker.ts:23`
- Wearable sync: `apps/insight-mobile/src/integrations/OuraSync.ts:78`

---

### UC-E029: Server Unreachable - Graceful Degradation (Neurodivergent)

#### 1. User Phrase/Scenario

Riley opens the app during a server outage. They want to log that they completed their morning routine (a significant achievement for them). The server is completely unreachable, but Riley needs the app to work—their routine depends on it, and disruption causes anxiety.

Server outage impact for Neurodivergent users:
- Routine completion logging is part of the routine itself
- Uncertainty about data state causes anxiety
- Need clear indication of what works and what doesn't
- Loading states without resolution are distressing
- Failed features should disappear, not show errors

Neurodivergent users need the app to gracefully degrade to a fully functional offline mode without error messages or uncertainty.

#### 2. Data Model Mapping

**Degraded Mode State:**

```typescript
{
  id: 'degraded-state-uuid',
  userId: 'user-id',
  serverStatus: 'unreachable',
  detectedAt: Date.now(),
  mode: 'full_offline',
  availableFeatures: [
    'voice_capture',
    'entry_creation',
    'routine_tracking',
    'streak_display',
    'local_history_view'
  ],
  unavailableFeatures: [
    'cloud_sync',
    'cross_device_access',
    'shared_insights',
    'export_to_cloud'
  ],
  userNotification: {
    style: 'subtle',  // Not alarming
    message: 'Working offline—everything saves locally',
    showUnavailable: false  // Don't list what's broken
  }
}
```

**Local Entry During Outage:**
```typescript
{
  id: 'local-entry-uuid',
  entryType: 'routine_completion',
  routine: 'morning_routine',
  completedAt: Date.now(),
  status: 'complete',
  syncStatus: 'queued',
  createdDuringOutage: true,
  gamification: {
    xpAwarded: 25,
    streakMaintained: true,
    routineStreakDays: 14
  }
}
```

#### 3. Parsing/Disambiguation Approach

**Graceful degradation:**
```typescript
// File: apps/insight-mobile/src/network/GracefulDegradation.ts
function handleServerUnreachable(persona: Persona): DegradedMode {
  const config = getDegradationConfig(persona);

  // For Neurodivergent: minimize disruption
  if (persona.type === 'neurodivergent') {
    return {
      mode: 'seamless_offline',
      hideErrors: true,
      showSubtleIndicator: true,  // Small icon, not banner
      preserveRoutineUI: true,  // Keep routine screens identical
      queueAllActions: true,
      retryAutomatically: true,
      notifyOnRecovery: 'subtle'  // Don't celebrate server return
    };
  }

  return getStandardDegradedMode();
}
```

**Key principle:**
- Hide server state from user
- All features work locally
- Sync happens silently when possible
- No error dialogs or retry prompts

#### 4. Gamification Impact

**Local gamification continues:**
```typescript
{
  offlineGamification: {
    active: true,
    localStreak: true,
    xpTracked: true,
    achievementsUnlocked: true,  // Stored locally
    message: "Morning routine complete! 14-day streak 🔥",
    serverSyncPending: true,
    reconciliationOnSync: 'no_changes'  // Usually matches
  }
}
```

**No anxiety triggers:**
- Streak counter works exactly as normal
- XP awards shown immediately
- No "sync pending" badges on entries

#### 5. Architecture Solution

**Seamless offline mode:**
```
App Launch → Check Server
                ↓
    ┌───────────┴───────────┐
Server OK              Unreachable
    ↓                       ↓
Normal Mode         Enter Degraded Mode
                           ↓
                Hide Error Indicators
                           ↓
                Enable Full Local Mode
                           ↓
                Queue All Actions
                           ↓
    [Background]
                           ↓
                Retry Every 5 Minutes
                           ↓
                On Recovery: Silent Sync
```

**Subtle offline indicator:**
```typescript
// File: apps/insight-mobile/src/components/OfflineIndicator.tsx
// For Neurodivergent: minimal visual disruption
<OfflineIndicator
  style="minimal"
  icon={<CloudOff size={12} />}
  position="statusbar"
  animate={false}  // No pulsing or attention-grabbing
/>
```

**File references:**
- Graceful degradation: `apps/insight-mobile/src/network/GracefulDegradation.ts:23`
- Offline mode: `apps/insight-mobile/src/network/OfflineMode.ts:45`
- Subtle indicator: `apps/insight-mobile/src/components/OfflineIndicator.tsx:67`

---

### UC-E030: Intermittent Connectivity (Reflector)

#### 1. User Phrase/Scenario

Casey is journaling while riding a train through areas with spotty connectivity. The connection drops and reconnects every few minutes. Casey wants to write their reflection without worrying about whether each keystroke is being saved. The entry is long and emotional—they can't risk losing it.

Intermittent connectivity challenges:
- Train/subway travel with tunnel disconnections
- Rural areas with weak signal
- Airplane Wi-Fi that drops frequently
- Shared networks with bandwidth issues
- International roaming with unstable data
- Weather-affected connectivity

Reflectors write lengthy, personal content and have low tolerance for data loss in their journaling practice.

#### 2. Data Model Mapping

**Auto-Save State:**

```typescript
{
  id: 'autosave-uuid',
  entryId: 'journal-uuid',
  userId: 'user-id',
  autosaveState: {
    localDrafts: 12,  // 12 local saves during session
    lastLocalSave: Date.now(),
    lastCloudSync: Date.now() - 180000,  // 3 minutes ago
    pendingSync: true,
    contentHash: 'hash-of-current-content'
  },
  connectivity: {
    current: 'connected',
    sessionChanges: 8,  // Connection changed 8 times
    avgDisconnectionDuration: 45,  // seconds
    pattern: 'intermittent'
  },
  protection: {
    localAutoSaveInterval: 5000,  // Every 5 seconds
    cloudSyncOnReconnect: true,
    conflictPrevention: 'single_device'
  }
}
```

**Journal Entry with Draft History:**
```typescript
{
  id: 'journal-uuid',
  content: '[current journal content]',
  wordCount: 847,
  localDraftHistory: [
    { timestamp: Date.now() - 60000, wordCount: 423 },
    { timestamp: Date.now() - 30000, wordCount: 612 },
    { timestamp: Date.now(), wordCount: 847 }
  ],
  lastSyncedVersion: { timestamp: Date.now() - 180000, wordCount: 312 },
  syncStatus: 'pending'
}
```

#### 3. Parsing/Disambiguation Approach

**Aggressive local auto-save:**
```typescript
// File: apps/insight-mobile/src/journal/AutoSave.ts
function configureAutoSave(connectivityPattern: string): AutoSaveConfig {
  if (connectivityPattern === 'intermittent') {
    return {
      localSaveInterval: 5000,  // Every 5 seconds
      cloudSyncOnConnect: true,
      cloudSyncDebounce: 3000,  // Wait 3s of stable connection
      showSaveIndicator: true,
      indicatorStyle: 'subtle_confirmation',
      recoveryMode: 'aggressive'
    };
  }

  return getDefaultAutoSaveConfig();
}
```

**Save indicator for peace of mind:**
- Show "Saved locally" after each auto-save
- Show "Synced ✓" when cloud catches up
- Never show "Saving..." for more than 2 seconds
- If connection flaky, emphasize local saves

#### 4. Gamification Impact

**Writing encouragement:**
```typescript
{
  journalProgress: {
    wordsWritten: 847,
    sessionDuration: 25,  // minutes
    saveConfirmations: 12,
    progressXP: 30,  // Substantial journaling session
    message: "Your reflection is safely saved, locally and in the cloud.",
    streakMaintained: true
  }
}
```

**No interruption of flow:**
- XP calculated at completion, not interrupted by sync
- Auto-save is invisible to writing experience
- Connectivity status subtle, not alarming

#### 5. Architecture Solution

**Intermittent-proof journaling:**
```
Keystroke → Local Auto-Save (5s debounce)
                    ↓
            Store in Local Draft
                    ↓
            Show "Saved" Indicator
                    ↓
    [On Connection]
                    ↓
            Debounce 3s (ensure stable)
                    ↓
            Sync to Cloud
                    ↓
            Show "Synced ✓"
                    ↓
    [On Disconnect]
                    ↓
            Continue Local Auto-Save
                    ↓
            Queue for Next Connection
```

**File references:**
- Auto-save: `apps/insight-mobile/src/journal/AutoSave.ts:34`
- Draft storage: `apps/insight-mobile/src/storage/journalDrafts.ts:23`
- Connectivity monitor: `apps/insight-mobile/src/network/ConnectivityMonitor.ts:56`

---

### UC-E031: Rate Limit Exceeded (Optimizer)

#### 1. User Phrase/Scenario

Alex is bulk-importing a year of workout data from a fitness app export. After 500 entries, the server returns a rate limit error. Alex expects the system to handle this gracefully—queuing remaining imports without losing progress or requiring them to restart.

Rate limit scenarios:
- Bulk data import from other apps
- Mass edit operations
- Rapid voice entries during intense workout
- Widget spam (accidental rapid taps)
- API integrations exceeding quotas
- Export large dataset requests

Optimizers doing bulk operations need assurance that rate limits are handled without data loss or wasted effort.

#### 2. Data Model Mapping

**Rate Limit State:**

```typescript
{
  id: 'rate-limit-uuid',
  userId: 'user-id',
  operation: 'bulk_import',
  limit: {
    type: 'entries_per_minute',
    limit: 60,
    window: 60000,
    currentUsage: 60,
    resetAt: Date.now() + 45000
  },
  queue: {
    pending: 347,
    completed: 500,
    total: 847,
    estimatedCompletion: Date.now() + (347 * 1000)  // ~6 minutes
  },
  handling: {
    strategy: 'queue_and_drip',
    userNotified: true,
    progressVisible: true
  }
}
```

**Import Progress:**
```typescript
{
  importId: 'import-uuid',
  source: 'strava_export',
  status: 'rate_limited',
  progress: {
    completed: 500,
    queued: 347,
    failed: 0,
    currentRate: 60,  // per minute
    estimatedTimeRemaining: 347  // seconds
  }
}
```

#### 3. Parsing/Disambiguation Approach

**Rate limit handling:**
```typescript
// File: apps/insight-mobile/src/sync/RateLimiter.ts
async function handleRateLimit(
  operation: Operation,
  remainingItems: any[]
): RateLimitResult {
  const limit = await getRateLimitInfo();

  // 1. Queue remaining items
  await importQueue.addBatch(remainingItems, {
    dripRate: limit.limit / 2,  // Stay under limit
    startAfter: limit.resetAt
  });

  // 2. Show progress UI
  return {
    queued: remainingItems.length,
    estimatedCompletion: calculateCompletion(remainingItems.length, limit),
    message: `${remainingItems.length} entries queued. Import will complete in ~${formatTime(remaining)}.`,
    canContinueUsing: true,  // App fully usable while importing
    showProgress: true
  };
}
```

**Optimizer-friendly handling:**
- Show exact progress numbers
- Display estimated completion time
- Allow continued app use during queue processing
- Offer option to prioritize certain imports

#### 4. Gamification Impact

**Retroactive XP for imports:**
```typescript
{
  bulkImport: {
    entriesImported: 500,
    entriesQueued: 347,
    xpPending: true,  // Calculated when complete
    streakRetroactive: true,  // Historical streaks calculated
    message: "Import in progress. XP and streaks will update when complete."
  }
}
```

#### 5. Architecture Solution

**Rate-limited bulk operation:**
```
Bulk Operation → Rate Limit Hit
                        ↓
            Pause Operation
                        ↓
            Queue Remaining Items
                        ↓
            Show Progress UI
                        ↓
            Continue Drip Processing
                        ↓
            Update Progress
                        ↓
            Complete Import
                        ↓
            Calculate Retroactive XP/Streaks
```

**File references:**
- Rate limiter: `apps/insight-mobile/src/sync/RateLimiter.ts:45`
- Import queue: `apps/insight-mobile/src/import/ImportQueue.ts:23`
- Progress UI: `apps/insight-mobile/src/components/BulkImportProgress.tsx:12`

---

### UC-E032: SSL Certificate Error (Privacy-First)

#### 1. User Phrase/Scenario

Morgan is on a hotel Wi-Fi that intercepts HTTPS traffic with a self-signed certificate. The app detects the certificate issue and refuses to sync. Morgan needs to understand why sync failed and receive assurance that their data wasn't exposed to the intercepting proxy.

SSL/TLS security scenarios:
- Hotel Wi-Fi with captive portals
- Corporate proxies with MITM certificates
- Airport/café networks with interception
- Outdated device with expired root certificates
- Malicious network attempting interception
- Regional network monitoring

Privacy-First users need clear communication about network security issues without causing panic.

#### 2. Data Model Mapping

**Security Event Log:**

```typescript
{
  id: 'security-event-uuid',
  userId: 'user-id',
  eventType: 'ssl_certificate_error',
  details: {
    errorCode: 'CERT_UNTRUSTED',
    expectedCert: 'sha256:abc123...',
    receivedCert: 'sha256:xyz789...',
    networkName: 'Hotel_Guest_WiFi',
    networkType: 'wifi'
  },
  protection: {
    dataSent: false,
    connectionBlocked: true,
    localDataSafe: true,
    recommendedAction: 'use_mobile_data'
  },
  userNotification: {
    shown: true,
    level: 'informative',  // Not alarming
    message: 'Network security issue detected. Your data is safe—using offline mode.',
    technicalDetails: 'expandable'
  }
}
```

#### 3. Parsing/Disambiguation Approach

**Certificate validation:**
```typescript
// File: apps/insight-mobile/src/network/CertificateValidator.ts
async function validateConnection(
  endpoint: string,
  persona: Persona
): ConnectionValidation {
  try {
    const cert = await getCertificateInfo(endpoint);
    const trusted = await verifyCertificateChain(cert);

    if (!trusted) {
      // Block connection, don't send any data
      return {
        valid: false,
        reason: 'certificate_untrusted',
        dataExposed: false,  // Connection blocked before data sent
        fallback: 'offline_mode',
        userMessage: persona.type === 'privacy_first'
          ? 'Network security issue—switching to offline mode. Your data is protected.'
          : 'Connection issue—working offline.'
      };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'connection_failed', fallback: 'offline_mode' };
  }
}
```

**Privacy-First specific handling:**
- Detailed explanation available (expandable)
- Clear confirmation no data was exposed
- Suggestion for secure alternatives (mobile data)
- Log security events for user review

#### 4. Gamification Impact

**Security doesn't affect progress:**
```typescript
{
  securityEvent: {
    streakProtected: true,
    offlineModeActive: true,
    message: "Working offline securely. Your streak continues.",
    securityLog: true  // Logged for transparency
  }
}
```

#### 5. Architecture Solution

**Certificate validation flow:**
```
Connection Attempt → Certificate Check
                            ↓
        ┌───────────────────┴───────────────────┐
    Valid                               Invalid
        ↓                                   ↓
    Proceed                         Block Connection
                                           ↓
                                Verify No Data Sent
                                           ↓
                                Enter Offline Mode
                                           ↓
                                Log Security Event
                                           ↓
                                Notify User (calm)
```

**File references:**
- Certificate validator: `apps/insight-mobile/src/network/CertificateValidator.ts:34`
- Security logger: `apps/insight-mobile/src/security/SecurityLogger.ts:23`
- Network UI: `apps/insight-mobile/src/components/NetworkSecurityNotice.tsx:45`

---

## Data Validation Errors

### UC-E033: Value Out of Reasonable Range (Biohacker)

#### 1. User Phrase/Scenario

Sam says: "Resting heart rate was 12 this morning." A resting heart rate of 12 BPM is physiologically impossible for a living person (normal range 40-100). The system should flag this as a likely transcription or speech error rather than accepting invalid data.

Out-of-range scenarios in health tracking:
- Heart rate < 30 or > 250 (impossible without medical event)
- HRV > 300 (likely ms vs s unit confusion)
- Sleep duration > 24 hours
- Body weight change > 20% in a day
- Blood glucose > 600 or < 20 (medical emergency territory)
- Steps > 100,000 in one day

Biohackers need protection from data entry errors that would corrupt their trend analysis and correlations.

#### 2. Data Model Mapping

**Validation Result:**

```typescript
{
  id: 'validation-uuid',
  captureId: 'capture-uuid',
  userId: 'user-id',
  metric: 'resting_heart_rate',
  rawValue: 12,
  validation: {
    status: 'out_of_range',
    expectedRange: { min: 30, max: 120 },
    deviation: 'below_minimum',
    severity: 'impossible',  // vs 'unusual' vs 'outlier'
    likelyCause: 'transcription_error'
  },
  suggestedCorrections: [
    { value: 72, reason: 'digit_swap', confidence: 0.75 },
    { value: 52, reason: 'mishear_fifty', confidence: 0.20 }
  ]
}
```

**Pending Entry:**
```typescript
{
  id: 'pending-uuid',
  metricType: 'resting_heart_rate',
  rawValue: 12,
  status: 'pending_validation',
  requiresUserConfirmation: true,
  suggestedValue: 72,
  gamificationHeld: true  // Don't award XP until resolved
}
```

#### 3. Parsing/Disambiguation Approach

**Range validation:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/range_validator.ts
function validateRange(
  value: number,
  metricType: string,
  userHistory: MetricHistory
): RangeValidation {
  const globalRange = METRIC_RANGES[metricType];
  const personalRange = calculatePersonalRange(userHistory, metricType);

  // 1. Check against absolute limits
  if (value < globalRange.absoluteMin || value > globalRange.absoluteMax) {
    return {
      valid: false,
      severity: 'impossible',
      reason: 'outside_physiological_limits',
      suggestCorrections: true
    };
  }

  // 2. Check against personal range (for Biohacker)
  const stdDev = personalRange.standardDeviation;
  const zscore = (value - personalRange.mean) / stdDev;

  if (Math.abs(zscore) > 3) {
    return {
      valid: 'outlier',
      severity: 'unusual',
      reason: 'significant_deviation',
      confirm: true  // Ask user to confirm unusual value
    };
  }

  return { valid: true };
}
```

**Correction suggestions:**
- Digit transposition (12 → 21, 72)
- Unit confusion (12 seconds → 72 ms for HRV)
- Mishearing (twelve → fifty-two)
- Missing digit (12 → 112, 120)

#### 4. Gamification Impact

**Data quality incentive:**
```typescript
{
  validationRequired: {
    entryPending: true,
    xpHeld: 15,
    message: "Quick check: was that 12 or 72 BPM?",
    streakProtection: true,  // Logging attempt counts
    resolveBonus: 5  // Bonus XP for resolving
  }
}
```

#### 5. Architecture Solution

**Validation with correction:**
```
Voice Capture → Transcription → Value Extraction
                                        ↓
                                Range Validation
                                        ↓
        ┌───────────────────────────────┴───────────────────────────────┐
    In Range                        Outlier                    Impossible
        ↓                               ↓                           ↓
    Accept                     Confirm with user         Suggest corrections
        ↓                               ↓                           ↓
    Create entry              User confirms/corrects    User selects correct
        ↓                               ↓                           ↓
                                Create entry                  Create entry
```

**File references:**
- Range validator: `supabase/functions/transcribe_and_parse_capture/range_validator.ts:34`
- Correction suggester: `supabase/functions/transcribe_and_parse_capture/correction_suggester.ts:23`
- Validation UI: `apps/insight-mobile/src/components/ValueValidation.tsx:45`

---

### UC-E034: Impossible Date/Time (Reflector)

#### 1. User Phrase/Scenario

Casey says: "I want to journal about what happened on February 30th." February 30th doesn't exist. The system should recognize the invalid date and gently help Casey identify the actual date they're thinking of without making them feel foolish.

Invalid date scenarios:
- February 30th or 31st
- April 31st, June 31st, etc.
- September 31st
- "Last week" when today is the 2nd (crosses month)
- "Next year" entries (future journaling?)
- Dates before app install (legitimate historical entry)

Reflectors are often processing emotional memories where the exact date is fuzzy—they need gentle correction, not pedantic date validation.

#### 2. Data Model Mapping

**Date Resolution:**

```typescript
{
  id: 'date-resolution-uuid',
  captureId: 'capture-uuid',
  userId: 'user-id',
  rawDateReference: 'February 30th',
  validation: {
    valid: false,
    reason: 'nonexistent_date',
    month: 2,
    day: 30,
    maxDayInMonth: 28  // or 29 in leap year
  },
  suggestions: [
    { date: '2026-02-28', label: 'February 28th (last day of Feb)', confidence: 0.55 },
    { date: '2026-03-01', label: 'March 1st', confidence: 0.25 },
    { date: '2026-02-20', label: 'February 20th (mishear?)', confidence: 0.15 }
  ],
  contextClues: {
    previousEntryDate: '2026-02-25',
    likelyTimeframe: 'late_february'
  }
}
```

#### 3. Parsing/Disambiguation Approach

**Gentle date correction:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/date_validator.ts
function validateDate(
  dateRef: DateReference,
  persona: Persona
): DateValidation {
  const date = parseDate(dateRef);

  if (!isValidDate(date)) {
    // For Reflector: gentle, non-judgmental correction
    if (persona.type === 'reflector') {
      return {
        valid: false,
        tone: 'gentle',
        message: `February only has 28 days this year. Did you mean around the end of February?`,
        suggestions: generateDateSuggestions(dateRef),
        allowFuzzy: true  // Accept "end of February" as valid
      };
    }

    return {
      valid: false,
      suggestions: generateDateSuggestions(dateRef)
    };
  }

  return { valid: true, date };
}
```

**Fuzzy date acceptance:**
- "End of February" → Create entry, date = Feb 28
- "Around then" → Use context from previous entries
- "Before the thing happened" → Relative to event anchor

#### 4. Gamification Impact

**Reflection, not precision:**
```typescript
{
  dateResolution: {
    resolved: true,
    fuzzyAccepted: true,
    message: "Entry saved for late February.",
    journalingXP: 15,
    noPenalty: true
  }
}
```

#### 5. Architecture Solution

**Date validation flow:**
```
Date Reference → Parse Date
                    ↓
            Validate Calendar
                    ↓
    ┌───────────────┴───────────────┐
Valid                        Invalid
    ↓                               ↓
Accept                  Generate suggestions
                               ↓
                    Show gentle options
                               ↓
                    User selects or accepts fuzzy
                               ↓
                    Create entry
```

**File references:**
- Date validator: `supabase/functions/transcribe_and_parse_capture/date_validator.ts:34`
- Fuzzy dates: `supabase/functions/transcribe_and_parse_capture/fuzzy_dates.ts:23`
- Date picker UI: `apps/insight-mobile/src/components/GentleDatePicker.tsx:45`

---

### UC-E035: Duplicate Entry Detection (Optimizer)

#### 1. User Phrase/Scenario

Alex says "Logged 5K run this morning" and the system detects Alex already has a 5K run entry for this morning—likely from their GPS watch auto-sync. The system should identify the duplicate and help Alex merge or choose rather than creating redundant data.

Duplicate scenarios:
- Manual entry after auto-sync from wearable
- Voice entry after widget quick-entry
- Repeated voice command (echo, mistake)
- Sync from multiple devices for same activity
- Import overlapping with manual entries
- Re-logging forgotten previous entry

Optimizers want clean data without duplicates—they don't want to manually hunt for and delete redundant entries.

#### 2. Data Model Mapping

**Duplicate Detection:**

```typescript
{
  id: 'duplicate-check-uuid',
  newEntry: {
    type: 'workout',
    subtype: 'running',
    distance: 5,
    unit: 'km',
    timeframe: 'morning'
  },
  potentialDuplicates: [
    {
      entryId: 'existing-uuid',
      source: 'garmin_sync',
      similarity: 0.92,
      matchingFields: ['distance', 'time_of_day', 'workout_type'],
      differingFields: ['source'],
      createdAt: Date.now() - 3600000
    }
  ],
  recommendation: 'merge',
  mergeStrategy: 'prefer_device_data_with_voice_notes'
}
```

**Merged Entry:**
```typescript
{
  id: 'merged-uuid',
  type: 'workout',
  subtype: 'running',
  distance: 5.02,  // From GPS
  duration: { minutes: 24, seconds: 47 },  // From GPS
  pace: '4:57/km',  // From GPS
  heartRateAvg: 156,  // From GPS
  notes: 'Felt good',  // From voice
  source: 'merged_garmin_voice',
  originalSources: ['garmin_sync', 'voice_capture']
}
```

#### 3. Parsing/Disambiguation Approach

**Duplicate detection:**
```typescript
// File: supabase/functions/transcribe_and_parse_capture/duplicate_detector.ts
async function checkForDuplicates(
  newEntry: ParsedEntry,
  userId: string
): DuplicateCheck {
  // 1. Find recent entries of same type
  const recent = await getRecentEntries(userId, newEntry.type, {
    timeWindow: 24 * 60 * 60 * 1000  // 24 hours
  });

  // 2. Calculate similarity scores
  const candidates = recent.map(existing => ({
    entry: existing,
    similarity: calculateSimilarity(newEntry, existing)
  })).filter(c => c.similarity > 0.70);

  // 3. Determine action
  if (candidates.length === 0) {
    return { hasDuplicate: false };
  }

  const best = candidates[0];
  if (best.similarity > 0.90) {
    return {
      hasDuplicate: true,
      confidence: 'high',
      recommendation: 'merge',
      existing: best.entry
    };
  }

  return {
    hasDuplicate: true,
    confidence: 'medium',
    recommendation: 'ask_user',
    candidates: candidates.map(c => c.entry)
  };
}
```

**Merge strategies:**
- Prefer device data for metrics (GPS, heart rate)
- Prefer voice data for notes and context
- Keep most recent for editable fields
- Preserve all sources in audit trail

#### 4. Gamification Impact

**No double-counting:**
```typescript
{
  duplicateHandling: {
    merged: true,
    xpAdjusted: true,  // No duplicate XP
    originalXP: 25,
    message: "Merged with your Garmin data—richer entry, same XP.",
    streakCounts: 1  // Not double-counted for streak
  }
}
```

#### 5. Architecture Solution

**Duplicate detection and merge:**
```
New Entry → Duplicate Check
                ↓
    ┌───────────┴───────────┐
No duplicate        Duplicate found
    ↓                       ↓
Create entry        Calculate similarity
                           ↓
            ┌──────────────┴──────────────┐
        High (>90%)                  Medium
                ↓                       ↓
        Auto-merge              Show options
                ↓                       ↓
        Create merged           User chooses
                ↓                       ↓
        Notify user             Apply decision
```

**File references:**
- Duplicate detector: `supabase/functions/transcribe_and_parse_capture/duplicate_detector.ts:45`
- Merge engine: `supabase/functions/transcribe_and_parse_capture/merge_engine.ts:23`
- Duplicate UI: `apps/insight-mobile/src/components/DuplicateResolver.tsx:12`

---

### UC-E036: Schema Migration Failure (Privacy-First)

#### 1. User Phrase/Scenario

Morgan updates the app and the database migration fails partway through, leaving some data in the old schema and some in the new. Morgan needs assurance that their data is intact, and the app needs to handle this gracefully—potentially rolling back or completing the migration.

Schema migration risks:
- App update interrupted mid-migration
- Storage full during migration
- Crash during data transformation
- Incompatible data discovered during migration
- Rollback needed after partial migration
- Cross-device sync during migration window

Privacy-First users are concerned about data integrity and need transparency about what happened to their data.

#### 2. Data Model Mapping

**Migration State:**

```typescript
{
  id: 'migration-uuid',
  userId: 'user-id',
  migrationVersion: '2.5.0-to-2.6.0',
  status: 'partial_failure',
  progress: {
    totalTables: 12,
    migratedTables: 8,
    failedAt: 'journal_entries',
    error: 'SQLITE_FULL'
  },
  dataIntegrity: {
    oldSchemaEntries: 234,
    newSchemaEntries: 156,
    unmigrated: 78,
    corrupted: 0  // No data corrupted
  },
  recovery: {
    canContinue: true,
    canRollback: true,
    recommendedAction: 'free_space_and_continue'
  }
}
```

#### 3. Parsing/Disambiguation Approach

**Migration recovery:**
```typescript
// File: apps/insight-mobile/src/storage/MigrationRecovery.ts
async function handleMigrationFailure(
  state: MigrationState,
  persona: Persona
): RecoveryResult {
  // 1. Assess damage
  const assessment = await assessDataIntegrity(state);

  // 2. Determine options
  const options = [];

  if (assessment.canContinue) {
    options.push({
      action: 'continue',
      label: 'Free up space and complete migration',
      dataLoss: false
    });
  }

  if (assessment.canRollback) {
    options.push({
      action: 'rollback',
      label: 'Restore to previous version',
      dataLoss: false
    });
  }

  // 3. For Privacy-First: detailed transparency
  if (persona.type === 'privacy_first') {
    return {
      options,
      integrityReport: assessment.fullReport,
      message: `Migration paused: 78 entries not yet converted. No data lost. You have options:`,
      showDetails: true
    };
  }

  return { options, message: 'Update paused. Your data is safe.' };
}
```

#### 4. Gamification Impact

**Progress preserved:**
```typescript
{
  migrationRecovery: {
    streaksPreserved: true,
    xpPreserved: true,
    achievementsPreserved: true,
    message: "Your progress is safe—just need to complete the update."
  }
}
```

#### 5. Architecture Solution

**Migration recovery flow:**
```
App Launch → Check Migration State
                    ↓
    ┌───────────────┴───────────────┐
Complete                    Partial/Failed
    ↓                               ↓
Normal app              Assess integrity
                               ↓
                    Show recovery options
                               ↓
                    User chooses action
                               ↓
    ┌───────────────┴───────────────┐
Continue                    Rollback
    ↓                               ↓
Complete migration      Restore old schema
    ↓                               ↓
Verify integrity            Prompt for
    ↓                      app downgrade
Normal app
```

**File references:**
- Migration recovery: `apps/insight-mobile/src/storage/MigrationRecovery.ts:34`
- Integrity checker: `apps/insight-mobile/src/storage/IntegrityChecker.ts:23`
- Recovery UI: `apps/insight-mobile/src/screens/MigrationRecoveryScreen.tsx:45`

---

## Conflict Resolution

### UC-E037: Cross-Device Edit Conflict (Optimizer)

#### 1. User Phrase/Scenario

Alex edits yesterday's workout on their phone to add a set, while simultaneously their tablet (offline) has an older version that Alex also edited to fix a typo. When the tablet comes online, there's a conflict between two versions, both modified by Alex.

Same-user cross-device conflicts:
- Phone and tablet edited same entry
- Watch quick-edit conflicts with phone detail edit
- Widget edit conflicts with in-app edit
- Offline edits on multiple devices
- Browser and mobile app edits

Optimizers want to keep both changes when possible—they don't want to lose the typo fix OR the added set.

#### 2. Data Model Mapping

**Conflict Record:**

```typescript
{
  id: 'conflict-uuid',
  entryId: 'workout-uuid',
  userId: 'user-id',
  conflictType: 'same_user_cross_device',
  versions: [
    {
      deviceId: 'phone-uuid',
      modifiedAt: Date.now() - 30000,
      changes: { exercises: [{ sets: 5 }] },  // Added set
      changeType: 'data_modification'
    },
    {
      deviceId: 'tablet-uuid',
      modifiedAt: Date.now() - 60000,  // Older but from offline
      changes: { exercises: [{ name: 'Squat' }] },  // Fixed typo
      changeType: 'typo_correction'
    }
  ],
  mergeability: {
    canAutoMerge: true,
    reason: 'non_overlapping_fields',
    confidence: 0.95
  }
}
```

**Merged Entry:**
```typescript
{
  id: 'workout-uuid',
  exercises: [
    {
      name: 'Squat',  // From tablet (typo fix)
      sets: 5  // From phone (added set)
    }
  ],
  conflictResolved: true,
  mergeDetails: {
    strategy: 'field_level_merge',
    sourcesIncluded: ['phone', 'tablet']
  }
}
```

#### 3. Parsing/Disambiguation Approach

**Smart merge for non-overlapping changes:**
```typescript
// File: apps/insight-mobile/src/sync/SmartMerge.ts
function attemptAutoMerge(versions: EntryVersion[]): MergeResult {
  // 1. Identify changed fields in each version
  const changesByVersion = versions.map(v => ({
    version: v,
    changedFields: getChangedFields(v, v.baseVersion)
  }));

  // 2. Check for overlapping changes
  const fieldSets = changesByVersion.map(c => new Set(c.changedFields));
  const hasOverlap = checkForOverlap(fieldSets);

  if (!hasOverlap) {
    // 3. Merge all changes
    const merged = mergeNonOverlapping(changesByVersion);
    return {
      success: true,
      merged: merged,
      strategy: 'field_level_merge',
      notify: 'subtle'  // Just show "Synced ✓"
    };
  }

  // 4. Overlapping changes require user input
  return {
    success: false,
    reason: 'overlapping_changes',
    candidates: versions
  };
}
```

**Merge strategies:**
- Field-level merge (non-overlapping changes)
- Timestamp-based (latest wins for same field)
- User preference (always ask for conflicts)
- Custom rules (prefer typo fixes, prefer additions)

#### 4. Gamification Impact

**No lost progress:**
```typescript
{
  conflictResolution: {
    resolved: true,
    method: 'auto_merge',
    changesPreserved: 'all',
    message: "Both edits saved—set added and typo fixed ✓"
  }
}
```

#### 5. Architecture Solution

**Cross-device merge flow:**
```
Sync from Device B → Detect Conflict with Device A
                            ↓
                    Analyze Changed Fields
                            ↓
        ┌───────────────────┴───────────────────┐
    Non-overlapping                    Overlapping
            ↓                               ↓
    Auto-merge                      Show conflict UI
            ↓                               ↓
    Apply merged                    User chooses
            ↓                               ↓
    Notify subtly                   Apply choice
```

**File references:**
- Smart merge: `apps/insight-mobile/src/sync/SmartMerge.ts:34`
- Conflict detection: `apps/insight-mobile/src/sync/ConflictDetection.ts:23`
- Merge UI: `apps/insight-mobile/src/components/MergeConflictResolver.tsx:45`

---

### UC-E038: Routine Template vs Instance Conflict (Neurodivergent)

#### 1. User Phrase/Scenario

Riley has a morning routine template. They modified today's instance (skipped one step due to time), and separately edited the template (added a new step). Now sync shows a conflict between the modified instance and the new template. Riley needs the system to understand that instance modifications don't affect templates and vice versa.

Template vs instance confusion:
- Skipping a routine step today vs removing from template
- Adding one-time item vs permanent template change
- Adjusting duration for today vs changing default duration
- Marking item complete vs marking unnecessary
- Instance notes vs template descriptions

Neurodivergent users rely on routine templates and need clear separation between "today's version" and "the template."

#### 2. Data Model Mapping

**Template and Instance:**

```typescript
// Template
{
  id: 'routine-template-uuid',
  type: 'routine_template',
  name: 'Morning Routine',
  steps: [
    { id: 'step-1', name: 'Wake up', duration: 5 },
    { id: 'step-2', name: 'Stretch', duration: 10 },
    { id: 'step-3', name: 'Shower', duration: 15 },
    { id: 'step-4', name: 'Breakfast', duration: 20 }  // NEW STEP ADDED
  ],
  modifiedAt: Date.now()
}

// Instance
{
  id: 'routine-instance-uuid',
  templateId: 'routine-template-uuid',
  date: '2026-01-18',
  steps: [
    { id: 'step-1', completed: true },
    { id: 'step-2', skipped: true, reason: 'no time' },  // SKIPPED TODAY
    { id: 'step-3', completed: true }
  ],
  modifiedAt: Date.now() - 60000
}
```

**No Conflict (separate concerns):**
```typescript
{
  conflictCheck: {
    templateChanged: true,
    instanceModified: true,
    isConflict: false,  // Different concerns
    resolution: {
      template: 'accept_new_step',
      instance: 'preserve_skip',
      explanation: 'Template got a new step; today you skipped stretching—both are correct.'
    }
  }
}
```

#### 3. Parsing/Disambiguation Approach

**Template vs instance separation:**
```typescript
// File: apps/insight-mobile/src/routines/TemplateInstanceSync.ts
function syncTemplateAndInstance(
  template: RoutineTemplate,
  instance: RoutineInstance
): SyncResult {
  // 1. Template changes apply to future instances
  // 2. Instance changes only affect that day
  // 3. These are not conflicts—they're parallel concerns

  if (template.stepsChanged && instance.modified) {
    return {
      conflict: false,
      actions: [
        { target: 'instance', action: 'preserve', reason: 'instance_specific' },
        { target: 'future_instances', action: 'apply_new_template' }
      ],
      message: 'Template updated for future days. Today stays as you modified it.'
    };
  }

  return { conflict: false, message: 'Synced ✓' };
}
```

#### 4. Gamification Impact

**Both template and instance work rewarded:**
```typescript
{
  routineTracking: {
    instanceCompleted: true,  // Even with skip
    skipsRespected: true,
    templateImproved: true,
    xp: 25,  // Full credit for today's completion
    message: "Morning routine done! (New step starts tomorrow)"
  }
}
```

#### 5. Architecture Solution

**Template/instance isolation:**
```
Template Edit → Update Template
                    ↓
            Apply to Future Instances Only
                    ↓
Instance Edit → Update Instance Only
                    ↓
            Never Cross-Contaminate
                    ↓
            Sync Both Independently
```

**File references:**
- Template sync: `apps/insight-mobile/src/routines/TemplateInstanceSync.ts:23`
- Instance manager: `apps/insight-mobile/src/routines/InstanceManager.ts:45`
- Routine UI: `apps/insight-mobile/src/screens/RoutineScreen.tsx:67`

---

### UC-E039: Merge vs Replace Decision (Reflector)

#### 1. User Phrase/Scenario

Casey wrote a journal entry on their phone, then on their laptop wrote a completely different entry for the same day (both offline). When sync occurs, both entries exist. Should they merge (combine both reflections) or remain separate? For a Reflector, both writings have value and neither should be lost.

Journal-specific conflict scenarios:
- Multiple entries same day from different devices
- Morning reflection vs evening reflection
- Draft abandoned, then restarted fresh
- Stream-of-consciousness vs structured entry
- Emotional entry vs factual entry

Reflectors' journal entries are sacred—merging might corrupt the original thoughts, but losing either is unacceptable.

#### 2. Data Model Mapping

**Journal Conflict:**

```typescript
{
  id: 'journal-conflict-uuid',
  userId: 'user-id',
  date: '2026-01-18',
  entries: [
    {
      id: 'phone-entry-uuid',
      content: 'This morning I woke up feeling anxious about the meeting...',
      wordCount: 234,
      createdAt: Date.now() - 7200000,
      device: 'phone'
    },
    {
      id: 'laptop-entry-uuid',
      content: 'The meeting went better than expected. I realized...',
      wordCount: 312,
      createdAt: Date.now() - 3600000,
      device: 'laptop'
    }
  ],
  resolution: {
    recommended: 'keep_both_separate',
    reason: 'different_time_perspectives',
    alternatives: ['merge_chronological', 'replace_with_latest']
  }
}
```

**Resolution Options for Reflector:**
```typescript
{
  options: [
    {
      id: 'keep_separate',
      label: 'Keep as two entries',
      description: 'Morning reflection and afternoon reflection remain separate',
      default: true
    },
    {
      id: 'merge',
      label: 'Combine into one entry',
      description: 'Join both writings chronologically with a separator',
      preview: true
    },
    {
      id: 'choose_one',
      label: 'Keep only one',
      description: 'Choose which entry to keep (other moved to archive)'
    }
  ]
}
```

#### 3. Parsing/Disambiguation Approach

**Journal-specific conflict handling:**
```typescript
// File: apps/insight-mobile/src/journal/JournalConflictResolver.ts
function resolveJournalConflict(entries: JournalEntry[]): ConflictResolution {
  // 1. Analyze content similarity
  const similarity = calculateTextSimilarity(entries[0].content, entries[1].content);

  // 2. Check temporal relationship
  const timeDiff = Math.abs(entries[0].createdAt - entries[1].createdAt);

  // 3. Recommend based on analysis
  if (similarity > 0.80) {
    // Very similar—probably same thought, different drafts
    return { recommendation: 'keep_latest', reason: 'similar_content' };
  }

  if (timeDiff > 3600000) {  // More than 1 hour apart
    // Different time of day—different reflections
    return {
      recommendation: 'keep_both_separate',
      reason: 'different_time_perspectives',
      suggestedLabels: ['Morning reflection', 'Afternoon reflection']
    };
  }

  // Similar time, different content—ask user
  return { recommendation: 'ask_user', options: ALL_OPTIONS };
}
```

#### 4. Gamification Impact

**All journaling counts:**
```typescript
{
  journalResolution: {
    entriesKept: 2,
    totalWordCount: 546,
    journalingXP: 30,  // Both entries count
    message: "Two reflections for today—morning and afternoon.",
    streakCounts: 1  // Still one day's journaling
  }
}
```

#### 5. Architecture Solution

**Journal conflict resolution:**
```
Sync Conflict → Analyze Entries
                    ↓
            Calculate Similarity
                    ↓
            Check Time Relationship
                    ↓
    ┌───────────────┴───────────────┐
Similar                        Different
    ↓                               ↓
Keep latest              ┌──────────┴──────────┐
                    Same time               Different time
                        ↓                       ↓
                    Ask user            Keep both separate
```

**File references:**
- Journal conflict: `apps/insight-mobile/src/journal/JournalConflictResolver.ts:34`
- Merge preview: `apps/insight-mobile/src/components/JournalMergePreview.tsx:23`
- Resolution UI: `apps/insight-mobile/src/components/JournalConflictSheet.tsx:45`

---

## API/Server Errors

### UC-E040: Backend Timeout (Optimizer)

#### 1. User Phrase/Scenario

Alex taps to view their comprehensive monthly analytics. The backend query times out after 30 seconds—there's too much data to aggregate quickly. Alex is left staring at a spinner with no indication of what's happening.

Backend timeout scenarios:
- Complex analytics queries on large datasets
- Report generation with many entries
- Search across entire history
- Data export preparation
- Batch operations on many entries
- AI-powered insights calculation

Optimizers have extensive data and complex analysis needs that can stress backend performance.

#### 2. Data Model Mapping

**Timeout State:**

```typescript
{
  id: 'timeout-uuid',
  userId: 'user-id',
  operation: 'monthly_analytics',
  request: {
    type: 'analytics_query',
    params: { month: '2026-01', includeCorrelations: true },
    startedAt: Date.now() - 30000
  },
  timeout: {
    occurred: true,
    after: 30000,
    reason: 'query_complexity'
  },
  recovery: {
    canRetry: true,
    canSimplify: true,
    canBackground: true,
    cachedPartial: null
  }
}
```

#### 3. Parsing/Disambiguation Approach

**Timeout handling:**
```typescript
// File: apps/insight-mobile/src/api/TimeoutHandler.ts
async function handleBackendTimeout(
  request: ApiRequest,
  persona: Persona
): TimeoutResult {
  const options = [];

  // 1. Offer to run in background
  options.push({
    action: 'background',
    label: 'Run in background',
    description: 'We\'ll notify you when ready'
  });

  // 2. Offer simplified version
  if (canSimplify(request)) {
    options.push({
      action: 'simplify',
      label: 'Show quick summary instead',
      description: 'Faster, less detailed view'
    });
  }

  // 3. Offer retry
  options.push({
    action: 'retry',
    label: 'Try again',
    description: 'Server might be less busy now'
  });

  return {
    message: 'Taking longer than expected...',
    options: options,
    showProgress: true
  };
}
```

#### 4. Gamification Impact

**No penalty for system performance:**
```typescript
{
  systemPerformance: {
    userBlocked: false,
    offeringAlternatives: true,
    message: "Heavy analysis—we'll get you those insights shortly."
  }
}
```

#### 5. Architecture Solution

**Timeout with alternatives:**
```
Request → Backend Processing
              ↓
        ┌─────┴─────┐
    Success     Timeout
        ↓           ↓
    Show data   Show options
                    ↓
    ┌───────────────┼───────────────┐
Background      Simplify        Retry
    ↓               ↓               ↓
Queue job      Run simpler     Retry now
    ↓          query               ↓
Notify when        ↓          Hope for
done          Show summary     success
```

**File references:**
- Timeout handler: `apps/insight-mobile/src/api/TimeoutHandler.ts:34`
- Background jobs: `apps/insight-mobile/src/jobs/BackgroundJobManager.ts:23`
- Progress UI: `apps/insight-mobile/src/components/LongRunningProgress.tsx:45`

---

### UC-E041: 5xx Server Error (Dabbler)

#### 1. User Phrase/Scenario

Jordan tries to log "Had a smoothie for breakfast" and gets a 500 Internal Server Error. Jordan has no idea what "500" means and doesn't care—they just want their smoothie logged.

Server error scenarios:
- Transient server failures
- Deployment-related brief outages
- Database connection issues
- Third-party service failures
- Resource exhaustion

Dabblers need simple, jargon-free error communication and assurance their action will eventually work.

#### 2. Data Model Mapping

**Error State:**

```typescript
{
  id: 'error-uuid',
  userId: 'user-id',
  errorCode: 500,
  operation: 'create_entry',
  entryData: {
    type: 'meal',
    description: 'Had a smoothie for breakfast'
  },
  handling: {
    localSaved: true,
    retryScheduled: true,
    retryIn: 30000,
    userNotified: true,
    userMessage: "Saved! It'll sync in a moment."  // No technical details
  }
}
```

#### 3. Parsing/Disambiguation Approach

**Dabbler-friendly error handling:**
```typescript
// File: apps/insight-mobile/src/api/ErrorHandler.ts
function handleServerError(
  error: ApiError,
  operation: Operation,
  persona: Persona
): ErrorResult {
  // For Dabbler: hide technical details
  if (persona.type === 'dabbler') {
    // Save locally and retry silently
    return {
      userMessage: error.recoverable
        ? "Saved! It'll sync in a moment."
        : "Saved locally—we'll sync when our servers are happy again.",
      showTechnicalDetails: false,
      actionRequired: false,
      automaticRetry: true
    };
  }

  // Other personas might want more info
  return getStandardErrorHandling(error, operation);
}
```

#### 4. Gamification Impact

**Server errors never affect user:**
```typescript
{
  serverError: {
    entryLogged: true,  // Locally
    xpAwarded: true,  // Locally
    streakMaintained: true,
    message: "Smoothie logged! ✓",
    serverSyncPending: true
  }
}
```

#### 5. Architecture Solution

**Dabbler error handling:**
```
API Request → 5xx Error
                ↓
        Save Entry Locally
                ↓
        Schedule Retry
                ↓
        Show Success to User
                ↓
    [Background]
                ↓
        Retry Automatically
                ↓
        Sync When Server Recovers
```

**File references:**
- Error handler: `apps/insight-mobile/src/api/ErrorHandler.ts:23`
- Local save: `apps/insight-mobile/src/storage/localEntries.ts:45`
- Retry queue: `apps/insight-mobile/src/sync/RetryQueue.ts:67`

---

## Recovery Flows

### UC-E042: Undo Recent Entry (Optimizer)

#### 1. User Phrase/Scenario

Alex accidentally logs "bench press 225 lbs" but meant "225 kg" (they're training at a European gym). They immediately realize the mistake and want to undo the entry. The system should provide quick undo access.

Undo scenarios:
- Wrong value entered
- Wrong entry type selected
- Accidental duplicate creation
- Spoke wrong exercise name
- Entry created for wrong day
- Accidentally deleted entry (redo)

Optimizers need quick access to undo without navigating through menus—their data must be accurate.

#### 2. Data Model Mapping

**Undo Stack:**

```typescript
{
  userId: 'user-id',
  undoStack: [
    {
      id: 'action-uuid',
      action: 'create_entry',
      entryId: 'workout-uuid',
      timestamp: Date.now(),
      reversible: true,
      expiresAt: Date.now() + 300000,  // 5 minute undo window
      snapshot: {/* full entry state */}
    }
  ],
  redoStack: []
}
```

#### 3. Parsing/Disambiguation Approach

**Undo implementation:**
```typescript
// File: apps/insight-mobile/src/undo/UndoManager.ts
class UndoManager {
  async undo(): Promise<UndoResult> {
    const action = this.undoStack.pop();
    if (!action) return { success: false, reason: 'nothing_to_undo' };

    // Reverse the action
    switch (action.type) {
      case 'create_entry':
        await this.softDeleteEntry(action.entryId);
        break;
      case 'delete_entry':
        await this.restoreEntry(action.snapshot);
        break;
      case 'update_entry':
        await this.revertEntry(action.entryId, action.snapshot);
        break;
    }

    // Move to redo stack
    this.redoStack.push(action);

    return {
      success: true,
      message: `Undid: ${action.description}`,
      canRedo: true
    };
  }
}
```

#### 4. Gamification Impact

**XP adjusts with undo:**
```typescript
{
  undo: {
    performed: true,
    xpAdjusted: true,
    previousXP: 25,
    currentXP: 0,  // Entry undone, XP reverted
    streakUnaffected: true,  // Undo doesn't break streak
    message: "Entry undone. XP adjusted."
  }
}
```

#### 5. Architecture Solution

**Undo/redo flow:**
```
User Action → Push to Undo Stack
                    ↓
            Show "Undo" Toast
                    ↓
    ┌───────────────┴───────────────┐
User taps Undo              Toast expires
        ↓                       ↓
Reverse action              Clear from stack
        ↓
Push to Redo Stack
        ↓
Show "Redone" option
```

**File references:**
- Undo manager: `apps/insight-mobile/src/undo/UndoManager.ts:23`
- Undo UI: `apps/insight-mobile/src/components/UndoToast.tsx:45`

---

### UC-E043: Data Recovery from Backup (Privacy-First)

#### 1. User Phrase/Scenario

Morgan accidentally deleted a month of journal entries thinking they were deleting just one. They need to recover from a backup, but want to understand exactly what will be restored and ensure no data from the backup period overwrites more recent data.

Recovery scenarios:
- Accidental bulk deletion
- Corrupted local database
- Device loss/replacement
- Sync conflict caused data loss
- Migration failure recovery

Privacy-First users need full transparency about what data recovery involves.

#### 2. Data Model Mapping

**Backup Recovery Plan:**

```typescript
{
  id: 'recovery-uuid',
  userId: 'user-id',
  backupSource: 'cloud_backup_2026-01-15',
  recoveryScope: {
    entriesInBackup: 156,
    entriesCurrentlyMissing: 89,
    entriesToRestore: 89,
    conflictingEntries: 3,
    entriesToSkip: 64  // Already exist
  },
  timeline: {
    backupDate: '2026-01-15',
    dataRange: { start: '2025-12-15', end: '2026-01-15' },
    missingRange: { start: '2025-12-18', end: '2026-01-10' }
  },
  privacyInfo: {
    backupEncrypted: true,
    restoreLocal: true,
    cloudSyncAfter: 'user_choice'
  }
}
```

#### 3. Parsing/Disambiguation Approach

**Recovery with full transparency:**
```typescript
// File: apps/insight-mobile/src/recovery/BackupRecovery.ts
async function prepareRecovery(
  backup: Backup,
  currentData: LocalData,
  persona: Persona
): RecoveryPlan {
  // 1. Analyze what's in backup vs current
  const diff = await analyzeBackupDiff(backup, currentData);

  // 2. For Privacy-First: detailed breakdown
  if (persona.type === 'privacy_first') {
    return {
      summary: `Restore ${diff.missing.length} entries from December 18 to January 10`,
      details: {
        willRestore: diff.missing,
        willSkip: diff.existing,
        conflicts: diff.conflicts,
        conflictResolution: 'show_each'  // Let user decide each
      },
      privacyNote: 'All data restores locally first. You choose when to sync.',
      previewAvailable: true
    };
  }

  return getSimpleRecoveryPlan(diff);
}
```

#### 4. Gamification Impact

**Streaks recalculated:**
```typescript
{
  recovery: {
    entriesRestored: 89,
    streakRecalculated: true,
    previousStreak: 8,
    restoredStreak: 45,  // Much longer with recovered data!
    message: "Your 45-day journal streak is back!"
  }
}
```

#### 5. Architecture Solution

**Privacy-conscious recovery:**
```
Request Recovery → Load Backup (encrypted)
                        ↓
                Decrypt Locally
                        ↓
                Analyze Differences
                        ↓
                Show Recovery Plan
                        ↓
                Handle Conflicts
                        ↓
                Restore Missing Entries
                        ↓
                Recalculate Gamification
                        ↓
                Offer Cloud Sync (optional)
```

**File references:**
- Backup recovery: `apps/insight-mobile/src/recovery/BackupRecovery.ts:34`
- Conflict handler: `apps/insight-mobile/src/recovery/ConflictHandler.ts:23`
- Recovery UI: `apps/insight-mobile/src/screens/RecoveryScreen.tsx:45`

---

### UC-E044: Streak Protection Appeal (Neurodivergent)

#### 1. User Phrase/Scenario

Riley's 90-day routine streak shows as broken, but they know they completed their routine every day. They check and see that a sync failure on day 73 caused one day's entries to not upload. Riley needs a way to appeal the streak break and have their actual streak restored.

Streak break causes that warrant appeal:
- Sync failures that delayed entry upload
- Server outages during entry creation
- Time zone confusion crossing midnight
- App crash losing entry before save
- Device failure losing local data

Neurodivergent users often have strong emotional attachment to streaks as markers of consistency and achievement.

#### 2. Data Model Mapping

**Streak Appeal:**

```typescript
{
  id: 'appeal-uuid',
  userId: 'user-id',
  streakType: 'morning_routine',
  claimedStreak: 90,
  systemStreak: 17,  // Days since "break"
  breakDate: '2025-11-07',
  evidence: {
    localEntryFound: true,
    localEntryTimestamp: '2025-11-07T07:23:00Z',
    syncFailureLogged: true,
    syncErrorCode: 'NETWORK_TIMEOUT'
  },
  verdict: {
    appealGranted: true,
    reason: 'sync_failure_proven',
    restoredStreak: 90
  }
}
```

#### 3. Parsing/Disambiguation Approach

**Automatic streak protection:**
```typescript
// File: apps/insight-mobile/src/gamification/StreakProtection.ts
async function checkStreakProtection(
  streakBreak: StreakBreak,
  userId: string
): ProtectionResult {
  // 1. Look for evidence of technical failure
  const evidence = await gatherEvidence(streakBreak.date, userId);

  if (evidence.localEntryExists) {
    // User did log—sync failed
    return {
      protected: true,
      reason: 'local_entry_found',
      action: 'restore_streak',
      message: 'We found your entry! Streak restored.'
    };
  }

  if (evidence.syncFailureLogged) {
    // System failure prevented logging
    return {
      protected: true,
      reason: 'system_failure',
      action: 'restore_streak',
      message: 'Sync issue on that day—streak protected.'
    };
  }

  // No automatic protection, but allow manual appeal
  return {
    protected: false,
    appealAvailable: true
  };
}
```

#### 4. Gamification Impact

**Streak restoration:**
```typescript
{
  streakRestored: {
    previous: 17,
    restored: 90,
    protectionUsed: true,
    protectionReason: 'sync_failure',
    message: "Your 90-day streak is restored! 🔥",
    xpBonus: 50  // Bonus for dedication during technical issues
  }
}
```

#### 5. Architecture Solution

**Streak protection flow:**
```
Streak Break Detected → Check Local Evidence
                            ↓
        ┌───────────────────┴───────────────────┐
    Evidence Found                      No Evidence
            ↓                               ↓
    Auto-restore                    Allow Appeal
            ↓                               ↓
    Notify User                     User Submits Appeal
                                           ↓
                                    Review Evidence
                                           ↓
                                    Decide & Notify
```

**File references:**
- Streak protection: `apps/insight-mobile/src/gamification/StreakProtection.ts:23`
- Appeal system: `apps/insight-mobile/src/gamification/StreakAppeal.ts:45`
- Protection UI: `apps/insight-mobile/src/components/StreakProtectionSheet.tsx:12`

---

### UC-E045: Export/Backup Creation Failure (Biohacker)

#### 1. User Phrase/Scenario

Sam is exporting a year of biometric data to analyze in external tools. The export fails at 60% due to a storage limitation. Sam needs to know what was exported, what wasn't, and how to complete the export.

Export failure scenarios:
- Storage space insufficient
- Network timeout during large export
- File format conversion error
- Memory limits on large datasets
- Export interrupted by app closure

Biohackers need complete data exports for external analysis—partial exports are often useless.

#### 2. Data Model Mapping

**Export State:**

```typescript
{
  id: 'export-uuid',
  userId: 'user-id',
  exportType: 'full_biometric',
  progress: {
    total: 12000,  // records
    exported: 7200,
    remaining: 4800,
    percentComplete: 60
  },
  failure: {
    reason: 'STORAGE_FULL',
    at: Date.now(),
    partialFile: 'export_partial_2026-01-18.csv',
    partialSize: '45MB'
  },
  recovery: {
    canResume: true,
    canChunk: true,
    canCompress: true
  }
}
```

#### 3. Parsing/Disambiguation Approach

**Export failure recovery:**
```typescript
// File: apps/insight-mobile/src/export/ExportRecovery.ts
async function handleExportFailure(
  state: ExportState
): RecoveryOptions {
  const options = [];

  if (state.canResume) {
    options.push({
      action: 'resume',
      label: 'Resume from 60%',
      description: 'Continue after freeing space'
    });
  }

  if (state.canChunk) {
    options.push({
      action: 'chunk',
      label: 'Export in smaller files',
      description: 'Split into monthly files'
    });
  }

  if (state.canCompress) {
    options.push({
      action: 'compress',
      label: 'Export compressed',
      description: 'Smaller file, same data'
    });
  }

  return {
    message: `Export stopped at 60% (storage full). Your partial export is saved.`,
    options,
    partialExportPath: state.partialFile
  };
}
```

#### 4. Gamification Impact

**Export doesn't affect normal usage:**
```typescript
{
  exportFailure: {
    normalUsageUnaffected: true,
    partialDataAvailable: true,
    message: "Export paused—your regular tracking continues normally."
  }
}
```

#### 5. Architecture Solution

**Resumable export:**
```
Export Request → Begin Export
                    ↓
            Export in Chunks
                    ↓
        ┌───────────┴───────────┐
    Complete                Failure
        ↓                       ↓
    Deliver file          Save progress
                               ↓
                    Show recovery options
                               ↓
                    User chooses action
                               ↓
                    Resume/chunk/compress
```

**File references:**
- Export recovery: `apps/insight-mobile/src/export/ExportRecovery.ts:34`
- Chunk exporter: `apps/insight-mobile/src/export/ChunkExporter.ts:23`
- Export UI: `apps/insight-mobile/src/screens/ExportScreen.tsx:45`

---

## Conflict Resolution (Continued)

*Additional conflict resolution use cases covering multi-user, cross-device, and data synchronization conflicts.*

### UC-E046: Shared Account Entry Attribution (Dabbler)

#### 1. User Phrase/Scenario

Jordan shares an Insight account with their partner. Both log meals casually. Jordan says "I had pasta for lunch" but the system can't determine if this is Jordan or their partner speaking. For Dabblers with shared accounts, entry attribution should be quick and forgiving.

#### 2. Data Model Mapping

```typescript
{
  entryId: 'meal-uuid',
  accountId: 'shared-account',
  attribution: { status: 'unattributed', suggestedUser: 'jordan', confidence: 0.72 },
  autoAssign: true  // Assign to most recent active user
}
```

#### 3. Parsing/Disambiguation Approach

Voice profile matching for multi-user accounts. If unclear, assign to last active user and allow quick correction via swipe gesture.

#### 4. Gamification Impact

Entries count for the attributed user. Correction doesn't lose XP—it transfers seamlessly.

#### 5. Architecture Solution

Voice profile → Match to account members → Auto-assign or prompt → Allow correction.

---

### UC-E047: Concurrent Routine Completion (Neurodivergent)

#### 1. User Phrase/Scenario

Riley has overlapping routines—morning routine contains "take meds" which also appears in their daily routine. Completing it in one should mark it complete in both, avoiding confusion about whether they did it.

#### 2. Data Model Mapping

```typescript
{
  action: 'take_meds',
  sharedAcrossRoutines: ['morning_routine', 'daily_routine'],
  completionSync: true,
  completedAt: Date.now()
}
```

#### 3. Parsing/Disambiguation Approach

Detect shared steps across routines. Completing in one automatically syncs to others.

#### 4. Gamification Impact

XP only awarded once per unique action, not per routine. Streaks updated for both routines.

#### 5. Architecture Solution

Action completion → Check shared routines → Sync completion → Award XP once.

---

### UC-E048: Workout Merge from Multiple Sources (Biohacker)

#### 1. User Phrase/Scenario

Sam's workout has data from Apple Watch (heart rate), gym equipment (sets/reps), and voice log (perceived exertion). All three need to merge into one coherent workout entry without conflicts.

#### 2. Data Model Mapping

```typescript
{
  workoutId: 'merged-uuid',
  sources: ['apple_watch', 'gym_equipment', 'voice'],
  mergedData: {
    heartRate: { source: 'apple_watch', avgBpm: 145 },
    exercises: { source: 'gym_equipment', sets: [...] },
    rpe: { source: 'voice', rating: 8 }
  }
}
```

#### 3. Parsing/Disambiguation Approach

Each source has authoritative fields. Merge without conflict by respecting source specialization.

#### 4. Gamification Impact

Single workout XP, not triple. Comprehensive data earns "detail bonus" XP.

#### 5. Architecture Solution

Collect from sources → Map to authoritative fields → Merge non-overlapping → Create unified entry.

---

### UC-E049: Historical Entry Edit Conflict (Reflector)

#### 1. User Phrase/Scenario

Casey is editing a journal entry from 6 months ago for clarity while their therapist (with shared read access) is viewing it. The edit should not disrupt the viewing session or lose the therapeutic context.

#### 2. Data Model Mapping

```typescript
{
  entryId: 'journal-uuid',
  editLock: { status: 'soft_lock', viewers: 1 },
  versionOnEdit: { created: true, preserveOriginal: true }
}
```

#### 3. Parsing/Disambiguation Approach

Create new version on edit, preserve original for active viewers. Viewer sees "updated version available" after their session.

#### 4. Gamification Impact

No XP for editing historical entries. Preserves original reflection credit.

#### 5. Architecture Solution

Edit initiated → Check active viewers → Version fork → Apply edit to new version → Notify viewers later.

---

### UC-E050: Wearable Data Conflict (Optimizer)

#### 1. User Phrase/Scenario

Alex wears both Whoop and Garmin. Both report different HRV values for the same morning measurement (72 vs 68). The system needs a consistent resolution strategy.

#### 2. Data Model Mapping

```typescript
{
  metricType: 'hrv',
  sources: [
    { device: 'whoop', value: 72, measureTime: '06:00' },
    { device: 'garmin', value: 68, measureTime: '06:02' }
  ],
  resolution: { strategy: 'primary_device', primaryDevice: 'whoop', value: 72 }
}
```

#### 3. Parsing/Disambiguation Approach

User sets primary device per metric type. Primary always wins. Secondary stored for comparison.

#### 4. Gamification Impact

Consistent data feeds consistent insights. Both devices contribute to "data richness" score.

#### 5. Architecture Solution

Receive from multiple → Check primary device preference → Store primary as canonical → Keep secondary as context.

---

### UC-E051: Privacy Level Conflict on Shared Entry (Privacy-First)

#### 1. User Phrase/Scenario

Morgan created a journal entry marked private, then accidentally tried to share it with their accountability partner. The privacy level should block sharing and warn Morgan.

#### 2. Data Model Mapping

```typescript
{
  entryId: 'private-uuid',
  privacyLevel: 'private',
  shareAttempt: { blocked: true, reason: 'privacy_conflict' },
  userChoice: ['change_privacy', 'cancel_share']
}
```

#### 3. Parsing/Disambiguation Approach

Privacy levels are enforced gates. Private entries cannot be shared without explicit privacy downgrade.

#### 4. Gamification Impact

No impact. Privacy decisions are never gamified or pressured.

#### 5. Architecture Solution

Share attempt → Check privacy level → Block if private → Offer downgrade or cancel.

---

### UC-E052: Entry Category Migration (Dabbler)

#### 1. User Phrase/Scenario

Jordan logged "morning meditation" as a workout months ago before the mindfulness category existed. Now they want those entries recategorized. The migration should preserve XP earned.

#### 2. Data Model Mapping

```typescript
{
  migrationRequest: {
    fromCategory: 'workout',
    toCategory: 'mindfulness',
    entries: 45,
    xpTransfer: 'preserve'
  }
}
```

#### 3. Parsing/Disambiguation Approach

Batch migration with XP preservation. Historical analytics adjust to reflect accurate categorization.

#### 4. Gamification Impact

XP preserved. Category-specific streaks recalculated. Overall XP unchanged.

#### 5. Architecture Solution

Select entries → Confirm migration → Update categories → Transfer XP → Recalculate category streaks.

---

### UC-E053: Goal vs Actual Conflict (Optimizer)

#### 1. User Phrase/Scenario

Alex set a goal for "100 pushups daily" but logs "did pushups" without a count. The system should prompt for count to measure goal progress, not just accept the vague entry.

#### 2. Data Model Mapping

```typescript
{
  goalId: 'pushup-goal-uuid',
  entryAttempt: { type: 'pushups', count: null },
  conflict: { type: 'goal_requires_metric', metric: 'count' }
}
```

#### 3. Parsing/Disambiguation Approach

Goals with quantitative targets require matching metrics. Prompt for count before accepting.

#### 4. Gamification Impact

Entry counts for streak. Goal progress only if count provided. Option to "skip goal tracking for this entry."

#### 5. Architecture Solution

Parse entry → Detect goal → Check required metrics → Prompt if missing → Log with or without goal credit.

---

### UC-E054: Time Zone Conflict on Travel (Biohacker)

#### 1. User Phrase/Scenario

Sam travels from New York to Tokyo. Their morning HRV was measured at 6 AM Tokyo time, but server records show 5 PM the previous day (Eastern time). Biometric trends need timezone-aware handling.

#### 2. Data Model Mapping

```typescript
{
  entry: { localTime: '06:00', localTimezone: 'Asia/Tokyo', utcTime: '2026-01-17T21:00Z' },
  homeTimezone: 'America/New_York',
  display: { showAsLocalMorning: true, travelDetected: true }
}
```

#### 3. Parsing/Disambiguation Approach

Store in UTC. Display in local time. Detect travel and annotate "travel mode" for analytics context.

#### 4. Gamification Impact

Streaks calculated in local time. Travel doesn't break streaks. "Travel resilience" badge for maintaining habits.

#### 5. Architecture Solution

Capture with timezone → Store UTC → Display local → Detect travel patterns → Annotate analytics.

---

## API/Server Errors (Continued)

*Additional API and server error handling use cases covering third-party integrations, rate limits, webhooks, and service failures.*

### UC-E055: Third-Party API Deprecation (Optimizer)

#### 1. User Phrase/Scenario

Alex's Strava integration stops working because Strava deprecated their old API. The system should notify Alex and offer migration steps without losing historical data.

#### 2. Data Model Mapping

```typescript
{
  integration: 'strava',
  status: 'deprecated_api',
  historicalData: { preserved: true, lastSync: Date.now() - 86400000 },
  migration: { newApiAvailable: true, reauthorizeRequired: true }
}
```

#### 3. Parsing/Disambiguation Approach

Detect API failures matching deprecation patterns. Notify user of required re-authorization. Queue for retry after migration.

#### 4. Gamification Impact

No data loss. Sync resumes after migration. Gap in real-time data noted.

#### 5. Architecture Solution

API failure → Detect deprecation → Preserve historical → Notify user → Guide re-authorization → Resume sync.

---

### UC-E056: Rate Limit from External Service (Biohacker)

#### 1. User Phrase/Scenario

Sam's Apple Health integration hits HealthKit rate limits after requesting too much historical data. The import must continue incrementally without losing progress.

#### 2. Data Model Mapping

```typescript
{
  integration: 'apple_health',
  importProgress: { completed: 5000, remaining: 8000 },
  rateLimitHit: true,
  resumeAt: Date.now() + 60000
}
```

#### 3. Parsing/Disambiguation Approach

Respect rate limits with exponential backoff. Persist progress. Resume automatically when limits reset.

#### 4. Gamification Impact

Retroactive XP/streaks calculated on import completion. Progress bar shows import status.

#### 5. Architecture Solution

Import batch → Rate limit hit → Save checkpoint → Wait for reset → Resume from checkpoint.

---

### UC-E057: Webhook Delivery Failure (Privacy-First)

#### 1. User Phrase/Scenario

Morgan set up a webhook to notify a private server when they complete a habit. The webhook fails. Morgan needs assurance their habit data didn't leak and the retry won't expose anything.

#### 2. Data Model Mapping

```typescript
{
  webhookId: 'webhook-uuid',
  deliveryAttempt: { status: 'failed', error: 'TIMEOUT' },
  data: { encrypted: true, stored: false },  // Never persisted server-side
  retry: { scheduled: true, secureDelivery: true }
}
```

#### 3. Parsing/Disambiguation Approach

Webhook payloads are ephemeral, never stored on failure. Retry with same encrypted payload. User can cancel retries.

#### 4. Gamification Impact

Webhook status doesn't affect entry credit. Habit logged regardless of delivery.

#### 5. Architecture Solution

Generate payload → Encrypt → Attempt delivery → On fail, queue secure retry → Notify user → Allow cancel.

---

### UC-E058: AI Insight Generation Failure (Reflector)

#### 1. User Phrase/Scenario

Casey requested weekly insights based on their journal entries. The AI analysis times out due to high demand. Casey should still see their entries and get insights when available.

#### 2. Data Model Mapping

```typescript
{
  insightRequest: 'weekly-uuid',
  status: 'generation_failed',
  fallback: { basicStats: true, advancedInsights: 'queued' },
  retryScheduled: Date.now() + 1800000
}
```

#### 3. Parsing/Disambiguation Approach

Show basic statistics immediately. Queue AI insights for off-peak processing. Notify when ready.

#### 4. Gamification Impact

Viewing insights earns "reflection" XP regardless of AI availability.

#### 5. Architecture Solution

Request insights → AI timeout → Show basic stats → Queue advanced → Process off-peak → Notify completion.

---

### UC-E059: Storage Quota Exceeded (Dabbler)

#### 1. User Phrase/Scenario

Jordan's free tier storage is full. They try to log a meal and get an error. The system should handle this gracefully without losing the entry.

#### 2. Data Model Mapping

```typescript
{
  storageStatus: { used: 500, limit: 500, unit: 'MB' },
  pendingEntry: { stored: 'local', willSyncAfter: 'upgrade_or_cleanup' },
  options: ['cleanup_old', 'upgrade_plan', 'compress_data']
}
```

#### 3. Parsing/Disambiguation Approach

Always store locally first. If cloud sync blocked by quota, queue entry and notify user of options.

#### 4. Gamification Impact

Entry logged locally—XP and streak credit awarded. Sync pending until storage resolved.

#### 5. Architecture Solution

Entry → Store local → Check quota → If exceeded, queue sync → Notify options → Sync after resolution.

---

### UC-E060: Device Migration Data Loss (Neurodivergent)

#### 1. User Phrase/Scenario

Riley got a new phone and the app migration didn't transfer their personal lexicon (custom phrases like "THE thing"). They need recovery without recreating everything.

#### 2. Data Model Mapping

```typescript
{
  migration: { dataTransferred: 'partial', missing: ['lexicon', 'local_preferences'] },
  recovery: { cloudBackupAvailable: true, lexiconRecoverable: true }
}
```

#### 3. Parsing/Disambiguation Approach

Detect missing local data. Offer recovery from cloud backup. Rebuild lexicon from historical entries if backup unavailable.

#### 4. Gamification Impact

Streaks and XP preserved (stored server-side). Local preferences need manual or automatic recovery.

#### 5. Architecture Solution

Detect new device → Check for missing data → Offer recovery → Restore from backup or rebuild.

---

## Recovery Flows (Continued)

*Additional recovery flow use cases covering database recovery, onboarding, version compatibility, permissions, device sync, and emergency access.*

### UC-E061: Corrupted Local Database (Privacy-First)

#### 1. User Phrase/Scenario

Morgan's local database got corrupted after a crash. They need data recovery with full transparency about what's lost and what's recoverable.

#### 2. Data Model Mapping

```typescript
{
  databaseStatus: 'corrupted',
  recoverableData: { entries: 234, fromCloud: true },
  localOnlyLoss: { pendingEntries: 3, description: 'unsynced private notes' }
}
```

#### 3. Parsing/Disambiguation Approach

Attempt WAL recovery first. If failed, restore from cloud backup. Report any local-only data loss transparently.

#### 4. Gamification Impact

Server-synced progress preserved. Any local-only entries trigger streak protection review.

#### 5. Architecture Solution

Detect corruption → Attempt WAL recovery → Fall back to cloud restore → Report losses → Rebuild indexes.

---

### UC-E062: Incomplete Onboarding Recovery (Dabbler)

#### 1. User Phrase/Scenario

Jordan started onboarding, set up some habits, then closed the app. Next session, they're stuck in a half-configured state. The app should help them resume or start fresh.

#### 2. Data Model Mapping

```typescript
{
  onboardingState: { step: 3, total: 7, completed: ['profile', 'first_habit', 'goals'] },
  partialData: { preserved: true },
  options: ['continue', 'start_fresh', 'skip_to_app']
}
```

#### 3. Parsing/Disambiguation Approach

Detect incomplete onboarding. Offer resume, restart, or skip. Preserve any entered data.

#### 4. Gamification Impact

Onboarding completion earns "First Steps" XP. Partial completion preserved if resumed.

#### 5. Architecture Solution

Session start → Check onboarding state → If incomplete, show options → Resume or restart or skip.

---

### UC-E063: Version Incompatibility on Sync (Optimizer)

#### 1. User Phrase/Scenario

Alex's phone app is on version 2.5 while the server has deployed features requiring 2.6. Sync fails due to schema mismatch. Alex needs to understand the issue and update.

#### 2. Data Model Mapping

```typescript
{
  clientVersion: '2.5.0',
  serverMinVersion: '2.6.0',
  syncStatus: 'blocked',
  localMode: { available: true, fullFunctionality: false }
}
```

#### 3. Parsing/Disambiguation Approach

Version check before sync. If incompatible, offer offline mode until update. Push update notification.

#### 4. Gamification Impact

Offline entries credited. Sync resumes post-update without XP loss.

#### 5. Architecture Solution

Sync attempt → Version check → If mismatch, enter limited mode → Prompt update → Resume on upgrade.

---

### UC-E064: Notification Permission Recovery (Neurodivergent)

#### 1. User Phrase/Scenario

Riley accidentally denied notification permissions and now misses routine reminders. They want to re-enable but don't know how to find the setting.

#### 2. Data Model Mapping

```typescript
{
  notificationPermission: 'denied',
  impactedFeatures: ['routine_reminders', 'streak_warnings'],
  recovery: { canPromptAgain: true, deepLinkToSettings: true }
}
```

#### 3. Parsing/Disambiguation Approach

Detect denied permissions affecting core features. Offer in-app guidance to system settings.

#### 4. Gamification Impact

No XP penalty for missed notifications. Offer "re-enabled reminders" celebration.

#### 5. Architecture Solution

Check permissions → If denied, show gentle reminder → Deep link to settings → Confirm on re-enable.

---

### UC-E065: Watch App Desync (Biohacker)

#### 1. User Phrase/Scenario

Sam's Apple Watch app lost sync with the phone app. The watch shows different streak counts and missing recent entries.

#### 2. Data Model Mapping

```typescript
{
  syncStatus: { watch: 'stale', lastSync: Date.now() - 86400000 },
  divergence: { phoneStreak: 45, watchStreak: 40, entriesBehind: 12 },
  recovery: { forceSync: true }
}
```

#### 3. Parsing/Disambiguation Approach

Detect watch data staleness. Trigger force sync. If connection issue, notify and offer manual sync button.

#### 4. Gamification Impact

Phone is source of truth. Watch updates after sync. No double-counting.

#### 5. Architecture Solution

Watch app launch → Check sync age → If stale, force sync → Update watch state → Show reconciled data.

---

### UC-E066: Journal Export Format Failure (Reflector)

#### 1. User Phrase/Scenario

Casey exports their journal to PDF for their therapist, but the PDF generation fails on certain special characters in their entries.

#### 2. Data Model Mapping

```typescript
{
  exportRequest: 'pdf',
  status: 'failed',
  cause: 'encoding_error',
  problematicEntries: [{ id: 'entry-uuid', char: '💔', position: 245 }],
  fallback: { plainText: true, sanitizedPdf: true }
}
```

#### 3. Parsing/Disambiguation Approach

Attempt full export. On failure, identify problematic content. Offer sanitized export or alternative format.

#### 4. Gamification Impact

Export attempts don't affect XP. Successful exports earn "archive keeper" badge.

#### 5. Architecture Solution

Generate export → On failure, analyze cause → Offer alternatives → Retry with sanitization.

---

### UC-E067: Emergency Data Access (Privacy-First)

#### 1. User Phrase/Scenario

Morgan's phone was stolen. They need to remotely revoke access and ensure their journal data can't be accessed from the stolen device.

#### 2. Data Model Mapping

```typescript
{
  emergencyAccess: true,
  action: 'remote_revoke',
  deviceId: 'stolen-device-uuid',
  result: { sessionRevoked: true, localDataEncrypted: true, requiresReauth: true }
}
```

#### 3. Parsing/Disambiguation Approach

Web-based emergency access. Revoke device sessions. If device comes online, trigger local wipe. Send confirmation.

#### 4. Gamification Impact

XP and streaks preserved in cloud. Device-specific data wiped for security.

#### 5. Architecture Solution

Emergency login → Revoke device → Mark for wipe → Notify on wipe completion → Preserve cloud data.

---

## Appendix: Additional Error Codes

| Code | Category | Description | User Action |
|------|----------|-------------|-------------|
| E014 | Parse | Missing required fields | Accept or add details |
| E015 | Parse | Conflicting intents | Confirm final intent |
| E016 | Parse | Numeric ambiguity | Confirm correct value |
| E017 | Parse | Context-dependent phrase | Use personal lexicon |
| E018 | Parse | Temporal confusion | Clarify date range |
| E019 | Parse | Unit ambiguity | Confirm units |
| E020 | Parse | Intent classification failure | Select action |
| E021 | Parse | Entity extraction failure | Accept vague entry |
| E022 | Parse | Multi-domain confusion | Confirm domains |
| E023 | Parse | Sarcasm detected | Clarify meaning |
| E024 | Parse | Hallucination blocked | Preserved as spoken |
| E025 | Sync | Offline mode | Will sync when online |
| E026 | Sync | Concurrent edit conflict | Auto-merged or choose |
| E027 | Sync | Network timeout | Saved locally |
| E028 | Sync | Background sync partial | Gap recovery available |
| E029 | Sync | Server unreachable | Graceful offline mode |
| E030 | Sync | Intermittent connectivity | Auto-saving locally |
| E031 | Sync | Rate limit | Queued for processing |
| E032 | Sync | SSL certificate error | Use secure connection |
| E033 | Validation | Value out of range | Confirm or correct |
| E034 | Validation | Invalid date | Select valid date |
| E035 | Validation | Duplicate detected | Merge or keep both |
| E036 | Validation | Schema migration failed | Recovery options |
| E037 | Conflict | Cross-device edit | Smart merge applied |
| E038 | Conflict | Template vs instance | Both preserved |
| E039 | Conflict | Journal merge decision | User chooses |
| E040 | API | Backend timeout | Background or simplify |
| E041 | API | Server error (5xx) | Saved locally, retry |
| E042 | Recovery | Undo available | Tap to undo |
| E043 | Recovery | Backup restore | Preview and restore |
| E044 | Recovery | Streak appeal | Protection or appeal |
| E045 | Recovery | Export failed | Resume or chunk |

---

## Appendix: Error Code Reference

| Code | Category | Description | User Action |
|------|----------|-------------|-------------|
| E001 | Voice | Transcription inaudible | Retry in quieter environment |
| E002 | Voice | Capture interrupted | Complete entry |
| E003 | Voice | Recognition error | Review and correct |
| E004 | Voice | Low volume | Speak louder or review |
| E005 | Voice | Multiple speakers | Confirm filtered result |
| E006 | Voice | Homophone confusion | Silently corrected |
| E007 | Voice | Language switching | Preserved as-is |
| E008 | Voice | Capture timeout | Continue or save partial |
| E009 | Voice | Audio interference | Use filtered result |
| E010 | Voice | Speed mismatch | Confirm batch entries |
| E011 | Voice | Emotional distortion | Preserved with care |
| E012 | Voice | Extreme conditions | Cleaned automatically |
| E013 | Parse | Ambiguous type | Clarify intent |
| E020 | Sync | Network unavailable | Saved locally |
| E021 | Sync | Conflict detected | Review merge |
| E030 | Validation | Value out of range | Correct value |
| E040 | API | Server error | Retry later |
| E050 | Recovery | Data recovery needed | Follow prompts |

---

## Appendix: Persona-Specific Error Tolerance Matrix

| Error Type | Optimizer | Dabbler | Privacy-First | Neurodivergent | Biohacker | Reflector |
|------------|-----------|---------|---------------|----------------|-----------|-----------|
| Transcription | Low | High | Medium | High | Low | Medium |
| Parse errors | Low | High | Medium | High | Low | Medium |
| Sync delays | Low | High | Medium | Medium | Low | High |
| Validation | Low | Medium | Low | High | Low | Medium |
| Data loss | Very Low | Medium | Very Low | Very Low | Very Low | Very Low |

**Tolerance Legend:**
- **Very Low**: Immediate notification, prominent error display, quick resolution required
- **Low**: Clear notification, resolution path obvious, tracking of resolution
- **Medium**: Gentle notification, optional resolution, graceful degradation
- **High**: Silent handling when possible, minimal interruption, background resolution

---

## Appendix: Error Handling Architecture Summary

### Core Principles

1. **Preserve user intent**: Never lose what the user tried to capture
2. **Fail gracefully**: Degraded functionality beats complete failure
3. **Persona-aware responses**: Error messaging matches user sophistication
4. **Gamification protection**: Technical failures never penalize users
5. **Recovery-first**: Every error state has a resolution path

### Error Handling Hierarchy

```
Level 1: Prevention
├── Proactive warnings (low volume, noise, multiple speakers)
├── Input validation before processing
└── Environment detection

Level 2: Detection
├── Confidence scoring for all operations
├── Anomaly detection in parsed results
└── Consistency checks across entities

Level 3: Resolution
├── Auto-correction when confidence high
├── Suggested corrections for medium confidence
├── Clarification prompts for low confidence
└── Manual entry fallback for failures

Level 4: Recovery
├── Undo/redo for recent actions
├── Version history for entries
├── Backup restoration for data loss
└── Sync reconciliation for conflicts
```

### Key Metrics

- **Mean time to resolution**: Target < 30 seconds for user-facing errors
- **Auto-resolution rate**: Target > 70% of errors resolved without user action
- **Data loss incidents**: Target 0 per month
- **Streak break false positives**: Target 0 (technical issues never break streaks)

---

*End of Document*
