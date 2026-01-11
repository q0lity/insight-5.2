/**
 * Workout Session Model
 */

import { field, text, json, children, relation } from '@nozbe/watermelondb/decorators';
import type { Query, Relation } from '@nozbe/watermelondb';

import { SyncableModel } from './BaseModel';
import { TableNames } from '../schema';
import type { WorkoutRow } from './WorkoutRow';
import type { Entry } from './Entry';

type WorkoutTemplate = 'strength' | 'cardio' | 'mobility';

const sanitizeStringArray = (raw: unknown): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((s) => typeof s === 'string');
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
};

const sanitizeMetadata = (raw: unknown): Record<string, unknown> => {
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

export class WorkoutSession extends SyncableModel {
  static table = TableNames.WORKOUT_SESSIONS;

  static associations = {
    [TableNames.ENTRIES]: { type: 'belongs_to' as const, key: 'entry_id' },
    [TableNames.WORKOUT_ROWS]: { type: 'has_many' as const, foreignKey: 'session_id' },
  };

  @field('entry_id') entryId!: string | null;
  @field('template') template!: WorkoutTemplate;
  @text('title') title!: string | null;
  @field('start_at') startAt!: number;
  @field('end_at') endAt!: number | null;
  @field('total_duration') totalDuration!: number | null;
  @field('estimated_calories') estimatedCalories!: number | null;
  @field('overall_rpe') overallRpe!: number | null;
  @text('notes') notes!: string | null;
  @field('goal_id') goalId!: string | null;
  @json('tags', sanitizeStringArray) tags!: string[];
  @text('location') location!: string | null;
  @json('metadata', sanitizeMetadata) metadata!: Record<string, unknown>;

  @relation(TableNames.ENTRIES, 'entry_id') entry!: Relation<Entry>;
  @children(TableNames.WORKOUT_ROWS) rows!: Query<WorkoutRow>;

  get isStrength(): boolean {
    return this.template === 'strength';
  }

  get isCardio(): boolean {
    return this.template === 'cardio';
  }

  get isMobility(): boolean {
    return this.template === 'mobility';
  }

  get durationMinutes(): number | null {
    if (this.totalDuration) return this.totalDuration;
    if (this.startAt && this.endAt) {
      return Math.round((this.endAt - this.startAt) / 60000);
    }
    return null;
  }

  toSupabasePayload(): Record<string, unknown> {
    return {
      entry_id: this.entryId,
      template: this.template,
      title: this.title,
      start_at: this.startAt ? new Date(this.startAt).toISOString() : null,
      end_at: this.endAt ? new Date(this.endAt).toISOString() : null,
      total_duration: this.totalDuration,
      estimated_calories: this.estimatedCalories,
      overall_rpe: this.overallRpe,
      notes: this.notes,
      goal_id: this.goalId,
      tags: this.tags,
      location: this.location,
      metadata: this.metadata,
    };
  }

  static fromSupabaseRow(row: Record<string, unknown>): Partial<WorkoutSession> {
    const fromIso = (iso: string | null | undefined): number | null => {
      if (!iso) return null;
      const ms = Date.parse(iso);
      return Number.isFinite(ms) ? ms : null;
    };

    return {
      remoteId: row.id as string,
      userId: row.user_id as string,
      entryId: (row.entry_id as string) ?? null,
      template: (row.template as WorkoutTemplate) ?? 'strength',
      title: (row.title as string) ?? null,
      startAt: fromIso(row.start_at as string | null) ?? Date.now(),
      endAt: fromIso(row.end_at as string | null),
      totalDuration: (row.total_duration as number) ?? null,
      estimatedCalories: (row.estimated_calories as number) ?? null,
      overallRpe: (row.overall_rpe as number) ?? null,
      notes: (row.notes as string) ?? null,
      goalId: (row.goal_id as string) ?? null,
      tags: sanitizeStringArray(row.tags),
      location: (row.location as string) ?? null,
      metadata: sanitizeMetadata(row.metadata),
    } as unknown as Partial<WorkoutSession>;
  }
}
