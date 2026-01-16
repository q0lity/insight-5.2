# Specification: Activity Taxonomy Explorer and Event Autofill Enhancement

## Overview

This task adds two interconnected features to the Insight desktop application: (1) a hierarchical file explorer component in the sidebar that displays activity categories and subcategories (e.g., Personal → Health → Cardio), enabling users to browse and organize events by taxonomy, and (2) enhanced autofill functionality that leverages the existing adaptive learning system to intelligently populate event properties based on historical patterns and user behavior.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation involving UI components (file explorer), integration with existing systems (learning patterns), and modifications to core application behavior (autofill). It requires creating new UI elements, extending existing functionality, and connecting multiple systems together.

## Task Scope

### Services Involved
- **desktop** (primary) - Main desktop application with sidebar, event editing, and autofill logic
- **shared** (integration) - Taxonomy definitions and shared types

### This Task Will:
- [ ] Create a hierarchical Activity Explorer component in the sidebar
- [ ] Display taxonomy as collapsible tree: Category → Subcategory structure
- [ ] Allow users to browse activities by taxonomy hierarchy
- [ ] Enhance autofill to use the existing learning/patterns system
- [ ] Connect autofill button to enricher for pattern-based suggestions
- [ ] Populate event properties (category, subcategory, importance, skills) based on learned patterns

### Out of Scope:
- Creating a new taxonomy management UI (editing/adding categories)
- Modifying the taxonomy data structure itself
- Adding drag-and-drop functionality to the explorer
- Implementing machine learning models (uses existing pattern system)
- Mobile app changes

## Service Context

### Desktop Application

**Tech Stack:**
- Language: TypeScript
- Framework: React (Vite)
- Styling: Tailwind CSS
- State: Local state with Dexie (IndexedDB)
- Key directories:
  - `src/ui/` - UI components
  - `src/workspace/views/` - View components
  - `src/learning/` - Adaptive learning system
  - `src/storage/` - Data storage utilities

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd apps/desktop && npm run dev
```

**Port:** 5174

### Shared Package

**Tech Stack:**
- Language: TypeScript
- Type: Library
- Key directories:
  - `src/` - Shared types and utilities

**Entry Point:** `src/index.ts`

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `apps/desktop/src/App.tsx` | desktop | Add Activity Explorer section to sidebar; enhance `autoFillEventFromText` and `autoFillComposerFromText` to use learning/enricher system |
| `apps/desktop/src/App.css` | desktop | Add styles for Activity Explorer tree component |
| `packages/shared/src/taxonomy.ts` | shared | Add any needed taxonomy utilities (may already be sufficient) |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `apps/desktop/src/learning/enricher.ts` | Pattern for enriching events with learned data; use `enrichEvent()` function |
| `apps/desktop/src/learning/context.ts` | Building pattern context from text; `buildPatternContext()` |
| `apps/desktop/src/ui/MetaEditor.tsx` | UI patterns for category/subcategory chips and suggestions |
| `apps/desktop/src/storage/ecosystem.ts` | `SharedMeta` type definition and metadata patterns |
| `packages/shared/src/taxonomy.ts` | `STARTER_TAXONOMY` structure for tree rendering |

## Patterns to Follow

### Sidebar Collapsible Section Pattern

From `apps/desktop/src/App.tsx` (existing sidebar sections):

```tsx
// Existing pattern for collapsible sections in sidebar
const PINNED_GROUP_ORDER_KEY = 'insight5.explorer.pinnedGroupOrder.v1'
const DEFAULT_PINNED_GROUP_ORDER = ['tasks', 'habits', 'trackers', 'shortcuts'] as const

// Toggle collapsed state pattern
const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
const toggleGroup = (key: string) => {
  setCollapsedGroups(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
}
```

**Key Points:**
- Use localStorage for persisting collapsed state
- Use Set for tracking expanded/collapsed groups
- Collapsible sections with chevron icons

### Taxonomy Tree Structure

From `packages/shared/src/taxonomy.ts`:

```typescript
export type StarterTaxonomy = Array<{ category: string; subcategories: string[] }>

export const STARTER_TAXONOMY: StarterTaxonomy = [
  { category: 'Work', subcategories: ['Clinic', 'Surgery', 'Didactics', 'Admin', 'Research', 'Call'] },
  { category: 'Health', subcategories: ['Workout', 'Sleep', 'Nutrition', 'Recovery', 'Meditation'] },
  { category: 'Personal', subcategories: ['Errands', 'Groceries', 'Family', 'Friends', 'Home'] },
  // ...
]
```

**Key Points:**
- Two-level hierarchy (Category → Subcategory)
- Use this as the data source for the tree
- Each category can be expanded to show subcategories

### Enrichment Pattern for Autofill

From `apps/desktop/src/learning/enricher.ts`:

```typescript
export async function enrichEvent(
  event: Partial<CalendarEvent>,
  inputText: string
): Promise<EnrichmentResult<Partial<CalendarEvent>>> {
  const context = await buildPatternContext(inputText)
  const autoApply = getAutoApplyPatterns(context)
  const suggestions = getSuggestions(context)

  const enriched = { ...event }
  const autoApplied: EnrichmentResult<Partial<CalendarEvent>>['autoApplied'] = []

  // Auto-apply category if not already set and we have high confidence
  if (!enriched.category && autoApply.category) {
    enriched.category = autoApply.category
    // ...
  }

  return { enriched, suggestions, autoApplied, context }
}
```

**Key Points:**
- Call `enrichEvent()` instead of simple rule-based inference
- Use `buildPatternContext()` to get learned patterns
- Apply high-confidence patterns automatically
- Show medium-confidence patterns as suggestions

## Requirements

### Functional Requirements

1. **Activity Explorer in Sidebar**
   - Description: Add a collapsible "Activities" section to the sidebar showing the taxonomy hierarchy
   - Acceptance: Users can expand categories to see subcategories; clicking a category/subcategory could filter events (optional)

2. **Tree Navigation**
   - Description: Display categories as expandable nodes with subcategories as children
   - Acceptance: Each category has a chevron icon; clicking expands/collapses to show subcategories

3. **Enhanced Autofill Using Patterns**
   - Description: When user clicks "Auto-fill", use the learning system's `enrichEvent()` to populate fields
   - Acceptance: Events with "coding Insight" text get appropriate category, importance, and skills based on learned patterns

4. **Pattern-Based Property Population**
   - Description: Auto-fill should populate: category, subcategory, importance, difficulty, skills, goal based on patterns
   - Acceptance: All properties that have learned patterns are filled in; properties already set are not overwritten

### Edge Cases

1. **No Learned Patterns** - Fall back to existing `inferCategorySubcategoryLoose()` rule-based inference
2. **Empty Title/Notes** - Do nothing if there's no text to analyze
3. **Conflicting Patterns** - Use highest confidence pattern for each field
4. **New Categories** - Explorer should handle categories not in STARTER_TAXONOMY (from user events)

## Implementation Notes

### DO
- Follow the existing collapsible section pattern in the sidebar
- Use `enrichEvent()` from `learning/enricher.ts` for autofill
- Keep the existing `inferCategorySubcategoryLoose()` as fallback
- Reuse existing ChipInput/ChipSuggestions patterns from MetaEditor
- Use existing Icon component for tree chevrons
- Persist explorer collapsed state to localStorage

### DON'T
- Create new data structures for taxonomy (use STARTER_TAXONOMY)
- Remove existing autofill logic (keep as fallback)
- Make the explorer interactive beyond viewing (no drag-drop, no editing)
- Add new dependencies for tree components (use native React)

## Development Environment

### Start Services

```bash
# Start desktop app
cd apps/desktop && npm run dev
```

### Service URLs
- Desktop App: http://localhost:5174

### Required Environment Variables
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

## Success Criteria

The task is complete when:

1. [ ] Activity Explorer appears in sidebar with expandable categories
2. [ ] Each category shows its subcategories when expanded
3. [ ] Auto-fill button uses learning patterns to populate event properties
4. [ ] "coding Insight" or similar learned text auto-fills appropriate category/importance
5. [ ] No console errors during normal operation
6. [ ] Existing tests still pass
7. [ ] Explorer collapsed state persists across page reloads

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Taxonomy utilities | `packages/shared/src/taxonomy.ts` | `categoriesFromStarter()` and `subcategoriesFromStarter()` return correct values |
| Pattern enrichment | `apps/desktop/src/learning/enricher.ts` | `enrichEvent()` returns correct enriched data with patterns |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Autofill with patterns | desktop + learning | Auto-fill button triggers enrichment and updates event state |
| Explorer data binding | desktop + shared | Explorer reads from STARTER_TAXONOMY correctly |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View Activity Explorer | 1. Open app 2. Look at sidebar | Activity Explorer section visible with categories |
| Expand Category | 1. Click category in explorer | Subcategories appear below the category |
| Autofill Event | 1. Create event with title "coding Insight" 2. Click Auto-fill | Category, importance, and other fields populated based on patterns |
| Persistent State | 1. Expand a category 2. Refresh page | Category remains expanded after refresh |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Sidebar Activity Explorer | `http://localhost:5174` | Visible in left sidebar, expands/collapses smoothly |
| Event Editor | `http://localhost:5174` | Auto-fill button populates fields correctly |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Patterns exist | Check IndexedDB patterns table | Patterns stored with confidence scores |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete (if applicable)
- [ ] Database state verified (if applicable)
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns
- [ ] No security vulnerabilities introduced
