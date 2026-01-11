/**
 * Sync Queue Model - Offline operation queue with retry logic
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, json, readonly, date } from '@nozbe/watermelondb/decorators';

import { TableNames } from '../schema';

type SyncOperation = 'create' | 'update' | 'delete';
type QueueStatus = 'pending' | 'in_progress' | 'failed' | 'completed';

const sanitizePayload = (raw: unknown): Record<string, unknown> => {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
};

// Exponential backoff configuration
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 10;
const BACKOFF_MULTIPLIER = 2;

export class SyncQueue extends Model {
  static table = TableNames.SYNC_QUEUE;

  @field('table_name') tableName!: string;
  @field('record_id') recordId!: string;
  @field('operation') operation!: SyncOperation;
  @json('payload', sanitizePayload) payload!: Record<string, unknown>;
  @field('status') status!: QueueStatus;
  @field('retry_count') retryCount!: number;
  @text('last_error') lastError!: string | null;
  @field('next_retry_at') nextRetryAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  get isPending(): boolean {
    return this.status === 'pending';
  }

  get isInProgress(): boolean {
    return this.status === 'in_progress';
  }

  get isFailed(): boolean {
    return this.status === 'failed';
  }

  get isCompleted(): boolean {
    return this.status === 'completed';
  }

  get canRetry(): boolean {
    return this.retryCount < MAX_RETRIES;
  }

  get shouldRetryNow(): boolean {
    if (!this.canRetry) return false;
    if (this.status !== 'failed') return false;
    if (!this.nextRetryAt) return true;
    return Date.now() >= this.nextRetryAt;
  }

  // Calculate next retry delay using exponential backoff
  static calculateNextRetryDelay(retryCount: number): number {
    const delay = INITIAL_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount);
    return Math.min(delay, MAX_RETRY_DELAY_MS);
  }

  async markInProgress(): Promise<void> {
    await this.update((record) => {
      record.status = 'in_progress';
    });
  }

  async markCompleted(): Promise<void> {
    await this.update((record) => {
      record.status = 'completed';
    });
  }

  async markFailed(error: string): Promise<void> {
    const nextRetryDelay = SyncQueue.calculateNextRetryDelay(this.retryCount);
    await this.update((record) => {
      record.status = 'failed';
      record.lastError = error;
      record.retryCount = (record.retryCount ?? 0) + 1;
      record.nextRetryAt = Date.now() + nextRetryDelay;
    });
  }

  async resetForRetry(): Promise<void> {
    await this.update((record) => {
      record.status = 'pending';
      record.nextRetryAt = null;
    });
  }
}

export { MAX_RETRIES, INITIAL_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS };
