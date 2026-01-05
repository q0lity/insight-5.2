# Ecosystem Tables + Shared Properties

## References (plugins)
- `plugins/obsidian-projects`: table view as the primary project layout (see `data.json` views with `type: "table"`).
- `plugins/obsidian-tasks-plugin`: multi-status task lifecycle and metadata (see `data.json` status settings).
- `plugins/goal-tracker`: goal tracking with calendar/streak model (`main.js`).
- `plugins/obsidian-tracker` + `plugins/tracker-plus`: tracker visualizations with ranges and value units (see `main.js` bullet chart config fields like `range` and `valueUnit`).
- `plugins/heatmap-tracker`: heatmap-centric tracker visualization (styles + main bundle).

## UI Intent
- Ecosystem page is table-first: Goals, Projects, Taxonomy, Habits, Trackers render as rows with key fields inline.
- Row selection opens a right-side detail editor (multi-select tags/people/locations + advanced fields).
- Trackers have editable units: label, min/max, step, and presets for quick entry.

## Shared Properties (apply across tasks, habits, trackers, goals, projects)
- `tags`, `contexts`, `category`, `subcategory`
- `importance`, `difficulty`, `estimateMinutes`
- `people`, `location`, `skills`, `character`
- `goal`, `project` (as linkers)

## Persistence Guidance
- Local-first storage (Dexie/IndexedDB) for definitions + metadata.
- Sync to Supabase entries when available (frontmatter map mirrors shared properties).
