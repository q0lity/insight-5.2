import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemeMode =
  | 'dark'
  | 'light'
  | 'warm'
  | 'olive'
  | 'oliveOrange'
  | 'roseGold'
  | 'midnight'
  | 'midnightNeon'
  | 'system';
export type DisplayMode = 'big' | 'compact';
export type ResolvedTheme =
  | 'dark'
  | 'light'
  | 'warm'
  | 'olive'
  | 'oliveOrange'
  | 'roseGold'
  | 'midnight'
  | 'midnightNeon';
export type ThemePalette = typeof ThemePalettes.dark;

// Theme palettes
export const ThemePalettes = {
  dark: {
    background: '#0E1B2E',
    surface: '#1B2A42',
    surfaceAlt: '#16243A',
    panelAlpha: '#1B2A42',
    glass: '#1B2A42',
    overlay: 'rgba(0,0,0,0.35)',
    text: '#E8ECF2',
    textSecondary: '#A3AEC2',
    tint: '#E26B3A',
    tintLight: '#F4B59A',
    tintMid: '#F0A582',
    tintBorder: '#E7A382',
    border: '#2B3A55',
    borderLight: '#3A4A66',
    success: '#34D399',
    error: '#FB7185',
    warning: '#FBBF24',
  },
  light: {
    background: '#FFFFFF',
    surface: '#F7F6F2',
    surfaceAlt: '#FFFFFF',
    panelAlpha: '#F7F6F2',
    glass: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.2)',
    text: '#0C0C0C',
    textSecondary: '#5C667A',
    tint: '#E26B3A',
    tintLight: '#FCECE8',
    tintMid: '#F4B59A',
    tintBorder: '#E7A382',
    border: '#E7E2DA',
    borderLight: '#EFEAE3',
    success: '#2F8A5A',
    error: '#C94B42',
    warning: '#F59E0B',
  },
  warm: {
    background: '#FFFFFF',
    surface: '#F7F6F2',
    surfaceAlt: '#FFFFFF',
    panelAlpha: '#F7F6F2',
    glass: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.2)',
    text: '#0C0C0C',
    textSecondary: '#5C667A',
    tint: '#E26B3A',
    tintLight: '#FCECE8',
    tintMid: '#F4B59A',
    tintBorder: '#E7A382',
    border: '#E7E2DA',
    borderLight: '#EFEAE3',
    success: '#2F8A5A',
    error: '#C94B42',
    warning: '#F59E0B',
  },
  olive: {
    background: '#2E3127',
    surface: '#3A3F31',
    surfaceAlt: '#333828',
    panelAlpha: '#3A3F31',
    glass: '#3A3F31',
    overlay: 'rgba(0,0,0,0.45)',
    text: '#F2EFEA',
    textSecondary: '#B8B1A5',
    tint: '#E26B3A',
    tintLight: '#5B3A2D',
    tintMid: '#6D4331',
    tintBorder: '#7B4B33',
    border: '#4A4F3E',
    borderLight: '#5C6150',
    success: '#2F8A5A',
    error: '#C94B42',
    warning: '#F59E0B',
  },
  oliveOrange: {
    background: '#2E3127',
    surface: '#3A3F31',
    surfaceAlt: '#333828',
    panelAlpha: '#3A3F31',
    glass: '#3A3F31',
    overlay: 'rgba(0,0,0,0.45)',
    text: '#F2EFEA',
    textSecondary: '#B8B1A5',
    tint: '#E26B3A',
    tintLight: '#5B3A2D',
    tintMid: '#6D4331',
    tintBorder: '#7B4B33',
    border: '#4A4F3E',
    borderLight: '#5C6150',
    success: '#2F8A5A',
    error: '#C94B42',
    warning: '#F59E0B',
  },
  roseGold: {
    background: '#FFFFFF',
    surface: '#F7F6F2',
    surfaceAlt: '#FFFFFF',
    panelAlpha: '#F7F6F2',
    glass: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.2)',
    text: '#0C0C0C',
    textSecondary: '#5C667A',
    tint: '#E26B3A',
    tintLight: '#FCECE8',
    tintMid: '#F4B59A',
    tintBorder: '#E7A382',
    border: '#E7E2DA',
    borderLight: '#EFEAE3',
    success: '#2F8A5A',
    error: '#C94B42',
    warning: '#F59E0B',
  },
  midnight: {
    background: '#0E1B2E',
    surface: '#1B2A42',
    surfaceAlt: '#16243A',
    panelAlpha: '#1B2A42',
    glass: '#1B2A42',
    overlay: 'rgba(0,0,0,0.35)',
    text: '#E8ECF2',
    textSecondary: '#A3AEC2',
    tint: '#E26B3A',
    tintLight: '#F4B59A',
    tintMid: '#F0A582',
    tintBorder: '#E7A382',
    border: '#2B3A55',
    borderLight: '#3A4A66',
    success: '#34D399',
    error: '#FB7185',
    warning: '#FBBF24',
  },
  midnightNeon: {
    background: '#0a0a0f',
    surface: '#14141a',
    surfaceAlt: '#0e0e14',
    panelAlpha: '#14141a',
    glass: '#14141a',
    overlay: 'rgba(0,0,0,0.6)',
    text: '#E9E9E9',
    textSecondary: '#9AA3B2',
    tint: '#00E5FF',
    tintLight: '#0C2A33',
    tintMid: '#0F3A45',
    tintBorder: '#1A5661',
    border: '#1e2128',
    borderLight: '#2a2e38',
    success: '#A7FF4A',
    error: '#FF5C5C',
    warning: '#FFC857',
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
    headerTitle: 14,
    sectionTitle: 11,
    bodyText: 11,
    smallText: 9,
    tinyText: 7,
    // Spacing & Layout - tighter
    spacing: 8,
    spacingSmall: 4,
    cardPadding: 8,
    cardGap: 6,
    rowGap: 4,
    // Shapes - smaller radii
    borderRadius: 10,
    borderRadiusSmall: 6,
    // Elements - smaller
    buttonHeight: 32,
    buttonHeightSmall: 26,
    iconSize: 14,
    iconSizeSmall: 12,
    iconSizeTiny: 10,
    // Metrics/Stats cards - compact
    metricValue: 16,
    metricLabel: 7,
    chipPadding: 5,
    chipHeight: 20,
    // Heatmap - smaller cells
    heatmapCell: 6,
    heatmapGap: 1,
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
  const [themeMode, setThemeModeState] = useState<ThemeMode>('warm');
  const [displayMode, setDisplayModeState] = useState<DisplayMode>('compact');
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
  const isDark =
    resolvedTheme === 'dark' ||
    resolvedTheme === 'olive' ||
    resolvedTheme === 'oliveOrange' ||
    resolvedTheme === 'roseGold' ||
    resolvedTheme === 'midnight' ||
    resolvedTheme === 'midnightNeon';

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
