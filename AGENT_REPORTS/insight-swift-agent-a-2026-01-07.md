# Insight Swift Agent A Report (2026-01-07)

## Scope
- Data persistence + sync reliability improvements for Insight Swift.

## Changes
- Added SwiftData-backed persistence with snapshot storage, offline sync queue records, and conflict logging helpers in `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/LocalPersistenceService.swift`.
- Wired persistence into app lifecycle and app store updates in `apps/insight_swift/InsightSwift/InsightSwiftApp.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Stores/AppStore.swift`, and `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/ContentView.swift`.
- Reworked Supabase realtime listeners to avoid channel type casts and ensured persistence saves on inbound changes in `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`.
- Added offline queue flush logic with ID remapping for inserts, plus conflict logging when remote updates arrive during pending local ops in `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`.
- Extended Supabase row models to carry created/updated/deleted timestamps in `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseModels.swift`.
- Added Swift Testing coverage for persistence snapshots in `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/LocalPersistenceServiceTests.swift`.
- Updated logs in `REQUESTS_LOG.md` and `MASTER_CHANGELOG.md`.

## Tests
- Not run (new Swift Testing file added: `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/LocalPersistenceServiceTests.swift`).

## Code Review Reflection
- Regressions to watch: local-to-remote ID remapping for queued inserts (ensure logs and entities update correctly after insert responses).
- Concurrency risks: realtime listener tasks run continuously; ensure no UI updates happen off main actor (current service is @MainActor).
- Data integrity: queue flush assumes inserts only for several entity types; updates/deletes need expansion for full parity.
- Security/privacy: no sensitive data logged; local snapshot stores user data on-device via SwiftData.
- Missing tests: queue flush path and conflict logging behavior are not yet unit-tested.

## Open Questions
- Should offline queue handle update/delete for goals/projects/habits/entities in v1, or only inserts?
- Do we want to persist only core entities (entries/tasks/notes/trackers) instead of full AppStore snapshot?

---

## Update 2 (Offline Queue Updates + allDay Frontmatter)

### Changes
- Added frontmatter support for entries and mirrored `allDay` into Supabase frontmatter during sync, with read-back into local entries (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseModels.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).
- Implemented offline queue update/delete handling for goals, projects, habits, trackers, entities, and entries (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`).
- Added conflict logging retrieval and Swift Testing coverage for happy/failure/edge cases (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/LocalPersistenceService.swift`, `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/LocalPersistenceServiceTests.swift`).

### Tests
- Not run (new tests in `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/LocalPersistenceServiceTests.swift`).

### Code Review Reflection
- Regressions to watch: delete operations now enqueue empty payloads; ensure queue flush treats delete as action-only and does not rely on payload content.
- Data integrity: frontmatter allDay is now stored in Supabase and read back; ensure desktop and future schema expectations align on key naming.
- Missing tests: no coverage yet for queue flush update/delete paths; consider adding mocked Supabase tests once a test seam exists.

### Open Questions
- Should frontmatter include other schedule fields (timezone, recurrence) alongside allDay?
- Do we want explicit UI hooks for update/delete methods now that queue support exists?

---

## Update 3 (App Shell + Theme Tokens + Queue Tests)

### Changes
- Added iPad split-view navigation with sidebar selection and shared tab metadata; preserved iPhone tab bar shell (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/AppShellView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/ContentView.swift`).
- Expanded theme metrics to mirror `apps/mobile2` token sizes (metric label/value, chip sizing, heatmap sizing, tiny icon) and applied to base components (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Theme/InsightTheme.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Components/InsightComponents.swift`).
- Added a test seam for offline queue flushing plus Swift Testing coverage for update/delete flush, failure attempt tracking, and ID remap, and refreshed snapshot test data to use workout/nutrition models (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Services/SupabaseSyncService.swift`, `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/SupabaseSyncServiceTests.swift`, `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/LocalPersistenceServiceTests.swift`).

### Tests
- Not run (added/updated tests in `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/SupabaseSyncServiceTests.swift` and `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/LocalPersistenceServiceTests.swift`).

### Code Review Reflection
- Regressions to watch: split-view selection state could drift if size class changes mid-session; verify `selectedTab` keeps sidebar selection in sync.
- UI parity risk: capture button padding differs between iPhone and iPad; confirm this matches the intended floating action placement from `apps/mobile2`.
- Data integrity: queue flush test seam bypasses auth in tests only; ensure production path still requires auth before flushing.
- Missing tests: no UI tests yet for split-view/tab shell or theme metrics; consider adding snapshot or smoke UI coverage later.

### Open Questions
- Should the iPad sidebar include quick actions (capture, search) or mirror desktop left nav structure?
- Do we want to adopt the `apps/mobile2` font family (Figtree) in Swift assets for closer visual parity?

---

## Update 4 (Appendix-C Navigation Shell)

### Changes
- Added UnderbarView and ContextPanelView components with Capture/Search/Focus wiring and context toggles (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Components/UnderbarView.swift`, `apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/Components/ContextPanelView.swift`).
- Reworked AppShellView to replace the floating capture button with the underbar, add iPad sidebar quick actions, and show context panel as a right-side drawer or iPhone sheet (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Views/AppShellView.swift`).
- Added theme sizing tokens for underbar height and context panel width (`apps/insight_swift/InsightSwiftPackage/Sources/InsightSwiftFeature/Theme/InsightTheme.swift`).
- Added Swift Testing render coverage for underbar and context panel (`apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/UnderbarContextPanelTests.swift`).

### Tests
- Not run (new test file: `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/UnderbarContextPanelTests.swift`).

### Code Review Reflection
- UI parity risk: underbar placement relies on safe area inset above the tab bar; verify it does not overlap content on smaller iPhones.
- Interaction risk: focus action toggles stop when active; ensure this matches desired behavior for focus flows.
- Data integrity: context panel is read-only for goal/project; consider integrating active goal selection once that state exists.
- Fonts: `apps/mobile2` uses Figtree but no iOS font assets were found in this repo; kept Avenir in `AppFont` for now.

### Open Questions
- Should the context panel include a live capture queue count once capture review is fully wired?
- Do we want the underbar to hide on scroll or remain pinned at all times?

---

## Update 5 (Shell QA + Context Data Wiring)

### Changes
- Wired context panel to live data: active focus session, top goal/project from the store, and pending review count from the capture pending store (`AppShellView.swift`, `ContextPanelView.swift`).
- Added accessibility identifiers/labels for underbar and context controls; ensured a single primary capture CTA (underbar) with no floating duplicate (`UnderbarView.swift`, `AppShellView.swift`, `ContextPanelView.swift`).
- Added iPhone/iPad shell render smoke tests for underbar/context visibility (`UnderbarContextPanelTests.swift`).
- Documented font decision: Figtree assets not present in repo; kept Avenir in `AppFont` as explicit fallback.

### Tests
- Not run (new tests in `apps/insight_swift/InsightSwiftPackage/Tests/InsightSwiftFeatureTests/UnderbarContextPanelTests.swift`).

### Code Review Reflection
- Accessibility: IDs added; still need VoiceOver manual pass to ensure ordering and hints are correct.
- Data fidelity: pending review count comes from `CapturePendingStore` defaults; when capture review queue is wired, ensure the same store instance is shared.
- UI risk: context drawer toggle state might need persistence on iPad; consider defaulting to open when a focus session is active.
- Font parity: remains Avenir due to missing Figtree iOS assets; if assets arrive, update `AppFont` to use them with system fallback.

### Open Questions
- Should context panel auto-open when a focus session starts?
- Do we want to expose active goal/project selection UI to replace the current “top-of-list” heuristic?
