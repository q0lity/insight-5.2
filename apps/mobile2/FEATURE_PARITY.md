# Mobile2 Feature Parity (Desktop -> Mobile)

## Present (Mobile2 already covers)
- Dashboard (Life Tracker) -> `app/(tabs)/index.tsx`
- Habits -> `app/(tabs)/habits.tsx`
- Calendar (Tiimo Day) -> `app/(tabs)/calendar.tsx`
- Focus -> `app/focus.tsx`
- Reports -> `app/reports.tsx`
- Health (Workouts/Nutrition) -> `app/health.tsx`, `app/health/workouts.tsx`, `app/health/nutrition.tsx`
- Goals -> `app/goals.tsx`
- Projects -> `app/projects.tsx`
- Rewards -> `app/rewards.tsx`
- People -> `app/people.tsx`
- Places -> `app/places.tsx`
- Tags -> `app/tags.tsx`
- Settings -> `app/settings.tsx`
- Assistant (local search MVP) -> `app/(tabs)/assistant.tsx`, `app/(tabs)/explore.tsx`
- Capture + Voice -> `app/(tabs)/capture.tsx`, `app/voice.tsx`

## Missing / Needs Build
- Timeline view
- Notes view (inbox + markdown browsing)
- Agenda view
- Kanban board
- Reflections view
- Tasks view (separate from Plan)
- TickTick tasks view

## Enhancements Requested
- Voice parsing: Whisper transcription + desktop-grade parsing (auto-create events/tasks/trackers)
- Dashboard: add richer stats/insights cards
- Assistant: optional LLM search (ChatGPT-style) with Supabase auth gating
