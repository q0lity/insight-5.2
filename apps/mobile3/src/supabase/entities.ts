import { getSupabaseSessionUser, normalizeEntityKey } from '@/src/supabase/helpers';

export type EntityType = 'tag' | 'person' | 'place';

export async function ensureEntity(type: EntityType, key: string, displayName?: string) {
  const session = await getSupabaseSessionUser();
  if (!session) return null;
  const { supabase, user } = session;
  const normalizedKey = normalizeEntityKey(key);
  if (!normalizedKey) return null;

  const { data: existing, error: lookupError } = await supabase
    .from('entities')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', type)
    .eq('key', normalizedKey)
    .maybeSingle();

  if (lookupError && lookupError.code !== 'PGRST116') {
    return null;
  }
  if (existing?.id) return existing.id as string;

  const { data: inserted, error: insertError } = await supabase
    .from('entities')
    .insert({
      user_id: user.id,
      type,
      key: normalizedKey,
      display_name: displayName?.trim() || key.trim(),
    })
    .select('id')
    .single();

  if (insertError) {
    const { data: retry } = await supabase
      .from('entities')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', type)
      .eq('key', normalizedKey)
      .maybeSingle();
    return retry?.id ?? null;
  }

  return inserted?.id ?? null;
}

export async function ensureEntitiesFromEntry(input: { tags?: string[]; people?: string[]; location?: string | null }) {
  const tags = input.tags ?? [];
  const people = input.people ?? [];
  const location = input.location ?? null;

  const operations: Array<Promise<string | null>> = [];
  for (const tag of tags) {
    const raw = tag.replace(/^#/, '').trim();
    if (!raw) continue;
    operations.push(ensureEntity('tag', raw, raw));
  }
  for (const person of people) {
    const raw = person.trim();
    if (!raw) continue;
    operations.push(ensureEntity('person', raw, raw));
  }
  if (location) {
    operations.push(ensureEntity('place', location, location));
  }

  if (!operations.length) return [];
  return Promise.all(operations);
}
