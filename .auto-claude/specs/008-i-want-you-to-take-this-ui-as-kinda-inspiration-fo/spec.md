# Specification: Major UI Redesign Based on Reference Design

## Overview

This specification covers a comprehensive UI refactor for both the desktop (web) and mobile applications of the Insight productivity suite. The redesign is inspired by reference design screenshots provided by the user, aiming to achieve a "very, very clean" aesthetic while maintaining full feature parity. Key additions include an enhanced active session display with subtask breakdown capabilities, refined theme implementations (dark mode and warm/light mode), and adoption of modular component styling from the reference designs. This is acknowledged as a "really, really big refactor" that touches nearly every visual component across both platforms.

## Workflow Type

**Type**: feature

**Rationale**: While this task involves significant refactoring, it's classified as a "feature" because it introduces new UI capabilities (subtask display in active sessions, new component patterns) alongside visual improvements. The scope requires careful architectural consideration typical of major feature work, rather than pure code reorganization.

## Task Scope

### Services Involved
- **desktop** (primary) - React + Vite web application, main UI overhaul target
- **mobile4** (primary) - React Native + Expo mobile application, parallel UI overhaul target
- **shared** (integration) - Shared types/utilities that may need updates for subtask data structures

### This Task Will:
- [ ] Redesign all UI components to match reference design aesthetic
- [ ] Implement/refine dark mode theme matching reference screenshots
- [ ] Implement warm (light) mode as alternative theme with reference styling
- [ ] Add compact taskbar-style active session display with subtask breakdown
- [ ] Create small modular components for task/subtask visualization
- [ ] Add real-time progress indicators for subtasks in active sessions
- [ ] Apply new typography, spacing, and color patterns across both platforms
- [ ] Ensure all existing features continue to work post-refactor

### Out of Scope:
- Backend API changes
- Database schema modifications
- New feature functionality (beyond active session subtask display)
- Navigation structure changes
- Adding new screens or routes

## Service Context

### Desktop Application

**Tech Stack:**
- Language: TypeScript
- Framework: React with Vite build tool
- Styling: Tailwind CSS v4 with CSS-first config (`@theme inline`, `@custom-variant`)
- Animation: Framer Motion ^12.23.26
- Component Library: Radix UI (dropdown-menu, scroll-area, separator, tabs, toggle, toggle-group)
- Variant Management: class-variance-authority (CVA) ^0.7.1
- Key directories: `src/`, `src/ui/`, `src/workspace/views/`, `src/components/ui/`

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd apps/desktop && npm run dev
```

**Port:** 5174

**Theme Configuration:**
- Theme file: `src/index.css`
- Themes available: default (warm), dark, light, olive, oliveOrange, roseGold
- Theme switching: `data-theme` attribute on `:root`
- CSS variables: `--bg`, `--panel`, `--text`, `--muted`, `--accent`, etc.

### Mobile4 Application

**Tech Stack:**
- Language: TypeScript
- Framework: React Native with Expo
- Styling: NativeWind v4 (Tailwind for React Native), Tailwind v3.4.19
- Navigation: Expo Router
- Key directories: `app/`, `app/(tabs)/`, `src/`, `src/state/`, `components/`

**Entry Point:** `app/_layout.tsx`

**How to Run:**
```bash
cd apps/mobile4 && npm run start
```

**Port:** 3000 (Expo dev server)

**Theme Configuration:**
- Theme file: `src/state/theme.tsx` (ThemeProvider context)
- Palettes: ThemePalettes object with dark, light, warm, olive, oliveOrange, roseGold
- Display modes: big, compact (via DisplaySizes)
- Theme switching: `useTheme()` hook, AsyncStorage persistence

### Shared Package

**Tech Stack:**
- Language: TypeScript/JavaScript
- Type: Library package

**Entry Point:** `src/index.ts`

## Files to Modify

### Desktop Files

| File | Service | What to Change |
|------|---------|---------------|
| `apps/desktop/src/index.css` | desktop | Refine theme color palettes, add new CSS custom properties for reference design colors |
| `apps/desktop/src/App.tsx` | desktop | Update main layout styling, integrate new component patterns |
| `apps/desktop/src/ui/ActiveSessionBanner.tsx` | desktop | Enhance with subtask display, taskbar-style compact view, progress indicators |
| `apps/desktop/src/ui/CaptureModal.tsx` | desktop | Apply new component styling from reference |
| `apps/desktop/src/ui/Skeleton.tsx` | desktop | Update skeleton loading states to match new design |
| `apps/desktop/src/workspace/views/dashboard.tsx` | desktop | Apply new layout patterns and card styling |
| `apps/desktop/src/workspace/views/focus.tsx` | desktop | Update focus view with new active session design |
| `apps/desktop/src/components/ui/badge.tsx` | desktop | Restyle badges to match reference |
| `apps/desktop/src/components/ui/tabs.tsx` | desktop | Update tab styling |
| `apps/desktop/src/components/ui/toggle-group.tsx` | desktop | Apply new toggle styling |

### Mobile4 Files

| File | Service | What to Change |
|------|---------|---------------|
| `apps/mobile4/src/state/theme.tsx` | mobile4 | Refine ThemePalettes colors to match reference design |
| `apps/mobile4/global.css` | mobile4 | Add any needed global styles |
| `apps/mobile4/app/(tabs)/index.tsx` | mobile4 | Redesign main dashboard with new component patterns, enhance activeCard with subtasks |
| `apps/mobile4/app/(tabs)/_layout.tsx` | mobile4 | Update tab bar styling |
| `apps/mobile4/app/focus.tsx` | mobile4 | Enhance focus screen with new active session design |
| `apps/mobile4/components/Themed.tsx` | mobile4 | Update base themed components |
| `apps/mobile4/src/components/RollingNumber.tsx` | mobile4 | Ensure styling matches new design |
| `apps/mobile4/src/components/MobileHeatmap.tsx` | mobile4 | Update heatmap styling |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `apps/desktop/src/ui/ActiveSessionBanner.tsx` | Framer Motion animation patterns, state management for minimized/expanded |
| `apps/desktop/src/index.css` | CSS variable naming, `@theme inline` configuration, dark mode variant structure |
| `apps/mobile4/src/state/theme.tsx` | ThemePalettes structure, DisplaySizes pattern, ThemeProvider context pattern |
| `apps/mobile4/app/(tabs)/index.tsx` | Mobile component styling patterns, inline styles with palette references |
| `apps/desktop/src/components/ui/badge.tsx` | CVA variant pattern for component styling |

## Patterns to Follow

### Theme Color Variables (Desktop)

From `apps/desktop/src/index.css`:

```css
:root {
  --bg: #F2F0ED; /* Spec Sand */
  --panel: rgba(255, 255, 255, 0.85);
  --text: #1C1C1E;
  --muted: #86868B;
  --accent: #D95D39;
  --accentSoft: rgba(217, 93, 57, 0.1);
  /* ... */
}

:root[data-theme='dark'] {
  --bg: #0b1020;
  --panel: rgba(15, 19, 32, 0.92);
  --text: #e5e7eb;
  --accent: #d95d39;
  /* ... */
}
```

**Key Points:**
- Use semantic variable names (--bg, --panel, --text, --muted, --accent)
- Define opacity variants (--accentSoft, --accentMid, --accentBorder)
- Maintain consistent naming across all themes

### Theme Palettes (Mobile)

From `apps/mobile4/src/state/theme.tsx`:

```typescript
export const ThemePalettes = {
  dark: {
    background: '#0B1020',
    surface: '#141a2a',
    surfaceAlt: 'rgba(20,26,42,0.95)',
    text: '#E5E7EB',
    textSecondary: 'rgba(148,163,184,0.6)',
    tint: '#D95D39',
    tintLight: 'rgba(217,93,57,0.15)',
    border: 'rgba(148, 163, 184, 0.16)',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F97316',
  },
  // ... other themes
};
```

**Key Points:**
- Keep desktop and mobile palettes synchronized
- Use RGBA for semi-transparent values
- Include semantic colors (success, error, warning)

### Framer Motion Animation Pattern

From `apps/desktop/src/ui/ActiveSessionBanner.tsx`:

```tsx
<AnimatePresence mode="wait">
  {isMinimized ? (
    <motion.div
      key="minimized"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="asbMinimized"
    >
      {/* content */}
    </motion.div>
  ) : (
    <motion.div
      key="expanded"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="asbRoot"
    >
      {/* content */}
    </motion.div>
  )}
</AnimatePresence>
```

**Key Points:**
- Use `AnimatePresence` with `mode="wait"` for enter/exit animations
- Provide unique `key` props for different states
- Use consistent initial/animate/exit patterns

### Mobile Inline Styling Pattern

From `apps/mobile4/app/(tabs)/index.tsx`:

```tsx
<View
  style={[
    styles.activeCard,
    {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: sizes.borderRadius + 8,
      padding: sizes.cardPadding + 4,
      gap: sizes.rowGap,
    },
  ]}
>
```

**Key Points:**
- Combine StyleSheet styles with dynamic palette/sizes values
- Use array syntax for style merging
- Reference `palette` and `sizes` from `useTheme()` hook

## Requirements

### Functional Requirements

1. **Theme Implementation**
   - Description: Apply dark mode styling matching reference screenshots as the primary dark theme
   - Acceptance: Dark mode (`data-theme='dark'` on desktop, `dark` theme on mobile) displays colors matching reference design

2. **Light/Warm Mode**
   - Description: Maintain warm (light) mode with updated component styling from reference
   - Acceptance: Light/warm themes maintain usability and apply reference component patterns

3. **Active Session Subtask Display**
   - Description: Enhance active session banner/card to show subtask breakdown when subtasks exist
   - Acceptance: When an active session has subtasks, they are displayed with individual progress indicators

4. **Compact Taskbar Mode**
   - Description: Implement compact "taskbar-like" view for active session that shows key info in minimal space
   - Acceptance: Minimized active session shows title, elapsed time, XP, and subtask count in single row

5. **Component Consistency**
   - Description: Apply consistent styling to all cards, buttons, inputs, badges across both platforms
   - Acceptance: Visual consistency between desktop and mobile components

6. **Feature Parity**
   - Description: All existing features must continue working after the refactor
   - Acceptance: User can complete all existing workflows without errors

### Edge Cases

1. **No Subtasks** - Active session display gracefully handles sessions without subtasks
2. **Long Session Titles** - Titles truncate properly in compact mode without breaking layout
3. **Theme Transition** - Switching themes applies smoothly without flash of unstyled content
4. **Empty States** - All empty states (no events, no tasks, etc.) maintain new styling
5. **Overflowing Content** - Cards and containers handle overflow gracefully with scroll or truncation

## Implementation Notes

### DO
- Follow the existing CSS variable pattern in `apps/desktop/src/index.css` for any new theme colors
- Reuse `ThemePalettes` structure in `apps/mobile4/src/state/theme.tsx` for mobile colors
- Use Framer Motion `AnimatePresence` for any new component state transitions on desktop
- Apply CVA patterns from existing `components/ui/` files for new variant-based components
- Keep mobile and desktop theme colors synchronized
- Test all themes after changes (dark, light, warm, olive, oliveOrange, roseGold)
- Use existing `useTheme()` hook patterns on mobile

### DON'T
- Create new theme switching mechanisms when existing `data-theme` (desktop) and `ThemeProvider` (mobile) work
- Modify navigation structure or routing
- Add new npm dependencies without strong justification
- Break existing component APIs that other parts of the app depend on
- Use hardcoded colors - always use theme variables/palette
- Forget to test both minimized and expanded states of active session

## Development Environment

### Start Services

```bash
# Desktop
cd apps/desktop && npm run dev

# Mobile (iOS Simulator)
cd apps/mobile4 && npm run ios

# Mobile (Android Emulator)
cd apps/mobile4 && npm run android
```

### Service URLs
- Desktop: http://localhost:5174
- Mobile: Expo Go app or simulator

### Required Environment Variables
- `VITE_SUPABASE_URL`: Supabase project URL (desktop)
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key (desktop)
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL (mobile)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key (mobile)

## Success Criteria

The task is complete when:

1. [ ] All themes (dark, light, warm, olive, oliveOrange, roseGold) render correctly on both platforms
2. [ ] Active session banner shows subtask breakdown when subtasks exist
3. [ ] Compact/minimized active session mode works with subtask count display
4. [ ] All card components match reference design aesthetic
5. [ ] Typography and spacing are consistent with reference
6. [ ] No console errors during normal usage
7. [ ] Existing tests still pass
8. [ ] New functionality verified via browser (desktop) and simulator (mobile)
9. [ ] Theme switching works smoothly without visual glitches
10. [ ] All existing features work as before (navigation, sessions, tasks, trackers, etc.)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Theme palette consistency | `apps/desktop/src/index.css` | All theme variants define required CSS variables |
| ThemePalettes completeness | `apps/mobile4/src/state/theme.tsx` | All palettes have same keys with valid values |
| ActiveSessionBanner states | `apps/desktop/src/ui/ActiveSessionBanner.tsx` | Minimized/expanded states render correctly |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Theme switching | desktop | Changing themes updates all components |
| Theme persistence | mobile4 | Theme choice persists across app restarts |
| Active session display | desktop + mobile4 | Session with subtasks shows breakdown correctly |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Start session with subtasks | 1. Create task with subtasks 2. Start session | Subtasks visible in active session display |
| Theme toggle dark/light | 1. Open settings 2. Toggle theme | All UI elements update to new theme |
| Minimize/expand session | 1. Start session 2. Click minimize 3. Click expand | Session banner transitions smoothly |

### Browser Verification (Desktop)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Dashboard | `http://localhost:5174/` | Cards render with new styling, theme applied |
| Focus View | `http://localhost:5174/focus` | Active session shows with new design |
| Settings | `http://localhost:5174/settings` | Theme toggle works, settings cards styled |

### Mobile Verification
| Page/Component | Screen | Checks |
|----------------|--------|--------|
| Dashboard (Today) | Main tab | Active card styled, subtasks visible if present |
| Theme settings | Settings screen | Theme picker works, colors update |
| Focus screen | `/focus` route | Active session matches new design |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| N/A - No DB changes | N/A | N/A |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete (all pages checked in dark and light themes)
- [ ] Mobile verification complete (iOS and/or Android simulator)
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns (CSS variables, ThemePalettes, Framer Motion)
- [ ] No security vulnerabilities introduced
- [ ] Performance not degraded (no noticeable lag during theme switching or animations)
- [ ] Accessibility maintained (contrast ratios acceptable, focus states visible)
