# Specification: Parsing Engine Analysis and Optimization

## Overview

Analyze and optimize the Insight parsing engine to intelligently categorize natural language input into five distinct entity types (tasks, events, notes, trackers, and habits). The optimized engine should support action-based state updates (e.g., checking off habits when completed), automatic project linking with confidence-based thresholds, and context-aware task pane updates. This is a two-phase deliverable: Phase 1 analyzes the current architecture and identifies weaknesses; Phase 2 designs and implements improvements to make the parser production-ready and robust.

## Workflow Type

**Type**: feature

**Rationale**: This task involves both analysis of existing code and implementation of new parsing logic enhancements. The scope includes analyzing current architecture, identifying gaps, and implementing optimizations for entity classification, auto-linking, and action triggers - characteristic of a feature enhancement workflow.

## Task Scope

### Services Involved
- **parser** (primary) - Core parsing package with classification, confidence scoring, and context loading
- **desktop** (primary) - NLP parsing implementation with rule-based and LLM-based parsers
- **shared** (reference) - Shared types and utilities

### This Task Will:
- [ ] Analyze current dual-parser architecture (rule-based + LLM-based)
- [ ] Document classification pipeline flow and entity detection logic
- [ ] Identify gaps in habit completion detection and auto-check-off
- [ ] Analyze confidence-based auto-linking implementation
- [ ] Design optimization plan for robust entity classification
- [ ] Implement habit completion detection with automatic state updates
- [ ] Enhance project auto-linking with confidence tiers
- [ ] Add "notes" as a distinct entity type

### Out of Scope:
- UI/UX changes to the task pane or calendar views
- Database schema migrations
- Mobile app parser implementations
- Voice transcription improvements

## Service Context

### Parser Package

**Tech Stack:**
- Language: TypeScript
- Framework: None (pure library)
- Key directories: `src/pipeline/`, `src/confidence/`, `src/context/`

**Entry Point:** `packages/parser/src/index.ts`

**How to Run:**
```bash
cd packages/parser && npm run build
```

**Key Components:**
- `pipeline/classifier.ts` - Entity classification rules
- `pipeline/entity-extractor.ts` - Entity extraction
- `confidence/scorer.ts` - Confidence scoring
- `confidence/thresholds.ts` - Tier thresholds (HIGH >= 0.85, MEDIUM >= 0.50, LOW < 0.50)
- `context/habit-context.ts` - Habit loading and matching
- `context/project-context.ts` - Project/goal linking

### Desktop App

**Tech Stack:**
- Language: TypeScript
- Framework: React + Vite
- Key directories: `src/nlp/`, `src/storage/`, `src/db/`

**Entry Point:** `apps/desktop/src/App.tsx`

**How to Run:**
```bash
cd apps/desktop && npm run dev
```

**Port:** 5174

**Key NLP Files:**
- `src/nlp/natural.ts` - Rule-based parser (chrono-node)
- `src/nlp/llm-parse.ts` - LLM-based parser (OpenAI)

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `packages/parser/src/pipeline/classifier.ts` | parser | Add habit classification patterns and note entity detection |
| `packages/parser/src/types.ts` | parser | Add HabitCompletion and Note entity types |
| `packages/parser/src/context/habit-context.ts` | parser | Add habit completion detection with fuzzy matching |
| `packages/parser/src/confidence/scorer.ts` | parser | Add auto-link confidence calculation |
| `apps/desktop/src/nlp/natural.ts` | desktop | Integrate habit completion triggers |
| `apps/desktop/src/nlp/llm-parse.ts` | desktop | Add habit/note parsing to LLM prompt |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `packages/parser/src/pipeline/classifier.ts` | Rule-based classification with weighted patterns |
| `packages/parser/src/confidence/thresholds.ts` | Confidence tier system |
| `packages/parser/src/context/project-context.ts` | Fuzzy matching and context loading |
| `apps/desktop/src/nlp/llm-parse.ts` | LLM prompt engineering for entity extraction |

## Patterns to Follow

### Classification Rules Pattern

From `packages/parser/src/pipeline/classifier.ts`:

```typescript
type ClassifierRule = {
  entityClass: EntityClass
  patterns: RegExp[]
  weight: number
}

const CLASSIFIER_RULES: ClassifierRule[] = [
  {
    entityClass: 'task',
    patterns: [
      /\b(need\s+to|have\s+to|gotta|got\s+to)\b/i,
      /\b(todo|to-do|task|reminder)\b/i,
      /\b(should|must|ought\s+to)\b/i,
    ],
    weight: 0.9,
  },
]
```

**Key Points:**
- Each entity class has weighted regex patterns
- Higher weights for stronger signal patterns
- Confidence calculated from pattern matches / max possible score

### Confidence Tier System

From `packages/parser/src/confidence/thresholds.ts`:

```typescript
export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  high: 0.85,   // Safe to auto-apply
  medium: 0.50, // Suggest to user
}

export function getTier(value: number, thresholds: ThresholdConfig): ConfidenceTier {
  if (value >= thresholds.high) return 'HIGH'
  if (value >= thresholds.medium) return 'MEDIUM'
  return 'LOW'
}
```

**Key Points:**
- HIGH tier (>= 0.85): Auto-apply without user confirmation
- MEDIUM tier (>= 0.50): Suggest to user for confirmation
- LOW tier (< 0.50): Require explicit user confirmation

### Habit Context Fuzzy Matching

From `packages/parser/src/context/habit-context.ts`:

```typescript
export function matchHabitFuzzy(ctx: HabitContext, query: string): HabitDef[] {
  const normalized = normalizeForLookup(query)
  return ctx.habits.filter(h =>
    normalizeForLookup(h.name).includes(normalized) ||
    h.tags.some(t => normalizeForLookup(t).includes(normalized)) ||
    (h.category && normalizeForLookup(h.category).includes(normalized))
  )
}
```

**Key Points:**
- Normalize strings for case-insensitive matching
- Match against name, tags, and category
- Return all matching habits for confidence scoring

## Requirements

### Functional Requirements

1. **Entity Classification (5 Types)**
   - Description: Parser must classify input into tasks, events, notes, trackers, or habits
   - Acceptance: Given input "I need to call mom tomorrow", output is classified as task with HIGH confidence

2. **Habit Completion Detection**
   - Description: When user states they completed a habit (e.g., "I did my workout", "meditated for 10 min"), automatically mark the habit as completed
   - Acceptance: Given existing habit "workout" and input "did my workout", habit is checked off

3. **Auto-Linking with Confidence Tiers**
   - Description: Automatically link parsed entities to related projects based on confidence scoring
   - Acceptance: Given project "Home Renovation" and input "buy paint for house", parser links to project with confidence >= 0.50

4. **Task Pane Context Updates**
   - Description: When task is parsed, update task pane with all extracted context (people, location, project, due date)
   - Acceptance: Given input "meet @john at !office tomorrow about project alpha", task shows John, Office, tomorrow, and Project Alpha

5. **Notes Entity Support**
   - Description: Add support for "notes" as a distinct entity type for general information capture
   - Acceptance: Given input "note: remember to check the weather", output is classified as note entity

### Edge Cases

1. **Ambiguous Classification** - When input matches multiple entity types (e.g., "workout at 3pm" = habit + event), prefer most specific type based on context
2. **Partial Habit Match** - When habit name partially matches (e.g., "worked out" vs "workout"), use fuzzy matching with lower confidence
3. **No Project Match** - When no project matches, don't auto-link; leave project field null
4. **Conflicting Tense** - When past tense conflicts with future time (e.g., "I went to gym tomorrow"), use explicit time over tense inference
5. **Multiple Habits in Input** - When multiple habits detected, create separate completion events for each

## Implementation Notes

### DO
- Follow the pattern in `classifier.ts` for adding habit/note classification rules
- Reuse `matchHabitFuzzy` for habit completion detection
- Use confidence tier system for auto-linking decisions
- Add new entity types to `packages/parser/src/types.ts`
- Maintain backward compatibility with existing parse results

### DON'T
- Create new classification systems when existing patterns work
- Auto-apply changes at LOW confidence tier
- Modify database schema without migration plan
- Remove existing entity types or change their structure

## Development Environment

### Start Services

```bash
# Start desktop app (primary development)
cd apps/desktop && npm run dev

# Run parser tests
cd packages/parser && npm test

# Build all packages
npm run build
```

### Service URLs
- Desktop App: http://localhost:5174

### Required Environment Variables
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `VITE_OPENAI_API_KEY`: OpenAI API key for LLM parsing
- `VITE_OPENAI_MODEL`: Model name (default: gpt-4.1-mini)

## Success Criteria

The task is complete when:

1. [ ] Analysis document produced identifying all parsing pipeline components
2. [ ] Classification rules added for habit completion detection
3. [ ] Auto-linking implemented with confidence tier thresholds
4. [ ] Notes entity type added to parser types
5. [ ] Habit completion triggers automatic check-off
6. [ ] No console errors during parsing
7. [ ] Existing tests still pass
8. [ ] New functionality verified via desktop app

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Habit Classification | `packages/parser/src/pipeline/classifier.test.ts` | Habit patterns detected correctly |
| Confidence Scoring | `packages/parser/src/confidence/scorer.test.ts` | Tier thresholds applied correctly |
| Habit Fuzzy Match | `packages/parser/src/context/habit-context.test.ts` | Fuzzy matching returns expected habits |
| Note Entity Detection | `packages/parser/src/pipeline/classifier.test.ts` | Note patterns detected with correct confidence |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Parse → Habit Check | parser ↔ desktop | Habit completion triggers state update |
| Parse → Project Link | parser ↔ desktop | Auto-linking applies at correct confidence |
| Natural → LLM Fallback | natural ↔ llm-parse | Rule-based parser falls back to LLM correctly |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Habit Completion | 1. Create habit "workout" 2. Input "I did my workout" 3. Check habit status | Habit marked as completed |
| Task with Project | 1. Create project "Home" 2. Input "buy paint for home" 3. Check task | Task linked to "Home" project |
| Note Creation | 1. Input "note: important meeting notes" 2. Check notes list | Note entity created |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Capture Input | `http://localhost:5174/` | Parser handles all 5 entity types |
| Task Pane | `http://localhost:5174/` | Tasks show linked projects |
| Habits View | `http://localhost:5174/` | Habits check off when mentioned as completed |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Habit completion stored | IndexedDB → habits table | completedAt timestamp set |
| Task-project link stored | IndexedDB → tasks table | projectId populated |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete
- [ ] Database state verified
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns
- [ ] No security vulnerabilities introduced

## Analysis Findings (Phase 1 Output)

### Current Architecture Summary

The parser uses a **dual-parser architecture**:

1. **Rule-Based Parser** (`natural.ts`):
   - Uses chrono-node for time parsing
   - Regex patterns for entity extraction
   - Handles: time ranges, durations, dayparts, mood, money, workout sets, meals, hydration
   - Fast, predictable, no API costs

2. **LLM-Based Parser** (`llm-parse.ts`):
   - Uses OpenAI GPT-4.1-mini
   - JSON schema extraction with detailed system prompt
   - Handles complex natural language understanding
   - Higher cost, higher accuracy for ambiguous input

### Classification Pipeline

```
Input Text
    ↓
splitCandidatePhrases() → Break into phrases
    ↓
For each phrase:
    ├── parseMood() → Mood tracker
    ├── parseTimeRange() → Explicit times → Event
    ├── looksLikePastTense() → Past actions → Log
    ├── looksLikeImperative() → Future intent → Task
    └── classify() → Entity class detection
    ↓
Output: { tasks: [], events: [], entities: [] }
```

### Identified Gaps

1. **No Habit Completion Detection**: Habits are defined in context but no automatic detection of "I did X" → check off habit
2. **Missing Notes Entity**: Notes captured as event notes, not standalone entity
3. **Confidence Not Used for Auto-Linking**: Confidence tiers defined but not wired to auto-linking decisions
4. **Task Pane Not Integrated**: Parsed tasks don't automatically populate task pane with full context

### Confidence Tier Thresholds

| Tier | Score | Action |
|------|-------|--------|
| HIGH | >= 0.85 | Auto-apply (safe) |
| MEDIUM | >= 0.50 | Suggest to user |
| LOW | < 0.50 | Require confirmation |

### Recommended Optimizations

1. Add `habit` entity class to classifier with completion patterns
2. Add `note` entity class with patterns like "note:", "remember:", "fyi:"
3. Wire confidence scorer to project auto-linking in `project-context.ts`
4. Add habit completion action triggers in desktop NLP layer
5. Enhance LLM prompt with habit and note extraction
