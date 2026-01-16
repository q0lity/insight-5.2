import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { createTask, listTasks, updateTask, type MobileTask as Task, type MobileTaskStatus as TaskStatus } from '@/src/storage/tasks';
import { computeXp, formatXp } from '@/src/utils/points';

type FilterKey = 'inbox' | 'today' | 'next7' | 'all' | 'done';

const FILTERS: FilterKey[] = ['inbox', 'today', 'next7', 'all', 'done'];

type SortKey = 'urgency' | 'due' | 'updated' | 'created';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'urgency', label: 'Urgency' },
  { key: 'due', label: 'Due' },
  { key: 'updated', label: 'Updated' },
  { key: 'created', label: 'Created' },
];

function startOfDayMs(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatShortDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function taskUrgencyScore(task: Task, nowMs: number) {
  const dueAt = task.dueAt ?? task.scheduledAt ?? null;
  const hoursUntil = dueAt != null ? (dueAt - nowMs) / 3600000 : null;
  const dueScore = dueAt != null ? Math.max(0, 96 - hoursUntil) : 0;
  const importance = task.importance ?? 5;
  const difficulty = task.difficulty ?? 5;
  const statusBoost = task.status === 'in_progress' ? 10 : 0;
  return dueScore + importance * 2 + difficulty + statusBoost;
}

function parseQuickTaskInput(raw: string) {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const tags: string[] = [];
  const titleParts: string[] = [];
  for (const t of tokens) {
    if (t.startsWith('#') && t.length > 1) tags.push(t.replace(/^#/, ''));
    else titleParts.push(t);
  }
  return { title: titleParts.join(' ').trim(), tags: tags.slice(0, 12) };
}

export default function TasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<FilterKey>('inbox');
  const [sortKey, setSortKey] = useState<SortKey>('urgency');
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState('');

  useEffect(() => {
    refreshTasks();
  }, []);

  const refreshTasks = () => {
    listTasks().then((rows) => setTasks(rows));
  };

  const now = Date.now();
  const todayStart = startOfDayMs(new Date(now));
  const tomorrowStart = startOfDayMs(addDays(new Date(now), 1));
  const next7End = startOfDayMs(addDays(new Date(now), 8));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = tasks.filter((t) => {
      if (filter === 'all') return true;
      if (filter === 'done') return t.status === 'done';
      if (filter === 'inbox') return t.status !== 'done' && t.status !== 'canceled';
      if (filter === 'today') {
        const due = t.dueAt ?? null;
        return t.status !== 'done' && due !== null && due >= todayStart && due < tomorrowStart;
      }
      if (filter === 'next7') {
        const due = t.dueAt ?? null;
        return t.status !== 'done' && due !== null && due >= todayStart && due < next7End;
      }
      return true;
    });

    const searched = needle
      ? base.filter((t) => {
          if (t.title.toLowerCase().includes(needle)) return true;
          return (t.tags ?? []).some((x) => x.toLowerCase().includes(needle));
        })
      : base;

    const sorted = [...searched].sort((a, b) => {
      const nowMs = Date.now();
      if (sortKey === 'urgency') {
        const score = taskUrgencyScore(b, nowMs) - taskUrgencyScore(a, nowMs);
        if (score !== 0) return score;
      }
      if (sortKey === 'due') {
        const aDue = a.dueAt ?? a.scheduledAt ?? Infinity;
        const bDue = b.dueAt ?? b.scheduledAt ?? Infinity;
        if (aDue !== bDue) return aDue - bDue;
      }
      if (sortKey === 'updated') {
        if (a.updatedAt !== b.updatedAt) return b.updatedAt - a.updatedAt;
      }
      if (sortKey === 'created') {
        if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
      }
      return (b.dueAt ?? 0) - (a.dueAt ?? 0) || b.updatedAt - a.updatedAt;
    });

    return sorted;
  }, [filter, next7End, q, tasks, todayStart, tomorrowStart, sortKey]);

  const counts = useMemo(() => {
    const inbox = tasks.filter((t) => t.status !== 'done' && t.status !== 'canceled').length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const today = tasks.filter(
      (t) => t.status !== 'done' && t.dueAt != null && t.dueAt >= todayStart && t.dueAt < tomorrowStart
    ).length;
    const next7 = tasks.filter(
      (t) => t.status !== 'done' && t.dueAt != null && t.dueAt >= todayStart && t.dueAt < next7End
    ).length;
    return { inbox, done, today, next7, all: tasks.length };
  }, [next7End, tasks, todayStart, tomorrowStart]);

  const createQuickTask = async () => {
    const parsed = parseQuickTaskInput(draft);
    if (!parsed.title) return;
    await createTask({ title: parsed.title, tags: parsed.tags, status: 'todo' });
    setDraft('');
    refreshTasks();
  };

  const toggleDone = async (task: Task) => {
    await updateTask(task.id, {
      status: task.status === 'done' ? 'todo' : 'done',
      completedAt: task.status === 'done' ? null : Date.now(),
    });
    refreshTasks();
  };

  const moveTask = async (task: Task, status: TaskStatus) => {
    await updateTask(task.id, { status });
    refreshTasks();
  };

  const renderTaskCard = (task: Task) => {
    const estimate = task.estimateMinutes ?? 30;
    const xp = computeXp({
      importance: task.importance ?? 5,
      difficulty: task.difficulty ?? 5,
      durationMinutes: estimate,
    });
    return (
      <Pressable
        key={task.id}
        style={[styles.taskCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
        onPress={() => router.push(`/task/${task.id}`)}
      >
        <View style={styles.taskHeaderRow}>
          <Pressable
            style={[
              styles.taskCheck,
              {
                borderColor: palette.tint,
                backgroundColor: task.status === 'done' ? palette.tint : 'transparent',
              },
            ]}
            onPress={(event) => {
              event.stopPropagation();
              void toggleDone(task);
            }}
          >
            {task.status === 'done' ? (
              <InsightIcon name="check" size={12} color="#FFFFFF" />
            ) : null}
          </Pressable>
          <View style={styles.taskBody}>
            <Text style={[styles.taskTitle, { color: palette.text }]} numberOfLines={1}>
              {task.title}
            </Text>
            <Text style={{ color: palette.textSecondary }}>
              {task.dueAt ? `Due ${formatShortDate(task.dueAt)}` : 'No due date'} · {estimate}m · +{formatXp(xp)} XP
            </Text>
            <View style={styles.taskMetaRow}>
              <Text style={{ color: palette.textSecondary }} numberOfLines={1}>
                {(task.tags ?? [])
                  .slice(0, 3)
                  .map((t) => `#${t}`)
                  .join(' ')}
              </Text>
            </View>
          </View>
          <View style={[styles.taskStatusPill, { backgroundColor: palette.borderLight }]}>
            <Text style={[styles.taskStatusText, { color: palette.textSecondary }]}>
              {task.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <View style={styles.taskActions}>
          {task.status !== 'in_progress' && task.status !== 'done' ? (
            <TouchableOpacity
              style={[styles.taskActionPrimary, { backgroundColor: palette.tint }]}
              onPress={(event) => {
                event.stopPropagation();
                void moveTask(task, 'in_progress');
              }}
            >
              <Text style={styles.taskActionPrimaryText}>Start</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Tasks</Text>
        <TouchableOpacity onPress={() => router.push('/kanban')} style={styles.headerChip}>
          <Text style={{ color: palette.tint }}>Kanban View</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Quick add with #tags..."
          placeholderTextColor={palette.textSecondary}
          style={[styles.input, { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }]}
          onSubmitEditing={createQuickTask}
        />
        <TouchableOpacity style={[styles.addButton, { backgroundColor: palette.tint }]} onPress={createQuickTask}>
          <Text style={{ color: '#FFFFFF' }}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtersRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterChip,
              { backgroundColor: filter === f ? palette.tint : palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={{ color: filter === f ? '#FFFFFF' : palette.text }}>
              {f.toUpperCase()} ({counts[f]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sortRow}>
        {SORTS.map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => setSortKey(s.key)}
            style={[
              styles.sortChip,
              { backgroundColor: sortKey === s.key ? palette.tint : palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={{ color: sortKey === s.key ? '#FFFFFF' : palette.text }}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Filter tasks..."
          placeholderTextColor={palette.textSecondary}
          style={[
            styles.searchInput,
            { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {filtered.map((task) => renderTaskCard(task))}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ color: palette.textSecondary }}>No tasks found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: '900' },
  headerChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  inputRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  input: { flex: 1, height: 44, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12 },
  addButton: { width: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  searchRow: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: { height: 40, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
  listContent: { padding: 16, gap: 12 },
  taskCard: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 8 },
  taskHeaderRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  taskCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  taskBody: { flex: 1, gap: 6 },
  taskTitle: { fontWeight: '700' },
  taskMetaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  taskStatusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  taskStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  taskActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingLeft: 32 },
  taskActionPrimary: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  taskActionPrimaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
});
