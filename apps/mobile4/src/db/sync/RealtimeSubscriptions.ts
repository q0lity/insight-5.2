/**
 * Real-time Subscriptions - Listen to Supabase changes
 *
 * Provides real-time sync by subscribing to Supabase Realtime channels
 * and updating local WatermelonDB when remote changes occur.
 */

import type { SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Q } from '@nozbe/watermelondb';

import { database, collections } from '../database';
import { SyncStatus, TableNames } from '../schema';

type SubscriptionCallback = (event: {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}) => void;

interface Subscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

class RealtimeSubscriptionManager {
  private supabase: SupabaseClient | null = null;
  private userId: string | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private callbacks: Set<SubscriptionCallback> = new Set();
  private isEnabled: boolean = false;

  // Initialize with Supabase client and user
  async initialize(supabase: SupabaseClient, userId: string): Promise<void> {
    this.supabase = supabase;
    this.userId = userId;
  }

  // Subscribe to change events
  onChanges(callback: SubscriptionCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  private emit(event: {
    table: string;
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Record<string, unknown> | null;
    old: Record<string, unknown> | null;
  }): void {
    this.callbacks.forEach((cb) => cb(event));
  }

  // Start real-time subscriptions
  async start(): Promise<void> {
    if (!this.supabase || !this.userId) {
      console.warn('[Realtime] Cannot start: not initialized');
      return;
    }

    if (this.isEnabled) {
      console.warn('[Realtime] Already started');
      return;
    }

    this.isEnabled = true;

    // Subscribe to key tables
    await this.subscribeToTable('entries');
    await this.subscribeToTable('goals');
    await this.subscribeToTable('entities');
    await this.subscribeToTable('workout_sessions');
    await this.subscribeToTable('nutrition_logs');
    await this.subscribeToTable('attachments');

    console.log('[Realtime] Subscriptions started');
  }

  // Stop all subscriptions
  async stop(): Promise<void> {
    for (const [name, subscription] of this.subscriptions) {
      subscription.unsubscribe();
      console.log(`[Realtime] Unsubscribed from ${name}`);
    }
    this.subscriptions.clear();
    this.isEnabled = false;
    console.log('[Realtime] All subscriptions stopped');
  }

  // Subscribe to a specific table
  private async subscribeToTable(table: string): Promise<void> {
    if (!this.supabase || !this.userId) return;

    const channelName = `realtime:${table}:${this.userId}`;

    // Check if already subscribed
    if (this.subscriptions.has(channelName)) {
      return;
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `user_id=eq.${this.userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          this.handleChange(table, payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to ${table}`);
        } else if (status === 'CLOSED') {
          console.log(`[Realtime] Subscription to ${table} closed`);
          this.subscriptions.delete(channelName);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Error subscribing to ${table}`);
        }
      });

    this.subscriptions.set(channelName, {
      channel,
      unsubscribe: () => {
        this.supabase?.removeChannel(channel);
      },
    });
  }

  // Handle a change event
  private handleChange(
    table: string,
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ): void {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const newRecord = (payload.new as Record<string, unknown>) ?? null;
    const oldRecord = (payload.old as Record<string, unknown>) ?? null;

    console.log(`[Realtime] ${table} ${eventType}:`, newRecord?.id ?? oldRecord?.id);

    // Emit to listeners
    this.emit({
      table,
      eventType,
      new: newRecord,
      old: oldRecord,
    });

    // Apply change to local database
    this.applyChange(table, eventType, newRecord, oldRecord).catch((err) => {
      console.error(`[Realtime] Error applying ${eventType} to ${table}:`, err);
    });
  }

  // Apply a remote change to local database
  private async applyChange(
    table: string,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: Record<string, unknown> | null,
    oldRecord: Record<string, unknown> | null
  ): Promise<void> {
    const remoteId = (newRecord?.id ?? oldRecord?.id) as string | undefined;
    if (!remoteId) return;

    switch (table) {
      case 'entries':
        await this.applyEntryChange(eventType, newRecord, oldRecord, remoteId);
        break;
      case 'goals':
        await this.applyGoalChange(eventType, newRecord, oldRecord, remoteId);
        break;
      case 'entities':
        await this.applyEntityChange(eventType, newRecord, oldRecord, remoteId);
        break;
      case 'workout_sessions':
        await this.applyWorkoutSessionChange(eventType, newRecord, oldRecord, remoteId);
        break;
      case 'nutrition_logs':
        await this.applyNutritionLogChange(eventType, newRecord, oldRecord, remoteId);
        break;
    }
  }

  private fromIso(iso: string | null | undefined): number | null {
    if (!iso) return null;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms : null;
  }

  // Apply entry change
  private async applyEntryChange(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: Record<string, unknown> | null,
    _oldRecord: Record<string, unknown> | null,
    remoteId: string
  ): Promise<void> {
    const existing = await collections.entries.query(Q.where('remote_id', remoteId)).fetch();

    if (eventType === 'DELETE' || (newRecord?.deleted_at != null)) {
      // Mark as deleted locally
      if (existing.length > 0) {
        await database.write(async () => {
          await existing[0].update((record) => {
            record.deletedAt = Date.now();
            (record as any).syncStatus = SyncStatus.SYNCED;
          });
        });
      }
      return;
    }

    if (!newRecord) return;

    const entryData = {
      remote_id: remoteId,
      user_id: newRecord.user_id as string,
      title: (newRecord.title as string) ?? 'Untitled',
      facets: JSON.stringify(newRecord.facets ?? []),
      status: (newRecord.status as string) ?? null,
      priority: (newRecord.priority as string) ?? null,
      scheduled_at: this.fromIso(newRecord.scheduled_at as string | null),
      due_at: this.fromIso(newRecord.due_at as string | null),
      completed_at: this.fromIso(newRecord.completed_at as string | null),
      start_at: this.fromIso(newRecord.start_at as string | null),
      end_at: this.fromIso(newRecord.end_at as string | null),
      duration_minutes: (newRecord.duration_minutes as number) ?? null,
      difficulty: (newRecord.difficulty as number) ?? null,
      importance: (newRecord.importance as number) ?? null,
      tags: JSON.stringify(newRecord.tags ?? []),
      contexts: JSON.stringify(newRecord.contexts ?? []),
      people: JSON.stringify(newRecord.people ?? []),
      frontmatter: JSON.stringify(newRecord.frontmatter ?? {}),
      body_markdown: (newRecord.body_markdown as string) ?? '',
      source: (newRecord.source as string) ?? 'app',
      deleted_at: this.fromIso(newRecord.deleted_at as string | null),
      sync_status: SyncStatus.SYNCED,
      last_synced_at: Date.now(),
      updated_at: this.fromIso(newRecord.updated_at as string | null) ?? Date.now(),
    };

    await database.write(async () => {
      if (existing.length > 0) {
        await existing[0].update((record) => {
          Object.assign(record, entryData);
        });
      } else {
        await collections.entries.create((record) => {
          Object.assign(record, {
            ...entryData,
            created_at: this.fromIso(newRecord.created_at as string | null) ?? Date.now(),
          });
        });
      }
    });
  }

  // Apply goal change
  private async applyGoalChange(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: Record<string, unknown> | null,
    _oldRecord: Record<string, unknown> | null,
    remoteId: string
  ): Promise<void> {
    const existing = await collections.goals.query(Q.where('remote_id', remoteId)).fetch();

    if (eventType === 'DELETE') {
      if (existing.length > 0) {
        await database.write(async () => {
          await existing[0].destroyPermanently();
        });
      }
      return;
    }

    if (!newRecord) return;

    const goalData = {
      remote_id: remoteId,
      user_id: newRecord.user_id as string,
      title: (newRecord.title as string) ?? 'Untitled Goal',
      description: (newRecord.description as string) ?? null,
      target_date: this.fromIso(newRecord.target_date as string | null),
      archived: (newRecord.archived as boolean) ?? false,
      metadata: JSON.stringify(newRecord.metadata ?? {}),
      sync_status: SyncStatus.SYNCED,
      last_synced_at: Date.now(),
      updated_at: this.fromIso(newRecord.updated_at as string | null) ?? Date.now(),
    };

    await database.write(async () => {
      if (existing.length > 0) {
        await existing[0].update((record) => {
          Object.assign(record, goalData);
        });
      } else {
        await collections.goals.create((record) => {
          Object.assign(record, {
            ...goalData,
            created_at: this.fromIso(newRecord.created_at as string | null) ?? Date.now(),
          });
        });
      }
    });
  }

  // Apply entity change
  private async applyEntityChange(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: Record<string, unknown> | null,
    _oldRecord: Record<string, unknown> | null,
    remoteId: string
  ): Promise<void> {
    const existing = await collections.entities.query(Q.where('remote_id', remoteId)).fetch();

    if (eventType === 'DELETE') {
      if (existing.length > 0) {
        await database.write(async () => {
          await existing[0].destroyPermanently();
        });
      }
      return;
    }

    if (!newRecord) return;

    const entityData = {
      remote_id: remoteId,
      user_id: newRecord.user_id as string,
      type: (newRecord.type as string) ?? 'tag',
      key: (newRecord.key as string) ?? '',
      display_name: (newRecord.display_name as string) ?? (newRecord.key as string) ?? '',
      metadata: JSON.stringify(newRecord.metadata ?? {}),
      sync_status: SyncStatus.SYNCED,
      last_synced_at: Date.now(),
      updated_at: this.fromIso(newRecord.updated_at as string | null) ?? Date.now(),
    };

    await database.write(async () => {
      if (existing.length > 0) {
        await existing[0].update((record) => {
          Object.assign(record, entityData);
        });
      } else {
        await collections.entities.create((record) => {
          Object.assign(record, {
            ...entityData,
            created_at: this.fromIso(newRecord.created_at as string | null) ?? Date.now(),
          });
        });
      }
    });
  }

  // Apply workout session change
  private async applyWorkoutSessionChange(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: Record<string, unknown> | null,
    _oldRecord: Record<string, unknown> | null,
    remoteId: string
  ): Promise<void> {
    const existing = await collections.workoutSessions
      .query(Q.where('remote_id', remoteId))
      .fetch();

    if (eventType === 'DELETE') {
      if (existing.length > 0) {
        await database.write(async () => {
          await existing[0].destroyPermanently();
        });
      }
      return;
    }

    if (!newRecord) return;

    const sessionData = {
      remote_id: remoteId,
      user_id: newRecord.user_id as string,
      entry_id: (newRecord.entry_id as string) ?? null,
      template: (newRecord.template as string) ?? 'strength',
      title: (newRecord.title as string) ?? null,
      start_at: this.fromIso(newRecord.start_at as string | null) ?? Date.now(),
      end_at: this.fromIso(newRecord.end_at as string | null),
      total_duration: (newRecord.total_duration as number) ?? null,
      estimated_calories: (newRecord.estimated_calories as number) ?? null,
      overall_rpe: (newRecord.overall_rpe as number) ?? null,
      notes: (newRecord.notes as string) ?? null,
      goal_id: (newRecord.goal_id as string) ?? null,
      tags: JSON.stringify((newRecord as any).tags ?? []),
      location: (newRecord.location as string) ?? null,
      metadata: JSON.stringify((newRecord as any).metadata ?? {}),
      sync_status: SyncStatus.SYNCED,
      last_synced_at: Date.now(),
      updated_at: this.fromIso(newRecord.updated_at as string | null) ?? Date.now(),
    };

    await database.write(async () => {
      if (existing.length > 0) {
        await existing[0].update((record) => {
          Object.assign(record, sessionData);
        });
      } else {
        await collections.workoutSessions.create((record) => {
          Object.assign(record, {
            ...sessionData,
            created_at: this.fromIso(newRecord.created_at as string | null) ?? Date.now(),
          });
        });
      }
    });
  }

  // Apply nutrition log change
  private async applyNutritionLogChange(
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: Record<string, unknown> | null,
    _oldRecord: Record<string, unknown> | null,
    remoteId: string
  ): Promise<void> {
    const existing = await collections.nutritionLogs.query(Q.where('remote_id', remoteId)).fetch();

    if (eventType === 'DELETE') {
      if (existing.length > 0) {
        await database.write(async () => {
          await existing[0].destroyPermanently();
        });
      }
      return;
    }

    if (!newRecord) return;

    const meta = (newRecord.metadata ?? {}) as Record<string, unknown>;

    const logData = {
      remote_id: remoteId,
      user_id: newRecord.user_id as string,
      entry_id: (newRecord.entry_id as string) ?? null,
      meal_type: (meta.type as string) ?? (newRecord.meal_type as string) ?? 'snack',
      title: (meta.title as string) ?? (newRecord.title as string) ?? null,
      eaten_at: this.fromIso(newRecord.eaten_at as string | null) ?? Date.now(),
      calories: (newRecord.calories as number) ?? null,
      protein_g: (newRecord.protein_g as number) ?? null,
      carbs_g: (newRecord.carbs_g as number) ?? null,
      fat_g: (newRecord.fat_g as number) ?? null,
      fiber_g: (newRecord.fiber_g as number) ?? null,
      saturated_fat_g: (newRecord.saturated_fat_g as number) ?? null,
      trans_fat_g: (newRecord.trans_fat_g as number) ?? null,
      sugar_g: (newRecord.sugar_g as number) ?? null,
      sodium_mg: (newRecord.sodium_mg as number) ?? null,
      potassium_mg: (newRecord.potassium_mg as number) ?? null,
      cholesterol_mg: (newRecord.cholesterol_mg as number) ?? null,
      estimation_model: (newRecord.estimation_model as string) ?? null,
      confidence: (newRecord.confidence as number) ?? null,
      items: JSON.stringify((meta.items as unknown[]) ?? []),
      photo_uri: (meta.photo_uri as string) ?? null,
      notes: (meta.notes as string) ?? null,
      goal_id: (newRecord.goal_id as string) ?? null,
      tags: JSON.stringify((meta.tags as unknown[]) ?? []),
      location: (meta.location as string) ?? null,
      metadata: JSON.stringify(newRecord.metadata ?? {}),
      sync_status: SyncStatus.SYNCED,
      last_synced_at: Date.now(),
      updated_at: this.fromIso(newRecord.updated_at as string | null) ?? Date.now(),
    };

    await database.write(async () => {
      if (existing.length > 0) {
        await existing[0].update((record) => {
          Object.assign(record, logData);
        });
      } else {
        await collections.nutritionLogs.create((record) => {
          Object.assign(record, {
            ...logData,
            created_at: this.fromIso(newRecord.created_at as string | null) ?? Date.now(),
          });
        });
      }
    });
  }

  // Check if subscriptions are active
  isActive(): boolean {
    return this.isEnabled && this.subscriptions.size > 0;
  }

  // Get subscription status
  getStatus(): { isEnabled: boolean; activeSubscriptions: number } {
    return {
      isEnabled: this.isEnabled,
      activeSubscriptions: this.subscriptions.size,
    };
  }
}

// Singleton instance
export const realtimeSubscriptions = new RealtimeSubscriptionManager();
