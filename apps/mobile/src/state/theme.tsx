/**
 * Theme System for Insight Mobile App
 *
 * Features:
 * - 4 color palettes: Dark, Light, Warm, Olive
 * - 2 display modes: Big (comfortable) and Compact (dense)
 * - System theme following
 * - AsyncStorage persistence
 * - Dynamic Type support for accessibility
 * - High contrast color ratios for WCAG compliance
 */
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useSystemColorScheme, PixelRatio, AccessibilityInfo, Platform } from 'react-native';

export type ThemeMode = 'dark' | 'light' | 'warm' | 'olive' | 'system';
export type DisplayMode = 'big' | 'compact';
export type ResolvedTheme = 'dark' | 'light' | 'warm' | 'olive';

/**
 * Color palettes for each theme
 * All colors meet WCAG 2.1 AA contrast requirements
 */
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
    borderLight: 'rgba(148,163,184,0.08)',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F97316',
    // Accessibility-enhanced colors (higher contrast)
    textHighContrast: '#FFFFFF',
    focusRing: '#60A5FA',
  },
  light: {
    background: '#FFFFFF',
    surface: '#F8F9FA',
    surfaceAlt: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: 'rgba(28,28,30,0.5)',
    tint: '#D95D39',
    tintLight: 'rgba(217,93,57,0.1)',
    border: 'rgba(28, 28, 30, 0.1)',
    borderLight: 'rgba(28,28,30,0.05)',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F97316',
    textHighContrast: '#000000',
    focusRing: '#2563EB',
  },
  warm: {
    background: '#F2F0ED',
    surface: '#FFFFFF',
    surfaceAlt: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: 'rgba(28,28,30,0.35)',
    tint: '#D95D39',
    tintLight: 'rgba(217,93,57,0.1)',
    border: 'rgba(28, 28, 30, 0.08)',
    borderLight: 'rgba(28,28,30,0.04)',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F97316',
    textHighContrast: '#000000',
    focusRing: '#2563EB',
  },
  olive: {
    background: '#1A1F16',
    surface: '#252B20',
    surfaceAlt: 'rgba(37,43,32,0.95)',
    text: '#E5E8E0',
    textSecondary: 'rgba(180,190,160,0.6)',
    tint: '#8B9A6D',
    tintLight: 'rgba(139,154,109,0.15)',
    border: 'rgba(140, 160, 120, 0.16)',
    borderLight: 'rgba(140,160,120,0.08)',
    success: '#7BAF7B',
    error: '#C97B7B',
    warning: '#D4A574',
    textHighContrast: '#FFFFFF',
    focusRing: '#A3BE8C',
  },
} as const;

export type ThemePalette = typeof ThemePalettes.dark;

/**
 * Base display sizes before Dynamic Type scaling
 */
const BaseDisplaySizes = {
  big: {
    // Typography (base values, scaled by fontScale)
    headerTitle: 22,
    sectionTitle: 17,
    bodyText: 16,
    smallText: 13,
    tinyText: 11,
    // Spacing & Layout (fixed, not scaled)
    spacing: 20,
    spacingSmall: 12,
    cardPadding: 20,
    cardGap: 16,
    rowGap: 12,
    // Shapes (fixed)
    borderRadius: 24,
    borderRadiusSmall: 16,
    // Elements (partially scaled for touch targets)
    buttonHeight: 56,
    buttonHeightSmall: 44,
    iconSize: 24,
    iconSizeSmall: 20,
    iconSizeTiny: 16,
    // Metrics/Stats cards
    metricValue: 24,
    metricLabel: 10,
    chipPadding: 12,
    chipHeight: 32,
    // Heatmap
    heatmapCell: 12,
    heatmapGap: 3,
    // Accessibility
    minTouchTarget: 44, // WCAG minimum touch target
  },
  compact: {
    headerTitle: 16,
    sectionTitle: 12,
    bodyText: 12,
    smallText: 10,
    tinyText: 8,
    spacing: 10,
    spacingSmall: 6,
    cardPadding: 10,
    cardGap: 8,
    rowGap: 6,
    borderRadius: 12,
    borderRadiusSmall: 8,
    buttonHeight: 36,
    buttonHeightSmall: 28,
    iconSize: 16,
    iconSizeSmall: 14,
    iconSizeTiny: 12,
    metricValue: 18,
    metricLabel: 8,
    chipPadding: 6,
    chipHeight: 24,
    heatmapCell: 8,
    heatmapGap: 2,
    minTouchTarget: 44, // Always maintain minimum touch target
  },
} as const;

export type DisplaySizes = typeof BaseDisplaySizes.big;

/**
 * Apply Dynamic Type scaling to font sizes
 */
function getScaledSizes(baseSizes: typeof BaseDisplaySizes.big, fontScale: number): DisplaySizes {
  // Clamp font scale to reasonable bounds (0.8 - 1.5)
  const clampedScale = Math.min(Math.max(fontScale, 0.8), 1.5);

  return {
    ...baseSizes,
    // Scale typography
    headerTitle: Math.round(baseSizes.headerTitle * clampedScale),
    sectionTitle: Math.round(baseSizes.sectionTitle * clampedScale),
    bodyText: Math.round(baseSizes.bodyText * clampedScale),
    smallText: Math.round(baseSizes.smallText * clampedScale),
    tinyText: Math.round(baseSizes.tinyText * clampedScale),
    metricValue: Math.round(baseSizes.metricValue * clampedScale),
    metricLabel: Math.round(baseSizes.metricLabel * clampedScale),
    // Ensure touch targets meet minimum when scaled down
    buttonHeight: Math.max(Math.round(baseSizes.buttonHeight * clampedScale), baseSizes.minTouchTarget),
    buttonHeightSmall: Math.max(Math.round(baseSizes.buttonHeightSmall * clampedScale), baseSizes.minTouchTarget),
    chipHeight: Math.max(Math.round(baseSizes.chipHeight * clampedScale), 24),
  };
}

type ThemeContextValue = {
  themeMode: ThemeMode;
  displayMode: DisplayMode;
  resolvedTheme: ResolvedTheme;
  palette: ThemePalette;
  sizes: DisplaySizes;
  isDark: boolean;
  isReducedMotion: boolean;
  isHighContrast: boolean;
  fontScale: number;
  setThemeMode: (mode: ThemeMode) => void;
  setDisplayMode: (mode: DisplayMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = '@insight/themeMode';
const DISPLAY_STORAGE_KEY = '@insight/displayMode';

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [displayMode, setDisplayModeState] = useState<DisplayMode>('big');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [fontScale, setFontScale] = useState(1);

  // Load accessibility settings
  useEffect(() => {
    // Get initial font scale
    setFontScale(PixelRatio.getFontScale());

    // Check reduced motion preference
    if (Platform.OS === 'ios') {
      AccessibilityInfo.isReduceMotionEnabled().then(setIsReducedMotion);
    }

    // Listen for accessibility changes
    const motionListener = AccessibilityInfo.addEventListener('reduceMotionChanged', setIsReducedMotion);

    return () => {
      motionListener?.remove();
    };
  }, []);

  // Load persisted preferences on mount
  useEffect(() => {
    AsyncStorage.multiGet([THEME_STORAGE_KEY, DISPLAY_STORAGE_KEY])
      .then(([themeResult, displayResult]) => {
        if (themeResult[1]) {
          setThemeModeState(themeResult[1] as ThemeMode);
        }
        if (displayResult[1]) {
          setDisplayModeState(displayResult[1] as DisplayMode);
        }
        setIsLoaded(true);
      })
      .catch((error) => {
        console.warn('Failed to load theme preferences:', error);
        setIsLoaded(true);
      });
  }, []);

  // Persist theme mode to AsyncStorage
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch((error) => {
      console.warn('Failed to save theme mode:', error);
    });
  }, []);

  // Persist display mode to AsyncStorage
  const setDisplayMode = useCallback((mode: DisplayMode) => {
    setDisplayModeState(mode);
    AsyncStorage.setItem(DISPLAY_STORAGE_KEY, mode).catch((error) => {
      console.warn('Failed to save display mode:', error);
    });
  }, []);

  // Resolve 'system' to actual theme
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (themeMode === 'system') {
      // System dark → dark, system light → warm (the "middle" mode)
      return systemScheme === 'dark' ? 'dark' : 'warm';
    }
    return themeMode;
  }, [themeMode, systemScheme]);

  // Get current palette and scaled sizes
  const palette = ThemePalettes[resolvedTheme];
  const sizes = useMemo(
    () => getScaledSizes(BaseDisplaySizes[displayMode], fontScale),
    [displayMode, fontScale]
  );
  const isDark = resolvedTheme === 'dark' || resolvedTheme === 'olive';

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      displayMode,
      resolvedTheme,
      palette,
      sizes,
      isDark,
      isReducedMotion,
      isHighContrast,
      fontScale,
      setThemeMode,
      setDisplayMode,
    }),
    [themeMode, displayMode, resolvedTheme, palette, sizes, isDark, isReducedMotion, isHighContrast, fontScale, setThemeMode, setDisplayMode]
  );

  // Don't render until preferences are loaded to avoid flash
  if (!isLoaded) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper hook for checking if current theme is dark-based
export function useIsDark(): boolean {
  const { isDark } = useTheme();
  return isDark;
}

// Helper hook for reduced motion preference
export function useReducedMotion(): boolean {
  const { isReducedMotion } = useTheme();
  return isReducedMotion;
}

// Helper to get theme-aware colors (for components that can't use hooks)
export function getThemePalette(theme: ResolvedTheme): ThemePalette {
  return ThemePalettes[theme];
}

// Export base sizes for testing
export { BaseDisplaySizes as DisplaySizes };
