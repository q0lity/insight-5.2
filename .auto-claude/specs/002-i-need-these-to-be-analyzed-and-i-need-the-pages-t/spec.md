# Specification: Obsidian-Style Note View with Google Docs Navigation

## Overview

Transform the existing note-taking interface in the desktop app to resemble Obsidian's visual style while incorporating Google Docs-style heading navigation. The new design features a left sidebar with clickable table of contents (extracted from markdown headings), a timestamps column correlated with content sections, Obsidian-style tag chips, front matter display with dividers, and subtask sections with play buttons. All content must remain markdown-native to enable seamless export to Obsidian without conversion.

## Workflow Type

**Type**: feature

**Rationale**: This is a substantial UI overhaul that adds new components (heading navigation sidebar, timestamp column, front matter renderer) while transforming the visual appearance of existing markdown rendering. It requires creating new React components, CSS styling, and integrating with existing markdown parsing infrastructure.

## Task Scope

### Services Involved
- **desktop** (primary) - Main UI transformation target with React/TypeScript/Vite stack
- **shared** (supporting) - Utility functions for text extraction (extractTags, extractPeople, etc.)

### This Task Will:
- [ ] Create left sidebar component with heading navigation (Google Docs outline style)
- [ ] Implement Obsidian-style front matter display with dividers
- [ ] Add timestamps column that correlates with markdown sections
- [ ] Transform tag/chip styling to match Obsidian aesthetic
- [ ] Add subtask sections with play buttons for task management
- [ ] Style page title with beautiful Google Docs-inspired typography
- [ ] Ensure all content remains markdown-native for Obsidian export
- [ ] Maintain existing checkbox functionality

### Out of Scope:
- Changes to mobile app (insight-mobile)
- Backend/Supabase schema modifications
- New data persistence or API endpoints
- Actual Obsidian file export functionality (focus is on format compatibility)

## Service Context

### Desktop App

**Tech Stack:**
- Language: TypeScript
- Framework: React + Vite
- Build Tool: Vite
- Styling: Tailwind CSS + App.css
- Markdown: react-markdown + remark-gfm
- UI Components: Radix UI (@radix-ui/react-*)
- Key directories: `src/ui/`, `src/workspace/views/`, `src/markdown/`

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd apps/desktop && npm run dev
```

**Port:** 5174

### Shared Package

**Tech Stack:**
- Language: TypeScript
- Type: Library package

**Entry Point:** `src/index.ts`

**Key Exports:**
- `extractTags()` - Extract #hashtags from text
- `extractPeople()` - Extract @mentions from text
- `extractPlaces()` - Extract !places from text
- `firstLine()` - Get first line of text
- `extractCategories()` - Match tags against category list

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `apps/desktop/src/workspace/views/notes.tsx` | desktop | Add heading sidebar, restructure layout with 3-column design |
| `apps/desktop/src/ui/markdown.tsx` | desktop | Enhance MarkdownView with Obsidian styling, front matter parsing |
| `apps/desktop/src/App.css` | desktop | Add Obsidian-inspired CSS variables and component styles |
| `apps/desktop/src/ui/ChipInput.tsx` | desktop | Update chip styling to match Obsidian tag aesthetic |
| `apps/desktop/src/markdown/note-items.ts` | desktop | Extend to support subtask extraction and metadata |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `apps/desktop/src/workspace/views/tiimo-day.tsx` | Timeline layout with segments, play buttons, elapsed time display |
| `apps/desktop/src/ui/markdown.tsx` | ReactMarkdown custom components, chip rendering, checkbox handling |
| `apps/desktop/src/ui/icons.tsx` | Icon usage pattern with Icon component |
| `apps/desktop/src/App.css` | CSS variable system, component styling patterns |
| `packages/shared/src/notes.ts` | Text extraction utilities for tags, people, places |

## Patterns to Follow

### Markdown Rendering with Custom Components

From `apps/desktop/src/ui/markdown.tsx`:

```tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    p: ({ children, ...rest }) => <p {...rest}>{renderWithChips(children)}</p>,
    li: ListItem,
    a: ({ href, children, ...rest }) => (
      <a href={href} target="_blank" rel="noreferrer" {...rest}>
        {children}
      </a>
    ),
  }}>
  {markdown}
</ReactMarkdown>
```

**Key Points:**
- Use `remarkPlugins={[remarkGfm]}` for GitHub-flavored markdown
- Custom `li` component handles checkboxes and task items
- `renderWithChips()` processes inline tags into styled chips
- Use custom components for headings, paragraphs, lists

### Chip/Tag Styling Pattern

From `apps/desktop/src/ui/markdown.tsx`:

```tsx
<span
  className={`mdChip mdChip-${kind}${onTagClick ? ' clickable' : ''}`}
  data-token-id={tokenId}
  onClick={() => onTagClick?.(tagValue)}
>
  {prefix}{label}
</span>
```

**Key Points:**
- CSS class naming: `mdChip mdChip-{kind}`
- Support clickable chips with `onTagClick` callback
- Store metadata in data attributes

### Timeline Card with Play Button

From `apps/desktop/src/workspace/views/tiimo-day.tsx`:

```tsx
<button
  className={ev.active ? 'tmPlay tmPlayCompact active' : 'tmPlay tmPlayCompact'}
  onClick={(e) => {
    e.preventDefault()
    e.stopPropagation()
    if (ev.active) {
      props.onUpdateEvent(ev.id, { active: false, endAt })
    } else {
      props.onUpdateEvent(ev.id, { active: true })
    }
  }}
  aria-label={ev.active ? 'Pause timer' : 'Start timer'}>
  <Icon name={ev.active ? 'pause' : 'play'} size={14} />
</button>
```

**Key Points:**
- Toggle active state with visual feedback
- Use Icon component for play/pause icons
- Stop event propagation to prevent parent click handlers

## Requirements

### Functional Requirements

1. **Left Sidebar Heading Navigation**
   - Description: Extract headings (h1-h6) from markdown content and display as clickable table of contents in left sidebar
   - Acceptance: Clicking a heading in sidebar scrolls to that section in content area

2. **Front Matter Display**
   - Description: Parse and display YAML front matter (title, date, tags, etc.) at top of note with visual dividers
   - Acceptance: Front matter appears styled above main content with clear separator

3. **Obsidian-Style Tags/Chips**
   - Description: Render inline #tags, @mentions, !places as styled chips matching Obsidian aesthetic
   - Acceptance: Tags appear as rounded pill-shaped chips with appropriate colors per type

4. **Timestamps Column**
   - Description: Display timestamps correlated with content sections/headings
   - Acceptance: Timestamp column shows times next to relevant sections when time data is present

5. **Beautiful Title**
   - Description: Style the note title with Google Docs-inspired typography (large, elegant font)
   - Acceptance: First heading or title appears prominently at top of content area

6. **Subtask Sections with Play Buttons**
   - Description: Display subtasks within events/tasks with play buttons to start timers
   - Acceptance: Checklist items with task markers show play buttons that trigger timer functionality

7. **Working Checkboxes**
   - Description: Maintain existing checkbox toggle functionality in markdown
   - Acceptance: Clicking checkboxes toggles their state and persists changes

8. **Markdown Export Compatibility**
   - Description: Ensure all content remains valid markdown for Obsidian export
   - Acceptance: Raw markdown can be copied/exported and opened in Obsidian without formatting loss

### Edge Cases

1. **No Headings in Content** - Show empty sidebar or placeholder text "No headings"
2. **Deeply Nested Headings** - Support h1-h6 with appropriate indentation in sidebar
3. **Very Long Headings** - Truncate with ellipsis in sidebar while showing full text in content
4. **Invalid Front Matter** - Gracefully handle malformed YAML, display as regular content
5. **Mixed Content Types** - Handle notes with/without timestamps, tags, front matter

## Implementation Notes

### DO
- Follow the chip styling pattern in `markdown.tsx` for consistent tag appearance
- Reuse `Icon` component from `ui/icons.tsx` for all icons
- Use CSS custom properties (--variables) from App.css for theming
- Extract headings using regex on markdown content before rendering
- Use Radix ScrollArea for the heading sidebar for smooth scrolling
- Implement sticky positioning for sidebar and timestamps column

### DON'T
- Create new markdown parsing library when react-markdown + remark-gfm works
- Store UI state that should derive from markdown content
- Break existing checkbox toggle functionality
- Add proprietary formatting that won't export to standard markdown
- Use inline styles when CSS classes exist

## Development Environment

### Start Services

```bash
# From project root
cd apps/desktop
npm install
npm run dev
```

### Service URLs
- Desktop App: http://localhost:5174

### Required Environment Variables
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

## Success Criteria

The task is complete when:

1. [ ] Left sidebar displays clickable heading navigation extracted from markdown
2. [ ] Clicking sidebar headings scrolls to corresponding section
3. [ ] Front matter displays at top with dividers (Obsidian style)
4. [ ] Tags render as Obsidian-style chips (#tags, @people, !places)
5. [ ] Note title appears with beautiful Google Docs-style typography
6. [ ] Timestamps column displays when time data is present
7. [ ] Subtask sections show with play buttons
8. [ ] Checkboxes toggle correctly
9. [ ] Raw markdown exports cleanly to Obsidian
10. [ ] No console errors
11. [ ] Existing tests still pass
12. [ ] UI matches visual references from screenshots

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Heading extraction | `src/ui/__tests__/heading-nav.test.ts` | Correctly extracts h1-h6 from markdown |
| Front matter parsing | `src/ui/__tests__/front-matter.test.ts` | Parses valid YAML, handles invalid gracefully |
| Tag chip rendering | `src/ui/__tests__/markdown.test.ts` | Renders #tags, @people, !places as chips |
| Checkbox toggle | `src/ui/__tests__/markdown.test.ts` | Toggles checkbox state on click |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Notes view layout | desktop | 3-column layout renders (sidebar, content, timestamps) |
| Heading navigation | desktop | Clicking sidebar heading scrolls content |
| Task subtask display | desktop | Subtasks appear within parent tasks |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Note viewing | 1. Open desktop app 2. Select a note with headings | Sidebar shows heading outline, content displays |
| Heading navigation | 1. Click heading in sidebar | Content scrolls to that heading |
| Checkbox toggle | 1. Click checkbox in note | Checkbox toggles, state persists |
| Tag filtering | 1. Click a tag chip | Filter applied, related notes shown |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Notes View | `http://localhost:5174` | 3-column layout visible, sidebar shows headings |
| Note Detail | `http://localhost:5174` (select note) | Front matter displays, title styled, chips render |
| Checkbox interaction | `http://localhost:5174` (note with tasks) | Checkboxes toggle on click |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Note content preserved | Select capture from inbox | rawText unchanged, markdown intact |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete
- [ ] Left sidebar heading navigation works
- [ ] Front matter displays correctly
- [ ] Tags render as Obsidian-style chips
- [ ] Checkboxes toggle properly
- [ ] Play buttons on subtasks function
- [ ] Markdown exports cleanly (no proprietary formatting)
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns
- [ ] No security vulnerabilities introduced

## Visual Reference

The implementation should match the styling shown in the attached screenshots:
- **screenshot-1768320352239.png**: Obsidian note with headings, checkboxes, tags, dates
- **screenshot-1768320435831.png**: Front matter display with title, source, metadata
- **screenshot-1768320444114.png**: Left sidebar with heading outline (Google Docs style)

Key visual elements to replicate:
- Dark theme with subtle borders
- Rounded tag chips with color coding
- Checkbox styling with checkmark icon
- Hierarchical heading indentation in sidebar
- Clean dividers between front matter and content
