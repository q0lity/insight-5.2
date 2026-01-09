import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabaseSessionUser, toIso, fromIso } from '@/src/supabase/helpers';
import { listEvents, type MobileEvent } from './events';

export type HabitPolarity = 'positive' | 'negative' | 'both';

export type CharacterStat = 'STR' | 'INT' | 'CON' | 'PER';

export type HabitDef = {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  difficulty: number;
  importance: number;
  polarity: HabitPolarity;
  targetPerWeek: number | null;
  color: string;
  icon: string | null;
  isTimed: boolean;
  createdAt: number;
  updatedAt: number;
  // Extended frontmatter fields
  tags: string[];
  people: string[];
  estimateMinutes: number | null;
  location: string | null;
  skills: string[];
  character: CharacterStat[];
  goal: string | null;
  project: string | null;
};

export type HabitLog = {
  id: string;
  habitId: string;
  positive: boolean;
  points: number;
  startAt: number;
  endAt: number | null;
  durationMinutes: number | null;
};

export type HabitWithStats = HabitDef & {
  streak: number;
  totalPoints: number;
  totalMinutes: number;
  todayLogs: number;
  weekLogs: number;
  heatmapData: { date: string; value: number; positive: number; negative: number }[];
};

const HABITS_STORAGE_KEY = 'insight5.mobile.habits.v1';

function makeHabitId() {
  return `hab_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ============================================================================
// Local Storage (AsyncStorage)
// ============================================================================

async function loadHabitsLocal(): Promise<HabitDef[]> {
  try {
    const raw = await AsyncStorage.getItem(HABITS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HabitDef[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((h) => h && typeof h.id === 'string' && typeof h.name === 'string');
  } catch {
    return [];
  }
}

async function saveHabitsLocal(habits: HabitDef[]) {
  try {
    await AsyncStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
  } catch {
    // ignore
  }
}

// ============================================================================
// Supabase Helpers
// ============================================================================

function habitDefToEntry(habit: HabitDef, userId: string) {
  return {
    user_id: userId,
    title: habit.name,
    facets: ['habit_def'],
    start_at: toIso(habit.createdAt),
    end_at: null,
    duration_minutes: habit.estimateMinutes,
    difficulty: habit.difficulty,
    importance: habit.importance,
    tags: habit.tags ?? [],
    contexts: [],
    people: habit.people ?? [],
    frontmatter: {
      kind: 'habit_def',
      category: habit.category,
      subcategory: habit.subcategory,
      polarity: habit.polarity,
      targetPerWeek: habit.targetPerWeek,
      color: habit.color,
      icon: habit.icon,
      isTimed: habit.isTimed,
      // Extended fields
      estimateMinutes: habit.estimateMinutes,
      location: habit.location,
      skills: habit.skills ?? [],
      character: habit.character ?? [],
      goal: habit.goal,
      project: habit.project,
      legacyId: habit.id,
      legacyType: 'habit_def',
      sourceApp: 'mobile',
    },
    body_markdown: '',
    source: 'app',
  };
}

function entryToHabitDef(row: any): HabitDef {
  const fm = (row.frontmatter ?? {}) as Record<string, any>;
  return {
    id: fm.legacyId ?? row.id,
    name: row.title ?? 'Habit',
    category: fm.category ?? null,
    subcategory: fm.subcategory ?? null,
    difficulty: row.difficulty ?? fm.difficulty ?? 5,
    importance: row.importance ?? fm.importance ?? 5,
    polarity: (fm.polarity as HabitPolarity) ?? 'positive',
    targetPerWeek: fm.targetPerWeek ?? null,
    color: fm.color ?? '#D95D39',
    icon: fm.icon ?? null,
    isTimed: fm.isTimed ?? false,
    createdAt: fromIso(row.start_at) ?? fromIso(row.created_at) ?? Date.now(),
    updatedAt: fromIso(row.updated_at) ?? fromIso(row.created_at) ?? Date.now(),
    // Extended fields with defaults
    tags: Array.isArray(row.tags) ? row.tags : (Array.isArray(fm.tags) ? fm.tags : []),
    people: Array.isArray(row.people) ? row.people : (Array.isArray(fm.people) ? fm.people : []),
    estimateMinutes: row.duration_minutes ?? fm.estimateMinutes ?? null,
    location: fm.location ?? null,
    skills: Array.isArray(fm.skills) ? fm.skills : [],
    character: Array.isArray(fm.character) ? fm.character : [],
    goal: fm.goal ?? null,
    project: fm.project ?? null,
  };
}

// ============================================================================
// CRUD Operations
// ============================================================================

export async function listHabits(): Promise<HabitDef[]> {
  const session = await getSupabaseSessionUser();
  if (!session) {
    return loadHabitsLocal();
  }

  const { supabase, user } = session;
  const { data, error } = await supabase
    .from('entries')
    .select('id, title, created_at, updated_at, start_at, difficulty, importance, frontmatter')
    .eq('user_id', user.id)
    .contains('facets', ['habit_def'])
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return loadHabitsLocal();
  }

  return data.map(entryToHabitDef);
}

export async function getHabit(id: string): Promise<HabitDef | null> {
  const habits = await listHabits();
  return habits.find((h) => h.id === id) ?? null;
}

export async function createHabit(input: {
  name: string;
  category?: string | null;
  subcategory?: string | null;
  difficulty?: number;
  importance?: number;
  polarity?: HabitPolarity;
  targetPerWeek?: number | null;
  color?: string;
  icon?: string | null;
  isTimed?: boolean;
  // Extended fields
  tags?: string[];
  people?: string[];
  estimateMinutes?: number | null;
  location?: string | null;
  skills?: string[];
  character?: CharacterStat[];
  goal?: string | null;
  project?: string | null;
}): Promise<HabitDef> {
  const now = Date.now();
  const habit: HabitDef = {
    id: makeHabitId(),
    name: input.name,
    category: input.category ?? null,
    subcategory: input.subcategory ?? null,
    difficulty: input.difficulty ?? 5,
    importance: input.importance ?? 5,
    polarity: input.polarity ?? 'positive',
    targetPerWeek: input.targetPerWeek ?? null,
    color: input.color ?? '#D95D39',
    icon: input.icon ?? null,
    isTimed: input.isTimed ?? false,
    createdAt: now,
    updatedAt: now,
    // Extended fields
    tags: input.tags ?? [],
    people: input.people ?? [],
    estimateMinutes: input.estimateMinutes ?? null,
    location: input.location ?? null,
    skills: input.skills ?? [],
    character: input.character ?? [],
    goal: input.goal ?? null,
    project: input.project ?? null,
  };

  const session = await getSupabaseSessionUser();
  if (!session) {
    const habits = await loadHabitsLocal();
    habits.push(habit);
    await saveHabitsLocal(habits);
    return habit;
  }

  const { supabase, user } = session;
  const payload = habitDefToEntry(habit, user.id);
  const { data, error } = await supabase.from('entries').insert(payload).select('id').single();

  if (error || !data) {
    const habits = await loadHabitsLocal();
    habits.push(habit);
    await saveHabitsLocal(habits);
    return habit;
  }

  return habit;
}

export async function updateHabit(id: string, updates: Partial<Omit<HabitDef, 'id' | 'createdAt'>>): Promise<HabitDef | null> {
  const session = await getSupabaseSessionUser();
  const now = Date.now();

  if (!session) {
    const habits = await loadHabitsLocal();
    const idx = habits.findIndex((h) => h.id === id);
    if (idx < 0) return null;
    habits[idx] = { ...habits[idx], ...updates, updatedAt: now };
    await saveHabitsLocal(habits);
    return habits[idx];
  }

  const existing = await getHabit(id);
  if (!existing) return null;

  const next = { ...existing, ...updates, updatedAt: now };
  const { supabase, user } = session;

  // Find the entry by legacyId
  const { data: lookup } = await supabase
    .from('entries')
    .select('id')
    .eq('frontmatter->>legacyId', id)
    .eq('frontmatter->>legacyType', 'habit_def')
    .maybeSingle();

  if (lookup?.id) {
    const payload = habitDefToEntry(next, user.id);
    await supabase.from('entries').update(payload).eq('id', lookup.id);
  }

  return next;
}

export async function deleteHabit(id: string): Promise<void> {
  const session = await getSupabaseSessionUser();

  if (!session) {
    const habits = await loadHabitsLocal();
    const filtered = habits.filter((h) => h.id !== id);
    await saveHabitsLocal(filtered);
    return;
  }

  const { supabase } = session;
  const { data: lookup } = await supabase
    .from('entries')
    .select('id')
    .eq('frontmatter->>legacyId', id)
    .eq('frontmatter->>legacyType', 'habit_def')
    .maybeSingle();

  if (lookup?.id) {
    await supabase.from('entries').update({ deleted_at: new Date().toISOString() }).eq('id', lookup.id);
  }
}

// ============================================================================
// Habit Logs (Query from Events)
// ============================================================================

export async function getHabitLogs(habitId: string, days = 90): Promise<HabitLog[]> {
  const events = await listEvents();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const logs: HabitLog[] = [];
  for (const event of events) {
    if (event.startAt < cutoff) continue;
    if (!event.trackerKey?.startsWith(`habit:${habitId}`)) continue;

    const isNegative = event.trackerKey.endsWith(':neg');
    logs.push({
      id: event.id,
      habitId,
      positive: !isNegative,
      points: event.points ?? 0,
      startAt: event.startAt,
      endAt: event.endAt ?? null,
      durationMinutes: event.endAt ? Math.round((event.endAt - event.startAt) / 60000) : null,
    });
  }

  return logs.sort((a, b) => b.startAt - a.startAt);
}

export async function getEventsWithTrackerKey(trackerKeyPrefix: string): Promise<MobileEvent[]> {
  const events = await listEvents();
  return events.filter((e) => e.trackerKey?.startsWith(trackerKeyPrefix));
}

// ============================================================================
// Streak Calculation
// ============================================================================

function getDayKey(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStartOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export async function getHabitStreak(habitId: string): Promise<number> {
  const logs = await getHabitLogs(habitId, 365);

  // Group logs by day
  const dayData: Record<string, { hasPositive: boolean; hasNegative: boolean }> = {};
  for (const log of logs) {
    const key = getDayKey(log.startAt);
    if (!dayData[key]) {
      dayData[key] = { hasPositive: false, hasNegative: false };
    }
    if (log.positive) {
      dayData[key].hasPositive = true;
    } else {
      dayData[key].hasNegative = true;
    }
  }

  // Count consecutive positive-only days starting from today
  let streak = 0;
  const today = getStartOfDay(Date.now());
  const oneDay = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 365; i++) {
    const checkDate = today - i * oneDay;
    const key = getDayKey(checkDate);
    const data = dayData[key];

    if (data?.hasPositive && !data?.hasNegative) {
      streak++;
    } else if (i > 0) {
      // Allow today to be empty (streak continues from yesterday)
      break;
    }
  }

  return streak;
}

// ============================================================================
// Points Calculation
// ============================================================================

export function calculateHabitPoints(habit: HabitDef, durationMinutes?: number): number {
  const base = (habit.importance / 10) * (habit.difficulty / 10);

  if (durationMinutes && durationMinutes > 0) {
    // Timed habit: points scale with duration
    return base * (durationMinutes / 60) * 60;
  }

  // Quick log: flat points
  return base * 10;
}

// ============================================================================
// Aggregated Stats
// ============================================================================

export async function getHabitStats(habitId: string, days = 28): Promise<{
  streak: number;
  totalPoints: number;
  totalMinutes: number;
  todayLogs: number;
  weekLogs: number;
}> {
  const [streak, logs] = await Promise.all([getHabitStreak(habitId), getHabitLogs(habitId, days)]);

  const today = getStartOfDay(Date.now());
  const weekAgo = today - 7 * 24 * 60 * 60 * 1000;

  let totalPoints = 0;
  let totalMinutes = 0;
  let todayLogs = 0;
  let weekLogs = 0;

  for (const log of logs) {
    if (log.positive) {
      totalPoints += log.points;
      if (log.durationMinutes) {
        totalMinutes += log.durationMinutes;
      }
    }

    if (log.startAt >= today) {
      todayLogs++;
    }
    if (log.startAt >= weekAgo) {
      weekLogs++;
    }
  }

  return { streak, totalPoints, totalMinutes, todayLogs, weekLogs };
}

// ============================================================================
// Heatmap Data
// ============================================================================

export async function getHabitHeatmapData(
  habitId: string,
  days = 28
): Promise<{ date: string; value: number; positive: number; negative: number }[]> {
  const logs = await getHabitLogs(habitId, days);
  const today = getStartOfDay(Date.now());
  const oneDay = 24 * 60 * 60 * 1000;

  const result: { date: string; value: number; positive: number; negative: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = today - i * oneDay;
    const key = getDayKey(dayStart);

    let positive = 0;
    let negative = 0;

    for (const log of logs) {
      if (getDayKey(log.startAt) === key) {
        if (log.positive) {
          positive++;
        } else {
          negative++;
        }
      }
    }

    // Value: positive - negative (can be negative if more misses)
    result.push({
      date: key,
      value: positive - negative,
      positive,
      negative,
    });
  }

  return result;
}

// ============================================================================
// Full Habit with Stats
// ============================================================================

export async function getHabitWithStats(habitId: string): Promise<HabitWithStats | null> {
  const habit = await getHabit(habitId);
  if (!habit) return null;

  const [stats, heatmapData] = await Promise.all([getHabitStats(habitId), getHabitHeatmapData(habitId)]);

  return {
    ...habit,
    ...stats,
    heatmapData,
  };
}

export async function listHabitsWithStats(): Promise<HabitWithStats[]> {
  const habits = await listHabits();
  const results = await Promise.all(
    habits.map(async (habit) => {
      const [stats, heatmapData] = await Promise.all([
        getHabitStats(habit.id),
        getHabitHeatmapData(habit.id),
      ]);
      return { ...habit, ...stats, heatmapData };
    })
  );
  return results;
}

// ============================================================================
// Sync Local to Supabase
// ============================================================================

export async function syncLocalHabitsToSupabase() {
  const session = await getSupabaseSessionUser();
  if (!session) return;

  const habits = await loadHabitsLocal();
  if (!habits.length) return;

  const { supabase, user } = session;

  for (const habit of habits) {
    const payload = habitDefToEntry(habit, user.id);
    const lookup = await supabase
      .from('entries')
      .select('id')
      .eq('frontmatter->>legacyId', habit.id)
      .eq('frontmatter->>legacyType', 'habit_def')
      .maybeSingle();

    if (lookup.data?.id) {
      await supabase.from('entries').update(payload).eq('id', lookup.data.id);
    } else {
      await supabase.from('entries').insert(payload);
    }
  }

  await AsyncStorage.removeItem(HABITS_STORAGE_KEY);
}
