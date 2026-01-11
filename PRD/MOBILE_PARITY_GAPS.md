# Mobile Parity Gaps - iOS Swift App

**Audit Date:** 2026-01-11
**Auditor:** polecat/gastown-mka1jhkz
**Bead:** hq-h7a

---

## Summary

The iOS Swift app (`apps/insight_swift`) has substantial feature coverage compared to the desktop app (`apps/desktop`). However, several key visualization and analytics features are missing or simplified. The core data models are compatible, and the parsing systems are largely equivalent.

**Overall Parity Score:** ~75%

---

## P0 - Critical Gaps (Core User Workflows)

### GAP-001: Dashboard Analytics Missing
**Desktop File:** `apps/desktop/src/workspace/views/dashboard.tsx` (1222 LOC)
**iOS File:** `apps/insight_swift/.../Views/DashboardView.swift` (111 LOC)

**Desktop Features:**
- Heatmaps (consistency + impact) with period selectors
- Pie charts (time allocation by category)
- Bar charts (impact distribution)
- Line/area charts (daily activity/impact trends)
- Radar charts (character attributes, top skills)
- Top connections (people/places by time/points)
- Filter chips (category/tag/person/place)
- Customizable widget layout with drag-and-drop
- Multiple view modes (dense/masonry/spacious)
- Time range filtering (today/week/month/quarter/year)

**iOS Implementation:**
- Basic metric tiles (entries, tasks, habits, trackers counts)
- Active focus session display
- Upcoming entries list
- Recent notes list

**Required Work:**
1. Create SwiftUI chart components (heatmap, pie, bar, line, radar)
2. Add time range picker
3. Add filter chip bar
4. Implement widget grid layout
5. Connect to AppStore for aggregated data queries

---

### GAP-002: Habit Heatmaps and Streaks Missing
**Desktop File:** `apps/desktop/src/workspace/views/habits.tsx` (693 LOC)
**iOS File:** `apps/insight_swift/.../Views/HabitsView.swift` (145 LOC)

**Desktop Features:**
- Heatmap visualization per habit (365 days)
- Streak calculation and display
- Points calculation (importance × difficulty)
- Full habit editor with:
  - Category/subcategory
  - Tags, contexts, people, location
  - Goal/project association
  - Character traits (STR/INT/CON/PER)
  - Polarity (positive/negative/both)
  - Schedule and target per week
- Done/Miss buttons with event logging
- Analytics button linking to reports

**iOS Implementation:**
- List view with basic info
- Simple "Log" button
- Navigation to detail view (basic)

**Required Work:**
1. Create HabitHeatmap SwiftUI component
2. Add streak calculation service
3. Extend HabitDefinition model for polarity, schedule
4. Create full habit editor view
5. Add character trait picker
6. Connect to ReportsView for analytics

---

### GAP-003: Parser Test Vectors Missing
**Desktop Parsers:** `apps/desktop/src/nlp/` (2248 LOC)
**iOS Parsers:** `apps/insight_swift/.../Parsing/` (678 LOC)

**Issue:**
No shared test vectors exist to validate that desktop and iOS parsers produce identical output for the same input. This makes parity verification difficult.

**Required Work:**
1. Create `packages/shared/test-vectors/parser-inputs.json` with sample captures
2. Create `packages/shared/test-vectors/parser-outputs.json` with expected outputs
3. Add test runner in desktop that validates against vectors
4. Add Swift Testing tests that validate MarkdownCaptureParser against vectors

---

## P1 - Medium Priority Gaps

### GAP-004: Tracker Analytics Missing
**Desktop:** Full heatmaps + trend visualization
**iOS:** List view only

**Required Work:**
- Add tracker heatmap component
- Add trend line chart for tracker values over time

---

### GAP-005: Reports Dashboard Placeholder
**Desktop:** Full analytics with multiple chart types
**iOS:** Placeholder view in MoreScreens

**Required Work:**
- Implement actual charts in ReportsView
- Connect to AppStore for aggregated queries

---

### GAP-006: Calendar Drag/Drop Missing
**Desktop:** Drag to reschedule, timeboxing gestures
**iOS:** View-only calendar

**Required Work:**
- Add DragGesture support for event rescheduling
- Implement conflict card UI

---

### GAP-007: Habit Editor Incomplete
**Desktop:** Full editor with all fields
**iOS:** Basic form

**Required Work:**
- Add schedule picker (day of week + time)
- Add polarity picker
- Add character trait multi-select
- Add target per week field

---

## P2 - Lower Priority Gaps

### GAP-008: Notes Backlinks Missing
**Desktop:** Bidirectional links between notes
**iOS:** No backlinks

---

### GAP-009: Realtime Sync (Enhancement)
**Desktop:** Supabase realtime subscriptions
**iOS:** Pull-based sync

---

## Data Model Compatibility Summary

| Model | Desktop | iOS | Compatible |
|-------|---------|-----|------------|
| Entry/CalendarEvent | Full facets, character, skills | Full facets, character, skills | ✅ Yes |
| Task | Status, priority, dates | TodoTask equivalent | ✅ Yes |
| Habit | Schedule, polarity, character | Basic definition | ⚠️ Partial |
| Tracker | Unit, min/max, presets | TrackerDefinition | ✅ Yes |
| Workout | Session + rows | WorkoutSession + Row | ✅ Yes |
| Nutrition | Log with macros | NutritionLog | ✅ Yes |

---

## Parser Compatibility Summary

| Parser | Desktop | iOS | Notes |
|--------|---------|-----|-------|
| Markdown tokens | `#tag`, `@person`, `!place`, `+context`, `#tracker(value)` | MarkdownCaptureParser.swift | ✅ Same token syntax |
| Intent detection | `detectIntent()` | `detectIntent()` | ✅ Same patterns |
| Auto-categorize | `autoCategorize()` | `autoCategorize()` | ✅ Same categories |
| Task extraction | `- [ ]` checkbox | `extractTasks()` | ✅ Same format |
| LLM parsing | llm-parse.ts via OpenAI | Supabase edge function | ⚠️ Needs verification |
| Natural date parsing | Chrono.js | N/A (server-side) | ⚠️ No native iOS implementation |

---

## Sync Round-Trip Verification

The sync system uses Supabase as the canonical source. Key verification points:

1. **Desktop → Supabase → iOS:** Entry created on desktop should appear on iOS
2. **iOS → Supabase → Desktop:** Entry created on iOS should appear on desktop
3. **Conflict Resolution:** Last-write-wins with updatedAt timestamps

**Current Status:** Both platforms have sync services implemented. Recommend manual testing protocol for round-trip verification.

---

## Recommendations

1. **Short-term (P0):** Focus on dashboard and habit heatmaps - these are high-visibility features
2. **Medium-term (P1):** Complete tracker analytics and reports dashboard
3. **Testing:** Create shared test vectors for parser parity verification
4. **Documentation:** Keep this matrix updated as features are implemented

---

## Next Steps

1. Create individual tickets for each GAP item
2. Prioritize GAP-001 and GAP-002 for immediate implementation
3. Set up parser test vector infrastructure (GAP-003)
4. Schedule sync round-trip testing session
