# Mobile Implementation Checklist (Web Parity)

## Scope
- Web UI is the source of truth for layout and feature scope.
- Desktop/web layouts remain stable; mobile adapts for parity.
- Capture on mobile is the highest priority surface.

## References
- `Insight 5/PRD/WEB_TO_MOBILE_PARITY_MATRIX.md`
- `Insight 5/PRD/CAPTURE_PIPELINE_SPEC.md`
- `Insight 5/PRD/IMPLEMENTATION_PLAN_MOBILE_CAPTURE.md`

## Checklist by Area

### 1) Capture (app/(tabs)/capture.tsx)
- Replace the current "processed" preview with a live markdown preview pane.
- Insert timestamp markers automatically at natural speech breaks: `[HH:MM]` or `[HH:MM:SS]`.
- Insert divider markers on topic shift: `---` or `--- label`.
- Keep the existing note input and manual segment controls; ensure they emit the same markers.
- Ensure simple commands (e.g., "driving now") render a minimal event preview.
- Preserve raw text + markers in the saved capture payload for offline use.
- Map to `Capture Pipeline Spec` rules and keep final formatting server-side.

### 2) Focus (app/focus.tsx)
- Keep layout unchanged.
- Add divider insertion support for notes (same `---` behavior as capture).
- Show timestamp marker insertion consistent with capture rules.
- Ensure notes and metrics update the active event without altering layout.

### 3) Session/Live Activity (src/state/session.tsx, src/native/liveActivity)
- Ensure Action Button/Quick Tile triggers align with capture rules and active event mode.
- Keep Live Activity updates synced to the active event.
- Preserve event context (goal/project/category/subcategory) on session start.

### 4) Offline Queue (src/storage/inbox.ts)
- Persist raw text with timestamp/divider markers.
- Store capture metadata needed for parse (importance, difficulty, contexts, tags, people).
- Mark offline captures clearly for later review.

### 5) Review Cards (app/(tabs)/explore.tsx or dedicated screen)
- Implement swipe cards that accept/reject proposals.
- Ensure cards support edit before commit.
- Target 5-10 cards reviewable in <30 seconds.

### 6) Calendar + Timeline (app/(tabs)/calendar.tsx, app/(tabs)/index.tsx)
- Keep web calendar behaviors: drag/reschedule/timebox and conflict cards.
- Add mobile gestures to edit time blocks and durations.
- Ensure timeline filters match web.

### 7) Views + Assistant (app/(tabs)/assistant.tsx, app/(tabs)/explore.tsx)
- Provide mobile UI for saved views and filters.
- Add chat-style assistant with deep links to entries.

### 8) Data + Sync (src/supabase/*, src/storage/*)
- Ensure mobile uses the same Supabase tables and RLS as web.
- Wire sync for entries, segments, tracker logs, and attachments.

## Done Criteria
- Mobile capture behaves like web: live markdown preview, offline-safe markers, server-side final formatting.
- Mobile review cards produce the same entries and metadata as web.
- Mobile screens cover web features without altering web/desktop layouts.
