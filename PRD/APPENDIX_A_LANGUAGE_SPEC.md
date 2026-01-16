# Appendix A — Language Spec (Markdown/YAML + Tokens)

## A1) Purpose
Insight 5 uses a “portable language” so that:
- Voice parsing produces deterministic structured output.
- UI edits can be reflected back into a stable text format.
- Data can be exported/imported without locking into a proprietary schema.

Canonical storage is still Supabase Postgres; Markdown/YAML is a representation.

## A2) Core Conventions
- YAML frontmatter uses **camelCase** keys.
- Datetimes are ISO-8601 with timezone.
- Arrays are preferred for multi-valued fields (`tags`, `contexts`, `people`, `facets`).
- Token strings are preserved verbatim when present.

## A3) Required YAML Keys by Facet (MVP)
### `event`
- `startAt` (required if time-bounded)
- `endAt` (optional; if absent, event may be “active” or “instant”)
- `durationMinutes` (optional; derived from start/end or timer)

### `task`
- `status` (`open|in_progress|done|canceled`)
- `scheduled` (optional date)
- `due` (optional date)

### `habit`
- `habitKey` or `habitTitle` (optional in MVP; preferred in Phase 1.5)
- `streakPolicy` (optional; default “once per day”)

### `tracker`
- `trackers` list and/or token strings

### `note`
- `bodyMarkdown` text
- `segments` (stored in DB; optional to embed as bullet list)

## A4) Shared YAML Keys (MVP)
- `title` (required)
- `facets` (required)
- `tags` (optional; hierarchical supported)
- `contexts` (optional)
- `people` (optional)
- `goals` (optional)
- `projects` (optional)
- `difficulty` (optional, 1–10)
- `importance` (optional, 1–10)
- `goalMultiplier` (optional, derived)
- `xp` (optional, derived)

## A5) Token Language (Nomie-style)
### Trackers
Form:
- `#key(value)`
Examples:
- `#mood(8)`
- `#coffee(1)`
- `#sleep(7h)`

Rules:
- If value is missing, default `1` (e.g., `#coffee` → 1).
- Support units in parentheses (e.g., `7h`, `30m`, `200cal`).
- Support simple arithmetic in parentheses (optional Phase 2; Nomie supports it).

### Context
Form:
- `+gym`, `+home`, `+work`

### Person
Form:
- `@john`, `@becky`

### Hierarchical tags
Form:
- `health/fitness`, `work/project-x`

## A6) Timestamped Dividers and Segments
Behavior (MVP):
- Live capture shows a best-effort markdown preview alongside the transcript.
- Offline capture logs raw text with timestamp markers; divider/segment formatting is finalized after sync.
- Timestamp markers use `[HH:MM]` or `[HH:MM:SS]` at natural speech breaks.
- Divider markers use `---` and may include an optional label (e.g., `--- errands`).
- Simple commands should create a minimal event preview; multi-topic capture uses divider markers to split blocks.
- The app stores segments in DB with `atOffsetMinutes`.
- Markdown export can render segments as:
```md
## Notes
- [00:00] Started studying cardiology
- [00:12] Beta blockers…
---
## Tasks mentioned
- [00:20] Pick up dry cleaning
```

## A7) Examples
### Workout + meal + extracted task (single capture)
**Spoken**: “Worked out 45 minutes, brutal. Afterwards I had a large McFlurry. Also remind me to buy groceries. #mood(8) +gym”

**Proposals**:
1) Workout Entry (event+habit+tracker)
2) Meal Entry (event+tracker; nutrition POC)
3) Task Entry (“Buy groceries”) (task)

## A8) Parsing/Normalization Rules
- Tokens are parsed into normalized fields:
  - `#mood(8)` → tracker log (mood=8)
  - `+gym` → contexts includes `gym`
  - `@john` → people includes `john`
- The original token strings remain available for display/export.

## A9) Time Inference Defaults (MVP)
### A9.1 Estimated durations are the default
- If the user does not provide an explicit time range, the system uses an estimated `durationMinutes` for events and micro-habits.

### A9.2 Past tense implies completion
- Past tense utterances create completed entries/tasks by default.
  - Example: “I bought apples, bananas, and pears” → checklist tasks marked completed.
- “Forgot X” creates an open task by default.

### A9.3 “Earlier today” anchoring (no explicit time)
If an utterance implies it already happened and does not provide explicit time:
- Default date is “earlier today”.
- Set `endAt` to the nearest `:00` or `:30` before capture time.
- Set `startAt = endAt - estimatedDuration`.

### A9.4 Midnight rollover (last night)
If capture occurs shortly after midnight (configurable rollover window; default 00:00–03:00) and the utterance clearly refers to “last night”, default the date to yesterday.

## A10) Purchase vs Consume
- Purchase verbs (buy/bought/purchased/picked up/got) populate `purchaseItems`.
- Consume verbs (ate/drank/had/finished) populate `consumeItems` and nutrition logs.
- If both are present in one capture, split into purchase event + consumption log.
