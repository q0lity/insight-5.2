# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-13 16:34]
App.tsx is ~9000 lines - use line number references carefully and read specific sections rather than the whole file

_Context: When modifying the detail panel or item type selector in App.tsx, target specific line ranges (6780-7495 for detail panel, 6799-6814 for type selector, 1275 for state definition)_

## [2026-01-13 16:34]
Keep single 'kind' field for backward compatibility when adding 'kinds' array to CalendarEvent

_Context: Existing events use single kind field. New kinds array should be optional. Read logic should check kinds first, fall back to [kind] for legacy data._

## [2026-01-13 16:34]
Notes view already has filter pattern but uses CSS classes (notesFilterTab, notesFilterChip) instead of inline Tailwind like dashboard

_Context: When implementing task filter bar, use inline Tailwind styles matching dashboard.tsx for consistency. Notes may need style updates for parity._
