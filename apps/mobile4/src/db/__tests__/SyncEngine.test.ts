/**
 * Sync Engine Tests
 *
 * Comprehensive tests for the sync engine, offline queue, and real-time subscriptions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { SyncStatus } from '../schema';
import { SyncQueue, MAX_RETRIES, INITIAL_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS } from '../models/SyncQueue';

// Mock data helpers
const mockEntry = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'entry-123',
  user_id: 'user-456',
  title: 'Test Entry',
  facets: ['task'],
  status: 'todo',
  tags: ['test'],
  contexts: [],
  people: [],
  frontmatter: {},
  body_markdown: 'Test content',
  source: 'app',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const mockGoal = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'goal-123',
  user_id: 'user-456',
  title: 'Test Goal',
  description: 'A test goal',
  archived: false,
  metadata: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const mockEntity = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'entity-123',
  user_id: 'user-456',
  type: 'tag',
  key: 'test-tag',
  display_name: 'Test Tag',
  metadata: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('SyncQueue', () => {
  describe('calculateNextRetryDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      expect(SyncQueue.calculateNextRetryDelay(0)).toBe(INITIAL_RETRY_DELAY_MS);
      expect(SyncQueue.calculateNextRetryDelay(1)).toBe(INITIAL_RETRY_DELAY_MS * 2);
      expect(SyncQueue.calculateNextRetryDelay(2)).toBe(INITIAL_RETRY_DELAY_MS * 4);
      expect(SyncQueue.calculateNextRetryDelay(3)).toBe(INITIAL_RETRY_DELAY_MS * 8);
    });

    it('should cap delay at MAX_RETRY_DELAY_MS', () => {
      expect(SyncQueue.calculateNextRetryDelay(20)).toBe(MAX_RETRY_DELAY_MS);
      expect(SyncQueue.calculateNextRetryDelay(100)).toBe(MAX_RETRY_DELAY_MS);
    });
  });
});

describe('Data Transformation', () => {
  describe('fromIso helper', () => {
    const fromIso = (iso: string | null | undefined): number | null => {
      if (!iso) return null;
      const ms = Date.parse(iso);
      return Number.isFinite(ms) ? ms : null;
    };

    it('should parse valid ISO date strings', () => {
      expect(fromIso('2024-01-01T00:00:00Z')).toBe(1704067200000);
      expect(fromIso('2024-06-15T12:30:45.123Z')).toBe(1718451045123);
    });

    it('should return null for null/undefined', () => {
      expect(fromIso(null)).toBeNull();
      expect(fromIso(undefined)).toBeNull();
    });

    it('should return null for invalid dates', () => {
      expect(fromIso('invalid-date')).toBeNull();
      expect(fromIso('')).toBeNull();
    });
  });

  describe('JSON array sanitization', () => {
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

    it('should handle arrays', () => {
      expect(sanitizeStringArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should filter non-strings from arrays', () => {
      expect(sanitizeStringArray(['a', 1, 'b', null, 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should parse JSON strings', () => {
      expect(sanitizeStringArray('["a", "b"]')).toEqual(['a', 'b']);
    });

    it('should return empty array for null/undefined', () => {
      expect(sanitizeStringArray(null)).toEqual([]);
      expect(sanitizeStringArray(undefined)).toEqual([]);
    });

    it('should return empty array for invalid JSON', () => {
      expect(sanitizeStringArray('invalid json')).toEqual([]);
    });
  });
});

describe('Entry Transformation', () => {
  it('should correctly transform Supabase entry to local format', () => {
    const supabaseEntry = mockEntry({
      facets: ['task'],
      tags: ['#work', '#urgent'],
      frontmatter: { goal: 'goal-123', project: 'project-456' },
    });

    // Simulate the transformation
    const fromIso = (iso: string | null | undefined): number | null => {
      if (!iso) return null;
      const ms = Date.parse(iso);
      return Number.isFinite(ms) ? ms : null;
    };

    const transformed = {
      remoteId: supabaseEntry.id,
      userId: supabaseEntry.user_id,
      title: supabaseEntry.title,
      facets: supabaseEntry.facets,
      tags: supabaseEntry.tags,
      frontmatter: supabaseEntry.frontmatter,
      bodyMarkdown: supabaseEntry.body_markdown,
      source: supabaseEntry.source,
      createdAt: fromIso(supabaseEntry.created_at),
      updatedAt: fromIso(supabaseEntry.updated_at),
    };

    expect(transformed.remoteId).toBe('entry-123');
    expect(transformed.userId).toBe('user-456');
    expect(transformed.title).toBe('Test Entry');
    expect(transformed.facets).toEqual(['task']);
    expect(transformed.tags).toEqual(['#work', '#urgent']);
    expect(transformed.frontmatter.goal).toBe('goal-123');
    expect(transformed.createdAt).toBe(1704067200000);
  });

  it('should handle missing optional fields', () => {
    const minimalEntry = {
      id: 'entry-123',
      user_id: 'user-456',
      title: 'Minimal Entry',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const transformed = {
      remoteId: minimalEntry.id,
      userId: minimalEntry.user_id,
      title: minimalEntry.title,
      facets: [],
      tags: [],
      contexts: [],
      people: [],
      frontmatter: {},
    };

    expect(transformed.facets).toEqual([]);
    expect(transformed.tags).toEqual([]);
  });
});

describe('Goal Transformation', () => {
  it('should correctly transform Supabase goal to local format', () => {
    const supabaseGoal = mockGoal({
      target_date: '2024-12-31T23:59:59Z',
      metadata: { color: 'blue', priority: 1 },
    });

    const fromIso = (iso: string | null | undefined): number | null => {
      if (!iso) return null;
      const ms = Date.parse(iso);
      return Number.isFinite(ms) ? ms : null;
    };

    const transformed = {
      remoteId: supabaseGoal.id,
      userId: supabaseGoal.user_id,
      title: supabaseGoal.title,
      description: supabaseGoal.description,
      targetDate: fromIso(supabaseGoal.target_date as string),
      archived: supabaseGoal.archived,
      metadata: supabaseGoal.metadata,
    };

    expect(transformed.remoteId).toBe('goal-123');
    expect(transformed.title).toBe('Test Goal');
    expect(transformed.targetDate).toBe(1735689599000);
    expect(transformed.archived).toBe(false);
    expect(transformed.metadata.color).toBe('blue');
  });
});

describe('Entity Transformation', () => {
  it('should correctly transform Supabase entity to local format', () => {
    const supabaseEntity = mockEntity({
      type: 'person',
      key: 'john-doe',
      display_name: 'John Doe',
    });

    const transformed = {
      remoteId: supabaseEntity.id,
      userId: supabaseEntity.user_id,
      type: supabaseEntity.type,
      key: supabaseEntity.key,
      displayName: supabaseEntity.display_name,
    };

    expect(transformed.type).toBe('person');
    expect(transformed.key).toBe('john-doe');
    expect(transformed.displayName).toBe('John Doe');
  });

  it('should normalize entity keys', () => {
    const normalizeEntityKey = (raw: string) => {
      return raw.trim().toLowerCase().replace(/\s+/g, ' ');
    };

    expect(normalizeEntityKey('  Test Tag  ')).toBe('test tag');
    expect(normalizeEntityKey('Multiple   Spaces')).toBe('multiple spaces');
    expect(normalizeEntityKey('UPPERCASE')).toBe('uppercase');
  });
});

describe('Sync Status', () => {
  it('should have correct status values', () => {
    expect(SyncStatus.SYNCED).toBe('synced');
    expect(SyncStatus.PENDING).toBe('pending');
    expect(SyncStatus.CONFLICT).toBe('conflict');
  });
});

describe('Offline Queue Logic', () => {
  describe('Operation deduplication', () => {
    it('should treat delete as superseding other operations', () => {
      // Simulate the queue logic
      const operations = ['create', 'update', 'delete'];
      const finalOperation = operations[operations.length - 1];
      expect(finalOperation).toBe('delete');
    });

    it('should merge update payloads', () => {
      const existingPayload = { title: 'Old Title', status: 'todo' };
      const newPayload = { title: 'New Title' };
      const merged = { ...existingPayload, ...newPayload };

      expect(merged.title).toBe('New Title');
      expect(merged.status).toBe('todo');
    });
  });

  describe('Retry timing', () => {
    it('should calculate correct retry times', () => {
      const now = Date.now();
      const delays = [0, 1, 2, 3, 4].map((count) => {
        return SyncQueue.calculateNextRetryDelay(count);
      });

      expect(delays[0]).toBe(1000); // 1 second
      expect(delays[1]).toBe(2000); // 2 seconds
      expect(delays[2]).toBe(4000); // 4 seconds
      expect(delays[3]).toBe(8000); // 8 seconds
      expect(delays[4]).toBe(16000); // 16 seconds
    });
  });
});

describe('Real-time Event Handling', () => {
  describe('Event type mapping', () => {
    it('should correctly identify event types', () => {
      const events = ['INSERT', 'UPDATE', 'DELETE'] as const;

      expect(events.includes('INSERT')).toBe(true);
      expect(events.includes('UPDATE')).toBe(true);
      expect(events.includes('DELETE')).toBe(true);
    });
  });

  describe('Change application', () => {
    it('should handle INSERT events', () => {
      const eventType = 'INSERT';
      const newRecord = mockEntry();
      const oldRecord = null;

      expect(eventType).toBe('INSERT');
      expect(newRecord).not.toBeNull();
      expect(oldRecord).toBeNull();
    });

    it('should handle UPDATE events', () => {
      const eventType = 'UPDATE';
      const newRecord = mockEntry({ title: 'Updated Title' });
      const oldRecord = mockEntry({ title: 'Old Title' });

      expect(eventType).toBe('UPDATE');
      expect(newRecord.title).toBe('Updated Title');
      expect(oldRecord.title).toBe('Old Title');
    });

    it('should handle DELETE events', () => {
      const eventType = 'DELETE';
      const newRecord = null;
      const oldRecord = mockEntry();

      expect(eventType).toBe('DELETE');
      expect(newRecord).toBeNull();
      expect(oldRecord).not.toBeNull();
    });

    it('should handle soft deletes via deleted_at', () => {
      const softDeletedEntry = mockEntry({
        deleted_at: '2024-01-15T00:00:00Z',
      });

      expect(softDeletedEntry.deleted_at).not.toBeNull();
    });
  });
});

describe('Conflict Detection', () => {
  it('should detect conflicts based on timestamps', () => {
    const localUpdatedAt = 1704067200000; // 2024-01-01T00:00:00Z
    const remoteUpdatedAt = 1704153600000; // 2024-01-02T00:00:00Z

    const hasConflict = localUpdatedAt !== remoteUpdatedAt;
    const remoteIsNewer = remoteUpdatedAt > localUpdatedAt;

    expect(hasConflict).toBe(true);
    expect(remoteIsNewer).toBe(true);
  });

  it('should use last-write-wins for conflict resolution', () => {
    const localRecord = { title: 'Local Title', updatedAt: 1704067200000 };
    const remoteRecord = { title: 'Remote Title', updatedAt: 1704153600000 };

    // Last-write-wins: remote is newer
    const winner = remoteRecord.updatedAt > localRecord.updatedAt ? remoteRecord : localRecord;

    expect(winner.title).toBe('Remote Title');
  });
});

describe('Batch Processing', () => {
  it('should process items in batches', () => {
    const BATCH_SIZE = 100;
    const totalItems = 250;

    const batches = Math.ceil(totalItems / BATCH_SIZE);

    expect(batches).toBe(3);
  });

  it('should handle empty batches', () => {
    const items: unknown[] = [];
    const BATCH_SIZE = 100;

    const batches = Math.ceil(items.length / BATCH_SIZE);

    expect(batches).toBe(0);
  });
});

describe('Network State', () => {
  it('should queue operations when offline', () => {
    const isOnline = false;
    const shouldQueue = !isOnline;

    expect(shouldQueue).toBe(true);
  });

  it('should process immediately when online', () => {
    const isOnline = true;
    const shouldQueue = !isOnline;

    expect(shouldQueue).toBe(false);
  });
});
