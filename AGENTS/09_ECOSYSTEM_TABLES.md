# Ecosystem Tables + Shared Properties

## References (plugins)
- `plugins/obsidian-projects`: table view as the primary project layout (see `data.json` views with `type: "table"`).
- `plugins/obsidian-tasks-plugin`: multi-status task lifecycle and metadata (see `data.json` status settings).
- `plugins/goal-tracker`: goal tracking with calendar/streak model (`main.js`).
- `plugins/obsidian-tracker` + `plugins/tracker-plus`: tracker visualizations with ranges and value units (see `main.js` bullet chart config fields like `range` and `valueUnit`).
- `plugins/heatmap-tracker`: heatmap-centric tracker visualization (styles + main bundle).

## UI Intent
- Ecosystem page is card-first (table-free) with compact card grids per section (Goals, Projects, Habits, Trackers, Taxonomy), taking cues from `plugins/obsidian-projects` gallery/board cards (`styles.css`).
- Card selection opens a right-side inspector (multi-select tags/people/locations + advanced fields) sized like the day view panel.
- Habits and trackers emphasize quick stats + heatmap/units, aligned with `plugins/heatmap-tracker` visualization density and `plugins/obsidian-tracker`/`plugins/tracker-plus` unit editing affordances.

## Shared Properties (apply across tasks, habits, trackers, goals, projects)
- `tags`, `contexts`, `category`, `subcategory`
- `importance`, `difficulty`, `estimateMinutes`
- `people`, `location`, `skills`, `character`
- `goal`, `project` (as linkers)

## Persistence Guidance
- Local-first storage (Dexie/IndexedDB) for definitions + metadata.
- Sync to Supabase entries when available (frontmatter map mirrors shared properties).
