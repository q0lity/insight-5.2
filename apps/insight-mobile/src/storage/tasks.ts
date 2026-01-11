import AsyncStorage from '@react-native-async-storage/async-storage';

import { fromIso, getSupabaseSessionUser, toIso, uniqStrings } from '@/src/supabase/helpers';
import { ensureEntitiesFromEntry } from '@/src/supabase/entities';

export type MobileTaskStatus = 'todo' | 'in_progress' | 'done' | 'canceled';

export type MobileTask = {
  id: string;
  title: string;
  status: MobileTaskStatus;
  createdAt: number;
  updatedAt: number;
  scheduledAt?: number | null;
  dueAt?: number | null;
  completedAt?: number | null;
  notes?: string;
  frontmatter?: string;
  tags?: string[];
  contexts?: string[];
  people?: string[];
  goal?: string | null;
  project?: string | null;
  category?: string | null;
  subcategory?: string | null;
  estimateMinutes?: number | null;
  importance?: number | null;
  difficulty?: number | null;
  parentEventId?: string | null;
};

const STORAGE_KEY = 'insight5.mobile.tasks.v1';

function makeTaskId() {
  return `tsk_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeTagForSupabase(tag: string) {
  const trimmed = tag.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function normalizeTagForMobile(tag: string) {
  const trimmed = tag.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
}

async function loadTasksLocal(): Promise<MobileTask[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MobileTask[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t) => t && typeof t.id === 'string' && typeof t.title === 'string');
  } catch {
    return [];
  }
}

async function saveTasksLocal(tasks: MobileTask[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // ignore
  }
}

function entryToMobileTask(row: any): MobileTask {
  const fm = (row.frontmatter ?? {}) as Record<string, any>;
  const tags = Array.isArray(row.tags) ? uniqStrings(row.tags.map(normalizeTagForMobile)) : [];
  const people = Array.isArray(row.people) ? uniqStrings(row.people) : [];
  const contexts = Array.isArray(row.contexts) ? uniqStrings(row.contexts) : [];

  return {
    id: row.id,
    title: row.title ?? 'Task',
    status: (row.status as MobileTaskStatus) ?? 'todo',
    createdAt: fromIso(row.created_at) ?? Date.now(),
    updatedAt: fromIso(row.updated_at) ?? Date.now(),
    scheduledAt: fromIso(row.scheduled_at),
    dueAt: fromIso(row.due_at),
    completedAt: fromIso(row.completed_at),
    notes: row.body_markdown ?? '',
    frontmatter: Object.keys(fm).length ? JSON.stringify(fm) : '',
    tags,
    contexts,
    people,
    goal: (fm.goal as string | null) ?? null,
    project: (fm.project as string | null) ?? null,
    category: (fm.category as string | null) ?? null,
    subcategory: (fm.subcategory as string | null) ?? null,
    estimateMinutes: typeof fm.estimateMinutes === 'number' ? fm.estimateMinutes : row.duration_minutes ?? null,
    importance: typeof row.importance === 'number' ? row.importance : fm.importance ?? null,
    difficulty: typeof row.difficulty === 'number' ? row.difficulty : fm.difficulty ?? null,
    parentEventId: (fm.parentEventId as string | null) ?? null,
  };
}

function mobileTaskToEntry(task: MobileTask, userId: string, options?: { legacyId?: string | null }) {
  const tags = uniqStrings((task.tags ?? []).map(normalizeTagForSupabase).filter(Boolean));
  const people = uniqStrings(task.people ?? []);
  const contexts = uniqStrings(task.contexts ?? []);
  let baseFrontmatter: Record<string, unknown> = {};
  if (task.frontmatter) {
    try {
      baseFrontmatter = JSON.parse(task.frontmatter);
    } catch {
      baseFrontmatter = {};
    }
  }
  const existingLegacyId =
    typeof baseFrontmatter.legacyId === 'string' && baseFrontmatter.legacyId.trim().length
      ? baseFrontmatter.legacyId
      : null;
  const legacyId = existingLegacyId ?? options?.legacyId ?? null;
  const legacyType =
    typeof baseFrontmatter.legacyType === 'string' && baseFrontmatter.legacyType.trim().length
      ? baseFrontmatter.legacyType
      : 'task';

  const frontmatter = {
    ...baseFrontmatter,
    ...(legacyId ? { legacyId, legacyType } : {}),
    goal: task.goal ?? null,
    project: task.project ?? null,
    category: task.category ?? null,
    subcategory: task.subcategory ?? null,
    estimateMinutes: task.estimateMinutes ?? null,
    parentEventId: task.parentEventId ?? null,
    sourceApp: 'mobile',
  };

  return {
    user_id: userId,
    title: task.title,
    facets: ['task'],
    status: task.status,
    scheduled_at: toIso(task.scheduledAt),
    due_at: toIso(task.dueAt),
    completed_at: toIso(task.completedAt),
    duration_minutes: task.estimateMinutes ?? null,
    difficulty: task.difficulty ?? null,
    importance: task.importance ?? null,
    tags,
    contexts,
    people,
    frontmatter,
    body_markdown: task.notes ?? '',
    source: 'app',
  };
}

export async function listTasks() {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const tasks = await loadTasksLocal();
    return tasks.sort((a, b) => b.createdAt - a.createdAt);
  }
  const { supabase, user } = session;
  const { data, error } = await supabase
    .from('entries')
    .select(
      'id, title, created_at, updated_at, status, scheduled_at, due_at, completed_at, body_markdown, tags, people, contexts, importance, difficulty, duration_minutes, frontmatter'
    )
    .eq('user_id', user.id)
    .contains('facets', ['task'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error || !data) {
    const tasks = await loadTasksLocal();
    return tasks.sort((a, b) => b.createdAt - a.createdAt);
  }
  return data.map(entryToMobileTask);
}

export async function createTask(input: {
  id?: string;
  title: string;
  status?: MobileTaskStatus;
  scheduledAt?: number | null;
  dueAt?: number | null;
  completedAt?: number | null;
  notes?: string;
  tags?: string[];
  contexts?: string[];
  people?: string[];
  goal?: string | null;
  project?: string | null;
  category?: string | null;
  subcategory?: string | null;
  estimateMinutes?: number | null;
  importance?: number | null;
  difficulty?: number | null;
  parentEventId?: string | null;
}) {
  const now = Date.now();
  const task: MobileTask = {
    id: input.id ?? makeTaskId(),
    title: input.title,
    status: input.status ?? 'todo',
    createdAt: now,
    updatedAt: now,
    scheduledAt: input.scheduledAt ?? null,
    dueAt: input.dueAt ?? null,
    completedAt: input.completedAt ?? null,
    notes: input.notes ?? '',
    frontmatter: '',
    tags: input.tags ?? [],
    contexts: input.contexts ?? [],
    people: input.people ?? [],
    goal: input.goal ?? null,
    project: input.project ?? null,
    category: input.category ?? null,
    subcategory: input.subcategory ?? null,
    estimateMinutes: input.estimateMinutes ?? null,
    importance: input.importance ?? null,
    difficulty: input.difficulty ?? null,
    parentEventId: input.parentEventId ?? null,
  };

  const session = await getSupabaseSessionUser();
  if (!session) {
    const tasks = await loadTasksLocal();
    tasks.unshift(task);
    await saveTasksLocal(tasks);
    return task;
  }

  const { supabase, user } = session;
  const payload = mobileTaskToEntry(task, user.id);
  const { data, error } = await supabase.from('entries').insert(payload).select('id').single();
  if (error || !data) {
    const tasks = await loadTasksLocal();
    tasks.unshift(task);
    await saveTasksLocal(tasks);
    return task;
  }
  void ensureEntitiesFromEntry({ tags: task.tags ?? [], people: task.people ?? [], location: null });
  return { ...task, id: data.id };
}

export async function updateTask(id: string, patch: Partial<MobileTask>) {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const tasks = await loadTasksLocal();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx < 0) return null;
    tasks[idx] = { ...tasks[idx], ...patch, updatedAt: Date.now() };
    await saveTasksLocal(tasks);
    return tasks[idx];
  }

  const tasks = await listTasks();
  const current = tasks.find((t) => t.id === id);
  if (!current) return null;
  const next: MobileTask = { ...current, ...patch, updatedAt: Date.now() };

  const { supabase, user } = session;
  const payload = mobileTaskToEntry(next, user.id);
  const { error } = await supabase.from('entries').update(payload).eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
  void ensureEntitiesFromEntry({ tags: next.tags ?? [], people: next.people ?? [], location: null });
  return next;
}

export async function completeTask(id: string) {
  return updateTask(id, { status: 'done', completedAt: Date.now() });
}

export async function syncLocalTasksToSupabase() {
  const session = await getSupabaseSessionUser();
  if (!session) return;
  const local = await loadTasksLocal();
  if (!local.length) return;
  const { supabase, user } = session;

  for (const task of local) {
    const payload = mobileTaskToEntry(task, user.id, { legacyId: task.id });
    const lookup = await supabase
      .from('entries')
      .select('id')
      .eq('frontmatter->>legacyId', task.id)
      .eq('frontmatter->>legacyType', 'task')
      .maybeSingle();

    if (lookup.data?.id) {
      await supabase.from('entries').update(payload).eq('id', lookup.data.id);
    } else {
      await supabase.from('entries').insert(payload);
    }
    void ensureEntitiesFromEntry({ tags: task.tags ?? [], people: task.people ?? [], location: null });
  }

  await AsyncStorage.removeItem(STORAGE_KEY);
}
