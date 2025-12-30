# Agent Workstreams (Execution Plan)

These “agents” are parallel workstreams. Each agent produces a concrete deliverable in `Insight 5/` so we can assemble the final build plan and start implementation without ambiguity.

1. `01_DATA_MODEL_AND_RLS.md` — Supabase schema, indexes, RLS, migrations
2. `02_VOICE_CONTRACT_AND_PIPELINE.md` — parse JSON schema + confirmation rules + error handling
3. `03_UI_UX_SYSTEM.md` — design system + navigation layout (left/under/right bars) + card interactions
4. `04_TIMERS_XP_LIVE_ACTIVITY.md` — timeboxes, XP accrual, Dynamic Island/notifications
5. `05_CALENDAR_SYNC.md` — Google 2-way + device calendar mapping + conflict rules
6. `06_VIEWS_ANALYTICS.md` — Bases-like saved views + Life Tracker visualizations + correlations
7. `07_WORKOUTS_AND_NUTRITION.md` — workout table templates + nutrition POC capture
8. `08_DESKTOP_APP.md` — Electron app packaging + shared modules strategy

Status: create the deliverables above, then we start scaffolding the repo (monorepo + Supabase init).
