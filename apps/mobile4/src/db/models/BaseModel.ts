/**
 * Base Model for WatermelonDB with sync support
 */

import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, json } from '@nozbe/watermelondb/decorators';

import { SyncStatus, type SyncStatusType } from '../schema';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const sanitizeJson = (raw: JsonValue): JsonValue => {
  if (raw === null || raw === undefined) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return raw;
  return raw;
};

export abstract class SyncableModel extends Model {
  @field('remote_id') remoteId!: string | null;
  @field('user_id') userId!: string;
  @field('sync_status') syncStatus!: SyncStatusType;
  @field('last_synced_at') lastSyncedAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  get isPending(): boolean {
    return this.syncStatus === SyncStatus.PENDING;
  }

  get isSynced(): boolean {
    return this.syncStatus === SyncStatus.SYNCED;
  }

  get hasConflict(): boolean {
    return this.syncStatus === SyncStatus.CONFLICT;
  }

  get needsSync(): boolean {
    return this.syncStatus !== SyncStatus.SYNCED;
  }

  async markAsSynced(remoteId: string): Promise<void> {
    await this.update((record) => {
      (record as any).remoteId = remoteId;
      (record as any).syncStatus = SyncStatus.SYNCED;
      (record as any).lastSyncedAt = Date.now();
    });
  }

  async markAsPending(): Promise<void> {
    await this.update((record) => {
      (record as any).syncStatus = SyncStatus.PENDING;
    });
  }

  async markAsConflict(): Promise<void> {
    await this.update((record) => {
      (record as any).syncStatus = SyncStatus.CONFLICT;
    });
  }
}

// Helper for JSON array fields
export const jsonArrayDecorator = json('', sanitizeJson);

// Helper to parse JSON safely
export function safeParseJson<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
}

// Helper to stringify JSON safely
export function safeStringifyJson(value: unknown): string {
  if (value === null || value === undefined) return '[]';
  try {
    return JSON.stringify(value);
  } catch {
    return '[]';
  }
}
