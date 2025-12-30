# Insight 5 (Next App)

This folder is the workspace for the **React Native + Desktop** rewrite (“Insight 5”).

It is built using the research and references in the parent folder:
- `Reference/` (requirements + rulebooks)
- `flutter_app/` (behavioral prototype)
- `tasknotes-main-2/` (Markdown/YAML language + saved views model)
- `nomie6-oss-master/` (token conventions)
- `obsidian-life-tracker-base-view-main/` (dashboards + visualizations)
- `habitica-develop-2/` (gamification UI patterns)
- `Obsidian-Task-Genius-master-2/` (time parsing + date inheritance + multi-source dataflow patterns)

## Key Docs
- PRD: `Insight 5/PRD/MASTER_PRD_V3.md`
- Architecture gaps → fixes order: `ARCHITECTURE_GAPS_AND_FIXES.md` (parent folder)
- Agent workstreams: `Insight 5/AGENTS/`

## Run (Local)
- Mobile (Expo): `cd "Insight 5" && npm run dev:mobile`
- Desktop (Electron + Vite): `cd "Insight 5" && npm run dev:desktop`

## Environment
- Mobile env vars go in `Insight 5/apps/mobile/.env` (see `Insight 5/apps/mobile/.env.example`).
- Desktop env vars go in `Insight 5/apps/desktop/.env` (see `Insight 5/apps/desktop/.env.example`).
