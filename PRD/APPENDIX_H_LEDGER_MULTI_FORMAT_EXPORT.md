# Appendix H — Ledger-Style Multi-Format Export (Reference 2)

This appendix captures the key pattern from `Reference 2/`: **one source of truth** that can be exported into multiple “views/formats” for dashboards, calendars, timelines, and tracker charts.

## H.1 Concept

In Insight 5, the **source of truth is Supabase** (`entries`, `tracker_logs`, `tasks`, `notes`, etc.). We additionally support a **portable Markdown export** that mirrors the Obsidian “ledger” approach:

- Human-readable bullet-journal sections (fast scan/edit)
- Machine-readable “inline objects” (for queries/analytics)
- Derived “tracker fields” (for heatmaps/lines)
- Calendar mirror objects (for external calendars)
- Markwhen timeline objects (for Gantt/timelines)

## H.2 Export Block Shape (per capture)

Each capture exports as a single block (append-only when exported in a ledger file):

```
## YYYY-MM-DD Capture @ HH:MM

### Timeline
### Tasks
### Notes
### Trackers
### Money

## 🔎 DV EXPORT
## 📊 TRACKER FIELDS
## 📅 FULL CALENDAR SYNC
## 🕐 MARKWHEN DATA
```

Notes:
- Empty sections still emit their headings (stability for downstream tooling).
- Nested/contained events can be indented as “sub-events”.

## H.3 Data Mapping (Insight 5 → Export)

- `entries` → Timeline (events) and Notes (note segments)
- `tasks` → Tasks
- `tracker_logs` → Trackers + TRACKER FIELDS
- `money_logs` (or `entry.money_json`) → Money + finance tracker fields
- `calendar_mirror` (derived) → FULL CALENDAR SYNC objects (ICS/Google/Apple adapters)
- `markwhen_exports` (derived) → MARKWHEN objects (in-app timeline + optional file export)

## H.4 “Quick Taps” & “Sync Buttons” (in-app equivalent)

Reference 2 includes Obsidian buttons/templates (start/stop timer, teeth AM/PM, sync calendar, generate markwhen). In Insight 5 these become:

- **Quick Actions**: one-tap tracker/habit logging (teeth, water, mood, focus start/stop).
- **Sync Actions**: “Export to Calendar” and “Export Timelines” (file export or share sheet).
- **Templates/Macros**: user-defined presets that seed capture text or directly create structured entries.

