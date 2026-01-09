# Agent 06 — Views & Analytics

## Deliverables
- `Insight 5/ARCH/SAVED_VIEWS_V1.md` (filter tree schema + UI behavior)
- `Insight 5/ARCH/VISUALIZATIONS_V1.md` (heatmaps, timelines, charts, correlations)

## Must Support
- Saved “Bases-like” views (filters/sorts/groups)
- Life-Tracker-style visualizations (heatmaps, timelines, line/bar charts)
- Tag/tracker drilldowns and correlation views

## Notes Explorer Consolidation
- References: `Insight 5/plugins/notes-explorer` for the action-bar filter chips, horizontal chip rows, and grid/masonry browsing patterns (see `styles.css` filter-labels + action-bar sections).
- Consolidate notes/people/places/tags/report drilldowns into a single Notes Explorer view with multi-select filters (All/Categories/Tags/People/Places), card grids, and a right-side inspector for the selected note (full tags/people/places/categories + editable transcript).
