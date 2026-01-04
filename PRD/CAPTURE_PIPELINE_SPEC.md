# Capture Pipeline Spec (Mobile First, Web Parity)

## Purpose
Define the end-to-end capture pipeline so mobile matches web behavior while preserving offline reliability. This spec follows the PRD constraints: no client LLM keys and offline capture must never lose data.

## Entry Points
- In-app Quick Log mic
- iOS Action Button (App Intents / Shortcuts)
- Android Quick Tile
- (Phase 1.5) Desktop hotkey

## State Machine
- Idle
- Recording
- Transcribing
- Parsing
- Review Ready
- Offline Pending
- Error

## Live Capture Preview Rules
- Show live transcript with best-effort markdown preview during recording.
- Insert timestamp markers at natural speech breaks: `[HH:MM]` or `[HH:MM:SS]`.
- Insert divider markers for topic shifts: `---` or `--- label`.
- Simple commands produce a minimal event preview (title + facet + start time).
- Multi-topic capture uses divider markers to split blocks; final formatting is applied server-side.

## Offline Capture Rules
- Store raw text + timestamp markers locally.
- Do not run LLM parsing or full token normalization on-device.
- Divider markers are kept as plain text and converted to segments after sync.

## Online Capture Rules
1. Upload audio or transcript to `transcribe_and_parse_capture`.
2. Receive proposals + questions JSON.
3. Render review cards for user confirmation.
4. Commit entries, segments, tracker logs, and attachments to Supabase.

## Parsing Contract (Edge Function)
- Edge function: `transcribe_and_parse_capture`.
- Output: proposals + questions (see PRD Section 6.4).
- Tokens are preserved verbatim in markdown and normalized into structured fields.

## Persistence Mapping
- `entries`: title, facets, timestamps, difficulty, importance, duration, body_markdown, frontmatter.
- `entry_segments`: transcript/note/divider segments with `atOffsetMinutes`.
- `tracker_logs`: parsed from `#tracker(value)` tokens or inferred from language.
- `attachments`: audio/photo/video linked to entry.

## Examples
### Simple command
Input: "I am driving now."
- Preview: minimal event entry `transport/driving/Driving` with start time.
- After parse: Entry facet `event`, context `+car` if detected, optional location link.

### Multi-topic capture
Input: "Driving to work. Later, lunch with John. --- Need to buy groceries."
- Live preview inserts divider.
- Parse results:
  - Event entry: `transport/driving/Driving to work`
  - Event entry: `food/lunch/Lunch with John` with `@john`
  - Task entry: `Buy groceries`

## Failure and Recovery
- If parsing fails, keep the capture as a pending item and allow manual edit.
- If offline, queue the capture and prompt review once online.
