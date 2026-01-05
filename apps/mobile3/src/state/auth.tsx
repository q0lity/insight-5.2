import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/src/supabase/client';
import { syncLocalEventsToSupabase } from '@/src/storage/events';
import { syncLocalInboxToSupabase } from '@/src/storage/inbox';
import { syncLocalTasksToSupabase } from '@/src/storage/tasks';
import { syncLocalTrackerLogsToSupabase } from '@/src/storage/trackers';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session ?? null))
      .finally(() => setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    void syncLocalEventsToSupabase();
    void syncLocalInboxToSupabase();
    void syncLocalTasksToSupabase();
    void syncLocalTrackerLogsToSupabase();
  }, [session?.user?.id]);

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const value = useMemo(() => ({ session, loading, signOut }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
