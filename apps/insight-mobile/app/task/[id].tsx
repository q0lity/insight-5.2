import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { InsightIcon } from '@/src/components/InsightIcon';
import { useTheme } from '@/src/state/theme';
import { listTasks, updateTask, type MobileTask as Task, type MobileTaskStatus as TaskStatus } from '@/src/storage/tasks';

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'in_progress', 'done', 'canceled'];

function startOfDayMs(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function formatDate(ms: number | null) {
  if (!ms) return 'None';
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function tagsToText(tags: string[]) {
  return tags.map((t) => `#${t}`).join(' ');
}

function parseTags(text: string) {
  return text
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/^#/, ''))
    .slice(0, 12);
}

export default function TaskDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [dueAt, setDueAt] = useState<number | null>(null);
  const [estimateMinutes, setEstimateMinutes] = useState(30);
  const [importance, setImportance] = useState(5);
  const [difficulty, setDifficulty] = useState(5);
  const [tagsText, setTagsText] = useState('');

  useEffect(() => {
    let mounted = true;
    listTasks().then((rows) => {
      if (!mounted) return;
      const found = rows.find((row) => row.id === id);
      if (!found) return;
      setTask(found);
      setTitle(found.title ?? '');
      setNotes(found.notes ?? '');
      setStatus(found.status ?? 'todo');
      setDueAt(found.dueAt ?? null);
      setEstimateMinutes(found.estimateMinutes ?? 30);
      setImportance(found.importance ?? 5);
      setDifficulty(found.difficulty ?? 5);
      setTagsText(tagsToText(found.tags ?? []));
    });
    return () => {
      mounted = false;
    };
  }, [id]);

  const dueLabel = useMemo(() => formatDate(dueAt), [dueAt]);

  const saveTask = async () => {
    if (!task) return;
    const completedAt = status === 'done' ? Date.now() : null;
    await updateTask(task.id, {
      title: title.trim() || task.title,
      notes,
      status,
      dueAt,
      completedAt,
      estimateMinutes,
      importance,
      difficulty,
      tags: parseTags(tagsText),
    });
    router.back();
  };

  if (!task) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <InsightIcon name="chevronLeft" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Edit Task</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loading}>
          <Text style={{ color: palette.textSecondary }}>Loading task…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Edit Task</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.label, { color: palette.textSecondary }]}>TITLE</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Task title"
            placeholderTextColor={palette.textSecondary}
            style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]}
          />

          <Text style={[styles.label, { color: palette.textSecondary }]}>STATUS</Text>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => setStatus(option)}
                style={[
                  styles.statusChip,
                  { backgroundColor: status === option ? palette.tint : palette.borderLight },
                ]}
              >
                <Text style={{ color: status === option ? '#FFFFFF' : palette.text }}>
                  {option.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: palette.textSecondary }]}>DUE DATE</Text>
          <View style={styles.dueRow}>
            <Text style={[styles.dueLabel, { color: palette.text }]}>{dueLabel}</Text>
            <View style={styles.dueActions}>
              <TouchableOpacity
                style={[styles.dueChip, { borderColor: palette.border }]}
                onPress={() => setDueAt(startOfDayMs(new Date()))}
              >
                <Text style={{ color: palette.text }}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dueChip, { borderColor: palette.border }]}
                onPress={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  setDueAt(startOfDayMs(d));
                }}
              >
                <Text style={{ color: palette.text }}>Tomorrow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dueChip, { borderColor: palette.border }]}
                onPress={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  setDueAt(startOfDayMs(d));
                }}
              >
                <Text style={{ color: palette.text }}>Next 7</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dueChip, { borderColor: palette.border }]}
                onPress={() => setDueAt(null)}
              >
                <Text style={{ color: palette.textSecondary }}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.label, { color: palette.textSecondary }]}>TAGS</Text>
          <TextInput
            value={tagsText}
            onChangeText={setTagsText}
            placeholder="#work #personal"
            placeholderTextColor={palette.textSecondary}
            style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]}
          />
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.label, { color: palette.textSecondary }]}>IMPORTANCE</Text>
          <Slider
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={importance}
            onValueChange={(value) => setImportance(value)}
            minimumTrackTintColor={palette.tint}
            maximumTrackTintColor={palette.border}
            thumbTintColor={palette.tint}
          />

          <Text style={[styles.label, { color: palette.textSecondary }]}>DIFFICULTY</Text>
          <Slider
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={difficulty}
            onValueChange={(value) => setDifficulty(value)}
            minimumTrackTintColor={palette.tint}
            maximumTrackTintColor={palette.border}
            thumbTintColor={palette.tint}
          />

          <Text style={[styles.label, { color: palette.textSecondary }]}>ESTIMATED MINUTES</Text>
          <Slider
            minimumValue={5}
            maximumValue={240}
            step={5}
            value={estimateMinutes}
            onValueChange={(value) => setEstimateMinutes(value)}
            minimumTrackTintColor={palette.tint}
            maximumTrackTintColor={palette.border}
            thumbTintColor={palette.tint}
          />
          <Text style={[styles.metaText, { color: palette.textSecondary }]}>
            {estimateMinutes} minutes
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.label, { color: palette.textSecondary }]}>NOTES</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes or context..."
            placeholderTextColor={palette.textSecondary}
            multiline
            style={[styles.notesInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]}
          />
        </View>

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: palette.tint }]} onPress={() => void saveTask()}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  notesInput: { minHeight: 120, borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  dueRow: { gap: 8 },
  dueLabel: { fontSize: 14, fontWeight: '700' },
  dueActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dueChip: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  metaText: { fontSize: 12, fontWeight: '600' },
  saveButton: { borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
