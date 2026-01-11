import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import {
  findActiveEvent,
  startEvent,
  stopEvent,
  updateEvent,
  type MobileEventKind,
} from '@/src/storage/events';
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
  project?: string | null;
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

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveSession | null>(null);

  useEffect(() => {
    let mounted = true;
    findActiveEvent().then((event) => {
      if (!mounted || !event) return;
      const elapsedSeconds = Math.max(0, Math.round((Date.now() - event.startAt) / 1000));
      const remainingSeconds = event.endAt
        ? Math.max(0, Math.round((event.endAt - Date.now()) / 1000))
        : event.estimateMinutes != null
          ? Math.max(0, Math.round(event.estimateMinutes * 60 - elapsedSeconds))
          : null;
      setActive({
        id: event.id,
        title: event.title,
        kind: event.kind === 'task' ? 'task' : 'event',
        startedAt: event.startAt,
        endAt: event.endAt ?? null,
        estimatedMinutes: event.estimateMinutes ?? null,
        importance: event.importance ?? null,
        difficulty: event.difficulty ?? null,
        trackerKey: event.trackerKey ?? null,
        notes: event.notes ?? '',
        taskId: event.taskId ?? null,
        parentEventId: event.parentEventId ?? null,
        locked: false,
        category: event.category ?? null,
        subcategory: event.subcategory ?? null,
        goal: event.goal ?? null,
        project: event.project ?? null,
      });
      void startLiveActivity({
        title: event.title,
        startedAt: event.startAt,
        remainingSeconds,
        trackerKey: event.trackerKey ?? null,
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  const startSession = useCallback(async (next: SessionStartInput) => {
    const startedAt = next.startedAt ?? Date.now();
    const kind: MobileEventKind = next.kind === 'task' ? 'task' : 'event';
    const estimateMinutes = next.estimatedMinutes ?? next.estimateMinutes ?? null;
    const event = await startEvent({
      id: next.id,
      title: next.title,
      kind,
      startAt: startedAt,
      trackerKey: next.trackerKey ?? null,
      notes: next.notes ?? '',
      estimateMinutes,
      importance: next.importance ?? null,
      difficulty: next.difficulty ?? null,
      taskId: next.taskId ?? null,
      parentEventId: next.parentEventId ?? null,
      tags: next.tags ?? [],
      contexts: next.contexts ?? [],
      people: next.people ?? [],
      location: next.location ?? null,
      category: next.category ?? null,
      subcategory: next.subcategory ?? null,
      project: next.project ?? null,
      goal: next.goal ?? null,
      skills: next.skills ?? [],
      character: next.character ?? [],
    });
    const session: ActiveSession = {
      id: event.id,
      title: event.title,
      kind: next.kind,
      startedAt: event.startAt,
      endAt: event.endAt ?? null,
      estimatedMinutes: event.estimateMinutes ?? null,
      importance: event.importance ?? null,
      difficulty: event.difficulty ?? null,
      trackerKey: event.trackerKey ?? null,
      notes: event.notes ?? '',
      taskId: next.taskId ?? null,
      parentEventId: next.parentEventId ?? null,
      sourceTaskId: next.sourceTaskId,
      locked: false,
      category: event.category ?? null,
      subcategory: event.subcategory ?? null,
      goal: event.goal ?? null,
      project: event.project ?? null,
    };
    setActive((prev) => {
      const keepParent =
        prev && next.parentEventId && prev.id === next.parentEventId && prev.kind === 'event' && next.kind === 'task';
      if (prev && !keepParent) void stopEvent(prev.id);
      return session;
    });
    const remainingSeconds = session.endAt
      ? Math.max(0, Math.round((session.endAt - Date.now()) / 1000))
      : session.estimatedMinutes != null
        ? Math.max(0, Math.round(session.estimatedMinutes * 60))
        : null;
    void endLiveActivity();
    void startLiveActivity({
      title: session.title,
      startedAt: session.startedAt,
      remainingSeconds,
      trackerKey: session.trackerKey ?? null,
    });
    return session;
  }, []);

  const stopSession = useCallback(async () => {
    const current = active;
    if (current) {
      await stopEvent(current.id);
    }
    const nextEvent = await findActiveEvent();
    if (nextEvent) {
      const elapsedSeconds = Math.max(0, Math.round((Date.now() - nextEvent.startAt) / 1000));
      const remainingSeconds = nextEvent.endAt
        ? Math.max(0, Math.round((nextEvent.endAt - Date.now()) / 1000))
        : nextEvent.estimateMinutes != null
          ? Math.max(0, Math.round(nextEvent.estimateMinutes * 60 - elapsedSeconds))
          : null;
      setActive({
        id: nextEvent.id,
        title: nextEvent.title,
        kind: nextEvent.kind === 'task' ? 'task' : 'event',
        startedAt: nextEvent.startAt,
        endAt: nextEvent.endAt ?? null,
        estimatedMinutes: nextEvent.estimateMinutes ?? null,
        importance: nextEvent.importance ?? null,
        difficulty: nextEvent.difficulty ?? null,
        trackerKey: nextEvent.trackerKey ?? null,
        notes: nextEvent.notes ?? '',
        taskId: nextEvent.taskId ?? null,
        parentEventId: nextEvent.parentEventId ?? null,
        locked: false,
        category: nextEvent.category ?? null,
        subcategory: nextEvent.subcategory ?? null,
        goal: nextEvent.goal ?? null,
      });
      void endLiveActivity();
      void startLiveActivity({
        title: nextEvent.title,
        startedAt: nextEvent.startAt,
        remainingSeconds,
        trackerKey: nextEvent.trackerKey ?? null,
      });
      return;
    }
    setActive(null);
    void endLiveActivity();
  }, [active]);

  const handlePendingAction = useCallback(async () => {
    const pending = await consumePendingAction();
    if (!pending) return;
    if (pending.action === 'stop') {
      if (active) {
        await stopSession();
      }
      return;
    }
    if (pending.action === 'start') {
      if (active?.locked) return;
      await startSession({
        title: pending.title ?? 'Quick Focus',
        kind: 'event',
        startedAt: Date.now(),
        estimatedMinutes: null,
        trackerKey: 'action-button',
      });
    }
  }, [active, startSession, stopSession]);

  useEffect(() => {
    void handlePendingAction();
  }, [handlePendingAction]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void handlePendingAction();
      }
    });
    return () => subscription.remove();
  }, [handlePendingAction]);

  const updateNotes = useCallback((notes: string) => {
    setActive((prev) => {
      if (!prev) return prev;
      void updateEvent(prev.id, { notes });
      void updateLiveActivity({ title: prev.title });
      return { ...prev, notes };
    });
  }, []);

  const updateMetrics = useCallback((metrics: { importance?: number; difficulty?: number }) => {
    setActive((prev) => {
      if (!prev) return prev;
      void updateEvent(prev.id, metrics);
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

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
