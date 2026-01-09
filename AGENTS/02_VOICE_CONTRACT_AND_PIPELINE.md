# Agent 02 — Voice Contract & Pipeline

## Deliverables
- `Insight 5/ARCH/VOICE_CONTRACT_V1.md` (JSON schema + examples)
- `Insight 5/ARCH/VOICE_RULEBOOK.md` (deterministic rules + fallbacks)

## Must Support (MVP)
- Multi-entry utterances (one transcript → multiple proposals)
- Active event context (append notes vs new entry)
- Token extraction (`#tracker(7)`, `+context`, `@person`)
- Workout/nutrition templates
- “Suggested task” vs “auto-create task” threshold

## Parsing Accuracy Guardrails
- Default to a single event per utterance unless there is an explicit time boundary (e.g., "later", "after lunch", "at 3pm", "tomorrow").
- Treat purchases/items mentioned in the same sentence as notes on the same event (do not split into multiple events).
- Merge untimed event candidates when no explicit time split signals exist; keep explicit time ranges separate.
- Preserve explicit time ranges and honor past-tense vs future-tense intent.

## User Preferences (Capture Parsing)
- Titles: keep short and consolidated; use `Action (Location)` when location is known (e.g., "Sandwich run (Wawa)").
- Dayparts: morning=08:00, noon/lunch=12:00, afternoon=16:00, evening/tonight=20:00 (local).
- Multi-action same place: single event, sub-notes as bullets.
- Explicit time boundaries (e.g., "then at 3pm") split into separate events.
- Multi-day references create separate entries per day.
- Done action + future action: event for done action, task for future action.
- Negation ("didn't work out") logs a negative habit entry.
- Conditional ("if I have time") creates a task due today by default.
- Habit inference: workout-like actions (run, gym, pushups, etc.) map to workout habit.
- Multi-spend utterances split into separate events with separate costs.
- Sleep is always an event (not a tracker); "going to bed" creates a Sleep event.

## Plugin References (Evidence)
- `plugins/obsidian-memos`: Voice-first capture composes entries as `{TIME} {CONTENT}` and favors a single memo entry per capture (see `DefaultMemoComposition` in `data.json`).
- `plugins/ai_llm`: LLM responses are parsed as JSON payloads, reinforcing strict JSON-only outputs for structured extraction (see JSON parsing in `main.js`).
- `plugins/obsidian-textgenerator-plugin`: Uses explicit JSON response formatting and custom instructions to guide structured outputs (see `data.json` settings for JSON format).

## Confirmation UX
- Swipe to accept/reject
- Tap to edit fields
- Batch apply
