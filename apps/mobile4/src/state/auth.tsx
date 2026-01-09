import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/src/supabase/client';
import { clearSupabaseLocalSession } from '@/src/supabase/auth';
import { syncLocalEventsToSupabase } from '@/src/storage/events';
import { syncLocalInboxToSupabase } from '@/src/storage/inbox';
import { syncLocalMealsToSupabase } from '@/src/storage/nutrition';
import { syncLocalTasksToSupabase } from '@/src/storage/tasks';
import { syncLocalTrackerLogsToSupabase } from '@/src/storage/trackers';
import { syncLocalWorkoutsToSupabase } from '@/src/storage/workouts';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  forceReauthenticate: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const autoLoginAttempted = useRef(false);
  const manualSignOut = useRef(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const maybeAutoLogin = async (force = false) => {
      if (!force && autoLoginAttempted.current) return;
      if (!__DEV__) return;
      const shouldAuto = process.env.EXPO_PUBLIC_SUPABASE_AUTO_LOGIN === 'true';
      const email = process.env.EXPO_PUBLIC_SUPABASE_AUTO_LOGIN_EMAIL;
      const password = process.env.EXPO_PUBLIC_SUPABASE_AUTO_LOGIN_PASSWORD;
      if (!shouldAuto || !email || !password) return;
      autoLoginAttempted.current = true;
      console.log('[Auth] Attempting auto-login with', email);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.warn('[Auth] Auto login failed:', error.message);
      } else {
        console.log('[Auth] Auto login succeeded');
      }
    };

    const bootstrap = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        setSession(data.session ?? null);
        if (!data.session) {
          await maybeAutoLogin();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      // Only auto-re-login if NOT a manual sign out
      if (event === 'SIGNED_OUT' && !nextSession) {
        if (manualSignOut.current) {
          console.log('[Auth] Manual sign out - staying signed out');
          manualSignOut.current = false;
        } else {
          console.log('[Auth] Session expired, re-attempting auto-login...');
          autoLoginAttempted.current = false;
          void maybeAutoLogin(true);
        }
      }
    });

    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.startAutoRefresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      supabase.auth.stopAutoRefresh();
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    void syncLocalEventsToSupabase();
    void syncLocalInboxToSupabase();
    void syncLocalMealsToSupabase();
    void syncLocalTasksToSupabase();
    void syncLocalTrackerLogsToSupabase();
    void syncLocalWorkoutsToSupabase();
  }, [session?.user?.id]);

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.log('[Auth] No supabase client - cannot sign out');
      return;
    }
    console.log('[Auth] Manual sign out initiated');
    manualSignOut.current = true;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[Auth] Sign out error:', error.message);
      } else {
        console.log('[Auth] Sign out successful');
      }
    } catch (err) {
      console.error('[Auth] Sign out exception:', err);
    }
  };

  const forceReauthenticate = async () => {
    console.log('[Auth] Force re-authenticate - clearing all session data');
    manualSignOut.current = true;

    await clearSupabaseLocalSession('manual-reset');

    // Reset state immediately
    console.log('[Auth] Setting session to null');
    setSession(null);
    autoLoginAttempted.current = false;
    console.log('[Auth] Force re-authenticate complete - session should be null now');
  };

  const value = useMemo(() => ({ session, loading, signOut, forceReauthenticate }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
