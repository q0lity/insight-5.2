/**
 * WatermelonDB Schema for Insight52 Mobile
 *
 * Matches Supabase table structure for offline-first sync.
 * Tables: entries, goals, projects, habit_definitions, habit_instances,
 * tracker_definitions, tracker_logs, workout_sessions, workout_rows,
 * nutrition_logs, entities, external_event_links, pending_captures
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Unified entries table (tasks, events, notes)
    tableSchema({
      name: 'entries',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'facets', type: 'string' }, // JSON array
        { name: 'status', type: 'string', isOptional: true },
        { name: 'priority', type: 'string', isOptional: true },
        { name: 'scheduled_at', type: 'number', isOptional: true, isIndexed: true },
        { name: 'due_at', type: 'number', isOptional: true, isIndexed: true },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'start_at', type: 'number', isOptional: true, isIndexed: true },
        { name: 'end_at', type: 'number', isOptional: true },
        { name: 'duration_minutes', type: 'number', isOptional: true },
        { name: 'difficulty', type: 'number', isOptional: true },
        { name: 'importance', type: 'number', isOptional: true },
        { name: 'tags', type: 'string' }, // JSON array
        { name: 'contexts', type: 'string' }, // JSON array
        { name: 'people', type: 'string' }, // JSON array
        { name: 'frontmatter', type: 'string' }, // JSON object
        { name: 'body_markdown', type: 'string' },
        { name: 'source', type: 'string' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        // Sync metadata
        { name: 'sync_status', type: 'string', isIndexed: true }, // 'synced' | 'pending' | 'conflict'
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // Goals table
    tableSchema({
      name: 'goals',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'target_date', type: 'number', isOptional: true },
        { name: 'archived', type: 'boolean' },
        { name: 'metadata', type: 'string' }, // JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // Projects table
    tableSchema({
      name: 'projects',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'goal_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'archived', type: 'boolean' },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'icon', type: 'string', isOptional: true },
        { name: 'metadata', type: 'string' }, // JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // Habit definitions
    tableSchema({
      name: 'habit_definitions',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'category', type: 'string', isOptional: true },
        { name: 'subcategory', type: 'string', isOptional: true },
        { name: 'difficulty', type: 'number' },
        { name: 'importance', type: 'number' },
        { name: 'character', type: 'string' }, // JSON array
        { name: 'skills', type: 'string' }, // JSON array
        { name: 'tags', type: 'string' }, // JSON array
        { name: 'contexts', type: 'string' }, // JSON array
        { name: 'people', type: 'string' }, // JSON array
        { name: 'estimate_minutes', type: 'number', isOptional: true },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'goal_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'project_id', type: 'string', isOptional: true },
        { name: 'polarity', type: 'string' }, // 'positive' | 'negative' | 'both'
        { name: 'schedule', type: 'string', isOptional: true },
        { name: 'target_per_week', type: 'number', isOptional: true },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'icon', type: 'string', isOptional: true },
        { name: 'is_timed', type: 'boolean' },
        { name: 'archived', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // Habit instances (completed habits)
    tableSchema({
      name: 'habit_instances',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'habit_definition_id', type: 'string', isIndexed: true },
        { name: 'entry_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'completed_at', type: 'number', isIndexed: true },
        { name: 'duration_minutes', type: 'number', isOptional: true },
        { name: 'polarity', type: 'string' }, // 'positive' | 'negative'
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'metadata', type: 'string' }, // JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // Tracker definitions
    tableSchema({
      name: 'tracker_definitions',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'key', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'unit', type: 'string', isOptional: true },
        { name: 'value_type', type: 'string' }, // 'number' | 'boolean' | 'duration' | 'text'
        { name: 'category', type: 'string', isOptional: true },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'icon', type: 'string', isOptional: true },
        { name: 'target_value', type: 'number', isOptional: true },
        { name: 'target_frequency', type: 'string', isOptional: true },
        { name: 'archived', type: 'boolean' },
        { name: 'metadata', type: 'string' }, // JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // Tracker logs
    tableSchema({
      name: 'tracker_logs',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'tracker_definition_id', type: 'string', isIndexed: true },
        { name: 'entry_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'logged_at', type: 'number', isIndexed: true },
        { name: 'value_number', type: 'number', isOptional: true },
        { name: 'value_boolean', type: 'boolean', isOptional: true },
        { name: 'value_text', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'metadata', type: 'string' }, // JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // Workout sessions
    tableSchema({
      name: 'workout_sessions',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'entry_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'template', type: 'string' }, // 'strength' | 'cardio' | 'mobility'
        { name: 'title', type: 'string', isOptional: true },
        { name: 'start_at', type: 'number', isIndexed: true },
        { name: 'end_at', type: 'number', isOptional: true },
        { name: 'total_duration', type: 'number', isOptional: true },
        { name: 'estimated_calories', type: 'number', isOptional: true },
        { name: 'overall_rpe', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'goal_id', type: 'string', isOptional: true },
        { name: 'tags', type: 'string' }, // JSON array
        { name: 'location', type: 'string', isOptional: true },
        { name: 'metadata', type: 'string' }, // JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // Workout rows (exercises/sets)
    tableSchema({
      name: 'workout_rows',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'session_id', type: 'string', isIndexed: true },
        { name: 'exercise', type: 'string' },
        { name: 'set_index', type: 'number' },
        { name: 'reps', type: 'number', isOptional: true },
        { name: 'weight', type: 'number', isOptional: true },
        { name: 'weight_unit', type: 'string', isOptional: true },
        { name: 'rpe', type: 'number', isOptional: true },
        { name: 'duration_seconds', type: 'number', isOptional: true },
        { name: 'distance', type: 'number', isOptional: true },
        { name: 'distance_unit', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'metadata', type: 'string' }, // JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // Nutrition logs
    tableSchema({
      name: 'nutrition_logs',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'entry_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'meal_type', type: 'string' }, // 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink'
        { name: 'title', type: 'string', isOptional: true },
        { name: 'eaten_at', type: 'number', isIndexed: true },
        { name: 'calories', type: 'number', isOptional: true },
        { name: 'protein_g', type: 'number', isOptional: true },
        { name: 'carbs_g', type: 'number', isOptional: true },
        { name: 'fat_g', type: 'number', isOptional: true },
        { name: 'fiber_g', type: 'number', isOptional: true },
        { name: 'saturated_fat_g', type: 'number', isOptional: true },
        { name: 'trans_fat_g', type: 'number', isOptional: true },
        { name: 'sugar_g', type: 'number', isOptional: true },
        { name: 'sodium_mg', type: 'number', isOptional: true },
        { name: 'potassium_mg', type: 'number', isOptional: true },
        { name: 'cholesterol_mg', type: 'number', isOptional: true },
        { name: 'estimation_model', type: 'string', isOptional: true },
        { name: 'confidence', type: 'number', isOptional: true },
        { name: 'items', type: 'string' }, // JSON array
        { name: 'photo_uri', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'goal_id', type: 'string', isOptional: true },
        { name: 'tags', type: 'string' }, // JSON array
        { name: 'location', type: 'string', isOptional: true },
        { name: 'metadata', type: 'string' }, // JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // Entities (tags, people, places)
    tableSchema({
      name: 'entities',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string', isIndexed: true }, // 'tag' | 'person' | 'place'
        { name: 'key', type: 'string', isIndexed: true },
        { name: 'display_name', type: 'string' },
        { name: 'metadata', type: 'string' }, // JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // External event links (calendar integrations)
    tableSchema({
      name: 'external_event_links',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'entry_id', type: 'string', isIndexed: true },
        { name: 'provider', type: 'string' }, // 'google' | 'microsoft' | 'apple'
        { name: 'external_id', type: 'string', isIndexed: true },
        { name: 'calendar_id', type: 'string', isOptional: true },
        { name: 'etag', type: 'string', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'metadata', type: 'string' }, // JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
      ],
    }),

    // Pending captures (offline inbox queue)
    tableSchema({
      name: 'pending_captures',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'raw_text', type: 'string' },
        { name: 'status', type: 'string' }, // 'raw' | 'parsed' | 'needs_clarification'
        { name: 'attachments', type: 'string' }, // JSON array
        { name: 'tags', type: 'string' }, // JSON array
        { name: 'contexts', type: 'string' }, // JSON array
        { name: 'people', type: 'string' }, // JSON array
        { name: 'location', type: 'string', isOptional: true },
        { name: 'skills', type: 'string' }, // JSON array
        { name: 'character', type: 'string' }, // JSON array
        { name: 'goal_id', type: 'string', isOptional: true },
        { name: 'project_id', type: 'string', isOptional: true },
        { name: 'category', type: 'string', isOptional: true },
        { name: 'subcategory', type: 'string', isOptional: true },
        { name: 'estimate_minutes', type: 'number', isOptional: true },
        { name: 'importance', type: 'number', isOptional: true },
        { name: 'difficulty', type: 'number', isOptional: true },
        { name: 'points', type: 'number', isOptional: true },
        { name: 'processed_text', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),

    // Sync queue for offline operations
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'table_name', type: 'string', isIndexed: true },
        { name: 'record_id', type: 'string', isIndexed: true },
        { name: 'operation', type: 'string' }, // 'create' | 'update' | 'delete'
        { name: 'payload', type: 'string' }, // JSON
        { name: 'status', type: 'string', isIndexed: true }, // 'pending' | 'in_progress' | 'failed' | 'completed'
        { name: 'retry_count', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'next_retry_at', type: 'number', isOptional: true, isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Attachments table
    tableSchema({
      name: 'attachments',
      columns: [
        { name: 'remote_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'entry_id', type: 'string', isIndexed: true },
        { name: 'bucket', type: 'string' },
        { name: 'path', type: 'string' },
        { name: 'mime_type', type: 'string', isOptional: true },
        { name: 'byte_size', type: 'number', isOptional: true },
        { name: 'local_uri', type: 'string', isOptional: true },
        { name: 'upload_status', type: 'string' }, // 'pending' | 'uploading' | 'uploaded' | 'failed'
        { name: 'metadata', type: 'string' }, // JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),
  ],
});

// Sync status enum
export const SyncStatus = {
  SYNCED: 'synced',
  PENDING: 'pending',
  CONFLICT: 'conflict',
} as const;

export type SyncStatusType = (typeof SyncStatus)[keyof typeof SyncStatus];

// Table names for type safety
export const TableNames = {
  ENTRIES: 'entries',
  GOALS: 'goals',
  PROJECTS: 'projects',
  HABIT_DEFINITIONS: 'habit_definitions',
  HABIT_INSTANCES: 'habit_instances',
  TRACKER_DEFINITIONS: 'tracker_definitions',
  TRACKER_LOGS: 'tracker_logs',
  WORKOUT_SESSIONS: 'workout_sessions',
  WORKOUT_ROWS: 'workout_rows',
  NUTRITION_LOGS: 'nutrition_logs',
  ENTITIES: 'entities',
  EXTERNAL_EVENT_LINKS: 'external_event_links',
  PENDING_CAPTURES: 'pending_captures',
  SYNC_QUEUE: 'sync_queue',
  ATTACHMENTS: 'attachments',
} as const;

export type TableName = (typeof TableNames)[keyof typeof TableNames];
