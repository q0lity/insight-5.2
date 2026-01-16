# Specification: UI Consistency & Multi-Select Item Properties

## Overview

This task addresses three core UI/UX improvements in the Insight desktop application: (1) achieving full property parity between the right sidebar details panel and the main calendar view, (2) converting the item type selector (EVENT/TASK/NOTE/HABIT/TRACKER) from exclusive single-select to additive multi-select to support items being both events AND tasks simultaneously, and (3) adding the dashboard-style category/property selector pattern to the Tasks pane and Notes section for filtering consistency across all views.

## Workflow Type

**Type**: feature

**Rationale**: This involves adding new functionality (multi-select item types), enhancing existing UI components (details panel parity, filter selectors), and requires data model changes to support additive properties. The changes span multiple views and components, making this a multi-faceted feature implementation.

## Task Scope

### Services Involved
- **desktop** (primary) - React/Vite frontend application containing all affected UI components
- **shared** (integration) - TypeScript type definitions for CalendarEvent, CalendarEventKind

### This Task Will:
- [ ] Enhance right sidebar details panel to display all calendar event properties at parity
- [ ] Convert item type selector (EVENT/TASK/NOTE/HABIT/TRACKER) from exclusive to additive multi-select
- [ ] Add category/tag/people/places filter selector to Task pane (ticktick-tasks.tsx)
- [ ] Ensure Notes section uses consistent filter pattern with dashboard
- [ ] Update data model to support items having multiple kinds simultaneously

### Out of Scope:
- Backend/Supabase schema changes (local-first architecture)
- Mobile app changes (insight-mobile)
- New property types not currently in the CalendarEvent model
- Landing page changes

## Service Context

### Desktop App

**Tech Stack:**
- Language: TypeScript
- Framework: React 18 with Vite
- Build Tool: Vite
- Styling: Tailwind CSS
- State: React useState/useEffect (local state)
- Storage: Dexie (IndexedDB), Supabase sync

**Entry Point:** `apps/desktop/src/App.tsx`

**How to Run:**
```bash
cd apps/desktop && npm run dev
```

**Port:** 5174

### Shared Package

**Tech Stack:**
- Language: TypeScript
- Type: Library (type definitions, utilities)

**Entry Point:** `packages/shared/src/index.ts`

**Key Types:**
- `CalendarEventKind`: `'event' | 'task' | 'log' | 'episode'`
- `CalendarEvent`: Core event model with `kind` field

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `apps/desktop/src/App.tsx` | desktop | Update details panel properties, convert `detailNotesFilter` to multi-select array, modify item type selector behavior (lines ~6799-6814) |
| `apps/desktop/src/workspace/views/ticktick-tasks.tsx` | desktop | Add category/tag/people/places filter bar using dashboard pattern |
| `apps/desktop/src/workspace/views/notes.tsx` | desktop | Verify filter selector is consistent with dashboard pattern |
| `packages/shared/src/models.ts` | shared | Update CalendarEvent type to support multiple kinds via `kinds: CalendarEventKind[]` or add `isTask`, `isEvent` boolean flags |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `apps/desktop/src/workspace/views/dashboard.tsx` (lines 279-437, 1064-1122) | Category/tag filter selector pattern with chip-based UI |
| `apps/desktop/src/workspace/views/notes.tsx` (lines 28-71, 124-134) | Filter type state, currentFilterOptions memo pattern |
| `apps/desktop/src/App.tsx` (lines 6799-6814) | Current item type selector implementation to modify |

## Patterns to Follow

### Dashboard Filter Selector Pattern

From `apps/desktop/src/workspace/views/dashboard.tsx`:

```typescript
type FilterType = 'all' | 'category' | 'tag' | 'person' | 'place'

// State
const [filterType, setFilterType] = useState<FilterType>('all')
const [selectedFilters, setSelectedFilters] = useState<string[]>([])

// Filter options memo
const currentFilterOptions = useMemo(() => {
  switch (filterType) {
    case 'category': return availableCategories
    case 'tag': return availableTags
    case 'person': return availablePeople
    case 'place': return availablePlaces
    default: return []
  }
}, [filterType, availableCategories, availableTags, availablePeople, availablePlaces])

// JSX - Filter type buttons
<div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg)' }}>
  {(['all', 'category', 'tag', 'person', 'place'] as const).map((ft) => (
    <button
      key={ft}
      onClick={() => {
        setFilterType(ft)
        setSelectedFilters([])
      }}
      className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] rounded-lg transition-all"
      style={{
        background: filterType === ft ? 'var(--panel)' : 'transparent',
        color: filterType === ft ? 'var(--text)' : 'var(--muted)',
      }}
    >
      {ft === 'all' ? 'All' : ft === 'category' ? 'Categories' : ...}
    </button>
  ))}
</div>

// JSX - Filter chips (multi-select)
{filterType !== 'all' && currentFilterOptions.length > 0 && (
  <div className="flex flex-wrap gap-2">
    {currentFilterOptions.map((opt) => {
      const isSelected = selectedFilters.includes(opt)
      return (
        <button
          key={opt}
          onClick={() => {
            if (isSelected) {
              setSelectedFilters(selectedFilters.filter((f) => f !== opt))
            } else {
              setSelectedFilters([...selectedFilters, opt])
            }
          }}
          className="px-3 py-1.5 text-[11px] font-semibold rounded-full transition-all"
          style={{
            background: isSelected ? 'var(--accent)' : 'var(--panel)',
            color: isSelected ? 'white' : 'var(--text)',
          }}
        >
          {opt}
        </button>
      )
    })}
  </div>
)}
```

**Key Points:**
- Filter type selector at top (ALL, CATEGORIES, TAGS, PEOPLE, PLACES)
- Chips for individual filter values that can be multi-selected
- Clear button when filters are active
- selectedFilters is an array enabling multi-select

### Current Item Type Selector (to modify)

From `apps/desktop/src/App.tsx` (lines 6799-6814):

```typescript
// Current: Single-select exclusive
const [detailNotesFilter, setDetailNotesFilter] = useState<'event' | 'task' | 'note' | 'habit' | 'tracker'>('event')

{(['event', 'task', 'note', 'habit', 'tracker'] as const).map((kind) => {
  const active = detailNotesFilter === kind
  return (
    <button
      onClick={() => {
        setDetailNotesFilter(kind)
        if (kind === 'event' || kind === 'task') {
          commitEvent({ ...selectedEvent, kind })  // Exclusive assignment
        }
      }}
    >
      {kind.toUpperCase()}
    </button>
  )
})}
```

**What to change:**
- Convert `detailNotesFilter` to array: `useState<Array<'event' | 'task' | 'note' | 'habit' | 'tracker'>>(['event'])`
- Toggle behavior instead of replace: add/remove from array on click
- Update `commitEvent` to handle multiple kinds (new `kinds` field or boolean flags)

## Requirements

### Functional Requirements

1. **Right Sidebar Property Parity**
   - Description: The right sidebar details panel must display all properties visible when creating/editing events in the main calendar view
   - Properties to ensure: Start/End times, Duration, All Day toggle, Location, Room, People, Attendees, Character (STR/INT/CON/PER), Goal, Pre/Post checklist, Project, Category/Subcategory, Tags, Importance slider, Difficulty/Energy slider
   - Acceptance: All properties visible in calendar composer are also editable in right sidebar

2. **Multi-Select Item Types**
   - Description: Items can be both events AND tasks (additive properties, not mutually exclusive)
   - Current behavior: Selecting TASK unselects EVENT, vice versa
   - New behavior: Clicking toggles the type on/off; an item can have multiple types selected
   - Acceptance: User can create an item that is both "event" and "task" simultaneously; both badges appear; filtering by either type includes the item

3. **Task Pane Filter Selector**
   - Description: Add category/tag/people/places filter bar to Tasks view matching dashboard pattern
   - Location: Below the existing inbox/today/next7/all/done filter row
   - Acceptance: Users can filter tasks by category, tag, person, or place using multi-select chips

4. **Notes Section Filter Consistency**
   - Description: Ensure Notes view filter selector matches dashboard pattern exactly
   - Current state: Already has filter pattern but may need UI consistency tweaks
   - Acceptance: Notes filter UI matches dashboard filter UI pixel-perfect

### Edge Cases

1. **Empty kinds array** - Default to ['event'] if no types selected
2. **Legacy data migration** - Existing items with single `kind` field should continue to work; read `kind` as `kinds: [kind]`
3. **Filter with no matches** - Show "No results" state, don't hide filter UI
4. **Performance with many filters** - Limit filter options display to top 12-15, add "Show more" if needed

## Implementation Notes

### DO
- Follow the filter pattern in `dashboard.tsx` exactly for UI consistency
- Reuse `currentFilterOptions` memo pattern from dashboard/notes
- Keep backward compatibility with existing `kind` field while adding multi-kind support
- Use existing CSS variables (`--panel`, `--accent`, `--muted`, `--text`, `--bg`)
- Maintain existing keyboard shortcuts and accessibility attributes

### DON'T
- Create new component files when inline implementation works
- Add new dependencies for filter functionality
- Remove single `kind` field entirely (keep for backward compat)
- Change database schema version without migration

## Development Environment

### Start Services

```bash
# Start desktop app
cd apps/desktop && npm run dev

# Or from root with turborepo
npm run dev --filter=desktop
```

### Service URLs
- Desktop App: http://localhost:5174

### Required Environment Variables
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

## Success Criteria

The task is complete when:

1. [ ] Right sidebar details panel shows all properties from calendar event composer
2. [ ] Item type selector allows multi-select (can be both EVENT and TASK)
3. [ ] Clicking a type toggles it on/off (additive, not exclusive)
4. [ ] Task pane has category/tag/people/places filter bar
5. [ ] Notes section filter matches dashboard pattern
6. [ ] No console errors
7. [ ] Existing tests still pass
8. [ ] New functionality verified via browser

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Multi-kind toggle | `apps/desktop/src/App.test.tsx` (if exists) | Clicking item type adds/removes from kinds array |
| Filter options memo | Component tests | Filter options update correctly when filterType changes |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Event persistence with multiple kinds | desktop ↔ IndexedDB | Item saved with `kinds: ['event', 'task']` persists correctly |
| Filter affects task list | desktop ↔ tasks storage | Filtering by category shows only matching tasks |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Create multi-type item | 1. Select event in calendar 2. Open right sidebar 3. Click both EVENT and TASK buttons | Both buttons show as active/selected |
| Filter tasks by category | 1. Go to Tasks view 2. Click CATEGORIES 3. Select "Work" | Only Work tasks visible |
| Filter notes by tag | 1. Go to Notes view 2. Click TAGS 3. Select "#project" | Only notes with #project visible |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Right Sidebar Details | `http://localhost:5174` (select any event) | All properties editable, item type multi-select works |
| Tasks View | `http://localhost:5174` (Tasks tab) | Filter bar visible below status filters |
| Notes View | `http://localhost:5174` (Notes tab) | Filter bar matches dashboard style |
| Dashboard | `http://localhost:5174` (Dashboard tab) | Reference - filter pattern works correctly |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Multi-kind item saved | Open IndexedDB in DevTools → insight5.db → events | Item has `kinds` array or `kind` + boolean flags |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete
- [ ] Multi-select item types work as expected
- [ ] Filter selectors work consistently across Tasks, Notes, Dashboard
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns
- [ ] No security vulnerabilities introduced
