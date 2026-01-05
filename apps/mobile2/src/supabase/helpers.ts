import { getSupabaseClient } from './client';

type SessionOptions = {
  allowAnonymous?: boolean;
};

export async function getSupabaseSessionUser(options: SessionOptions = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  // Step 1: Try to get cached session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (!sessionError && sessionData.session?.user) {
    console.log('[Auth] Found cached session for:', sessionData.session.user.email ?? sessionData.session.user.id);
    return { supabase, user: sessionData.session.user };
  }

  // Step 2: Try to refresh the session from storage
  console.log('[Auth] No cached session, attempting refresh...');
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError && refreshed.session?.user) {
    console.log('[Auth] Session refreshed for:', refreshed.session.user.email ?? refreshed.session.user.id);
    return { supabase, user: refreshed.session.user };
  }

  // Step 3: Try to get user directly (validates with server)
  console.log('[Auth] Refresh failed, trying getUser...');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (!userError && userData.user) {
    console.log('[Auth] Got user directly:', userData.user.email ?? userData.user.id);
    return { supabase, user: userData.user };
  }

  // Step 4: Only fall back to anonymous auth if explicitly allowed
  // IMPORTANT: This should ONLY be used for non-critical operations
  // Edge Functions that require real users should set allowAnonymous: false
  if (options.allowAnonymous) {
    console.log('[Auth] No session found, attempting anonymous sign-in...');
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError) {
      console.warn('[Auth] Anonymous sign-in failed:', anonError.message);
      return null;
    }
    if (anonData?.user) {
      console.log('[Auth] Anonymous sign-in succeeded (user-only)');
      return { supabase, user: anonData.user };
    }
    if (anonData?.session?.user) {
      console.log('[Auth] Anonymous sign-in succeeded (session)');
      return { supabase, user: anonData.session.user };
    }
  }

  console.log('[Auth] No session available and anonymous not allowed');
  return null;
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
