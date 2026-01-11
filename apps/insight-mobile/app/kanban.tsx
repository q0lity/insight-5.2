import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
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

  const moveTask = async (task: Task, status: TaskStatus) => {
    await updateTask(task.id, {
      status,
      completedAt: status === 'done' ? Date.now() : null,
    });
    refreshTasks();
  };

  const renderCard = (task: Task, columnKey: TaskStatus) => {
    const nextStatuses: TaskStatus[] = COLUMNS.map((c) => c.key).filter((k) => k !== columnKey);

    return (
      <View key={task.id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.cardTitle, { color: palette.text }]} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
            {task.dueAt ? formatShortDate(task.dueAt) : 'No due'}
          </Text>
          {task.tags && task.tags.length > 0 && (
            <View style={[styles.tag, { backgroundColor: palette.tintLight }]}>
              <Text style={{ color: palette.tint, fontSize: 10 }}>#{task.tags[0]}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardActions}>
          {nextStatuses.slice(0, 2).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.moveButton, { borderColor: palette.border }]}
              onPress={() => moveTask(task, status)}
            >
              <Text style={{ color: palette.textSecondary, fontSize: 11 }}>
                {status === 'done' ? 'Done' : status === 'in_progress' ? 'Start' : status === 'todo' ? 'Reopen' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
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
          <View key={col.key} style={[styles.column, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
            <View style={styles.columnHeader}>
              <Text style={[styles.columnTitle, { color: palette.text }]}>{col.label}</Text>
              <View style={[styles.countBadge, { backgroundColor: palette.tintLight }]}>
                <Text style={{ color: palette.tint, fontSize: 12 }}>{col.items.length}</Text>
              </View>
            </View>
            <ScrollView style={styles.columnBody} showsVerticalScrollIndicator={false}>
              {col.items.map((task) => renderCard(task, col.key))}
              {col.items.length === 0 && (
                <View style={styles.emptyColumn}>
                  <Text style={{ color: palette.textSecondary, fontSize: 12 }}>No tasks</Text>
                </View>
              )}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  backButton: { paddingVertical: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  inputRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  input: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
  addButton: { paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  boardContainer: { padding: 16, gap: 12 },
  column: {
    width: 260,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    maxHeight: '100%',
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  columnTitle: { fontWeight: '700', fontSize: 14 },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  columnBody: { flex: 1, gap: 8 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: { fontWeight: '600', fontSize: 14 },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  moveButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptyColumn: {
    alignItems: 'center',
    paddingVertical: 20,
  },
});
