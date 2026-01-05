import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemeMode = 'dark' | 'light' | 'warm' | 'olive' | 'system';
export type DisplayMode = 'big' | 'compact';
export type ResolvedTheme = 'dark' | 'light' | 'warm' | 'olive';

// Theme palettes - 4 color schemes
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
  },
};

// Display sizes - Big vs Compact
export const DisplaySizes = {
  big: {
    // Typography
    headerTitle: 22,
    sectionTitle: 17,
    bodyText: 16,
    smallText: 13,
    tinyText: 11,
    // Spacing & Layout
    spacing: 20,
    spacingSmall: 12,
    cardPadding: 20,
    cardGap: 16,
    rowGap: 12,
    // Shapes
    borderRadius: 24,
    borderRadiusSmall: 16,
    // Elements
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
  },
  compact: {
    // Typography - significantly smaller
    headerTitle: 16,
    sectionTitle: 12,
    bodyText: 12,
    smallText: 10,
    tinyText: 8,
    // Spacing & Layout - tighter
    spacing: 10,
    spacingSmall: 6,
    cardPadding: 10,
    cardGap: 8,
    rowGap: 6,
    // Shapes - smaller radii
    borderRadius: 12,
    borderRadiusSmall: 8,
    // Elements - smaller
    buttonHeight: 36,
    buttonHeightSmall: 28,
    iconSize: 16,
    iconSizeSmall: 14,
    iconSizeTiny: 12,
    // Metrics/Stats cards - compact
    metricValue: 18,
    metricLabel: 8,
    chipPadding: 6,
    chipHeight: 24,
    // Heatmap - smaller cells
    heatmapCell: 8,
    heatmapGap: 2,
  },
};

type ThemeContextValue = {
  themeMode: ThemeMode;
  displayMode: DisplayMode;
  resolvedTheme: ResolvedTheme;
  palette: typeof ThemePalettes.dark;
  sizes: typeof DisplaySizes.big;
  isDark: boolean;
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
  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch((error) => {
      console.warn('Failed to save theme mode:', error);
    });
  };

  // Persist display mode to AsyncStorage
  const setDisplayMode = (mode: DisplayMode) => {
    setDisplayModeState(mode);
    AsyncStorage.setItem(DISPLAY_STORAGE_KEY, mode).catch((error) => {
      console.warn('Failed to save display mode:', error);
    });
  };

  // Resolve 'system' to actual theme
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (themeMode === 'system') {
      // System dark → dark, system light → warm (the "middle" mode)
      return systemScheme === 'dark' ? 'dark' : 'warm';
    }
    return themeMode;
  }, [themeMode, systemScheme]);

  // Get current palette and sizes
  const palette = ThemePalettes[resolvedTheme];
  const sizes = DisplaySizes[displayMode];
  const isDark = resolvedTheme === 'dark' || resolvedTheme === 'olive';

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      displayMode,
      resolvedTheme,
      palette,
      sizes,
      isDark,
      setThemeMode,
      setDisplayMode,
    }),
    [themeMode, displayMode, resolvedTheme, palette, sizes, isDark]
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

// Helper to get theme-aware colors (for components that can't use hooks)
export function getThemePalette(theme: ResolvedTheme) {
  return ThemePalettes[theme];
}
