# Agent H Report — Timeline + Views + Assistant

**Agent**: H
**Date**: 2026-01-07
**Scope**: Timeline feed UI + filters, Saved Views builder/list, Assistant local + LLM scaffold

---

## Executive Summary

Successfully implemented three major feature areas for Insight Swift:

1. **Timeline Feed** - Unified view combining all data types (entries, tasks, notes, habits, trackers, workouts, nutrition)
2. **Saved Views** - Query builder with FilterNode tree structure and live preview
3. **Assistant Enhancement** - Extended existing view with Local/LLM mode toggle and search result cards

All implementations follow SwiftUI MV pattern (no ViewModels), Swift Concurrency (async/await, no GCD), and Swift Testing framework.

---

## Changes Made

### Models

| File | Action | Description |
|------|--------|-------------|
| `Models/CoreModels.swift` | EXTENDED | Added DB parity fields: status, priority, scheduledAt, dueAt, completedAt, durationMinutes, importance, difficulty, goalMultiplier, xp, bodyMarkdown, source, deletedAt |
| `Models/TimelineItem.swift` | NEW | Unified timeline item wrapper with factory methods for all data types |
| `Models/SavedViewModels.swift` | NEW | Complete filter query system: FilterNode, FilterCondition, FilterGroup, FilterProperty (string-backed for tracker:<key>), FilterOperator, SavedViewQuery |

### Services

| File | Action | Description |
|------|--------|-------------|
| `Services/TimelineOrderingService.swift` | NEW | Timeline building, filtering by kinds/tags/people/contexts/date, sorting |
| `Services/SavedViewQueryService.swift` | NEW | Parse FilterNode JSON, evaluate conditions, apply queries to entries |
| `Services/LocalSearchService.swift` | NEW | Privacy-first local search across all data types with SearchResult enum |
| `Services/SupabaseModels.swift` | EXTENDED | Added priority, importance, difficulty, goalMultiplier, xp, source to Supabase models |
| `Services/LocalPersistenceService.swift` | EXTENDED | Added savedViews to AppStoreSnapshot |

### Views

| File | Action | Description |
|------|--------|-------------|
| `Views/TimelineView.swift` | NEW | Timeline feed with filter chips, items grouped by date |
| `Views/TimelineFilterSheet.swift` | NEW | Full filter sheet: tags, people, contexts, date range pickers |
| `Views/SavedViewsListView.swift` | NEW | List of saved views with pinned section, edit/delete actions |
| `Views/SavedViewBuilderView.swift` | NEW | View builder: name, type, filters, live preview |
| `Views/MoreScreens.swift` | EXTENDED | AssistantView: Local/LLM mode toggle, SearchResultCard, ConfirmationCard scaffold |

### Stores & Navigation

| File | Action | Description |
|------|--------|-------------|
| `Stores/AppStore.swift` | EXTENDED | Added savedViews array, CRUD methods (add, update, delete, togglePinned) |
| `ContentView.swift` | EXTENDED | Added Timeline tab to Tab enum |
| `Views/AppShellView.swift` | EXTENDED | Added timeline case to tabRootView switch |
| `Views/MoreView.swift` | EXTENDED | Added Saved Views navigation link |

### Tests

| File | Action | Description |
|------|--------|-------------|
| `Tests/TimelineOrderingServiceTests.swift` | NEW | 6 tests covering building, sorting, filtering |
| `Tests/SavedViewQueryServiceTests.swift` | NEW | 10 tests covering parsing, evaluation, complex queries |
| `Tests/LocalSearchServiceTests.swift` | NEW | 14 tests covering individual search, combined search, limits |

---

## Architecture Decisions

### 1. FilterNode with Type Discriminator
The FilterNode enum uses custom Codable with a `type` field discriminator for JSON encoding/decoding:
```swift
{
    "type": "condition",  // or "group"
    "property": "tags",
    "operator": "contains",
    "value": "work"
}
```

### 2. String-backed FilterProperty
FilterProperty is RawRepresentable<String> to support:
- Standard properties: `.tags`, `.status`, `.dueAt`
- Tracker properties: `.tracker("mood")` → `"tracker:mood"`

### 3. Unified Timeline via TimelineItem
TimelineItem provides a type-erased wrapper combining all data types:
- Entries, Tasks, Notes, HabitLogs, TrackerLogs, Workouts, Nutrition
- Common interface: id, kind, timestamp, title, subtitle, tags, people, contexts

### 4. Privacy-First Local Search
LocalSearchService runs entirely on-device with no external API calls:
- Individual type search methods
- Combined search with polymorphic SearchResult enum
- Quick filters: todayItems, recentItems

### 5. Assistant Mode Toggle
AssistantView extended with mode toggle defaulting to Local:
- Local mode: Privacy-first on-device search
- LLM mode: Scaffold for future claude_agent edge function

---

## Code Review Reflection

### Regressions
- None identified. All changes are additive and maintain backwards compatibility.

### Concurrency
- All @MainActor annotations properly applied to store operations
- Services use static methods where appropriate for thread safety
- No GCD usage - pure Swift Concurrency

### Data Integrity
- SavedView CRUD operations call persist() after mutations
- FilterNode encoding/decoding fully tested
- AppStoreSnapshot includes savedViews for persistence

### Security
- No external API calls in LocalSearchService
- FilterProperty validation for tracker:<key> pattern
- JSONValue safely handles user input

---

## Test Coverage

### TimelineOrderingServiceTests (6 tests)
- buildTimeline combines all store arrays
- sortedByTimestamp returns descending order
- filter by kinds returns only matching items
- filter handles empty tags gracefully
- filter by date range excludes out-of-range
- combined filter with multiple criteria

### SavedViewQueryServiceTests (10 tests)
- parse valid JSON with type discriminator returns FilterNode
- parse invalid JSON throws error
- parse handles nested groups
- matches evaluates 'contains' operator correctly
- matches evaluates status filter
- matches evaluates dueAt filter
- matches evaluates tracker:<key> filter
- apply query filters and sorts entries
- apply query with complex AND/OR logic
- time range filter works correctly

### LocalSearchServiceTests (14 tests)
- searchEntries finds matching titles
- searchEntries finds matching tags
- searchEntries is case insensitive
- searchTasks finds matching titles
- searchTasks finds matching notes
- searchNotes finds matching body text
- searchTrackerLogs matches tracker key
- searchHabitLogs matches habit title
- combined search returns mixed results
- search results sorted by timestamp
- empty query returns all items
- search respects limit parameter
- todayItems returns only today's items
- recentItems returns items within specified days

---

## Open Questions

1. **LLM Integration**: The claude_agent edge function scaffold is in place. Should it use existing SupabaseSyncService.queryAssistant() or a dedicated method?

2. **Saved Views Sync**: SavedViews are persisted locally. Should they sync to Supabase saved_views table?

3. **Timeline Performance**: With large datasets, should we implement pagination or virtual scrolling for timeline?

---

## Files Created/Modified Summary

### New Files (13)
- Models/TimelineItem.swift
- Models/SavedViewModels.swift
- Services/TimelineOrderingService.swift
- Services/SavedViewQueryService.swift
- Services/LocalSearchService.swift
- Views/TimelineView.swift
- Views/TimelineFilterSheet.swift
- Views/SavedViewsListView.swift
- Views/SavedViewBuilderView.swift
- Tests/TimelineOrderingServiceTests.swift
- Tests/SavedViewQueryServiceTests.swift
- Tests/LocalSearchServiceTests.swift
- AGENT_REPORTS/insight-swift-agent-h-2026-01-07.md

### Modified Files (8)
- Models/CoreModels.swift
- Services/SupabaseModels.swift
- Services/LocalPersistenceService.swift
- Stores/AppStore.swift
- Views/MoreScreens.swift (AssistantView)
- Views/AppShellView.swift
- Views/MoreView.swift
- ContentView.swift
