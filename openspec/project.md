# Project Context

## Overview
Insight 5 is a voice-first life OS for logging events, tasks, habits, and trackers with automatic structuring. "Done" means capture/plan UX matches the canonical PRD and the ecosystem refactor removes duplicate/incorrect classifications.

## Tech stack
- Language(s): TypeScript, Swift (native app)
- Framework(s): React (desktop), React Native/Expo (mobile), Supabase (backend)
- Build/test commands: no repo-wide test script; use targeted app commands as needed.

## Conventions
- Code style: follow existing patterns per app; keep changes scoped to relevant modules.
- Folder structure: `apps/desktop`, `apps/insight-mobile`, `apps/mobile4`, `packages/*`.
- Naming: adhere to existing file/component conventions in each app.

## Architecture constraints (invariants)
- PRD + wireframes are source of truth (`PRD/WIREFRAME_SOURCE_OF_TRUTH.md`).
- Parsing rules must align with `PRD/APPENDIX_A_LANGUAGE_SPEC.md` and `PRD/LOGGING_FORMAT.md`.
- Supabase remains canonical source of truth.

## Verification
- Unit tests: add where parser/linker logic changes.
- Integration/E2E: manual verification for calendar/task/goal flows unless existing automation exists.
