// Stub for iOS Live Activity support
// Will be implemented with native modules for iOS

export interface LiveActivityData {
  title: string;
  subtitle?: string;
  progress?: number;
  endTime?: Date;
}

export async function startLiveActivity(data: LiveActivityData): Promise<string | null> {
  console.log('[Live Activity] Start:', data.title);
  return null; // No-op on web
}

export async function updateLiveActivity(id: string, data: Partial<LiveActivityData>): Promise<void> {
  console.log('[Live Activity] Update:', id, data);
}

export async function endLiveActivity(id: string): Promise<void> {
  console.log('[Live Activity] End:', id);
}

export async function endAllLiveActivities(): Promise<void> {
  console.log('[Live Activity] End all');
}

export async function consumePendingAction(): Promise<{ action: 'start' | 'stop'; title?: string } | null> {
  return null;
}
