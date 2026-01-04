import { getSupabaseSessionUser } from './helpers';

type SupabaseSession = { supabase: any; user: { id: string } };

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

export async function upsertTranscriptSegment(entryId: string, transcript: string) {
  const trimmed = transcript.trim();
  if (!trimmed) return;
  const session = await getSupabaseSessionUser();
  if (!session) return;
  const { supabase, user } = session;
  const resolvedEntryId = await resolveEntryId(entryId, session);
  if (!resolvedEntryId) return;

  const { data: existing } = await supabase
    .from('entry_segments')
    .select('id')
    .eq('user_id', user.id)
    .eq('entry_id', resolvedEntryId)
    .eq('segment_type', 'transcript')
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from('entry_segments').update({ content: trimmed }).eq('id', existing.id);
    return;
  }

  await supabase.from('entry_segments').insert({
    user_id: user.id,
    entry_id: resolvedEntryId,
    at_offset_minutes: 0,
    segment_type: 'transcript',
    content: trimmed,
  });
}
