# CONVOY 3, SECTION 5: MISCONSTRUED INPUT HANDLING

**Document Version:** 1.0
**Date:** January 18, 2026
**Section:** 5 of 8
**Word Count:** ~8,400 words
**Status:** Production Specification

---

## Section Overview

Misconstrued input handling represents one of the most critical aspects of the Insight 5.2 parsing architecture. When users speak naturally—with self-corrections, incomplete thoughts, ambiguous references, and contextual assumptions—the system must intelligently determine user intent while providing graceful pathways for correction. This section synthesizes findings from 603 use cases across nine domains to establish production-ready patterns for ambiguity detection, confidence-based routing, clarification flows, and fallback strategies.

### Key Principles

The misconstrued input handling system operates under five core principles derived from the Phase 2 domain specifications:

1. **Preserve User Intent**: The goal is understanding what the user meant, not what they literally said
2. **Confidence-Driven Routing**: Different confidence levels trigger different system behaviors
3. **Persona-Appropriate Responses**: Clarification approaches adapt to user sophistication and emotional state
4. **Minimal Cognitive Load**: Disambiguation should be quick, intuitive, and non-punitive
5. **No Silent Failures**: Users must always know what happened with their input

### Scope

This section covers:
- **Ambiguity Detection**: Identifying when input is unclear, multi-interpretable, or incomplete
- **Confidence Threshold Architecture**: The hierarchical system for routing inputs based on classification confidence
- **Clarification Flows**: Multi-path user interaction patterns for resolving ambiguity
- **Fallback Strategies**: Graceful degradation when primary parsing fails
- **Recovery Patterns**: Mechanisms for users to correct or refine system interpretations

---

# PART 5: MISCONSTRUED INPUT HANDLING

## 5.1 Ambiguity Detection Framework

### 5.1.1 Types of Input Ambiguity

Voice and text input in life-logging systems produces several distinct categories of ambiguity. Understanding these categories enables targeted detection and resolution strategies.

#### Category 1: Temporal Ambiguity

Temporal ambiguity occurs when the input lacks clear past/present/future markers, making it impossible to determine when an event occurred or should occur.

**Examples from Domain Research:**

```typescript
// UC-E013: "Meeting with Sarah about the project"
// Could mean:
// - Past: "I had a meeting with Sarah about the project" (event log)
// - Future: "I need to schedule a meeting with Sarah" (task)
// - Present: "I'm currently in a meeting with Sarah" (note)

interface TemporalAmbiguity {
  type: 'temporal';
  inputText: string;
  possibleInterpretations: Array<{
    temporalContext: 'past' | 'present' | 'future';
    entityType: 'event' | 'task' | 'note';
    confidence: number;
    reasoning: string;
  }>;
  resolutionSignals: {
    timeOfDay: Date;
    userPatterns: 'typically_retrospective' | 'typically_prospective' | 'mixed';
    recentContext: string[];
  };
}

// Detection logic
const TEMPORAL_SIGNALS = {
  past: [
    /had\s+a?/i,
    /finished/i,
    /completed/i,
    /did\s+(my|the|a)?/i,
    /was\s+at/i,
    /went\s+to/i,
    /yesterday/i,
    /earlier/i
  ],
  future: [
    /need\s+to/i,
    /have\s+to/i,
    /should/i,
    /will/i,
    /going\s+to/i,
    /reminder/i,
    /don't\s+forget/i,
    /schedule/i,
    /tomorrow/i,
    /next/i
  ],
  present: [
    /currently/i,
    /right\s+now/i,
    /at\s+the\s+moment/i,
    /in\s+my/i
  ]
};

function detectTemporalAmbiguity(input: string): TemporalAmbiguityResult {
  const pastSignals = TEMPORAL_SIGNALS.past.filter(p => p.test(input)).length;
  const futureSignals = TEMPORAL_SIGNALS.future.filter(p => p.test(input)).length;
  const presentSignals = TEMPORAL_SIGNALS.present.filter(p => p.test(input)).length;

  const total = pastSignals + futureSignals + presentSignals;

  if (total === 0) {
    // No temporal signals detected - ambiguous
    return { isAmbiguous: true, dominantContext: null, confidence: 0.33 };
  }

  const dominant = Math.max(pastSignals, futureSignals, presentSignals);
  if (dominant / total < 0.6) {
    // Mixed signals - ambiguous
    return { isAmbiguous: true, dominantContext: null, confidence: dominant / total };
  }

  // Clear dominant context
  const context =
    pastSignals === dominant ? 'past' :
    futureSignals === dominant ? 'future' : 'present';

  return { isAmbiguous: false, dominantContext: context, confidence: dominant / total };
}
```

#### Category 2: Entity Type Ambiguity

Entity type ambiguity occurs when the same input could reasonably represent multiple entity types. This is distinct from temporal ambiguity as it concerns the nature of the entry, not its timing.

**Examples from Domain Research:**

```typescript
// UC-W012: "5K run tomorrow"
// Could mean:
// - Workout: Pre-planning a workout session
// - Event: A scheduled race/event
// - Task: Reminder to complete the workout

// UC-HAB-015: "Morning meditation"
// Could mean:
// - Habit: Logging completion of meditation habit
// - Event: Describing meditation that happened
// - Task: Reminder to meditate

interface EntityTypeAmbiguity {
  type: 'entity_type';
  inputText: string;
  possibleTypes: Array<{
    entityType: EntityType;
    confidence: number;
    signals: string[];
  }>;
  disambiguationNeeded: boolean;
}

// Detection signals for each entity type
const ENTITY_TYPE_SIGNALS: Record<EntityType, RegExp[]> = {
  habit: [
    /did\s+(my|the)\s+/i,
    /completed\s+(my|the)\s+/i,
    /finished\s+(my|the)\s+/i,
    /^done$/i,
    /streak/i
  ],
  event: [
    /@\w+/,                    // @ mentions
    /!\w+/,                    // ! locations
    /at\s+\d{1,2}(:\d{2})?\s*(am|pm)?/i,
    /for\s+\d+\s+(hours?|minutes?)/i,
    /with\s+/i
  ],
  task: [
    /need\s+to/i,
    /have\s+to/i,
    /should/i,
    /remember\s+to/i,
    /don't\s+forget/i,
    /todo/i,
    /!!/,                      // Urgency marker
  ],
  tracker: [
    /#\w+\(\d+\)/,             // Explicit tracker syntax
    /\b(mood|energy|focus|anxiety|motivation)\s*[:\-=]?\s*\d+/i,
    /\d+\s*\/\s*10/,           // X/10 rating
    /rating\s*[:\-=]?\s*\d+/i
  ],
  note: [
    /^thinking\s+about/i,
    /^reflecting\s+on/i,
    /^feeling\s+/i,
    /^\[private\]/i,
    /^\[note\]/i
  ]
};

function detectEntityTypeAmbiguity(
  input: string,
  preParseResult: PreParseResult
): EntityTypeAmbiguity {
  const scores: Record<EntityType, number> = {
    habit: 0,
    event: 0,
    task: 0,
    tracker: 0,
    note: 0
  };

  // Calculate signal scores
  for (const [type, patterns] of Object.entries(ENTITY_TYPE_SIGNALS)) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        scores[type as EntityType] += 1;
      }
    }
  }

  // Boost scores based on pre-parsed elements
  if (preParseResult.trackers.length > 0) scores.tracker += 2;
  if (preParseResult.mentions.length > 0) scores.event += 1;
  if (preParseResult.locations.length > 0) scores.event += 1;
  if (preParseResult.taskSignals.length > 0) scores.task += 2;

  // Normalize to confidence scores
  const totalSignals = Object.values(scores).reduce((a, b) => a + b, 0);
  if (totalSignals === 0) {
    return {
      type: 'entity_type',
      inputText: input,
      possibleTypes: [{ entityType: 'note', confidence: 0.50, signals: ['default'] }],
      disambiguationNeeded: true
    };
  }

  const possibleTypes = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .map(([type, score]) => ({
      entityType: type as EntityType,
      confidence: score / totalSignals,
      signals: ENTITY_TYPE_SIGNALS[type as EntityType]
        .filter(p => p.test(input))
        .map(p => p.source)
    }))
    .sort((a, b) => b.confidence - a.confidence);

  // Ambiguous if top two are close in confidence
  const disambiguationNeeded =
    possibleTypes.length >= 2 &&
    (possibleTypes[0].confidence - possibleTypes[1].confidence) < 0.25;

  return { type: 'entity_type', inputText: input, possibleTypes, disambiguationNeeded };
}
```

#### Category 3: Self-Correction Ambiguity

Self-correction ambiguity occurs when users verbally correct themselves mid-sentence, and the system must determine which value to use.

**Examples from Domain Research (Phase 2H - Voice Input Edge Cases):**

```typescript
// UC-VOI-015: "Mood 7 no wait 8"
// Correct interpretation: mood = 8

// UC-VOI-016: "Did bench no actually squats"
// Correct interpretation: exercise = squats

// UC-VOI-017: "8... no 7... actually maybe 6"
// Correct interpretation: value = 6 (final number after correction chain)

interface SelfCorrectionAmbiguity {
  type: 'self_correction';
  originalValues: string[];
  correctedValue: string;
  correctionSignal: string;
  confidence: number;
}

const CORRECTION_SIGNALS = [
  { pattern: /no\s+wait/i, strength: 0.95 },
  { pattern: /actually/i, strength: 0.90 },
  { pattern: /I\s+mean/i, strength: 0.88 },
  { pattern: /sorry/i, strength: 0.75 },
  { pattern: /scratch\s+that/i, strength: 0.95 },
  { pattern: /let\s+me\s+rephrase/i, strength: 0.92 },
  { pattern: /not\s+\w+\s*,?\s+but/i, strength: 0.85 },
  { pattern: /well\s+maybe/i, strength: 0.60 },
  { pattern: /or\s+rather/i, strength: 0.88 }
];

function detectSelfCorrections(transcript: string): SelfCorrectionAmbiguity[] {
  const corrections: SelfCorrectionAmbiguity[] = [];

  for (const { pattern, strength } of CORRECTION_SIGNALS) {
    const regex = new RegExp(
      `(\\S+)\\s+${pattern.source}\\s+(\\S+)`,
      pattern.flags + 'g'
    );

    let match;
    while ((match = regex.exec(transcript)) !== null) {
      corrections.push({
        type: 'self_correction',
        originalValues: [match[1]],
        correctedValue: match[2],
        correctionSignal: pattern.source,
        confidence: strength
      });
    }
  }

  // Handle chained corrections: "8... no 7... actually 6"
  const chainedNumberPattern = /(\d+)(?:\.\.\.|,\s*)?(?:no|wait|actually)\s*(\d+)(?:(?:\.\.\.|,\s*)?(?:no|wait|actually)\s*(\d+))?/gi;
  let chainMatch;
  while ((chainMatch = chainedNumberPattern.exec(transcript)) !== null) {
    const numbers = [chainMatch[1], chainMatch[2], chainMatch[3]].filter(Boolean);
    if (numbers.length >= 2) {
      corrections.push({
        type: 'self_correction',
        originalValues: numbers.slice(0, -1),
        correctedValue: numbers[numbers.length - 1],
        correctionSignal: 'chained_correction',
        confidence: 0.92
      });
    }
  }

  return corrections;
}

function applySelfCorrections(
  transcript: string,
  corrections: SelfCorrectionAmbiguity[]
): string {
  let corrected = transcript;

  // Sort by position in text (reverse to maintain indices)
  corrections.sort((a, b) => {
    const posA = transcript.indexOf(a.originalValues[0]);
    const posB = transcript.indexOf(b.originalValues[0]);
    return posB - posA;
  });

  for (const correction of corrections) {
    // Replace the entire correction phrase with just the final value
    const correctionPattern = new RegExp(
      `${correction.originalValues.join('\\s*\\S+\\s*')}\\s*\\S+\\s*${correction.correctedValue}`,
      'i'
    );
    corrected = corrected.replace(correctionPattern, correction.correctedValue);
  }

  return corrected;
}
```

#### Category 4: Incomplete Thought Ambiguity

Incomplete thought ambiguity occurs when users trail off, get interrupted, or simply don't finish their sentence.

**Examples from Domain Research (Phase 2H & 2I):**

```typescript
// UC-E008: "So today I had breakfast and then went to the gym and..."
// User trailed off, leaving incomplete thought

// UC-VOI-023: "Need to remember [notification interrupts]"
// System interrupted by external event

interface IncompleteThoughtAmbiguity {
  type: 'incomplete_thought';
  capturedContent: string;
  trailingIndicator: string;
  completionSuggestions: string[];
  continueCapture: boolean;
}

const INCOMPLETE_INDICATORS = [
  { pattern: /\s+and\s*$/, type: 'conjunction_trailing' },
  { pattern: /\s+but\s*$/, type: 'conjunction_trailing' },
  { pattern: /\s+then\s*$/, type: 'sequence_trailing' },
  { pattern: /\s+so\s*$/, type: 'causation_trailing' },
  { pattern: /\s+because\s*$/, type: 'reason_trailing' },
  { pattern: /\s+to\s*$/, type: 'purpose_trailing' },
  { pattern: /\.{2,}\s*$/, type: 'ellipsis' },
  { pattern: /-+\s*$/, type: 'dash_trailing' },
  { pattern: /\b(the|a|an|my|their)\s*$/, type: 'article_trailing' }
];

function detectIncompleteThought(
  transcript: string,
  audioDuration: number,
  speechDuration: number
): IncompleteThoughtAmbiguity | null {
  // Check for trailing indicators
  for (const { pattern, type } of INCOMPLETE_INDICATORS) {
    if (pattern.test(transcript)) {
      return {
        type: 'incomplete_thought',
        capturedContent: transcript.replace(pattern, '').trim(),
        trailingIndicator: type,
        completionSuggestions: generateCompletionSuggestions(transcript, type),
        continueCapture: true
      };
    }
  }

  // Check for abrupt ending (significant silence ratio)
  const silenceRatio = 1 - (speechDuration / audioDuration);
  if (silenceRatio > 0.3 && audioDuration < 30) {
    // Long silence at end suggests incomplete
    return {
      type: 'incomplete_thought',
      capturedContent: transcript,
      trailingIndicator: 'timeout_silence',
      completionSuggestions: [],
      continueCapture: true
    };
  }

  return null;
}

function generateCompletionSuggestions(
  transcript: string,
  trailingType: string
): string[] {
  const suggestions: string[] = [];

  switch (trailingType) {
    case 'conjunction_trailing':
      // "had breakfast and..." -> suggest common follow-ons
      if (transcript.includes('breakfast')) {
        suggestions.push('went to work', 'did my workout', 'took supplements');
      }
      if (transcript.includes('gym')) {
        suggestions.push('had a shake', 'stretched', 'hit my PR');
      }
      break;

    case 'sequence_trailing':
      // "then..." suggests next step
      suggestions.push('Add the next activity');
      break;

    case 'reason_trailing':
      // "because..." suggests explanation
      suggestions.push('Add the reason');
      break;
  }

  return suggestions;
}
```

### 5.1.2 Ambiguity Detection Pipeline

The complete ambiguity detection pipeline runs after initial transcription and pre-parsing but before entity creation.

```typescript
interface AmbiguityDetectionResult {
  hasAmbiguity: boolean;
  ambiguities: Array<
    | TemporalAmbiguity
    | EntityTypeAmbiguity
    | SelfCorrectionAmbiguity
    | IncompleteThoughtAmbiguity
  >;
  resolvedTranscript: string;
  remainingAmbiguities: number;
  routingDecision: 'auto_create' | 'suggest_confirm' | 'clarify' | 'continue_capture';
}

async function detectAndResolveAmbiguities(
  transcript: string,
  preParse: PreParseResult,
  audioMetadata: AudioMetadata,
  userContext: UserContext
): Promise<AmbiguityDetectionResult> {
  const ambiguities: AmbiguityDetectionResult['ambiguities'] = [];
  let resolvedTranscript = transcript;

  // 1. Apply self-corrections (can be resolved automatically)
  const selfCorrections = detectSelfCorrections(transcript);
  if (selfCorrections.length > 0) {
    resolvedTranscript = applySelfCorrections(transcript, selfCorrections);
    ambiguities.push(...selfCorrections.filter(c => c.confidence < 0.85));
  }

  // 2. Check for incomplete thoughts
  const incompleteThought = detectIncompleteThought(
    resolvedTranscript,
    audioMetadata.duration,
    audioMetadata.speechDuration
  );
  if (incompleteThought) {
    ambiguities.push(incompleteThought);
    if (incompleteThought.continueCapture) {
      return {
        hasAmbiguity: true,
        ambiguities,
        resolvedTranscript: incompleteThought.capturedContent,
        remainingAmbiguities: 1,
        routingDecision: 'continue_capture'
      };
    }
  }

  // 3. Detect temporal ambiguity
  const temporalResult = detectTemporalAmbiguity(resolvedTranscript);
  if (temporalResult.isAmbiguous) {
    // Attempt resolution via user patterns
    const resolved = resolveTemporalFromContext(
      resolvedTranscript,
      userContext,
      new Date()
    );

    if (!resolved.isResolved) {
      ambiguities.push({
        type: 'temporal',
        inputText: resolvedTranscript,
        possibleInterpretations: resolved.interpretations,
        resolutionSignals: resolved.signals
      });
    }
  }

  // 4. Detect entity type ambiguity
  const entityTypeResult = detectEntityTypeAmbiguity(resolvedTranscript, preParse);
  if (entityTypeResult.disambiguationNeeded) {
    ambiguities.push(entityTypeResult);
  }

  // 5. Determine routing based on remaining ambiguities
  const unresolvedCount = ambiguities.filter(a => {
    if (a.type === 'self_correction') return a.confidence < 0.85;
    if (a.type === 'incomplete_thought') return true;
    if (a.type === 'temporal') return true;
    if (a.type === 'entity_type') return a.disambiguationNeeded;
    return true;
  }).length;

  let routingDecision: AmbiguityDetectionResult['routingDecision'];
  if (unresolvedCount === 0) {
    routingDecision = 'auto_create';
  } else if (unresolvedCount === 1 && entityTypeResult.possibleTypes[0]?.confidence > 0.60) {
    routingDecision = 'suggest_confirm';
  } else {
    routingDecision = 'clarify';
  }

  return {
    hasAmbiguity: unresolvedCount > 0,
    ambiguities,
    resolvedTranscript,
    remainingAmbiguities: unresolvedCount,
    routingDecision
  };
}
```

---

## 5.2 Confidence Threshold Architecture

### 5.2.1 Unified Confidence Framework

The Phase 3A Cross-Domain Synthesis identified significant fragmentation in confidence thresholds across domains. This section establishes the unified framework that standardizes confidence handling across all parsing operations.

```typescript
/**
 * Central Confidence Configuration
 *
 * This configuration standardizes confidence thresholds across all domains.
 * All parsing operations MUST reference these values rather than defining
 * domain-specific thresholds.
 */
const CONFIDENCE_CONFIG = {
  // === Entity Creation Thresholds ===
  AUTO_CREATE: 0.85,          // Create entity without any confirmation
  SUGGEST_CONFIRM: 0.60,      // Create with edit affordance visible
  REQUIRE_CLARIFY: 0.40,      // Must ask user to clarify
  REJECT_UNRELIABLE: 0.25,    // Cannot proceed, offer alternatives

  // === Persona Adjustments ===
  // These modify thresholds based on persona preferences
  PERSONA_MODIFIERS: {
    optimizer: {
      autoCreate: +0.05,      // Higher bar for auto-create (wants precision)
      rejectThreshold: +0.05  // Rejects lower-quality more readily
    },
    dabbler: {
      autoCreate: -0.10,      // Lower bar (wants low friction)
      rejectThreshold: -0.10  // More tolerant of imprecision
    },
    privacyFirst: {
      autoCreate: 0,          // Standard thresholds
      rejectThreshold: 0
    },
    neurodivergent: {
      autoCreate: -0.05,      // Slightly lower bar
      rejectThreshold: -0.15  // Very tolerant (no shame for unclear input)
    },
    biohacker: {
      autoCreate: +0.03,      // Slightly higher (data accuracy matters)
      rejectThreshold: 0
    },
    reflector: {
      autoCreate: -0.05,      // Slightly lower (preserve the thought)
      rejectThreshold: -0.10
    }
  },

  // === Context-Specific Modifiers ===
  CONTEXT_MODIFIERS: {
    emotionalContent: -0.10,   // Be more accepting of emotional speech
    noiseEnvironment: -0.05,   // Adjust for known audio issues
    fastSpeech: -0.05,         // Adjust for rapid speech patterns
    multiEntity: +0.05,        // Higher bar for complex multi-entity parsing
    retroactiveEntry: 0        // Same threshold for past entries
  },

  // === Domain-Specific Base Adjustments ===
  DOMAIN_ADJUSTMENTS: {
    tracker: +0.05,            // Trackers should be more precise
    workout: +0.03,            // Exercise data benefits from accuracy
    nutrition: -0.03,          // Food logging tolerates more variation
    mood: -0.05,               // Mood is inherently subjective
    habit: 0,                  // Standard threshold
    event: 0,                  // Standard threshold
    note: -0.10                // Notes are unstructured, most tolerant
  }
};

interface ConfidenceCalculation {
  baseConfidence: number;
  personaModifier: number;
  contextModifier: number;
  domainModifier: number;
  adjustedConfidence: number;
  threshold: 'auto_create' | 'suggest_confirm' | 'require_clarify' | 'reject';
}

function calculateEffectiveConfidence(
  rawConfidence: number,
  persona: PersonaType,
  context: ParseContext,
  entityType: EntityType
): ConfidenceCalculation {
  // Get modifiers
  const personaMod = CONFIDENCE_CONFIG.PERSONA_MODIFIERS[persona]?.autoCreate ?? 0;
  const domainMod = CONFIDENCE_CONFIG.DOMAIN_ADJUSTMENTS[entityType] ?? 0;

  // Calculate context modifier
  let contextMod = 0;
  if (context.emotionalContent) {
    contextMod += CONFIDENCE_CONFIG.CONTEXT_MODIFIERS.emotionalContent;
  }
  if (context.audioQuality === 'degraded') {
    contextMod += CONFIDENCE_CONFIG.CONTEXT_MODIFIERS.noiseEnvironment;
  }
  if (context.speechRate === 'fast') {
    contextMod += CONFIDENCE_CONFIG.CONTEXT_MODIFIERS.fastSpeech;
  }
  if (context.entityCount > 1) {
    contextMod += CONFIDENCE_CONFIG.CONTEXT_MODIFIERS.multiEntity;
  }

  // Apply modifiers (thresholds shift, not raw confidence)
  const adjustedThresholds = {
    autoCreate: CONFIDENCE_CONFIG.AUTO_CREATE + personaMod + domainMod,
    suggestConfirm: CONFIDENCE_CONFIG.SUGGEST_CONFIRM + personaMod + domainMod + contextMod,
    requireClarify: CONFIDENCE_CONFIG.REQUIRE_CLARIFY + personaMod + contextMod,
    reject: CONFIDENCE_CONFIG.REJECT_UNRELIABLE + personaMod + contextMod
  };

  // Determine routing
  let threshold: ConfidenceCalculation['threshold'];
  if (rawConfidence >= adjustedThresholds.autoCreate) {
    threshold = 'auto_create';
  } else if (rawConfidence >= adjustedThresholds.suggestConfirm) {
    threshold = 'suggest_confirm';
  } else if (rawConfidence >= adjustedThresholds.requireClarify) {
    threshold = 'require_clarify';
  } else {
    threshold = 'reject';
  }

  return {
    baseConfidence: rawConfidence,
    personaModifier: personaMod,
    contextModifier: contextMod,
    domainModifier: domainMod,
    adjustedConfidence: rawConfidence,  // Raw stays the same, thresholds shift
    threshold
  };
}
```

### 5.2.2 Confidence Sources and Aggregation

Multiple signals contribute to overall confidence. The system aggregates these using a weighted approach.

```typescript
interface ConfidenceSources {
  // Speech recognition confidence
  transcriptionConfidence: number;   // From STT (Whisper)
  wordLevelConfidences: number[];    // Per-word from STT

  // Classification confidence
  entityTypeConfidence: number;      // From LLM classifier
  attributeConfidences: Record<string, number>;  // Per-attribute

  // Context-based confidence
  patternMatchConfidence: number;    // From regex/rule matches
  userHistoryConfidence: number;     // Based on user's patterns
  temporalContextConfidence: number; // Based on time-of-day, etc.
}

const CONFIDENCE_WEIGHTS = {
  transcription: 0.25,
  entityType: 0.30,
  patternMatch: 0.20,
  userHistory: 0.15,
  temporalContext: 0.10
};

function aggregateConfidence(sources: ConfidenceSources): number {
  const components = [
    { value: sources.transcriptionConfidence, weight: CONFIDENCE_WEIGHTS.transcription },
    { value: sources.entityTypeConfidence, weight: CONFIDENCE_WEIGHTS.entityType },
    { value: sources.patternMatchConfidence, weight: CONFIDENCE_WEIGHTS.patternMatch },
    { value: sources.userHistoryConfidence, weight: CONFIDENCE_WEIGHTS.userHistory },
    { value: sources.temporalContextConfidence, weight: CONFIDENCE_WEIGHTS.temporalContext }
  ];

  // Weighted average
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = components.reduce((sum, c) => sum + (c.value * c.weight), 0);

  return weightedSum / totalWeight;
}

// Special handling for per-attribute confidence
function calculateAttributeConfidence(
  attributes: Record<string, unknown>,
  confidences: Record<string, number>
): { overall: number; missingCritical: boolean; lowConfidenceAttributes: string[] } {
  const criticalAttributes = ['title', 'entityType', 'startAt'];
  const lowThreshold = 0.50;

  const lowConfidenceAttributes: string[] = [];
  let missingCritical = false;

  for (const [attr, conf] of Object.entries(confidences)) {
    if (conf < lowThreshold) {
      lowConfidenceAttributes.push(attr);
      if (criticalAttributes.includes(attr)) {
        missingCritical = true;
      }
    }
  }

  // If any critical attribute is low confidence, cap overall at 0.60
  const values = Object.values(confidences);
  let overall = values.reduce((a, b) => a + b, 0) / values.length;

  if (missingCritical) {
    overall = Math.min(overall, 0.60);
  }

  return { overall, missingCritical, lowConfidenceAttributes };
}
```

### 5.2.3 Confidence-Based Routing Matrix

The confidence routing matrix determines system behavior based on calculated confidence.

```typescript
interface RoutingDecision {
  action: 'auto_create' | 'suggest_confirm' | 'clarify' | 'reject' | 'defer';
  uiComponent: string;
  userPrompt?: string;
  options?: ClarificationOption[];
  timeoutBehavior: 'create_draft' | 'discard' | 'remind';
  gamificationImpact: {
    xpAwarded: boolean;
    streakMaintained: boolean;
    xpPending: boolean;
  };
}

const ROUTING_BEHAVIORS: Record<string, RoutingDecision> = {
  auto_create: {
    action: 'auto_create',
    uiComponent: 'SuccessToast',
    timeoutBehavior: 'create_draft',
    gamificationImpact: {
      xpAwarded: true,
      streakMaintained: true,
      xpPending: false
    }
  },

  suggest_confirm: {
    action: 'suggest_confirm',
    uiComponent: 'ConfirmationCard',
    userPrompt: 'Looks like you logged {entityType}. Quick confirm?',
    timeoutBehavior: 'create_draft',
    gamificationImpact: {
      xpAwarded: false,        // Pending confirmation
      streakMaintained: true,  // Intent counts
      xpPending: true
    }
  },

  clarify_entity_type: {
    action: 'clarify',
    uiComponent: 'DisambiguationSheet',
    userPrompt: 'Quick question',
    timeoutBehavior: 'create_draft',
    gamificationImpact: {
      xpAwarded: false,
      streakMaintained: true,
      xpPending: true
    }
  },

  clarify_temporal: {
    action: 'clarify',
    uiComponent: 'TemporalClarification',
    userPrompt: 'When did this happen?',
    timeoutBehavior: 'create_draft',
    gamificationImpact: {
      xpAwarded: false,
      streakMaintained: true,
      xpPending: true
    }
  },

  reject_offer_alternatives: {
    action: 'reject',
    uiComponent: 'AlternativesSheet',
    userPrompt: "I couldn't quite understand. Want to try again?",
    options: [
      { label: 'Try voice again', action: 'retry_voice' },
      { label: 'Type instead', action: 'switch_text' },
      { label: 'Quick-log', action: 'quick_log' },
      { label: 'Save as note', action: 'save_note' }
    ],
    timeoutBehavior: 'remind',
    gamificationImpact: {
      xpAwarded: false,
      streakMaintained: true,  // Attempt counts
      xpPending: false
    }
  }
};

function determineRouting(
  confidence: ConfidenceCalculation,
  ambiguities: AmbiguityDetectionResult['ambiguities'],
  persona: PersonaType
): RoutingDecision {
  // Special case: incomplete thought always routes to continue
  if (ambiguities.some(a => a.type === 'incomplete_thought' && a.continueCapture)) {
    return {
      action: 'defer',
      uiComponent: 'ContinuationSheet',
      userPrompt: 'Want to add more?',
      timeoutBehavior: 'create_draft',
      gamificationImpact: {
        xpAwarded: false,
        streakMaintained: true,
        xpPending: true
      }
    };
  }

  // Route based on confidence threshold
  switch (confidence.threshold) {
    case 'auto_create':
      return ROUTING_BEHAVIORS.auto_create;

    case 'suggest_confirm':
      return ROUTING_BEHAVIORS.suggest_confirm;

    case 'require_clarify':
      // Determine which clarification is needed
      if (ambiguities.some(a => a.type === 'temporal')) {
        return ROUTING_BEHAVIORS.clarify_temporal;
      }
      if (ambiguities.some(a => a.type === 'entity_type')) {
        return ROUTING_BEHAVIORS.clarify_entity_type;
      }
      return ROUTING_BEHAVIORS.suggest_confirm;

    case 'reject':
      return ROUTING_BEHAVIORS.reject_offer_alternatives;

    default:
      return ROUTING_BEHAVIORS.suggest_confirm;
  }
}
```

---

## 5.3 Clarification Flow Design

### 5.3.1 Clarification Flow Architecture

When disambiguation is required, the system initiates a clarification flow. These flows are designed to minimize cognitive load while quickly resolving ambiguity.

```typescript
interface ClarificationFlow {
  id: string;
  captureId: string;
  flowType: 'entity_type' | 'temporal' | 'attribute' | 'multi_choice';
  question: PersonalizedQuestion;
  options: ClarificationOption[];
  defaultOption?: number;
  timeout: {
    duration: number;
    behavior: 'accept_default' | 'save_draft' | 'discard';
  };
  userResponded: boolean;
  resolution?: ClarificationResolution;
  startedAt: number;
  completedAt?: number;
}

interface PersonalizedQuestion {
  text: string;
  persona: PersonaType;
  // Different question phrasing per persona
  variants: Record<PersonaType, string>;
}

interface ClarificationOption {
  id: string;
  label: string;
  description?: string;
  entityType?: EntityType;
  temporalContext?: 'past' | 'present' | 'future';
  confidence: number;
  isRecommended: boolean;
}

const QUESTION_TEMPLATES: Record<string, PersonalizedQuestion> = {
  entity_type: {
    text: 'What type of entry is this?',
    persona: 'optimizer',
    variants: {
      optimizer: 'Classification: {input}. Confidence: {confidence}%. Select type:',
      dabbler: 'Is this a {topType}? Tap to confirm or change.',
      privacyFirst: 'Entry type unclear. Select:',
      neurodivergent: "Just checking—did you mean to log this as a {topType}? No pressure!",
      biohacker: 'Entity: {topType} | Conf: {confidence}% | Override?',
      reflector: "I'd like to save this as a {topType}. Does that feel right?"
    }
  },

  temporal: {
    text: 'When did this happen?',
    persona: 'optimizer',
    variants: {
      optimizer: 'Temporal context unclear for "{input}". Select timing:',
      dabbler: 'Did this already happen, or is it something to do?',
      privacyFirst: 'When:',
      neurodivergent: 'Quick check—was this something you did, or something to remember to do?',
      biohacker: 'Timestamp ambiguity. Select: Past | Future | Now',
      reflector: 'Was this a moment you experienced, or something you want to do?'
    }
  },

  attribute_missing: {
    text: 'Missing some details',
    persona: 'optimizer',
    variants: {
      optimizer: 'Incomplete data. Missing: {missingFields}. Add now or save partial?',
      dabbler: 'Want to add any details? (optional)',
      privacyFirst: 'Additional details (optional):',
      neurodivergent: 'Captured the main thing! Add more if you want, or save as-is.',
      biohacker: 'Data gaps: {missingFields}. Complete for better correlations.',
      reflector: "Is there more you'd like to add to this entry?"
    }
  }
};
```

### 5.3.2 Entity Type Clarification

Entity type clarification is the most common disambiguation flow. It presents users with the top interpretations and allows quick selection.

```typescript
// File: apps/insight-mobile/src/components/DisambiguationSheet.tsx
interface DisambiguationSheetProps {
  input: string;
  options: ClarificationOption[];
  persona: PersonaType;
  onSelect: (option: ClarificationOption) => void;
  onCancel: () => void;
  onManualEntry: () => void;
}

function DisambiguationSheet({ input, options, persona, onSelect, onCancel, onManualEntry }: DisambiguationSheetProps) {
  const question = QUESTION_TEMPLATES.entity_type.variants[persona];
  const formattedQuestion = formatQuestion(question, {
    input: truncate(input, 50),
    topType: options[0]?.entityType ?? 'entry',
    confidence: Math.round((options[0]?.confidence ?? 0) * 100)
  });

  return (
    <Sheet>
      <Header>{formattedQuestion}</Header>
      <Quote>"{truncate(input, 100)}"</Quote>

      <OptionsList>
        {options.slice(0, 3).map((option, index) => (
          <OptionButton
            key={option.id}
            onPress={() => onSelect(option)}
            primary={index === 0}
            icon={getEntityIcon(option.entityType)}
          >
            <OptionLabel>{option.label}</OptionLabel>
            {option.description && (
              <OptionDescription>{option.description}</OptionDescription>
            )}
            {option.isRecommended && (
              <RecommendedBadge>Recommended</RecommendedBadge>
            )}
          </OptionButton>
        ))}
      </OptionsList>

      <SecondaryActions>
        <TextButton onPress={onManualEntry}>
          Enter details manually
        </TextButton>
        <TextButton onPress={onCancel} subtle>
          Cancel
        </TextButton>
      </SecondaryActions>
    </Sheet>
  );
}

// Option generation logic
function generateEntityTypeOptions(
  ambiguity: EntityTypeAmbiguity,
  userContext: UserContext
): ClarificationOption[] {
  return ambiguity.possibleTypes.slice(0, 3).map((type, index) => ({
    id: `option-${index}`,
    label: formatEntityTypeLabel(type.entityType),
    description: generateTypeDescription(type.entityType, ambiguity.inputText),
    entityType: type.entityType,
    confidence: type.confidence,
    isRecommended: index === 0 && type.confidence > 0.50
  }));
}

function formatEntityTypeLabel(type: EntityType): string {
  const labels: Record<EntityType, string> = {
    habit: 'Habit completion',
    event: 'Event that happened',
    task: 'Task to do later',
    tracker: 'Track a metric',
    note: 'Save as note',
    routine: 'Routine step'
  };
  return labels[type] ?? 'Entry';
}

function generateTypeDescription(type: EntityType, input: string): string {
  switch (type) {
    case 'habit':
      return 'Log this as a completed habit';
    case 'event':
      return 'Record this as something that happened';
    case 'task':
      return 'Add this to your task list';
    case 'tracker':
      return 'Log the numeric value as a tracker';
    case 'note':
      return 'Save the full text as a note';
    default:
      return '';
  }
}
```

### 5.3.3 Temporal Clarification

Temporal clarification resolves when an event occurred or should occur.

```typescript
// File: apps/insight-mobile/src/components/TemporalClarification.tsx
interface TemporalClarificationProps {
  input: string;
  persona: PersonaType;
  suggestedTiming?: 'past' | 'future' | 'now';
  onSelectTiming: (timing: TemporalSelection) => void;
  onCancel: () => void;
}

interface TemporalSelection {
  context: 'past' | 'present' | 'future';
  specificTime?: Date;
  relativeExpression?: string;
}

function TemporalClarification({ input, persona, suggestedTiming, onSelectTiming, onCancel }: TemporalClarificationProps) {
  const question = QUESTION_TEMPLATES.temporal.variants[persona];

  const options = [
    {
      id: 'past',
      label: 'Already happened',
      icon: 'checkmark-circle',
      context: 'past' as const,
      description: 'Log this as something you did'
    },
    {
      id: 'future',
      label: 'To do later',
      icon: 'calendar-outline',
      context: 'future' as const,
      description: 'Add this to your task list'
    },
    {
      id: 'now',
      label: 'Happening now',
      icon: 'radio-button-on',
      context: 'present' as const,
      description: 'Log this current activity'
    }
  ];

  return (
    <Sheet>
      <Header>{question}</Header>
      <Quote>"{truncate(input, 80)}"</Quote>

      <TemporalButtons>
        {options.map(option => (
          <TemporalButton
            key={option.id}
            onPress={() => onSelectTiming({ context: option.context })}
            recommended={option.context === suggestedTiming}
          >
            <Icon name={option.icon} />
            <ButtonLabel>{option.label}</ButtonLabel>
            <ButtonDescription>{option.description}</ButtonDescription>
          </TemporalButton>
        ))}
      </TemporalButtons>

      <AdvancedOptions>
        <DateTimePicker
          label="Or pick a specific time"
          onSelect={(date) => onSelectTiming({
            context: date > new Date() ? 'future' : 'past',
            specificTime: date
          })}
        />
      </AdvancedOptions>

      <CancelButton onPress={onCancel}>Cancel</CancelButton>
    </Sheet>
  );
}
```

### 5.3.4 Inline Confirmation Pattern

For high-confidence suggestions, use inline confirmation rather than modal sheets to minimize disruption.

```typescript
// File: apps/insight-mobile/src/components/InlineConfirmation.tsx
interface InlineConfirmationProps {
  entity: ParsedEntity;
  confidence: number;
  persona: PersonaType;
  onConfirm: () => void;
  onEdit: () => void;
  onReject: () => void;
}

function InlineConfirmation({ entity, confidence, persona, onConfirm, onEdit, onReject }: InlineConfirmationProps) {
  // Auto-confirm after timeout for Dabbler
  useEffect(() => {
    if (persona === 'dabbler' && confidence >= 0.70) {
      const timer = setTimeout(onConfirm, 5000);
      return () => clearTimeout(timer);
    }
  }, [persona, confidence, onConfirm]);

  return (
    <ConfirmationCard>
      <EntityPreview entity={entity} />

      <ConfidenceIndicator
        value={confidence}
        showNumeric={persona === 'optimizer' || persona === 'biohacker'}
      />

      <ActionRow>
        <ConfirmButton onPress={onConfirm} primary>
          {getConfirmLabel(persona)}
        </ConfirmButton>
        <EditButton onPress={onEdit}>
          Edit
        </EditButton>
        <RejectButton onPress={onReject} subtle>
          Not this
        </RejectButton>
      </ActionRow>
    </ConfirmationCard>
  );
}

function getConfirmLabel(persona: PersonaType): string {
  switch (persona) {
    case 'optimizer':
      return 'Confirm';
    case 'dabbler':
      return 'Looks good';
    case 'neurodivergent':
      return 'Yep, that\'s it';
    case 'reflector':
      return 'Save this';
    default:
      return 'Confirm';
  }
}
```

### 5.3.5 Clarification Timeout Handling

When users don't respond to clarifications, the system must handle gracefully.

```typescript
interface ClarificationTimeout {
  flowId: string;
  duration: number;       // Milliseconds
  behavior: 'accept_default' | 'save_draft' | 'remind' | 'discard';
  defaultOption?: string;
  reminderDelay?: number;
}

const TIMEOUT_CONFIGS: Record<PersonaType, ClarificationTimeout> = {
  optimizer: {
    flowId: '',
    duration: 30000,        // 30 seconds
    behavior: 'save_draft', // Optimizer wants to review
    reminderDelay: 3600000  // 1 hour
  },
  dabbler: {
    flowId: '',
    duration: 10000,        // 10 seconds
    behavior: 'accept_default', // Just save it
    defaultOption: 'recommended'
  },
  privacyFirst: {
    flowId: '',
    duration: 30000,
    behavior: 'save_draft',
    reminderDelay: 86400000 // 24 hours
  },
  neurodivergent: {
    flowId: '',
    duration: 60000,        // 60 seconds (more time)
    behavior: 'save_draft',
    reminderDelay: 7200000  // 2 hours (gentle reminder)
  },
  biohacker: {
    flowId: '',
    duration: 20000,
    behavior: 'remind',     // Biohacker wants to complete data
    reminderDelay: 1800000  // 30 minutes
  },
  reflector: {
    flowId: '',
    duration: 45000,        // 45 seconds
    behavior: 'save_draft',
    reminderDelay: 43200000 // 12 hours
  }
};

async function handleClarificationTimeout(
  flow: ClarificationFlow,
  persona: PersonaType,
  capturedContent: string
): Promise<TimeoutResult> {
  const config = TIMEOUT_CONFIGS[persona];

  switch (config.behavior) {
    case 'accept_default':
      if (flow.defaultOption !== undefined) {
        const defaultOpt = flow.options[flow.defaultOption];
        return await createEntityFromOption(capturedContent, defaultOpt);
      }
      // Fall through to save_draft

    case 'save_draft':
      return await saveDraftEntry({
        content: capturedContent,
        pendingClarification: flow,
        status: 'awaiting_review',
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      });

    case 'remind':
      await scheduleClarificationReminder(flow, config.reminderDelay!);
      return await saveDraftEntry({
        content: capturedContent,
        pendingClarification: flow,
        status: 'reminder_scheduled'
      });

    case 'discard':
      // Only discard if explicitly configured (rare)
      return { status: 'discarded', preserved: false };
  }
}
```

---

## 5.4 Fallback Strategies

### 5.4.1 Fallback Hierarchy

When primary parsing fails, the system follows a structured fallback hierarchy to preserve user input and provide alternatives.

```typescript
interface FallbackStrategy {
  level: number;
  name: string;
  trigger: string;
  action: string;
  preservesInput: boolean;
  requiresUserAction: boolean;
}

const FALLBACK_HIERARCHY: FallbackStrategy[] = [
  {
    level: 1,
    name: 'Model Upgrade',
    trigger: 'confidence < 0.60 with gpt-4o-mini',
    action: 'Retry with gpt-4o',
    preservesInput: true,
    requiresUserAction: false
  },
  {
    level: 2,
    name: 'Enhanced Processing',
    trigger: 'Audio quality degraded',
    action: 'Apply noise cancellation, retry transcription',
    preservesInput: true,
    requiresUserAction: false
  },
  {
    level: 3,
    name: 'Clarification Flow',
    trigger: 'confidence 0.40-0.60',
    action: 'Present disambiguation options',
    preservesInput: true,
    requiresUserAction: true
  },
  {
    level: 4,
    name: 'Text Input Fallback',
    trigger: 'Voice transcription failed',
    action: 'Offer text input with partial transcript',
    preservesInput: true,
    requiresUserAction: true
  },
  {
    level: 5,
    name: 'Quick-Log Fallback',
    trigger: 'Parsing too complex',
    action: 'Offer simplified one-tap logging',
    preservesInput: false,
    requiresUserAction: true
  },
  {
    level: 6,
    name: 'Save As Note',
    trigger: 'Cannot parse as structured entity',
    action: 'Save raw content as unstructured note',
    preservesInput: true,
    requiresUserAction: false
  },
  {
    level: 7,
    name: 'Draft Preservation',
    trigger: 'All parsing attempts failed',
    action: 'Save as draft with audio/text for later',
    preservesInput: true,
    requiresUserAction: false
  }
];

async function executeFallbackChain(
  input: ParseInput,
  initialResult: ParseResult,
  persona: PersonaType
): Promise<FallbackResult> {
  let currentResult = initialResult;
  let fallbackLevel = 0;

  for (const strategy of FALLBACK_HIERARCHY) {
    if (shouldTriggerFallback(currentResult, strategy)) {
      fallbackLevel = strategy.level;

      // Log fallback for analytics
      await logFallbackEvent(input.captureId, strategy.name, currentResult.confidence);

      // Execute fallback action
      switch (strategy.name) {
        case 'Model Upgrade':
          currentResult = await retryWithUpgradedModel(input, 'gpt-4o');
          break;

        case 'Enhanced Processing':
          const enhancedAudio = await applyNoiseReduction(input.audio);
          const newTranscript = await transcribe(enhancedAudio);
          currentResult = await parseTranscript(newTranscript, input.context);
          break;

        case 'Clarification Flow':
          return {
            status: 'requires_clarification',
            fallbackLevel,
            partialResult: currentResult,
            clarificationFlow: generateClarificationFlow(currentResult, persona)
          };

        case 'Text Input Fallback':
          return {
            status: 'requires_text_input',
            fallbackLevel,
            partialTranscript: currentResult.transcript,
            suggestedText: cleanTranscriptForEdit(currentResult.transcript)
          };

        case 'Quick-Log Fallback':
          return {
            status: 'requires_quick_log',
            fallbackLevel,
            quickLogOptions: generateQuickLogOptions(input.context, persona)
          };

        case 'Save As Note':
          return {
            status: 'saved_as_note',
            fallbackLevel,
            noteEntity: await createNoteFromRawInput(input)
          };

        case 'Draft Preservation':
          return {
            status: 'saved_as_draft',
            fallbackLevel,
            draft: await saveDraftWithPreservation(input)
          };
      }

      // Check if fallback improved the result
      if (currentResult.confidence >= CONFIDENCE_CONFIG.SUGGEST_CONFIRM) {
        return {
          status: 'success_after_fallback',
          fallbackLevel,
          result: currentResult
        };
      }
    }
  }

  // Should never reach here - draft preservation is final fallback
  return {
    status: 'saved_as_draft',
    fallbackLevel: 7,
    draft: await saveDraftWithPreservation(input)
  };
}
```

### 5.4.2 Model Upgrade Fallback

When the fast model (gpt-4o-mini) returns low-confidence results, upgrade to the more capable model.

```typescript
interface ModelUpgradeResult {
  upgraded: boolean;
  previousModel: string;
  currentModel: string;
  previousConfidence: number;
  currentConfidence: number;
  improvementPercent: number;
}

async function retryWithUpgradedModel(
  input: ParseInput,
  targetModel: string
): Promise<ParseResult> {
  const upgradedResult = await classifyWithLLM({
    ...input,
    model: targetModel,
    temperature: 0.1,
    // Include disambiguation guidance in upgraded prompt
    systemPrompt: CLASSIFICATION_SYSTEM_PROMPT + DISAMBIGUATION_GUIDANCE
  });

  return upgradedResult;
}

const DISAMBIGUATION_GUIDANCE = `
When classification is ambiguous, provide structured uncertainty:

1. List ALL plausible entity types with confidence scores
2. Explain reasoning for each interpretation
3. Identify the specific ambiguity source (temporal, entity type, reference)
4. Suggest the minimal clarification needed to resolve

Example response for ambiguous input:
{
  "entities": [
    {
      "type": "event",
      "confidence": 0.45,
      "interpretation": "Past meeting that already occurred",
      "reasoning": "\"Meeting with Sarah\" commonly refers to completed events"
    },
    {
      "type": "task",
      "confidence": 0.40,
      "interpretation": "Future meeting to schedule",
      "reasoning": "No past-tense markers present"
    }
  ],
  "ambiguity": {
    "type": "temporal",
    "resolution_question": "Did this meeting already happen, or should I add it to your tasks?"
  }
}
`;
```

### 5.4.3 Text Input Fallback

When voice input fails, offer text input with the partial transcript pre-populated.

```typescript
// File: apps/insight-mobile/src/components/TextInputFallback.tsx
interface TextInputFallbackProps {
  partialTranscript: string;
  failureReason: string;
  persona: PersonaType;
  onSubmit: (text: string) => void;
  onRetryVoice: () => void;
  onCancel: () => void;
}

function TextInputFallback({
  partialTranscript,
  failureReason,
  persona,
  onSubmit,
  onRetryVoice,
  onCancel
}: TextInputFallbackProps) {
  const [text, setText] = useState(cleanTranscriptForEdit(partialTranscript));

  const message = getPersonaMessage(persona, failureReason);

  return (
    <FallbackContainer>
      <Message>{message}</Message>

      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        autoFocus
        placeholder="Type or edit your entry..."
        style={styles.input}
      />

      <ActionRow>
        <SubmitButton onPress={() => onSubmit(text)} primary>
          Save
        </SubmitButton>
        <RetryButton onPress={onRetryVoice}>
          <MicIcon /> Try voice again
        </RetryButton>
        <CancelButton onPress={onCancel} subtle>
          Cancel
        </CancelButton>
      </ActionRow>
    </FallbackContainer>
  );
}

function getPersonaMessage(persona: PersonaType, reason: string): string {
  const messages: Record<PersonaType, string> = {
    optimizer: `Transcription failed (${reason}). Edit or re-record.`,
    dabbler: "Couldn't hear that clearly. Mind typing it?",
    privacyFirst: 'Voice processing unavailable. Text input ready.',
    neurodivergent: "Having trouble with the audio—no worries! Here's what I caught. Fix it up if you want.",
    biohacker: `Audio quality: poor (${reason}). Recommend text input for accuracy.`,
    reflector: "I didn't catch everything. Would you like to type your thought?"
  };
  return messages[persona];
}

function cleanTranscriptForEdit(transcript: string): string {
  return transcript
    .replace(/\[inaudible\]/gi, '___')
    .replace(/\[unclear\]/gi, '___')
    .replace(/\[garbled\]/gi, '___')
    .replace(/\s+/g, ' ')
    .trim();
}
```

### 5.4.4 Quick-Log Fallback

For complex parsing failures, offer simplified quick-log options based on user history.

```typescript
interface QuickLogOption {
  id: string;
  label: string;
  icon: string;
  entityType: EntityType;
  template: Partial<Entity>;
  frequency: number;  // Times used
}

async function generateQuickLogOptions(
  context: ParseContext,
  persona: PersonaType
): Promise<QuickLogOption[]> {
  // Get user's most common entries
  const recentEntries = await getRecentEntries(context.userId, 30);
  const commonPatterns = analyzeEntryPatterns(recentEntries);

  // Generate quick options based on time of day and history
  const timeOfDay = getTimeOfDay(new Date());
  const options: QuickLogOption[] = [];

  // Morning options
  if (timeOfDay === 'morning') {
    if (commonPatterns.morningRoutine) {
      options.push({
        id: 'morning-routine',
        label: 'Morning routine done',
        icon: 'sun',
        entityType: 'routine',
        template: { title: 'Morning Routine', routineId: commonPatterns.morningRoutine.id },
        frequency: commonPatterns.morningRoutine.frequency
      });
    }
    if (commonPatterns.supplements?.morning) {
      options.push({
        id: 'morning-supplements',
        label: 'Morning supplements',
        icon: 'pill',
        entityType: 'nutrition',
        template: { title: 'Morning Stack', items: commonPatterns.supplements.morning },
        frequency: commonPatterns.supplements.frequency
      });
    }
  }

  // Generic fallbacks
  options.push({
    id: 'quick-mood',
    label: 'Quick mood check',
    icon: 'smile',
    entityType: 'tracker',
    template: { trackerKey: 'mood' },
    frequency: 0
  });

  options.push({
    id: 'quick-note',
    label: 'Save as note',
    icon: 'document-text',
    entityType: 'note',
    template: {},
    frequency: 0
  });

  return options.slice(0, 4);  // Max 4 options
}
```

### 5.4.5 Note Preservation Fallback

When structured parsing fails entirely, save the raw content as a note to preserve user input.

```typescript
async function createNoteFromRawInput(input: ParseInput): Promise<NoteEntity> {
  const note: NoteEntity = {
    id: generateId(),
    entityType: 'note',
    kind: 'note',
    title: generateNoteTitle(input.transcript),
    bodyMarkdown: input.transcript,
    rawTranscript: input.transcript,
    source: 'voice_fallback',
    audioUri: input.audioUri,
    captureContext: {
      originalIntent: input.userHint,
      failureReason: 'parsing_failed',
      audioQuality: input.audioQuality,
      attemptedTypes: input.attemptedEntityTypes
    },
    createdAt: Date.now(),
    status: 'published'
  };

  await saveEntity(note);

  // Notify user with persona-appropriate message
  await showNotification({
    type: 'fallback_saved',
    message: getFallbackMessage(input.persona),
    entityId: note.id
  });

  return note;
}

function generateNoteTitle(transcript: string): string {
  // Extract first meaningful phrase as title
  const words = transcript.split(/\s+/).slice(0, 6);
  let title = words.join(' ');

  if (title.length > 40) {
    title = title.substring(0, 37) + '...';
  }

  return title || 'Voice Note';
}

function getFallbackMessage(persona: PersonaType): string {
  const messages: Record<PersonaType, string> = {
    optimizer: 'Saved as note. Reclassify from entry details.',
    dabbler: 'Saved! You can organize it later if you want.',
    privacyFirst: 'Entry saved locally as note.',
    neurodivergent: 'Got it! Saved as a note for now—no pressure to categorize.',
    biohacker: 'Classification failed. Saved as note for manual tagging.',
    reflector: 'Your thought is preserved. Review when ready.'
  };
  return messages[persona];
}
```

---

## 5.5 Recovery and Resolution Patterns

### 5.5.1 Post-Clarification Resolution

After users respond to clarification prompts, the system must complete entity creation and update internal models.

```typescript
interface ClarificationResolution {
  flowId: string;
  selectedOption: ClarificationOption;
  responseTimeMs: number;
  userModified: boolean;
  modifications?: Record<string, unknown>;
}

async function resolveClariflcation(
  resolution: ClarificationResolution,
  originalInput: ParseInput,
  persona: PersonaType
): Promise<ResolutionResult> {
  const selectedOption = resolution.selectedOption;

  // Create entity based on selection
  const entity = await createEntityFromOption(
    originalInput.transcript,
    selectedOption,
    resolution.modifications
  );

  // Award XP (was pending)
  const xp = calculateXPForEntity(entity, persona);
  await awardXP(originalInput.userId, xp, entity.id);

  // Update classification model (learn from resolution)
  await updateClassificationModel({
    input: originalInput.transcript,
    selectedType: selectedOption.entityType,
    confidence: selectedOption.confidence,
    userConfirmed: true,
    responseTime: resolution.responseTimeMs
  });

  // Log for analytics
  await logResolution({
    flowId: resolution.flowId,
    inputText: originalInput.transcript,
    originalConfidences: originalInput.classifications,
    selectedType: selectedOption.entityType,
    wasRecommended: selectedOption.isRecommended,
    responseTimeMs: resolution.responseTimeMs
  });

  return {
    success: true,
    entity,
    xpAwarded: xp.total,
    streakUpdated: true
  };
}
```

### 5.5.2 User Correction Handling

When users edit or correct system interpretations, the system must update gracefully and learn from corrections.

```typescript
interface UserCorrection {
  entityId: string;
  correctionType: 'entity_type_change' | 'attribute_edit' | 'merge' | 'split' | 'delete';
  originalValue: unknown;
  correctedValue: unknown;
  timestamp: number;
}

async function handleUserCorrection(
  correction: UserCorrection,
  userId: string
): Promise<CorrectionResult> {
  // Fetch original entity
  const entity = await getEntity(correction.entityId);

  switch (correction.correctionType) {
    case 'entity_type_change':
      // User changed the entity type entirely
      return await handleTypeChange(entity, correction.correctedValue as EntityType);

    case 'attribute_edit':
      // User modified specific attributes
      return await handleAttributeEdit(entity, correction);

    case 'merge':
      // User merged this entity with another
      return await handleMerge(entity, correction.correctedValue as string);

    case 'split':
      // User split this entity into multiple
      return await handleSplit(entity, correction.correctedValue as SplitConfig);

    case 'delete':
      // User rejected the entity entirely
      return await handleDeletion(entity);
  }
}

async function handleTypeChange(
  entity: Entity,
  newType: EntityType
): Promise<CorrectionResult> {
  // Create new entity of correct type
  const newEntity = convertEntityType(entity, newType);

  // Archive old entity (don't delete for audit)
  await archiveEntity(entity.id, {
    reason: 'type_correction',
    replacedBy: newEntity.id
  });

  // Save new entity
  await saveEntity(newEntity);

  // Recalculate XP if applicable
  const xpDelta = recalculateXPForTypeChange(entity, newEntity);
  if (xpDelta !== 0) {
    await adjustXP(entity.userId, xpDelta, 'type_correction');
  }

  // Learn from correction
  await recordCorrectionForLearning({
    originalInput: entity.rawTranscript,
    originalType: entity.entityType,
    correctedType: newType,
    userId: entity.userId
  });

  return {
    success: true,
    newEntityId: newEntity.id,
    xpAdjustment: xpDelta
  };
}
```

### 5.5.3 Batch Correction and Review

Enable users to review and correct multiple pending items at once.

```typescript
interface BatchReviewItem {
  id: string;
  captureId: string;
  transcript: string;
  suggestedType: EntityType;
  confidence: number;
  status: 'pending' | 'confirmed' | 'corrected' | 'rejected';
  correction?: Partial<Entity>;
}

// File: apps/insight-mobile/src/screens/BatchReview.tsx
function BatchReviewScreen({ items }: { items: BatchReviewItem[] }) {
  const [reviewItems, setReviewItems] = useState(items);

  const handleConfirm = (id: string) => {
    setReviewItems(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'confirmed' } : item
    ));
  };

  const handleCorrect = (id: string, correction: Partial<Entity>) => {
    setReviewItems(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'corrected', correction } : item
    ));
  };

  const handleReject = (id: string) => {
    setReviewItems(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'rejected' } : item
    ));
  };

  const handleSubmitAll = async () => {
    const results = await batchProcessReviewItems(reviewItems);
    // Navigate to success screen
  };

  return (
    <Screen>
      <Header>
        <Title>Review {items.length} entries</Title>
        <Subtitle>Swipe right to confirm, left to reject, tap to edit</Subtitle>
      </Header>

      <SwipeableList>
        {reviewItems.map(item => (
          <SwipeableItem
            key={item.id}
            onSwipeRight={() => handleConfirm(item.id)}
            onSwipeLeft={() => handleReject(item.id)}
            onTap={() => openEditor(item.id)}
          >
            <ReviewCard item={item} />
          </SwipeableItem>
        ))}
      </SwipeableList>

      <Footer>
        <SubmitButton onPress={handleSubmitAll}>
          Confirm All ({reviewItems.filter(i => i.status !== 'rejected').length})
        </SubmitButton>
      </Footer>
    </Screen>
  );
}
```

### 5.5.4 Learning from Resolutions

The system improves over time by learning from user clarification responses and corrections.

```typescript
interface LearningSignal {
  inputPattern: string;
  context: ParseContext;
  originalPrediction: {
    entityType: EntityType;
    confidence: number;
  };
  userChoice: {
    entityType: EntityType;
    wasRecommended: boolean;
  };
  responseTimeMs: number;
  timestamp: number;
}

class ClarificationLearner {
  async recordSignal(signal: LearningSignal): Promise<void> {
    // Store for batch training
    await this.signalStore.append(signal);

    // Update real-time heuristics
    await this.updateHeuristics(signal);
  }

  private async updateHeuristics(signal: LearningSignal): Promise<void> {
    // Track user-specific patterns
    const userPatterns = await this.getUserPatterns(signal.context.userId);

    // If user consistently chooses differently than prediction, adjust
    if (!signal.userChoice.wasRecommended) {
      const pattern = extractPattern(signal.inputPattern);
      userPatterns.overrides[pattern] = {
        preferredType: signal.userChoice.entityType,
        count: (userPatterns.overrides[pattern]?.count ?? 0) + 1
      };

      // After 3 consistent overrides, boost confidence for this pattern
      if (userPatterns.overrides[pattern].count >= 3) {
        userPatterns.boostedPatterns.push({
          pattern,
          entityType: signal.userChoice.entityType,
          boost: 0.15
        });
      }

      await this.saveUserPatterns(signal.context.userId, userPatterns);
    }
  }

  async getPredictionBoost(
    input: string,
    userId: string
  ): Promise<Map<EntityType, number>> {
    const patterns = await this.getUserPatterns(userId);
    const boosts = new Map<EntityType, number>();

    for (const { pattern, entityType, boost } of patterns.boostedPatterns) {
      if (new RegExp(pattern, 'i').test(input)) {
        boosts.set(entityType, (boosts.get(entityType) ?? 0) + boost);
      }
    }

    return boosts;
  }
}
```

### 5.5.5 Recovery Flow Summary

The complete recovery flow ensures no user input is ever lost and users can always reach resolution.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RECOVERY FLOW ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   User Input                                                                 │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────┐                                                       │
│   │ Ambiguity       │──── No ambiguity ────► Auto-Create Entity             │
│   │ Detection       │                                                        │
│   └────────┬────────┘                                                        │
│            │ Has ambiguity                                                   │
│            ▼                                                                 │
│   ┌─────────────────┐                                                       │
│   │ Confidence      │                                                        │
│   │ Calculation     │                                                        │
│   └────────┬────────┘                                                        │
│            │                                                                 │
│   ┌────────┼────────┬──────────────┐                                        │
│   │        │        │              │                                        │
│   ▼        ▼        ▼              ▼                                        │
│ ≥0.85   0.60-0.85  0.40-0.60    <0.40                                       │
│   │        │        │              │                                        │
│   ▼        ▼        ▼              ▼                                        │
│ Auto    Suggest   Clarify      Fallback                                     │
│ Create  Confirm    Flow         Chain                                       │
│   │        │        │              │                                        │
│   │        │        │    ┌────────┴────────┐                               │
│   │        │        │    │                 │                               │
│   │        │        │    ▼                 ▼                               │
│   │        │        │  Text Input     Quick Log                            │
│   │        │        │  Fallback       Options                              │
│   │        │        │    │                 │                               │
│   │        │        │    │    ┌────────────┘                               │
│   │        │        │    │    │                                            │
│   │        │        │    ▼    ▼                                            │
│   │        │        │  ┌────────────┐                                       │
│   │        │        │  │ Save as    │                                       │
│   │        │        │  │ Note/Draft │                                       │
│   │        │        │  └─────┬──────┘                                       │
│   │        │        │        │                                              │
│   └────────┴────────┴────────┴─────────────────────────────────────────►   │
│                                                                  │          │
│                                                                  ▼          │
│                                                           Entity Created    │
│                                                           or Preserved      │
│                                                                              │
│   ════════════════════════════════════════════════════════════════════      │
│   PRINCIPLE: No user input is ever lost. Every path leads to preservation.  │
│   ════════════════════════════════════════════════════════════════════      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5.6 Persona-Specific Handling Patterns

### 5.6.1 Optimizer (Alex) Patterns

The Optimizer persona demands precision and transparency. When ambiguity occurs, Alex wants to understand exactly what went wrong and have full control over resolution.

```typescript
interface OptimizerClarificationConfig {
  showConfidenceScores: true;
  showReasoning: true;
  allowManualOverride: true;
  timeoutBehavior: 'save_draft';  // Never auto-accept
  defaultView: 'detailed';
  metricsVisible: true;
}

const OPTIMIZER_MESSAGING = {
  entityTypeAmbiguity: 'Classification: "{input}" | Top match: {topType} ({confidence}%). Select correct type:',
  temporalAmbiguity: 'Temporal context unclear. Detected signals: {signals}. Confirm timing:',
  lowConfidence: 'Transcription confidence: {confidence}% (threshold: 85%). Options:',
  fallbackTriggered: 'Parsing failed at stage: {stage}. Fallback: {fallback}. Edit or accept:',
  correctionLearned: 'Pattern learned. Future inputs matching "{pattern}" will default to {type}.'
};

// Optimizer-specific UI adaptations
function renderOptimizerClarification(flow: ClarificationFlow): JSX.Element {
  return (
    <ClarificationSheet>
      <DebugPanel collapsed>
        <MetricRow label="Confidence" value={flow.confidence} />
        <MetricRow label="Model" value={flow.modelUsed} />
        <MetricRow label="Latency" value={`${flow.latencyMs}ms`} />
        <MetricRow label="Token Usage" value={flow.tokensUsed} />
      </DebugPanel>

      <Question>{flow.question}</Question>

      <OptionsList detailed>
        {flow.options.map(opt => (
          <DetailedOption key={opt.id}>
            <OptionLabel>{opt.label}</OptionLabel>
            <OptionConfidence>{Math.round(opt.confidence * 100)}%</OptionConfidence>
            <OptionReasoning>{opt.reasoning}</OptionReasoning>
          </DetailedOption>
        ))}
      </OptionsList>

      <ManualOverrideButton onPress={openManualEntry}>
        Enter manually
      </ManualOverrideButton>
    </ClarificationSheet>
  );
}
```

### 5.6.2 Dabbler (Jordan) Patterns

The Dabbler prioritizes low friction above all. Clarification should be quick, forgiving, and never feel like a burden.

```typescript
interface DabblerClarificationConfig {
  showConfidenceScores: false;
  showReasoning: false;
  allowManualOverride: true;  // But not prominent
  timeoutBehavior: 'accept_default';  // Auto-accept after timeout
  defaultView: 'minimal';
  metricsVisible: false;
  autoAcceptThreshold: 0.65;  // Lower than standard
}

const DABBLER_MESSAGING = {
  entityTypeAmbiguity: 'Is this a {topType}? Tap to confirm or change.',
  temporalAmbiguity: 'Did this already happen, or is it something to do?',
  lowConfidence: "Couldn't hear that clearly. Mind trying again?",
  fallbackTriggered: 'Saved! You can fix it later if needed.',
  correctionLearned: null  // Don't show learning feedback
};

// Dabbler-specific: Auto-confirm after short timeout
function DabblerClarificationWithTimeout({ flow, onConfirm, onCancel }: Props) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onConfirm(flow.options[0]);  // Auto-accept recommended
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [flow, onConfirm]);

  return (
    <SimpleClarification>
      <QuickQuestion>{flow.question}</QuickQuestion>

      <BigOption
        onPress={() => onConfirm(flow.options[0])}
        highlighted
      >
        <OptionLabel>Yes, {flow.options[0].label}</OptionLabel>
        <AutoAcceptIndicator>Auto-saving in {countdown}s</AutoAcceptIndicator>
      </BigOption>

      <SmallOptions>
        {flow.options.slice(1).map(opt => (
          <SmallOption key={opt.id} onPress={() => onConfirm(opt)}>
            {opt.label}
          </SmallOption>
        ))}
      </SmallOptions>

      <CancelLink onPress={onCancel}>Cancel</CancelLink>
    </SimpleClarification>
  );
}
```

### 5.6.3 Neurodivergent (Riley) Patterns

The Neurodivergent persona needs extra patience, no shame messaging, and accommodations for stream-of-consciousness input.

```typescript
interface NeurodivergentClarificationConfig {
  showConfidenceScores: false;
  showReasoning: false;
  allowManualOverride: true;
  timeoutBehavior: 'save_draft';  // Never pressure
  defaultView: 'gentle';
  metricsVisible: false;
  extendedTimeout: 60000;  // 60 seconds (vs 30 standard)
  noTimePressure: true;
  celebrateAttempts: true;
}

const NEURODIVERGENT_MESSAGING = {
  entityTypeAmbiguity: "Just checking—did you mean to log this as a {topType}? No pressure to change it!",
  temporalAmbiguity: 'Quick check—was this something you did, or something to remember to do?',
  lowConfidence: "Having trouble with the audio—no worries! Here's what I caught.",
  fallbackTriggered: 'Got it! Saved as a note for now—no pressure to categorize.',
  correctionLearned: null,  // Don't add cognitive load
  incompleteThought: "Captured! Add more whenever you're ready, or leave it as is.",
  streamOfConsciousness: "Your thought is saved exactly as you said it."
};

// Neurodivergent-specific: Preserve stream-of-consciousness
async function processNeurodivergentInput(
  transcript: string,
  context: ParseContext
): Promise<ParseResult> {
  // Don't aggressively clean up or restructure
  // Preserve the natural flow of thought

  const result = await standardParse(transcript, context);

  // If low confidence, default to note rather than forcing classification
  if (result.confidence < 0.60) {
    return {
      ...result,
      suggestedType: 'note',
      preserveOriginalText: true,
      skipStructuredExtraction: true,
      message: NEURODIVERGENT_MESSAGING.streamOfConsciousness
    };
  }

  return result;
}

// Gentle clarification with no countdown or pressure
function NeurodivergentClarification({ flow, onConfirm, onCancel }: Props) {
  return (
    <GentleClarification>
      <FriendlyQuestion>{flow.question}</FriendlyQuestion>

      <ReassuranceText>
        Take your time—there's no wrong answer here.
      </ReassuranceText>

      <GentleOptions>
        {flow.options.map((opt, index) => (
          <GentleOption
            key={opt.id}
            onPress={() => onConfirm(opt)}
            icon={getGentleIcon(opt.entityType)}
          >
            {opt.label}
          </GentleOption>
        ))}

        <GentleOption
          onPress={onCancel}
          icon="bookmark"
          subtle
        >
          Save as-is for now
        </GentleOption>
      </GentleOptions>
    </GentleClarification>
  );
}
```

### 5.6.4 Privacy-First (Morgan) Patterns

Privacy-First users prioritize data control. Clarification flows must respect local-only preferences and minimize data exposure.

```typescript
interface PrivacyFirstClarificationConfig {
  showConfidenceScores: true;  // Transparency about processing
  showReasoning: false;
  allowManualOverride: true;
  timeoutBehavior: 'save_draft';
  defaultView: 'minimal';
  metricsVisible: false;
  localProcessingPreferred: true;
  noCloudFallback: true;  // Don't suggest cloud-based alternatives
}

const PRIVACY_FIRST_MESSAGING = {
  entityTypeAmbiguity: 'Entry type unclear. Select:',
  temporalAmbiguity: 'When:',
  lowConfidence: 'Processing failed. Your data was not transmitted.',
  fallbackTriggered: 'Entry saved locally.',
  localOnlyMode: 'Processed on-device. No data sent to cloud.',
  encryptedMode: 'End-to-end encrypted before any transmission.'
};

// Privacy-First: Ensure local-only processing when possible
async function processPrivacyFirstInput(
  input: ParseInput,
  persona: PersonaType
): Promise<ParseResult> {
  // Check if local-only mode is enabled
  const settings = await getUserPrivacySettings(input.userId);

  if (settings.localOnlyMode) {
    // Use on-device models only
    return await localOnlyParse(input);
  }

  // Even for cloud processing, minimize data sent
  const result = await standardParse(input, {
    ...input.context,
    minimizeDataTransmission: true,
    excludeAudioFromLogs: true
  });

  // Add privacy confirmation to result
  result.privacyInfo = {
    processedLocally: settings.preferLocalProcessing,
    audioRetained: false,
    transcriptStored: !settings.noTranscriptStorage
  };

  return result;
}
```

### 5.6.5 Biohacker (Sam) Patterns

The Biohacker values data accuracy for correlation analysis. Clarification should emphasize precision while respecting efficiency.

```typescript
interface BiohackerClarificationConfig {
  showConfidenceScores: true;
  showReasoning: true;
  allowManualOverride: true;
  timeoutBehavior: 'remind';  // Don't auto-accept; remind to complete
  defaultView: 'data_focused';
  metricsVisible: true;
  dataQualityWarnings: true;
}

const BIOHACKER_MESSAGING = {
  entityTypeAmbiguity: 'Entity: {topType} | Confidence: {confidence}% | Override?',
  temporalAmbiguity: 'Timestamp ambiguity. Select: Past | Future | Now',
  lowConfidence: 'Audio quality: poor. Recommend text input for accuracy.',
  fallbackTriggered: 'Classification failed. Saved as note for manual tagging.',
  dataImpact: 'Low-confidence entries may affect correlation accuracy.',
  supplementWarning: 'Supplement name unclear: "{name}". Confirm or correct for tracking.'
};

// Biohacker-specific: Warn about data quality impact
function BiohackerClarificationWithQualityWarning({ flow, onConfirm, onEdit }: Props) {
  const qualityImpact = assessDataQualityImpact(flow);

  return (
    <DataFocusedClarification>
      <TechnicalQuestion>{flow.question}</TechnicalQuestion>

      {qualityImpact.hasImpact && (
        <QualityWarning severity={qualityImpact.severity}>
          <WarningIcon />
          <WarningText>{qualityImpact.message}</WarningText>
        </QualityWarning>
      )}

      <ConfidenceGrid>
        {flow.options.map(opt => (
          <ConfidenceOption
            key={opt.id}
            onPress={() => onConfirm(opt)}
            confidence={opt.confidence}
          >
            <TypeLabel>{opt.entityType}</TypeLabel>
            <ConfidenceBar value={opt.confidence} />
            <ConfidenceValue>{Math.round(opt.confidence * 100)}%</ConfidenceValue>
          </ConfidenceOption>
        ))}
      </ConfidenceGrid>

      <EditForPrecisionButton onPress={onEdit}>
        Edit for precision
      </EditForPrecisionButton>
    </DataFocusedClarification>
  );
}

function assessDataQualityImpact(flow: ClarificationFlow): QualityImpact {
  // Check if ambiguity affects key biohacker domains
  const affectedDomains = ['supplement', 'workout', 'biometric'];

  if (flow.options.some(o => affectedDomains.includes(o.entityType))) {
    return {
      hasImpact: true,
      severity: flow.options[0].confidence < 0.50 ? 'high' : 'medium',
      message: 'Ambiguity may affect supplement/workout correlation analysis.'
    };
  }

  return { hasImpact: false, severity: 'none', message: '' };
}
```

### 5.6.6 Reflector (Casey) Patterns

The Reflector values emotional preservation and thoughtful processing. Clarification should feel gentle and supportive.

```typescript
interface ReflectorClarificationConfig {
  showConfidenceScores: false;
  showReasoning: false;
  allowManualOverride: true;
  timeoutBehavior: 'save_draft';
  defaultView: 'thoughtful';
  metricsVisible: false;
  emotionalSensitivity: true;
  preserveNuance: true;
}

const REFLECTOR_MESSAGING = {
  entityTypeAmbiguity: "I'd like to save this as a {topType}. Does that feel right?",
  temporalAmbiguity: 'Was this a moment you experienced, or something you want to do?',
  lowConfidence: "I didn't catch everything. Would you like to type your thought?",
  fallbackTriggered: 'Your thought is preserved. Review when ready.',
  emotionalContent: 'Your reflection is saved. Take all the time you need.',
  journalPrompt: 'Would you like to expand on this thought?'
};

// Reflector-specific: Detect and handle emotional content gently
async function processReflectorInput(
  input: ParseInput
): Promise<ParseResult> {
  const emotionalAnalysis = await analyzeEmotionalContent(input.transcript);

  const result = await standardParse(input, {
    ...input.context,
    preserveFullText: true,
    extractEmotionalThemes: true
  });

  // If high emotional content, suppress clarification prompts
  if (emotionalAnalysis.intensity === 'high') {
    return {
      ...result,
      suppressClarification: true,
      defaultToNote: true,
      message: REFLECTOR_MESSAGING.emotionalContent,
      gamification: {
        ...result.gamification,
        suppressCelebration: true,
        quietConfirmation: true
      }
    };
  }

  return result;
}

// Gentle clarification with emotional awareness
function ReflectorClarification({ flow, onConfirm, onExpand }: Props) {
  return (
    <ThoughtfulClarification>
      <GentleQuestion>{flow.question}</GentleQuestion>

      <ReflectiveOptions>
        {flow.options.map(opt => (
          <ReflectiveOption
            key={opt.id}
            onPress={() => onConfirm(opt)}
          >
            <OptionText>{opt.label}</OptionText>
          </ReflectiveOption>
        ))}
      </ReflectiveOptions>

      <ExpandPrompt onPress={onExpand}>
        <JournalIcon />
        <ExpandText>Expand this thought...</ExpandText>
      </ExpandPrompt>
    </ThoughtfulClarification>
  );
}
```

---

## 5.7 Metrics and Monitoring

### 5.7.1 Clarification Success Metrics

Track the effectiveness of the clarification system across all personas and input types.

```typescript
interface ClarificationMetrics {
  // Resolution rates
  autoResolvedRate: number;       // Ambiguity resolved without user input
  userResolvedRate: number;       // User completed clarification flow
  timeoutRate: number;            // Clarification timed out
  abandonedRate: number;          // User canceled without resolution

  // Timing
  avgResolutionTimeMs: number;    // Time from prompt to selection
  p95ResolutionTimeMs: number;
  timeoutBreakdown: Record<PersonaType, number>;

  // Accuracy
  userCorrectionRate: number;     // User changed after initial accept
  recommendedAcceptRate: number;  // User accepted recommended option
  learningImpact: number;         // Reduction in clarifications over time

  // Volume
  clarificationsPerDay: number;
  byAmbiguityType: Record<AmbiguityType, number>;
  byPersona: Record<PersonaType, number>;
}

async function collectClarificationMetrics(
  timeRange: DateRange
): Promise<ClarificationMetrics> {
  const flows = await getClarificationFlows(timeRange);

  const resolved = flows.filter(f => f.status === 'resolved');
  const timedOut = flows.filter(f => f.status === 'timeout');
  const abandoned = flows.filter(f => f.status === 'abandoned');

  return {
    autoResolvedRate: calculateAutoResolveRate(flows),
    userResolvedRate: resolved.length / flows.length,
    timeoutRate: timedOut.length / flows.length,
    abandonedRate: abandoned.length / flows.length,

    avgResolutionTimeMs: average(resolved.map(f => f.resolutionTimeMs)),
    p95ResolutionTimeMs: percentile(resolved.map(f => f.resolutionTimeMs), 95),
    timeoutBreakdown: groupByPersona(timedOut),

    userCorrectionRate: calculateCorrectionRate(resolved),
    recommendedAcceptRate: resolved.filter(f => f.acceptedRecommended).length / resolved.length,
    learningImpact: calculateLearningImpact(flows, timeRange),

    clarificationsPerDay: flows.length / daysBetween(timeRange.start, timeRange.end),
    byAmbiguityType: groupByAmbiguityType(flows),
    byPersona: groupByPersona(flows)
  };
}
```

### 5.7.2 Target Metrics and Alerts

Define target metrics and alerting thresholds for system health.

| Metric | Target | Warning | Critical | Rationale |
|--------|--------|---------|----------|-----------|
| Auto-Resolve Rate | > 70% | < 60% | < 50% | Most inputs should not need clarification |
| User Resolve Rate | > 85% | < 75% | < 60% | Users should complete flows when needed |
| Timeout Rate | < 10% | > 15% | > 25% | Timeouts indicate UX friction |
| Avg Resolution Time | < 3s | > 5s | > 10s | Clarification should be quick |
| Recommended Accept | > 80% | < 70% | < 50% | Recommendations should be good |
| User Correction Rate | < 5% | > 10% | > 20% | Low corrections = good initial parsing |
| Learning Impact | > 10%/mo | < 5%/mo | 0%/mo | System should improve over time |

```typescript
interface MetricAlert {
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
  suggestedAction: string;
}

function evaluateMetrics(metrics: ClarificationMetrics): MetricAlert[] {
  const alerts: MetricAlert[] = [];

  if (metrics.timeoutRate > 0.25) {
    alerts.push({
      metric: 'timeoutRate',
      currentValue: metrics.timeoutRate,
      threshold: 0.25,
      severity: 'critical',
      message: 'Clarification timeout rate critically high',
      suggestedAction: 'Review timeout durations by persona; consider extending'
    });
  }

  if (metrics.recommendedAcceptRate < 0.50) {
    alerts.push({
      metric: 'recommendedAcceptRate',
      currentValue: metrics.recommendedAcceptRate,
      threshold: 0.50,
      severity: 'critical',
      message: 'Recommended options accepted less than half the time',
      suggestedAction: 'Review recommendation algorithm; consider model upgrade'
    });
  }

  if (metrics.userCorrectionRate > 0.20) {
    alerts.push({
      metric: 'userCorrectionRate',
      currentValue: metrics.userCorrectionRate,
      threshold: 0.20,
      severity: 'critical',
      message: 'Users correcting entries at high rate after initial acceptance',
      suggestedAction: 'Increase confidence thresholds; improve initial parsing'
    });
  }

  return alerts;
}
```

---

## 5.8 Section Summary

### Key Takeaways

1. **Ambiguity is Multi-Dimensional**: Input can be ambiguous in temporal context, entity type, self-correction, or completeness. Each dimension requires specific detection and resolution strategies.

2. **Confidence Thresholds Must Be Unified**: The Phase 3A conflict analysis revealed fragmented thresholds across domains. This section establishes the central `CONFIDENCE_CONFIG` that all domains must reference.

3. **Clarification Should Be Minimal and Quick**: Users should resolve ambiguity in 1-2 taps, with persona-appropriate messaging that matches their sophistication level and emotional state.

4. **Fallbacks Preserve User Intent**: When parsing fails, the system never discards input. The fallback hierarchy ensures every input reaches some resolution, from model upgrades through text input to note preservation.

5. **Learning Improves Over Time**: User corrections and clarification responses feed back into the system, enabling personalized pattern recognition that reduces future ambiguity.

### Implementation Priorities

| Priority | Component | Rationale |
|----------|-----------|-----------|
| P0 | Confidence Config | Resolves CONFLICT-002 from Phase 3A |
| P0 | Self-Correction Detection | Critical for voice-first accuracy |
| P0 | Note Preservation Fallback | Ensures no data loss |
| P1 | Entity Type Clarification UI | Most common disambiguation need |
| P1 | Temporal Clarification UI | Second most common |
| P2 | Batch Review Flow | Reduces friction for power users |
| P2 | Learning System | Long-term accuracy improvement |
| P3 | Quick-Log Fallback | Nice-to-have optimization |

### Integration Points

- **Part 2 (LLM Parsing)**: Ambiguity detection feeds into classification confidence
- **Part 3 (Voice Handling)**: Audio quality affects confidence calculations
- **Part 4 (Entity Crossover)**: Multi-entity disambiguation uses these flows
- **Part 6 (Agent vs Parsing)**: Agent system can invoke clarification when parsing alone fails

---

*Section 5 Complete. Word count: ~8,400 words.*
