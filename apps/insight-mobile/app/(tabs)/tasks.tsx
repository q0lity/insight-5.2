import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { Screen } from '@/components/Screen';
import { LuxCard } from '@/components/LuxCard';
import { LuxHeader } from '@/components/LuxHeader';
import { LuxPill } from '@/components/LuxPill';
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
  const accent =
    task.status === 'done'
      ? palette.success
      : task.status === 'in_progress'
        ? palette.tint
        : palette.border;
  return (
    <LuxCard style={styles.taskCard} accent={accent}>
      <View style={styles.taskHeader}>
        <Text style={[styles.taskTitle, { color: palette.text }]} numberOfLines={2}>
          {task.title}
        </Text>
        <TouchableOpacity onPress={() => onToggleDone(task)}>
          <Text style={{ color: palette.tint }}>{task.status === 'done' ? 'Undo' : 'Done'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.taskBadges}>
        <LuxPill label={task.status.replace('_', ' ')} active />
        {task.dueAt ? <LuxPill label={`Due ${formatShortDate(task.dueAt)}`} /> : null}
        <LuxPill label={`+${formatXp(xp)} XP`} variant="accent" />
      </View>
      {(task.tags ?? []).length > 0 ? (
        <View style={styles.taskTags}>
          {(task.tags ?? []).slice(0, 4).map((tag) => (
            <LuxPill key={tag} label={`#${tag}`} variant="ghost" />
          ))}
        </View>
      ) : null}
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
    </LuxCard>
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
  const { palette, sizes } = useTheme();

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
    <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <LuxHeader
        overline="Tasks"
        title="Today’s Work"
        subtitle={`${counts.inbox} open · ${counts.today} due today`}
        right={<LuxPill label="Kanban" variant="accent" onPress={() => router.push('/kanban')} />}
        style={[styles.header, { paddingHorizontal: sizes.spacing * 2 }]}
      />

      <LuxCard style={styles.inputCard}>
        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Quick add with #tags..."
            placeholderTextColor={palette.textSecondary}
            style={[
              styles.input,
              { backgroundColor: palette.surface, color: palette.text, borderColor: palette.borderLight },
            ]}
            onSubmitEditing={createQuickTask}
          />
          <TouchableOpacity style={[styles.addButton, { backgroundColor: palette.tint }]} onPress={createQuickTask}>
            <Text style={{ color: '#FFFFFF' }}>Add</Text>
          </TouchableOpacity>
        </View>
      </LuxCard>

      <View style={styles.filtersRow}>
        {FILTERS.map((f) => (
          <LuxPill
            key={f}
            label={`${f} (${counts[f]})`}
            active={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </View>

      <LuxCard style={styles.searchRow}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Filter tasks..."
          placeholderTextColor={palette.textSecondary}
          style={[
            styles.searchInput,
            { backgroundColor: palette.surface, color: palette.text, borderColor: palette.borderLight },
          ]}
        />
      </LuxCard>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 8 },
  inputCard: { marginHorizontal: 11, marginBottom: 8 },
  inputRow: { flexDirection: 'row', gap: 7 },
  input: { flex: 1, height: 31, borderRadius: 10, borderWidth: 1, paddingHorizontal: 8 },
  addButton: { width: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 11, paddingBottom: 8 },
  searchRow: { marginHorizontal: 11, marginBottom: 8 },
  searchInput: { height: 28, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8 },
  listContent: { padding: 11, gap: 10 },
  taskCard: { borderRadius: 14, padding: 11, gap: 8 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  taskTitle: { fontWeight: '700', flex: 1 },
  taskBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  taskTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  taskActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  taskAction: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 },
  emptyState: { alignItems: 'center', paddingVertical: 28 },
});
