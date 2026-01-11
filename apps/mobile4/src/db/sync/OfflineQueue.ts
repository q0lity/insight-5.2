/**
 * Offline Queue Manager - Handles offline operations with exponential backoff retry
 *
 * Features:
 * - Queues operations when offline
 * - Automatic retry with exponential backoff
 * - Persistence across app restarts
 * - Deduplication of operations
 */

import { Q } from '@nozbe/watermelondb';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

import { database, collections } from '../database';
import { TableNames, SyncStatus, type TableName } from '../schema';
import { SyncQueue, MAX_RETRIES } from '../models';
import { syncEngine } from './SyncEngine';

type QueueOperation = 'create' | 'update' | 'delete';

interface QueueItem {
  tableName: TableName;
  recordId: string;
  operation: QueueOperation;
  payload: Record<string, unknown>;
}

class OfflineQueueManager {
  private isOnline: boolean = true;
  private isProcessing: boolean = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private readonly RETRY_CHECK_INTERVAL_MS = 10000; // 10 seconds

  // Initialize the queue manager
  async initialize(): Promise<void> {
    // Subscribe to network state changes
    this.unsubscribeNetInfo = NetInfo.addEventListener(this.handleNetworkChange.bind(this));

    // Check initial network state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;

    // Start retry timer
    this.startRetryTimer();
  }

  // Cleanup
  destroy(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    this.stopRetryTimer();
  }

  // Handle network state changes
  private handleNetworkChange(state: NetInfoState): void {
    const wasOffline = !this.isOnline;
    this.isOnline = state.isConnected ?? false;

    // If we just came online, trigger processing
    if (wasOffline && this.isOnline) {
      console.log('[OfflineQueue] Network restored, processing queue');
      this.processQueue().catch((err) => {
        console.error('[OfflineQueue] Error processing queue:', err);
      });
    }
  }

  // Start the retry timer
  private startRetryTimer(): void {
    this.stopRetryTimer();
    this.retryTimer = setInterval(() => {
      if (this.isOnline) {
        this.processFailedItems().catch((err) => {
          console.error('[OfflineQueue] Error processing failed items:', err);
        });
      }
    }, this.RETRY_CHECK_INTERVAL_MS);
  }

  // Stop the retry timer
  private stopRetryTimer(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  // Check if we're online
  isNetworkAvailable(): boolean {
    return this.isOnline;
  }

  // Add item to the queue
  async enqueue(item: QueueItem): Promise<void> {
    // Check for existing item for the same record and operation
    const existing = await collections.syncQueue
      .query(
        Q.where('table_name', item.tableName),
        Q.where('record_id', item.recordId),
        Q.where('status', Q.oneOf(['pending', 'in_progress']))
      )
      .fetch();

    await database.write(async () => {
      if (existing.length > 0) {
        // Update existing queue item
        const existingItem = existing[0];

        // If the new operation is 'delete', it supersedes everything
        if (item.operation === 'delete') {
          await existingItem.update((record) => {
            record.operation = 'delete';
            record.payload = item.payload as any;
            record.status = 'pending';
            record.retryCount = 0;
            record.lastError = null;
            record.nextRetryAt = null;
          });
        } else if (existingItem.operation !== 'delete') {
          // Update the payload for create/update operations
          await existingItem.update((record) => {
            record.payload = { ...record.payload, ...item.payload } as any;
            record.status = 'pending';
          });
        }
      } else {
        // Create new queue item
        await collections.syncQueue.create((record) => {
          record.tableName = item.tableName;
          record.recordId = item.recordId;
          record.operation = item.operation;
          record.payload = item.payload as any;
          record.status = 'pending';
          record.retryCount = 0;
          record.lastError = null;
          record.nextRetryAt = null;
        });
      }
    });

    // If we're online, try to process immediately
    if (this.isOnline) {
      this.processQueue().catch((err) => {
        console.error('[OfflineQueue] Error processing queue:', err);
      });
    }
  }

  // Remove item from the queue
  async dequeue(tableName: TableName, recordId: string): Promise<void> {
    const items = await collections.syncQueue
      .query(Q.where('table_name', tableName), Q.where('record_id', recordId))
      .fetch();

    await database.write(async () => {
      for (const item of items) {
        await item.destroyPermanently();
      }
    });
  }

  // Get queue count by status
  async getQueueCounts(): Promise<{
    pending: number;
    inProgress: number;
    failed: number;
    total: number;
  }> {
    const [pending, inProgress, failed] = await Promise.all([
      collections.syncQueue.query(Q.where('status', 'pending')).fetchCount(),
      collections.syncQueue.query(Q.where('status', 'in_progress')).fetchCount(),
      collections.syncQueue.query(Q.where('status', 'failed')).fetchCount(),
    ]);

    return {
      pending,
      inProgress,
      failed,
      total: pending + inProgress + failed,
    };
  }

  // Get all failed items
  async getFailedItems(): Promise<SyncQueue[]> {
    return collections.syncQueue.query(Q.where('status', 'failed')).fetch();
  }

  // Process the entire queue
  async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0 };
    }

    if (!this.isOnline) {
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let failed = 0;

    try {
      // Get pending items
      const pendingItems = await collections.syncQueue
        .query(Q.where('status', 'pending'), Q.sortBy('created_at', Q.asc))
        .fetch();

      for (const item of pendingItems) {
        try {
          await item.markInProgress();
          await this.processItem(item);
          await item.markCompleted();
          processed++;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          await item.markFailed(message);
          failed++;
        }
      }

      // Also trigger sync engine
      await syncEngine.sync();

      return { processed, failed };
    } finally {
      this.isProcessing = false;
    }
  }

  // Process failed items that are ready for retry
  private async processFailedItems(): Promise<void> {
    if (this.isProcessing) return;

    const now = Date.now();
    const readyItems = await collections.syncQueue
      .query(
        Q.where('status', 'failed'),
        Q.where('retry_count', Q.lt(MAX_RETRIES)),
        Q.or(Q.where('next_retry_at', null), Q.where('next_retry_at', Q.lte(now)))
      )
      .fetch();

    if (readyItems.length === 0) return;

    this.isProcessing = true;

    try {
      for (const item of readyItems) {
        try {
          await item.resetForRetry();
          await item.markInProgress();
          await this.processItem(item);
          await item.markCompleted();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          await item.markFailed(message);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Process a single queue item
  private async processItem(item: SyncQueue): Promise<void> {
    // The actual processing is handled by the sync engine
    // This is a placeholder for custom processing logic
    console.log(
      `[OfflineQueue] Processing: ${item.operation} on ${item.tableName}/${item.recordId}`
    );
  }

  // Clear all completed items
  async clearCompleted(): Promise<number> {
    const completed = await collections.syncQueue.query(Q.where('status', 'completed')).fetch();

    let count = 0;
    await database.write(async () => {
      for (const item of completed) {
        await item.destroyPermanently();
        count++;
      }
    });

    return count;
  }

  // Clear all failed items that have exceeded max retries
  async clearMaxRetryItems(): Promise<number> {
    const failed = await collections.syncQueue
      .query(Q.where('status', 'failed'), Q.where('retry_count', Q.gte(MAX_RETRIES)))
      .fetch();

    let count = 0;
    await database.write(async () => {
      for (const item of failed) {
        await item.destroyPermanently();
        count++;
      }
    });

    return count;
  }

  // Retry all failed items immediately
  async retryAllFailed(): Promise<void> {
    const failed = await collections.syncQueue
      .query(Q.where('status', 'failed'), Q.where('retry_count', Q.lt(MAX_RETRIES)))
      .fetch();

    await database.write(async () => {
      for (const item of failed) {
        await item.resetForRetry();
      }
    });

    // Trigger processing
    await this.processQueue();
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueueManager();

// Helper function to queue a record change
export async function queueRecordChange(
  tableName: TableName,
  recordId: string,
  operation: QueueOperation,
  payload: Record<string, unknown>
): Promise<void> {
  await offlineQueue.enqueue({
    tableName,
    recordId,
    operation,
    payload,
  });
}

// Helper to check if we need to queue (offline) or can sync directly
export function shouldQueueOperation(): boolean {
  return !offlineQueue.isNetworkAvailable();
}
