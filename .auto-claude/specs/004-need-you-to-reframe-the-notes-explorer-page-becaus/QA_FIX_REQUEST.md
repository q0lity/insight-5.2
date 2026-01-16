# QA Fix Request

**Status**: REJECTED
**Date**: 2026-01-13
**QA Session**: 1

## Critical Issues to Fix

### 1. Invalid Icon Name "hash"

**Problem**: The Tags section in the file tree uses `<Icon name="hash" size={12} />` but "hash" is not a valid icon name. The IconName type in `ui/icons.tsx` does not include "hash" - the valid icons are: home, calendar, mic, check, dots, bolt, sparkle, smile, frown, droplet, maximize, play, pause, plus, panelLeft, panelRight, x, sun, moon, tag, trophy, heart, file, target, gear, phone, food, dumbbell, cart, tooth, briefcase, stethoscope, pin, book, moonStar, users, folder, chevronDown, chevronRight, grip, palette, monitor, search, grid, list.

**Location**: `apps/desktop/src/workspace/views/notes.tsx:261`

**Required Fix**: Change `name="hash"` to `name="tag"`

```tsx
// Line 261 - Current (broken):
<Icon name="hash" size={12} />

// Line 261 - Fixed:
<Icon name="tag" size={12} />
```

**Verification**:
1. TypeScript compilation should pass: `cd apps/desktop && npx tsc --noEmit`
2. Tags section should display the tag icon when rendered

## After Fixes

Once fixes are complete:
1. Commit with message: `fix: change invalid icon name 'hash' to 'tag' (qa-requested)`
2. QA will automatically re-run
3. Loop continues until approved
