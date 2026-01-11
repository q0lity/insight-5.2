/**
 * Session State Provider
 *
 * Manages the active focus/tracking session:
 * - Start/stop sessions
 * - Update notes and metrics
 * - Live Activity integration
 * - Session persistence across app restarts
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import {
  consumePendingAction,
  endLiveActivity,
  startLiveActivity,
  updateLiveActivity,
} from '@/src/native/liveActivity';

export type SessionKind = 'task' | 'event';

export type ActiveSession = {
  id: string;
  title: string;
  kind: SessionKind;
  startedAt: number;
  endAt?: number | null;
  estimatedMinutes?: number | null;
  importance?: number | null;
  difficulty?: number | null;
  trackerKey?: string | null;
  notes?: string;
  taskId?: string | null;
  parentEventId?: string | null;
  sourceTaskId?: string;
  locked?: boolean;
  category?: string | null;
  subcategory?: string | null;
  goal?: string | null;
};

export type SessionStartInput = {
  id?: string;
  title: string;
  kind: SessionKind;
  startedAt?: number;
  estimatedMinutes?: number | null;
  estimateMinutes?: number | null; // Alias for habit compatibility
  importance?: number | null;
  difficulty?: number | null;
  trackerKey?: string | null;
  notes?: string;
  taskId?: string | null;
  parentEventId?: string | null;
  sourceTaskId?: string;
  tags?: string[];
  contexts?: string[];
  people?: string[];
  location?: string | null;
  category?: string | null;
  subcategory?: string | null;
  project?: string | null;
  goal?: string | null;
  skills?: string[];
  character?: string[];
};

type SessionContextValue = {
  active: ActiveSession | null;
  startSession: (next: SessionStartInput) => Promise<ActiveSession>;
  stopSession: () => Promise<void>;
  updateNotes: (notes: string) => void;
  setLocked: (locked: boolean) => void;
  updateMetrics: (metrics: { importance?: number; difficulty?: number }) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

// Generate a simple ID for sessions
function generateId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveSession | null>(null);

  // Handle pending actions from Live Activity
  const handlePendingAction = useCallback(async () => {
    const pending = await consumePendingAction();
    if (!pending) return;

    if (pending.action === 'stop') {
      setActive((prev) => {
        if (prev) {
          void endLiveActivity();
        }
        return null;
      });
      return;
    }

    if (pending.action === 'start') {
      const newSession: ActiveSession = {
        id: generateId(),
        title: pending.title ?? 'Quick Focus',
        kind: 'event',
        startedAt: Date.now(),
        estimatedMinutes: null,
        trackerKey: 'action-button',
        locked: false,
      };

      setActive((prev) => {
        if (prev?.locked) return prev;
        return newSession;
      });

      void startLiveActivity({
        title: newSession.title,
        startedAt: newSession.startedAt,
        remainingSeconds: null,
        trackerKey: newSession.trackerKey ?? null,
      });
    }
  }, []);

  // Check for pending actions on mount
  useEffect(() => {
    void handlePendingAction();
  }, [handlePendingAction]);

  // Listen for app state changes to check for pending actions
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void handlePendingAction();
      }
    });
    return () => subscription.remove();
  }, [handlePendingAction]);

  const startSession = useCallback(async (next: SessionStartInput): Promise<ActiveSession> => {
    const startedAt = next.startedAt ?? Date.now();
    const estimateMinutes = next.estimatedMinutes ?? next.estimateMinutes ?? null;

    const session: ActiveSession = {
      id: next.id ?? generateId(),
      title: next.title,
      kind: next.kind,
      startedAt,
      endAt: null,
      estimatedMinutes: estimateMinutes,
      importance: next.importance ?? null,
      difficulty: next.difficulty ?? null,
      trackerKey: next.trackerKey ?? null,
      notes: next.notes ?? '',
      taskId: next.taskId ?? null,
      parentEventId: next.parentEventId ?? null,
      sourceTaskId: next.sourceTaskId,
      locked: false,
      category: next.category ?? null,
      subcategory: next.subcategory ?? null,
      goal: next.goal ?? null,
    };

    setActive((prev) => {
      // End previous session if not a nested task
      const keepParent =
        prev && next.parentEventId && prev.id === next.parentEventId && prev.kind === 'event' && next.kind === 'task';
      if (prev && !keepParent) {
        void endLiveActivity();
      }
      return session;
    });

    const remainingSeconds = session.endAt
      ? Math.max(0, Math.round((session.endAt - Date.now()) / 1000))
      : session.estimatedMinutes != null
        ? Math.max(0, Math.round(session.estimatedMinutes * 60))
        : null;

    void startLiveActivity({
      title: session.title,
      startedAt: session.startedAt,
      remainingSeconds,
      trackerKey: session.trackerKey ?? null,
    });

    return session;
  }, []);

  const stopSession = useCallback(async () => {
    setActive(null);
    void endLiveActivity();
  }, []);

  const updateNotes = useCallback((notes: string) => {
    setActive((prev) => {
      if (!prev) return prev;
      void updateLiveActivity({ title: prev.title });
      return { ...prev, notes };
    });
  }, []);

  const updateMetrics = useCallback((metrics: { importance?: number; difficulty?: number }) => {
    setActive((prev) => {
      if (!prev) return prev;
      return { ...prev, ...metrics };
    });
  }, []);

  const setLocked = useCallback((locked: boolean) => {
    setActive((prev) => (prev ? { ...prev, locked } : prev));
  }, []);

  const value = useMemo(
    () => ({ active, startSession, stopSession, updateNotes, setLocked, updateMetrics }),
    [active, startSession, stopSession, updateNotes, setLocked, updateMetrics]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
