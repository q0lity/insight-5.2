import AsyncStorage from '@react-native-async-storage/async-storage';

import { fromIso, getSupabaseSessionUser, toIso, uniqStrings } from '@/src/supabase/helpers';
import { ensureEntitiesFromEntry } from '@/src/supabase/entities';

export type InboxCaptureStatus = 'raw' | 'parsed' | 'needs_clarification';

export type CaptureAttachment = {
  id: string;
  type: 'image' | 'audio' | 'location' | 'file';
  createdAt: number;
  uri?: string;
  label?: string;
  status?: 'pending' | 'ready' | 'failed';
  transcription?: string | null;
  analysis?: string | null;
  metadata?: Record<string, string | number | boolean>;
};

export type InboxCapture = {
  id: string;
  createdAt: number;
  rawText: string;
  status: InboxCaptureStatus;
  attachments?: CaptureAttachment[];
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
  importance?: number;
  difficulty?: number;
  points?: number | null;
  processedText?: string | null;
};

const STORAGE_KEY = 'insight5.inbox.v1';

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function listInboxCapturesLocal(): Promise<InboxCapture[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as InboxCapture[];
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => ({
      ...item,
      attachments: Array.isArray(item.attachments) ? item.attachments : [],
      tags: Array.isArray(item.tags) ? item.tags : [],
      contexts: Array.isArray(item.contexts) ? item.contexts : [],
      people: Array.isArray(item.people) ? item.people : [],
      skills: Array.isArray(item.skills) ? item.skills : [],
      character: Array.isArray(item.character) ? item.character : [],
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function listInboxCaptures(): Promise<InboxCapture[]> {
  const session = await getSupabaseSessionUser();
  if (!session) return listInboxCapturesLocal();

  const { supabase, user } = session;
  const { data, error } = await supabase
    .from('entries')
    .select('id, created_at, title, body_markdown, tags, people, contexts, frontmatter')
    .eq('user_id', user.id)
    .contains('facets', ['note'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error || !data) {
    return listInboxCapturesLocal();
  }
  return data.map((row) => {
    const fm = (row.frontmatter ?? {}) as Record<string, any>;
    return {
      id: row.id,
      createdAt: fromIso(row.created_at) ?? Date.now(),
      rawText: row.body_markdown ?? '',
      status: (fm.status as InboxCaptureStatus) ?? 'raw',
      attachments: Array.isArray(fm.attachments) ? fm.attachments : [],
      tags: Array.isArray(row.tags) ? uniqStrings(row.tags) : [],
      contexts: Array.isArray(row.contexts) ? uniqStrings(row.contexts) : [],
      people: Array.isArray(row.people) ? uniqStrings(row.people) : [],
      location: (fm.location as string | null) ?? null,
      skills: Array.isArray(fm.skills) ? fm.skills : [],
      character: Array.isArray(fm.character) ? fm.character : [],
      goal: (fm.goal as string | null) ?? null,
      project: (fm.project as string | null) ?? null,
      category: (fm.category as string | null) ?? null,
      subcategory: (fm.subcategory as string | null) ?? null,
      estimateMinutes: typeof fm.estimateMinutes === 'number' ? fm.estimateMinutes : null,
      importance: typeof fm.importance === 'number' ? fm.importance : undefined,
      difficulty: typeof fm.difficulty === 'number' ? fm.difficulty : undefined,
      points: typeof fm.points === 'number' ? fm.points : null,
      processedText: (fm.processedText as string | null) ?? null,
    };
  });
}

export async function updateInboxCapture(
  id: string,
  patch: Partial<Omit<InboxCapture, 'id' | 'createdAt' | 'rawText'>>
): Promise<InboxCapture | null> {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const existing = await listInboxCapturesLocal();
    const idx = existing.findIndex((item) => item.id === id);
    if (idx < 0) return null;
    const next: InboxCapture = {
      ...existing[idx],
      ...patch,
      attachments: patch.attachments ?? existing[idx].attachments ?? [],
      tags: patch.tags ?? existing[idx].tags ?? [],
      contexts: patch.contexts ?? existing[idx].contexts ?? [],
      people: patch.people ?? existing[idx].people ?? [],
      skills: patch.skills ?? existing[idx].skills ?? [],
      character: patch.character ?? existing[idx].character ?? [],
    };
    const updated = [...existing];
    updated[idx] = next;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return next;
  }

  const { supabase } = session;
  const { data: existing } = await supabase
    .from('entries')
    .select('frontmatter')
    .eq('id', id)
    .maybeSingle();

  const frontmatter = {
    ...(existing?.frontmatter ?? {}),
    status: patch.status ?? (existing?.frontmatter as any)?.status ?? 'raw',
    processedText: patch.processedText ?? (existing?.frontmatter as any)?.processedText ?? null,
  };

  const updatePayload: Record<string, unknown> = { frontmatter };
  if (patch.tags) updatePayload.tags = patch.tags;
  if (patch.contexts) updatePayload.contexts = patch.contexts;
  if (patch.people) updatePayload.people = patch.people;

  const { error } = await supabase.from('entries').update(updatePayload).eq('id', id);
  if (error) {
    throw new Error(error.message);
  }

  return {
    id,
    createdAt: Date.now(),
    rawText: '',
    status: (patch.status as InboxCaptureStatus) ?? 'parsed',
    attachments: patch.attachments ?? [],
    tags: patch.tags ?? [],
    contexts: patch.contexts ?? [],
    people: patch.people ?? [],
    location: patch.location ?? null,
    skills: patch.skills ?? [],
    character: patch.character ?? [],
    goal: patch.goal ?? null,
    project: patch.project ?? null,
    category: patch.category ?? null,
    subcategory: patch.subcategory ?? null,
    estimateMinutes: patch.estimateMinutes ?? null,
    importance: patch.importance,
    difficulty: patch.difficulty,
    points: patch.points ?? null,
    processedText: patch.processedText ?? null,
  };
}

export async function addInboxCapture(
  rawText: string,
  attachments: CaptureAttachment[] = [],
  meta?: {
    tags?: string[];
    contexts?: string[];
    location?: string;
    people?: string[];
    skills?: string[];
    character?: string[];
    goal?: string | null;
    project?: string | null;
    category?: string | null;
    subcategory?: string | null;
    estimateMinutes?: number | null;
    importance?: number;
    difficulty?: number;
    points?: number | null;
    processedText?: string | null;
  }
): Promise<InboxCapture> {
  const buildLocalCapture = async () => {
    const next: InboxCapture = {
      id: makeId(),
      createdAt: Date.now(),
      rawText,
      status: 'raw',
      attachments,
      tags: meta?.tags ?? [],
      contexts: meta?.contexts ?? [],
      location: meta?.location ?? null,
      people: meta?.people ?? [],
      skills: meta?.skills ?? [],
      character: meta?.character ?? [],
      goal: meta?.goal ?? null,
      project: meta?.project ?? null,
      category: meta?.category ?? null,
      subcategory: meta?.subcategory ?? null,
      estimateMinutes: meta?.estimateMinutes ?? null,
      importance: meta?.importance,
      difficulty: meta?.difficulty,
      points: meta?.points ?? null,
      processedText: meta?.processedText ?? null,
    };

    const existing = await listInboxCapturesLocal();
    const updated = [next, ...existing];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return next;
  };

  const session = await getSupabaseSessionUser();
  if (!session) {
    return buildLocalCapture();
  }

  const { supabase, user } = session;
  const frontmatter = {
    status: 'raw',
    attachments,
    location: meta?.location ?? null,
    skills: meta?.skills ?? [],
    character: meta?.character ?? [],
    goal: meta?.goal ?? null,
    project: meta?.project ?? null,
    category: meta?.category ?? null,
    subcategory: meta?.subcategory ?? null,
    estimateMinutes: meta?.estimateMinutes ?? null,
    importance: meta?.importance ?? null,
    difficulty: meta?.difficulty ?? null,
    points: meta?.points ?? null,
    processedText: meta?.processedText ?? null,
    sourceApp: 'mobile',
  };

  const { data, error } = await supabase
    .from('entries')
    .insert({
      user_id: user.id,
      title: rawText.split('\n')[0]?.slice(0, 80) || 'Capture',
      facets: ['note'],
      tags: meta?.tags ?? [],
      contexts: meta?.contexts ?? [],
      people: meta?.people ?? [],
      frontmatter,
      body_markdown: rawText ?? '',
      source: 'app',
      created_at: toIso(Date.now()),
    })
    .select('id, created_at')
    .single();

  if (error || !data) {
    return buildLocalCapture();
  }
  void ensureEntitiesFromEntry({ tags: meta?.tags ?? [], people: meta?.people ?? [], location: meta?.location ?? null });

  return {
    id: data.id,
    createdAt: fromIso(data.created_at) ?? Date.now(),
    rawText,
    status: 'raw',
    attachments,
    tags: meta?.tags ?? [],
    contexts: meta?.contexts ?? [],
    location: meta?.location ?? null,
    people: meta?.people ?? [],
    skills: meta?.skills ?? [],
    character: meta?.character ?? [],
    goal: meta?.goal ?? null,
    project: meta?.project ?? null,
    category: meta?.category ?? null,
    subcategory: meta?.subcategory ?? null,
    estimateMinutes: meta?.estimateMinutes ?? null,
    importance: meta?.importance,
    difficulty: meta?.difficulty,
    points: meta?.points ?? null,
    processedText: meta?.processedText ?? null,
  };
}

export async function syncLocalInboxToSupabase() {
  const session = await getSupabaseSessionUser();
  if (!session) return;
  const local = await listInboxCapturesLocal();
  if (!local.length) return;
  const { supabase, user } = session;

  for (const capture of local) {
    const frontmatter = {
      legacyId: capture.id,
      legacyType: 'note',
      status: capture.status ?? 'raw',
      attachments: capture.attachments ?? [],
      location: capture.location ?? null,
      skills: capture.skills ?? [],
      character: capture.character ?? [],
      goal: capture.goal ?? null,
      project: capture.project ?? null,
      category: capture.category ?? null,
      subcategory: capture.subcategory ?? null,
      estimateMinutes: capture.estimateMinutes ?? null,
      importance: capture.importance ?? null,
      difficulty: capture.difficulty ?? null,
      points: capture.points ?? null,
      processedText: capture.processedText ?? null,
      sourceApp: 'mobile',
    };

    const lookup = await supabase
      .from('entries')
      .select('id')
      .eq('frontmatter->>legacyId', capture.id)
      .eq('frontmatter->>legacyType', 'note')
      .maybeSingle();

    const payload = {
      user_id: user.id,
      title: capture.rawText.split('\n')[0]?.slice(0, 80) || 'Capture',
      facets: ['note'],
      tags: capture.tags ?? [],
      contexts: capture.contexts ?? [],
      people: capture.people ?? [],
      frontmatter,
      body_markdown: capture.rawText ?? '',
      source: 'app',
      created_at: toIso(capture.createdAt),
    };

    if (lookup.data?.id) {
      await supabase.from('entries').update(payload).eq('id', lookup.data.id);
    } else {
      await supabase.from('entries').insert(payload);
    }
    void ensureEntitiesFromEntry({ tags: capture.tags ?? [], people: capture.people ?? [], location: capture.location ?? null });
  }

  await AsyncStorage.removeItem(STORAGE_KEY);
}
