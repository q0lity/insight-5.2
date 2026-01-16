import AsyncStorage from '@react-native-async-storage/async-storage';

import { fromIso, getSupabaseSessionUser, toIso, uniqStrings } from '@/src/supabase/helpers';
import { ensureEntitiesFromEntry } from '@/src/supabase/entities';

export type MobileEventKind = 'event' | 'task' | 'log' | 'episode';

export type MobileEvent = {
  id: string;
  title: string;
  kind: MobileEventKind;
  startAt: number;
  endAt: number | null;
  active: boolean;
  trackerKey?: string | null;
  notes?: string;
  frontmatter?: string;
  tags?: string[];
  contexts?: string[];
  people?: string[];
  location?: string | null;
  skills?: string[];
  character?: string[];
  goal?: string | null;
  project?: string | null;
  category?: string | null;
  subcategory?: string | null;
  estimateMinutes?: number | null;
  importance?: number | null;
  difficulty?: number | null;
  points?: number | null;
  taskId?: string | null;
  parentEventId?: string | null;
};

const STORAGE_KEY = 'insight5.mobile.events.v1';

function makeEventId() {
  return `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function loadEventsLocal(): Promise<MobileEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MobileEvent[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => e && typeof e.id === 'string' && typeof e.title === 'string');
  } catch {
    return [];
  }
}

async function saveEventsLocal(events: MobileEvent[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore
  }
}

async function upsertLocalEvent(event: MobileEvent) {
  const events = await loadEventsLocal();
  const idx = events.findIndex((e) => e.id === event.id);
  if (idx >= 0) {
    events[idx] = event;
  } else {
    events.unshift(event);
  }
  await saveEventsLocal(events);
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

function normalizeEventTitle(title: string) {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function eventSignature(event: MobileEvent) {
  const startBucket = Math.floor(event.startAt / 60000);
  const endBucket = event.endAt ? Math.floor(event.endAt / 60000) : 'open';
  const titleKey = normalizeEventTitle(event.title || '');
  const kindKey = event.kind ?? 'event';
  const categoryKey = (event.category ?? '').trim().toLowerCase();
  const subcategoryKey = (event.subcategory ?? '').trim().toLowerCase();
  return `${kindKey}|${titleKey}|${startBucket}|${endBucket}|${categoryKey}|${subcategoryKey}`;
}

function dedupeEvents(events: MobileEvent[]) {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const out: MobileEvent[] = [];

  for (const event of events) {
    if (seenIds.has(event.id)) continue;
    const signature = eventSignature(event);
    if (seenKeys.has(signature)) continue;
    seenIds.add(event.id);
    seenKeys.add(signature);
    out.push(event);
  }

  return out;
}

function entryToMobileEvent(row: any): MobileEvent {
  const fm = (row.frontmatter ?? {}) as Record<string, any>;
  const tags = Array.isArray(row.tags) ? uniqStrings(row.tags.map(normalizeTagForMobile)) : [];
  const people = Array.isArray(row.people) ? uniqStrings(row.people) : [];
  const contexts = Array.isArray(row.contexts) ? uniqStrings(row.contexts) : [];
  const startAt = fromIso(row.start_at) ?? fromIso(row.created_at) ?? Date.now();
  const endAt = fromIso(row.end_at);
  const active = typeof fm.active === 'boolean' ? fm.active : endAt == null;

  return {
    id: row.id,
    title: row.title ?? 'Event',
    kind: (fm.kind as MobileEventKind) ?? 'event',
    startAt,
    endAt,
    active,
    trackerKey: (fm.trackerKey as string | null) ?? null,
    notes: row.body_markdown ?? '',
    frontmatter: Object.keys(fm).length ? JSON.stringify(fm) : '',
    tags,
    contexts,
    people,
    location: (fm.location as string | null) ?? null,
    skills: Array.isArray(fm.skills) ? fm.skills : [],
    character: Array.isArray(fm.character) ? fm.character : [],
    goal: (fm.goal as string | null) ?? null,
    project: (fm.project as string | null) ?? null,
    category: (fm.category as string | null) ?? null,
    subcategory: (fm.subcategory as string | null) ?? null,
    estimateMinutes: typeof fm.estimateMinutes === 'number' ? fm.estimateMinutes : row.duration_minutes ?? null,
    importance: typeof row.importance === 'number' ? row.importance : fm.importance ?? null,
    difficulty: typeof row.difficulty === 'number' ? row.difficulty : fm.difficulty ?? null,
    points: typeof fm.points === 'number' ? fm.points : null,
    taskId: (fm.taskId as string | null) ?? null,
    parentEventId: (fm.parentEventId as string | null) ?? null,
  };
}

function mobileEventToEntry(event: MobileEvent, userId: string, options?: { legacyId?: string | null }) {
  const tags = uniqStrings((event.tags ?? []).map(normalizeTagForSupabase).filter(Boolean));
  const people = uniqStrings(event.people ?? []);
  const contexts = uniqStrings(event.contexts ?? []);
  let baseFrontmatter: Record<string, unknown> = {}
  if (event.frontmatter) {
    try {
      baseFrontmatter = JSON.parse(event.frontmatter)
    } catch {
      baseFrontmatter = {}
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
      : 'event';

  const frontmatter = {
    ...baseFrontmatter,
    ...(legacyId ? { legacyId, legacyType } : {}),
    kind: event.kind,
    trackerKey: event.trackerKey ?? null,
    location: event.location ?? null,
    skills: event.skills ?? [],
    character: event.character ?? [],
    goal: event.goal ?? null,
    project: event.project ?? null,
    category: event.category ?? null,
    subcategory: event.subcategory ?? null,
    estimateMinutes: event.estimateMinutes ?? null,
    importance: event.importance ?? null,
    difficulty: event.difficulty ?? null,
    points: event.points ?? null,
    active: event.active ?? false,
    taskId: event.taskId ?? null,
    parentEventId: event.parentEventId ?? null,
    sourceApp: 'mobile',
  };

  return {
    user_id: userId,
    title: event.title,
    facets: ['event'],
    start_at: toIso(event.startAt),
    end_at: toIso(event.endAt),
    duration_minutes: event.estimateMinutes ?? null,
    difficulty: event.difficulty ?? null,
    importance: event.importance ?? null,
    tags,
    contexts,
    people,
    frontmatter,
    body_markdown: event.notes ?? '',
    source: 'app',
  };
}

export async function listEvents() {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const events = await loadEventsLocal();
    return dedupeEvents(events.sort((a, b) => b.startAt - a.startAt));
  }
  const { supabase, user } = session;
  const { data, error } = await supabase
    .from('entries')
    .select('id, title, created_at, start_at, end_at, body_markdown, tags, people, contexts, importance, difficulty, duration_minutes, frontmatter')
    .eq('user_id', user.id)
    .contains('facets', ['event'])
    .is('deleted_at', null)
    .order('start_at', { ascending: false })
    .limit(2000);

  if (error || !data) {
    const events = await loadEventsLocal();
    return dedupeEvents(events.sort((a, b) => b.startAt - a.startAt));
  }
  return dedupeEvents(data.map(entryToMobileEvent)).sort((a, b) => b.startAt - a.startAt);
}

export async function getEvent(id: string) {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const events = await loadEventsLocal();
    return events.find((event) => event.id === id) ?? null;
  }
  const { supabase, user } = session;
  const { data, error } = await supabase
    .from('entries')
    .select('id, title, created_at, start_at, end_at, body_markdown, tags, people, contexts, importance, difficulty, duration_minutes, frontmatter')
    .eq('user_id', user.id)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    const events = await loadEventsLocal();
    return events.find((event) => event.id === id) ?? null;
  }
  return entryToMobileEvent(data);
}

export async function startEvent(input: {
  id?: string;
  title: string;
  kind?: MobileEventKind;
  startAt?: number;
  endAt?: number | null;
  trackerKey?: string | null;
  notes?: string;
  frontmatter?: string;
  tags?: string[];
  contexts?: string[];
  people?: string[];
  location?: string | null;
  skills?: string[];
  character?: string[];
  goal?: string | null;
  project?: string | null;
  category?: string | null;
  subcategory?: string | null;
  estimateMinutes?: number | null;
  importance?: number | null;
  difficulty?: number | null;
  points?: number | null;
  taskId?: string | null;
  parentEventId?: string | null;
}) {
  const now = Date.now();
  const endAt = input.endAt ?? null;
  const isCompleted = endAt !== null || input.kind === 'log';
  const event: MobileEvent = {
    id: input.id ?? makeEventId(),
    title: input.title,
    kind: input.kind ?? 'event',
    startAt: input.startAt ?? now,
    endAt,
    active: !isCompleted,
    trackerKey: input.trackerKey ?? null,
    notes: input.notes ?? '',
    frontmatter: input.frontmatter ?? '',
    tags: input.tags ?? [],
    contexts: input.contexts ?? [],
    people: input.people ?? [],
    location: input.location ?? null,
    skills: input.skills ?? [],
    character: input.character ?? [],
    goal: input.goal ?? null,
    project: input.project ?? null,
    category: input.category ?? null,
    subcategory: input.subcategory ?? null,
    estimateMinutes: input.estimateMinutes ?? null,
    importance: input.importance ?? null,
    difficulty: input.difficulty ?? null,
    points: input.points ?? null,
    taskId: input.taskId ?? null,
    parentEventId: input.parentEventId ?? null,
  };

  const session = await getSupabaseSessionUser();
  if (!session) {
    const events = await loadEventsLocal();
    events.unshift(event);
    await saveEventsLocal(events);
    return event;
  }

  const { supabase, user } = session;
  const payload = mobileEventToEntry(event, user.id, { legacyId: event.id });
  const existing = await supabase
    .from('entries')
    .select('id')
    .eq('frontmatter->>legacyId', event.id)
    .eq('frontmatter->>legacyType', 'event')
    .maybeSingle();

  if (existing.data?.id) {
    const { error } = await supabase.from('entries').update(payload).eq('id', existing.data.id);
    if (error) {
      const events = await loadEventsLocal();
      events.unshift(event);
      await saveEventsLocal(events);
      return event;
    }
    const nextEvent = { ...event, id: existing.data.id };
    await upsertLocalEvent(nextEvent);
    void ensureEntitiesFromEntry({ tags: event.tags ?? [], people: event.people ?? [], location: event.location ?? null });
    return nextEvent;
  }

  const { data, error } = await supabase.from('entries').insert(payload).select('id').single();
  if (error || !data) {
    const events = await loadEventsLocal();
    events.unshift(event);
    await saveEventsLocal(events);
    return event;
  }
  const nextEvent = { ...event, id: data.id };
  await upsertLocalEvent(nextEvent);
  void ensureEntitiesFromEntry({ tags: event.tags ?? [], people: event.people ?? [], location: event.location ?? null });
  return nextEvent;
}

export async function updateEvent(id: string, patch: Partial<MobileEvent>) {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const events = await loadEventsLocal();
    const idx = events.findIndex((e) => e.id === id);
    if (idx < 0) return null;
    events[idx] = { ...events[idx], ...patch };
    await saveEventsLocal(events);
    return events[idx];
  }

  const existing = await getEvent(id);
  if (!existing) return null;
  const next = { ...existing, ...patch };

  try {
    const { supabase, user } = session;
    const payload = mobileEventToEntry(next, user.id);
    const { error } = await supabase.from('entries').update(payload).eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    void ensureEntitiesFromEntry({ tags: next.tags ?? [], people: next.people ?? [], location: next.location ?? null });
    return next;
  } catch (err) {
    console.warn('Failed to update event; keeping local copy if available.', err);
    const events = await loadEventsLocal();
    const idx = events.findIndex((e) => e.id === id);
    if (idx < 0) return null;
    events[idx] = { ...events[idx], ...patch };
    await saveEventsLocal(events);
    return events[idx];
  }
}

export async function stopEvent(id: string, endAt = Date.now()) {
  return updateEvent(id, { endAt, active: false });
}

export async function findActiveEvent() {
  const events = await listEvents();
  return events.find((e) => e.active) ?? null;
}

export async function findActiveEventByTrackerKey(trackerKey: string) {
  const events = await listEvents();
  return events.find((e) => e.active && e.trackerKey === trackerKey) ?? null;
}

export async function getPointsByDay(startDate: Date, endDate: Date): Promise<Record<string, number>> {
  const events = await listEvents();
  const result: Record<string, number> = {};

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  for (const event of events) {
    if (event.startAt < start.getTime() || event.startAt > end.getTime()) continue;

    const day = new Date(event.startAt);
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const dayNum = String(day.getDate()).padStart(2, '0');
    const key = `${year}-${month}-${dayNum}`;

    const points = event.points ?? 0;
    result[key] = (result[key] ?? 0) + points;
  }

  return result;
}

export async function getDailyStats(days: number): Promise<{
  totalPoints: number;
  totalMinutes: number;
  activeDays: number;
  streak: number;
}> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  const events = await listEvents();
  const dayStats: Record<string, { points: number; minutes: number }> = {};

  for (const event of events) {
    if (event.startAt < startDate.getTime() || event.startAt > endDate.getTime()) continue;

    const day = new Date(event.startAt);
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const dayNum = String(day.getDate()).padStart(2, '0');
    const key = `${year}-${month}-${dayNum}`;

    if (!dayStats[key]) {
      dayStats[key] = { points: 0, minutes: 0 };
    }

    dayStats[key].points += event.points ?? 0;

    if (event.endAt) {
      dayStats[key].minutes += Math.round((event.endAt - event.startAt) / 60000);
    } else if (event.estimateMinutes) {
      dayStats[key].minutes += event.estimateMinutes;
    }
  }

  const totalPoints = Object.values(dayStats).reduce((sum, d) => sum + d.points, 0);
  const totalMinutes = Object.values(dayStats).reduce((sum, d) => sum + d.minutes, 0);
  const activeDays = Object.keys(dayStats).length;

  // Calculate streak (consecutive days with activity ending today)
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const year = checkDate.getFullYear();
    const month = String(checkDate.getMonth() + 1).padStart(2, '0');
    const dayNum = String(checkDate.getDate()).padStart(2, '0');
    const key = `${year}-${month}-${dayNum}`;

    if (dayStats[key] && dayStats[key].points > 0) {
      streak++;
    } else if (i > 0) {
      // Allow today to have no activity, but break if any previous day is missing
      break;
    }
  }

  return { totalPoints, totalMinutes, activeDays, streak };
}

export async function syncLocalEventsToSupabase() {
  const session = await getSupabaseSessionUser();
  if (!session) return;
  const events = await loadEventsLocal();
  if (!events.length) return;
  const { supabase, user } = session;

  for (const event of events) {
    const payload = mobileEventToEntry(event, user.id, { legacyId: event.id });
    const lookup = await supabase
      .from('entries')
      .select('id')
      .eq('frontmatter->>legacyId', event.id)
      .eq('frontmatter->>legacyType', 'event')
      .maybeSingle();

    if (lookup.data?.id) {
      await supabase.from('entries').update(payload).eq('id', lookup.data.id);
    } else {
      await supabase.from('entries').insert(payload);
    }
    void ensureEntitiesFromEntry({ tags: event.tags ?? [], people: event.people ?? [], location: event.location ?? null });
  }

  await AsyncStorage.removeItem(STORAGE_KEY);
}
