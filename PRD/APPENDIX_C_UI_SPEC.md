# Appendix C — UI Spec (Beauty + Interactivity)

## C0) Wireframe Source of Truth
- Canonical wireframes and capture/outline contract live in `PRD/WIREFRAME_SOURCE_OF_TRUTH.md`.
- Capture UX and live outline must follow the bullet-journal block format and maximum linker rules defined there.

## C1) Global Style Requirements
- Calm, modern aesthetic (Obsidian-inspired density, not clutter).
- Strong typography hierarchy and clear spacing system.
- Smooth motion (subtle, fast) and haptic feedback on key actions.
- Dark mode is first-class (MVP).
- Platform governance: Web UI is the source of truth; desktop/web layouts remain stable and mobile adapts for parity.
- Mobile capture UX is the highest priority for touch and voice flows.

## C2) Navigation (Confirmed)
- Left bar: primary modules
- Underbar: primary actions
- Right bar: context panel (active goal/project, active timer, pending review)

Desktop:
- Left nav persists; right panel becomes resizable.
- Keyboard shortcuts:
  - `/` focus global search
  - `Cmd/Ctrl+K` command palette
  - `Cmd/Ctrl+Shift+V` voice capture (optional)

Mobile adaptations:
- Left bar collapses to a menu
- Underbar stays persistent for primary actions
- Right panel becomes a drawer/modal

## C3) Core Components Inventory
- Review Card (swipe accept/reject, edit inline)
- Tracker Chip (`#mood(8)`) clickable drilldown
- Tag Chip (`health/fitness`) hierarchical browsing
- Goal/Project Pills (quick link/unlink)
- Time Block (calendar block with drag handles)
- Timer Card (active timer with XP preview)
- Workout Table (sortable columns, quick row add)
- Heatmap Card (GitHub-style)
- Column Picker (Tasks table configurable columns)
- Subtask Drawer (expandable task checklist)
- Plan Split Panel (outline + Gantt synced)
- Countdown Badge (days/hours remaining on scheduled items)

## C4) Microinteractions
- Swipe cards: snap + subtle sound/haptic on accept/reject
- Timer: pulsing progress ring + “XP earned” increment animation
- Completing a habit: confetti optional (toggle)

## C5) Screen-Level Requirements (MVP)
### Dashboard
- Above-the-fold: Today timeline, Quick Log, Active Timer
- Mid: XP ring, streaks, top trackers
- Bottom: pinned views

### Voice Log / Capture
- One-tap capture from any screen
- Live transcript with best-effort markdown preview
- Clear offline state and pending-capture indicator

### Calendar
- Day timeline with pinch/zoom density (optional)
- Quick add button + voice add
- Drag/drop reschedule and resize
- All-day lane sits above the time grid and holds all-day events plus unscheduled tasks (drag into grid).
- Read-only calendars render as events with a lock state; visible but not synced back.
- Countdown badges appear on events/tasks with a target date.

### Settings / Onboarding
- Default auto-start is configurable at onboarding (auto-start on by default).

### Tasks
- Adjustable columns (persisted per view)
- Start button per row (starts timer, sets status in_progress)
- Subtask drawer (checklist with quick add)
- Auto-suggest category/project/goal from ecosystem memory
- Remove marketing tagline; keep header minimal (Tasks + filters)
- Countdown badges show time-to-due/scheduled for visible tasks.

### Goals
- Plan view is a split panel: outline + Gantt synced
- Remove button with confirmation modal (bottom-right on card)
- Countdown badges show time-to-target for goal milestones.

### Habits
- Consistency heatmap + mini trend graph (done vs missed)
- Habit completion auto-checks when logged via events

### Habits
- Habit list with streak and daily completion
- Tap habit to see heatmap + history + linked goals/projects

### Fitness
- Sessions list + charts
- Session detail includes sortable table + quick add row
- Workout rows can expand into per-set entries (weight/reps/RPE)

### Nutrition
- Add meal: photo + voice + editable fields
- History list + simple charts
- Daily/Week/Month tabs for timeline and totals

### Entry Detail
- Header shows title + chips + tabs only; no Points/Running tiles.

### Timeline
- Feed with filter drawer
- “Jump to date” control

### Views
- Saved views list (searchable)
- View builder (filters/sorts/groups) + preview

## C6) “Beautiful by Default”
Ship with:
- curated color themes (2–3)
- polished empty states (examples + CTA)
- consistent iconography
