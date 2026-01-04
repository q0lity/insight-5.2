# Mobile Capture Parity Implementation Plan

## Goal
Match web capture behavior on mobile without changing web UI structure. Prioritize live capture with markdown preview, offline-safe logging, and review cards.

## Milestones
### M0 - Parity Spec Alignment
- Confirm token grammar and divider markers (Appendix A).
- Confirm mobile capture UX rules (Appendix C).

### M1 - Live Capture UX
- Voice Log screen: state machine + live transcript + markdown preview.
- Timestamp marker insertion during capture.
- Divider marker insertion for multi-topic capture.
- Minimal event previews for simple commands.

### M2 - Offline Queue + Review Cards
- Pending capture queue stored locally.
- Sync on reconnect triggers parse and review cards.
- Review card acceptance writes entries/segments/logs.

## Module Tasks
### apps/mobile
- Implement capture UI states in `apps/mobile` (Voice Log / Capture overlay).
- Add live markdown preview component with timestamp marker view.
- Add divider insertion gesture or keyword command.
- Wire Action Button / Quick Tile routes to Quick Log.
- Ensure Focus view behavior-only changes (no layout change).

### packages/domain
- Token parser for live preview (lightweight rules only).
- Timestamp marker formatter (HH:MM / HH:MM:SS).
- Divider marker parser for segment grouping.

### packages/sync
- Pending capture storage (audio path + raw text + markers).
- Outbox ops for create/update entry, tracker log, attachment.

### supabase/edge-functions
- Validate `transcribe_and_parse_capture` contract.
- Ensure parser returns proposals + questions in required JSON shape.

### Tests
- Unit tests for token parser and divider handling.
- Integration test for offline capture -> sync -> review -> commit.

## Deliverables
- Mobile capture UX matches web behavior.
- Offline capture never loses data.
- Review cards complete in under 30 seconds for 5-10 items.
