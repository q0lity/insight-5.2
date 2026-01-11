import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@/src/supabase/client';

export type SyncOperation = {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
};

const SYNC_QUEUE_KEY = '@insight/syncQueue';
const MAX_RETRIES = 3;

// Load pending operations from storage
async function loadSyncQueue(): Promise<SyncOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SyncOperation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Save sync queue to storage
async function saveSyncQueue(queue: SyncOperation[]) {
  try {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[SyncQueue] Failed to save queue:', err);
  }
}

// Add operation to sync queue
export async function queueOperation(op: Omit<SyncOperation, 'id' | 'createdAt' | 'retryCount'>) {
  const queue = await loadSyncQueue();
  const operation: SyncOperation = {
    ...op,
    id: `sync_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: Date.now(),
    retryCount: 0,
  };
  queue.push(operation);
  await saveSyncQueue(queue);
  return operation;
}

// Process a single operation
async function processOperation(op: SyncOperation): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    let result;
    switch (op.operation) {
      case 'insert':
        result = await supabase.from(op.table).insert(op.payload);
        break;
      case 'update':
        const { id, ...updatePayload } = op.payload;
        result = await supabase.from(op.table).update(updatePayload).eq('id', id);
        break;
      case 'delete':
        result = await supabase.from(op.table).delete().eq('id', op.payload.id);
        break;
    }

    if (result?.error) {
      console.warn(`[SyncQueue] Operation ${op.id} failed:`, result.error.message);
      return false;
    }

    console.log(`[SyncQueue] Operation ${op.id} succeeded`);
    return true;
  } catch (err) {
    console.warn(`[SyncQueue] Operation ${op.id} threw:`, err);
    return false;
  }
}

// Process all pending operations
export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log('[SyncQueue] No supabase client, skipping sync');
    return { processed: 0, failed: 0 };
  }

  const queue = await loadSyncQueue();
  if (queue.length === 0) {
    return { processed: 0, failed: 0 };
  }

  console.log(`[SyncQueue] Processing ${queue.length} pending operations`);

  const remaining: SyncOperation[] = [];
  let processed = 0;
  let failed = 0;

  for (const op of queue) {
    const success = await processOperation(op);
    if (success) {
      processed++;
    } else {
      op.retryCount++;
      if (op.retryCount < MAX_RETRIES) {
        remaining.push(op);
      } else {
        console.warn(`[SyncQueue] Operation ${op.id} exceeded max retries, dropping`);
        failed++;
      }
    }
  }

  await saveSyncQueue(remaining);
  console.log(`[SyncQueue] Completed: ${processed} processed, ${failed} dropped, ${remaining.length} pending`);
  return { processed, failed };
}

// Get queue status
export async function getSyncQueueStatus(): Promise<{ pending: number; oldestAt: number | null }> {
  const queue = await loadSyncQueue();
  return {
    pending: queue.length,
    oldestAt: queue.length > 0 ? Math.min(...queue.map((op) => op.createdAt)) : null,
  };
}

// Clear the sync queue (use with caution)
export async function clearSyncQueue() {
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
  console.log('[SyncQueue] Queue cleared');
}
