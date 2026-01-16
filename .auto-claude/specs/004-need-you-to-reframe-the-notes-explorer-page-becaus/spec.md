# Specification: Notes Explorer Redesign - Obsidian-Style File Explorer

## Overview

Redesign the Notes Explorer page to be more space-efficient and functional, implementing an Obsidian-style file explorer with integrated search capabilities. The current layout consumes excessive vertical space with a multi-row header containing title, search, sort, and filter tabs. This task will consolidate the header to a single compact row, implement a file tree navigation pattern, and remove redundant sidebar navigation items (People, Places, Tags views) that duplicate Notes Explorer's filtering functionality.

## Workflow Type

**Type**: feature

**Rationale**: This is a significant UI redesign that involves restructuring the existing Notes Explorer component's layout, creating new compact navigation patterns, modifying CSS styles extensively, and removing redundant views from the sidebar. It requires coordinated changes across multiple files while preserving existing functionality.

## Task Scope

### Services Involved
- **desktop** (primary) - React/Vite frontend application containing the Notes Explorer view and all related components

### This Task Will:
- [ ] Redesign Notes Explorer header to consolidate into a single compact row
- [ ] Implement Obsidian-style file tree navigation with collapsible folders
- [ ] Add integrated search bar in the compact header
- [ ] Preserve and enhance property detail display on item selection
- [ ] Remove redundant sidebar navigation buttons (People, Places, Tags)
- [ ] Remove redundant view type declarations from WorkspaceViewKey
- [ ] Update CSS for space-efficient layout

### Out of Scope:
- Changes to the underlying data storage (inbox captures)
- Changes to the mobile app (insight-mobile)
- Adding new data types or properties to notes
- Backend/API changes
- Changes to the existing capture creation flow

## Service Context

### Desktop (Primary Service)

**Tech Stack:**
- Language: TypeScript
- Framework: React with Vite
- Styling: Tailwind CSS + Custom CSS (App.css)
- Animation: Framer Motion
- UI Components: Radix UI primitives
- Build Tool: Vite

**Entry Point:** `apps/desktop/src/App.tsx`

**How to Run:**
```bash
cd apps/desktop
npm run dev
```

**Port:** 5174

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `apps/desktop/src/workspace/views/notes.tsx` | desktop | Complete restructure of NotesView component layout - implement compact header, file tree view, and Obsidian-style navigation |
| `apps/desktop/src/App.tsx` | desktop | Remove sidebar buttons for People, Places, Tags views (~lines 5870-5907) |
| `apps/desktop/src/App.css` | desktop | Update all `.notes*` CSS classes for compact layout, add file tree styles |
| `apps/desktop/src/workspace/pane.tsx` | desktop | Remove `people`, `places`, `tags` from WorkspaceViewKey type |
| `apps/desktop/src/workspace/views/people.tsx` | desktop | Delete this file (redundant view) |
| `apps/desktop/src/workspace/views/places.tsx` | desktop | Delete this file (redundant view) |
| `apps/desktop/src/workspace/views/tags.tsx` | desktop | Delete this file (redundant view) |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `apps/desktop/src/App.tsx` (lines 5944-6000) | Sidebar explorer section with collapsible tree structure and search |
| `apps/desktop/src/workspace/views/habits.tsx` | Compact list view pattern with click-to-select |
| `apps/desktop/src/workspace/views/ecosystem.tsx` | Split panel layout with list and detail panes |
| `apps/desktop/src/ui/icons.tsx` | Available icon components (chevronRight, chevronDown, folder, file, search) |

## Patterns to Follow

### Collapsible Tree Pattern

From `apps/desktop/src/App.tsx` (sidebar explorer):

```tsx
<div className="sbSection">
  <div className="sbSectionHead">
    <button className="sbSectionToggle" onClick={() => setOpen(!open)}>
      <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} />
    </button>
    <div className="sbSectionTitleInline">Section Name</div>
  </div>
  {open && (
    <div className="sbItemStack">
      {items.map(item => (
        <button className={`sbItem ${selected === item.id ? 'active' : ''}`} onClick={() => select(item.id)}>
          <Icon name="file" size={14} />
          <span>{item.title}</span>
        </button>
      ))}
    </div>
  )}
</div>
```

**Key Points:**
- Collapsible sections with chevron toggle icons
- Compact single-line items
- Active state styling on selection
- Hierarchical indentation

### Compact Search Pattern

```tsx
<div className="compactSearchBar">
  <Icon name="search" size={14} />
  <input
    value={q}
    onChange={(e) => setQ(e.target.value)}
    placeholder="Search..."
  />
  <span className="itemCount">{count}</span>
</div>
```

**Key Points:**
- Inline search icon
- Count badge on right side
- Single-row layout

## Requirements

### Functional Requirements

1. **Compact Single-Row Header**
   - Description: Consolidate title, search, sort, and filter into a single horizontal row
   - Acceptance: Header height reduced by at least 60% from current multi-row layout

2. **File Tree Navigation**
   - Description: Display notes organized by filter type (All, Categories, Tags, People, Places) in a collapsible tree structure on the left side
   - Acceptance: Each filter category is collapsible, notes appear as single-line items under each category

3. **Integrated Search**
   - Description: Search functionality embedded in compact header
   - Acceptance: Search filters notes in real-time across all categories

4. **Property Detail Panel**
   - Description: When clicking a note, display all properties (categories, tags, people, places, transcript) in a right-side detail panel
   - Acceptance: Detail panel shows all existing metadata fields with click-to-filter functionality preserved

5. **Remove Redundant Navigation**
   - Description: Remove People, Places, and Tags as separate views from the sidebar rail
   - Acceptance: These three navigation buttons no longer appear in the sidebar

### Edge Cases

1. **Empty State** - Show "No notes found" message in tree view when search yields no results
2. **Long Note Titles** - Truncate with ellipsis in tree view, show full title in detail panel
3. **Many Filter Options** - Limit visible items per category with "Show more" expansion
4. **No Selected Note** - Show placeholder in detail panel prompting user to select a note

## Implementation Notes

### DO
- Follow the collapsible tree pattern in App.tsx sidebar explorer section
- Reuse Icon components from `ui/icons.tsx` (chevronRight, chevronDown, file, folder, search)
- Preserve all existing filter functionality (just reorganize into tree structure)
- Keep Framer Motion animations for smooth transitions
- Maintain existing CSS variables for theming (--panel, --bg, --border, --accent)

### DON'T
- Create entirely new CSS classes when existing ones can be extended
- Remove any filtering or property display functionality
- Change the data structure of InboxCapture
- Modify the capture modal or creation flow
- Break existing search/filter logic - just reorganize the UI

## Target Layout

```
┌────────────────────────────────────────────────────────────┐
│ 🔍 Search notes...                     [Recent ▼] [+ New] │  <- Single compact header row
├──────────────────────┬─────────────────────────────────────┤
│ ▼ All (144)          │  Selected Note                      │
│   Note title 1       │  ─────────────────────────────────  │
│   Note title 2       │  Created: Jan 12, 2026 | 245 words  │
│   Note title 3       │                                     │
│ ▶ Categories (12)    │  Categories: Work, Personal         │
│ ▼ Tags (8)           │  Tags: #project, #urgent            │
│   #work              │  People: @John, @Sarah              │
│   #personal          │  Places: Home, Office               │
│ ▶ People (5)         │                                     │
│ ▶ Places (3)         │  Transcript                         │
│                      │  [Full note content here...]        │
│                      │                                     │
└──────────────────────┴─────────────────────────────────────┘
```

## Development Environment

### Start Services

```bash
# From project root
cd apps/desktop
npm run dev
```

### Service URLs
- Desktop App: http://localhost:5174

### Required Environment Variables
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key (for auth)

## Success Criteria

The task is complete when:

1. [ ] Notes Explorer header is consolidated to a single row (title hidden or minimal, search inline, sort dropdown inline)
2. [ ] Left panel displays collapsible tree with categories: All, Categories, Tags, People, Places
3. [ ] Clicking a note in the tree shows full properties in right detail panel
4. [ ] Search functionality works across all notes from the compact header
5. [ ] People, Places, and Tags buttons are removed from sidebar rail
6. [ ] PeopleView, PlacesView, and TagsView files are deleted
7. [ ] WorkspaceViewKey type no longer includes 'people', 'places', 'tags'
8. [ ] No console errors during navigation and interaction
9. [ ] Existing tests still pass (if any)
10. [ ] New layout verified via browser at http://localhost:5174

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| NotesView renders | `apps/desktop/src/workspace/views/notes.tsx` | Component mounts without errors |
| Filter functionality | `apps/desktop/src/workspace/views/notes.tsx` | All filter types (category, tag, person, place) still work |
| Search functionality | `apps/desktop/src/workspace/views/notes.tsx` | Search filters notes correctly |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| View navigation | App.tsx ↔ notes.tsx | Opening Notes view renders new layout |
| Note selection | notes.tsx ↔ detail panel | Selecting note shows all properties |
| Removed views | App.tsx ↔ pane.tsx | People/Places/Tags views no longer accessible |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Notes Explorer navigation | 1. Open app 2. Click Notes in sidebar 3. Search for a note 4. Click note | Note details display in right panel |
| Filter by category | 1. Open Notes 2. Expand Categories section 3. Click a category | Notes filtered to that category |
| Verify removed nav | 1. Open app 2. Inspect sidebar | No People, Places, Tags buttons visible |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Notes Explorer | `http://localhost:5174` (open Notes view) | Compact header renders, tree navigation works, detail panel shows properties |
| Sidebar | `http://localhost:5174` | People, Places, Tags buttons are not present |
| Responsive layout | `http://localhost:5174` | Layout adapts properly at different widths |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| N/A - No DB changes | N/A | N/A |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete
- [ ] No regressions in existing functionality (note creation, editing still work)
- [ ] Code follows established patterns (React components, CSS class naming)
- [ ] No security vulnerabilities introduced
- [ ] Performance acceptable (no noticeable lag on 100+ notes)
