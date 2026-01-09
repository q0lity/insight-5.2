# Agent 10 — Insight Swift Orchestrator (4-Agent Master Plan)

## Mission
Coordinate four parallel agents to deliver Insight Swift per the PRD, with tests and code review reflection baked into every slice. Keep parity with desktop behavior and `apps/mobile2` visual direction while staying within SwiftUI MV patterns.

## Sources of Truth (always reconcile against)
- `PRD/INSIGHT_SWIFT_PRD.md`
- `PRD/INSIGHT_SWIFT_BUILD_PLAN.md`
- `PRD/WEB_TO_MOBILE_PARITY_MATRIX.md`
- `PRD/CAPTURE_PIPELINE_SPEC.md`
- `PRD/APPENDIX_C_UI_SPEC.md`
- `PRD/APPENDIX_F_DATA_DICTIONARY.md`
- `apps/insight_swift/CLAUDE.md` (architecture + testing rules)
- `apps/desktop` (behavior parity)
- `apps/mobile2` (visual direction)

## Non-Negotiables
- Implement features in `apps/insight_swift/InsightSwiftPackage/Sources/` only.
- No ViewModels. Use SwiftUI MV patterns and `@Observable` services.
- Swift Concurrency only (async/await, actors). No GCD.
- Swift Testing framework for all tests.
- Update `REQUESTS_LOG.md` and `MASTER_CHANGELOG.md` per feature.

## 60-Minute Scope Rule
If a task looks like it will exceed 60 minutes of focused work, split it into smaller slices and confirm priorities before continuing. Log the split in the agent report.

## Four-Agent Role Split (default)
1) **Agent A — Foundation + Shell**
   - Navigation shell (iPhone tabs + iPad split layout).
   - Theme tokens + base components using `apps/mobile2` assets.
   - App-wide environment services (router, theme).

2) **Agent B — Data + Sync**
   - SwiftData models mirroring shared schema.
   - Supabase client wiring and offline queue structure.
   - Repository/service layer contracts for core entities.

3) **Agent C — Capture + Parser**
   - Capture input model + parse review flow.
   - JS parser bridge (JavaScriptCore) with parity test vectors.
   - Voice capture pipeline per `CAPTURE_PIPELINE_SPEC`.

4) **Agent D — Core Parity Views**
   - Calendar (day/week/month skeletons with all-day lane).
   - Plan/Agenda list + time ordering.
   - Tasks/Habits/Notes scaffolds as needed for parity wiring.

## Priority Ladder (work top-down)
**P0 Foundation**
- App shell, navigation, theme tokens, assets import.
- Data model baseline + local persistence.
- Supabase auth + client bootstrap.

**P1 Core Parity**
- Capture + parsing review flow.
- Calendar/Plan/Timeline core interactions.
- Tasks/Notes/Habits basic CRUD and list views.

**P2 Integrations**
- Calendar sync (Google/Microsoft) + EventKit.
- HealthKit ingestion, notifications, Live Activities.
- Background audio for capture.

**P3 Final Parity + Polish**
- Reports/Analytics, Assistant, Rewards/XP, Ecosystem.
- Performance, stability, onboarding.

## Round-1 Assignments (for the 4 active agents)
- **Agent A:** Implement navigation shell + theme tokens + base components. Add UI smoke tests where feasible.
- **Agent B:** Define SwiftData models for Event/Task/Habit/TrackerLog, plus a minimal repository layer. Add model encode/decode tests.
- **Agent C:** Create capture model + JS parser bridge with parity test vectors. Add tests for input -> JSON outputs.
- **Agent D:** Scaffold Calendar + Plan views with all-day lane, agenda ordering, and placeholder data hooks. Add a layout algorithm test.

## Testing Requirements (every agent)
- Add or update Swift Testing tests in `InsightSwiftPackage/Tests/`.
- Minimum per feature: 1 happy path, 1 failure path, 1 edge case.
- For parser work: maintain parity vectors (input -> JSON).

## Code Review Reflection (required in report)
- Regressions to watch for (data loss, sync conflicts, UI parity gaps).
- Concurrency risks (non-main UI updates, actor safety).
- Data integrity risks (schema mismatch, missing fields).
- Security/privacy risks (tokens, audio storage, PII logging).
- Missing tests or areas needing follow-up.

## Reporting + Handoff Protocol
- Write a report to `AGENT_REPORTS/insight-swift-<agent>-YYYY-MM-DD.md`.
- Include: changes, tests run, review reflection, open questions.
- If blocked, ask a concrete question and propose a next-step fallback.
- When done, pick the next item from the Priority Ladder or ask for clarification on the next highest priority task.
