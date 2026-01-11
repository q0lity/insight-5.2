/**
 * iOS Live Activity Integration
 *
 * Provides a bridge to the native iOS Live Activity module for displaying
 * active session information on the lock screen and Dynamic Island.
 *
 * This module is iOS-only and gracefully no-ops on other platforms.
 */
import { NativeModules, Platform } from 'react-native';

export type LiveActivityPayload = {
  title: string;
  startedAt: number;
  remainingSeconds?: number | null;
  trackerKey?: string | null;
};

export type PendingActionPayload = {
  action: 'start' | 'stop';
  title?: string;
  timestamp?: number;
};

const NativeLiveActivity = NativeModules.LiveActivityModule as {
  start?: (payload: LiveActivityPayload) => Promise<void> | void;
  update?: (payload: Partial<LiveActivityPayload>) => Promise<void> | void;
  end?: () => Promise<void> | void;
  consumePendingAction?: () => Promise<PendingActionPayload | null> | PendingActionPayload | null;
} | null;

/**
 * Start a Live Activity showing the current session
 */
export async function startLiveActivity(payload: LiveActivityPayload): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (NativeLiveActivity?.start) {
    await NativeLiveActivity.start(payload);
  }
}

/**
 * Update the running Live Activity with new information
 */
export async function updateLiveActivity(payload: Partial<LiveActivityPayload>): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (NativeLiveActivity?.update) {
    await NativeLiveActivity.update(payload);
  }
}

/**
 * End the current Live Activity
 */
export async function endLiveActivity(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (NativeLiveActivity?.end) {
    await NativeLiveActivity.end();
  }
}

/**
 * Consume any pending action from the Live Activity widget
 * (e.g., user pressed Start/Stop on the lock screen)
 */
export async function consumePendingAction(): Promise<PendingActionPayload | null> {
  if (Platform.OS !== 'ios') return null;
  if (!NativeLiveActivity?.consumePendingAction) return null;
  const result = await NativeLiveActivity.consumePendingAction();
  if (!result || typeof result !== 'object') return null;
  return result;
}
