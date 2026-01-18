import AsyncStorage from '@react-native-async-storage/async-storage';

import { fromIso, getSupabaseSessionUser, toIso, uniqStrings } from '@/src/supabase/helpers';
import { ensureEntitiesFromEntry } from '@/src/supabase/entities';

export type RoutineStepKind = 'task' | 'habit' | 'custom';

export type RoutineStep = {
  id: string;
  title: string;
  kind: RoutineStepKind;
  refId?: string | null;
  estimateMinutes?: number | null;
  importance?: number | null;
  difficulty?: number | null;
  isOptional?: boolean;
  notes?: string;
};

export type RoutineDef = {
  id: string;
  name: string;
  description?: string;
  steps: RoutineStep[];
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
  tags: string[];
  contexts: string[];
  people: string[];
  goal: string | null;
  project: string | null;
  category: string | null;
  subcategory: string | null;
};

const STORAGE_KEY = 'insight5.mobile.routines.v1';

function makeRoutineId() {
  return `rtn_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

async function loadRoutinesLocal(): Promise<RoutineDef[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RoutineDef[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r && typeof r.id === 'string' && typeof r.name === 'string');
  } catch {
    return [];
  }
}

async function saveRoutinesLocal(routines: RoutineDef[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
  } catch {
    // ignore
  }
}

function normalizeSteps(input: unknown): RoutineStep[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const step = raw as Partial<RoutineStep>;
      if (!step.id || !step.title) return null;
      return {
        id: String(step.id),
        title: String(step.title),
        kind: (step.kind as RoutineStepKind) ?? 'custom',
        refId: step.refId ?? null,
        estimateMinutes: typeof step.estimateMinutes === 'number' ? step.estimateMinutes : null,
        importance: typeof step.importance === 'number' ? step.importance : null,
        difficulty: typeof step.difficulty === 'number' ? step.difficulty : null,
        isOptional: Boolean(step.isOptional),
        notes: typeof step.notes === 'string' ? step.notes : '',
      } as RoutineStep;
    })
    .filter(Boolean) as RoutineStep[];
}

function entryToRoutine(row: any): RoutineDef {
  const fm = (row.frontmatter ?? {}) as Record<string, any>;
  const tags = Array.isArray(row.tags) ? uniqStrings(row.tags.map(normalizeTagForMobile)) : [];
  const people = Array.isArray(row.people) ? uniqStrings(row.people) : [];
  const contexts = Array.isArray(row.contexts) ? uniqStrings(row.contexts) : [];

  return {
    id: fm.legacyId ?? row.id,
    name: row.title ?? 'Routine',
    description: typeof row.body_markdown === 'string' ? row.body_markdown : '',
    steps: normalizeSteps(fm.steps),
    createdAt: fromIso(row.start_at) ?? fromIso(row.created_at) ?? Date.now(),
    updatedAt: fromIso(row.updated_at) ?? fromIso(row.created_at) ?? Date.now(),
    archived: Boolean(fm.archived),
    tags,
    contexts,
    people,
    goal: (fm.goal as string | null) ?? null,
    project: (fm.project as string | null) ?? null,
    category: (fm.category as string | null) ?? null,
    subcategory: (fm.subcategory as string | null) ?? null,
  };
}

function routineToEntry(routine: RoutineDef, userId: string, options?: { legacyId?: string | null }) {
  const tags = uniqStrings((routine.tags ?? []).map(normalizeTagForSupabase).filter(Boolean));
  const people = uniqStrings(routine.people ?? []);
  const contexts = uniqStrings(routine.contexts ?? []);
  const legacyId = options?.legacyId ?? routine.id ?? null;

  return {
    user_id: userId,
    title: routine.name,
    facets: ['routine_def'],
    start_at: toIso(routine.createdAt),
    end_at: null,
    duration_minutes: null,
    difficulty: null,
    importance: null,
    tags,
    contexts,
    people,
    frontmatter: {
      kind: 'routine_def',
      steps: routine.steps ?? [],
      archived: routine.archived ?? false,
      goal: routine.goal ?? null,
      project: routine.project ?? null,
      category: routine.category ?? null,
      subcategory: routine.subcategory ?? null,
      legacyId,
      legacyType: 'routine_def',
      sourceApp: 'mobile',
    },
    body_markdown: routine.description ?? '',
    source: 'app',
  };
}

export async function listRoutines(): Promise<RoutineDef[]> {
  const session = await getSupabaseSessionUser();
  if (!session) {
    return loadRoutinesLocal();
  }

  const { supabase, user } = session;
  const { data, error } = await supabase
    .from('entries')
    .select('id, title, created_at, updated_at, start_at, body_markdown, tags, people, contexts, frontmatter')
    .eq('user_id', user.id)
    .contains('facets', ['routine_def'])
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return loadRoutinesLocal();
  }

  return data.map(entryToRoutine);
}

export async function getRoutine(id: string): Promise<RoutineDef | null> {
  const routines = await listRoutines();
  return routines.find((routine) => routine.id === id) ?? null;
}

export async function createRoutine(input: {
  name: string;
  description?: string;
  steps?: RoutineStep[];
  tags?: string[];
  contexts?: string[];
  people?: string[];
  goal?: string | null;
  project?: string | null;
  category?: string | null;
  subcategory?: string | null;
}): Promise<RoutineDef> {
  const now = Date.now();
  const routine: RoutineDef = {
    id: makeRoutineId(),
    name: input.name,
    description: input.description ?? '',
    steps: input.steps ?? [],
    createdAt: now,
    updatedAt: now,
    archived: false,
    tags: input.tags ?? [],
    contexts: input.contexts ?? [],
    people: input.people ?? [],
    goal: input.goal ?? null,
    project: input.project ?? null,
    category: input.category ?? null,
    subcategory: input.subcategory ?? null,
  };

  const session = await getSupabaseSessionUser();
  if (!session) {
    const routines = await loadRoutinesLocal();
    routines.push(routine);
    await saveRoutinesLocal(routines);
    return routine;
  }

  const { supabase, user } = session;
  const payload = routineToEntry(routine, user.id);
  const { data, error } = await supabase.from('entries').insert(payload).select('id').single();
  if (error || !data) {
    const routines = await loadRoutinesLocal();
    routines.push(routine);
    await saveRoutinesLocal(routines);
    return routine;
  }
  void ensureEntitiesFromEntry({ tags: routine.tags ?? [], people: routine.people ?? [], location: null });
  return { ...routine, id: data.id };
}

export async function updateRoutine(id: string, updates: Partial<Omit<RoutineDef, 'id' | 'createdAt'>>): Promise<RoutineDef | null> {
  const session = await getSupabaseSessionUser();
  const now = Date.now();

  if (!session) {
    const routines = await loadRoutinesLocal();
    const idx = routines.findIndex((routine) => routine.id === id);
    if (idx < 0) return null;
    routines[idx] = { ...routines[idx], ...updates, updatedAt: now };
    await saveRoutinesLocal(routines);
    return routines[idx];
  }

  const routines = await listRoutines();
  const current = routines.find((routine) => routine.id === id);
  if (!current) return null;
  const next: RoutineDef = { ...current, ...updates, updatedAt: now };

  const { supabase, user } = session;
  const payload = routineToEntry(next, user.id, { legacyId: current.id });
  const { error } = await supabase.from('entries').update(payload).eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
  void ensureEntitiesFromEntry({ tags: next.tags ?? [], people: next.people ?? [], location: null });
  return next;
}

export async function deleteRoutine(id: string) {
  const session = await getSupabaseSessionUser();

  if (!session) {
    const routines = await loadRoutinesLocal();
    const next = routines.filter((routine) => routine.id !== id);
    await saveRoutinesLocal(next);
    return;
  }

  const { supabase } = session;
  const { data: lookup } = await supabase
    .from('entries')
    .select('id')
    .eq('frontmatter->>legacyId', id)
    .eq('frontmatter->>legacyType', 'routine_def')
    .maybeSingle();

  if (lookup?.id) {
    await supabase.from('entries').update({ deleted_at: new Date().toISOString() }).eq('id', lookup.id);
  }
}
