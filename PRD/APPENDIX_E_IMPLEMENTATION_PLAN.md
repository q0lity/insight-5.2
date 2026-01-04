# Appendix E — Implementation Plan (Phased, Cursor-Friendly)

This appendix turns the PRD into a buildable sequence. It is inspired by the phased plans in `Reference/Real Time Voice Processing Llm Integration Architecture.md`, adapted to Insight 5’s stack (RN + Electron + Supabase).

## Phase 0 — Foundation (Project + DB)
Deliverables:
- Supabase project created
- Apply schema + RLS:
  - `Insight 5/DB/SUPABASE_SCHEMA_V1.sql`
  - `Insight 5/DB/RLS_POLICIES_V1.sql`
- Create Storage bucket(s): `attachments`
- Establish monorepo skeleton:
  - `apps/mobile` (Expo RN)
  - `apps/desktop` (Electron)
  - `packages/domain` (types + scoring + token parser)
  - `packages/sync` (offline queue/outbox + Supabase client)

Acceptance:
- Auth works; user can create/read their own Goal and cannot read others (RLS verified).

## Phase 1 — Voice Capture Vertical Slice (MVP Core)
Goal: the app “actually works” end-to-end.
Detail: mobile capture parity tasks are tracked in `Insight 5/PRD/IMPLEMENTATION_PLAN_MOBILE_CAPTURE.md`.

### 1.1 Capture
- In-app mic record/stop
- Offline capture stores pending item locally

### 1.2 Transcribe + Parse (server-side)
- Edge Function: `transcribe_and_parse_capture`
- Contract: proposals + questions JSON

### 1.3 Review Cards
- Tinder-like cards; accept/reject/edit
- Batch apply

### 1.4 Persist
- Insert Entries + segments + tracker logs
- Compute XP and store on entry

Acceptance:
- Online flow: record → cards → commit → appears on Dashboard and Timeline.
- Offline flow: record → pending badge → later cards → commit.

## Phase 1.5 — Timers + XP Accrual + Native Surfaces
Goal: timeboxing and “live XP” feel.
- Timer creation (countdown/stopwatch/pomodoro)
- XP accrual by minutes
- iOS Live Activity (ActivityKit) + Android foreground notification
- Action Button / App Shortcut to launch Quick Log

Acceptance:
- Start 2-min timer for “brush teeth”; see Live Activity and completion notification.

## Phase 2 — Calendar Sync Day 1 (Google + Device)
- Google OAuth exchange (Edge Function)
- Sync events ↔ entries, store mapping in `external_event_links`
- Device calendar integration for Apple/Android
- Conflict cards

Acceptance:
- Create event in app → shows in Google Calendar (linked).
- Edit in Google → conflict card appears in app.

## Phase 3 — Views + Analytics (Bases + Life Tracker)
- Saved view builder (filters/sorts/groups)
- Visualization cards (heatmap, timeline, line/bar)
- Tracker drilldowns + “related entries” correlation panel

Acceptance:
- Create saved view “Health / Supplements” and pin to Dashboard.

## Phase 4 — Fitness + Nutrition Modules (MVP Depth)
- Workout table templates + voice-to-row
- Nutrition POC (photo + voice → estimate + edit)

Acceptance:
- Voice “100 push-ups” creates a workout row and updates charts.

## Phase 5 — Desktop Parity
- Electron app supports review/edit, views, calendar, search

Acceptance:
- Desktop can review pending cards and edit entries.

## Phase 6+ (Later)
- Markwhen export
- Traits/skills modules (radar charts)
- External health imports (Loop/HealthKit/Fit)
- Automation rules (“on completion” style)
