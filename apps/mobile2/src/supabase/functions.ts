import { clearSupabaseLocalSession } from '@/src/supabase/auth';
import { getSupabaseClient } from '@/src/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export type CaptureParsePayload = {
  captureId: string;
  audioBucket?: string | null;
  audioPath?: string | null;
  transcript?: string | null;
  mode?: 'transcribe_only' | 'transcribe_and_parse';
  context?: {
    activeGoalIds?: string[];
    activeProjectIds?: string[];
    activeEntryId?: string | null;
  } | null;
};

async function readFunctionErrorBody(context?: unknown) {
  if (!context || typeof context !== 'object') return '';
  const ctx = context as {
    text?: () => Promise<string>;
    json?: () => Promise<unknown>;
    clone?: () => unknown;
    body?: unknown;
    _bodyInit?: unknown;
  };

  if (typeof ctx.clone === 'function') {
    try {
      const cloned = ctx.clone() as { text?: () => Promise<string> };
      if (typeof cloned?.text === 'function') {
        return await cloned.text();
      }
    } catch {
      // ignore clone errors
    }
  }

  if (typeof ctx.text === 'function') {
    try {
      return await ctx.text();
    } catch {
      // ignore text errors
    }
  }

  const body = ctx.body ?? ctx._bodyInit;
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object') {
    try {
      return JSON.stringify(body);
    } catch {
      return '';
    }
  }

  if (typeof ctx.json === 'function') {
    try {
      return JSON.stringify(await ctx.json());
    } catch {
      return '';
    }
  }

  return '';
}

async function formatFunctionError(error: { message?: string; context?: { status?: number; body?: unknown } }) {
  const status = error?.context?.status;
  const body = error?.context?.body;
  let detail = '';

  if (typeof body === 'string') {
    detail = body;
  } else if (body && typeof body === 'object') {
    const bodyObj = body as { error?: string; detail?: string };
    // Include both error and detail fields for more info
    const parts: string[] = [];
    if (bodyObj.error) parts.push(bodyObj.error);
    if (bodyObj.detail && bodyObj.detail !== bodyObj.error) parts.push(`Detail: ${bodyObj.detail}`);
    detail = parts.join(' - ') || JSON.stringify(body);
  } else if (body) {
    try {
      detail = JSON.stringify(body);
    } catch {
      detail = '';
    }
  }

  if (!detail) {
    detail = await readFunctionErrorBody(error?.context);
  }

  if (detail) {
    try {
      const parsed = JSON.parse(detail) as { error?: string; detail?: string };
      const parts: string[] = [];
      if (parsed?.error) parts.push(parsed.error);
      if (parsed?.detail && parsed.detail !== parsed.error) parts.push(`Detail: ${parsed.detail}`);
      if (parts.length) detail = parts.join(' - ');
    } catch {
      // keep raw detail
    }
  }

  if (!detail) detail = error?.message ?? 'Edge Function error';
  const statusLabel = status ? ` (${status})` : '';
  return `Edge Function error${statusLabel}: ${detail}`;
}

async function getSupabaseAccessToken(supabase: SupabaseClient) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.access_token) return sessionData.session.access_token;
  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (!error && refreshed.session?.access_token) return refreshed.session.access_token;
  return null;
}

export async function invokeCaptureParse(payload: CaptureParsePayload) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.access_token) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session?.access_token) {
      await clearSupabaseLocalSession('missing-session');
      throw new Error('Sign in required to transcribe audio. Please sign in first.');
    }
  }

  const { data, error } = await supabase.functions.invoke('transcribe_and_parse_capture', {
    body: payload,
  });
  if (error) {
    const message = await formatFunctionError(error);
    if (error.context?.status === 401 || /invalid jwt/i.test(message)) {
      await clearSupabaseLocalSession('invalid-jwt');
      throw new Error('Session expired. Please sign in again.');
    }
    throw new Error(message);
  }
  return data;
}

export async function invokeCalendarSync(payload?: Record<string, unknown>) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured.');
  const accessToken = await getSupabaseAccessToken(supabase);
  const { data, error } = await supabase.functions.invoke('google_calendar_sync', {
    body: payload ?? {},
    ...(accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : null),
  });
  if (error) {
    throw new Error(await formatFunctionError(error));
  }
  return data;
}
