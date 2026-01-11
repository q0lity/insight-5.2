/**
 * Goal Model
 */

import { field, text, json } from '@nozbe/watermelondb/decorators';

import { SyncableModel } from './BaseModel';
import { TableNames } from '../schema';

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

export class Goal extends SyncableModel {
  static table = TableNames.GOALS;

  static associations = {
    [TableNames.PROJECTS]: { type: 'has_many' as const, foreignKey: 'goal_id' },
    [TableNames.HABIT_DEFINITIONS]: { type: 'has_many' as const, foreignKey: 'goal_id' },
  };

  @text('title') title!: string;
  @text('description') description!: string | null;
  @field('target_date') targetDate!: number | null;
  @field('archived') archived!: boolean;
  @json('metadata', sanitizeMetadata) metadata!: Record<string, unknown>;

  get isActive(): boolean {
    return !this.archived;
  }

  get hasTargetDate(): boolean {
    return this.targetDate != null;
  }

  get isOverdue(): boolean {
    if (!this.targetDate) return false;
    return this.targetDate < Date.now();
  }

  toSupabasePayload(): Record<string, unknown> {
    return {
      title: this.title,
      description: this.description,
      target_date: this.targetDate ? new Date(this.targetDate).toISOString() : null,
      archived: this.archived,
      metadata: this.metadata,
    };
  }

  static fromSupabaseRow(row: Record<string, unknown>): Partial<Goal> {
    const fromIso = (iso: string | null | undefined): number | null => {
      if (!iso) return null;
      const ms = Date.parse(iso);
      return Number.isFinite(ms) ? ms : null;
    };

    return {
      remoteId: row.id as string,
      userId: row.user_id as string,
      title: (row.title as string) ?? 'Untitled Goal',
      description: (row.description as string) ?? null,
      targetDate: fromIso(row.target_date as string | null),
      archived: (row.archived as boolean) ?? false,
      metadata: sanitizeMetadata(row.metadata),
    } as unknown as Partial<Goal>;
  }
}
