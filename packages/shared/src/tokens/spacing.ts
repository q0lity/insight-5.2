/**
 * Spacing System - 8pt Grid
 *
 * Based on Material Design 3 spacing principles with iOS SafeArea support.
 * All values are multiples of 4px (half-grid) or 8px (full-grid).
 */

// =============================================================================
// PRIMITIVE SPACING (8pt grid base)
// =============================================================================

export const SpacingPrimitive = {
  0: 0,
  px: 1,
  '0.5': 2,   // quarter-grid
  1: 4,       // half-grid
  '1.5': 6,
  2: 8,       // 1× grid unit
  '2.5': 10,
  3: 12,      // 1.5× grid
  '3.5': 14,
  4: 16,      // 2× grid
  5: 20,      // 2.5× grid
  6: 24,      // 3× grid
  7: 28,
  8: 32,      // 4× grid
  9: 36,
  10: 40,     // 5× grid
  12: 48,     // 6× grid
  14: 56,
  16: 64,     // 8× grid
  20: 80,
  24: 96,
  32: 128,
} as const;

export type SpacingPrimitiveKey = keyof typeof SpacingPrimitive;

// =============================================================================
// SEMANTIC SPACING
// =============================================================================

export const SpacingSemantic = {
  // Stack spacing (vertical gaps)
  stack: {
    xs: SpacingPrimitive[1],    // 4px
    sm: SpacingPrimitive[2],    // 8px
    md: SpacingPrimitive[4],    // 16px
    lg: SpacingPrimitive[6],    // 24px
    xl: SpacingPrimitive[8],    // 32px
  },

  // Inline spacing (horizontal gaps)
  inline: {
    xs: SpacingPrimitive[1],    // 4px
    sm: SpacingPrimitive[2],    // 8px
    md: SpacingPrimitive[3],    // 12px
    lg: SpacingPrimitive[4],    // 16px
  },

  // Section spacing (between major sections)
  section: {
    sm: SpacingPrimitive[8],    // 32px
    md: SpacingPrimitive[12],   // 48px
    lg: SpacingPrimitive[16],   // 64px
  },
} as const;

// =============================================================================
// RESPONSIVE PAGE MARGINS (Size Class Aware)
// =============================================================================

export type SizeClass = 'compact' | 'regular' | 'expanded';

export const PageMargin: Record<SizeClass, number> = {
  compact: SpacingPrimitive[4],     // 16px - Mobile
  regular: SpacingPrimitive[6],     // 24px - Tablet
  expanded: SpacingPrimitive[8],    // 32px - Desktop
};

export const PageGutter: Record<SizeClass, number> = {
  compact: SpacingPrimitive[3],     // 12px
  regular: SpacingPrimitive[4],     // 16px
  expanded: SpacingPrimitive[6],    // 24px
};

// =============================================================================
// SAFE AREA INSETS
// =============================================================================

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Default safe area values (updated at runtime)
export const SafeAreaDefaults: SafeAreaInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

// Platform-specific safe area presets
export const SafeAreaPresets = {
  // iPhone with notch/Dynamic Island
  iphoneNotch: {
    top: 59,
    right: 0,
    bottom: 34,
    left: 0,
  },
  // iPhone SE / older iPhones
  iphoneClassic: {
    top: 20,
    right: 0,
    bottom: 0,
    left: 0,
  },
  // iPad
  ipad: {
    top: 24,
    right: 0,
    bottom: 20,
    left: 0,
  },
  // Desktop (Electron with traffic lights)
  desktop: {
    top: 28,
    right: 0,
    bottom: 0,
    left: 0,
  },
  // Web (no safe areas)
  web: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
} as const;

// =============================================================================
// COMPONENT SPACING
// =============================================================================

export const ComponentSpacing = {
  button: {
    paddingX: {
      sm: SpacingPrimitive[3],    // 12px
      md: SpacingPrimitive[4],    // 16px
      lg: SpacingPrimitive[6],    // 24px
    },
    paddingY: {
      sm: SpacingPrimitive['1.5'], // 6px
      md: SpacingPrimitive[2],     // 8px
      lg: SpacingPrimitive[3],     // 12px
    },
    gap: SpacingPrimitive[2],      // 8px between icon and text
  },

  input: {
    paddingX: SpacingPrimitive[3],  // 12px
    paddingY: SpacingPrimitive[2],  // 8px
  },

  card: {
    padding: {
      sm: SpacingPrimitive[3],    // 12px
      md: SpacingPrimitive[4],    // 16px
      lg: SpacingPrimitive[6],    // 24px
    },
    gap: SpacingPrimitive[3],     // 12px between card items
  },

  modal: {
    padding: SpacingPrimitive[6], // 24px
    gap: SpacingPrimitive[4],     // 16px
  },

  list: {
    itemPadding: SpacingPrimitive[3], // 12px
    itemGap: SpacingPrimitive[1],     // 4px between items
  },

  nav: {
    itemPadding: SpacingPrimitive[3], // 12px
    itemGap: SpacingPrimitive[2],     // 8px
    sectionGap: SpacingPrimitive[4],  // 16px between sections
  },
} as const;

// =============================================================================
// BREAKPOINTS
// =============================================================================

export const Breakpoints = {
  xs: 0,
  sm: 600,
  md: 840,
  lg: 1080,
  xl: 1440,
  '2xl': 1920,
} as const;

// Size class breakpoint mapping
export const SizeClassBreakpoints: Record<SizeClass, { min: number; max: number }> = {
  compact: { min: 0, max: 599 },
  regular: { min: 600, max: 1079 },
  expanded: { min: 1080, max: Infinity },
};

// =============================================================================
// CSS VARIABLE GENERATION
// =============================================================================

export function generateSpacingCSSVars(): string {
  const vars: string[] = [];

  // Primitives
  Object.entries(SpacingPrimitive).forEach(([key, value]) => {
    vars.push(`--spacing-${key}: ${value}px;`);
  });

  // Semantic
  vars.push(`--spacing-stack-xs: ${SpacingSemantic.stack.xs}px;`);
  vars.push(`--spacing-stack-sm: ${SpacingSemantic.stack.sm}px;`);
  vars.push(`--spacing-stack-md: ${SpacingSemantic.stack.md}px;`);
  vars.push(`--spacing-stack-lg: ${SpacingSemantic.stack.lg}px;`);
  vars.push(`--spacing-stack-xl: ${SpacingSemantic.stack.xl}px;`);

  vars.push(`--spacing-inline-xs: ${SpacingSemantic.inline.xs}px;`);
  vars.push(`--spacing-inline-sm: ${SpacingSemantic.inline.sm}px;`);
  vars.push(`--spacing-inline-md: ${SpacingSemantic.inline.md}px;`);
  vars.push(`--spacing-inline-lg: ${SpacingSemantic.inline.lg}px;`);

  // Page margins (default to compact, override via media queries)
  vars.push(`--page-margin: ${PageMargin.compact}px;`);
  vars.push(`--page-gutter: ${PageGutter.compact}px;`);

  // Safe area (default to zero, updated via JS or env())
  vars.push(`--safe-area-top: env(safe-area-inset-top, 0px);`);
  vars.push(`--safe-area-right: env(safe-area-inset-right, 0px);`);
  vars.push(`--safe-area-bottom: env(safe-area-inset-bottom, 0px);`);
  vars.push(`--safe-area-left: env(safe-area-inset-left, 0px);`);

  return vars.join('\n  ');
}

export function generateResponsiveCSSVars(): string {
  return `
@media (min-width: ${Breakpoints.sm}px) {
  :root {
    --page-margin: ${PageMargin.regular}px;
    --page-gutter: ${PageGutter.regular}px;
  }
}

@media (min-width: ${Breakpoints.lg}px) {
  :root {
    --page-margin: ${PageMargin.expanded}px;
    --page-gutter: ${PageGutter.expanded}px;
  }
}
`;
}

// =============================================================================
// TAILWIND CONFIG GENERATION
// =============================================================================

export function generateTailwindSpacing(): Record<string, string> {
  const spacing: Record<string, string> = {};

  Object.entries(SpacingPrimitive).forEach(([key, value]) => {
    spacing[key] = `${value}px`;
  });

  // Add semantic aliases
  spacing['stack-xs'] = `${SpacingSemantic.stack.xs}px`;
  spacing['stack-sm'] = `${SpacingSemantic.stack.sm}px`;
  spacing['stack-md'] = `${SpacingSemantic.stack.md}px`;
  spacing['stack-lg'] = `${SpacingSemantic.stack.lg}px`;
  spacing['stack-xl'] = `${SpacingSemantic.stack.xl}px`;

  spacing['inline-xs'] = `${SpacingSemantic.inline.xs}px`;
  spacing['inline-sm'] = `${SpacingSemantic.inline.sm}px`;
  spacing['inline-md'] = `${SpacingSemantic.inline.md}px`;
  spacing['inline-lg'] = `${SpacingSemantic.inline.lg}px`;

  spacing['page'] = 'var(--page-margin)';
  spacing['gutter'] = 'var(--page-gutter)';

  // Safe area utilities
  spacing['safe-t'] = 'var(--safe-area-top)';
  spacing['safe-r'] = 'var(--safe-area-right)';
  spacing['safe-b'] = 'var(--safe-area-bottom)';
  spacing['safe-l'] = 'var(--safe-area-left)';

  return spacing;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function getSizeClass(width: number): SizeClass {
  if (width < SizeClassBreakpoints.compact.max) return 'compact';
  if (width < SizeClassBreakpoints.regular.max) return 'regular';
  return 'expanded';
}

export function getPageMargin(sizeClass: SizeClass): number {
  return PageMargin[sizeClass];
}

export function getPageGutter(sizeClass: SizeClass): number {
  return PageGutter[sizeClass];
}

// Grid-snap helper: rounds to nearest 8pt grid value
export function snapToGrid(value: number, gridSize: number = 8): number {
  return Math.round(value / gridSize) * gridSize;
}

// Rem conversion helper (assuming 16px base)
export function pxToRem(px: number, base: number = 16): string {
  return `${px / base}rem`;
}
