import AsyncStorage from '@react-native-async-storage/async-storage';

import { fromIso, getSupabaseSessionUser, normalizeEntityKey, toIso } from '@/src/supabase/helpers';

export type TrackerValueType = 'number' | 'scale' | 'boolean' | 'text' | 'duration';

export type MobileTrackerLog = {
  id: string;
  trackerKey: string;
  valueType: TrackerValueType;
  valueNumber?: number | null;
  valueText?: string | null;
  valueBool?: boolean | null;
  occurredAt: number;
  entryId?: string | null;
  unit?: string | null;
  rawToken?: string | null;
  metadata?: Record<string, string | number | boolean>;
};

export type TrackerLogEntry = {
  id: string;
  trackerKey: string;
  trackerLabel: string;
  valueType: TrackerValueType;
  valueNumber?: number | null;
  valueText?: string | null;
  valueBool?: boolean | null;
  occurredAt: number;
  entryId?: string | null;
  unit?: string | null;
  rawToken?: string | null;
};

const STORAGE_KEY = 'insight5.mobile.tracker_logs.v1';

function makeLogId() {
  return `trk_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeTrackerKey(raw: string) {
  return normalizeEntityKey(raw);
}

function formatDisplayName(rawKey: string) {
  return rawKey
    .trim()
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTrackerLabel(rawKey: string) {
  return formatDisplayName(rawKey);
}

function coerceTrackerValue(value: number | string | boolean) {
  if (typeof value === 'boolean') {
    return { valueType: 'boolean' as TrackerValueType, valueBool: value };
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { valueType: 'number' as TrackerValueType, valueNumber: value };
  }
  const text = String(value ?? '').trim();
  if (/^(true|false)$/i.test(text)) {
    return { valueType: 'boolean' as TrackerValueType, valueBool: text.toLowerCase() === 'true' };
  }
  const num = Number(text);
  if (Number.isFinite(num) && text !== '') {
    return { valueType: 'number' as TrackerValueType, valueNumber: num };
  }
  return { valueType: 'text' as TrackerValueType, valueText: text };
}

async function loadLocalLogs(): Promise<MobileTrackerLog[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MobileTrackerLog[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((log) => log && typeof log.id === 'string' && typeof log.trackerKey === 'string');
  } catch {
    return [];
  }
}

function logToEntry(log: MobileTrackerLog): TrackerLogEntry {
  return {
    id: log.id,
    trackerKey: log.trackerKey,
    trackerLabel: formatTrackerLabel(log.trackerKey),
    valueType: log.valueType,
    valueNumber: log.valueNumber ?? null,
    valueText: log.valueText ?? null,
    valueBool: log.valueBool ?? null,
    occurredAt: log.occurredAt,
    entryId: log.entryId ?? null,
    unit: log.unit ?? null,
    rawToken: log.rawToken ?? null,
  };
}

async function saveLocalLogs(logs: MobileTrackerLog[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // ignore
  }
}

async function updateLocalLog(id: string, patch: Partial<MobileTrackerLog>) {
  const logs = await loadLocalLogs();
  const idx = logs.findIndex((log) => log.id === id);
  if (idx < 0) return null;
  logs[idx] = { ...logs[idx], ...patch };
  await saveLocalLogs(logs);
  return logs[idx];
}

async function deleteLocalLog(id: string) {
  const logs = await loadLocalLogs();
  const next = logs.filter((log) => log.id !== id);
  if (next.length === logs.length) return false;
  await saveLocalLogs(next);
  return true;
}

type SupabaseSession = { supabase: any; user: { id: string } };

async function ensureTrackerDefinition(
  key: string,
  valueType: TrackerValueType,
  displayNameSource?: string,
  session?: SupabaseSession | null
): Promise<{ id: string; valueType: TrackerValueType } | null> {
  const resolvedSession = session ?? (await getSupabaseSessionUser());
  if (!resolvedSession) return null;
  const { supabase, user } = resolvedSession;
  const normalizedKey = normalizeTrackerKey(key);
  if (!normalizedKey) return null;

  const { data: existing, error: lookupError } = await supabase
    .from('tracker_definitions')
    .select('id, value_type')
    .eq('user_id', user.id)
    .eq('key', normalizedKey)
    .maybeSingle();

  if (lookupError && lookupError.code !== 'PGRST116') {
    return null;
  }
  if (existing?.id) {
    return { id: existing.id as string, valueType: (existing.value_type as TrackerValueType) ?? valueType };
  }

  const displayName = formatDisplayName(displayNameSource ?? normalizedKey);
  const { data: inserted, error: insertError } = await supabase
    .from('tracker_definitions')
    .insert({
      user_id: user.id,
      key: normalizedKey,
      display_name: displayName || normalizedKey,
      value_type: valueType,
    })
    .select('id, value_type')
    .single();

  if (insertError) {
    const { data: retry } = await supabase
      .from('tracker_definitions')
      .select('id, value_type')
      .eq('user_id', user.id)
      .eq('key', normalizedKey)
      .maybeSingle();
    if (retry?.id) {
      return { id: retry.id as string, valueType: (retry.value_type as TrackerValueType) ?? valueType };
    }
    return null;
  }

  return inserted?.id ? { id: inserted.id as string, valueType } : null;
}

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

export async function createTrackerLog(input: {
  trackerKey: string;
  value: number | string | boolean;
  occurredAt?: number;
  entryId?: string | null;
  unit?: string | null;
  rawToken?: string | null;
  metadata?: Record<string, string | number | boolean>;
}): Promise<MobileTrackerLog | null> {
  const normalizedKey = normalizeTrackerKey(input.trackerKey);
  if (!normalizedKey) return null;
  const occurredAt = input.occurredAt ?? Date.now();
  const { valueType, valueNumber, valueText, valueBool } = coerceTrackerValue(input.value);

  const log: MobileTrackerLog = {
    id: makeLogId(),
    trackerKey: normalizedKey,
    valueType,
    valueNumber: valueNumber ?? null,
    valueText: valueText ?? null,
    valueBool: valueBool ?? null,
    occurredAt,
    entryId: input.entryId ?? null,
    unit: input.unit ?? null,
    rawToken: input.rawToken ?? null,
    metadata: input.metadata ?? {},
  };

  const session = await getSupabaseSessionUser();
  if (!session) {
    const existing = await loadLocalLogs();
    existing.unshift(log);
    await saveLocalLogs(existing);
    return log;
  }

  const definition = await ensureTrackerDefinition(normalizedKey, valueType, input.trackerKey, session);
  if (!definition) {
    const existing = await loadLocalLogs();
    existing.unshift(log);
    await saveLocalLogs(existing);
    return log;
  }

  const { supabase, user } = session;
  const resolvedEntryId = await resolveEntryId(log.entryId, session);
  const payload = {
    user_id: user.id,
    tracker_id: definition.id,
    entry_id: resolvedEntryId,
    occurred_at: toIso(log.occurredAt) ?? toIso(Date.now()),
    value_numeric: log.valueNumber ?? null,
    value_text: log.valueText ?? null,
    value_bool: log.valueBool ?? null,
    unit: log.unit ?? null,
    raw_token: log.rawToken ?? null,
    metadata: { ...log.metadata, sourceApp: 'mobile' },
  };

  const { data, error } = await supabase.from('tracker_logs').insert(payload).select('id').single();
  if (error || !data) {
    const existing = await loadLocalLogs();
    existing.unshift(log);
    await saveLocalLogs(existing);
    return log;
  }
  return { ...log, id: data.id ?? log.id };
}

export async function listTrackerLogs(options?: {
  limit?: number;
  startAt?: number | null;
  endAt?: number | null;
  entryId?: string | null;
}): Promise<TrackerLogEntry[]> {
  const session = await getSupabaseSessionUser();
  if (!session) {
    const local = await loadLocalLogs();
    const entryId = options?.entryId ?? null;
    const startAt = options?.startAt ?? null;
    const endAt = options?.endAt ?? null;
    const filtered = local.filter((log) => {
      if (entryId && log.entryId !== entryId) return false;
      if (startAt != null && log.occurredAt < startAt) return false;
      if (endAt != null && log.occurredAt > endAt) return false;
      return true;
    });
    const sorted = filtered.sort((a, b) => b.occurredAt - a.occurredAt);
    const limited = options?.limit ? sorted.slice(0, options.limit) : sorted;
    return limited.map(logToEntry);
  }

  const { supabase, user } = session;
  let query = supabase
    .from('tracker_logs')
    .select(
      'id, occurred_at, value_numeric, value_text, value_bool, unit, raw_token, entry_id, tracker_definitions ( key, display_name, value_type )'
    )
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false });

  if (options?.entryId) {
    const resolvedEntryId = await resolveEntryId(options.entryId, session);
    if (!resolvedEntryId) return [];
    query = query.eq('entry_id', resolvedEntryId);
  }
  if (options?.startAt) {
    query = query.gte('occurred_at', toIso(options.startAt) ?? new Date(options.startAt).toISOString());
  }
  if (options?.endAt) {
    query = query.lte('occurred_at', toIso(options.endAt) ?? new Date(options.endAt).toISOString());
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error || !data) {
    const local = await loadLocalLogs();
    const startAt = options?.startAt ?? null;
    const endAt = options?.endAt ?? null;
    const entryId = options?.entryId ?? null;
    const filtered = local.filter((log) => {
      if (entryId && log.entryId !== entryId) return false;
      if (startAt != null && log.occurredAt < startAt) return false;
      if (endAt != null && log.occurredAt > endAt) return false;
      return true;
    });
    const sorted = filtered.sort((a, b) => b.occurredAt - a.occurredAt);
    const limited = options?.limit ? sorted.slice(0, options.limit) : sorted;
    return limited.map(logToEntry);
  }

  return data.map((row: any) => {
    const def = Array.isArray(row.tracker_definitions) ? row.tracker_definitions[0] : row.tracker_definitions;
    const key = (def?.key as string | undefined) ?? 'tracker';
    const label = (def?.display_name as string | undefined) ?? formatTrackerLabel(key);
    const valueType =
      (def?.value_type as TrackerValueType | undefined) ??
      (row.value_bool != null ? 'boolean' : row.value_text != null ? 'text' : 'number');
    const valueNumber = row.value_numeric != null ? Number(row.value_numeric) : null;

    return {
      id: row.id,
      trackerKey: key,
      trackerLabel: label,
      valueType,
      valueNumber,
      valueText: row.value_text ?? null,
      valueBool: row.value_bool ?? null,
      occurredAt: fromIso(row.occurred_at) ?? Date.now(),
      entryId: row.entry_id ?? null,
      unit: row.unit ?? null,
      rawToken: row.raw_token ?? null,
    };
  });
}

export async function listUniqueTrackers(): Promise<string[]> {
  const local = await loadLocalLogs();
  const localKeys = new Set<string>();
  local.forEach((log) => {
    if (log.trackerKey) localKeys.add(log.trackerKey);
  });

  const session = await getSupabaseSessionUser();
  if (!session) {
    return Array.from(localKeys).sort();
  }

  const { supabase, user } = session;
  const { data, error } = await supabase
    .from('tracker_definitions')
    .select('key')
    .eq('user_id', user.id)
    .order('key', { ascending: true });

  if (error || !data) {
    return Array.from(localKeys).sort();
  }

  const merged = new Set(localKeys);
  data.forEach((row: any) => {
    const key = normalizeTrackerKey(String(row?.key ?? ''));
    if (key) merged.add(key);
  });

  return Array.from(merged).sort();
}

export async function updateTrackerLog(
  id: string,
  patch: {
    value?: number | string | boolean;
    occurredAt?: number;
    unit?: string | null;
    rawToken?: string | null;
  }
): Promise<TrackerLogEntry | null> {
  const hasValue = patch.value !== undefined;
  const session = await getSupabaseSessionUser();
  if (!session || !isUuid(id)) {
    const localPatch: Partial<MobileTrackerLog> = {};
    if (hasValue) {
      const { valueType, valueNumber, valueText, valueBool } = coerceTrackerValue(patch.value as any);
      localPatch.valueType = valueType;
      localPatch.valueNumber = valueNumber ?? null;
      localPatch.valueText = valueText ?? null;
      localPatch.valueBool = valueBool ?? null;
    }
    if (patch.occurredAt !== undefined) localPatch.occurredAt = patch.occurredAt;
    if (patch.unit !== undefined) localPatch.unit = patch.unit;
    if (patch.rawToken !== undefined) localPatch.rawToken = patch.rawToken ?? null;
    const updated = await updateLocalLog(id, localPatch);
    return updated ? logToEntry(updated) : null;
  }

  const { supabase, user } = session;
  const payload: Record<string, unknown> = {};
  if (hasValue) {
    const { valueNumber, valueText, valueBool } = coerceTrackerValue(patch.value as any);
    payload.value_numeric = valueNumber ?? null;
    payload.value_text = valueText ?? null;
    payload.value_bool = valueBool ?? null;
  }
  if (patch.occurredAt !== undefined) {
    payload.occurred_at = toIso(patch.occurredAt) ?? new Date(patch.occurredAt).toISOString();
  }
  if (patch.unit !== undefined) payload.unit = patch.unit;
  if (patch.rawToken !== undefined) payload.raw_token = patch.rawToken;
  if (!Object.keys(payload).length) return null;

  const { error } = await supabase.from('tracker_logs').update(payload).eq('id', id).eq('user_id', user.id);
  if (error) {
    throw new Error(error.message);
  }
  return null;
}

export async function deleteTrackerLog(id: string) {
  const session = await getSupabaseSessionUser();
  if (!session || !isUuid(id)) {
    const removed = await deleteLocalLog(id);
    if (removed) return;
  }

  if (!session) return;
  const { supabase, user } = session;
  if (isUuid(id)) {
    const { error } = await supabase.from('tracker_logs').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase
    .from('tracker_logs')
    .delete()
    .eq('user_id', user.id)
    .eq('metadata->>legacyId', id);
  if (error) throw new Error(error.message);
}

export async function syncLocalTrackerLogsToSupabase() {
  const session = await getSupabaseSessionUser();
  if (!session) return;
  const logs = await loadLocalLogs();
  if (!logs.length) return;
  const { supabase, user } = session;

  for (const log of logs) {
    const definition = await ensureTrackerDefinition(log.trackerKey, log.valueType, log.trackerKey, session);
    if (!definition) continue;
    const resolvedEntryId = await resolveEntryId(log.entryId, session);
    const payload = {
      user_id: user.id,
      tracker_id: definition.id,
      entry_id: resolvedEntryId,
      occurred_at: toIso(log.occurredAt) ?? toIso(Date.now()),
      value_numeric: log.valueNumber ?? null,
      value_text: log.valueText ?? null,
      value_bool: log.valueBool ?? null,
      unit: log.unit ?? null,
      raw_token: log.rawToken ?? null,
      metadata: { ...(log.metadata ?? {}), legacyId: log.id, sourceApp: 'mobile' },
    };

    const lookup = await supabase
      .from('tracker_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('metadata->>legacyId', log.id)
      .maybeSingle();

    if (lookup.data?.id) {
      await supabase.from('tracker_logs').update(payload).eq('id', lookup.data.id);
    } else {
      await supabase.from('tracker_logs').insert(payload);
    }
  }

  await AsyncStorage.removeItem(STORAGE_KEY);
}
