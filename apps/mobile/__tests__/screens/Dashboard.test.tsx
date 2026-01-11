/**
 * Dashboard Screen Tests
 *
 * Tests for the main dashboard screen.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

import { ThemeProvider } from '@/src/state/theme';
import { SessionProvider } from '@/src/state/session';
import DashboardScreen from '@/app/(tabs)/index';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  }),
}));

// Mock haptics
jest.mock('@/src/utils/haptics', () => ({
  triggerHaptic: jest.fn(),
  triggerSelection: jest.fn(),
  triggerSuccess: jest.fn(),
}));

// Mock native modules
jest.mock('@/src/native/liveActivity', () => ({
  startLiveActivity: jest.fn(() => Promise.resolve()),
  updateLiveActivity: jest.fn(() => Promise.resolve()),
  endLiveActivity: jest.fn(() => Promise.resolve()),
  consumePendingAction: jest.fn(() => Promise.resolve(null)),
}));

// Wrapper component with all providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>{children}</SessionProvider>
    </ThemeProvider>
  );
}

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', async () => {
      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Dashboard')).toBeTruthy();
      });
    });

    it('displays the current date', async () => {
      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen />
        </TestWrapper>
      );

      // Check for date format (e.g., "Saturday, January 11")
      const dateRegex = /\w+, \w+ \d+/;
      await waitFor(() => {
        const texts = render(
          <TestWrapper>
            <DashboardScreen />
          </TestWrapper>
        ).toJSON();
        expect(texts).toBeTruthy();
      });
    });

    it('shows start quick focus button when no session', async () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <DashboardScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByLabelText('Start a quick focus session')).toBeTruthy();
      });
    });
  });

  describe('Stats Section', () => {
    it('displays XP stat card', async () => {
      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('XP Today')).toBeTruthy();
      });
    });

    it('displays streak stat card', async () => {
      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Streak')).toBeTruthy();
      });
    });

    it('displays tasks stat card', async () => {
      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Tasks')).toBeTruthy();
      });
    });
  });

  describe('Sections', () => {
    it('displays Today section', async () => {
      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Today')).toBeTruthy();
      });
    });

    it('displays Tasks section', async () => {
      const { getAllByText } = render(
        <TestWrapper>
          <DashboardScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        const tasksElements = getAllByText('Tasks');
        expect(tasksElements.length).toBeGreaterThan(0);
      });
    });

    it('shows empty state for events', async () => {
      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('No events logged today')).toBeTruthy();
      });
    });

    it('shows empty state for tasks', async () => {
      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('No upcoming tasks')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible header', async () => {
      const { getByRole } = render(
        <TestWrapper>
          <DashboardScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByRole('header')).toBeTruthy();
      });
    });

    it('start session button has accessibility hint', async () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <DashboardScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        const button = getByLabelText('Start a quick focus session');
        expect(button.props.accessibilityHint).toBe('Starts a 25 minute focus session');
      });
    });
  });

  describe('Interactions', () => {
    it('triggers haptic on start session', async () => {
      const { triggerHaptic } = require('@/src/utils/haptics');
      const { getByLabelText } = render(
        <TestWrapper>
          <DashboardScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByLabelText('Start a quick focus session')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByLabelText('Start a quick focus session'));
      });

      expect(triggerHaptic).toHaveBeenCalledWith('medium');
    });
  });
});
