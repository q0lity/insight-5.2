/**
 * Theme System Tests
 *
 * Tests for the theme provider and hooks.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ThemeProvider,
  useTheme,
  useIsDark,
  useReducedMotion,
  ThemePalettes,
  DisplaySizes,
  getThemePalette,
  type ThemeMode,
  type DisplayMode,
} from '@/src/state/theme';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  multiGet: jest.fn(() => Promise.resolve([['', null], ['', null]])),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock react-native
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  useColorScheme: jest.fn(() => 'light'),
  PixelRatio: {
    getFontScale: jest.fn(() => 1),
  },
  AccessibilityInfo: {
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Platform: {
    OS: 'ios',
  },
}));

// Test component that uses the theme hook
function ThemeConsumer() {
  const { palette, sizes, isDark, themeMode, displayMode } = useTheme();
  return (
    <>
      <Text testID="background">{palette.background}</Text>
      <Text testID="headerTitle">{sizes.headerTitle}</Text>
      <Text testID="isDark">{isDark.toString()}</Text>
      <Text testID="themeMode">{themeMode}</Text>
      <Text testID="displayMode">{displayMode}</Text>
    </>
  );
}

function IsDarkConsumer() {
  const isDark = useIsDark();
  return <Text testID="isDark">{isDark.toString()}</Text>;
}

function ReducedMotionConsumer() {
  const isReducedMotion = useReducedMotion();
  return <Text testID="isReducedMotion">{isReducedMotion.toString()}</Text>;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([['', null], ['', null]]);
  });

  describe('Initial Rendering', () => {
    it('renders children after loading preferences', async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(getByTestId('themeMode')).toBeTruthy();
      });
    });

    it('defaults to system theme mode', async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(getByTestId('themeMode').props.children).toBe('system');
      });
    });

    it('defaults to big display mode', async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(getByTestId('displayMode').props.children).toBe('big');
      });
    });
  });

  describe('Theme Mode Resolution', () => {
    it('resolves system light to warm theme', async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(getByTestId('background').props.children).toBe(ThemePalettes.warm.background);
      });
    });

    it('provides correct isDark value for warm theme', async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(getByTestId('isDark').props.children).toBe('false');
      });
    });
  });

  describe('Persistence', () => {
    it('loads persisted theme mode from AsyncStorage', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
        ['@insight/themeMode', 'dark'],
        ['@insight/displayMode', null],
      ]);

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(getByTestId('themeMode').props.children).toBe('dark');
      });
    });

    it('loads persisted display mode from AsyncStorage', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
        ['@insight/themeMode', null],
        ['@insight/displayMode', 'compact'],
      ]);

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(getByTestId('displayMode').props.children).toBe('compact');
      });
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await waitFor(() => {
        // Should fall back to defaults
        expect(getByTestId('themeMode').props.children).toBe('system');
      });
    });
  });
});

describe('ThemePalettes', () => {
  describe('Color Definitions', () => {
    const themes: Array<keyof typeof ThemePalettes> = ['dark', 'light', 'warm', 'olive'];

    it.each(themes)('%s theme has all required colors', (theme) => {
      const palette = ThemePalettes[theme];

      expect(palette.background).toBeDefined();
      expect(palette.surface).toBeDefined();
      expect(palette.surfaceAlt).toBeDefined();
      expect(palette.text).toBeDefined();
      expect(palette.textSecondary).toBeDefined();
      expect(palette.tint).toBeDefined();
      expect(palette.tintLight).toBeDefined();
      expect(palette.border).toBeDefined();
      expect(palette.borderLight).toBeDefined();
      expect(palette.success).toBeDefined();
      expect(palette.error).toBeDefined();
      expect(palette.warning).toBeDefined();
      expect(palette.textHighContrast).toBeDefined();
      expect(palette.focusRing).toBeDefined();
    });

    it('dark theme has dark background', () => {
      expect(ThemePalettes.dark.background).toBe('#0B1020');
    });

    it('light theme has light background', () => {
      expect(ThemePalettes.light.background).toBe('#FFFFFF');
    });

    it('warm theme has warm background', () => {
      expect(ThemePalettes.warm.background).toBe('#F2F0ED');
    });

    it('olive theme has olive background', () => {
      expect(ThemePalettes.olive.background).toBe('#1A1F16');
    });

    it('all themes share the same primary tint (except olive)', () => {
      expect(ThemePalettes.dark.tint).toBe('#D95D39');
      expect(ThemePalettes.light.tint).toBe('#D95D39');
      expect(ThemePalettes.warm.tint).toBe('#D95D39');
      expect(ThemePalettes.olive.tint).toBe('#8B9A6D');
    });
  });
});

describe('DisplaySizes', () => {
  describe('Size Definitions', () => {
    const modes: Array<keyof typeof DisplaySizes> = ['big', 'compact'];

    it.each(modes)('%s mode has all required sizes', (mode) => {
      const sizes = DisplaySizes[mode];

      expect(sizes.headerTitle).toBeDefined();
      expect(sizes.sectionTitle).toBeDefined();
      expect(sizes.bodyText).toBeDefined();
      expect(sizes.smallText).toBeDefined();
      expect(sizes.tinyText).toBeDefined();
      expect(sizes.spacing).toBeDefined();
      expect(sizes.borderRadius).toBeDefined();
      expect(sizes.buttonHeight).toBeDefined();
      expect(sizes.iconSize).toBeDefined();
      expect(sizes.minTouchTarget).toBeDefined();
    });

    it('big mode has larger typography than compact', () => {
      expect(DisplaySizes.big.headerTitle).toBeGreaterThan(DisplaySizes.compact.headerTitle);
      expect(DisplaySizes.big.bodyText).toBeGreaterThan(DisplaySizes.compact.bodyText);
    });

    it('both modes maintain minimum touch target of 44px', () => {
      expect(DisplaySizes.big.minTouchTarget).toBe(44);
      expect(DisplaySizes.compact.minTouchTarget).toBe(44);
    });
  });
});

describe('useIsDark', () => {
  it('returns false for light-based themes', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <IsDarkConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('isDark').props.children).toBe('false');
    });
  });
});

describe('useReducedMotion', () => {
  it('returns false by default', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ReducedMotionConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('isReducedMotion').props.children).toBe('false');
    });
  });
});

describe('getThemePalette', () => {
  it('returns correct palette for dark theme', () => {
    expect(getThemePalette('dark')).toBe(ThemePalettes.dark);
  });

  it('returns correct palette for light theme', () => {
    expect(getThemePalette('light')).toBe(ThemePalettes.light);
  });

  it('returns correct palette for warm theme', () => {
    expect(getThemePalette('warm')).toBe(ThemePalettes.warm);
  });

  it('returns correct palette for olive theme', () => {
    expect(getThemePalette('olive')).toBe(ThemePalettes.olive);
  });
});

describe('useTheme outside provider', () => {
  it('throws error when used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<ThemeConsumer />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });
});
