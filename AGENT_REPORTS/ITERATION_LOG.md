# Iteration Log

## 2025-12-27

### Scope
- UI/UX alignment across calendar, notes, tasks, habits, goals, timeline, chat, and settings pages.
- Replace floating add button with Magic UI style.
- Restore LLM-only settings flow (OpenAI key + model).
- Make calendar day/week scrollable inside frame and adjust event sizing.

### Plan
1. Audit current layout constraints (calendar/day/week containers, sidebars, hero panels) and define shared sizing/spacing rules.
2. Notes page: adapt notes-explorer layout (card list + explorer panel), make cards modular/drag-ready, restore scroll in frame.
3. Calendar view: day/week grid scrollable; remove extra top bar; improve event readability (size/typography).
4. Tasks page: table layout with sortable columns; Enter-to-create for goals/projects/categories/subcategories; right-sidebar context fields.
5. Habits/Trackers/Goals/Timeline/Ecosystem: right-sidebar habit editor; heatmap labels; tracker page; goals tiles + analytics; timeline spine + filters.
6. Polish pass: unify border radii/spacing; replace floating add button; tighten chat spacing; update changelog.

### Open Questions
- Which “top bar” should be removed (tab row, day/week toggle row, or another header)?
- Notes Explorer: masonry cards or fixed grid? Should drag-reorder persist order or just visual?
- Tasks table: confirm required columns and default sort order.
- Goals tiles: confirm analytics (time/points/heatmap/timeline) and tile size.
- Habits: confirm which stats/pie charts are required and default time estimate fields.
