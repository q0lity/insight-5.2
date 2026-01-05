// Tool Registry for InSight Claude Agent
// Implements Advanced Tool Use patterns: Tool Search, Programmatic Calling, Examples

import type {
  ToolDefinition,
  ServerTool,
  ToolCategory,
  RegisteredTool,
} from './types.ts';

// =============================================================================
// Server Tools (Tool Search & Code Execution)
// =============================================================================

export const SERVER_TOOLS: ServerTool[] = [
  {
    type: 'tool_search_tool_bm25_20251119',
    name: 'tool_search',
  },
  {
    type: 'code_execution_20250825',
    name: 'code_execution',
  },
];

// =============================================================================
// Always-Loaded Tools (3 core tools - always in context)
// =============================================================================

export const ALWAYS_LOADED_TOOLS: ToolDefinition[] = [
  // 1. Get Current Context
  {
    name: 'get_current_context',
    description:
      "Get the current user context including active entry, running timers, today's goals, and recent activity. Use this first to understand what the user is working on before taking other actions.",
    input_schema: {
      type: 'object',
      properties: {
        include_recent_entries: {
          type: 'boolean',
          description: 'Include last 5 entries (default: true)',
          default: true,
        },
        include_active_timers: {
          type: 'boolean',
          description: 'Include any running timers (default: true)',
          default: true,
        },
        include_goals: {
          type: 'boolean',
          description: 'Include active goals (default: false)',
          default: false,
        },
      },
    },
    input_examples: [
      {
        description: 'Full context check before processing voice input',
        input: { include_recent_entries: true, include_active_timers: true, include_goals: true },
      },
      {
        description: 'Quick status check',
        input: {},
      },
    ],
  },

  // 2. Parse Voice Capture
  {
    name: 'parse_voice_capture',
    description:
      'Parse voice transcription into structured entries, tasks, and trackers. Primary tool for voice-first input. Extracts #tracker(value) tokens, task patterns, and event information.',
    input_schema: {
      type: 'object',
      properties: {
        transcript: {
          type: 'string',
          description: 'The transcribed voice input text',
        },
        anchor_timestamp: {
          type: 'string',
          description: 'ISO timestamp for time reference (defaults to now)',
        },
        context: {
          type: 'object',
          description: 'Optional context about current activity',
          properties: {
            active_entry_id: { type: 'string' },
            active_goal_ids: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['transcript'],
    },
    input_examples: [
      {
        description: 'Parse workout completion with trackers',
        input: {
          transcript:
            'Just finished chest day, did 4 sets of bench at 225, feeling great #mood(8) #energy(7)',
          anchor_timestamp: '2025-01-04T10:30:00-05:00',
        },
      },
      {
        description: 'Parse task creation from natural speech',
        input: {
          transcript: 'I need to remember to call mom tomorrow and pick up groceries on the way home',
        },
      },
      {
        description: 'Parse with active context',
        input: {
          transcript: 'taking a quick break, #stress(6)',
          context: { active_entry_id: '550e8400-e29b-41d4-a716-446655440000' },
        },
      },
    ],
  },

  // 3. Quick Log
  {
    name: 'quick_log',
    description:
      'Fast logging for single tracker, quick note, or simple task. Use for atomic, single-item inputs that don\'t need full parsing.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['tracker', 'note', 'task'],
          description: 'Type of item to log',
        },
        tracker_key: {
          type: 'string',
          description: 'For tracker type: the tracker key (e.g., "mood", "energy", "stress")',
        },
        value: {
          type: 'number',
          description: 'For tracker type: the numeric value (typically 1-10 scale)',
        },
        text: {
          type: 'string',
          description: 'For note/task type: the content text',
        },
        entry_id: {
          type: 'string',
          description: 'Optional: link to existing entry',
        },
      },
      required: ['type'],
    },
    input_examples: [
      {
        description: 'Log mood tracker',
        input: { type: 'tracker', tracker_key: 'mood', value: 7 },
      },
      {
        description: 'Quick task creation',
        input: { type: 'task', text: 'Buy milk on the way home' },
      },
      {
        description: 'Quick note linked to entry',
        input: {
          type: 'note',
          text: 'Good progress on the report',
          entry_id: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
    ],
  },
];

// =============================================================================
// Deferred Tools (Loaded on-demand via Tool Search)
// =============================================================================

export const DEFERRED_TOOLS: ToolDefinition[] = [
  // ---------------------------------------------------------------------------
  // ENTRIES CATEGORY
  // ---------------------------------------------------------------------------
  {
    name: 'query_entries',
    description:
      'Query entries from the database with filters. Returns tasks, events, habits, and notes matching the specified criteria. Supports filtering by facets, status, date range, and tags.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        facets: {
          type: 'array',
          items: { type: 'string', enum: ['task', 'event', 'habit', 'tracker', 'note'] },
          description: 'Filter by entry facets (task, event, habit, tracker, note)',
        },
        status: {
          type: 'string',
          enum: ['open', 'in_progress', 'done', 'canceled'],
          description: 'Filter tasks by status',
        },
        date_range: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'ISO date YYYY-MM-DD or full timestamp' },
            end: { type: 'string', description: 'ISO date YYYY-MM-DD or full timestamp' },
          },
          description: 'Filter by date range',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags (supports hierarchical tags like "health/fitness")',
        },
        goal_id: {
          type: 'string',
          description: 'Filter by linked goal UUID',
        },
        project_id: {
          type: 'string',
          description: 'Filter by linked project UUID',
        },
        limit: {
          type: 'integer',
          description: 'Maximum results to return (default: 50, max: 200)',
          default: 50,
        },
        offset: {
          type: 'integer',
          description: 'Offset for pagination',
          default: 0,
        },
      },
    },
    input_examples: [
      {
        description: "Get this week's completed tasks",
        input: {
          facets: ['task'],
          status: 'done',
          date_range: { start: '2025-01-01', end: '2025-01-07' },
          limit: 20,
        },
      },
      {
        description: 'Find all workout events with health tag',
        input: {
          facets: ['event'],
          tags: ['health/fitness'],
          limit: 30,
        },
      },
      {
        description: 'Get open tasks (minimal query)',
        input: {
          facets: ['task'],
          status: 'open',
        },
      },
    ],
  },

  {
    name: 'create_entry',
    description:
      'Create a new entry in the database. Supports tasks, events, habits, and notes with full metadata including goals, projects, difficulty, and importance scoring.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Entry title (required)' },
        facets: {
          type: 'array',
          items: { type: 'string', enum: ['task', 'event', 'habit', 'tracker', 'note'] },
          description: 'Entry facets - can be multiple (e.g., ["event", "habit"])',
        },
        body_markdown: { type: 'string', description: 'Markdown content/notes for the entry' },
        start_at: { type: 'string', description: 'ISO timestamp for start time (for events)' },
        end_at: { type: 'string', description: 'ISO timestamp for end time (for events)' },
        scheduled_at: { type: 'string', description: 'ISO timestamp for when task is scheduled' },
        due_at: { type: 'string', description: 'ISO timestamp for task deadline' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
        contexts: { type: 'array', items: { type: 'string' }, description: 'Context tags (e.g., @home, @work)' },
        people: { type: 'array', items: { type: 'string' }, description: 'People mentioned/involved' },
        difficulty: { type: 'integer', minimum: 1, maximum: 10, description: 'Difficulty score 1-10' },
        importance: { type: 'integer', minimum: 1, maximum: 10, description: 'Importance score 1-10' },
        goal_ids: { type: 'array', items: { type: 'string' }, description: 'Link to goal UUIDs' },
        project_ids: { type: 'array', items: { type: 'string' }, description: 'Link to project UUIDs' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Task priority' },
      },
      required: ['title'],
    },
    input_examples: [
      {
        description: 'Create a workout event linked to health goal',
        input: {
          title: 'Chest Day Workout',
          facets: ['event', 'habit'],
          start_at: '2025-01-04T10:00:00-05:00',
          end_at: '2025-01-04T11:00:00-05:00',
          tags: ['health/fitness', 'strength/chest'],
          difficulty: 7,
          importance: 8,
        },
      },
      {
        description: 'Create a high-priority work task',
        input: {
          title: 'Review quarterly report',
          facets: ['task'],
          tags: ['work'],
          difficulty: 5,
          importance: 9,
          priority: 'high',
          due_at: '2025-01-05T17:00:00-05:00',
        },
      },
      {
        description: 'Create a simple note',
        input: {
          title: 'Meeting notes',
          facets: ['note'],
          body_markdown: '## Key points\n- Item 1\n- Item 2',
        },
      },
    ],
  },

  {
    name: 'update_entry',
    description: 'Update an existing entry. Can modify any field including status, content, metadata.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        entry_id: { type: 'string', description: 'UUID of the entry to update' },
        title: { type: 'string' },
        status: { type: 'string', enum: ['open', 'in_progress', 'done', 'canceled'] },
        body_markdown: { type: 'string' },
        start_at: { type: 'string' },
        end_at: { type: 'string' },
        completed_at: { type: 'string', description: 'Set when marking as done' },
        tags: { type: 'array', items: { type: 'string' } },
        difficulty: { type: 'integer', minimum: 1, maximum: 10 },
        importance: { type: 'integer', minimum: 1, maximum: 10 },
      },
      required: ['entry_id'],
    },
    input_examples: [
      {
        description: 'Mark task as complete',
        input: {
          entry_id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'done',
          completed_at: '2025-01-04T15:30:00-05:00',
        },
      },
      {
        description: 'Update event end time',
        input: {
          entry_id: '550e8400-e29b-41d4-a716-446655440000',
          end_at: '2025-01-04T12:00:00-05:00',
        },
      },
    ],
  },

  {
    name: 'delete_entry',
    description: 'Soft delete an entry (sets deleted_at timestamp). Entry can be recovered later.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        entry_id: { type: 'string', description: 'UUID of the entry to delete' },
        permanent: { type: 'boolean', description: 'If true, hard delete (default: false)', default: false },
      },
      required: ['entry_id'],
    },
    input_examples: [
      {
        description: 'Soft delete entry',
        input: { entry_id: '550e8400-e29b-41d4-a716-446655440000' },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // TRACKERS CATEGORY
  // ---------------------------------------------------------------------------
  {
    name: 'batch_log_trackers',
    description:
      'Log multiple tracker values at once. Efficient for voice inputs with multiple #tracker(value) tokens. Creates missing tracker definitions automatically.',
    defer_loading: true,
    allowed_callers: ['code_execution_20250825'], // Programmatic only - batch operation
    input_schema: {
      type: 'object',
      properties: {
        logs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tracker_key: { type: 'string', description: 'Tracker key (e.g., "mood", "energy")' },
              value: { type: 'number', description: 'Numeric value' },
              occurred_at: { type: 'string', description: 'ISO timestamp (defaults to now)' },
              entry_id: { type: 'string', description: 'Optional linked entry UUID' },
            },
            required: ['tracker_key', 'value'],
          },
          description: 'Array of tracker logs to create',
        },
      },
      required: ['logs'],
    },
    input_examples: [
      {
        description: 'Log mood, energy, and stress together from voice input',
        input: {
          logs: [
            { tracker_key: 'mood', value: 8, occurred_at: '2025-01-04T10:00:00Z' },
            { tracker_key: 'energy', value: 7, occurred_at: '2025-01-04T10:00:00Z' },
            { tracker_key: 'stress', value: 3, occurred_at: '2025-01-04T10:00:00Z' },
          ],
        },
      },
    ],
  },

  {
    name: 'query_tracker_logs',
    description: 'Query tracker log history with filters. Useful for trends and analytics.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        tracker_keys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tracker keys',
        },
        date_range: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
          },
        },
        entry_id: { type: 'string', description: 'Filter by linked entry' },
        limit: { type: 'integer', default: 100 },
      },
    },
    input_examples: [
      {
        description: 'Get mood logs for past week',
        input: {
          tracker_keys: ['mood'],
          date_range: { start: '2025-01-01', end: '2025-01-07' },
        },
      },
    ],
  },

  {
    name: 'create_tracker_definition',
    description: 'Create a new tracker type definition with custom settings.',
    defer_loading: true,
    allowed_callers: ['direct'],
    input_schema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Unique tracker key (lowercase, no spaces)' },
        display_name: { type: 'string', description: 'Human-readable name' },
        value_type: {
          type: 'string',
          enum: ['number', 'scale', 'boolean', 'text', 'duration'],
          description: 'Type of values this tracker accepts',
        },
        min_value: { type: 'number', description: 'Minimum value (for number/scale)' },
        max_value: { type: 'number', description: 'Maximum value (for number/scale)' },
        unit: { type: 'string', description: 'Unit label (e.g., "cups", "minutes")' },
        color: { type: 'string', description: 'Hex color for UI display' },
      },
      required: ['key', 'display_name', 'value_type'],
    },
    input_examples: [
      {
        description: 'Create water intake tracker',
        input: {
          key: 'water',
          display_name: 'Water Intake',
          value_type: 'number',
          min_value: 0,
          max_value: 20,
          unit: 'cups',
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // WORKOUTS CATEGORY
  // ---------------------------------------------------------------------------
  {
    name: 'log_workout',
    description:
      'Log a workout session with exercises, sets, reps, and weights. Creates workout_session and workout_rows records.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        template_type: {
          type: 'string',
          enum: ['strength', 'cardio', 'mobility', 'custom'],
          description: 'Type of workout',
        },
        started_at: { type: 'string', description: 'ISO timestamp for start' },
        ended_at: { type: 'string', description: 'ISO timestamp for end' },
        notes: { type: 'string', description: 'Workout notes' },
        exercises: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Exercise name' },
              sets: { type: 'integer' },
              reps: { type: 'integer' },
              weight: { type: 'number' },
              weight_unit: { type: 'string', enum: ['lb', 'kg'] },
              duration_seconds: { type: 'integer', description: 'For cardio/timed exercises' },
              distance: { type: 'number', description: 'For cardio' },
              distance_unit: { type: 'string', enum: ['mi', 'km', 'm'] },
            },
            required: ['name'],
          },
        },
        entry_id: { type: 'string', description: 'Link to parent entry' },
      },
      required: ['template_type', 'started_at'],
    },
    input_examples: [
      {
        description: 'Log chest day strength workout',
        input: {
          template_type: 'strength',
          started_at: '2025-01-04T10:00:00-05:00',
          ended_at: '2025-01-04T11:00:00-05:00',
          exercises: [
            { name: 'Bench Press', sets: 4, reps: 8, weight: 225, weight_unit: 'lb' },
            { name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 70, weight_unit: 'lb' },
            { name: 'Cable Flyes', sets: 3, reps: 12, weight: 30, weight_unit: 'lb' },
          ],
        },
      },
      {
        description: 'Log cardio session',
        input: {
          template_type: 'cardio',
          started_at: '2025-01-04T07:00:00-05:00',
          ended_at: '2025-01-04T07:30:00-05:00',
          exercises: [{ name: 'Running', duration_seconds: 1800, distance: 3.1, distance_unit: 'mi' }],
        },
      },
    ],
  },

  {
    name: 'query_workouts',
    description: 'Query workout history with filters and aggregations.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        template_type: { type: 'string', enum: ['strength', 'cardio', 'mobility', 'custom'] },
        date_range: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
          },
        },
        exercise_name: { type: 'string', description: 'Filter by specific exercise' },
        include_rows: { type: 'boolean', description: 'Include exercise details', default: true },
        limit: { type: 'integer', default: 20 },
      },
    },
    input_examples: [
      {
        description: 'Get all bench press history',
        input: {
          template_type: 'strength',
          exercise_name: 'Bench Press',
          date_range: { start: '2024-12-01', end: '2025-01-07' },
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // NUTRITION CATEGORY
  // ---------------------------------------------------------------------------
  {
    name: 'log_nutrition',
    description: 'Log a nutrition entry with macros and optional micronutrients.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
        description: { type: 'string', description: 'Meal description' },
        calories: { type: 'number' },
        protein: { type: 'number', description: 'Grams of protein' },
        carbs: { type: 'number', description: 'Grams of carbohydrates' },
        fat: { type: 'number', description: 'Grams of fat' },
        fiber: { type: 'number', description: 'Grams of fiber' },
        sugar: { type: 'number', description: 'Grams of sugar' },
        sodium: { type: 'number', description: 'Milligrams of sodium' },
        occurred_at: { type: 'string', description: 'ISO timestamp' },
        entry_id: { type: 'string', description: 'Link to parent entry' },
      },
      required: ['meal_type'],
    },
    input_examples: [
      {
        description: 'Log lunch with macros',
        input: {
          meal_type: 'lunch',
          description: 'Grilled chicken salad with avocado',
          calories: 550,
          protein: 45,
          carbs: 20,
          fat: 32,
          fiber: 8,
        },
      },
    ],
  },

  {
    name: 'query_nutrition',
    description: 'Query nutrition logs with aggregations for daily/weekly totals.',
    defer_loading: true,
    allowed_callers: ['code_execution_20250825'], // Programmatic - aggregation
    input_schema: {
      type: 'object',
      properties: {
        date_range: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
          },
        },
        meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
        aggregate_by: { type: 'string', enum: ['day', 'week', 'none'], default: 'none' },
      },
    },
    input_examples: [
      {
        description: 'Get daily nutrition totals for past week',
        input: {
          date_range: { start: '2025-01-01', end: '2025-01-07' },
          aggregate_by: 'day',
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // GOALS CATEGORY
  // ---------------------------------------------------------------------------
  {
    name: 'list_goals',
    description: 'List user goals with optional filtering by status and tags.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        archived: { type: 'boolean', description: 'Include archived goals', default: false },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
        importance_min: { type: 'integer', minimum: 1, maximum: 10 },
      },
    },
    input_examples: [
      {
        description: 'Get active health goals',
        input: { archived: false, tags: ['health'] },
      },
      {
        description: 'Get high-priority goals',
        input: { importance_min: 8 },
      },
    ],
  },

  {
    name: 'create_goal',
    description: 'Create a new goal with importance scoring.',
    defer_loading: true,
    allowed_callers: ['direct'],
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        importance: { type: 'integer', minimum: 1, maximum: 10, description: 'Goal importance 1-10' },
        tags: { type: 'array', items: { type: 'string' } },
        target_date: { type: 'string', description: 'ISO date for goal target' },
      },
      required: ['title', 'importance'],
    },
    input_examples: [
      {
        description: 'Create fitness goal',
        input: {
          title: 'Bench press 250 lbs',
          description: 'Increase bench press max from 225 to 250 lbs',
          importance: 8,
          tags: ['health/fitness', 'strength'],
          target_date: '2025-06-01',
        },
      },
    ],
  },

  {
    name: 'update_goal_progress',
    description: 'Update progress on a goal or archive it.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        goal_id: { type: 'string' },
        archived: { type: 'boolean' },
        notes: { type: 'string', description: 'Progress notes to append' },
      },
      required: ['goal_id'],
    },
    input_examples: [
      {
        description: 'Archive completed goal',
        input: {
          goal_id: '550e8400-e29b-41d4-a716-446655440000',
          archived: true,
          notes: 'Achieved on Jan 4, 2025!',
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // PROJECTS CATEGORY
  // ---------------------------------------------------------------------------
  {
    name: 'list_projects',
    description: 'List user projects with optional filtering.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'paused', 'completed', 'archived'] },
        goal_id: { type: 'string', description: 'Filter by linked goal' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
    input_examples: [
      {
        description: 'Get active projects',
        input: { status: 'active' },
      },
    ],
  },

  {
    name: 'create_project',
    description: 'Create a new project, optionally linked to a goal.',
    defer_loading: true,
    allowed_callers: ['direct'],
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        goal_id: { type: 'string', description: 'Link to parent goal' },
        importance: { type: 'integer', minimum: 1, maximum: 10 },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['title'],
    },
    input_examples: [
      {
        description: 'Create work project',
        input: {
          title: 'Q1 Report',
          description: 'Quarterly business report',
          importance: 9,
          tags: ['work'],
        },
      },
    ],
  },

  {
    name: 'link_entry_to_project',
    description: 'Link an entry to a project (many-to-many relationship).',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        entry_id: { type: 'string' },
        project_id: { type: 'string' },
      },
      required: ['entry_id', 'project_id'],
    },
    input_examples: [
      {
        description: 'Link task to project',
        input: {
          entry_id: '550e8400-e29b-41d4-a716-446655440000',
          project_id: '660e8400-e29b-41d4-a716-446655440001',
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // SEARCH CATEGORY
  // ---------------------------------------------------------------------------
  {
    name: 'semantic_search',
    description:
      'Search entries using natural language query. Uses vector embeddings for semantic matching. Best for finding entries by meaning rather than exact keywords.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query' },
        facets: {
          type: 'array',
          items: { type: 'string', enum: ['task', 'event', 'habit', 'tracker', 'note'] },
          description: 'Limit search to specific facets',
        },
        limit: { type: 'integer', default: 10 },
        similarity_threshold: { type: 'number', description: 'Minimum similarity score 0-1', default: 0.7 },
      },
      required: ['query'],
    },
    input_examples: [
      {
        description: 'Find productive work sessions',
        input: { query: 'times I was really productive at work', limit: 5 },
      },
      {
        description: 'Search for stress-related entries',
        input: { query: 'feeling stressed or overwhelmed', facets: ['note', 'event'] },
      },
    ],
  },

  {
    name: 'search_by_tags',
    description: 'Search entries by tags with AND/OR logic.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
        match_all: { type: 'boolean', description: 'If true, match all tags (AND). Otherwise any (OR)', default: false },
        facets: { type: 'array', items: { type: 'string', enum: ['task', 'event', 'habit', 'tracker', 'note'] } },
        limit: { type: 'integer', default: 50 },
      },
      required: ['tags'],
    },
    input_examples: [
      {
        description: 'Find health + fitness entries',
        input: { tags: ['health', 'fitness'], match_all: true },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // ANALYTICS CATEGORY
  // ---------------------------------------------------------------------------
  {
    name: 'get_daily_summary',
    description: 'Get summary statistics for a specific day including entries, trackers, and completions.',
    defer_loading: true,
    allowed_callers: ['code_execution_20250825'], // Programmatic - aggregation
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
      },
      required: ['date'],
    },
    input_examples: [
      {
        description: "Get today's summary",
        input: { date: '2025-01-04' },
      },
    ],
  },

  {
    name: 'get_streak_stats',
    description: 'Get streak statistics for habits.',
    defer_loading: true,
    allowed_callers: ['code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        habit_ids: { type: 'array', items: { type: 'string' }, description: 'Specific habits to check' },
      },
    },
    input_examples: [
      {
        description: 'Get all habit streaks',
        input: {},
      },
    ],
  },

  {
    name: 'calculate_xp',
    description: 'Calculate XP earned for entries based on difficulty, importance, and duration.',
    defer_loading: true,
    allowed_callers: ['code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        entry_ids: { type: 'array', items: { type: 'string' } },
        date_range: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
          },
        },
      },
    },
    input_examples: [
      {
        description: "Calculate XP for this week's completed entries",
        input: { date_range: { start: '2025-01-01', end: '2025-01-07' } },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // CALENDAR CATEGORY
  // ---------------------------------------------------------------------------
  {
    name: 'get_scheduled_entries',
    description: 'Get entries scheduled for a date range (for calendar view).',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        date_range: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
          },
          required: ['start', 'end'],
        },
        include_completed: { type: 'boolean', default: true },
      },
      required: ['date_range'],
    },
    input_examples: [
      {
        description: "Get this week's scheduled entries",
        input: { date_range: { start: '2025-01-06', end: '2025-01-12' } },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // BULK OPERATIONS (Programmatic-Only)
  // ---------------------------------------------------------------------------
  {
    name: 'bulk_update_entries',
    description: 'Update multiple entries at once. Efficient for batch operations.',
    defer_loading: true,
    allowed_callers: ['code_execution_20250825'], // Programmatic only
    input_schema: {
      type: 'object',
      properties: {
        entry_ids: { type: 'array', items: { type: 'string' } },
        updates: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['open', 'in_progress', 'done', 'canceled'] },
            tags: { type: 'array', items: { type: 'string' } },
            add_tags: { type: 'array', items: { type: 'string' } },
            remove_tags: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['entry_ids', 'updates'],
    },
    input_examples: [
      {
        description: 'Mark multiple tasks as done',
        input: {
          entry_ids: ['id1', 'id2', 'id3'],
          updates: { status: 'done' },
        },
      },
    ],
  },

  {
    name: 'aggregate_tracker_data',
    description: 'Compute aggregate statistics across tracker logs.',
    defer_loading: true,
    allowed_callers: ['code_execution_20250825'], // Programmatic only
    input_schema: {
      type: 'object',
      properties: {
        tracker_keys: { type: 'array', items: { type: 'string' } },
        date_range: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
          },
        },
        aggregation: {
          type: 'string',
          enum: ['average', 'sum', 'min', 'max', 'count'],
          default: 'average',
        },
        group_by: {
          type: 'string',
          enum: ['day', 'week', 'month', 'none'],
          default: 'day',
        },
      },
      required: ['tracker_keys', 'date_range'],
    },
    input_examples: [
      {
        description: 'Get daily mood averages for past month',
        input: {
          tracker_keys: ['mood'],
          date_range: { start: '2024-12-04', end: '2025-01-04' },
          aggregation: 'average',
          group_by: 'day',
        },
      },
    ],
  },
];

// =============================================================================
// Registry Helper Functions
// =============================================================================

/**
 * Get all tools formatted for the API request
 */
export function getAllTools(): (ToolDefinition | ServerTool)[] {
  return [
    ...SERVER_TOOLS,
    ...ALWAYS_LOADED_TOOLS,
    ...DEFERRED_TOOLS,
  ];
}

/**
 * Get tool by name
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return [...ALWAYS_LOADED_TOOLS, ...DEFERRED_TOOLS].find((t) => t.name === name);
}

/**
 * Get tools by category (for organization)
 */
export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  const categoryMap: Record<ToolCategory, string[]> = {
    context: ['get_current_context', 'parse_voice_capture', 'quick_log'],
    entries: ['query_entries', 'create_entry', 'update_entry', 'delete_entry', 'bulk_update_entries'],
    trackers: ['batch_log_trackers', 'query_tracker_logs', 'create_tracker_definition', 'aggregate_tracker_data'],
    workouts: ['log_workout', 'query_workouts'],
    nutrition: ['log_nutrition', 'query_nutrition'],
    goals: ['list_goals', 'create_goal', 'update_goal_progress'],
    projects: ['list_projects', 'create_project', 'link_entry_to_project'],
    calendar: ['get_scheduled_entries'],
    search: ['semantic_search', 'search_by_tags'],
    analytics: ['get_daily_summary', 'get_streak_stats', 'calculate_xp'],
  };

  const toolNames = categoryMap[category] ?? [];
  return [...ALWAYS_LOADED_TOOLS, ...DEFERRED_TOOLS].filter((t) => toolNames.includes(t.name));
}

/**
 * Get only always-loaded tool names (for logging/debugging)
 */
export function getAlwaysLoadedToolNames(): string[] {
  return ALWAYS_LOADED_TOOLS.map((t) => t.name);
}

/**
 * Get only deferred tool names
 */
export function getDeferredToolNames(): string[] {
  return DEFERRED_TOOLS.map((t) => t.name);
}

/**
 * Get programmatic-only tool names
 */
export function getProgrammaticOnlyToolNames(): string[] {
  return DEFERRED_TOOLS.filter(
    (t) => t.allowed_callers?.length === 1 && t.allowed_callers[0] === 'code_execution_20250825'
  ).map((t) => t.name);
}
