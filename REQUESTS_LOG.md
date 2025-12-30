# Insight 5 Requests Log

## 2025-12-23
- Set up Whisper transcription via secure proxy; recording pipeline should enrich event + journal with raw, timestamped, and structured notes.
- Install Playwright MCP for UI validation.
- Maintain running change log of every code update and a running list of requested features/plan changes.
- Task sidebar: allow creating new goals/projects/categories/subcategories from inputs and infer them when missing.
- Tracker sidebar: make tracker/shortcut sections draggable/reorderable (with handle).
- Daily view: enlarge right sidebar only for daily mode (keep week width as-is).
- Week view: Enter key should create new event; avoid random size changes on events.
- Magic button: context-aware recording + auto-fill parameters for the current event/session.
- Tags: multi-select chips (not dropdown); tag presses add/remove.
- Trackers: remove sleep/workout from default trackers; keep mood/energy/stress/pain; support multi-day trackers and all-day tracker events.
- All-day events: draggable across top row, including tracker-style all-day logs.
- Improve activity icons (current ones look janky).
- Bug hunt the long narrative capture use case (example provided) so parsing works end-to-end.

### Confirmed parsing rules (2025-12-23)
- Every event must have category + subcategory; event title follows category/subcategory format.
- Third-level details (e.g., Bosphorus) live in `location` and also appear in title; settings should toggle title detail level.
- Sub-activities within a larger span (e.g., YouTube during drive) become segments inside the parent event, not standalone events.
- Work block: sub-segments inherit category=Work unless explicitly overridden.
- Log multiple tracker entries when multiple moods are mentioned.
- Birthday is always an all-day event.
- Infer Work when activities are clinical/meeting-like even if not explicitly stated.
- Segment labels should be normalized (not verbatim).
- Tags and categories should build iteratively from the index (self-expanding taxonomy).
- Show parent events and segments together in the daily timeline.
