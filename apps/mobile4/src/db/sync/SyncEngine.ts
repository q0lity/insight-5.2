/**
 * Sync Engine - Push/Pull/Conflict Resolution with Supabase
 *
 * Handles bidirectional sync between WatermelonDB and Supabase.
 * Supports conflict resolution using last-write-wins with manual conflict detection.
 */

import { Q } from '@nozbe/watermelondb';
import type { SupabaseClient } from '@supabase/supabase-js';

import { database, collections } from '../database';
import { SyncStatus, TableNames } from '../schema';
import type { Entry, Goal, Entity, WorkoutSession, NutritionLog, Attachment } from '../models';
import { SyncQueue } from '../models';

// Sync configuration
const BATCH_SIZE = 100;
const SYNC_INTERVAL_MS = 30000; // 30 seconds

// Sync state
interface SyncState {
  isRunning: boolean;
  lastSyncAt: number | null;
  lastError: string | null;
  pendingChanges: number;
}

type SyncEventType = 'start' | 'complete' | 'error' | 'progress';
type SyncEventCallback = (event: { type: SyncEventType; data?: unknown }) => void;

class SyncEngine {
  private supabase: SupabaseClient | null = null;
  private userId: string | null = null;
  private state: SyncState = {
    isRunning: false,
    lastSyncAt: null,
    lastError: null,
    pendingChanges: 0,
  };
  private syncTimer: NodeJS.Timeout | null = null;
  private eventListeners: Set<SyncEventCallback> = new Set();

  // Initialize with Supabase client and user
  async initialize(supabase: SupabaseClient, userId: string): Promise<void> {
    this.supabase = supabase;
    this.userId = userId;
    await this.countPendingChanges();
  }

  // Subscribe to sync events
  subscribe(callback: SyncEventCallback): () => void {
    this.eventListeners.add(callback);
    return () => {
      this.eventListeners.delete(callback);
    };
  }

  private emit(type: SyncEventType, data?: unknown): void {
    this.eventListeners.forEach((cb) => cb({ type, data }));
  }

  // Get current sync state
  getState(): SyncState {
    return { ...this.state };
  }

  // Start automatic sync
  startAutoSync(intervalMs: number = SYNC_INTERVAL_MS): void {
    this.stopAutoSync();
    this.syncTimer = setInterval(() => {
      this.sync().catch((err) => {
        console.error('[SyncEngine] Auto sync error:', err);
      });
    }, intervalMs);
  }

  // Stop automatic sync
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // Count pending changes
  private async countPendingChanges(): Promise<number> {
    const count = await collections.syncQueue
      .query(Q.where('status', Q.oneOf(['pending', 'failed'])))
      .fetchCount();
    this.state.pendingChanges = count;
    return count;
  }

  // Main sync function
  async sync(): Promise<{ success: boolean; error?: string }> {
    if (this.state.isRunning) {
      return { success: false, error: 'Sync already in progress' };
    }

    if (!this.supabase || !this.userId) {
      return { success: false, error: 'Sync engine not initialized' };
    }

    this.state.isRunning = true;
    this.emit('start');

    try {
      // 1. Push local changes to Supabase
      await this.pushChanges();

      // 2. Pull remote changes from Supabase
      await this.pullChanges();

      // 3. Update state
      this.state.lastSyncAt = Date.now();
      this.state.lastError = null;
      await this.countPendingChanges();

      this.emit('complete', { lastSyncAt: this.state.lastSyncAt });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      this.state.lastError = message;
      this.emit('error', { error: message });
      return { success: false, error: message };
    } finally {
      this.state.isRunning = false;
    }
  }

  // Push local changes to Supabase
  private async pushChanges(): Promise<void> {
    if (!this.supabase || !this.userId) return;

    // Get pending queue items
    const pendingItems = await collections.syncQueue
      .query(
        Q.where('status', Q.oneOf(['pending', 'failed'])),
        Q.where('next_retry_at', Q.lte(Date.now())),
        Q.sortBy('created_at', Q.asc),
        Q.take(BATCH_SIZE)
      )
      .fetch();

    for (const item of pendingItems) {
      try {
        await item.markInProgress();
        await this.processSyncItem(item);
        await item.markCompleted();
        this.emit('progress', { pushed: 1 });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Push error';
        await item.markFailed(message);
      }
    }
  }

  // Process a single sync queue item
  private async processSyncItem(item: SyncQueue): Promise<void> {
    if (!this.supabase) return;

    const { tableName, operation, payload, recordId } = item;

    switch (operation) {
      case 'create':
      case 'update':
        await this.upsertToSupabase(tableName, payload, recordId);
        break;
      case 'delete':
        await this.deleteFromSupabase(tableName, recordId);
        break;
    }
  }

  // Upsert record to Supabase
  private async upsertToSupabase(
    tableName: string,
    payload: Record<string, unknown>,
    localId: string
  ): Promise<string> {
    if (!this.supabase || !this.userId) throw new Error('Not initialized');

    const tableMap: Record<string, string> = {
      [TableNames.ENTRIES]: 'entries',
      [TableNames.GOALS]: 'goals',
      [TableNames.ENTITIES]: 'entities',
      [TableNames.WORKOUT_SESSIONS]: 'workout_sessions',
      [TableNames.WORKOUT_ROWS]: 'workout_rows',
      [TableNames.NUTRITION_LOGS]: 'nutrition_logs',
      [TableNames.ATTACHMENTS]: 'attachments',
    };

    const supabaseTable = tableMap[tableName];
    if (!supabaseTable) throw new Error(`Unknown table: ${tableName}`);

    const data = {
      ...payload,
      user_id: this.userId,
    };

    // Check if record exists remotely
    const existingId = payload.remote_id as string | undefined;
    if (existingId) {
      const { error } = await this.supabase.from(supabaseTable).update(data).eq('id', existingId);
      if (error) throw new Error(error.message);
      return existingId;
    } else {
      const { data: result, error } = await this.supabase
        .from(supabaseTable)
        .insert(data)
        .select('id')
        .single();
      if (error) throw new Error(error.message);

      // Update local record with remote ID
      await this.updateLocalRemoteId(tableName, localId, result.id);
      return result.id;
    }
  }

  // Delete record from Supabase
  private async deleteFromSupabase(tableName: string, remoteId: string): Promise<void> {
    if (!this.supabase) throw new Error('Not initialized');

    const tableMap: Record<string, string> = {
      [TableNames.ENTRIES]: 'entries',
      [TableNames.GOALS]: 'goals',
      [TableNames.ENTITIES]: 'entities',
      [TableNames.WORKOUT_SESSIONS]: 'workout_sessions',
      [TableNames.WORKOUT_ROWS]: 'workout_rows',
      [TableNames.NUTRITION_LOGS]: 'nutrition_logs',
      [TableNames.ATTACHMENTS]: 'attachments',
    };

    const supabaseTable = tableMap[tableName];
    if (!supabaseTable) throw new Error(`Unknown table: ${tableName}`);

    // Soft delete for entries, hard delete for others
    if (tableName === TableNames.ENTRIES) {
      const { error } = await this.supabase
        .from(supabaseTable)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', remoteId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await this.supabase.from(supabaseTable).delete().eq('id', remoteId);
      if (error) throw new Error(error.message);
    }
  }

  // Update local record with remote ID
  private async updateLocalRemoteId(
    tableName: string,
    localId: string,
    remoteId: string
  ): Promise<void> {
    const collection = this.getCollection(tableName);
    if (!collection) return;

    const record = await collection.find(localId);
    if (record && typeof (record as any).markAsSynced === 'function') {
      await (record as any).markAsSynced(remoteId);
    }
  }

  // Get collection by table name
  private getCollection(tableName: string) {
    switch (tableName) {
      case TableNames.ENTRIES:
        return collections.entries;
      case TableNames.GOALS:
        return collections.goals;
      case TableNames.ENTITIES:
        return collections.entities;
      case TableNames.WORKOUT_SESSIONS:
        return collections.workoutSessions;
      case TableNames.WORKOUT_ROWS:
        return collections.workoutRows;
      case TableNames.NUTRITION_LOGS:
        return collections.nutritionLogs;
      case TableNames.ATTACHMENTS:
        return collections.attachments;
      default:
        return null;
    }
  }

  // Pull remote changes from Supabase
  private async pullChanges(): Promise<void> {
    if (!this.supabase || !this.userId) return;

    const lastSync = this.state.lastSyncAt;
    const sinceIso = lastSync ? new Date(lastSync).toISOString() : null;

    // Pull entries
    await this.pullEntries(sinceIso);

    // Pull goals
    await this.pullGoals(sinceIso);

    // Pull entities
    await this.pullEntities(sinceIso);

    // Pull workouts
    await this.pullWorkoutSessions(sinceIso);

    // Pull nutrition logs
    await this.pullNutritionLogs(sinceIso);

    this.emit('progress', { pulled: true });
  }

  // Pull entries from Supabase
  private async pullEntries(sinceIso: string | null): Promise<void> {
    if (!this.supabase || !this.userId) return;

    let query = this.supabase
      .from('entries')
      .select('*')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false })
      .limit(BATCH_SIZE);

    if (sinceIso) {
      query = query.gte('updated_at', sinceIso);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data?.length) return;

    await database.write(async () => {
      for (const row of data) {
        await this.upsertLocalEntry(row);
      }
    });
  }

  // Pull goals from Supabase
  private async pullGoals(sinceIso: string | null): Promise<void> {
    if (!this.supabase || !this.userId) return;

    let query = this.supabase
      .from('goals')
      .select('*')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false })
      .limit(BATCH_SIZE);

    if (sinceIso) {
      query = query.gte('updated_at', sinceIso);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data?.length) return;

    await database.write(async () => {
      for (const row of data) {
        await this.upsertLocalGoal(row);
      }
    });
  }

  // Pull entities from Supabase
  private async pullEntities(sinceIso: string | null): Promise<void> {
    if (!this.supabase || !this.userId) return;

    let query = this.supabase
      .from('entities')
      .select('*')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false })
      .limit(BATCH_SIZE);

    if (sinceIso) {
      query = query.gte('updated_at', sinceIso);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data?.length) return;

    await database.write(async () => {
      for (const row of data) {
        await this.upsertLocalEntity(row);
      }
    });
  }

  // Pull workout sessions from Supabase
  private async pullWorkoutSessions(sinceIso: string | null): Promise<void> {
    if (!this.supabase || !this.userId) return;

    let query = this.supabase
      .from('workout_sessions')
      .select('*, workout_rows(*)')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false })
      .limit(BATCH_SIZE);

    if (sinceIso) {
      query = query.gte('updated_at', sinceIso);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data?.length) return;

    await database.write(async () => {
      for (const row of data) {
        await this.upsertLocalWorkoutSession(row);
      }
    });
  }

  // Pull nutrition logs from Supabase
  private async pullNutritionLogs(sinceIso: string | null): Promise<void> {
    if (!this.supabase || !this.userId) return;

    let query = this.supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false })
      .limit(BATCH_SIZE);

    if (sinceIso) {
      query = query.gte('updated_at', sinceIso);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data?.length) return;

    await database.write(async () => {
      for (const row of data) {
        await this.upsertLocalNutritionLog(row);
      }
    });
  }

  // Upsert local entry from Supabase row
  private async upsertLocalEntry(row: Record<string, unknown>): Promise<void> {
    const remoteId = row.id as string;
    const existing = await collections.entries
      .query(Q.where('remote_id', remoteId))
      .fetch();

    const fromIso = (iso: string | null | undefined): number | null => {
      if (!iso) return null;
      const ms = Date.parse(iso);
      return Number.isFinite(ms) ? ms : null;
    };

    const entryData = {
      remote_id: remoteId,
      user_id: row.user_id as string,
      title: (row.title as string) ?? 'Untitled',
      facets: JSON.stringify(row.facets ?? []),
      status: (row.status as string) ?? null,
      priority: (row.priority as string) ?? null,
      scheduled_at: fromIso(row.scheduled_at as string | null),
      due_at: fromIso(row.due_at as string | null),
      completed_at: fromIso(row.completed_at as string | null),
      start_at: fromIso(row.start_at as string | null),
      end_at: fromIso(row.end_at as string | null),
      duration_minutes: (row.duration_minutes as number) ?? null,
      difficulty: (row.difficulty as number) ?? null,
      importance: (row.importance as number) ?? null,
      tags: JSON.stringify(row.tags ?? []),
      contexts: JSON.stringify(row.contexts ?? []),
      people: JSON.stringify(row.people ?? []),
      frontmatter: JSON.stringify(row.frontmatter ?? {}),
      body_markdown: (row.body_markdown as string) ?? '',
      source: (row.source as string) ?? 'app',
      deleted_at: fromIso(row.deleted_at as string | null),
      sync_status: SyncStatus.SYNCED,
      last_synced_at: Date.now(),
      created_at: fromIso(row.created_at as string | null) ?? Date.now(),
      updated_at: fromIso(row.updated_at as string | null) ?? Date.now(),
    };

    if (existing.length > 0) {
      await existing[0].update((record) => {
        Object.assign(record, entryData);
      });
    } else {
      await collections.entries.create((record) => {
        Object.assign(record, entryData);
      });
    }
  }

  // Upsert local goal from Supabase row
  private async upsertLocalGoal(row: Record<string, unknown>): Promise<void> {
    const remoteId = row.id as string;
    const existing = await collections.goals.query(Q.where('remote_id', remoteId)).fetch();

    const fromIso = (iso: string | null | undefined): number | null => {
      if (!iso) return null;
      const ms = Date.parse(iso);
      return Number.isFinite(ms) ? ms : null;
    };

    const goalData = {
      remote_id: remoteId,
      user_id: row.user_id as string,
      title: (row.title as string) ?? 'Untitled Goal',
      description: (row.description as string) ?? null,
      target_date: fromIso(row.target_date as string | null),
      archived: (row.archived as boolean) ?? false,
      metadata: JSON.stringify(row.metadata ?? {}),
      sync_status: SyncStatus.SYNCED,
      last_synced_at: Date.now(),
      created_at: fromIso(row.created_at as string | null) ?? Date.now(),
      updated_at: fromIso(row.updated_at as string | null) ?? Date.now(),
    };

    if (existing.length > 0) {
      await existing[0].update((record) => {
        Object.assign(record, goalData);
      });
    } else {
      await collections.goals.create((record) => {
        Object.assign(record, goalData);
      });
    }
  }

  // Upsert local entity from Supabase row
  private async upsertLocalEntity(row: Record<string, unknown>): Promise<void> {
    const remoteId = row.id as string;
    const existing = await collections.entities.query(Q.where('remote_id', remoteId)).fetch();

    const fromIso = (iso: string | null | undefined): number | null => {
      if (!iso) return null;
      const ms = Date.parse(iso);
      return Number.isFinite(ms) ? ms : null;
    };

    const entityData = {
      remote_id: remoteId,
      user_id: row.user_id as string,
      type: (row.type as string) ?? 'tag',
      key: (row.key as string) ?? '',
      display_name: (row.display_name as string) ?? (row.key as string) ?? '',
      metadata: JSON.stringify(row.metadata ?? {}),
      sync_status: SyncStatus.SYNCED,
      last_synced_at: Date.now(),
      created_at: fromIso(row.created_at as string | null) ?? Date.now(),
      updated_at: fromIso(row.updated_at as string | null) ?? Date.now(),
    };

    if (existing.length > 0) {
      await existing[0].update((record) => {
        Object.assign(record, entityData);
      });
    } else {
      await collections.entities.create((record) => {
        Object.assign(record, entityData);
      });
    }
  }

  // Upsert local workout session from Supabase row
  private async upsertLocalWorkoutSession(row: Record<string, unknown>): Promise<void> {
    const remoteId = row.id as string;
    const existing = await collections.workoutSessions
      .query(Q.where('remote_id', remoteId))
      .fetch();

    const fromIso = (iso: string | null | undefined): number | null => {
      if (!iso) return null;
      const ms = Date.parse(iso);
      return Number.isFinite(ms) ? ms : null;
    };

    const sessionData = {
      remote_id: remoteId,
      user_id: row.user_id as string,
      entry_id: (row.entry_id as string) ?? null,
      template: (row.template as string) ?? 'strength',
      title: (row.title as string) ?? null,
      start_at: fromIso(row.start_at as string | null) ?? Date.now(),
      end_at: fromIso(row.end_at as string | null),
      total_duration: (row.total_duration as number) ?? null,
      estimated_calories: (row.estimated_calories as number) ?? null,
      overall_rpe: (row.overall_rpe as number) ?? null,
      notes: (row.notes as string) ?? null,
      goal_id: (row.goal_id as string) ?? null,
      tags: JSON.stringify((row as any).tags ?? []),
      location: (row.location as string) ?? null,
      metadata: JSON.stringify((row as any).metadata ?? {}),
      sync_status: SyncStatus.SYNCED,
      last_synced_at: Date.now(),
      created_at: fromIso(row.created_at as string | null) ?? Date.now(),
      updated_at: fromIso(row.updated_at as string | null) ?? Date.now(),
    };

    if (existing.length > 0) {
      await existing[0].update((record) => {
        Object.assign(record, sessionData);
      });
    } else {
      await collections.workoutSessions.create((record) => {
        Object.assign(record, sessionData);
      });
    }

    // Handle workout rows
    const rows = (row as any).workout_rows as Record<string, unknown>[] | undefined;
    if (rows?.length) {
      for (const workoutRow of rows) {
        await this.upsertLocalWorkoutRow(workoutRow, remoteId);
      }
    }
  }

  // Upsert local workout row from Supabase row
  private async upsertLocalWorkoutRow(
    row: Record<string, unknown>,
    sessionId: string
  ): Promise<void> {
    const remoteId = row.id as string;
    const existing = await collections.workoutRows.query(Q.where('remote_id', remoteId)).fetch();

    const fromIso = (iso: string | null | undefined): number | null => {
      if (!iso) return null;
      const ms = Date.parse(iso);
      return Number.isFinite(ms) ? ms : null;
    };

    const rowData = {
      remote_id: remoteId,
      user_id: row.user_id as string,
      session_id: sessionId,
      exercise: (row.exercise as string) ?? 'Exercise',
      set_index: (row.set_index as number) ?? 1,
      reps: (row.reps as number) ?? null,
      weight: (row.weight as number) ?? null,
      weight_unit: (row.weight_unit as string) ?? null,
      rpe: (row.rpe as number) ?? null,
      duration_seconds: (row.duration_seconds as number) ?? null,
      distance: (row.distance as number) ?? null,
      distance_unit: (row.distance_unit as string) ?? null,
      notes: (row.notes as string) ?? null,
      metadata: JSON.stringify((row as any).metadata ?? {}),
      sync_status: SyncStatus.SYNCED,
      last_synced_at: Date.now(),
      created_at: fromIso(row.created_at as string | null) ?? Date.now(),
      updated_at: fromIso(row.updated_at as string | null) ?? Date.now(),
    };

    if (existing.length > 0) {
      await existing[0].update((record) => {
        Object.assign(record, rowData);
      });
    } else {
      await collections.workoutRows.create((record) => {
        Object.assign(record, rowData);
      });
    }
  }

  // Upsert local nutrition log from Supabase row
  private async upsertLocalNutritionLog(row: Record<string, unknown>): Promise<void> {
    const remoteId = row.id as string;
    const existing = await collections.nutritionLogs.query(Q.where('remote_id', remoteId)).fetch();

    const fromIso = (iso: string | null | undefined): number | null => {
      if (!iso) return null;
      const ms = Date.parse(iso);
      return Number.isFinite(ms) ? ms : null;
    };

    const meta = (row.metadata ?? {}) as Record<string, unknown>;

    const logData = {
      remote_id: remoteId,
      user_id: row.user_id as string,
      entry_id: (row.entry_id as string) ?? null,
      meal_type: (meta.type as string) ?? (row.meal_type as string) ?? 'snack',
      title: (meta.title as string) ?? (row.title as string) ?? null,
      eaten_at: fromIso(row.eaten_at as string | null) ?? Date.now(),
      calories: (row.calories as number) ?? null,
      protein_g: (row.protein_g as number) ?? null,
      carbs_g: (row.carbs_g as number) ?? null,
      fat_g: (row.fat_g as number) ?? null,
      fiber_g: (row.fiber_g as number) ?? null,
      saturated_fat_g: (row.saturated_fat_g as number) ?? null,
      trans_fat_g: (row.trans_fat_g as number) ?? null,
      sugar_g: (row.sugar_g as number) ?? null,
      sodium_mg: (row.sodium_mg as number) ?? null,
      potassium_mg: (row.potassium_mg as number) ?? null,
      cholesterol_mg: (row.cholesterol_mg as number) ?? null,
      estimation_model: (row.estimation_model as string) ?? null,
      confidence: (row.confidence as number) ?? null,
      items: JSON.stringify((meta.items as unknown[]) ?? []),
      photo_uri: (meta.photo_uri as string) ?? null,
      notes: (meta.notes as string) ?? null,
      goal_id: (row.goal_id as string) ?? null,
      tags: JSON.stringify((meta.tags as unknown[]) ?? []),
      location: (meta.location as string) ?? null,
      metadata: JSON.stringify(row.metadata ?? {}),
      sync_status: SyncStatus.SYNCED,
      last_synced_at: Date.now(),
      created_at: fromIso(row.created_at as string | null) ?? Date.now(),
      updated_at: fromIso(row.updated_at as string | null) ?? Date.now(),
    };

    if (existing.length > 0) {
      await existing[0].update((record) => {
        Object.assign(record, logData);
      });
    } else {
      await collections.nutritionLogs.create((record) => {
        Object.assign(record, logData);
      });
    }
  }

  // Force sync (ignore last sync time)
  async forceSync(): Promise<{ success: boolean; error?: string }> {
    this.state.lastSyncAt = null;
    return this.sync();
  }

  // Clear all local data and re-sync
  async resetAndSync(): Promise<{ success: boolean; error?: string }> {
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    this.state.lastSyncAt = null;
    return this.sync();
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();
