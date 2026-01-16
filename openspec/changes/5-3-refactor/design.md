# Design Notes

## Decisions
- Full-screen entry detail on expand (desktop + mobile).
- Tabs: Edit / Outline / Table / Transcribe.
- Category path shown as vertical dividers: `Professional | Insight | Coding`.
- Low-confidence categorization triggers direct picker with a preselected suggestion; user can deselect.
- Unscheduled tasks live in all-day lane; drag into calendar grid.
- Read-only calendars render locked events (visible, no outbound sync).
- Countdown badges appear anywhere a target date exists.

## Sources of truth
- `PRD/APPENDIX_J_ECOSYSTEM_REFACTOR_SPEC.md`
- `PRD/WIREFRAME_SOURCE_OF_TRUTH.md`
- `PRD/APPENDIX_C_UI_SPEC.md`
- `PRD/APPENDIX_A_LANGUAGE_SPEC.md`
- `PRD/LOGGING_FORMAT.md`

## Alternatives considered
- Embedding-based categorization (deferred to Phase 2).
