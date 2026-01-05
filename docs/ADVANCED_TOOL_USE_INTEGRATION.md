# Anthropic Advanced Tool Use Integration Guide

> Reference documentation for implementing Anthropic's Advanced Tool Use features in InSight
> Source: https://www.anthropic.com/engineering/advanced-tool-use

---

## Table of Contents

1. [Overview](#overview)
2. [Beta Header Configuration](#beta-header-configuration)
3. [Feature 1: Tool Search Tool](#feature-1-tool-search-tool)
4. [Feature 2: Programmatic Tool Calling](#feature-2-programmatic-tool-calling)
5. [Feature 3: Tool Use Examples](#feature-3-tool-use-examples)
6. [InSight-Specific Tool Definitions](#insight-specific-tool-definitions)
7. [Supabase Edge Function Template](#supabase-edge-function-template)
8. [Response Handling](#response-handling)
9. [Best Practices](#best-practices)

---

## Overview

Anthropic's Advanced Tool Use provides three features to optimize Claude's tool interactions:

| Feature | Purpose | Key Benefit |
|---------|---------|-------------|
| **Tool Search Tool** | Dynamically discover tools on-demand | 85% token reduction |
| **Programmatic Tool Calling** | Execute multiple tools via code | 37% faster on complex tasks |
| **Tool Use Examples** | Demonstrate correct parameter usage | Accuracy: 72% → 90% |

### When to Use Each Feature

```
Tool Search Tool:
├── Tool definitions consume >10K tokens
├── 10+ tools available
└── Tool selection accuracy issues

Programmatic Tool Calling:
├── Processing large datasets for summaries
├── Multi-step workflows with 3+ dependent calls
├── Filtering/transforming results before Claude sees them
└── Parallel operations across many items

Tool Use Examples:
├── Complex parameter formats (dates, IDs, nested objects)
├── Optional parameter correlations
└── Ambiguous cases not obvious from schema
```

---

## Beta Header Configuration

**Required header for all Advanced Tool Use features:**

```typescript
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': ANTHROPIC_API_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-beta': 'advanced-tool-use-2025-11-20'
};
```

### Deno (Supabase Edge Functions)

```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'advanced-tool-use-2025-11-20',
  },
  body: JSON.stringify(requestBody),
});
```

### Node.js / TypeScript

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Beta features enabled via betas array
const response = await client.beta.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  betas: ['advanced-tool-use-2025-11-20'],
  tools: [...],
  messages: [...],
});
```

---

## Feature 1: Tool Search Tool

### Concept

Instead of loading all tool definitions upfront (consuming tokens), mark tools with `defer_loading: true` and let Claude search for relevant tools on-demand.

### Configuration

```typescript
// Add server tool for search
const serverTools = [
  {
    type: 'tool_search_tool_bm25_20251119', // or 'tool_search_tool_regex_20251119'
    name: 'tool_search',
  }
];

// Mark tools as deferred
const tools = [
  {
    name: 'query_entries',
    description: 'Query entries from the database with filters',
    input_schema: { /* ... */ },
    defer_loading: true,  // <-- Key flag
  },
  // Always-loaded tools (no defer_loading)
  {
    name: 'get_current_context',
    description: 'Get current user context',
    input_schema: { /* ... */ },
    // No defer_loading = always in context
  }
];

// Combine in request
const requestBody = {
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  tools: [...serverTools, ...tools],
  messages: [{ role: 'user', content: prompt }],
};
```

### Search Types

| Type | Best For |
|------|----------|
| `tool_search_tool_regex_20251119` | Simple keyword matching |
| `tool_search_tool_bm25_20251119` | Better relevance ranking (recommended) |
| Custom embedding | Semantic similarity (requires your own implementation) |

### Response Handling

When Claude searches for tools, you'll receive:

```typescript
// Claude's response includes tool_reference blocks
{
  type: 'tool_search_tool_result',
  tool_use_id: 'toolu_xxx',
  content: {
    type: 'tool_search_tool_search_result',
    tool_references: [
      { type: 'tool_reference', tool_name: 'query_entries' },
      { type: 'tool_reference', tool_name: 'create_entry' },
    ]
  }
}
```

The API automatically expands referenced tools for the next turn.

### Strategy: Always-Loaded vs Deferred

```typescript
// Always loaded (3-5 core tools)
const ALWAYS_LOADED = [
  'get_current_context',    // Always need context
  'parse_voice_capture',    // Core voice flow
  'quick_log',              // High-frequency operation
];

// Deferred (load on-demand)
const DEFERRED = [
  'query_entries',
  'create_entry',
  'update_entry',
  'batch_log_trackers',
  'log_workout',
  'log_nutrition',
  'semantic_search',
  // ... 20+ more tools
];
```

---

## Feature 2: Programmatic Tool Calling

### Concept

Allow Claude to write Python code that calls multiple tools, executing in a sandbox without consuming Claude's context for intermediate results.

### Configuration

```typescript
// Add code execution server tool
const serverTools = [
  {
    type: 'code_execution_20250825',
    name: 'code_execution',
  }
];

// Mark tools as callable from code
const tools = [
  {
    name: 'batch_log_trackers',
    description: 'Log multiple tracker values at once',
    input_schema: { /* ... */ },
    allowed_callers: ['code_execution_20250825'],  // <-- Key flag
  },
  {
    name: 'query_entries',
    description: 'Query entries from the database',
    input_schema: { /* ... */ },
    allowed_callers: ['direct', 'code_execution_20250825'],  // Both modes
  }
];
```

### How It Works

```
1. Claude generates Python code with tool calls
2. Code executes in Anthropic's sandbox
3. Tools are called without hitting Claude's context
4. Only final results returned to Claude
5. Claude summarizes for user
```

### Response Structure

```typescript
// Claude generates code that calls tools
{
  type: 'tool_use',
  id: 'toolu_code_xxx',
  name: 'code_execution',
  input: {
    code: `
import asyncio

async def main():
    # Query last 7 days of entries
    entries = await query_entries({
        'date_range': {'start': '2025-01-01', 'end': '2025-01-07'},
        'facets': ['task']
    })

    # Process and aggregate
    completed = [e for e in entries if e['status'] == 'done']

    return {
        'total': len(entries),
        'completed': len(completed),
        'completion_rate': len(completed) / len(entries) if entries else 0
    }

asyncio.run(main())
    `
  }
}

// Result comes back in container
{
  type: 'code_execution_tool_result',
  tool_use_id: 'toolu_code_xxx',
  content: {
    type: 'code_execution_result',
    stdout: '',
    stderr: '',
    return_code: 0,
    content: [
      { type: 'tool_result', tool_use_id: 'nested_xxx', content: '...' }
    ]
  }
}
```

### Container Lifecycle

```typescript
// Response includes container info for reuse
{
  container: {
    id: 'container_xxx',
    expires_at: '2025-01-04T12:00:00Z'  // ~5 minutes
  }
}

// Reuse container in follow-up requests
const followUpRequest = {
  container: response.container.id,
  messages: [...],
  // ...
};
```

### Best Use Cases for InSight

```typescript
// 1. Batch tracker logging from voice
// Voice: "mood 7, energy 8, stress 3, focus 6"
// Claude writes code to call batch_log_trackers once

// 2. Weekly summary generation
// Claude queries 7 days of entries, aggregates stats, returns summary

// 3. Goal progress calculation
// Claude queries entries linked to goal, calculates completion %

// 4. Workout analysis
// Claude queries workout_sessions, computes volume/frequency trends
```

---

## Feature 3: Tool Use Examples

### Concept

Provide 1-5 concrete examples showing how to use tool parameters correctly. Improves accuracy from 72% to 90% for complex parameters.

### Configuration

```typescript
const tool = {
  name: 'query_entries',
  description: 'Query entries from the database with filters',
  input_schema: {
    type: 'object',
    properties: {
      facets: {
        type: 'array',
        items: { type: 'string', enum: ['task', 'event', 'habit', 'tracker', 'note'] },
        description: 'Filter by entry facets',
      },
      date_range: {
        type: 'object',
        properties: {
          start: { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
          end: { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
        },
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by tags (hierarchical, e.g., "health/fitness")',
      },
      status: {
        type: 'string',
        enum: ['open', 'in_progress', 'done', 'canceled'],
      },
      limit: { type: 'integer', default: 50 },
    },
  },

  // Examples demonstrate correct usage
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
};
```

### What Examples Should Demonstrate

1. **Format conventions** - Date formats, ID patterns, naming styles
2. **Nested structure usage** - How to populate complex objects
3. **Optional parameter correlations** - Which optionals work together
4. **Minimal vs full specification** - Show both extremes

### Best Practices

```typescript
// DO: Use realistic data
input: {
  title: 'Chest Day Workout',
  tags: ['health/fitness', 'strength/chest'],
  start_at: '2025-01-04T10:00:00-05:00',
}

// DON'T: Use placeholder data
input: {
  title: 'string',
  tags: ['tag1', 'tag2'],
  start_at: 'datetime',
}

// DO: Show 1-5 examples covering different patterns
// DON'T: Show 10+ examples (diminishing returns)

// DO: Focus on ambiguous cases
// DON'T: Show obvious cases clear from schema
```

---

## InSight-Specific Tool Definitions

### Always-Loaded Tools (3)

```typescript
export const ALWAYS_LOADED_TOOLS = [
  {
    name: 'get_current_context',
    description: 'Get the current user context including active entry, running timers, today\'s goals, and recent activity. Use this first to understand what the user is working on.',
    input_schema: {
      type: 'object',
      properties: {
        include_recent_entries: {
          type: 'boolean',
          description: 'Include last 5 entries',
          default: true,
        },
        include_active_timers: {
          type: 'boolean',
          description: 'Include any running timers',
          default: true,
        },
      },
    },
    input_examples: [
      {
        description: 'Full context check',
        input: { include_recent_entries: true, include_active_timers: true },
      },
      {
        description: 'Quick status',
        input: {},
      },
    ],
  },

  {
    name: 'parse_voice_capture',
    description: 'Parse voice transcription into structured entries, tasks, trackers. Primary tool for voice-first input.',
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
      },
      required: ['transcript'],
    },
    input_examples: [
      {
        description: 'Workout completion with trackers',
        input: {
          transcript: 'Just finished chest day, 4 sets bench at 225, feeling #mood(8) #energy(7)',
          anchor_timestamp: '2025-01-04T10:30:00-05:00',
        },
      },
      {
        description: 'Task creation from speech',
        input: {
          transcript: 'I need to call mom tomorrow and pick up groceries',
        },
      },
    ],
  },

  {
    name: 'quick_log',
    description: 'Fast logging for single tracker or quick note. Use for simple, atomic inputs.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['tracker', 'note', 'task'],
        },
        tracker_key: {
          type: 'string',
          description: 'For tracker type: the tracker key (e.g., "mood", "energy")',
        },
        value: {
          type: 'number',
          description: 'For tracker type: the numeric value',
        },
        text: {
          type: 'string',
          description: 'For note/task type: the content',
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
        description: 'Quick task',
        input: { type: 'task', text: 'Buy milk' },
      },
    ],
  },
];
```

### Deferred Tools (Sample)

```typescript
export const DEFERRED_TOOLS = [
  // --- ENTRIES ---
  {
    name: 'query_entries',
    description: 'Query entries with filters. Returns tasks, events, habits, notes matching criteria.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        facets: {
          type: 'array',
          items: { type: 'string', enum: ['task', 'event', 'habit', 'tracker', 'note'] },
        },
        status: { type: 'string', enum: ['open', 'in_progress', 'done', 'canceled'] },
        date_range: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
          },
        },
        tags: { type: 'array', items: { type: 'string' } },
        limit: { type: 'integer', default: 50 },
      },
    },
    input_examples: [
      {
        description: 'Completed tasks this week',
        input: {
          facets: ['task'],
          status: 'done',
          date_range: { start: '2025-01-01', end: '2025-01-07' },
        },
      },
    ],
  },

  {
    name: 'create_entry',
    description: 'Create a new entry (task, event, habit, or note).',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        facets: {
          type: 'array',
          items: { type: 'string', enum: ['task', 'event', 'habit', 'tracker', 'note'] },
        },
        body_markdown: { type: 'string' },
        start_at: { type: 'string' },
        end_at: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        difficulty: { type: 'integer', minimum: 1, maximum: 10 },
        importance: { type: 'integer', minimum: 1, maximum: 10 },
        goal_ids: { type: 'array', items: { type: 'string' } },
        project_ids: { type: 'array', items: { type: 'string' } },
      },
      required: ['title'],
    },
    input_examples: [
      {
        description: 'Create workout event',
        input: {
          title: 'Chest Day Workout',
          facets: ['event', 'habit'],
          start_at: '2025-01-04T10:00:00-05:00',
          end_at: '2025-01-04T11:00:00-05:00',
          tags: ['health/fitness'],
          difficulty: 7,
          importance: 8,
        },
      },
    ],
  },

  // --- TRACKERS ---
  {
    name: 'batch_log_trackers',
    description: 'Log multiple tracker values at once. Efficient for voice inputs with multiple #tracker(value) tokens.',
    defer_loading: true,
    allowed_callers: ['code_execution_20250825'],  // Programmatic only
    input_schema: {
      type: 'object',
      properties: {
        logs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tracker_key: { type: 'string' },
              value: { type: 'number' },
              occurred_at: { type: 'string' },
              entry_id: { type: 'string' },
            },
            required: ['tracker_key', 'value'],
          },
        },
      },
      required: ['logs'],
    },
    input_examples: [
      {
        description: 'Log mood and energy together',
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

  // --- WORKOUTS ---
  {
    name: 'log_workout',
    description: 'Log a workout session with exercises, sets, reps, and weights.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        template_type: { type: 'string', enum: ['strength', 'cardio', 'mobility', 'custom'] },
        started_at: { type: 'string' },
        ended_at: { type: 'string' },
        notes: { type: 'string' },
        exercises: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              sets: { type: 'integer' },
              reps: { type: 'integer' },
              weight: { type: 'number' },
              weight_unit: { type: 'string', enum: ['lb', 'kg'] },
            },
          },
        },
      },
      required: ['template_type', 'started_at'],
    },
    input_examples: [
      {
        description: 'Log chest workout',
        input: {
          template_type: 'strength',
          started_at: '2025-01-04T10:00:00-05:00',
          ended_at: '2025-01-04T11:00:00-05:00',
          exercises: [
            { name: 'Bench Press', sets: 4, reps: 8, weight: 225, weight_unit: 'lb' },
            { name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 70, weight_unit: 'lb' },
          ],
        },
      },
    ],
  },

  // --- GOALS ---
  {
    name: 'list_goals',
    description: 'List user goals with optional filtering.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        archived: { type: 'boolean', default: false },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
    input_examples: [
      { description: 'Active goals', input: { archived: false } },
      { description: 'Health goals', input: { tags: ['health'] } },
    ],
  },

  // --- SEARCH ---
  {
    name: 'semantic_search',
    description: 'Search entries using natural language query. Uses vector embeddings for semantic matching.',
    defer_loading: true,
    allowed_callers: ['direct', 'code_execution_20250825'],
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query' },
        limit: { type: 'integer', default: 10 },
        facets: { type: 'array', items: { type: 'string' } },
      },
      required: ['query'],
    },
    input_examples: [
      {
        description: 'Find productive work sessions',
        input: { query: 'times I was really productive at work', limit: 5 },
      },
    ],
  },

  // --- ANALYTICS ---
  {
    name: 'get_daily_summary',
    description: 'Get summary statistics for a specific day.',
    defer_loading: true,
    allowed_callers: ['code_execution_20250825'],  // Programmatic only - aggregates data
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
      },
      required: ['date'],
    },
    input_examples: [
      { description: 'Today summary', input: { date: '2025-01-04' } },
    ],
  },
];
```

---

## Supabase Edge Function Template

### Complete Implementation Template

```typescript
// /supabase/functions/claude_agent/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  defer_loading?: boolean;
  allowed_callers?: string[];
  input_examples?: Array<{ description: string; input: Record<string, unknown> }>;
}

interface ServerTool {
  type: string;
  name: string;
}

// Tool Registry
const SERVER_TOOLS: ServerTool[] = [
  { type: 'tool_search_tool_bm25_20251119', name: 'tool_search' },
  { type: 'code_execution_20250825', name: 'code_execution' },
];

const ALWAYS_LOADED_TOOLS: ToolDefinition[] = [
  // ... (from above)
];

const DEFERRED_TOOLS: ToolDefinition[] = [
  // ... (from above)
];

// Helper: Build request body
function buildRequestBody(prompt: string, context: Record<string, unknown>) {
  const tools = [
    ...SERVER_TOOLS,
    ...ALWAYS_LOADED_TOOLS,
    ...DEFERRED_TOOLS.map(t => ({ ...t, defer_loading: true })),
  ];

  return {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: `You are Insight, a private life-tracking assistant. Current context: ${JSON.stringify(context)}`,
    tools,
    messages: [{ role: 'user', content: prompt }],
  };
}

// Helper: Execute tool against database
async function executeTool(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case 'get_current_context': {
      const { data: entries } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      return JSON.stringify({ recent_entries: entries ?? [] });
    }

    case 'query_entries': {
      let query = supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId);

      if (input.facets) {
        query = query.contains('facets', input.facets as string[]);
      }
      if (input.status) {
        query = query.eq('status', input.status);
      }
      if (input.date_range) {
        const range = input.date_range as { start?: string; end?: string };
        if (range.start) query = query.gte('created_at', range.start);
        if (range.end) query = query.lte('created_at', range.end);
      }

      const { data } = await query.limit((input.limit as number) || 50);
      return JSON.stringify(data ?? []);
    }

    case 'create_entry': {
      const { data, error } = await supabase
        .from('entries')
        .insert({
          user_id: userId,
          title: input.title,
          facets: input.facets || ['note'],
          body_markdown: input.body_markdown || '',
          start_at: input.start_at,
          end_at: input.end_at,
          tags: input.tags || [],
          difficulty: input.difficulty,
          importance: input.importance,
          source: 'claude_agent',
        })
        .select()
        .single();

      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data);
    }

    case 'batch_log_trackers': {
      const logs = input.logs as Array<{
        tracker_key: string;
        value: number;
        occurred_at?: string;
        entry_id?: string;
      }>;

      // Get or create tracker definitions
      const keys = [...new Set(logs.map(l => l.tracker_key))];
      const { data: definitions } = await supabase
        .from('tracker_definitions')
        .select('id, key')
        .eq('user_id', userId)
        .in('key', keys);

      const defMap = new Map((definitions ?? []).map(d => [d.key, d.id]));

      // Create missing definitions
      const missing = keys.filter(k => !defMap.has(k));
      if (missing.length) {
        const { data: created } = await supabase
          .from('tracker_definitions')
          .insert(missing.map(key => ({
            user_id: userId,
            key,
            display_name: key.charAt(0).toUpperCase() + key.slice(1),
            value_type: 'number',
          })))
          .select('id, key');

        (created ?? []).forEach(d => defMap.set(d.key, d.id));
      }

      // Insert logs
      const logRows = logs.map(log => ({
        user_id: userId,
        tracker_id: defMap.get(log.tracker_key),
        entry_id: log.entry_id,
        value_numeric: log.value,
        occurred_at: log.occurred_at || new Date().toISOString(),
      }));

      const { data: inserted } = await supabase
        .from('tracker_logs')
        .insert(logRows)
        .select();

      return JSON.stringify({ logged: inserted?.length ?? 0 });
    }

    // Add more tool implementations...

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// Main handler
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // Auth
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = authData.user.id;
  const { prompt, context } = await req.json();

  // Build and send request
  const requestBody = buildRequestBody(prompt, context ?? {});

  let response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'advanced-tool-use-2025-11-20',
    },
    body: JSON.stringify(requestBody),
  });

  let result = await response.json();

  // Agentic loop: handle tool calls
  const messages = [...requestBody.messages];

  while (result.stop_reason === 'tool_use') {
    // Add assistant response
    messages.push({ role: 'assistant', content: result.content });

    // Process tool calls
    const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];

    for (const block of result.content) {
      if (block.type === 'tool_use') {
        const toolResult = await executeTool(supabase, userId, block.name, block.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: toolResult,
        });
      }
    }

    // Add tool results
    messages.push({ role: 'user', content: toolResults });

    // Continue conversation
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'advanced-tool-use-2025-11-20',
      },
      body: JSON.stringify({
        ...requestBody,
        messages,
        container: result.container?.id,  // Reuse container
      }),
    });

    result = await response.json();
  }

  // Extract final text response
  const textContent = result.content
    ?.filter((b: { type: string }) => b.type === 'text')
    ?.map((b: { text: string }) => b.text)
    ?.join('\n') ?? '';

  return new Response(JSON.stringify({
    response: textContent,
    usage: result.usage,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## Response Handling

### Content Block Types

```typescript
// Text response
{ type: 'text', text: 'Here are your tasks...' }

// Direct tool call
{
  type: 'tool_use',
  id: 'toolu_xxx',
  name: 'query_entries',
  input: { facets: ['task'] }
}

// Programmatic tool call (from code execution)
{
  type: 'tool_use',
  id: 'toolu_xxx',
  name: 'batch_log_trackers',
  input: { logs: [...] },
  caller: {
    type: 'code_execution_20250825',
    tool_id: 'toolu_code_xxx'
  }
}

// Tool search result
{
  type: 'tool_search_tool_result',
  tool_use_id: 'toolu_search_xxx',
  content: {
    type: 'tool_search_tool_search_result',
    tool_references: [
      { type: 'tool_reference', tool_name: 'query_entries' }
    ]
  }
}

// Code execution result
{
  type: 'code_execution_tool_result',
  tool_use_id: 'toolu_code_xxx',
  content: {
    type: 'code_execution_result',
    stdout: 'output...',
    stderr: '',
    return_code: 0,
    content: [...]
  }
}
```

### Stop Reasons

```typescript
// Normal completion
{ stop_reason: 'end_turn' }

// Needs tool execution
{ stop_reason: 'tool_use' }

// Hit max tokens
{ stop_reason: 'max_tokens' }
```

---

## Best Practices

### 1. Tool Organization

```
Always Loaded (3-5 tools):
├── Core functionality used in >80% of requests
├── Context-gathering tools
└── High-frequency simple operations

Deferred (20+ tools):
├── CRUD operations
├── Specialized logging (workouts, nutrition)
├── Analytics and aggregation
└── Sync operations
```

### 2. Programmatic-Only Tools

Reserve `allowed_callers: ['code_execution_20250825']` for:
- Batch operations (multiple inserts/updates)
- Aggregation queries (stats, summaries)
- Operations that benefit from filtering before Claude sees results

### 3. Example Quality

```typescript
// GOOD: Realistic, varied examples
input_examples: [
  { description: 'Completed tasks this week', input: {...} },
  { description: 'All open items (minimal)', input: { status: 'open' } },
  { description: 'Health-tagged events', input: { facets: ['event'], tags: ['health'] } },
]

// BAD: Redundant or placeholder examples
input_examples: [
  { description: 'Example 1', input: { facets: ['task'] } },
  { description: 'Example 2', input: { facets: ['event'] } },
]
```

### 4. Error Handling

```typescript
// Always return structured errors
try {
  const result = await executeTool(...);
  return JSON.stringify(result);
} catch (error) {
  return JSON.stringify({
    error: error.message,
    code: 'TOOL_EXECUTION_ERROR',
  });
}
```

### 5. Token Optimization

```
Before Advanced Tool Use:
├── 25 tools × ~400 tokens = 10,000 tokens
└── Every request pays this cost

After Advanced Tool Use:
├── 3 always-loaded × 400 = 1,200 tokens
├── Tool search when needed = ~500 tokens
├── Only requested tools expanded
└── ~85% reduction
```

---

## Deployment Checklist

- [ ] Set `ANTHROPIC_API_KEY` secret in Supabase
- [ ] Create `_shared/` directory with utilities
- [ ] Create `claude_agent/index.ts` function
- [ ] Deploy: `npx supabase functions deploy claude_agent`
- [ ] Test with Supabase client
- [ ] Update mobile/desktop to use new function
- [ ] Monitor token usage in Anthropic dashboard

---

## References

- [Anthropic Engineering Blog: Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use)
- [Claude Docs: Tool Search](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/tool-search-tool)
- [Claude Docs: Programmatic Tool Calling](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/programmatic-tool-calling)
- [Claude Docs: Code Execution](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/code-execution-tool)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
