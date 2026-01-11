/**
 * Workout Row Model - Exercises and sets
 */

import { field, text, json, relation } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';

import { SyncableModel } from './BaseModel';
import { TableNames } from '../schema';
import type { WorkoutSession } from './WorkoutSession';

type WeightUnit = 'lb' | 'kg';
type DistanceUnit = 'mi' | 'km';

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

export class WorkoutRow extends SyncableModel {
  static table = TableNames.WORKOUT_ROWS;

  static associations = {
    [TableNames.WORKOUT_SESSIONS]: { type: 'belongs_to' as const, key: 'session_id' },
  };

  @field('session_id') sessionId!: string;
  @text('exercise') exercise!: string;
  @field('set_index') setIndex!: number;
  @field('reps') reps!: number | null;
  @field('weight') weight!: number | null;
  @field('weight_unit') weightUnit!: WeightUnit | null;
  @field('rpe') rpe!: number | null;
  @field('duration_seconds') durationSeconds!: number | null;
  @field('distance') distance!: number | null;
  @field('distance_unit') distanceUnit!: DistanceUnit | null;
  @text('notes') notes!: string | null;
  @json('metadata', sanitizeMetadata) metadata!: Record<string, unknown>;

  @relation(TableNames.WORKOUT_SESSIONS, 'session_id') session!: Relation<WorkoutSession>;

  get hasWeight(): boolean {
    return this.weight != null;
  }

  get hasReps(): boolean {
    return this.reps != null;
  }

  get hasDuration(): boolean {
    return this.durationSeconds != null;
  }

  get hasDistance(): boolean {
    return this.distance != null;
  }

  get volume(): number {
    if (this.reps && this.weight) {
      return this.reps * this.weight;
    }
    return 0;
  }

  toSupabasePayload(): Record<string, unknown> {
    return {
      session_id: this.sessionId,
      exercise: this.exercise,
      set_index: this.setIndex,
      reps: this.reps,
      weight: this.weight,
      weight_unit: this.weightUnit,
      rpe: this.rpe,
      duration_seconds: this.durationSeconds,
      distance: this.distance,
      distance_unit: this.distanceUnit,
      notes: this.notes,
      metadata: this.metadata,
    };
  }

  static fromSupabaseRow(row: Record<string, unknown>): Partial<WorkoutRow> {
    return {
      remoteId: row.id as string,
      userId: row.user_id as string,
      sessionId: row.session_id as string,
      exercise: (row.exercise as string) ?? 'Exercise',
      setIndex: (row.set_index as number) ?? 1,
      reps: (row.reps as number) ?? null,
      weight: (row.weight as number) ?? null,
      weightUnit: (row.weight_unit as WeightUnit) ?? null,
      rpe: (row.rpe as number) ?? null,
      durationSeconds: (row.duration_seconds as number) ?? null,
      distance: (row.distance as number) ?? null,
      distanceUnit: (row.distance_unit as DistanceUnit) ?? null,
      notes: (row.notes as string) ?? null,
      metadata: sanitizeMetadata(row.metadata),
    } as unknown as Partial<WorkoutRow>;
  }
}
