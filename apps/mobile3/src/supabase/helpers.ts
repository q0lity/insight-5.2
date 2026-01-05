import { getSupabaseClient } from './client';

export async function getSupabaseSessionUser() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, user: data.user };
}

export function toIso(ms?: number | null) {
  if (!ms || !Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export function fromIso(iso?: string | null) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export function uniqStrings(items: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const next = item.trim();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}

export function normalizeEntityKey(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}
