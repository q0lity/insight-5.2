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

type SupabaseSession = { supabase: any; user: { id: string } };
type SupabaseAttachmentRow = {
  id: string;
  created_at?: string | null;
  bucket: string;
  path: string;
  mime_type?: string | null;
  byte_size?: number | null;
  metadata?: Record<string, unknown> | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function resolveEntryId(entryId: string | null | undefined, session?: SupabaseSession | null) {
  if (!entryId) return null;
  if (isUuid(entryId)) return entryId;
  const resolvedSession = session ?? (await getSupabaseSessionUser());
  if (!resolvedSession) return null;
  const { supabase, user } = resolvedSession;
  const { data } = await supabase
    .from('entries')
    .select('id')
    .eq('user_id', user.id)
    .eq('frontmatter->>legacyId', entryId)
    .maybeSingle();
  return data?.id ?? null;
}

function compactAttachmentMetadata(metadata: Record<string, unknown>) {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      out[key] = value;
    }
  }
  return out;
}

function buildAttachmentMetadata(attachment: CaptureAttachment) {
  const merged = {
    ...(attachment.metadata ?? {}),
    localId: attachment.id,
    type: attachment.type,
    label: attachment.label ?? null,
    status: attachment.status ?? null,
    transcription: attachment.transcription ?? null,
    analysis: attachment.analysis ?? null,
  };
  return compactAttachmentMetadata(merged);
}

function mergeAttachments(primary: CaptureAttachment[], fallback: CaptureAttachment[]) {
  const map = new Map<string, CaptureAttachment>();
  for (const item of fallback) {
    map.set(item.id, item);
  }
  for (const item of primary) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      continue;
    }
    map.set(item.id, {
      ...existing,
      ...item,
      metadata: { ...(existing.metadata ?? {}), ...(item.metadata ?? {}) },
    });
  }
  return Array.from(map.values()).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

function mapSupabaseAttachments(rows: SupabaseAttachmentRow[] | null | undefined): CaptureAttachment[] {
  if (!rows?.length) return [];
  return rows.map((row) => {
    const meta = (row.metadata ?? {}) as Record<string, any>;
    const id = typeof meta.localId === 'string' ? meta.localId : row.id;
    const type = (meta.type as CaptureAttachment['type']) ?? 'file';
    const status = (meta.status as CaptureAttachment['status']) ?? 'ready';
    const transcription = typeof meta.transcription === 'string' ? meta.transcription : null;
    const analysis = typeof meta.analysis === 'string' ? meta.analysis : null;
    const metadata = compactAttachmentMetadata({
      ...meta,
      storageBucket: row.bucket,
      storagePath: row.path,
      contentType: row.mime_type ?? undefined,
      byteSize: row.byte_size ?? undefined,
    });
    return {
      id,
      type,
      createdAt: fromIso(row.created_at ?? null) ?? Date.now(),
      label: typeof meta.label === 'string' ? meta.label : undefined,
      status,
      transcription,
      analysis,
      metadata,
    };
  });
}

async function upsertSupabaseAttachment(entryId: string, attachment: CaptureAttachment, session: SupabaseSession) {
  const { supabase, user } = session;
  const resolvedEntryId = await resolveEntryId(entryId, session);
  if (!resolvedEntryId) return;
  const bucket = typeof attachment.metadata?.storageBucket === 'string' ? attachment.metadata.storageBucket : null;
  const path = typeof attachment.metadata?.storagePath === 'string' ? attachment.metadata.storagePath : null;
  if (!bucket || !path) return;

  const metadata = buildAttachmentMetadata(attachment);
  const contentType = typeof attachment.metadata?.contentType === 'string' ? attachment.metadata.contentType : null;
  const byteSize = typeof attachment.metadata?.byteSize === 'number' ? attachment.metadata.byteSize : null;

  const payload = {
    user_id: user.id,
    entry_id: resolvedEntryId,
    bucket,
    path,
    mime_type: contentType,
    byte_size: byteSize,
    metadata,
  };

  const { data: existing } = await supabase
    .from('attachments')
    .select('id')
    .eq('entry_id', resolvedEntryId)
    .eq('metadata->>localId', attachment.id)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from('attachments').update(payload).eq('id', existing.id);
    return;
  }

  const { data: pathMatch } = await supabase
    .from('attachments')
    .select('id')
    .eq('entry_id', resolvedEntryId)
    .eq('path', path)
    .maybeSingle();

  if (pathMatch?.id) {
    await supabase.from('attachments').update(payload).eq('id', pathMatch.id);
    return;
  }

  await supabase.from('attachments').insert(payload);
}

async function syncAttachmentsWithSession(
  entryId: string,
  attachments: CaptureAttachment[] | undefined,
  session: SupabaseSession
) {
  if (!attachments?.length) return;
  const pending = attachments.filter(
    (item) => typeof item.metadata?.storageBucket === 'string' && typeof item.metadata?.storagePath === 'string'
  );
  if (!pending.length) return;
  for (const attachment of pending) {
    await upsertSupabaseAttachment(entryId, attachment, session);
  }
}

export async function syncCaptureAttachments(entryId: string, attachments: CaptureAttachment[]) {
  const session = await getSupabaseSessionUser();
  if (!session) return;
  await syncAttachmentsWithSession(entryId, attachments, session);
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
    .select(
      'id, created_at, title, body_markdown, tags, people, contexts, frontmatter, attachments ( id, created_at, bucket, path, mime_type, byte_size, metadata )'
    )
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
    const supabaseAttachments = mapSupabaseAttachments(
      Array.isArray((row as any).attachments) ? ((row as any).attachments as SupabaseAttachmentRow[]) : []
    );
    const frontmatterAttachments = Array.isArray(fm.attachments) ? fm.attachments : [];
    const attachments = mergeAttachments(supabaseAttachments, frontmatterAttachments);
    return {
      id: row.id,
      createdAt: fromIso(row.created_at) ?? Date.now(),
      rawText: row.body_markdown ?? '',
      status: (fm.status as InboxCaptureStatus) ?? 'raw',
      attachments,
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
  if (patch.attachments !== undefined) {
    frontmatter.attachments = patch.attachments;
  }

  const updatePayload: Record<string, unknown> = { frontmatter };
  if (patch.tags) updatePayload.tags = patch.tags;
  if (patch.contexts) updatePayload.contexts = patch.contexts;
  if (patch.people) updatePayload.people = patch.people;

  const { error } = await supabase.from('entries').update(updatePayload).eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
  await syncAttachmentsWithSession(id, patch.attachments, session);

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

export async function updateInboxCaptureText(id: string, rawText: string) {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const existing = await listInboxCapturesLocal();
    const idx = existing.findIndex((item) => item.id === id);
    if (idx < 0) return;
    const next: InboxCapture = {
      ...existing[idx],
      rawText,
    };
    const updated = [...existing];
    updated[idx] = next;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return;
  }

  const { supabase } = session;
  const title = rawText.split('\n')[0]?.slice(0, 80) || 'Capture';
  const { error } = await supabase.from('entries').update({ title, body_markdown: rawText }).eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
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
  const buildLocalCapture = async (reason: string) => {
    console.log('[Inbox] Building LOCAL capture -', reason);
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
    console.log('[Inbox] Local capture ID:', next.id);

    const existing = await listInboxCapturesLocal();
    const updated = [next, ...existing];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return next;
  };

  console.log('[Inbox] addInboxCapture - getting session...');
  const session = await getSupabaseSessionUser();
  if (!session) {
    console.log('[Inbox] No session found');
    return buildLocalCapture('no session');
  }
  console.log('[Inbox] Session found for user:', session.user?.id, session.user?.email ?? '(no email)');

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

  console.log('[Inbox] Inserting capture into Supabase...');
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
    console.error('[Inbox] Supabase insert failed:', error?.message ?? 'no data returned');
    return buildLocalCapture(`supabase error: ${error?.message ?? 'no data'}`);
  }
  console.log('[Inbox] Supabase capture created with UUID:', data.id);
  await syncAttachmentsWithSession(data.id, attachments, session);
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
    const resolvedId = lookup.data?.id ?? null;
    await syncAttachmentsWithSession(resolvedId ?? capture.id, capture.attachments ?? [], session);
    void ensureEntitiesFromEntry({ tags: capture.tags ?? [], people: capture.people ?? [], location: capture.location ?? null });
  }

  await AsyncStorage.removeItem(STORAGE_KEY);
}
