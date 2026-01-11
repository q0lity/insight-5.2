/**
 * Entry Model - Unified table for tasks, events, notes
 */

import { field, text, json, children } from '@nozbe/watermelondb/decorators';
import type { Query } from '@nozbe/watermelondb';

import { SyncableModel, safeParseJson, safeStringifyJson } from './BaseModel';
import { TableNames } from '../schema';
import type { Attachment } from './Attachment';

type Facet = 'task' | 'event' | 'note' | 'habit_def';
type EntryStatus = 'todo' | 'in_progress' | 'done' | 'canceled' | null;

interface Frontmatter {
  legacyId?: string | null;
  legacyType?: string | null;
  sourceApp?: string | null;
  kind?: string | null;
  location?: string | null;
  skills?: string[];
  character?: string[];
  goal?: string | null;
  project?: string | null;
  category?: string | null;
  subcategory?: string | null;
  estimateMinutes?: number | null;
  parentEventId?: string | null;
  [key: string]: unknown;
}

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

const sanitizeFrontmatter = (raw: unknown): Frontmatter => {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Frontmatter;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Frontmatter;
    } catch {
      return {};
    }
  }
  return {};
};

export class Entry extends SyncableModel {
  static table = TableNames.ENTRIES;

  static associations = {
    [TableNames.ATTACHMENTS]: { type: 'has_many' as const, foreignKey: 'entry_id' },
    [TableNames.WORKOUT_SESSIONS]: { type: 'has_many' as const, foreignKey: 'entry_id' },
    [TableNames.NUTRITION_LOGS]: { type: 'has_many' as const, foreignKey: 'entry_id' },
    [TableNames.HABIT_INSTANCES]: { type: 'has_many' as const, foreignKey: 'entry_id' },
    [TableNames.TRACKER_LOGS]: { type: 'has_many' as const, foreignKey: 'entry_id' },
    [TableNames.EXTERNAL_EVENT_LINKS]: { type: 'has_many' as const, foreignKey: 'entry_id' },
  };

  @text('title') title!: string;
  @json('facets', sanitizeStringArray) facets!: Facet[];
  @field('status') status!: EntryStatus;
  @field('priority') priority!: string | null;
  @field('scheduled_at') scheduledAt!: number | null;
  @field('due_at') dueAt!: number | null;
  @field('completed_at') completedAt!: number | null;
  @field('start_at') startAt!: number | null;
  @field('end_at') endAt!: number | null;
  @field('duration_minutes') durationMinutes!: number | null;
  @field('difficulty') difficulty!: number | null;
  @field('importance') importance!: number | null;
  @json('tags', sanitizeStringArray) tags!: string[];
  @json('contexts', sanitizeStringArray) contexts!: string[];
  @json('people', sanitizeStringArray) people!: string[];
  @json('frontmatter', sanitizeFrontmatter) frontmatter!: Frontmatter;
  @text('body_markdown') bodyMarkdown!: string;
  @field('source') source!: string;
  @field('deleted_at') deletedAt!: number | null;

  @children(TableNames.ATTACHMENTS) attachments!: Query<Attachment>;

  // Convenience getters
  get isTask(): boolean {
    return this.facets.includes('task');
  }

  get isEvent(): boolean {
    return this.facets.includes('event');
  }

  get isNote(): boolean {
    return this.facets.includes('note');
  }

  get isHabitDef(): boolean {
    return this.facets.includes('habit_def');
  }

  get isDeleted(): boolean {
    return this.deletedAt != null;
  }

  get isCompleted(): boolean {
    return this.status === 'done' || this.completedAt != null;
  }

  get goal(): string | null {
    return this.frontmatter?.goal ?? null;
  }

  get project(): string | null {
    return this.frontmatter?.project ?? null;
  }

  get category(): string | null {
    return this.frontmatter?.category ?? null;
  }

  get subcategory(): string | null {
    return this.frontmatter?.subcategory ?? null;
  }

  get location(): string | null {
    return this.frontmatter?.location ?? null;
  }

  get estimateMinutes(): number | null {
    return this.frontmatter?.estimateMinutes ?? this.durationMinutes ?? null;
  }

  get parentEventId(): string | null {
    return this.frontmatter?.parentEventId ?? null;
  }

  // Convert to Supabase entry payload
  toSupabasePayload(): Record<string, unknown> {
    return {
      title: this.title,
      facets: this.facets,
      status: this.status,
      priority: this.priority,
      scheduled_at: this.scheduledAt ? new Date(this.scheduledAt).toISOString() : null,
      due_at: this.dueAt ? new Date(this.dueAt).toISOString() : null,
      completed_at: this.completedAt ? new Date(this.completedAt).toISOString() : null,
      start_at: this.startAt ? new Date(this.startAt).toISOString() : null,
      end_at: this.endAt ? new Date(this.endAt).toISOString() : null,
      duration_minutes: this.durationMinutes,
      difficulty: this.difficulty,
      importance: this.importance,
      tags: this.tags,
      contexts: this.contexts,
      people: this.people,
      frontmatter: this.frontmatter,
      body_markdown: this.bodyMarkdown,
      source: this.source,
      deleted_at: this.deletedAt ? new Date(this.deletedAt).toISOString() : null,
    };
  }

  // Create from Supabase row
  static fromSupabaseRow(row: Record<string, unknown>): Partial<Entry> {
    const fromIso = (iso: string | null | undefined): number | null => {
      if (!iso) return null;
      const ms = Date.parse(iso);
      return Number.isFinite(ms) ? ms : null;
    };

    return {
      remoteId: row.id as string,
      userId: row.user_id as string,
      title: (row.title as string) ?? 'Untitled',
      facets: sanitizeStringArray(row.facets) as Facet[],
      status: (row.status as EntryStatus) ?? null,
      priority: (row.priority as string) ?? null,
      scheduledAt: fromIso(row.scheduled_at as string | null),
      dueAt: fromIso(row.due_at as string | null),
      completedAt: fromIso(row.completed_at as string | null),
      startAt: fromIso(row.start_at as string | null),
      endAt: fromIso(row.end_at as string | null),
      durationMinutes: (row.duration_minutes as number) ?? null,
      difficulty: (row.difficulty as number) ?? null,
      importance: (row.importance as number) ?? null,
      tags: sanitizeStringArray(row.tags),
      contexts: sanitizeStringArray(row.contexts),
      people: sanitizeStringArray(row.people),
      frontmatter: sanitizeFrontmatter(row.frontmatter),
      bodyMarkdown: (row.body_markdown as string) ?? '',
      source: (row.source as string) ?? 'app',
      deletedAt: fromIso(row.deleted_at as string | null),
    } as unknown as Partial<Entry>;
  }
}
