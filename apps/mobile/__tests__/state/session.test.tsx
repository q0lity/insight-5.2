/**
 * Session State Tests
 *
 * Tests for the session provider and hooks.
 */
import React from 'react';
import { Text, Button, AppState } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

import { SessionProvider, useSession, type SessionStartInput, type ActiveSession } from '@/src/state/session';

// Mock native modules
jest.mock('@/src/native/liveActivity', () => ({
  startLiveActivity: jest.fn(() => Promise.resolve()),
  updateLiveActivity: jest.fn(() => Promise.resolve()),
  endLiveActivity: jest.fn(() => Promise.resolve()),
  consumePendingAction: jest.fn(() => Promise.resolve(null)),
}));

// Test component that uses session hook
function SessionConsumer({ onSession }: { onSession?: (session: ActiveSession | null) => void }) {
  const { active, startSession, stopSession, updateNotes, setLocked, updateMetrics } = useSession();

  React.useEffect(() => {
    onSession?.(active);
  }, [active, onSession]);

  return (
    <>
      <Text testID="hasActive">{active ? 'yes' : 'no'}</Text>
      <Text testID="title">{active?.title ?? 'none'}</Text>
      <Text testID="kind">{active?.kind ?? 'none'}</Text>
      <Text testID="locked">{active?.locked?.toString() ?? 'false'}</Text>
      <Text testID="notes">{active?.notes ?? ''}</Text>
      <Button
        testID="startButton"
        title="Start"
        onPress={() =>
          startSession({
            title: 'Test Session',
            kind: 'event',
          })
        }
      />
      <Button testID="stopButton" title="Stop" onPress={stopSession} />
      <Button testID="lockButton" title="Lock" onPress={() => setLocked(true)} />
      <Button testID="unlockButton" title="Unlock" onPress={() => setLocked(false)} />
      <Button testID="updateNotesButton" title="Update Notes" onPress={() => updateNotes('Updated notes')} />
      <Button testID="updateMetricsButton" title="Update Metrics" onPress={() => updateMetrics({ importance: 5 })} />
    </>
  );
}

describe('SessionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('starts with no active session', () => {
      const { getByTestId } = render(
        <SessionProvider>
          <SessionConsumer />
        </SessionProvider>
      );

      expect(getByTestId('hasActive').props.children).toBe('no');
    });

    it('shows no title when no session', () => {
      const { getByTestId } = render(
        <SessionProvider>
          <SessionConsumer />
        </SessionProvider>
      );

      expect(getByTestId('title').props.children).toBe('none');
    });
  });

  describe('Starting Sessions', () => {
    it('starts a new session', async () => {
      const { getByTestId } = render(
        <SessionProvider>
          <SessionConsumer />
        </SessionProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('startButton'));
      });

      await waitFor(() => {
        expect(getByTestId('hasActive').props.children).toBe('yes');
      });
    });

    it('sets session title', async () => {
      const { getByTestId } = render(
        <SessionProvider>
          <SessionConsumer />
        </SessionProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('startButton'));
      });

      await waitFor(() => {
        expect(getByTestId('title').props.children).toBe('Test Session');
      });
    });

    it('sets session kind', async () => {
      const { getByTestId } = render(
        <SessionProvider>
          <SessionConsumer />
        </SessionProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('startButton'));
      });

      await waitFor(() => {
        expect(getByTestId('kind').props.children).toBe('event');
      });
    });

    it('starts session unlocked', async () => {
      const { getByTestId } = render(
        <SessionProvider>
          <SessionConsumer />
        </SessionProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('startButton'));
      });

      await waitFor(() => {
        expect(getByTestId('locked').props.children).toBe('false');
      });
    });
  });

  describe('Stopping Sessions', () => {
    it('stops the active session', async () => {
      const { getByTestId } = render(
        <SessionProvider>
          <SessionConsumer />
        </SessionProvider>
      );

      // Start then stop
      await act(async () => {
        fireEvent.press(getByTestId('startButton'));
      });

      await waitFor(() => {
        expect(getByTestId('hasActive').props.children).toBe('yes');
      });

      await act(async () => {
        fireEvent.press(getByTestId('stopButton'));
      });

      await waitFor(() => {
        expect(getByTestId('hasActive').props.children).toBe('no');
      });
    });

    it('clears session data when stopped', async () => {
      const { getByTestId } = render(
        <SessionProvider>
          <SessionConsumer />
        </SessionProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('startButton'));
      });

      await waitFor(() => {
        expect(getByTestId('title').props.children).toBe('Test Session');
      });

      await act(async () => {
        fireEvent.press(getByTestId('stopButton'));
      });

      await waitFor(() => {
        expect(getByTestId('title').props.children).toBe('none');
      });
    });
  });

  describe('Locking Sessions', () => {
    it('can lock a session', async () => {
      const { getByTestId } = render(
        <SessionProvider>
          <SessionConsumer />
        </SessionProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('startButton'));
      });

      await waitFor(() => {
        expect(getByTestId('hasActive').props.children).toBe('yes');
      });

      await act(async () => {
        fireEvent.press(getByTestId('lockButton'));
      });

      await waitFor(() => {
        expect(getByTestId('locked').props.children).toBe('true');
      });
    });

    it('can unlock a session', async () => {
      const { getByTestId } = render(
        <SessionProvider>
          <SessionConsumer />
        </SessionProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('startButton'));
      });

      await act(async () => {
        fireEvent.press(getByTestId('lockButton'));
      });

      await waitFor(() => {
        expect(getByTestId('locked').props.children).toBe('true');
      });

      await act(async () => {
        fireEvent.press(getByTestId('unlockButton'));
      });

      await waitFor(() => {
        expect(getByTestId('locked').props.children).toBe('false');
      });
    });
  });

  describe('Updating Notes', () => {
    it('updates session notes', async () => {
      const { getByTestId } = render(
        <SessionProvider>
          <SessionConsumer />
        </SessionProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('startButton'));
      });

      await act(async () => {
        fireEvent.press(getByTestId('updateNotesButton'));
      });

      await waitFor(() => {
        expect(getByTestId('notes').props.children).toBe('Updated notes');
      });
    });

    it('does nothing when no active session', async () => {
      const { getByTestId } = render(
        <SessionProvider>
          <SessionConsumer />
        </SessionProvider>
      );

      // Try to update notes without an active session
      await act(async () => {
        fireEvent.press(getByTestId('updateNotesButton'));
      });

      expect(getByTestId('hasActive').props.children).toBe('no');
    });
  });
});

describe('useSession outside provider', () => {
  it('throws error when used outside SessionProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<SessionConsumer />);
    }).toThrow('useSession must be used within SessionProvider');

    consoleSpy.mockRestore();
  });
});
