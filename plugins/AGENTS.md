# Plugin Reference Agents (Swarm Spec)

This document defines the **swarm agents** that use `Insight 5/plugins/` as the **primary reference** for feature behavior and UI patterns. These agents **must** inspect the plugin folders listed below before implementing changes in `Insight 5/apps/desktop` or shared packages.

## Rules of Engagement
- Treat `Insight 5/plugins/` as the canonical reference for feature behavior.
- Prefer local plugin source over web research. Network access is only for gaps after local review.
- Implement features so they work together (shared data contracts, tags, categories, people, trackers).
- Keep output aligned to the Insight 5 DB schema and PRD conventions.

## Agent Directory

### 1) Calendar + Planning Agent
**References:** `obsidian-full-calendar`, `obsidian-day-planner`, `ical`, `prisma-calendar`, `calendar-bases`, `time-ruler`, `time-bullet`  
**Responsibilities:**
- Weekly + day planners with dense grids and all-day sections.
- Drag/drop tasks/habits/trackers into calendar.
- Event recurrence patterns, time blocking, and range navigation.
**Deliverables:** Calendar view behavior spec + UI parity checklist.

### 2) Gantt + Timeline Agent
**References:** `smart-gantt`, `tasks-map`, `obsidian-projects`, `obsidian-tasks-plugin`  
**Responsibilities:**
- Gantt chart generation from tasks/events.
- Filters by tags, text, and category.
- Per-row timeline bars and adjustable time windows.
**Deliverables:** Gantt data model mapping + filter rules.

### 3) Tasks + Projects Agent
**References:** `obsidian-tasks-plugin`, `obsidian-kanban`, `obsidian-projects`, `goal-tracker`  
**Responsibilities:**
- Task lifecycle (todo/in-progress/done), recurring tasks, due dates.
- Project/goal rollups and linkages.
**Deliverables:** Task fields map + project/goal aggregation rules.

### 4) Tracker + Heatmap Agent
**References:** `obsidian-tracker`, `tracker-plus`, `heatmap-calendar`, `heatmap-tracker`  
**Responsibilities:**
- Tracker token parsing and time-series extraction.
- 365-day heatmaps (day/week/month/year) and intensity rules.
**Deliverables:** Tracker token grammar + heatmap thresholds.

### 5) Workout + Health Agent
**References:** `workout-tracker`  
**Responsibilities:**
- Strong-style workout sessions (exercise library, sets, PRs, history).
- Export/import compatibility for wearables (WHOOP/Oura/Ring/Apple Health) as structured ingestion.
**Deliverables:** Workout session schema + import adapters spec.

### 6) Analytics + Charts Agent
**References:** `obsidian-charts`, `dataview`  
**Responsibilities:**
- Pie/line/bar chart templates for time/points/skills.
- Consistent chart formatting and axes rules.
**Deliverables:** Chart component guidelines + data transforms.

### 7) AI + Assistant Agent
**References:** `ai-providers`, `ai_llm`, `obsidian-textgenerator-plugin`, `smart-connections`, `copilot`, `ollama-chat`  
**Responsibilities:**
- “Magic” fill for event forms and structured extraction.
- Chat-style assistant screen and data retrieval.
**Deliverables:** AI action list + safe auto-fill rules.

### 8) Notes + Journal Agent
**References:** `journaling`, `diarian`, `obsidian-memos`, `notes-explorer`, `tasknotes`  
**Responsibilities:**
- Voice-first capture, note backlinks, daily logs.
- Running sheets for events + notes.
**Deliverables:** Note schema + note/task linking rules.

## Shared Data Contract (All Agents)
- **Event**: `title, startAt, endAt, tags, category, subcategory, importance, difficulty, people, location, trackerKey`
- **Task**: `title, status, tags, category, subcategory, estimateMinutes, dueAt, scheduledAt`
- **Habit**: `name, tags, category, subcategory, difficulty, importance, estimateMinutes`
- **Tracker Log**: `trackerKey, value, startAt, tags`
- **Derived Points**: `points = durationHours * importance * difficulty`

## Output Expectations
Each agent must update or add specs in `Insight 5/AGENTS/` or `Insight 5/PRD/` and reference the plugin folders explicitly. No agent should implement code without documenting the plugin evidence it followed.
