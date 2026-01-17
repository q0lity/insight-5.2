import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { createTask, listTasks, updateTask, type Task, type TaskStatus } from '@/src/storage/tasks';
import { computeXp, formatXp } from '@/src/utils/points';

type FilterKey = 'inbox' | 'today' | 'next7' | 'all' | 'done';

const FILTERS: FilterKey[] = ['inbox', 'today', 'next7', 'all', 'done'];

type TaskCardProps = {
  task: Task;
  palette: ReturnType<typeof useTheme>['palette'];
  onToggleDone: (task: Task) => void;
  onMoveTask: (task: Task, status: TaskStatus) => void;
  onNavigateKanban: () => void;
};

const TaskCard = React.memo(function TaskCard({
  task,
  palette,
  onToggleDone,
  onMoveTask,
  onNavigateKanban,
}: TaskCardProps) {
  const estimate = task.estimateMinutes ?? 30;
  const xp = computeXp({
    importance: task.importance ?? 5,
    difficulty: task.difficulty ?? 5,
    durationMinutes: estimate,
  });
  return (
    <View style={[styles.taskCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.taskHeader}>
        <Text style={[styles.taskTitle, { color: palette.text }]}>{task.title}</Text>
        <TouchableOpacity onPress={() => onToggleDone(task)}>
          <Text style={{ color: palette.tint }}>{task.status === 'done' ? 'Undo' : 'Done'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ color: palette.textSecondary }}>
        {task.dueAt ? `Due ${formatShortDate(task.dueAt)}` : 'No due date'} · {estimate}m · +{formatXp(xp)} XP
      </Text>
      <View style={styles.taskMetaRow}>
        <Text style={{ color: palette.textSecondary }}>
          {(task.tags ?? [])
            .slice(0, 3)
            .map((t) => `#${t}`)
            .join(' ')}
        </Text>
        <Text style={{ color: palette.textSecondary }}>{task.status.replace('_', ' ')}</Text>
      </View>
      <View style={styles.taskActions}>
        <TouchableOpacity
          style={[styles.taskAction, { borderColor: palette.border }]}
          onPress={onNavigateKanban}
        >
          <Text style={{ color: palette.text }}>Kanban</Text>
        </TouchableOpacity>
        {task.status !== 'in_progress' ? (
          <TouchableOpacity
            style={[styles.taskAction, { borderColor: palette.border }]}
            onPress={() => onMoveTask(task, 'in_progress')}
          >
            <Text style={{ color: palette.text }}>Start</Text>
          </TouchableOpacity>
        ) : null}
        {task.status !== 'canceled' ? (
          <TouchableOpacity
            style={[styles.taskAction, { borderColor: palette.border }]}
            onPress={() => onMoveTask(task, 'canceled')}
          >
            <Text style={{ color: palette.textSecondary }}>Cancel</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
});

const EmptyTasksState = React.memo(function EmptyTasksState({ palette }: { palette: ReturnType<typeof useTheme>['palette'] }) {
  return (
    <View style={styles.emptyState}>
      <Text style={{ color: palette.textSecondary }}>No tasks found</Text>
    </View>
  );
});

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

    return [...searched].sort((a, b) => (b.dueAt ?? 0) - (a.dueAt ?? 0) || b.updatedAt - a.updatedAt);
  }, [filter, next7End, q, tasks, todayStart, tomorrowStart]);

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

  const toggleDone = useCallback(async (task: Task) => {
    await updateTask(task.id, {
      status: task.status === 'done' ? 'todo' : 'done',
      completedAt: task.status === 'done' ? null : Date.now(),
    });
    refreshTasks();
  }, []);

  const moveTask = useCallback(async (task: Task, status: TaskStatus) => {
    await updateTask(task.id, { status });
    refreshTasks();
  }, []);

  const navigateKanban = useCallback(() => {
    router.push('/kanban');
  }, [router]);

  const keyExtractor = useCallback((item: Task) => item.id, []);

  const renderItem = useCallback(({ item }: { item: Task }) => (
    <TaskCard
      task={item}
      palette={palette}
      onToggleDone={toggleDone}
      onMoveTask={moveTask}
      onNavigateKanban={navigateKanban}
    />
  ), [palette, toggleDone, moveTask, navigateKanban]);

  const ListEmptyComponent = useCallback(() => (
    <EmptyTasksState palette={palette} />
  ), [palette]);

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

      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={ListEmptyComponent}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
      />
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
  filterChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  searchRow: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: { height: 40, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
  listContent: { padding: 16, gap: 12 },
  taskCard: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 8 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  taskTitle: { fontWeight: '700', flex: 1 },
  taskMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  taskActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  taskAction: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
});
