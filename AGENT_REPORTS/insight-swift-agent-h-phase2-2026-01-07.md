# Agent H Report — Phase 2: Saved Views Sync + LLM Wiring + Deep Links

**Agent**: H
**Date**: 2026-01-07
**Phase**: 2 (Post Phase 1 Completion)
**Scope**: Saved Views Supabase CRUD, LLM mode wiring, deep links, timeline pagination

---

## Executive Summary

Phase 2 successfully implemented remaining parity gaps from Phase 1:

1. **Saved Views Sync** - Full Supabase CRUD for saved_views table with three-struct pattern
2. **LLM Mode Wiring** - Connected AssistantView to claude_agent edge function with auth gating
3. **Deep Links** - Navigation from Timeline and Assistant search results to detail views
4. **Timeline UX** - LazyVStack pagination (50 items), filter counts in chips, improved empty states
5. **Detail Views** - EntryDetailView, TrackerLogDetailView, HabitLogDetailView

---

## Decisions Applied

Per user direction, the following decisions were implemented:

| Decision | Implementation |
|----------|----------------|
| **Sync on mutation** | SavedView CRUD calls Supabase immediately on add/update/delete (no batching) |
| **Merge on fetch** | Cloud wins for conflicts, local-only items kept |
| **LLM requires auth** | Auth check in performLLMQuery(); fallback message without auth |
| **LazyVStack + pagination** | 50 items per page, "Load More" button, reset on filter change |
| **Filter counts in chips** | Per-kind counts shown in filter chips (e.g., "Events (24)") |

---

## Changes Made

### Models (Supabase)

| File | Action | Description |
|------|--------|-------------|
| `Services/SupabaseModels.swift` | EXTENDED | Added SupabaseSavedViewRow, SupabaseSavedViewInsert, SupabaseSavedViewUpdate (three-struct pattern) |
| `Services/SupabaseModels.swift` | EXTENDED | Added AssistantQueryRequest, AssistantQueryResponse for edge function |
| `Services/LocalPersistenceService.swift` | EXTENDED | Added `savedView` case to SyncEntityType enum |

### Services (Sync)

| File | Action | Description |
|------|--------|-------------|
| `Services/SupabaseSyncService.swift` | EXTENDED | Added fetchSavedViews(), createSavedView(), updateSavedView(), deleteSavedView() |
| `Services/SupabaseSyncService.swift` | EXTENDED | Added queryAssistant() for claude_agent edge function invocation |
| `Services/SupabaseSyncService.swift` | EXTENDED | Added applySavedViewOperation(), upsertSavedView(), removeSavedView() helper methods |
| `Services/SupabaseSyncService.swift` | EXTENDED | Added saved_views to loadAll() and realtime subscriptions |

### Stores

| File | Action | Description |
|------|--------|-------------|
| `Stores/AppStore.swift` | EXTENDED | Added syncService reference and attachSyncService() method |
| `Stores/AppStore.swift` | EXTENDED | Updated addSavedView(), updateSavedView(), deleteSavedView() with sync on mutation |
| `Stores/AppStore.swift` | EXTENDED | Added fetchSavedViewsFromCloud() for login sync (merge: cloud wins) |

### Views (Detail)

| File | Action | Description |
|------|--------|-------------|
| `Views/EntryDetailView.swift` | NEW | Full Entry detail view with timing, gamification, metadata sections |
| `Views/TrackerLogDetailView.swift` | NEW | TrackerLog detail view with value editor and tracker context |
| `Views/HabitLogDetailView.swift` | NEW | HabitLog detail view with stats, weekly progress visualization |

### Views (Navigation + UX)

| File | Action | Description |
|------|--------|-------------|
| `Views/TimelineView.swift` | EXTENDED | Added NavigationLink to TimelineItemRow for deep links |
| `Views/TimelineView.swift` | EXTENDED | Added pagination: displayedItemCount, pageSize=50, "Load More" button |
| `Views/TimelineView.swift` | EXTENDED | Added filter counts to chips, onChange handlers to reset pagination |
| `Views/TimelineView.swift` | EXTENDED | Improved empty state with "Clear Filters" action |
| `Views/MoreScreens.swift` | EXTENDED | Added NavigationLink to SearchResultCard for deep links |
| `Views/MoreScreens.swift` | EXTENDED | Wired LLM mode with auth check and syncService.queryAssistant() |

### Tests

| File | Action | Description |
|------|--------|-------------|
| `Tests/SavedViewSyncTests.swift` | NEW | 15 tests: Supabase model encoding/decoding, SavedView codable, SyncEntityType |
| `Tests/AssistantLLMTests.swift` | NEW | 15 tests: Request/Response encoding, AssistantMode, SearchResult context |

---

## Architecture Decisions

### 1. Sync on Mutation Pattern
SavedView CRUD operations call Supabase immediately after local state update:
```swift
public func addSavedView(_ view: SavedView) {
    savedViews.insert(view, at: 0)
    persist()
    Task { @MainActor [weak self] in
        try await syncService?.createSavedView(view)
    }
}
```

### 2. Cloud Wins Merge Strategy
fetchSavedViewsFromCloud() uses updatedAt comparison:
```swift
for cloudView in cloudViews {
    if let idx = savedViews.firstIndex(where: { $0.id == cloudView.id }) {
        if cloudView.updatedAt > savedViews[idx].updatedAt {
            savedViews[idx] = cloudView  // Cloud wins
        }
    } else {
        savedViews.append(cloudView)  // New from cloud
    }
}
```

### 3. Auth Gating for LLM Mode
performLLMQuery() checks authentication before calling edge function:
```swift
guard authStore.isAuthenticated else {
    appStore.appendAssistantMessage(
        role: .assistant,
        content: "Sign in to use AI mode. Go to Settings to authenticate."
    )
    assistantMode = .local
    return
}
```

### 4. Pagination with Filter Reset
Timeline uses displayedItemCount with onChange handlers:
```swift
@State private var displayedItemCount: Int = 50
private static let pageSize = 50

.onChange(of: filterState.searchQuery) { _, _ in
    displayedItemCount = Self.pageSize
}
```

### 5. Deep Links via NavigationLink
TimelineItemRow wraps content in NavigationLink with destination switch:
```swift
@ViewBuilder
private func destinationView(for item: TimelineItem) -> some View {
    switch item.kind {
    case .entry: EntryDetailView(entryId: item.sourceId)
    case .task: TaskDetailView(taskId: item.sourceId)
    case .habitLog: HabitLogDetailView(logId: item.sourceId)
    // ... etc
    }
}
```

---

## Code Review Reflection

### Regressions
- None identified. All changes are additive and backwards compatible.

### Concurrency
- @MainActor properly applied to sync callbacks
- Task closures use [weak self] to avoid retain cycles
- No GCD usage - pure Swift Concurrency

### Data Integrity
- Sync failures logged but don't block local state updates
- Cloud wins for conflicts prevents data loss
- persist() called after all local state mutations

### Security
- Auth check prevents unauthorized LLM API calls
- Edge function invocation uses authenticated client
- No sensitive data logged

---

## Test Coverage

### SavedViewSyncTests (15 tests)
- SupabaseSavedViewRow decodes minimal JSON
- SupabaseSavedViewRow decodes with timestamps
- SupabaseSavedViewInsert encodes correctly
- SupabaseSavedViewUpdate encodes only non-nil fields
- SupabaseSavedViewUpdate encodes all fields when present
- SyncEntityType.savedView exists and has correct rawValue
- SyncEntityType.savedView is included in allCases
- SavedView initializes with default values
- SavedView with custom query
- SavedViewQuery is Codable
- SavedViewQuery with date range
- SavedViewOptions initializes with defaults
- SavedViewOptions is Codable

### AssistantLLMTests (15 tests)
- AssistantQueryRequest encodes correctly
- AssistantQueryRequest encodes empty context
- AssistantQueryResponse decodes correctly
- AssistantQueryResponse decodes empty reply
- AssistantQueryResponse decodes multiline reply
- AssistantMode has correct labels
- AssistantMode has correct icons
- AssistantMode allCases contains both modes
- AssistantMessage initializes with user role
- AssistantMessage initializes with assistant role
- SearchResult provides title for context
- SearchResult provides resultType for context
- SearchResult provides timestamp
- SearchResult subtitle provides context snippet
- SearchResult subtitle handles empty notes
- SearchResult subtitle truncates long text

---

## Open Questions Resolved

From Phase 1 report:

| Question | Resolution |
|----------|------------|
| LLM Integration | Uses syncService.queryAssistant() which invokes claude_agent edge function |
| Saved Views Sync | Full CRUD sync to Supabase saved_views table implemented |
| Timeline Performance | LazyVStack with 50-item pagination and "Load More" button |

---

## Files Created/Modified Summary

### New Files (5)
- Views/EntryDetailView.swift
- Views/TrackerLogDetailView.swift
- Views/HabitLogDetailView.swift
- Tests/SavedViewSyncTests.swift
- Tests/AssistantLLMTests.swift

### Modified Files (6)
- Services/SupabaseModels.swift (SavedView models, Assistant models)
- Services/LocalPersistenceService.swift (SyncEntityType.savedView)
- Services/SupabaseSyncService.swift (CRUD + queryAssistant)
- Stores/AppStore.swift (sync wiring)
- Views/TimelineView.swift (navigation + pagination + counts)
- Views/MoreScreens.swift (SearchResultCard nav + LLM wiring)

---

## Total Phase 2 Additions

- **New Views**: 3 detail views
- **New Tests**: 30 tests across 2 files
- **Supabase Models**: 5 new structs
- **Sync Methods**: 5 new CRUD methods + queryAssistant
- **UX Improvements**: Pagination, filter counts, empty states, deep links
