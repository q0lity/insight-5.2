import { getSupabaseClient } from '@/src/supabase/client';

export type CaptureParsePayload = {
  captureId: string;
  audioPath?: string | null;
  transcript?: string | null;
  context?: {
    activeGoalIds?: string[];
    activeProjectIds?: string[];
    activeEntryId?: string | null;
  } | null;
};

export async function invokeCaptureParse(payload: CaptureParsePayload) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.functions.invoke('transcribe_and_parse_capture', {
    body: payload,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function invokeCalendarSync(payload?: Record<string, unknown>) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.functions.invoke('google_calendar_sync', {
    body: payload ?? {},
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
