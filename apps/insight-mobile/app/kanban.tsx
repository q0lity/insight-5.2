import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { Screen } from '@/components/Screen';
import { LuxCard } from '@/components/LuxCard';
import { useTheme } from '@/src/state/theme';
import { createTask, listTasks, updateTask, type Task, type TaskStatus } from '@/src/storage/tasks';

const COLUMNS: Array<{ key: TaskStatus; label: string }> = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
  { key: 'canceled', label: 'Canceled' },
];

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

type KanbanCardProps = {
  task: Task;
  columnKey: TaskStatus;
  palette: ReturnType<typeof import('@/src/state/theme').useTheme>['palette'];
  onMoveTask: (task: Task, status: TaskStatus) => void;
};

const KanbanCard = React.memo(function KanbanCard({
  task,
  columnKey,
  palette,
  onMoveTask,
}: KanbanCardProps) {
  const nextStatuses: TaskStatus[] = COLUMNS.map((c) => c.key).filter((k) => k !== columnKey);

  return (
    <LuxCard style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.cardTitle, { color: palette.text }]} numberOfLines={2}>
        {task.title}
      </Text>
      <View style={styles.cardMeta}>
        <Text style={{ color: palette.textSecondary, fontSize: 8 }}>
          {task.dueAt ? formatShortDate(task.dueAt) : 'No due'}
        </Text>
        {task.tags && task.tags.length > 0 && (
          <View style={[styles.tag, { backgroundColor: palette.tintLight }]}>
            <Text style={{ color: palette.tint, fontSize: 8 }}>#{task.tags[0]}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardActions}>
        {nextStatuses.slice(0, 2).map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.moveButton, { borderColor: palette.border }]}
            onPress={() => onMoveTask(task, status)}
          >
            <Text style={{ color: palette.textSecondary, fontSize: 8 }}>
              {status === 'done' ? 'Done' : status === 'in_progress' ? 'Start' : status === 'todo' ? 'Reopen' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </LuxCard>
  );
});

type KanbanColumnProps = {
  col: { key: TaskStatus; label: string; items: Task[] };
  palette: ReturnType<typeof import('@/src/state/theme').useTheme>['palette'];
  onMoveTask: (task: Task, status: TaskStatus) => void;
};

const KanbanColumn = React.memo(function KanbanColumn({
  col,
  palette,
  onMoveTask,
}: KanbanColumnProps) {
  const keyExtractor = useCallback((item: Task) => item.id, []);

  const renderItem = useCallback(({ item }: { item: Task }) => (
    <KanbanCard
      task={item}
      columnKey={col.key}
      palette={palette}
      onMoveTask={onMoveTask}
    />
  ), [col.key, palette, onMoveTask]);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyColumn}>
      <Text style={{ color: palette.textSecondary, fontSize: 8 }}>No tasks</Text>
    </View>
  ), [palette]);

  return (
    <View style={[styles.column, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
      <View style={styles.columnHeader}>
        <Text style={[styles.columnTitle, { color: palette.text }]}>{col.label}</Text>
        <View style={[styles.countBadge, { backgroundColor: palette.tintLight }]}>
          <Text style={{ color: palette.tint, fontSize: 8 }}>{col.items.length}</Text>
        </View>
      </View>
      <FlatList
        data={col.items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={ListEmptyComponent}
        showsVerticalScrollIndicator={false}
        style={styles.columnBody}
        initialNumToRender={8}
        maxToRenderPerBatch={4}
        windowSize={3}
      />
    </View>
  );
});

export default function KanbanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    refreshTasks();
  }, []);

  const refreshTasks = () => {
    listTasks().then((rows) => setTasks(rows));
  };

  const columns = useMemo(() => {
    return COLUMNS.map((col) => ({
      ...col,
      items: tasks.filter((t) => t.status === col.key),
    }));
  }, [tasks]);

  const createQuickTask = async () => {
    const parsed = parseQuickTaskInput(draft);
    if (!parsed.title) return;
    await createTask({ title: parsed.title, tags: parsed.tags, status: 'todo' });
    setDraft('');
    refreshTasks();
  };

  const moveTask = useCallback(async (task: Task, status: TaskStatus) => {
    await updateTask(task.id, {
      status,
      completedAt: status === 'done' ? Date.now() : null,
    });
    refreshTasks();
  }, []);

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={{ color: palette.tint }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Kanban Board</Text>
        <Text style={{ color: palette.textSecondary }}>{tasks.length} tasks</Text>
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
          <Text style={{ color: '#FFFFFF' }}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardContainer}>
        {columns.map((col) => (
          <KanbanColumn
            key={col.key}
            col={col}
            palette={palette}
            onMoveTask={moveTask}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 11,
    gap: 8,
  },
  backButton: { paddingVertical: 4 },
  headerTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  inputRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 11, paddingBottom: 8 },
  input: { flex: 1, height: 28, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8 },
  addButton: { paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  boardContainer: { padding: 11, gap: 8 },
  column: {
    width: 182,
    borderWidth: 1,
    borderRadius: 11,
    padding: 8,
    marginRight: 8,
    maxHeight: '100%',
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  columnTitle: { fontWeight: '700', fontSize: 10 },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 7,
  },
  columnBody: { flex: 1, gap: 6 },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    gap: 6,
  },
  cardTitle: { fontWeight: '600', fontSize: 10 },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  moveButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  emptyColumn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
});