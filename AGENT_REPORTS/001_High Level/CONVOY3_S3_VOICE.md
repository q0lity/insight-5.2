# CONVOY 3 SECTION 3: Voice Handling Architecture

**Document Version:** 1.0
**Date:** January 18, 2026
**Section:** Voice Input Processing & Speech-to-Text Integration
**Word Count Target:** ~8,000 words
**Status:** Complete

---

## Executive Summary

Voice input is the primary interaction modality for Insight 5.2, enabling frictionless life logging across diverse contexts—from gym floors to morning commutes, from quiet offices to noisy restaurants. This section provides comprehensive production-scale architecture for voice handling, covering the complete pipeline from audio capture through structured entity creation.

The voice handling system must solve several interconnected challenges:

1. **Environmental Robustness:** Handle background noise, interruptions, connectivity issues, and acoustic anomalies
2. **Linguistic Flexibility:** Process self-corrections, restarts, code-switching, trailing thoughts, and disfluencies
3. **Emotional Sensitivity:** Detect crisis content, respect intense emotions, and maintain appropriate boundaries
4. **Privacy Preservation:** Support whisper detection, local processing, and persona-specific privacy tiers
5. **Real-time vs. Batch:** Balance immediacy needs with accuracy requirements across different use cases

---

## 3.1 Voice Processing Pipeline Overview

### 3.1.1 End-to-End Architecture

The voice handling pipeline consists of seven distinct stages, each with specific responsibilities and failure modes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VOICE PROCESSING PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Stage 1: Audio Capture                                                     │
│   ├── Microphone input with noise profiling                                  │
│   ├── Audio quality scoring (SNR, clipping, silence ratio)                   │
│   ├── Environment classification (gym, car, office, outdoor)                 │
│   └── Buffer management for connectivity issues                              │
│                          │                                                   │
│                          ▼                                                   │
│   Stage 2: Pre-Processing                                                    │
│   ├── Noise reduction (adaptive per environment)                             │
│   ├── Voice activity detection (VAD)                                         │
│   ├── Speaker diarization (multi-speaker separation)                         │
│   └── Echo cancellation (reverb environments)                                │
│                          │                                                   │
│                          ▼                                                   │
│   Stage 3: Speech-to-Text (STT)                                              │
│   ├── Primary: Whisper API (cloud) or Whisper.cpp (local)                    │
│   ├── Per-segment confidence scoring                                         │
│   ├── Prosodic feature extraction (emphasis, tone)                           │
│   └── Language detection for code-switching                                  │
│                          │                                                   │
│                          ▼                                                   │
│   Stage 4: Transcript Post-Processing                                        │
│   ├── Self-correction resolution ("no wait", "actually")                     │
│   ├── Restart detection and false-start removal                              │
│   ├── Stutter/repetition normalization                                       │
│   └── Filler word filtering ("um", "like", "you know")                       │
│                          │                                                   │
│                          ▼                                                   │
│   Stage 5: Context Analysis                                                  │
│   ├── Crisis content detection (PRIORITY INTERCEPT)                          │
│   ├── Emotional intensity scoring                                            │
│   ├── Cancellation phrase detection                                          │
│   └── Continuation phrase detection (linking to previous)                    │
│                          │                                                   │
│                          ▼                                                   │
│   Stage 6: Entity Classification (feeds into LLM Parser)                     │
│   ├── Pre-parsed tokens (#trackers, @mentions, !locations)                   │
│   ├── LLM entity classification                                              │
│   ├── Confidence scoring and routing                                         │
│   └── Disambiguation when needed                                             │
│                          │                                                   │
│                          ▼                                                   │
│   Stage 7: Entry Creation & Feedback                                         │
│   ├── Structured entity persistence                                          │
│   ├── Gamification calculation                                               │
│   ├── Persona-appropriate response generation                                │
│   └── Follow-up scheduling for incomplete entries                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1.2 Pipeline Timing Targets

| Stage | Target Latency | Max Acceptable | Notes |
|-------|----------------|----------------|-------|
| Audio Capture | Real-time | Real-time | Streaming |
| Pre-Processing | < 100ms | < 200ms | Parallelized |
| Speech-to-Text | < 1500ms | < 3000ms | Model dependent |
| Transcript Post-Processing | < 50ms | < 100ms | Deterministic |
| Context Analysis | < 50ms | < 100ms | Priority paths |
| Entity Classification | < 800ms | < 1500ms | LLM dependent |
| Entry Creation | < 100ms | < 200ms | Database ops |
| **End-to-End** | **< 2600ms** | **< 5000ms** | User-perceived |

### 3.1.3 Key Design Principles

1. **Fail-Open for Capture:** Audio is always recorded locally; processing failures don't lose data
2. **Graceful Degradation:** Each stage has fallback modes when optimal processing unavailable
3. **Privacy by Design:** Local processing available for sensitive content; cloud processing opt-in
4. **Persona Awareness:** Response style and follow-up behavior matches user's configured persona
5. **No Punishment for Environment:** Background noise, interruptions, and speech patterns never penalize users

---

## 3.2 Audio Capture & Environment Classification

### 3.2.1 Audio Quality Assessment

Before any processing, the system evaluates incoming audio quality to inform downstream handling:

```typescript
interface AudioQualityMetrics {
  // Signal-to-Noise Ratio
  snr: {
    value: number;           // dB
    classification: 'excellent' | 'good' | 'acceptable' | 'degraded' | 'poor';
  };

  // Voice Activity Ratio
  voiceActivityRatio: number;  // 0-1, portion of audio containing speech

  // Clipping Detection
  clippingEvents: number;      // Count of clipped samples
  clippingRatio: number;       // 0-1, portion affected

  // Background Noise Profile
  noiseProfile: {
    type: 'white' | 'ambient' | 'intermittent' | 'speech' | 'music';
    level: number;             // dB
    variability: number;       // Standard deviation
  };

  // Recording Conditions
  sampleRate: number;          // Hz
  bitDepth: number;            // bits
  durationMs: number;          // Total recording length

  // Overall Assessment
  overallQuality: number;      // 0-1 composite score
  processingRecommendation: 'normal' | 'enhanced' | 'local_only' | 'request_retry';
}

function assessAudioQuality(audioBuffer: Float32Array, sampleRate: number): AudioQualityMetrics {
  // Calculate SNR using voice activity detection
  const vadResult = detectVoiceActivity(audioBuffer, sampleRate);
  const voiceSegments = vadResult.segments.filter(s => s.isVoice);
  const silenceSegments = vadResult.segments.filter(s => !s.isVoice);

  const voiceRms = calculateRMS(extractSegments(audioBuffer, voiceSegments));
  const noiseRms = calculateRMS(extractSegments(audioBuffer, silenceSegments));
  const snrDb = 20 * Math.log10(voiceRms / noiseRms);

  // Classify SNR quality
  const snrClassification =
    snrDb > 30 ? 'excellent' :
    snrDb > 20 ? 'good' :
    snrDb > 12 ? 'acceptable' :
    snrDb > 6 ? 'degraded' : 'poor';

  // Detect clipping
  const clippingThreshold = 0.99;
  const clippingEvents = countClippingEvents(audioBuffer, clippingThreshold);
  const clippingRatio = clippingEvents / audioBuffer.length;

  // Profile background noise
  const noiseProfile = analyzeNoiseProfile(extractSegments(audioBuffer, silenceSegments));

  // Calculate overall quality score
  const overallQuality = calculateCompositeQuality({
    snrDb,
    clippingRatio,
    voiceActivityRatio: vadResult.voiceRatio,
    noiseVariability: noiseProfile.variability
  });

  // Determine processing recommendation
  const processingRecommendation =
    overallQuality > 0.8 ? 'normal' :
    overallQuality > 0.5 ? 'enhanced' :
    overallQuality > 0.3 ? 'local_only' : 'request_retry';

  return {
    snr: { value: snrDb, classification: snrClassification },
    voiceActivityRatio: vadResult.voiceRatio,
    clippingEvents,
    clippingRatio,
    noiseProfile,
    sampleRate,
    bitDepth: 16,  // Assumed from Float32Array
    durationMs: (audioBuffer.length / sampleRate) * 1000,
    overallQuality,
    processingRecommendation
  };
}
```

### 3.2.2 Environment Classification

The system identifies recording environment to apply appropriate processing:

```typescript
type RecordingEnvironment =
  | 'gym'           // Music, equipment clanking, echo
  | 'car'           // Road noise, engine, wind
  | 'transit'       // Announcements, crowd, rumble
  | 'office'        // Low ambient, potential other voices
  | 'outdoor'       // Wind, traffic, variable noise
  | 'home'          // Variable, potential children/pets
  | 'bathroom'      // Echo/reverb, fan noise
  | 'restaurant'    // Dishes, conversation, music
  | 'quiet'         // Low noise, optimal conditions
  | 'unknown';      // Cannot classify

interface EnvironmentClassification {
  environment: RecordingEnvironment;
  confidence: number;
  features: {
    musicDetected: boolean;
    multipleVoices: boolean;
    reverbLevel: number;
    windDetected: boolean;
    mechanicalNoise: boolean;
  };
  processingProfile: ProcessingProfile;
}

const ENVIRONMENT_PROCESSING_PROFILES: Record<RecordingEnvironment, ProcessingProfile> = {
  gym: {
    noiseReduction: 'aggressive',
    musicSuppression: true,
    echoCancel: true,
    vadSensitivity: 'low',
    sttModel: 'whisper-large',
    confidenceThreshold: 0.65
  },
  car: {
    noiseReduction: 'moderate',
    musicSuppression: false,
    echoCancel: false,
    vadSensitivity: 'medium',
    sttModel: 'whisper-medium',
    confidenceThreshold: 0.70
  },
  transit: {
    noiseReduction: 'aggressive',
    musicSuppression: false,
    echoCancel: false,
    vadSensitivity: 'low',
    sttModel: 'whisper-large',
    confidenceThreshold: 0.60
  },
  office: {
    noiseReduction: 'light',
    musicSuppression: false,
    echoCancel: false,
    vadSensitivity: 'high',
    sttModel: 'whisper-medium',
    confidenceThreshold: 0.80
  },
  outdoor: {
    noiseReduction: 'moderate',
    musicSuppression: false,
    echoCancel: false,
    vadSensitivity: 'medium',
    sttModel: 'whisper-medium',
    confidenceThreshold: 0.70,
    windFilter: true
  },
  home: {
    noiseReduction: 'light',
    musicSuppression: false,
    echoCancel: false,
    vadSensitivity: 'medium',
    sttModel: 'whisper-medium',
    confidenceThreshold: 0.75,
    speakerDiarization: true
  },
  bathroom: {
    noiseReduction: 'moderate',
    musicSuppression: false,
    echoCancel: true,
    vadSensitivity: 'medium',
    sttModel: 'whisper-medium',
    confidenceThreshold: 0.75
  },
  restaurant: {
    noiseReduction: 'moderate',
    musicSuppression: true,
    echoCancel: false,
    vadSensitivity: 'low',
    sttModel: 'whisper-large',
    confidenceThreshold: 0.65,
    speakerDiarization: true
  },
  quiet: {
    noiseReduction: 'none',
    musicSuppression: false,
    echoCancel: false,
    vadSensitivity: 'high',
    sttModel: 'whisper-small',
    confidenceThreshold: 0.85
  },
  unknown: {
    noiseReduction: 'moderate',
    musicSuppression: false,
    echoCancel: false,
    vadSensitivity: 'medium',
    sttModel: 'whisper-medium',
    confidenceThreshold: 0.70
  }
};
```

### 3.2.3 Connectivity-Aware Buffering

For unreliable network conditions, audio is buffered locally:

```typescript
interface AudioBuffer {
  id: string;
  audioData: Blob;
  metadata: {
    startTime: number;
    duration: number;
    quality: AudioQualityMetrics;
    environment: EnvironmentClassification;
    connectivityState: 'online' | 'offline' | 'degraded';
  };
  processingState: 'pending' | 'in_progress' | 'completed' | 'failed';
  retryCount: number;
}

class VoiceBufferManager {
  private buffers: Map<string, AudioBuffer> = new Map();
  private maxBufferAge = 24 * 60 * 60 * 1000;  // 24 hours

  async captureAudio(stream: MediaStream): Promise<AudioBuffer> {
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    const chunks: Blob[] = [];

    return new Promise((resolve) => {
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioArray = await audioBlob.arrayBuffer();
        const float32 = convertToFloat32(audioArray);

        const buffer: AudioBuffer = {
          id: generateId(),
          audioData: audioBlob,
          metadata: {
            startTime: Date.now(),
            duration: calculateDuration(float32),
            quality: assessAudioQuality(float32, 16000),
            environment: classifyEnvironment(float32),
            connectivityState: navigator.onLine ? 'online' : 'offline'
          },
          processingState: 'pending',
          retryCount: 0
        };

        this.buffers.set(buffer.id, buffer);
        this.persistToLocal(buffer);
        resolve(buffer);
      };

      recorder.start();
    });
  }

  async processBuffered(): Promise<void> {
    // Process any pending buffers when connectivity returns
    const pending = Array.from(this.buffers.values())
      .filter(b => b.processingState === 'pending' || b.processingState === 'failed')
      .sort((a, b) => a.metadata.startTime - b.metadata.startTime);

    for (const buffer of pending) {
      if (buffer.retryCount < 3 && Date.now() - buffer.metadata.startTime < this.maxBufferAge) {
        await this.processBuffer(buffer);
      }
    }
  }

  private async persistToLocal(buffer: AudioBuffer): Promise<void> {
    // Store to IndexedDB for offline resilience
    const db = await openDatabase('voice_buffers');
    await db.put('buffers', buffer);
  }
}
```

---

## 3.3 Speech-to-Text Integration

### 3.3.1 STT Model Selection Strategy

The system uses a tiered approach to STT model selection:

```typescript
interface STTModelConfig {
  name: string;
  provider: 'openai' | 'local' | 'google' | 'azure';
  model: string;
  latencyMs: number;           // Average latency
  costPerMinute: number;       // USD
  accuracyScore: number;       // 0-1 on benchmark
  supportsStreaming: boolean;
  supportsLanguageDetection: boolean;
  maxAudioLength: number;      // Seconds
}

const STT_MODELS: STTModelConfig[] = [
  {
    name: 'whisper-large-v3',
    provider: 'openai',
    model: 'whisper-1',
    latencyMs: 1200,
    costPerMinute: 0.006,
    accuracyScore: 0.95,
    supportsStreaming: false,
    supportsLanguageDetection: true,
    maxAudioLength: 600
  },
  {
    name: 'whisper-cpp-medium',
    provider: 'local',
    model: 'whisper.cpp-medium.en',
    latencyMs: 800,
    costPerMinute: 0,
    accuracyScore: 0.88,
    supportsStreaming: true,
    supportsLanguageDetection: false,
    maxAudioLength: 300
  },
  {
    name: 'whisper-cpp-small',
    provider: 'local',
    model: 'whisper.cpp-small.en',
    latencyMs: 300,
    costPerMinute: 0,
    accuracyScore: 0.82,
    supportsStreaming: true,
    supportsLanguageDetection: false,
    maxAudioLength: 300
  }
];

function selectSTTModel(
  audioMetrics: AudioQualityMetrics,
  userSettings: UserPrivacySettings,
  environment: RecordingEnvironment
): STTModelConfig {
  // Privacy-first users always use local processing
  if (userSettings.localProcessingOnly) {
    return STT_MODELS.find(m => m.provider === 'local' && m.accuracyScore >= 0.85)
      || STT_MODELS.find(m => m.provider === 'local')!;
  }

  // Degraded audio needs best model
  if (audioMetrics.snr.classification === 'degraded' || audioMetrics.snr.classification === 'poor') {
    return STT_MODELS.find(m => m.name === 'whisper-large-v3')!;
  }

  // Noisy environments need better model
  const noisyEnvironments: RecordingEnvironment[] = ['gym', 'transit', 'restaurant'];
  if (noisyEnvironments.includes(environment)) {
    return STT_MODELS.find(m => m.name === 'whisper-large-v3')!;
  }

  // Good conditions can use faster local model
  if (audioMetrics.overallQuality > 0.8) {
    return STT_MODELS.find(m => m.provider === 'local' && m.latencyMs < 500)!;
  }

  // Default to balanced cloud model
  return STT_MODELS.find(m => m.name === 'whisper-large-v3')!;
}
```

### 3.3.2 Transcription with Confidence Scoring

```typescript
interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  languageConfidence: number;
  duration: number;
  modelUsed: string;
  processingTime: number;
}

interface TranscriptionSegment {
  id: number;
  start: number;           // Seconds
  end: number;             // Seconds
  text: string;
  confidence: number;      // 0-1 per segment
  words: WordTimestamp[];
  avgLogprob: number;
  noSpeechProb: number;
}

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

async function transcribeAudio(
  audio: Blob,
  config: STTModelConfig,
  options: TranscriptionOptions
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  if (config.provider === 'openai') {
    const response = await openai.audio.transcriptions.create({
      file: audio,
      model: config.model,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment', 'word'],
      language: options.expectedLanguage
    });

    return {
      text: response.text,
      segments: response.segments.map(s => ({
        id: s.id,
        start: s.start,
        end: s.end,
        text: s.text,
        confidence: Math.exp(s.avg_logprob),
        words: s.words?.map(w => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: Math.exp(w.probability || -1)
        })) || [],
        avgLogprob: s.avg_logprob,
        noSpeechProb: s.no_speech_prob
      })),
      language: response.language,
      languageConfidence: 0.95,  // Whisper generally confident
      duration: response.duration,
      modelUsed: config.name,
      processingTime: Date.now() - startTime
    };
  }

  if (config.provider === 'local') {
    return transcribeWithWhisperCpp(audio, config, options, startTime);
  }

  throw new Error(`Unsupported STT provider: ${config.provider}`);
}
```

### 3.3.3 Whisper Detection for Privacy

A specialized detector for intentionally quiet speech:

```typescript
interface WhisperDetection {
  isWhisper: boolean;
  confidence: number;
  volumeRatio: number;        // Compared to user baseline
  spectralFeatures: {
    fundamentalFrequency: number;
    harmonicToNoiseRatio: number;
  };
}

function detectWhisper(
  audioSegment: Float32Array,
  userBaseline: UserVoiceBaseline
): WhisperDetection {
  // Whisper characteristics:
  // 1. Lower overall volume
  // 2. Reduced fundamental frequency variation
  // 3. Lower harmonic-to-noise ratio
  // 4. More breathy/aspirated quality

  const segmentVolume = calculateRMS(audioSegment);
  const volumeRatio = segmentVolume / userBaseline.averageVolume;

  const spectral = analyzeSpectralFeatures(audioSegment);

  // Whisper typically has:
  // - Volume < 40% of normal
  // - Reduced F0 range
  // - HNR < 5dB (vs normal ~15-20dB)

  const isWhisper =
    volumeRatio < 0.4 &&
    spectral.harmonicToNoiseRatio < 8;

  const confidence = calculateWhisperConfidence(volumeRatio, spectral);

  return {
    isWhisper,
    confidence,
    volumeRatio,
    spectralFeatures: spectral
  };
}

// When whisper is detected, trigger privacy mode
async function handleWhisperInput(
  audio: Blob,
  whisperDetection: WhisperDetection,
  userSettings: UserPrivacySettings
): Promise<TranscriptionResult> {
  // Force local processing for whispers
  const localModel = STT_MODELS.find(m => m.provider === 'local')!;

  const result = await transcribeAudio(audio, localModel, {
    expectedLanguage: userSettings.primaryLanguage,
    privacyMode: true
  });

  // Mark result for special handling
  result.metadata = {
    whisperDetected: true,
    processedLocally: true,
    transcriptRetained: !userSettings.noTranscriptStorage
  };

  return result;
}
```

---

## 3.4 Transcript Post-Processing

### 3.4.1 Self-Correction Resolution

Users frequently correct themselves mid-utterance. The system must identify and apply these corrections:

```typescript
interface SelfCorrection {
  original: string;
  corrected: string;
  correctionType: 'value' | 'word' | 'phrase';
  signal: string;
  position: number;
  confidence: number;
}

const CORRECTION_SIGNALS = [
  { phrase: 'no wait', strength: 0.95 },
  { phrase: 'actually', strength: 0.85 },
  { phrase: 'I mean', strength: 0.90 },
  { phrase: 'sorry', strength: 0.70 },
  { phrase: 'scratch that', strength: 0.95 },
  { phrase: 'not', strength: 0.60 },
  { phrase: 'wait no', strength: 0.95 },
  { phrase: 'correction', strength: 1.0 },
  { phrase: 'let me correct that', strength: 1.0 }
];

function detectAndApplyCorrections(transcript: string): CorrectionResult {
  const corrections: SelfCorrection[] = [];
  let cleanedTranscript = transcript;

  // Pattern: [value] [correction signal] [new value]
  // Example: "mood 7 no wait 8" -> "mood 8"
  const valueCorrection = /(\b\d+(?:\.\d+)?)\s*(no wait|actually|wait no|I mean)\s*(\d+(?:\.\d+)?)\b/gi;

  cleanedTranscript = cleanedTranscript.replace(valueCorrection, (match, orig, signal, corrected, offset) => {
    corrections.push({
      original: orig,
      corrected,
      correctionType: 'value',
      signal,
      position: offset,
      confidence: getCorrectionSignalStrength(signal)
    });
    return corrected;
  });

  // Pattern: [word] [correction signal] [new word]
  // Example: "did bench actually squats" -> "did squats"
  const wordCorrection = /(\b\w+)\s+(no wait|actually|not|I mean)\s+(\w+)\b/gi;

  cleanedTranscript = cleanedTranscript.replace(wordCorrection, (match, orig, signal, corrected, offset) => {
    // Only apply if correction signal is strong enough
    if (getCorrectionSignalStrength(signal) >= 0.80) {
      corrections.push({
        original: orig,
        corrected,
        correctionType: 'word',
        signal,
        position: offset,
        confidence: getCorrectionSignalStrength(signal)
      });
      return corrected;
    }
    return match;
  });

  return {
    originalTranscript: transcript,
    cleanedTranscript,
    corrections,
    correctionsApplied: corrections.length
  };
}

function getCorrectionSignalStrength(signal: string): number {
  const match = CORRECTION_SIGNALS.find(s =>
    signal.toLowerCase().includes(s.phrase.toLowerCase())
  );
  return match?.strength || 0.5;
}
```

### 3.4.2 Restart Detection

Users often abandon a thought and start over. The system should use only the restarted content:

```typescript
const RESTART_PHRASES = [
  'let me start over',
  'starting again',
  'never mind',
  'try that again',
  'from the top',
  'let me try again',
  'okay so',           // Often signals restart after pause
  'actually let me',
  'that was messy',
  'let me just say'
];

interface RestartDetection {
  hasRestart: boolean;
  restartPosition: number;
  preRestartContent: string;
  postRestartContent: string;
  restartPhrase: string;
}

function detectRestart(transcript: string): RestartDetection {
  for (const phrase of RESTART_PHRASES) {
    const pattern = new RegExp(`(.*)\\b(${escapeRegex(phrase)})\\b(.*)`, 'i');
    const match = transcript.match(pattern);

    if (match) {
      return {
        hasRestart: true,
        restartPosition: match[1].length,
        preRestartContent: match[1].trim(),
        postRestartContent: match[3].trim(),
        restartPhrase: match[2]
      };
    }
  }

  return {
    hasRestart: false,
    restartPosition: -1,
    preRestartContent: '',
    postRestartContent: transcript,
    restartPhrase: ''
  };
}

function applyRestart(transcript: string): string {
  const detection = detectRestart(transcript);

  if (detection.hasRestart) {
    // Discard everything before restart phrase
    // Use only post-restart content
    return detection.postRestartContent;
  }

  return transcript;
}
```

### 3.4.3 Stutter and Repetition Normalization

Handle speech disfluencies without stigmatizing:

```typescript
interface DisfluencyResult {
  originalTranscript: string;
  normalizedTranscript: string;
  disfluenciesRemoved: number;
  // CRITICAL: We track count for quality metrics but NEVER store patterns
  privacyNote: 'patterns_not_stored';
}

function normalizeDisfluencies(transcript: string): DisfluencyResult {
  let normalized = transcript;
  let removedCount = 0;

  // Word repetitions: "I-I-I" -> "I"
  normalized = normalized.replace(/\b(\w+)(?:-\1)+\b/gi, (match, word) => {
    removedCount++;
    return word;
  });

  // Consecutive word repetitions: "the the the" -> "the"
  normalized = normalized.replace(/\b(\w+)(\s+\1)+\b/gi, (match, word) => {
    removedCount++;
    return word;
  });

  // Syllable repetitions at word start: "M-m-mood" -> "Mood"
  normalized = normalized.replace(/\b([A-Za-z])-(?:\1-)*(\w+)/gi, (match, letter, rest) => {
    removedCount++;
    return letter + rest;
  });

  // Filler repetitions: "um um um" -> single removal
  normalized = normalized.replace(/\b(um|uh|er|ah)(\s+\1)+\b/gi, (match, filler) => {
    removedCount++;
    return filler;
  });

  return {
    originalTranscript: transcript,
    normalizedTranscript: normalized.replace(/\s+/g, ' ').trim(),
    disfluenciesRemoved: removedCount,
    privacyNote: 'patterns_not_stored'
  };
}
```

### 3.4.4 Filler Word Filtering

Remove conversational fillers while preserving meaning:

```typescript
const FILLER_WORDS = [
  'um', 'uh', 'er', 'ah', 'hmm',
  'like',        // Contextual - only remove when filler
  'you know',
  'I mean',      // Contextual - only remove when filler
  'basically',
  'literally',   // Often filler in casual speech
  'kind of',
  'sort of',
  'I guess',
  'right',       // When used as filler
  'so yeah'
];

function filterFillers(transcript: string): string {
  let filtered = transcript;

  // Remove standalone fillers (surrounded by spaces or punctuation)
  for (const filler of FILLER_WORDS) {
    // Only remove when clearly a filler (not part of meaningful phrase)
    const pattern = new RegExp(`\\b${escapeRegex(filler)}\\b(?!\\s*[,:]\\s*\\w)`, 'gi');
    filtered = filtered.replace(pattern, ' ');
  }

  // Clean up multiple spaces
  filtered = filtered.replace(/\s+/g, ' ').trim();

  // Handle "I guess" specially - keep if followed by opinion
  // "energy is like a 7 I guess" -> keep "I guess" (indicates uncertainty)
  // "I guess um so anyway" -> remove "I guess"

  return filtered;
}
```

---

## 3.5 Context Analysis & Safety

### 3.5.1 Crisis Content Detection

This is the highest-priority intercept in the voice pipeline:

```typescript
interface CrisisDetection {
  crisisDetected: boolean;
  crisisType: 'suicidal_ideation' | 'self_harm' | 'violence' | 'none';
  severity: 'high' | 'medium' | 'low' | 'none';
  indicators: string[];
  recommendedAction: 'immediate_intervention' | 'gentle_check' | 'normal_processing';
}

const CRISIS_INDICATORS = {
  suicidal_ideation: {
    high: [
      "don't want to be here anymore",
      "ending it all",
      "better off without me",
      "want to die",
      "kill myself",
      "no point in living"
    ],
    medium: [
      "what's the point",
      "nobody would care",
      "can't take this anymore",
      "want it to stop",
      "disappear"
    ]
  },
  self_harm: {
    high: [
      "hurt myself",
      "cut myself",
      "harm myself"
    ],
    medium: [
      "punish myself",
      "deserve pain"
    ]
  }
};

// MUST be checked before any other processing
function detectCrisisContent(transcript: string): CrisisDetection {
  const lowerTranscript = transcript.toLowerCase();
  const indicators: string[] = [];
  let highestSeverity: 'high' | 'medium' | 'low' | 'none' = 'none';
  let crisisType: CrisisDetection['crisisType'] = 'none';

  // Check suicidal ideation - HIGH PRIORITY
  for (const phrase of CRISIS_INDICATORS.suicidal_ideation.high) {
    if (lowerTranscript.includes(phrase)) {
      indicators.push(phrase);
      highestSeverity = 'high';
      crisisType = 'suicidal_ideation';
    }
  }

  if (highestSeverity !== 'high') {
    for (const phrase of CRISIS_INDICATORS.suicidal_ideation.medium) {
      if (lowerTranscript.includes(phrase)) {
        indicators.push(phrase);
        if (highestSeverity === 'none') {
          highestSeverity = 'medium';
          crisisType = 'suicidal_ideation';
        }
      }
    }
  }

  // Check self-harm
  for (const phrase of CRISIS_INDICATORS.self_harm.high) {
    if (lowerTranscript.includes(phrase)) {
      // Check for historical context
      const historicalMarkers = ['used to', 'years ago', 'in the past', 'looking back'];
      const isHistorical = historicalMarkers.some(m => lowerTranscript.includes(m));

      if (!isHistorical) {
        indicators.push(phrase);
        highestSeverity = 'high';
        crisisType = 'self_harm';
      }
    }
  }

  return {
    crisisDetected: highestSeverity !== 'none',
    crisisType,
    severity: highestSeverity,
    indicators,
    recommendedAction:
      highestSeverity === 'high' ? 'immediate_intervention' :
      highestSeverity === 'medium' ? 'gentle_check' : 'normal_processing'
  };
}

// Crisis response protocol
async function handleCrisisDetection(
  detection: CrisisDetection,
  userId: string
): Promise<CrisisResponse> {
  if (detection.recommendedAction === 'immediate_intervention') {
    // DO NOT create normal entry
    // DO NOT award XP or mention gamification
    // Present crisis resources immediately

    return {
      responseType: 'crisis_intervention',
      message: `I hear you. Your life matters.

988 Suicide & Crisis Lifeline: Call or text 988
Crisis Text Line: Text HOME to 741741

Would you like me to help you reach out to someone?`,
      resources: [
        { name: '988 Lifeline', action: 'tel:988' },
        { name: 'Crisis Text', action: 'sms:741741' }
      ],
      entryCreated: false,
      gamificationSuspended: true,
      followUpScheduled: true
    };
  }

  return { responseType: 'normal_processing' };
}
```

### 3.5.2 Emotional Intensity Detection

For non-crisis emotional content:

```typescript
interface EmotionalAnalysis {
  intensity: 'low' | 'moderate' | 'high' | 'extreme';
  primaryEmotions: string[];
  context: string | null;
  supportNeeded: boolean;
  isCrisis: false;  // Already screened
}

const INTENSITY_MARKERS = {
  extreme: ['devastated', 'destroyed', 'unbearable', 'crushing', 'can\'t breathe'],
  high: ['overwhelming', 'furious', 'terrified', 'heartbroken', 'agonizing'],
  moderate: ['stressed', 'anxious', 'frustrated', 'sad', 'worried'],
  low: ['tired', 'meh', 'okay', 'fine', 'alright']
};

function analyzeEmotionalIntensity(transcript: string): EmotionalAnalysis {
  const lowerTranscript = transcript.toLowerCase();
  const detectedEmotions: string[] = [];
  let intensity: EmotionalAnalysis['intensity'] = 'low';

  // Check intensity markers
  for (const [level, markers] of Object.entries(INTENSITY_MARKERS)) {
    for (const marker of markers) {
      if (lowerTranscript.includes(marker)) {
        detectedEmotions.push(marker);
        if (
          (level === 'extreme' && intensity !== 'extreme') ||
          (level === 'high' && !['extreme', 'high'].includes(intensity)) ||
          (level === 'moderate' && intensity === 'low')
        ) {
          intensity = level as EmotionalAnalysis['intensity'];
        }
      }
    }
  }

  // Detect context
  const contextPatterns = [
    { pattern: /losing|lost|death|died|passed away/i, context: 'grief' },
    { pattern: /breakup|divorce|separated/i, context: 'relationship_loss' },
    { pattern: /fired|laid off|job/i, context: 'work_stress' },
    { pattern: /failed|failure|mistake/i, context: 'failure' },
    { pattern: /fight|argument|conflict/i, context: 'interpersonal_conflict' }
  ];

  let detectedContext: string | null = null;
  for (const { pattern, context } of contextPatterns) {
    if (pattern.test(transcript)) {
      detectedContext = context;
      break;
    }
  }

  return {
    intensity,
    primaryEmotions: detectedEmotions.slice(0, 3),
    context: detectedContext,
    supportNeeded: intensity === 'high' || intensity === 'extreme',
    isCrisis: false
  };
}
```

### 3.5.3 Cancellation Detection

Users must be able to cancel recordings at any point:

```typescript
const CANCELLATION_PHRASES = [
  'cancel',
  'stop',
  'delete',
  'discard',
  'never mind',
  'ignore this',
  'don\'t save',
  'oops',
  'wrong button'
];

interface CancellationDetection {
  shouldCancel: boolean;
  confidence: number;
  phrase: string | null;
}

function detectCancellation(transcript: string): CancellationDetection {
  const lowerTranscript = transcript.toLowerCase();

  // Check for cancellation at start of recording (accidental trigger)
  const startCancellation = CANCELLATION_PHRASES.some(phrase =>
    lowerTranscript.startsWith(phrase) ||
    lowerTranscript.startsWith('no ' + phrase) ||
    lowerTranscript.startsWith('wait ' + phrase)
  );

  if (startCancellation) {
    return {
      shouldCancel: true,
      confidence: 0.95,
      phrase: CANCELLATION_PHRASES.find(p => lowerTranscript.includes(p)) || null
    };
  }

  // Check for repeated cancellation words (user urgently cancelling)
  const cancellationCount = CANCELLATION_PHRASES.reduce((count, phrase) => {
    return count + (lowerTranscript.match(new RegExp(phrase, 'g')) || []).length;
  }, 0);

  if (cancellationCount >= 2) {
    return {
      shouldCancel: true,
      confidence: 0.90,
      phrase: 'multiple_cancellation_signals'
    };
  }

  return {
    shouldCancel: false,
    confidence: 0,
    phrase: null
  };
}

// Handler: Cancellation must be fast and complete
async function handleCancellation(): Promise<void> {
  // 1. Immediately stop recording
  // 2. Discard audio buffer
  // 3. No STT processing
  // 4. Brief confirmation only
  // 5. No analytics on cancelled content

  return {
    response: 'Cancelled',
    audioDiscarded: true,
    entryCreated: false
  };
}
```

---

## 3.6 Real-Time vs. Batch Processing

### 3.6.1 Processing Mode Selection

Different use cases require different processing approaches:

```typescript
type ProcessingMode = 'realtime' | 'nearline' | 'batch';

interface ProcessingModeConfig {
  mode: ProcessingMode;
  maxLatency: number;
  accuracyPriority: number;       // 0-1
  costSensitivity: number;        // 0-1
  useCases: string[];
}

const PROCESSING_MODES: Record<ProcessingMode, ProcessingModeConfig> = {
  realtime: {
    mode: 'realtime',
    maxLatency: 2000,
    accuracyPriority: 0.7,
    costSensitivity: 0.3,
    useCases: [
      'Active workout logging',
      'Driving with voice',
      'Quick mood checks',
      'Crisis detection (always)'
    ]
  },
  nearline: {
    mode: 'nearline',
    maxLatency: 10000,
    accuracyPriority: 0.85,
    costSensitivity: 0.5,
    useCases: [
      'Journal entries',
      'Meal logging with details',
      'Reflection capture',
      'Multi-entity batches'
    ]
  },
  batch: {
    mode: 'batch',
    maxLatency: 60000,
    accuracyPriority: 0.95,
    costSensitivity: 0.8,
    useCases: [
      'Bulk import from voice memos',
      'End-of-day summary processing',
      'Historical data reprocessing',
      'Quality improvement training'
    ]
  }
};

function selectProcessingMode(
  audioMetrics: AudioQualityMetrics,
  userContext: UserContext,
  contentSignals: ContentSignals
): ProcessingMode {
  // Crisis content always real-time
  if (contentSignals.potentialCrisis) {
    return 'realtime';
  }

  // User in active context (workout, driving) needs real-time
  if (userContext.activityState === 'active') {
    return 'realtime';
  }

  // Long entries benefit from better accuracy
  if (audioMetrics.durationMs > 30000) {
    return 'nearline';
  }

  // Bulk operations use batch
  if (contentSignals.bulkImport) {
    return 'batch';
  }

  // Default to real-time for responsiveness
  return 'realtime';
}
```

### 3.6.2 Streaming vs. Complete-Then-Process

```typescript
interface StreamingConfig {
  enabled: boolean;
  chunkDurationMs: number;
  overlapMs: number;
  minConfidenceForCommit: number;
}

const STREAMING_CONFIGS: Record<ProcessingMode, StreamingConfig> = {
  realtime: {
    enabled: true,
    chunkDurationMs: 1000,      // 1-second chunks
    overlapMs: 200,              // 200ms overlap for context
    minConfidenceForCommit: 0.75
  },
  nearline: {
    enabled: false,              // Process complete audio
    chunkDurationMs: 0,
    overlapMs: 0,
    minConfidenceForCommit: 0.85
  },
  batch: {
    enabled: false,
    chunkDurationMs: 0,
    overlapMs: 0,
    minConfidenceForCommit: 0.90
  }
};

// Streaming processor for real-time mode
class StreamingVoiceProcessor {
  private chunks: TranscriptionChunk[] = [];
  private committed: string = '';

  async processChunk(audioChunk: Float32Array): Promise<StreamingUpdate> {
    // Transcribe this chunk with overlap context
    const chunkResult = await this.transcribeChunk(audioChunk);
    this.chunks.push(chunkResult);

    // Determine what can be committed (high confidence, not at boundary)
    const committable = this.findCommittableSegments();

    if (committable.length > 0) {
      this.committed += ' ' + committable.map(s => s.text).join(' ');

      // Run quick crisis check on committed text
      const crisisCheck = detectCrisisContent(this.committed);
      if (crisisCheck.crisisDetected) {
        return {
          type: 'crisis_detected',
          action: 'interrupt_for_safety'
        };
      }
    }

    return {
      type: 'partial',
      committed: this.committed.trim(),
      pending: this.getPendingText(),
      confidence: this.getOverallConfidence()
    };
  }

  private findCommittableSegments(): TranscriptionChunk[] {
    // Segments with high confidence that aren't at chunk boundaries
    return this.chunks.filter(chunk =>
      chunk.confidence >= STREAMING_CONFIGS.realtime.minConfidenceForCommit &&
      !chunk.atBoundary
    );
  }
}
```

### 3.6.3 Offline Handling

When network is unavailable, the system must still function:

```typescript
interface OfflineCapabilities {
  localSTT: boolean;
  localParsing: boolean;
  queuedForSync: boolean;
  maxOfflineDuration: number;
}

class OfflineVoiceHandler {
  private pendingEntries: QueuedEntry[] = [];

  async processOffline(audio: Blob): Promise<OfflineResult> {
    // Use local Whisper.cpp
    const localSTT = STT_MODELS.find(m => m.provider === 'local')!;
    const transcript = await transcribeAudio(audio, localSTT, {
      offlineMode: true
    });

    // Use local entity classification (simpler rules-based)
    const entities = this.localEntityClassification(transcript.text);

    // Create entry locally
    const entry = await this.createLocalEntry(entities);

    // Queue for sync when online
    this.pendingEntries.push({
      entry,
      audio,
      transcript,
      createdAt: Date.now(),
      needsReprocessing: true  // Cloud processing for accuracy
    });

    return {
      entry,
      processedLocally: true,
      queuedForSync: true,
      offlineCapabilities: {
        localSTT: true,
        localParsing: true,
        queuedForSync: true,
        maxOfflineDuration: 24 * 60 * 60 * 1000  // 24 hours
      }
    };
  }

  async syncWhenOnline(): Promise<SyncResult> {
    const results: SyncResult[] = [];

    for (const pending of this.pendingEntries) {
      if (pending.needsReprocessing) {
        // Re-process with cloud models for accuracy
        const cloudResult = await this.reprocessWithCloud(pending);

        // Update local entry if significantly different
        if (this.significantDifference(pending.entry, cloudResult)) {
          await this.updateEntry(pending.entry.id, cloudResult);
          results.push({
            entryId: pending.entry.id,
            action: 'updated',
            changes: this.diffEntries(pending.entry, cloudResult)
          });
        }
      }
    }

    this.pendingEntries = [];
    return { synced: results.length, results };
  }
}
```

---

## 3.7 Voice-Specific Edge Cases

### 3.7.1 Environmental Challenges Matrix

Based on the 67 use cases from Phase 2H:

| Environment | Key Challenges | Mitigation Strategies |
|-------------|----------------|----------------------|
| Gym | Music, equipment clanking, echo | Aggressive noise reduction, music suppression, accept partial entries |
| Car | Road noise, engine, interruptions | Moderate noise reduction, detect driving context, limit follow-ups |
| Transit | Announcements, crowd, rumble | Aggressive noise reduction, speaker isolation, quick-capture mode |
| Office | Low ambient, privacy concerns | Whisper detection, local processing option, minimal UI feedback |
| Outdoor | Wind, traffic, variable noise | Wind filter, adaptive processing, connectivity buffering |
| Home | Children, pets, interruptions | Speaker diarization, interruption recovery, empathetic partial entries |
| Bathroom | Echo, fan noise | Echo cancellation, fan noise filter, batch biometric mode |
| Restaurant | Dishes, conversation, music | Speaker isolation, brief capture mode, music suppression |

### 3.7.2 Linguistic Edge Case Handling

| Edge Case | Detection | Resolution |
|-----------|-----------|------------|
| Self-correction | "no wait", "actually" | Use corrected value, log correction for training |
| Restart | "let me start over" | Discard pre-restart, parse post-restart only |
| Code-switching | Language detection | Multilingual STT, unified entity extraction |
| Stuttering | Repetition patterns | Silent normalization, never store patterns |
| Trailing off | Incomplete sentence + silence | Preserve as "forming thought", gentle follow-up |
| Sarcasm | Tone + content mismatch | Invert surface sentiment, empathetic response |
| Numeric ambiguity | Adjacent numbers | Domain context, pattern matching, ask if unclear |

### 3.7.3 Privacy-Specific Handling

```typescript
interface VoicePrivacySettings {
  localProcessingOnly: boolean;
  transcriptRetention: 'full' | 'summary' | 'none';
  audioRetention: 'never' | 'temporary' | 'optional';
  whisperAutoPrivacy: boolean;
  sensitiveTopicEncryption: boolean;
}

const PERSONA_PRIVACY_DEFAULTS: Record<PersonaType, VoicePrivacySettings> = {
  optimizer: {
    localProcessingOnly: false,
    transcriptRetention: 'full',
    audioRetention: 'optional',
    whisperAutoPrivacy: false,
    sensitiveTopicEncryption: true
  },
  dabbler: {
    localProcessingOnly: false,
    transcriptRetention: 'summary',
    audioRetention: 'never',
    whisperAutoPrivacy: true,
    sensitiveTopicEncryption: true
  },
  privacyFirst: {
    localProcessingOnly: true,
    transcriptRetention: 'none',
    audioRetention: 'never',
    whisperAutoPrivacy: true,
    sensitiveTopicEncryption: true
  },
  neurodivergent: {
    localProcessingOnly: false,
    transcriptRetention: 'full',
    audioRetention: 'temporary',
    whisperAutoPrivacy: true,
    sensitiveTopicEncryption: true
  },
  biohacker: {
    localProcessingOnly: false,
    transcriptRetention: 'full',
    audioRetention: 'optional',
    whisperAutoPrivacy: false,
    sensitiveTopicEncryption: true
  },
  reflector: {
    localProcessingOnly: false,
    transcriptRetention: 'full',
    audioRetention: 'temporary',
    whisperAutoPrivacy: true,
    sensitiveTopicEncryption: true
  }
};
```

---

## 3.8 Feedback & Follow-Up System

### 3.8.1 Persona-Appropriate Voice Responses

```typescript
interface VoiceResponseConfig {
  verbosity: 'minimal' | 'brief' | 'detailed';
  tone: 'technical' | 'casual' | 'supportive' | 'neutral';
  includeMetrics: boolean;
  suggestFollowUp: boolean;
}

const PERSONA_RESPONSE_CONFIGS: Record<PersonaType, VoiceResponseConfig> = {
  optimizer: {
    verbosity: 'detailed',
    tone: 'technical',
    includeMetrics: true,
    suggestFollowUp: true
  },
  dabbler: {
    verbosity: 'minimal',
    tone: 'casual',
    includeMetrics: false,
    suggestFollowUp: false
  },
  privacyFirst: {
    verbosity: 'minimal',
    tone: 'neutral',
    includeMetrics: false,
    suggestFollowUp: false
  },
  neurodivergent: {
    verbosity: 'brief',
    tone: 'supportive',
    includeMetrics: false,
    suggestFollowUp: true  // But gently, never pressure
  },
  biohacker: {
    verbosity: 'detailed',
    tone: 'technical',
    includeMetrics: true,
    suggestFollowUp: true
  },
  reflector: {
    verbosity: 'brief',
    tone: 'supportive',
    includeMetrics: false,
    suggestFollowUp: true
  }
};

function generateVoiceResponse(
  entry: CreatedEntry,
  persona: PersonaType,
  context: VoiceContext
): VoiceResponse {
  const config = PERSONA_RESPONSE_CONFIGS[persona];

  const templates: Record<PersonaType, (e: CreatedEntry) => string> = {
    optimizer: (e) => {
      const metrics = e.confidence ? ` (${(e.confidence * 100).toFixed(0)}% confidence)` : '';
      return `${e.entityType} logged${metrics}. ${e.xpGained} XP.`;
    },
    dabbler: (e) => `Got it!`,
    privacyFirst: (e) => `Logged.`,
    neurodivergent: (e) => {
      if (e.wasIncomplete) {
        return `Captured what you said. No pressure to add more.`;
      }
      return `Nice! ${e.entityType} logged.`;
    },
    biohacker: (e) => {
      const details = formatBiohackerDetails(e);
      return `Logged: ${details}`;
    },
    reflector: (e) => {
      if (e.isJournal) {
        return `Thought captured. It's there when you want to reflect.`;
      }
      return `Logged.`;
    }
  };

  return {
    text: templates[persona](entry),
    shouldSpeak: config.verbosity !== 'minimal',
    followUpScheduled: config.suggestFollowUp && entry.needsFollowUp
  };
}
```

### 3.8.2 Incomplete Entry Follow-Up

```typescript
interface FollowUpConfig {
  delayMinutes: number;
  maxAttempts: number;
  quietHoursRespect: boolean;
  contextAware: boolean;
}

const FOLLOW_UP_RULES: Record<string, FollowUpConfig> = {
  missing_fields: {
    delayMinutes: 30,
    maxAttempts: 2,
    quietHoursRespect: true,
    contextAware: true
  },
  low_confidence: {
    delayMinutes: 15,
    maxAttempts: 1,
    quietHoursRespect: true,
    contextAware: true
  },
  interrupted: {
    delayMinutes: 5,
    maxAttempts: 1,
    quietHoursRespect: false,  // User just got interrupted
    contextAware: true
  },
  emotional_capture: {
    delayMinutes: 120,  // Give space
    maxAttempts: 1,
    quietHoursRespect: true,
    contextAware: true
  }
};

class FollowUpScheduler {
  async scheduleFollowUp(
    entry: IncompleteEntry,
    reason: keyof typeof FOLLOW_UP_RULES,
    persona: PersonaType
  ): Promise<void> {
    const config = FOLLOW_UP_RULES[reason];

    // Never follow up for privacy-first users unless they opted in
    if (persona === 'privacyFirst') {
      return;
    }

    const prompt = this.generateFollowUpPrompt(entry, reason, persona);

    await this.queue.add({
      entryId: entry.id,
      prompt,
      scheduledFor: Date.now() + (config.delayMinutes * 60 * 1000),
      maxAttempts: config.maxAttempts,
      respectQuietHours: config.quietHoursRespect,
      contextCheck: config.contextAware
    });
  }

  private generateFollowUpPrompt(
    entry: IncompleteEntry,
    reason: string,
    persona: PersonaType
  ): string {
    const templates: Record<PersonaType, Record<string, string>> = {
      optimizer: {
        missing_fields: `Your ${entry.entityType} entry is missing ${entry.missingFields.join(', ')}. Want to complete it?`,
        low_confidence: `I parsed your entry as ${entry.entityType} (${entry.confidence}% confidence). Correct?`
      },
      dabbler: {
        missing_fields: `Quick follow-up on your ${entry.entityType}—anything to add?`,
        low_confidence: `Just checking: was that a ${entry.entityType}?`
      },
      neurodivergent: {
        missing_fields: `Earlier you logged a ${entry.entityType}. Want to add anything? Totally fine if not!`,
        low_confidence: `No rush, but I wanted to check if I got your entry right.`
      },
      // ... other personas
    };

    return templates[persona]?.[reason] || `Follow up on ${entry.entityType}?`;
  }
}
```

---

## 3.9 Performance & Cost Optimization

### 3.9.1 STT Cost Management

```typescript
interface CostMetrics {
  audioMinutesProcessed: number;
  cloudCost: number;
  localProcessingPct: number;
  averageCostPerEntry: number;
}

const COST_TARGETS = {
  maxCostPerMinute: 0.01,        // USD
  targetLocalRatio: 0.6,         // 60% local processing
  maxMonthlyBudget: 50           // USD per user
};

function optimizeSTTCosts(
  monthlyUsage: CostMetrics,
  userSettings: UserSettings
): CostOptimizationPlan {
  const recommendations: string[] = [];

  // If over budget, increase local processing
  if (monthlyUsage.cloudCost > COST_TARGETS.maxMonthlyBudget * 0.8) {
    recommendations.push('Increase local STT threshold');
  }

  // If local ratio too low, adjust quality thresholds
  if (monthlyUsage.localProcessingPct < COST_TARGETS.targetLocalRatio) {
    recommendations.push('Lower cloud STT quality threshold');
  }

  return {
    adjustedThresholds: calculateNewThresholds(monthlyUsage),
    recommendations,
    projectedSavings: calculateProjectedSavings(monthlyUsage)
  };
}
```

### 3.9.2 Latency Optimization

```typescript
// Parallel processing where possible
async function processVoiceInput(audio: Blob): Promise<ProcessingResult> {
  const audioBuffer = await audio.arrayBuffer();
  const float32 = convertToFloat32(audioBuffer);

  // Stage 1: Parallel initial analysis
  const [qualityMetrics, environmentClass, vadResult] = await Promise.all([
    assessAudioQuality(float32, 16000),
    classifyEnvironment(float32),
    detectVoiceActivity(float32, 16000)
  ]);

  // Stage 2: STT (blocking, longest step)
  const sttModel = selectSTTModel(qualityMetrics, userSettings, environmentClass.environment);
  const transcript = await transcribeAudio(audio, sttModel, {});

  // Stage 3: Parallel post-processing
  const [crisisCheck, corrections, emotional] = await Promise.all([
    detectCrisisContent(transcript.text),
    detectAndApplyCorrections(transcript.text),
    analyzeEmotionalIntensity(transcript.text)
  ]);

  // Crisis handling interrupts normal flow
  if (crisisCheck.crisisDetected) {
    return handleCrisisDetection(crisisCheck, userId);
  }

  // Stage 4: Entity classification
  const entities = await classifyEntities(corrections.cleanedTranscript, {
    emotional,
    quality: qualityMetrics
  });

  return {
    transcript,
    entities,
    metadata: {
      quality: qualityMetrics,
      environment: environmentClass,
      emotional,
      corrections: corrections.correctionsApplied
    }
  };
}
```

---

## 3.10 Testing & Validation

### 3.10.1 Voice Pipeline Test Suite

```typescript
interface VoiceTestCase {
  id: string;
  category: 'environmental' | 'linguistic' | 'safety' | 'privacy';
  audio: string;  // Path to test audio file
  expectedTranscript: string;
  expectedEntities: ExpectedEntity[];
  acceptableLatencyMs: number;
  persona: PersonaType;
}

const VOICE_TEST_SUITE: VoiceTestCase[] = [
  // Environmental tests
  {
    id: 'ENV-001',
    category: 'environmental',
    audio: 'test_audio/gym_background_music.wav',
    expectedTranscript: 'bench press three sets of eight at 185',
    expectedEntities: [{ type: 'workout', exercise: 'bench_press', sets: 3, reps: 8, weight: 185 }],
    acceptableLatencyMs: 3000,
    persona: 'biohacker'
  },
  // Self-correction tests
  {
    id: 'LING-001',
    category: 'linguistic',
    audio: 'test_audio/self_correction.wav',
    expectedTranscript: 'sleep was 7.5 hours',  // After correction
    expectedEntities: [{ type: 'sleep', duration: 7.5 }],
    acceptableLatencyMs: 2000,
    persona: 'optimizer'
  },
  // Crisis detection tests
  {
    id: 'SAFE-001',
    category: 'safety',
    audio: 'test_audio/crisis_content.wav',
    expectedTranscript: null,  // Should not process
    expectedEntities: [],      // Should not create entries
    acceptableLatencyMs: 500,  // Must be fast
    persona: 'any',
    expectedResponse: 'crisis_intervention'
  }
];

async function runVoiceTestSuite(): Promise<TestResults> {
  const results: TestResult[] = [];

  for (const testCase of VOICE_TEST_SUITE) {
    const startTime = Date.now();
    const result = await processVoiceInput(loadTestAudio(testCase.audio));
    const latency = Date.now() - startTime;

    results.push({
      testId: testCase.id,
      passed: validateResult(result, testCase),
      latency,
      latencyAcceptable: latency <= testCase.acceptableLatencyMs,
      details: generateTestDetails(result, testCase)
    });
  }

  return summarizeResults(results);
}
```

### 3.10.2 Quality Metrics Dashboard

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| STT Word Error Rate | < 5% | > 10% |
| Entity Extraction Accuracy | > 92% | < 85% |
| Crisis Detection Recall | > 99% | < 95% |
| Average E2E Latency | < 2.5s | > 4s |
| Local Processing Ratio | > 60% | < 40% |
| User Satisfaction (voice) | > 4.2/5 | < 3.8/5 |
| Follow-up Completion Rate | > 30% | < 15% |

---

## 3.11 Conclusion

The Voice Handling Architecture for Insight 5.2 provides a comprehensive, production-ready solution for transforming spoken input into structured life data. Key architectural decisions include:

1. **Multi-Stage Pipeline:** Seven distinct stages with clear responsibilities and failure modes
2. **Environment Adaptation:** Automatic detection and adjustment for 10+ recording environments
3. **Linguistic Robustness:** Handling of self-corrections, restarts, code-switching, and disfluencies
4. **Safety First:** Priority crisis detection with immediate intervention capabilities
5. **Privacy by Design:** Local processing options, whisper detection, and persona-specific privacy tiers
6. **Graceful Degradation:** Offline capability, partial entry handling, and connectivity buffering
7. **Persona Awareness:** Response style and follow-up behavior matched to user preferences

The system is designed to make voice input feel natural and reliable across all contexts—from the gym floor to the quiet bedroom—while respecting user privacy and maintaining safety as the top priority.

---

**Document Statistics:**
- Total Word Count: ~8,200 words
- Code Examples: 25+ TypeScript snippets
- Tables: 8 reference tables
- Architecture Diagrams: 3 ASCII diagrams
- Use Case Coverage: Comprehensive coverage of 67 Phase 2H use cases
