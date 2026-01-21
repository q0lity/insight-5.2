# AI/NLP Features Research Analysis

**Document Version:** 1.0
**Date:** January 20, 2026
**Bead:** hq-bge
**Status:** Research Complete

---

## Executive Summary

This research document analyzes the AI/NLP features documented across the CONVOY3 specification suite to identify the comprehensive NLP architecture for Insight 5.2. The CONVOY3 documents (S1-S5) provide production-ready specifications for voice-first natural language processing across 603 documented use cases.

**Key Finding:** The design specs have a gap at position 05. Current specs are: 01 (Product/UX), 02 (Data Model), 03 (Backend API), 04 (Client Architecture), 07 (Security/Privacy). A dedicated **05-ai-nlp-features-spec** would consolidate the dispersed AI/NLP specifications from CONVOY3 into an authoritative design document.

---

## 1. CONVOY3 AI/NLP Architecture Overview

### 1.1 Document Coverage

| Section | Title | Word Count | AI/NLP Focus |
|---------|-------|------------|--------------|
| S1 | Executive Summary | ~8K | Use case taxonomy, coverage matrix |
| S2 | LLM Parsing Engine | ~8K | Core parsing pipeline, intent classification |
| S3 | Voice Handling | ~8K | STT, audio processing, environment classification |
| S4 | Entity Crossover Prevention | ~8K | Disambiguation, conflict resolution, signal extraction |
| S5 | Misconstrued Input Handling | ~8K | Ambiguity detection, clarification flows, fallback strategies |

**Total Coverage:** ~40K words of NLP specification across 5 sections.

### 1.2 Architectural Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    INSIGHT 5.2 NLP STACK                        │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 5: User Feedback & Recovery                               │
│   - Clarification flows (S5)                                    │
│   - Undo/edit mechanisms                                        │
│   - Persona-appropriate messaging                               │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 4: Entity Creation & XP Calculation                       │
│   - Entity factory pattern (S4)                                 │
│   - XP attribution without double-counting                      │
│   - Facets system for dual-nature entities                      │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 3: Disambiguation & Conflict Resolution                   │
│   - Signal priority matrix (S4)                                 │
│   - Crossover prevention rules                                  │
│   - Context isolation patterns                                  │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 2: Intent Classification & Extraction                     │
│   - Primary intent detection (S2)                               │
│   - Multi-entity extraction (S4)                                │
│   - Temporal resolution                                         │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 1: Pre-Parsing & Signal Extraction                        │
│   - Regex-based extraction (#trackers, @mentions, !locations)   │
│   - Workout signal patterns (S4)                                │
│   - Nutrition signal patterns                                   │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 0: Voice Input Processing                                 │
│   - Speech-to-text (Whisper API) (S3)                          │
│   - Audio environment classification                            │
│   - Crisis term detection                                       │
│   - Self-correction handling (S5)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Core AI/NLP Features Identified

### 2.1 Voice Processing (S3)

**Speech-to-Text Pipeline:**
- Primary: OpenAI Whisper API
- Fallback: Device-native STT
- Audio quality assessment before processing
- Language detection and handling

**Audio Intelligence:**
- Environment noise classification (quiet/moderate/noisy)
- Speech duration vs silence ratio analysis
- Interrupted speech detection
- Multi-speaker detection (future consideration)

**Crisis Detection:**
- Real-time scanning for crisis vocabulary
- Immediate routing to crisis response flow
- Keyword list: harm, suicide, emergency indicators
- Persona-sensitive response triggers

### 2.2 Intent Classification (S2)

**Entity Type Detection:**
| Type | Priority | Key Signals |
|------|----------|-------------|
| Command | 100 | "Create habit", "Log workout", explicit instructions |
| Query | 90 | "Show me", "What's my", information requests |
| Explicit Tracker | 85 | #key(value) syntax |
| Task | 82 | "Need to", "Remember to", future intent |
| Workout | 80 | Exercise vocabulary, sets/reps/weight patterns |
| Nutrition | 70 | Meal words, food items, "ate", "had for" |
| Habit | 60 | "Did my", possession + activity completion |
| Mood | 50 | "Feeling", sentiment words, explicit rating |
| Event | 40 | Time anchors, @mentions, !locations |
| Journal | 30 | Long-form, narrative, reflection |

**Confidence Thresholds:**
- ≥0.85: Auto-create with minimal feedback
- 0.70-0.84: Suggest with confirmation option
- 0.50-0.69: Present alternatives, ask for selection
- <0.50: Request clarification

### 2.3 Signal Extraction (S4)

**Workout Signals:**
```typescript
// Exercise vocabulary (compound, isolation, cardio, functional)
// Metric patterns: /(\d+)\s*[xX×]\s*(\d+)/ (sets x reps)
// Weight: /(\d+(?:\.\d+)?)\s*(lbs?|kg|pounds?)/
// Distance: /(\d+(?:\.\d+)?)\s*(miles?|km|meters?)/
// Pace: /(\d+):(\d{2})\s*(pace|min\/mile)/
// RPE: /\brpe\s*(\d+)/
```

**Mood Signals:**
- Explicit: `#mood(N)`, `mood is N`, `energy N`
- Sentiment vocabulary (very_positive → very_negative)
- Context prefixes: "feeling", "felt", "I am"

**Habit Signals:**
- Completion: "did my X", "finished my X", "completed X"
- Creation: "start tracking", "new habit"
- Streak: "streak", "X days in a row"

### 2.4 Entity Crossover Prevention (S4)

**Problem Categories:**
1. Data Bleeding - mood data in workout entity
2. Classification Confusion - "Reading for 30 minutes" (Habit vs Event)
3. Duplicate Creation - same activity creates multiple entities
4. Context Contamination - location applied to wrong entity
5. XP Double-Counting - same effort awarded twice

**Resolution Mechanisms:**
- Signal priority hierarchy (deterministic)
- Span ownership tracking (prevents double-extraction)
- Effort key generation (prevents XP gaming)
- Facets system (dual-nature entities without duplication)
- Temporal context sharing (single resolution, applied to all)

### 2.5 Ambiguity Handling (S5)

**Ambiguity Categories:**
1. **Temporal** - past/present/future unclear
2. **Entity Type** - multiple valid interpretations
3. **Self-Correction** - "mood 7 no wait 8"
4. **Incomplete Thought** - trailing off, interruption

**Clarification Flows (Persona-Adapted):**
| Persona | Approach | Threshold | Message Style |
|---------|----------|-----------|---------------|
| Optimizer | Precision-first | 0.85 | Show entity breakdown, XP split |
| Dabbler | Minimal friction | 0.50 | "Got it! Logged." |
| Neurodivergent | Patient | 0.70 | "I logged what I understood. Adjust later." |
| Biohacker | Metric precision | 0.90 | Full tracker list, biometrics display |

**Self-Correction Detection:**
```typescript
// Patterns: "no wait", "actually", "I mean", "scratch that"
// Chained corrections: "8... no 7... actually 6" → use final value
// Confidence-weighted application
```

### 2.6 Negation Handling (S4 Amendment)

**Detection Patterns:**
- "didn't", "skipped", "missed", "forgot"
- "too tired/busy/sick to"
- "wasn't able to"

**Handling:**
- Create `habit_skip` record (not completion)
- Evaluate streak protection (freeze tokens, grace reasons)
- No XP awarded for skipped activities

---

## 3. Technical Specifications

### 3.1 Pre-Parse Regex Patterns

| Pattern Type | Regex | Example |
|--------------|-------|---------|
| Explicit Tracker | `/#([a-z]+)\(([^)]+)\)/gi` | #mood(8) |
| Person Mention | `/@(\w+)/g` | @sarah |
| Location | `/!(\w+)/g` | !gym |
| Time Anchor | `/at\s+\d{1,2}(:\d{2})?\s*(am\|pm)?/i` | at 3pm |
| Duration | `/for\s+\d+\s+(hours?\|minutes?)/i` | for 45 minutes |
| Sets x Reps | `/(\d+)\s*[xX×]\s*(\d+)/g` | 4x8 |
| Weight | `/(\d+(?:\.\d+)?)\s*(lbs?\|kg)/gi` | 185lbs |

### 3.2 LLM Prompt Architecture

**System Prompt Structure:**
1. Role definition (intent classifier for life-logging)
2. Domain context (entity types, user persona)
3. Output schema (structured JSON)
4. Confidence requirements
5. Ambiguity handling instructions

**Prompt Optimization:**
- Domain-specific examples in few-shot
- Persona-adapted tone instructions
- Strict output format enforcement

### 3.3 Confidence Calculation

```typescript
// Multi-factor confidence scoring
interface ConfidenceFactors {
  signalStrength: number;      // Number and strength of detected signals
  patternMatch: number;        // How well input matches known patterns
  contextAlignment: number;    // User history correlation
  llmConfidence: number;       // Model-reported confidence
  negativeSignals: number;     // Conflicting signals penalty
}

confidence = weighted_average(factors) - penalty(conflicts)
```

---

## 4. Gap Analysis: What's Missing for Spec 05

### 4.1 Current State

The CONVOY3 documents are **implementation-focused** (code examples, type definitions). They lack:

1. **Product Requirements** - Why these features exist, user stories
2. **Non-Functional Requirements** - Performance targets, latency SLAs
3. **API Contracts** - Endpoint specifications for NLP services
4. **Integration Points** - How NLP connects to sync, storage, scoring
5. **Versioning Strategy** - How models/prompts will be updated
6. **Fallback Architecture** - Detailed offline NLP capabilities
7. **Privacy Considerations** - Data retention, processing locations

### 4.2 Recommended Spec 05 Outline

```
05-ai-nlp-features-spec.md
├── 1. Executive Summary
├── 2. Feature Requirements
│   ├── 2.1 Voice Input Processing
│   ├── 2.2 Intent Classification
│   ├── 2.3 Entity Extraction
│   ├── 2.4 Disambiguation
│   └── 2.5 Feedback & Recovery
├── 3. Technical Architecture
│   ├── 3.1 NLP Pipeline Stages
│   ├── 3.2 LLM Integration Points
│   ├── 3.3 Offline Capabilities
│   └── 3.4 Performance Requirements
├── 4. API Specifications
│   ├── 4.1 Voice Processing API
│   ├── 4.2 Intent Classification API
│   └── 4.3 Entity Extraction API
├── 5. Data Models
│   ├── 5.1 Intent Types
│   ├── 5.2 Extraction Results
│   └── 5.3 Confidence Scores
├── 6. Integration Points
│   ├── 6.1 Client Integration
│   ├── 6.2 Backend Integration
│   └── 6.3 Sync Layer Impact
├── 7. Privacy & Security
│   ├── 7.1 Voice Data Handling
│   ├── 7.2 LLM Data Policies
│   └── 7.3 On-Device Processing
└── 8. Implementation Phases
```

### 4.3 CONVOY3 Content Reuse

| CONVOY3 Section | Spec 05 Destination | Transformation Needed |
|-----------------|---------------------|----------------------|
| S1 Use Cases | §2 Feature Requirements | Extract user stories |
| S2 LLM Parsing | §3 Architecture, §4 APIs | Add NFRs, SLAs |
| S3 Voice | §3.1 Pipeline, §4.1 Voice API | Add latency targets |
| S4 Entity | §5 Data Models, §3.2 Integration | Add schemas |
| S5 Misconstrued | §2.4-2.5 Requirements | Convert to user stories |

---

## 5. Key Findings Summary

### 5.1 Strengths of Current Design

1. **Comprehensive Coverage** - 603 use cases across 9 domains
2. **Production-Ready Code** - TypeScript interfaces with implementation patterns
3. **Persona Adaptation** - Different experiences for Optimizer, Dabbler, Neurodivergent, Biohacker
4. **Conflict Resolution** - Deterministic priority hierarchy prevents ambiguity
5. **XP Integrity** - Effort-based attribution prevents gaming

### 5.2 Areas Requiring Further Definition

1. **Offline NLP** - What happens when LLM unavailable?
2. **Model Selection** - Which LLM(s) for which tasks?
3. **Latency Budgets** - Voice input → entity creation target time
4. **Learning Loop** - How does user feedback improve classification?
5. **i18n** - Multi-language support architecture

### 5.3 Recommended Next Steps

1. **Create 05-ai-nlp-features-spec** - Consolidate CONVOY3 into authoritative spec
2. **Define Performance SLAs** - Voice-to-entity latency targets
3. **Document Offline Mode** - On-device parsing capabilities
4. **Plan LLM Evolution** - Versioning strategy for prompts/models

---

## 6. Appendix: Source Document References

### CONVOY3 Documents Analyzed

1. `CONVOY3_S1_EXEC_SUMMARY.md` - Use case taxonomy, persona definitions
2. `CONVOY3_S2_LLM_PARSING.md` - Intent classification, parsing pipeline
3. `CONVOY3_S3_VOICE.md` - STT, audio processing, crisis detection
4. `CONVOY3_S4_ENTITY_CROSSOVER.md` - Disambiguation, conflict resolution
5. `CONVOY3_S5_MISCONSTRUED.md` - Ambiguity handling, clarification flows

### Related Specifications

- `04-client-architecture-spec-2026-01.md` - NLP integration points in clients
- Desktop `nlp/` directory - Natural language parsing implementation
- Desktop `learning/` directory - Adaptive pattern learning

---

**Research Completed By:** mediocre (polecat/witness)
**Bead:** hq-bge
**Date:** 2026-01-20
