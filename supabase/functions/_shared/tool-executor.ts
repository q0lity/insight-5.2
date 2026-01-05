// Tool Executor - Maps tool calls to Supabase database operations
// Implements all InSight tools defined in tool-registry.ts

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// Types
// =============================================================================

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface ToolResult {
  success: boolean;
  data?: JsonValue;
  error?: string;
}

// =============================================================================
// Main Executor
// =============================================================================

/**
 * Execute a tool by name with the given input
 */
export async function executeTool(
  supabase: SupabaseClient,
  userId: string,
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  console.log(`[ToolExecutor] Executing: ${toolName}`, input);

  try {
    const result = await executeToolInternal(supabase, userId, toolName, input);

    if (!result.success) {
      return JSON.stringify({ error: result.error });
    }

    return JSON.stringify(result.data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ToolExecutor] Error in ${toolName}:`, errorMessage);
    return JSON.stringify({ error: errorMessage });
  }
}

/**
 * Internal tool execution dispatcher
 */
async function executeToolInternal(
  supabase: SupabaseClient,
  userId: string,
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  switch (toolName) {
    // Context tools
    case 'get_current_context':
      return await getCurrentContext(supabase, userId, input);
    case 'parse_voice_capture':
      return await parseVoiceCapture(supabase, userId, input);
    case 'quick_log':
      return await quickLog(supabase, userId, input);

    // Entry tools
    case 'query_entries':
      return await queryEntries(supabase, userId, input);
    case 'create_entry':
      return await createEntry(supabase, userId, input);
    case 'update_entry':
      return await updateEntry(supabase, userId, input);
    case 'delete_entry':
      return await deleteEntry(supabase, userId, input);
    case 'bulk_update_entries':
      return await bulkUpdateEntries(supabase, userId, input);

    // Tracker tools
    case 'batch_log_trackers':
      return await batchLogTrackers(supabase, userId, input);
    case 'query_tracker_logs':
      return await queryTrackerLogs(supabase, userId, input);
    case 'create_tracker_definition':
      return await createTrackerDefinition(supabase, userId, input);
    case 'aggregate_tracker_data':
      return await aggregateTrackerData(supabase, userId, input);

    // Workout tools
    case 'log_workout':
      return await logWorkout(supabase, userId, input);
    case 'query_workouts':
      return await queryWorkouts(supabase, userId, input);

    // Nutrition tools
    case 'log_nutrition':
      return await logNutrition(supabase, userId, input);
    case 'query_nutrition':
      return await queryNutrition(supabase, userId, input);

    // Goal tools
    case 'list_goals':
      return await listGoals(supabase, userId, input);
    case 'create_goal':
      return await createGoal(supabase, userId, input);
    case 'update_goal_progress':
      return await updateGoalProgress(supabase, userId, input);

    // Project tools
    case 'list_projects':
      return await listProjects(supabase, userId, input);
    case 'create_project':
      return await createProject(supabase, userId, input);
    case 'link_entry_to_project':
      return await linkEntryToProject(supabase, userId, input);

    // Search tools
    case 'semantic_search':
      return await semanticSearch(supabase, userId, input);
    case 'search_by_tags':
      return await searchByTags(supabase, userId, input);

    // Analytics tools
    case 'get_daily_summary':
      return await getDailySummary(supabase, userId, input);
    case 'get_streak_stats':
      return await getStreakStats(supabase, userId, input);
    case 'calculate_xp':
      return await calculateXp(supabase, userId, input);

    // Calendar tools
    case 'get_scheduled_entries':
      return await getScheduledEntries(supabase, userId, input);

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

// =============================================================================
// Context Tools Implementation
// =============================================================================

async function getCurrentContext(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const includeRecentEntries = input.include_recent_entries !== false;
  const includeActiveTimers = input.include_active_timers !== false;
  const includeGoals = input.include_goals === true;

  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  // Get recent entries
  if (includeRecentEntries) {
    const { data: entries } = await supabase
      .from('entries')
      .select('id, title, facets, status, start_at, end_at, tags, created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    result.recent_entries = entries ?? [];
  }

  // Get active timers
  if (includeActiveTimers) {
    const { data: timers } = await supabase
      .from('timers')
      .select('id, entry_id, timer_type, started_at, target_seconds')
      .eq('user_id', userId)
      .is('ended_at', null);

    result.active_timers = timers ?? [];
  }

  // Get active goals
  if (includeGoals) {
    const { data: goals } = await supabase
      .from('goals')
      .select('id, title, importance, tags')
      .eq('user_id', userId)
      .eq('archived', false)
      .order('importance', { ascending: false })
      .limit(5);

    result.active_goals = goals ?? [];
  }

  return { success: true, data: result as JsonValue };
}

async function parseVoiceCapture(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const transcript = input.transcript as string;
  const anchorTimestamp = (input.anchor_timestamp as string) || new Date().toISOString();
  const context = input.context as Record<string, unknown> | undefined;

  // Extract tracker tokens: #mood(7), #energy(8), etc.
  const trackerRegex = /#([a-zA-Z][\w-]*)\(([^)]+)\)/g;
  const trackers: Array<{ key: string; value: number | string | boolean }> = [];

  let match;
  while ((match = trackerRegex.exec(transcript)) !== null) {
    const key = match[1].toLowerCase();
    const rawValue = match[2].trim();

    let value: number | string | boolean;
    if (/^(true|false)$/i.test(rawValue)) {
      value = rawValue.toLowerCase() === 'true';
    } else if (!isNaN(Number(rawValue))) {
      value = Number(rawValue);
    } else {
      value = rawValue;
    }

    trackers.push({ key, value });
  }

  // Extract task patterns
  const taskPatterns = [
    /\b(?:i need to|i have to|i gotta|i've got to|remember to|remind me to)\s+([^.!?\n]+)/gi,
    /\b(?:todo|task)\s*:\s*([^.!?\n]+)/gi,
  ];

  const tasks: string[] = [];
  for (const pattern of taskPatterns) {
    while ((match = pattern.exec(transcript)) !== null) {
      const task = match[1].trim();
      if (task.length > 2 && !tasks.includes(task)) {
        tasks.push(task);
      }
    }
  }

  return {
    success: true,
    data: {
      transcript,
      anchor_timestamp: anchorTimestamp,
      trackers,
      tasks,
      context: context ?? null,
    } as JsonValue,
  };
}

async function quickLog(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const logType = input.type as string;
  const now = new Date().toISOString();

  switch (logType) {
    case 'tracker': {
      const trackerKey = input.tracker_key as string;
      const value = input.value as number;
      const entryId = input.entry_id as string | undefined;

      // Get or create tracker definition
      let { data: definition } = await supabase
        .from('tracker_definitions')
        .select('id')
        .eq('user_id', userId)
        .eq('key', trackerKey)
        .single();

      if (!definition) {
        const { data: newDef } = await supabase
          .from('tracker_definitions')
          .insert({
            user_id: userId,
            key: trackerKey,
            display_name: trackerKey.charAt(0).toUpperCase() + trackerKey.slice(1),
            value_type: 'number',
          })
          .select('id')
          .single();
        definition = newDef;
      }

      if (!definition) {
        return { success: false, error: 'Failed to create tracker definition' };
      }

      const { data: log, error } = await supabase
        .from('tracker_logs')
        .insert({
          user_id: userId,
          tracker_id: definition.id,
          entry_id: entryId,
          value_numeric: value,
          occurred_at: now,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: { logged: true, tracker_key: trackerKey, value, id: log.id } as JsonValue };
    }

    case 'task':
    case 'note': {
      const text = input.text as string;
      const entryId = input.entry_id as string | undefined;

      const { data: entry, error } = await supabase
        .from('entries')
        .insert({
          user_id: userId,
          title: text,
          facets: [logType],
          status: logType === 'task' ? 'open' : null,
          source: 'claude_agent',
          frontmatter: entryId ? { parentEntryId: entryId } : {},
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: { created: true, type: logType, id: entry.id, title: text } as JsonValue };
    }

    default:
      return { success: false, error: `Unknown log type: ${logType}` };
  }
}

// =============================================================================
// Entry Tools Implementation
// =============================================================================

async function queryEntries(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  let query = supabase
    .from('entries')
    .select('id, title, facets, status, priority, start_at, end_at, scheduled_at, due_at, tags, difficulty, importance, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null);

  // Apply filters
  if (input.facets) {
    query = query.contains('facets', input.facets as string[]);
  }

  if (input.status) {
    query = query.eq('status', input.status);
  }

  if (input.tags) {
    query = query.overlaps('tags', input.tags as string[]);
  }

  if (input.date_range) {
    const range = input.date_range as { start?: string; end?: string };
    if (range.start) {
      query = query.gte('created_at', range.start);
    }
    if (range.end) {
      query = query.lte('created_at', range.end);
    }
  }

  if (input.goal_id) {
    // Join with entry_goals
    const { data: linkedEntries } = await supabase
      .from('entry_goals')
      .select('entry_id')
      .eq('goal_id', input.goal_id);

    if (linkedEntries && linkedEntries.length > 0) {
      const entryIds = linkedEntries.map((e) => e.entry_id);
      query = query.in('id', entryIds);
    } else {
      return { success: true, data: [] };
    }
  }

  const limit = Math.min((input.limit as number) || 50, 200);
  const offset = (input.offset as number) || 0;

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as JsonValue };
}

async function createEntry(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const entryData = {
    user_id: userId,
    title: input.title as string,
    facets: (input.facets as string[]) || ['note'],
    body_markdown: (input.body_markdown as string) || '',
    start_at: input.start_at as string | undefined,
    end_at: input.end_at as string | undefined,
    scheduled_at: input.scheduled_at as string | undefined,
    due_at: input.due_at as string | undefined,
    tags: (input.tags as string[]) || [],
    contexts: (input.contexts as string[]) || [],
    people: (input.people as string[]) || [],
    difficulty: input.difficulty as number | undefined,
    importance: input.importance as number | undefined,
    priority: input.priority as string | undefined,
    status: (input.facets as string[])?.includes('task') ? 'open' : null,
    source: 'claude_agent',
  };

  const { data: entry, error } = await supabase.from('entries').insert(entryData).select().single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Link to goals if provided
  if (input.goal_ids && Array.isArray(input.goal_ids)) {
    const goalLinks = (input.goal_ids as string[]).map((goalId) => ({
      entry_id: entry.id,
      goal_id: goalId,
    }));
    await supabase.from('entry_goals').insert(goalLinks);
  }

  // Link to projects if provided
  if (input.project_ids && Array.isArray(input.project_ids)) {
    const projectLinks = (input.project_ids as string[]).map((projectId) => ({
      entry_id: entry.id,
      project_id: projectId,
    }));
    await supabase.from('entry_projects').insert(projectLinks);
  }

  return { success: true, data: entry as JsonValue };
}

async function updateEntry(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const entryId = input.entry_id as string;
  const updates: Record<string, unknown> = {};

  // Only include provided fields
  if ('title' in input) updates.title = input.title;
  if ('status' in input) updates.status = input.status;
  if ('body_markdown' in input) updates.body_markdown = input.body_markdown;
  if ('start_at' in input) updates.start_at = input.start_at;
  if ('end_at' in input) updates.end_at = input.end_at;
  if ('completed_at' in input) updates.completed_at = input.completed_at;
  if ('tags' in input) updates.tags = input.tags;
  if ('difficulty' in input) updates.difficulty = input.difficulty;
  if ('importance' in input) updates.importance = input.importance;

  const { data, error } = await supabase
    .from('entries')
    .update(updates)
    .eq('id', entryId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as JsonValue };
}

async function deleteEntry(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const entryId = input.entry_id as string;
  const permanent = input.permanent === true;

  if (permanent) {
    const { error } = await supabase.from('entries').delete().eq('id', entryId).eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    const { error } = await supabase
      .from('entries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', entryId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: true, data: { deleted: true, entry_id: entryId, permanent } as JsonValue };
}

async function bulkUpdateEntries(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const entryIds = input.entry_ids as string[];
  const updates = input.updates as Record<string, unknown>;

  const updateData: Record<string, unknown> = {};

  if ('status' in updates) updateData.status = updates.status;
  if ('tags' in updates) updateData.tags = updates.tags;

  // Handle add_tags and remove_tags would require individual updates
  // For now, just do the simple updates

  const { data, error } = await supabase
    .from('entries')
    .update(updateData)
    .in('id', entryIds)
    .eq('user_id', userId)
    .select('id');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: { updated_count: data?.length ?? 0 } as JsonValue };
}

// =============================================================================
// Tracker Tools Implementation
// =============================================================================

async function batchLogTrackers(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const logs = input.logs as Array<{
    tracker_key: string;
    value: number;
    occurred_at?: string;
    entry_id?: string;
  }>;

  // Get all unique tracker keys
  const uniqueKeys = [...new Set(logs.map((l) => l.tracker_key))];

  // Get existing definitions
  const { data: definitions } = await supabase
    .from('tracker_definitions')
    .select('id, key')
    .eq('user_id', userId)
    .in('key', uniqueKeys);

  const defMap = new Map((definitions ?? []).map((d) => [d.key, d.id]));

  // Create missing definitions
  const missingKeys = uniqueKeys.filter((k) => !defMap.has(k));
  if (missingKeys.length > 0) {
    const newDefs = missingKeys.map((key) => ({
      user_id: userId,
      key,
      display_name: key.charAt(0).toUpperCase() + key.slice(1),
      value_type: 'number',
    }));

    const { data: created } = await supabase.from('tracker_definitions').insert(newDefs).select('id, key');

    (created ?? []).forEach((d) => defMap.set(d.key, d.id));
  }

  // Insert logs
  const logRows = logs.map((log) => ({
    user_id: userId,
    tracker_id: defMap.get(log.tracker_key),
    entry_id: log.entry_id || null,
    value_numeric: log.value,
    occurred_at: log.occurred_at || new Date().toISOString(),
  }));

  const { data: inserted, error } = await supabase.from('tracker_logs').insert(logRows).select('id');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: { logged_count: inserted?.length ?? 0 } as JsonValue };
}

async function queryTrackerLogs(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  let query = supabase
    .from('tracker_logs')
    .select('id, tracker_id, entry_id, value_numeric, value_text, value_bool, occurred_at, tracker_definitions(key, display_name)')
    .eq('user_id', userId);

  if (input.tracker_keys) {
    // Need to join with definitions
    const { data: defs } = await supabase
      .from('tracker_definitions')
      .select('id')
      .eq('user_id', userId)
      .in('key', input.tracker_keys as string[]);

    if (defs && defs.length > 0) {
      query = query.in('tracker_id', defs.map((d) => d.id));
    }
  }

  if (input.date_range) {
    const range = input.date_range as { start?: string; end?: string };
    if (range.start) query = query.gte('occurred_at', range.start);
    if (range.end) query = query.lte('occurred_at', range.end);
  }

  if (input.entry_id) {
    query = query.eq('entry_id', input.entry_id);
  }

  const limit = (input.limit as number) || 100;
  query = query.order('occurred_at', { ascending: false }).limit(limit);

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as JsonValue };
}

async function createTrackerDefinition(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const definition = {
    user_id: userId,
    key: input.key as string,
    display_name: input.display_name as string,
    value_type: input.value_type as string,
    min_value: input.min_value as number | undefined,
    max_value: input.max_value as number | undefined,
    unit: input.unit as string | undefined,
    color: input.color as string | undefined,
  };

  const { data, error } = await supabase.from('tracker_definitions').insert(definition).select().single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as JsonValue };
}

async function aggregateTrackerData(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const trackerKeys = input.tracker_keys as string[];
  const dateRange = input.date_range as { start: string; end: string };
  const aggregation = (input.aggregation as string) || 'average';
  const groupBy = (input.group_by as string) || 'day';

  // Get tracker IDs
  const { data: defs } = await supabase
    .from('tracker_definitions')
    .select('id, key')
    .eq('user_id', userId)
    .in('key', trackerKeys);

  if (!defs || defs.length === 0) {
    return { success: true, data: [] };
  }

  const trackerIds = defs.map((d) => d.id);

  // Get logs
  const { data: logs } = await supabase
    .from('tracker_logs')
    .select('tracker_id, value_numeric, occurred_at')
    .eq('user_id', userId)
    .in('tracker_id', trackerIds)
    .gte('occurred_at', dateRange.start)
    .lte('occurred_at', dateRange.end)
    .order('occurred_at', { ascending: true });

  if (!logs || logs.length === 0) {
    return { success: true, data: [] };
  }

  // Create key map
  const keyMap = new Map(defs.map((d) => [d.id, d.key]));

  // Group and aggregate
  const groups = new Map<string, number[]>();

  for (const log of logs) {
    const key = keyMap.get(log.tracker_id) || 'unknown';
    const date = new Date(log.occurred_at);

    let groupKey: string;
    switch (groupBy) {
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        groupKey = `${key}:${weekStart.toISOString().split('T')[0]}`;
        break;
      case 'month':
        groupKey = `${key}:${date.toISOString().slice(0, 7)}`;
        break;
      case 'none':
        groupKey = key;
        break;
      default: // day
        groupKey = `${key}:${date.toISOString().split('T')[0]}`;
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    if (log.value_numeric !== null) {
      groups.get(groupKey)!.push(log.value_numeric);
    }
  }

  // Calculate aggregates
  const results: Array<{ key: string; period?: string; value: number }> = [];

  for (const [groupKey, values] of groups) {
    const [key, period] = groupKey.includes(':') ? groupKey.split(':') : [groupKey, undefined];

    let value: number;
    switch (aggregation) {
      case 'sum':
        value = values.reduce((a, b) => a + b, 0);
        break;
      case 'min':
        value = Math.min(...values);
        break;
      case 'max':
        value = Math.max(...values);
        break;
      case 'count':
        value = values.length;
        break;
      default: // average
        value = values.reduce((a, b) => a + b, 0) / values.length;
    }

    results.push({ key, period, value: Math.round(value * 100) / 100 });
  }

  return { success: true, data: results as JsonValue };
}

// =============================================================================
// Workout Tools Implementation
// =============================================================================

async function logWorkout(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  // Create workout session
  const session = {
    user_id: userId,
    entry_id: input.entry_id as string | undefined,
    template_type: input.template_type as string,
    started_at: input.started_at as string,
    ended_at: input.ended_at as string | undefined,
    notes: input.notes as string | undefined,
  };

  const { data: workoutSession, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert(session)
    .select()
    .single();

  if (sessionError) {
    return { success: false, error: sessionError.message };
  }

  // Add exercises
  const exercises = input.exercises as Array<{
    name: string;
    sets?: number;
    reps?: number;
    weight?: number;
    weight_unit?: string;
    duration_seconds?: number;
    distance?: number;
    distance_unit?: string;
  }>;

  if (exercises && exercises.length > 0) {
    const rows = exercises.map((ex, index) => ({
      session_id: workoutSession.id,
      exercise_name: ex.name,
      set_number: ex.sets || 1,
      reps: ex.reps,
      weight: ex.weight,
      weight_unit: ex.weight_unit || 'lb',
      duration_seconds: ex.duration_seconds,
      distance: ex.distance,
      distance_unit: ex.distance_unit,
      order_index: index,
    }));

    await supabase.from('workout_rows').insert(rows);
  }

  return { success: true, data: workoutSession as JsonValue };
}

async function queryWorkouts(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  let query = supabase
    .from('workout_sessions')
    .select('*, workout_rows(*)')
    .eq('user_id', userId);

  if (input.template_type) {
    query = query.eq('template_type', input.template_type);
  }

  if (input.date_range) {
    const range = input.date_range as { start?: string; end?: string };
    if (range.start) query = query.gte('started_at', range.start);
    if (range.end) query = query.lte('started_at', range.end);
  }

  if (input.exercise_name) {
    // This requires a more complex query - simplify for now
    query = query.contains('notes', input.exercise_name as string);
  }

  const limit = (input.limit as number) || 20;
  query = query.order('started_at', { ascending: false }).limit(limit);

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as JsonValue };
}

// =============================================================================
// Nutrition Tools Implementation
// =============================================================================

async function logNutrition(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const nutrition = {
    user_id: userId,
    entry_id: input.entry_id as string | undefined,
    meal_type: input.meal_type as string,
    description: input.description as string | undefined,
    calories: input.calories as number | undefined,
    protein: input.protein as number | undefined,
    carbs: input.carbs as number | undefined,
    fat: input.fat as number | undefined,
    fiber: input.fiber as number | undefined,
    sugar: input.sugar as number | undefined,
    sodium: input.sodium as number | undefined,
    occurred_at: (input.occurred_at as string) || new Date().toISOString(),
  };

  const { data, error } = await supabase.from('nutrition_logs').insert(nutrition).select().single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as JsonValue };
}

async function queryNutrition(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  let query = supabase.from('nutrition_logs').select('*').eq('user_id', userId);

  if (input.meal_type) {
    query = query.eq('meal_type', input.meal_type);
  }

  if (input.date_range) {
    const range = input.date_range as { start?: string; end?: string };
    if (range.start) query = query.gte('occurred_at', range.start);
    if (range.end) query = query.lte('occurred_at', range.end);
  }

  const { data, error } = await query.order('occurred_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  // Aggregate if requested
  if (input.aggregate_by === 'day') {
    const byDay = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();

    for (const log of data ?? []) {
      const day = log.occurred_at.split('T')[0];
      if (!byDay.has(day)) {
        byDay.set(day, { calories: 0, protein: 0, carbs: 0, fat: 0 });
      }
      const agg = byDay.get(day)!;
      agg.calories += log.calories || 0;
      agg.protein += log.protein || 0;
      agg.carbs += log.carbs || 0;
      agg.fat += log.fat || 0;
    }

    const aggregated = Array.from(byDay.entries()).map(([date, totals]) => ({
      date,
      ...totals,
    }));

    return { success: true, data: aggregated as JsonValue };
  }

  return { success: true, data: data as JsonValue };
}

// =============================================================================
// Goal Tools Implementation
// =============================================================================

async function listGoals(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  let query = supabase.from('goals').select('*').eq('user_id', userId);

  if (input.archived !== undefined) {
    query = query.eq('archived', input.archived);
  }

  if (input.tags) {
    query = query.overlaps('tags', input.tags as string[]);
  }

  if (input.importance_min) {
    query = query.gte('importance', input.importance_min);
  }

  const { data, error } = await query.order('importance', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as JsonValue };
}

async function createGoal(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const goal = {
    user_id: userId,
    title: input.title as string,
    description: input.description as string | undefined,
    importance: input.importance as number,
    tags: (input.tags as string[]) || [],
    metadata: input.target_date ? { target_date: input.target_date } : {},
  };

  const { data, error } = await supabase.from('goals').insert(goal).select().single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as JsonValue };
}

async function updateGoalProgress(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const goalId = input.goal_id as string;
  const updates: Record<string, unknown> = {};

  if ('archived' in input) updates.archived = input.archived;

  if (input.notes) {
    // Append notes to metadata
    const { data: existing } = await supabase.from('goals').select('metadata').eq('id', goalId).single();

    const metadata = (existing?.metadata as Record<string, unknown>) || {};
    const progressNotes = (metadata.progress_notes as string[]) || [];
    progressNotes.push(`${new Date().toISOString()}: ${input.notes}`);
    updates.metadata = { ...metadata, progress_notes: progressNotes };
  }

  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as JsonValue };
}

// =============================================================================
// Project Tools Implementation
// =============================================================================

async function listProjects(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  let query = supabase.from('projects').select('*').eq('user_id', userId);

  if (input.status) {
    query = query.eq('status', input.status);
  }

  if (input.goal_id) {
    query = query.eq('goal_id', input.goal_id);
  }

  if (input.tags) {
    query = query.overlaps('tags', input.tags as string[]);
  }

  const { data, error } = await query.order('importance', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as JsonValue };
}

async function createProject(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const project = {
    user_id: userId,
    title: input.title as string,
    description: input.description as string | undefined,
    goal_id: input.goal_id as string | undefined,
    importance: (input.importance as number) || 5,
    tags: (input.tags as string[]) || [],
    status: 'active',
  };

  const { data, error } = await supabase.from('projects').insert(project).select().single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as JsonValue };
}

async function linkEntryToProject(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const link = {
    entry_id: input.entry_id as string,
    project_id: input.project_id as string,
  };

  const { error } = await supabase.from('entry_projects').insert(link);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: { linked: true, ...link } as JsonValue };
}

// =============================================================================
// Search Tools Implementation
// =============================================================================

async function semanticSearch(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  // For now, fall back to text search
  // Full semantic search would require embedding generation and vector similarity
  const query = input.query as string;
  const limit = (input.limit as number) || 10;

  let dbQuery = supabase
    .from('entries')
    .select('id, title, facets, tags, body_markdown, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .or(`title.ilike.%${query}%,body_markdown.ilike.%${query}%`);

  if (input.facets) {
    dbQuery = dbQuery.contains('facets', input.facets as string[]);
  }

  const { data, error } = await dbQuery.limit(limit);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as JsonValue };
}

async function searchByTags(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const tags = input.tags as string[];
  const matchAll = input.match_all === true;
  const limit = (input.limit as number) || 50;

  let query = supabase
    .from('entries')
    .select('id, title, facets, tags, status, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (matchAll) {
    query = query.contains('tags', tags);
  } else {
    query = query.overlaps('tags', tags);
  }

  if (input.facets) {
    query = query.contains('facets', input.facets as string[]);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as JsonValue };
}

// =============================================================================
// Analytics Tools Implementation
// =============================================================================

async function getDailySummary(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const date = input.date as string;
  const startOfDay = `${date}T00:00:00Z`;
  const endOfDay = `${date}T23:59:59Z`;

  // Get entries for the day
  const { data: entries } = await supabase
    .from('entries')
    .select('id, title, facets, status')
    .eq('user_id', userId)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay);

  // Get tracker logs for the day
  const { data: trackerLogs } = await supabase
    .from('tracker_logs')
    .select('tracker_id, value_numeric, tracker_definitions(key)')
    .eq('user_id', userId)
    .gte('occurred_at', startOfDay)
    .lte('occurred_at', endOfDay);

  const taskCount = entries?.filter((e) => e.facets?.includes('task')).length ?? 0;
  const completedTasks = entries?.filter((e) => e.facets?.includes('task') && e.status === 'done').length ?? 0;
  const eventCount = entries?.filter((e) => e.facets?.includes('event')).length ?? 0;

  // Average tracker values
  const trackerAverages: Record<string, number> = {};
  const trackerCounts: Record<string, number[]> = {};

  for (const log of trackerLogs ?? []) {
    const key = (log.tracker_definitions as { key: string })?.key || 'unknown';
    if (!trackerCounts[key]) trackerCounts[key] = [];
    if (log.value_numeric !== null) {
      trackerCounts[key].push(log.value_numeric);
    }
  }

  for (const [key, values] of Object.entries(trackerCounts)) {
    if (values.length > 0) {
      trackerAverages[key] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    }
  }

  return {
    success: true,
    data: {
      date,
      entries_created: entries?.length ?? 0,
      tasks: {
        total: taskCount,
        completed: completedTasks,
        completion_rate: taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0,
      },
      events: eventCount,
      tracker_averages: trackerAverages,
    } as JsonValue,
  };
}

async function getStreakStats(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  // Get habit instances for streak calculation
  const { data: habits } = await supabase
    .from('habit_definitions')
    .select('id, display_name, habit_instances(completed_at)')
    .eq('user_id', userId);

  const streaks: Array<{ habit: string; current_streak: number; longest_streak: number }> = [];

  for (const habit of habits ?? []) {
    const instances = (habit.habit_instances as Array<{ completed_at: string }>) || [];
    const dates = instances.map((i) => i.completed_at.split('T')[0]).sort();

    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    for (let i = dates.length - 1; i >= 0; i--) {
      if (i === dates.length - 1) {
        if (dates[i] === today || dates[i] === yesterday) {
          streak = 1;
        }
      } else {
        const prevDate = new Date(dates[i + 1]);
        const currDate = new Date(dates[i]);
        const diff = (prevDate.getTime() - currDate.getTime()) / 86400000;

        if (diff <= 1) {
          streak++;
        } else {
          longestStreak = Math.max(longestStreak, streak);
          streak = 1;
        }
      }
    }

    currentStreak = streak;
    longestStreak = Math.max(longestStreak, streak);

    streaks.push({
      habit: habit.display_name,
      current_streak: currentStreak,
      longest_streak: longestStreak,
    });
  }

  return { success: true, data: streaks as JsonValue };
}

async function calculateXp(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  let query = supabase
    .from('entries')
    .select('id, title, difficulty, importance, duration_minutes, xp')
    .eq('user_id', userId)
    .eq('status', 'done');

  if (input.entry_ids) {
    query = query.in('id', input.entry_ids as string[]);
  }

  if (input.date_range) {
    const range = input.date_range as { start?: string; end?: string };
    if (range.start) query = query.gte('completed_at', range.start);
    if (range.end) query = query.lte('completed_at', range.end);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  // Calculate XP: difficulty * importance * (duration / 30)
  let totalXp = 0;
  const entries: Array<{ id: string; title: string; xp: number }> = [];

  for (const entry of data ?? []) {
    const difficulty = entry.difficulty || 5;
    const importance = entry.importance || 5;
    const duration = entry.duration_minutes || 30;

    const xp = Math.round(difficulty * importance * (duration / 30));
    totalXp += xp;

    entries.push({ id: entry.id, title: entry.title, xp });
  }

  return {
    success: true,
    data: {
      total_xp: totalXp,
      entry_count: entries.length,
      entries,
    } as JsonValue,
  };
}

// =============================================================================
// Calendar Tools Implementation
// =============================================================================

async function getScheduledEntries(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const dateRange = input.date_range as { start: string; end: string };
  const includeCompleted = input.include_completed !== false;

  let query = supabase
    .from('entries')
    .select('id, title, facets, status, start_at, end_at, scheduled_at, due_at, tags')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .or(
      `start_at.gte.${dateRange.start},scheduled_at.gte.${dateRange.start},due_at.gte.${dateRange.start}`
    )
    .or(
      `start_at.lte.${dateRange.end},scheduled_at.lte.${dateRange.end},due_at.lte.${dateRange.end}`
    );

  if (!includeCompleted) {
    query = query.neq('status', 'done');
  }

  const { data, error } = await query.order('start_at', { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as JsonValue };
}
