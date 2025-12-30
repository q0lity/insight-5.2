# Insight 5 Master Change Log

## 2025-12-23 15:55:55
- Created this master change log (per request).
- Registered MCP servers via `codex mcp add` (runtime config, no repo code change).

## 2025-12-23 15:58:14
- Refined dashboard visuals: card gradients, shadows, hover lifts, and improved controls (`Insight 5/apps/desktop/src/App.css`).
- Polished notes UI: hover/active states, focus rings, and card elevation (`Insight 5/apps/desktop/src/App.css`).

## 2025-12-23 16:01:40
- Added Framer Motion list animations to notes items (`Insight 5/apps/desktop/src/workspace/views/notes.tsx`).
- Added Framer Motion entrance/layout animation to calendar events (`Insight 5/apps/desktop/src/workspace/views/agenda.tsx`).

## 2025-12-23 19:57:33
- Switched global font stack to Aptos-first (`Insight 5/apps/desktop/src/index.css`).
- Added Playwright MCP registration via `codex mcp add playwright` (runtime config).
- Added running feature/request log (`Insight 5/REQUESTS_LOG.md`).

## 2025-12-23 20:29:57
- Logged confirmed parsing rules and edge-case decisions (`Insight 5/REQUESTS_LOG.md`).

## 2025-12-23 20:32:17
- Logged additional parsing rules (Work inference, normalized segments, self-expanding taxonomy, show parent + segments) in `Insight 5/REQUESTS_LOG.md`.

## 2025-12-23 23:43:00
- Installed Tailwind v4 PostCSS bridge `@tailwindcss/postcss` and updated `postcss.config.cjs` to resolve Vite Tailwind plugin error.
- Vite dev server now starts successfully (auto-selected port 5177 on localhost after prior port conflicts).

## 2025-12-24 00:12:40
- Improved local parser timing + segment grouping: added AM/PM sequencing hints, "until" handling, and work-block segment collapse; untimed notes now append as timestamped segments to the last explicit event.
- Added task scheduling intent for timed “make that a task” phrasing and prevented spurious implicit place tag `I`.

## 2025-12-24 01:05:12
- Fixed natural-language phrase splitting regex and raised parser output caps to reduce truncated parsing (`Insight 5/apps/desktop/src/nlp/natural.ts`).
- Prevented time-range equality from rolling forward 12h in parser (`Insight 5/apps/desktop/src/nlp/natural.ts`).
- Added day-mode right panel width toggle via `data-calendar-mode` and CSS variable (`Insight 5/apps/desktop/src/workspace/views/planner.tsx`, `Insight 5/apps/desktop/src/App.css`).
- Ensure calendar view re-opens Details panel and uses CSS variable for right panel width (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-24 01:18:42
- Added local-parse result count to capture progress log for debugging (`Insight 5/apps/desktop/src/App.tsx`).
- Added fallback event title handling for long phrases so timed events are not dropped (`Insight 5/apps/desktop/src/nlp/natural.ts`).

## 2025-12-24 01:34:08
- Prevented garbage filtering from dropping timed/imperative phrases and allowed timed phrases to create both events + tasks (`Insight 5/apps/desktop/src/nlp/natural.ts`).
- Added grocery task extraction even inside timed phrases (`Insight 5/apps/desktop/src/nlp/natural.ts`).
- Ensured workout keywords override Work category (gym with coworkers stays Health) and untimed segments anchor to event start (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-24 01:51:18
- Added JSON response format option for OpenAI requests so LLM parsing returns structured output (`Insight 5/apps/desktop/src/openai.ts`).
- Relaxed LLM garbage title filtering and increased allowed event/task counts; enforce non-empty output when explicit times exist (`Insight 5/apps/desktop/src/nlp/llm-parse.ts`).

## 2025-12-24 02:07:11
- Removed unsupported `response_format` parameter from Responses API calls to fix OpenAI 400 errors (`Insight 5/apps/desktop/src/openai.ts`).

## 2025-12-24 02:34:52
- Added relative time parsing (“in 20 minutes”) and duration phrases (“for an hour”) for local parser (`Insight 5/apps/desktop/src/nlp/natural.ts`).
- Added creation counters + post-save refresh so parsed events/logs/tasks reliably appear after capture (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-24 02:49:31
- Added debug line for first parsed event and auto-navigation to earliest created event so calendar jumps to the correct day (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-24 03:08:42
- Disabled local parsing when an OpenAI key is present; LLM empty now surfaces an error instead of falling back (`Insight 5/apps/desktop/src/App.tsx`).
- Tightened LLM prompt to place tracker logs within their time blocks and push notes into timestamped segments (`Insight 5/apps/desktop/src/nlp/llm-parse.ts`).

## 2025-12-24 03:27:16
- Forced JSON-mode parsing to use chat completions (Responses API does not support response_format) (`Insight 5/apps/desktop/src/openai.ts`).
- LLM parse now throws explicit errors when JSON is invalid or empty, with response snippets for debugging (`Insight 5/apps/desktop/src/nlp/llm-parse.ts`).

## 2025-12-24 03:45:11
- Wired assistant mode into capture parsing (LLM-only / hybrid / local) and block save when LLM mode lacks a key (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-24 04:06:21
- Added Vite dev proxy for OpenAI requests and routed OpenAI calls through `/openai` to fix browser CORS issues (`Insight 5/apps/desktop/vite.config.ts`, `Insight 5/apps/desktop/src/openai.ts`, `Insight 5/apps/desktop/src/workspace/views/settings.tsx`).

## 2025-12-24 04:22:57
- Fixed capture save crash by moving LLM settings initialization before use (prevents silent no-op on Save) (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-25 21:51:48
- Increased LLM parse output budget, tightened prompt to keep outputs compact, and added JSON repair pass when invalid JSON is returned (`Insight 5/apps/desktop/src/nlp/llm-parse.ts`).
- Updated capture progress messaging so LLM failures don’t claim local fallback when disabled (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-25 22:03:46
- Auto-run LLM parsing when an OpenAI key is present even if Assistant mode is still Local (prevents silent local-only parsing after port changes) (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-25 22:49:19
- Added tracker bubbles + slider context menu on the day log lane, and reduced log lane width to 20% (`Insight 5/apps/desktop/src/workspace/views/tiimo-day.tsx`, `Insight 5/apps/desktop/src/App.css`).
- Added points breakdown + running timer in event details and auto character/importance/difficulty inference from text (`Insight 5/apps/desktop/src/App.tsx`).
- Cleaned people tagging (filters junk fragments) and updated LLM prompt to avoid non-names (`Insight 5/apps/desktop/src/App.tsx`, `Insight 5/apps/desktop/src/nlp/llm-parse.ts`).
- Made Pinned sidebar groups reorderable and Shortcuts collapsible (`Insight 5/apps/desktop/src/App.tsx`, `Insight 5/apps/desktop/src/App.css`).

## 2025-12-25 23:19:45
- Added editable habit metadata (estimate, importance, difficulty) with points preview in Habits view (`Insight 5/apps/desktop/src/workspace/views/habits.tsx`).
- Added bored tracker + habit auto-logging from capture text (`Insight 5/apps/desktop/src/App.tsx`, `Insight 5/apps/desktop/src/ui/event-visual.ts`).
- Added model-safe OpenAI chat request handling for temperature‑unsupported models (`Insight 5/apps/desktop/src/openai.ts`).

## 2025-12-26 00:18:12
- Added trackerKey inference for log events (including token logs) to stabilize tracker icons and log-lane placement (`Insight 5/apps/desktop/src/App.tsx`).
- Clamped log-lane positions so late/early tracker bubbles remain visible within the day view (`Insight 5/apps/desktop/src/workspace/views/tiimo-day.tsx`).
- Avoided JSON response_format and temperature for GPT‑5 models; use Responses API with safe params (`Insight 5/apps/desktop/src/openai.ts`, `Insight 5/apps/desktop/src/nlp/llm-parse.ts`).

## 2025-12-26 00:33:02
- Made day timeline scrollable and increased default zoom for better readability (`Insight 5/apps/desktop/src/workspace/views/tiimo-day.tsx`, `Insight 5/apps/desktop/src/App.css`).
- Increased week/day timeline row heights and widened event cards with multi-line titles/meta in agenda views (`Insight 5/apps/desktop/src/workspace/views/agenda.tsx`, `Insight 5/apps/desktop/src/App.css`).

## 2025-12-26 00:44:18
- Added Magic UI–style magic-card hover glow for day and week event cards without changing behavior (`Insight 5/apps/desktop/src/workspace/views/tiimo-day.tsx`, `Insight 5/apps/desktop/src/workspace/views/agenda.tsx`, `Insight 5/apps/desktop/src/App.css`).

## 2025-12-26 01:32:10
- Added OpenAI chat retry fixes for unsupported params (`temperature`, `response_format`, `max_tokens`) to stabilize GPT‑5 parsing (`Insight 5/apps/desktop/src/openai.ts`).
- Clarified Settings note about Responses API fallback to chat completions (`Insight 5/apps/desktop/src/workspace/views/settings.tsx`).
- Prevented global place leakage into all events/tags by only assigning locations when mentioned in event text (`Insight 5/apps/desktop/src/App.tsx`).
- Coerced LLM tracker-like outputs (mood/energy/stress/pain/etc.) into log entries and added segmented notes fallback for long events (`Insight 5/apps/desktop/src/App.tsx`).
- Added mood/energy/stress log detection from natural language and tightened people cleanup to avoid fragment tags (`Insight 5/apps/desktop/src/App.tsx`).
- Improved importance/difficulty heuristics for workouts, reps, distance, and work keywords (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-26 02:03:44
- Magic button now opens capture (attached to the selected event) and a separate Auto-fill action preserves the previous behavior (`Insight 5/apps/desktop/src/App.tsx`).
- Event composer Magic button now starts voice transcription, and the capture voice button uses Magic UI–style pulsing visuals (`Insight 5/apps/desktop/src/App.tsx`, `Insight 5/apps/desktop/src/App.css`).

## 2025-12-26 02:18:22
- Guarded LLM task scheduled/due timestamps against invalid dates to prevent IndexedDB key errors during save (`Insight 5/apps/desktop/src/App.tsx`).

## 2025-12-26 02:38:10
- Sanitized calendar/task records (timestamps + arrays) to prevent IndexedDB key errors and added safe fallback sorting when orderBy fails (`Insight 5/apps/desktop/src/storage/calendar.ts`, `Insight 5/apps/desktop/src/storage/tasks.ts`).

## 2025-12-26 14:10:43
- Added full-height root layout to prevent calendar clipping (`Insight 5/apps/desktop/src/index.css`).
- Unified base control styling with shadcn-like sizing, focus rings, and CTA gradients; refreshed primary/secondary buttons (`Insight 5/apps/desktop/src/App.css`).
- Tightened planner header controls and made planner body layout flex/overflow-friendly for calendar views (`Insight 5/apps/desktop/src/App.css`).
- Increased agenda row heights + event typography for readability and refreshed day timeline columns, log lane styling, and event card padding (`Insight 5/apps/desktop/src/App.css`).

## 2025-12-26 15:03:09
- Added TS/Vite import aliases for shadcn/ui (`Insight 5/apps/desktop/tsconfig.json`, `Insight 5/apps/desktop/tsconfig.app.json`, `Insight 5/apps/desktop/vite.config.ts`).
- Initialized shadcn/ui configuration and CSS variables (`Insight 5/apps/desktop/components.json`, `Insight 5/apps/desktop/src/index.css`).

## 2025-12-26 15:10:31
- Installed `pnpm` globally and initialized shadcn MCP client via `pnpm dlx shadcn@latest mcp init --client codex` (pending Codex config update in `~/.codex/config.toml`).
- Installed shadcn animation dependencies to resolve `tailwindcss-animate` build error (`Insight 5/apps/desktop/package.json`).

## 2025-12-26 15:29:22
- Re-aligned shadcn CSS variables to the existing Insight 5 theme palette and restored Aptos-first font stack (`Insight 5/apps/desktop/src/index.css`, `Insight 5/apps/desktop/tailwind.config.js`).

## 2025-12-26 16:28:44
- Added shadcn/ui components for upcoming UI refactor (button, tabs, toggle-group, separator, scroll-area, table, dropdown-menu, badge) (`Insight 5/apps/desktop/src/components/ui/*`).

## 2025-12-26 16:33:08
- Switched global font stack to Figtree-first (per preference) (`Insight 5/apps/desktop/src/index.css`, `Insight 5/apps/desktop/tailwind.config.js`).

## 2025-12-26 17:59:22
- Rebuilt week/day agenda layout to use the compact `ag*` calendar styles, added all-day row, segment markers, and denser event cards (`Insight 5/apps/desktop/src/workspace/views/agenda.tsx`).
- Increased agenda row heights and narrowed day log lane for better calendar readability (`Insight 5/apps/desktop/src/App.css`).

## 2025-12-26 18:27:30
- Switched planner mode controls to shadcn ToggleGroup + Button for consistent calendar header styling (`Insight 5/apps/desktop/src/workspace/views/planner.tsx`, `Insight 5/apps/desktop/src/App.css`).
- Ensured agenda root fills available height in the calendar layout (`Insight 5/apps/desktop/src/App.css`).

## 2025-12-26 18:29:02
- Added shadcn runtime utilities and dependencies (`Insight 5/apps/desktop/src/lib/utils.ts`, `Insight 5/apps/desktop/package.json`).

## 2025-12-26 18:37:57
- Replaced month view with the unified `ag*` calendar styles and a compact month grid layout (`Insight 5/apps/desktop/src/workspace/views/agenda.tsx`, `Insight 5/apps/desktop/src/App.css`).

## 2025-12-26 19:10:42
- Removed deprecated `@plugin 'tailwindcss-animate'` import to fix Tailwind v4 build errors (`Insight 5/apps/desktop/src/index.css`).
- Forced Vite to resolve a single React/ReactDOM copy from the desktop app to fix Radix invalid hook call (`Insight 5/apps/desktop/vite.config.ts`).
- Hid workspace tab bar and made pane bodies non-scrolling so the calendar grid owns scroll (`Insight 5/apps/desktop/src/App.css`).
- Registered Chrome DevTools MCP server in the workspace MCP config (`.mcp.json`).
## 2025-12-26 20:38:39
- Removed fixed heights from day/week calendar scroll containers so they flex to the pane and align to the bottom without overhang (`Insight 5/apps/desktop/src/App.css`).

## 2025-12-27 11:48:20
- Locked the main app layout to full-height panels with internal scrolling to prevent calendar overhangs (`Insight 5/apps/desktop/src/App.css`).
- Wrapped planner content in a shared hero panel for consistent rounded edges and containment (`Insight 5/apps/desktop/src/workspace/views/planner.tsx`, `Insight 5/apps/desktop/src/App.css`).

## 2025-12-27 16:24:09
- Added notes masonry/list layout styles, tags, and custom scrollbar support (`Insight 5/apps/desktop/src/App.css`).
- Implemented Tasks table view with Kanban toggle and status move handling; wired task status drag in Kanban (`Insight 5/apps/desktop/src/workspace/views/ticktick-tasks.tsx`, `Insight 5/apps/desktop/src/App.tsx`).
- Added Tasks table styling and priority/tag/points visuals (`Insight 5/apps/desktop/src/App.css`).
- Updated event title formatting to use vertical dividers (`Insight 5/apps/desktop/src/ui/event-visual.ts`).
- Increased day view default zoom + range, added play/pause button on event cards, and enabled week view drag-to-move events (`Insight 5/apps/desktop/src/workspace/views/tiimo-day.tsx`, `Insight 5/apps/desktop/src/workspace/views/agenda.tsx`).
- Increased agenda hour heights and narrowed day log lane width (`Insight 5/apps/desktop/src/App.css`).

## 2025-12-27 16:52:11
- Normalized OpenAI model IDs to avoid unsupported parameter errors with gpt-5/response models (`Insight 5/apps/desktop/src/openai.ts`).
- Defaulted assistant settings to LLM-only mode for new/legacy settings (`Insight 5/apps/desktop/src/assistant/storage.ts`).
- Removed local/hybrid mode toggles in Chat UI and clarified LLM-only messaging (`Insight 5/apps/desktop/src/workspace/views/assistant.tsx`).
- Simplified Settings AI section to always save in LLM mode (mode selector removed) (`Insight 5/apps/desktop/src/workspace/views/settings.tsx`).
