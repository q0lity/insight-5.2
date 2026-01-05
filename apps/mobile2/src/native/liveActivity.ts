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

export async function startLiveActivity(_payload: LiveActivityPayload) {
  if (Platform.OS !== 'ios') return;
  if (NativeLiveActivity?.start) {
    await NativeLiveActivity.start(_payload);
  }
}

export async function updateLiveActivity(_payload: Partial<LiveActivityPayload>) {
  if (Platform.OS !== 'ios') return;
  if (NativeLiveActivity?.update) {
    await NativeLiveActivity.update(_payload);
  }
}

export async function endLiveActivity() {
  if (Platform.OS !== 'ios') return;
  if (NativeLiveActivity?.end) {
    await NativeLiveActivity.end();
  }
}

export async function consumePendingAction(): Promise<PendingActionPayload | null> {
  if (Platform.OS !== 'ios') return null;
  if (!NativeLiveActivity?.consumePendingAction) return null;
  const result = await NativeLiveActivity.consumePendingAction();
  if (!result || typeof result !== 'object') return null;
  return result;
}
