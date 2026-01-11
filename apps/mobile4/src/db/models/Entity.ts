/**
 * Entity Model - Tags, People, Places
 */

import { field, text, json } from '@nozbe/watermelondb/decorators';

import { SyncableModel } from './BaseModel';
import { TableNames } from '../schema';

type EntityType = 'tag' | 'person' | 'place';

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

export class Entity extends SyncableModel {
  static table = TableNames.ENTITIES;

  @field('type') type!: EntityType;
  @text('key') key!: string;
  @text('display_name') displayName!: string;
  @json('metadata', sanitizeMetadata) metadata!: Record<string, unknown>;

  get isTag(): boolean {
    return this.type === 'tag';
  }

  get isPerson(): boolean {
    return this.type === 'person';
  }

  get isPlace(): boolean {
    return this.type === 'place';
  }

  get normalizedKey(): string {
    return this.key.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  toSupabasePayload(): Record<string, unknown> {
    return {
      type: this.type,
      key: this.normalizedKey,
      display_name: this.displayName,
      metadata: this.metadata,
    };
  }

  static fromSupabaseRow(row: Record<string, unknown>): Partial<Entity> {
    return {
      remoteId: row.id as string,
      userId: row.user_id as string,
      type: (row.type as EntityType) ?? 'tag',
      key: (row.key as string) ?? '',
      displayName: (row.display_name as string) ?? (row.key as string) ?? '',
      metadata: sanitizeMetadata(row.metadata),
    } as unknown as Partial<Entity>;
  }
}
