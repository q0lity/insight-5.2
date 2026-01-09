import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { useSession } from '@/src/state/session';
import { completeTask, createTask, listTasks, type MobileTask } from '@/src/storage/tasks';

type TaskRow = {
  id: string;
  title: string;
  estimateMinutes: number | null;
  importance?: number;
  difficulty?: number;
  level?: number;
  goal?: string;
  isTask: boolean;
  section?: string;
  outlineKey?: string;
};

const STORAGE_KEY = 'insight5.plan.outline.v1';
const OUTLINE_MAP_KEY = 'insight5.plan.outline.taskmap.v1';

const DEFAULT_OUTLINE = `# Clinic Admin
- [ ] Submit report (45m)
- [ ] Draft clinic summary (60m)
  - [ ] Order meds (20m)

# Personal
- [ ] Groceries for dinner (30m)
`;

function parseEstimateMinutes(raw: string) {
  const matches = raw.match(/(\d+)\s*h(?:ours?)?|\b(\d+)\s*m(?:in(?:ute)?s?)?/gi);
  if (!matches) return null;
  let total = 0;
  for (const part of matches) {
    const h = part.match(/(\d+)\s*h/i);
    const m = part.match(/(\d+)\s*m/i);
    if (h?.[1]) total += Number(h[1]) * 60;
    if (m?.[1]) total += Number(m[1]);
  }
  return total > 0 ? total : null;
}

function stripEstimate(raw: string) {
  return raw
    .replace(/\b\d+\s*h(?:ours?)?\b/gi, '')
    .replace(/\b\d+\s*m(?:in(?:ute)?s?)?\b/gi, '')
    .replace(/\(([^)]*?\d+\s*(h|m)[^)]*?)\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function outlineToTasks(text: string): TaskRow[] {
  const lines = text.split(/\r?\n/);
  const items: TaskRow[] = [];
  let idx = 0;
  let currentSection = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const indent = line.match(/^\s*/)?.[0]?.length ?? 0;
    const level = Math.floor(indent / 2);
    if (/^#+\s+/.test(trimmed) || /:\s*$/.test(trimmed)) {
      currentSection = trimmed.replace(/^#+\s+/, '').replace(/:\s*$/, '');
      items.push({
        id: `s${idx++}`,
        title: currentSection,
        estimateMinutes: null,
        level,
        isTask: false,
        section: currentSection,
      });
      continue;
    }
    const bullet = trimmed.match(/^[-*+]\s+(.*)$/) || trimmed.match(/^\d+\.\s+(.*)$/);
    if (!bullet?.[1]) continue;
    const titleRaw = bullet[1].replace(/^\[[ xX]\]\s*/, '').trim();
    const estimateMinutes = parseEstimateMinutes(titleRaw);
    const title = stripEstimate(titleRaw);
    const outlineKey = `${currentSection.toLowerCase()}::${title.toLowerCase()}::${estimateMinutes ?? ''}`;
    items.push({
      id: `t${idx++}`,
      title,
      estimateMinutes,
      level,
      isTask: true,
      section: currentSection,
      outlineKey,
    });
  }
  return items;
}

async function loadOutlineMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(OUTLINE_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function saveOutlineMap(map: Record<string, string>) {
  try {
    await AsyncStorage.setItem(OUTLINE_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export default function PlanScreen() {
  const { palette, sizes, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { active, startSession } = useSession();
  const [outline, setOutline] = useState(DEFAULT_OUTLINE);
  const [syncedTasks, setSyncedTasks] = useState<MobileTask[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setOutline(raw);
    });
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, outline).catch(() => undefined);
    }, 400);
    return () => clearTimeout(id);
  }, [outline]);

  const refreshTasks = () => {
    listTasks().then((tasks) => setSyncedTasks(tasks));
  };

  useEffect(() => {
    refreshTasks();
  }, []);

  const ensureOutlineTask = async (task: TaskRow) => {
    if (!task.isTask || !task.outlineKey) return null;
    const map = await loadOutlineMap();
    const existing = map[task.outlineKey];
    if (existing) return existing;
    const created = await createTask({
      title: task.title,
      estimateMinutes: task.estimateMinutes ?? null,
      status: 'in_progress',
    });
    map[task.outlineKey] = created.id;
    await saveOutlineMap(map);
    refreshTasks();
    return created.id;
  };

  const startFocus = (task: TaskRow, taskId?: string | null) => {
    if (!task.isTask) return;
    const run = async () => {
      const linkedTaskId = taskId ?? (await ensureOutlineTask(task));
      await startSession({
        title: task.title,
        kind: 'task',
        startedAt: Date.now(),
        estimatedMinutes: task.estimateMinutes ?? undefined,
        importance: task.importance ?? 5,
        difficulty: task.difficulty ?? 5,
        sourceTaskId: task.id,
        taskId: linkedTaskId ?? undefined,
      });
      router.push('/focus');
    };

    const currentTaskId = active?.sourceTaskId ?? null;
    if (active?.locked && currentTaskId !== task.id) {
      Alert.alert('Tracker locked', 'Unlock the current focus session to switch tasks.');
      return;
    }
    if (active && currentTaskId !== task.id) {
      Alert.alert(
        'Switch focus?',
        `You are currently in "${active.title}". Start "${task.title}" instead?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start', style: 'default', onPress: () => void run() },
        ]
      );
      return;
    }

    void run();
  };

  const rows = useMemo(() => outlineToTasks(outline), [outline]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.nodeBadge,
            { borderColor: palette.border },
          ]}>
          <Text style={styles.nodeBadgeText}>1</Text>
        </View>
        <Text style={styles.topMeta}>Tasks</Text>
      </View>

      <View style={styles.outlineBox}>
        <Text style={styles.sectionLabel}>Plan Outline (Markdown)</Text>
        <TextInput
          style={[
            styles.outlineInput,
            {
              color: palette.text,
              borderColor: palette.border,
            },
          ]}
          multiline
          value={outline}
          onChangeText={setOutline}
          placeholder="Write tasks in markdown..."
          placeholderTextColor={palette.textSecondary}
        />
      </View>

      <View style={styles.list}>
        {rows.map((task) => (
          <View
            key={task.id}
            style={[
              styles.card,
              !task.isTask && styles.sectionCard,
              {
                backgroundColor: task.isTask
                  ? palette.surfaceAlt
                  : 'transparent',
                borderColor: task.isTask
                  ? palette.border
                  : 'transparent',
              },
            ]}>
            <View style={[styles.cardHeader, { paddingLeft: 8 + (task.level ?? 0) * 12 }]}>
              <Text style={[styles.cardTitle, !task.isTask && styles.sectionTitle]}>
                {task.title}
              </Text>
              {task.estimateMinutes != null ? (
                <Text style={styles.cardMeta}>{task.estimateMinutes}m</Text>
              ) : null}
            </View>
            {task.isTask ? (
              <Pressable style={styles.focusButton} onPress={() => void startFocus(task)}>
                <Text style={styles.focusButtonText}>Start Focus</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.syncedSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitleText, { color: palette.text }]}>Synced Tasks</Text>
          <TouchableOpacity onPress={refreshTasks}>
            <Text style={[styles.sectionAction, { color: palette.tint }]}>Refresh</Text>
          </TouchableOpacity>
        </View>
        {syncedTasks.length ? (
          syncedTasks.map((task) => (
            <View
              key={task.id}
              style={[
                styles.syncedCard,
                {
                  backgroundColor: palette.surfaceAlt,
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={styles.syncedHeader}>
                <Pressable
                  style={[styles.checkbox, task.status === 'done' && styles.checkboxActive]}
                  onPress={() => {
                    void completeTask(task.id).then(() => refreshTasks());
                  }}
                />
                <View style={styles.syncedMeta}>
                  <Text style={[styles.syncedTitle, { color: palette.text }]}>{task.title}</Text>
                  {task.estimateMinutes != null ? (
                    <Text style={[styles.syncedEstimate, { color: palette.textSecondary }]}>
                      {task.estimateMinutes}m
                    </Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                style={styles.focusButton}
                onPress={() =>
                  void startFocus(
                    { id: task.id, title: task.title, estimateMinutes: task.estimateMinutes ?? null, isTask: true },
                    task.id
                  )
                }>
                <Text style={styles.focusButtonText}>Start Focus</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No synced tasks yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nodeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(217,93,57,0.12)',
  },
  nodeBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D95D39',
  },
  topMeta: {
    fontWeight: '600',
    opacity: 0.7,
  },
  list: {
    gap: 12,
    marginTop: 8,
  },
  syncedSection: {
    gap: 12,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  outlineBox: {
    gap: 8,
  },
  outlineInput: {
    minHeight: 160,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '700',
    opacity: 0.7,
  },
  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  sectionCard: {
    backgroundColor: 'transparent',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  cardMeta: {
    opacity: 0.65,
  },
  syncedCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  syncedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D95D39',
  },
  checkboxActive: {
    backgroundColor: '#D95D39',
  },
  syncedMeta: {
    flex: 1,
  },
  syncedTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  syncedEstimate: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  focusButton: {
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D95D39',
  },
  focusButtonText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
});
