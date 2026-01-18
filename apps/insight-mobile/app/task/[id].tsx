import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import { Screen } from '@/components/Screen';
import { LuxCard } from '@/components/LuxCard';
import { useTheme } from '@/src/state/theme';
import { getTask, updateTask, type MobileTask, type MobileTaskStatus } from '@/src/storage/tasks';
import { useSession } from '@/src/state/session';
import { InsightIcon } from '@/src/components/InsightIcon';
import {
  CHARACTER_KEYS,
  CATEGORY_SHORTCUTS,
  SUBCATEGORY_SHORTCUTS,
  parseCommaList,
  parseTagList,
  uniqStrings,
} from '@/src/utils/frontmatter';
import { computeXp, formatXp } from '@/src/utils/points';

function formatDate(ms: number | null | undefined) {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(ms: number | null | undefined) {
  if (!ms) return '';
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_OPTIONS: Array<{ key: MobileTaskStatus; label: string }> = [
  { key: 'todo', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
  { key: 'canceled', label: 'Canceled' },
];

export default function TaskDetailScreen() {
  const { palette, sizes, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const taskId = Array.isArray(id) ? id[0] : id;
  const { startSession } = useSession();

  const [task, setTask] = useState<MobileTask | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<MobileTaskStatus>('todo');
  const [importance, setImportance] = useState(5);
  const [difficulty, setDifficulty] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [contexts, setContexts] = useState<string[]>([]);
  const [contextDraft, setContextDraft] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [peopleDraft, setPeopleDraft] = useState('');
  const [goal, setGoal] = useState('');
  const [project, setProject] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [estimateMinutes, setEstimateMinutes] = useState('');
  const [categoriesOffset, setCategoriesOffset] = useState(0);

  useEffect(() => {
    if (!taskId) return;
    let mounted = true;
    getTask(taskId).then((found) => {
      if (!mounted) return;
      setTask(found);
      setTitle(found?.title ?? '');
      setNotes(found?.notes ?? '');
      setStatus(found?.status ?? 'todo');
      setImportance(found?.importance ?? 5);
      setDifficulty(found?.difficulty ?? 5);
      setTags(Array.isArray(found?.tags) ? found?.tags ?? [] : []);
      setContexts(Array.isArray(found?.contexts) ? found?.contexts ?? [] : []);
      setPeople(Array.isArray(found?.people) ? found?.people ?? [] : []);
      setGoal(found?.goal ?? '');
      setProject(found?.project ?? '');
      setCategory(found?.category ?? '');
      setSubcategory(found?.subcategory ?? '');
      setEstimateMinutes(found?.estimateMinutes != null ? String(found.estimateMinutes) : '');
    });
    return () => {
      mounted = false;
    };
  }, [taskId]);

  const saveChanges = useCallback(async () => {
    if (!taskId || !task) return;
    try {
      await updateTask(taskId, {
        title: title.trim() || task.title,
        notes,
        status,
        importance,
        difficulty,
        tags: uniqStrings(tags),
        contexts: uniqStrings(contexts),
        people: uniqStrings(people),
        goal: goal.trim() || null,
        project: project.trim() || null,
        category: category.trim() || null,
        subcategory: subcategory.trim() || null,
        estimateMinutes: estimateMinutes ? parseInt(estimateMinutes, 10) || null : null,
      });
    } catch (e) {
      Alert.alert('Save failed', String(e));
    }
  }, [
    taskId,
    task,
    title,
    notes,
    status,
    importance,
    difficulty,
    tags,
    contexts,
    people,
    goal,
    project,
    category,
    subcategory,
    estimateMinutes,
  ]);

  const addTag = useCallback(() => {
    const t = tagDraft.trim().replace(/^#/, '');
    if (!t) return;
    setTags((prev) => uniqStrings([...prev, t]));
    setTagDraft('');
    void saveChanges();
  }, [tagDraft, saveChanges]);

  const removeTag = useCallback(
    (tag: string) => {
      setTags((prev) => prev.filter((t) => t !== tag));
      void saveChanges();
    },
    [saveChanges]
  );

  const addContext = useCallback(() => {
    const c = contextDraft.trim().replace(/^\+/, '');
    if (!c) return;
    setContexts((prev) => uniqStrings([...prev, c]));
    setContextDraft('');
    void saveChanges();
  }, [contextDraft, saveChanges]);

  const removeContext = useCallback(
    (ctx: string) => {
      setContexts((prev) => prev.filter((c) => c !== ctx));
      void saveChanges();
    },
    [saveChanges]
  );

  const addPerson = useCallback(() => {
    const p = peopleDraft.trim().replace(/^@/, '');
    if (!p) return;
    setPeople((prev) => uniqStrings([...prev, p]));
    setPeopleDraft('');
    void saveChanges();
  }, [peopleDraft, saveChanges]);

  const removePerson = useCallback(
    (person: string) => {
      setPeople((prev) => prev.filter((p) => p !== person));
      void saveChanges();
    },
    [saveChanges]
  );

  const handleStartSession = useCallback(async () => {
    if (!task) return;
    await startSession({
      title: task.title,
      kind: 'task',
      startedAt: Date.now(),
      estimatedMinutes: task.estimateMinutes ?? null,
      importance: task.importance ?? null,
      difficulty: task.difficulty ?? null,
      parentEventId: task.parentEventId ?? null,
      tags: task.tags ?? [],
      contexts: task.contexts ?? [],
      people: task.people ?? [],
      location: null,
      category: task.category ?? null,
      subcategory: task.subcategory ?? null,
      project: task.project ?? null,
      goal: task.goal ?? null,
      skills: [],
      character: [],
    });
    router.push('/focus');
  }, [task, startSession]);

  const toggleComplete = useCallback(async () => {
    if (!taskId) return;
    const newStatus = status === 'done' ? 'todo' : 'done';
    setStatus(newStatus);
    await updateTask(taskId, {
      status: newStatus,
      completedAt: newStatus === 'done' ? Date.now() : null,
    });
  }, [taskId, status]);

  const xp = useMemo(() => {
    return computeXp({
      importance: importance ?? 5,
      difficulty: difficulty ?? 5,
      durationMinutes: estimateMinutes ? parseInt(estimateMinutes, 10) || 30 : 30,
    });
  }, [importance, difficulty, estimateMinutes]);

  const categoryItems = useMemo(() => Object.entries(CATEGORY_SHORTCUTS), []);
  const subcategoryItems = useMemo(
    () => (category && SUBCATEGORY_SHORTCUTS[category]) || [],
    [category]
  );

  if (!task) {
    return (
      <Screen style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top + 60 }]}>
          <Text style={{ color: palette.textSecondary }}>Loading...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingHorizontal: sizes.spacing }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="chevron-left" size={16} color={palette.tint} />
          <Text style={[styles.backText, { color: palette.tint }]}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerAction, { backgroundColor: palette.tint }]}
            onPress={handleStartSession}
          >
            <InsightIcon name="play" size={14} color="#FFFFFF" />
            <Text style={styles.headerActionText}>Start</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <LuxCard style={styles.mainCard}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    status === 'done'
                      ? palette.success
                      : status === 'in_progress'
                        ? palette.tint
                        : status === 'canceled'
                          ? palette.textSecondary
                          : palette.border,
                },
              ]}
            >
              <Text style={styles.statusText}>{status.replace('_', ' ')}</Text>
            </View>
            <Text style={[styles.xpBadge, { color: palette.tint }]}>+{formatXp(xp)} XP</Text>
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            onBlur={saveChanges}
            placeholder="Task title"
            placeholderTextColor={palette.textSecondary}
            style={[styles.titleInput, { color: palette.text, borderColor: palette.borderLight }]}
          />

          {(task.dueAt || task.scheduledAt) && (
            <View style={styles.datesRow}>
              {task.scheduledAt && (
                <View style={styles.dateItem}>
                  <InsightIcon name="calendar" size={12} color={palette.textSecondary} />
                  <Text style={[styles.dateText, { color: palette.textSecondary }]}>
                    Scheduled: {formatDate(task.scheduledAt)}
                  </Text>
                </View>
              )}
              {task.dueAt && (
                <View style={styles.dateItem}>
                  <InsightIcon name="play" size={12} color={palette.warning} />
                  <Text style={[styles.dateText, { color: palette.warning }]}>
                    Due: {formatDate(task.dueAt)}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: status === 'done' ? palette.success : palette.surface,
                  borderColor: status === 'done' ? palette.success : palette.border,
                },
              ]}
              onPress={toggleComplete}
            >
              <InsightIcon
                name="check"
                size={14}
                color={status === 'done' ? '#FFFFFF' : palette.text}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: status === 'done' ? '#FFFFFF' : palette.text },
                ]}
              >
                {status === 'done' ? 'Completed' : 'Mark Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </LuxCard>

        <LuxCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Status</Text>
          <View style={styles.statusOptions}>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.statusOption,
                  {
                    backgroundColor: status === opt.key ? palette.tint : palette.surface,
                    borderColor: status === opt.key ? palette.tint : palette.border,
                  },
                ]}
                onPress={() => {
                  setStatus(opt.key);
                  void updateTask(taskId!, {
                    status: opt.key,
                    completedAt: opt.key === 'done' ? Date.now() : null,
                  });
                }}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    { color: status === opt.key ? '#FFFFFF' : palette.text },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LuxCard>

        <LuxCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            onBlur={saveChanges}
            placeholder="Add notes..."
            placeholderTextColor={palette.textSecondary}
            multiline
            style={[
              styles.notesInput,
              { color: palette.text, backgroundColor: palette.surface, borderColor: palette.borderLight },
            ]}
          />
        </LuxCard>

        <LuxCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Importance & Difficulty</Text>
          <View style={styles.sliderRow}>
            <Text style={[styles.sliderLabel, { color: palette.textSecondary }]}>
              Importance: {importance}
            </Text>
            <View style={styles.sliderButtons}>
              {[1, 3, 5, 7, 10].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.sliderButton,
                    {
                      backgroundColor: importance === val ? palette.tint : palette.surface,
                      borderColor: importance === val ? palette.tint : palette.border,
                    },
                  ]}
                  onPress={() => {
                    setImportance(val);
                    void saveChanges();
                  }}
                >
                  <Text
                    style={[
                      styles.sliderButtonText,
                      { color: importance === val ? '#FFFFFF' : palette.text },
                    ]}
                  >
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.sliderRow}>
            <Text style={[styles.sliderLabel, { color: palette.textSecondary }]}>
              Difficulty: {difficulty}
            </Text>
            <View style={styles.sliderButtons}>
              {[1, 3, 5, 7, 10].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.sliderButton,
                    {
                      backgroundColor: difficulty === val ? palette.tint : palette.surface,
                      borderColor: difficulty === val ? palette.tint : palette.border,
                    },
                  ]}
                  onPress={() => {
                    setDifficulty(val);
                    void saveChanges();
                  }}
                >
                  <Text
                    style={[
                      styles.sliderButtonText,
                      { color: difficulty === val ? '#FFFFFF' : palette.text },
                    ]}
                  >
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </LuxCard>

        <LuxCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Estimate</Text>
          <View style={styles.estimateRow}>
            <TextInput
              value={estimateMinutes}
              onChangeText={setEstimateMinutes}
              onBlur={saveChanges}
              placeholder="30"
              placeholderTextColor={palette.textSecondary}
              keyboardType="numeric"
              style={[
                styles.estimateInput,
                { color: palette.text, borderColor: palette.borderLight },
              ]}
            />
            <Text style={[styles.estimateLabel, { color: palette.textSecondary }]}>minutes</Text>
          </View>
        </LuxCard>

        <LuxCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Tags</Text>
          <View style={styles.chipsRow}>
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.chip, { backgroundColor: palette.tintLight, borderColor: palette.tint }]}
                onPress={() => removeTag(tag)}
              >
                <Text style={[styles.chipText, { color: palette.tint }]}>#{tag}</Text>
                <FontAwesome name="times" size={10} color={palette.tint} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.addRow}>
            <TextInput
              value={tagDraft}
              onChangeText={setTagDraft}
              placeholder="Add tag..."
              placeholderTextColor={palette.textSecondary}
              onSubmitEditing={addTag}
              style={[styles.addInput, { color: palette.text, borderColor: palette.borderLight }]}
            />
            <TouchableOpacity style={[styles.addButton, { backgroundColor: palette.tint }]} onPress={addTag}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </LuxCard>

        <LuxCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Contexts</Text>
          <View style={styles.chipsRow}>
            {contexts.map((ctx) => (
              <TouchableOpacity
                key={ctx}
                style={[styles.chip, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}
                onPress={() => removeContext(ctx)}
              >
                <Text style={[styles.chipText, { color: palette.text }]}>+{ctx}</Text>
                <FontAwesome name="times" size={10} color={palette.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.addRow}>
            <TextInput
              value={contextDraft}
              onChangeText={setContextDraft}
              placeholder="Add context..."
              placeholderTextColor={palette.textSecondary}
              onSubmitEditing={addContext}
              style={[styles.addInput, { color: palette.text, borderColor: palette.borderLight }]}
            />
            <TouchableOpacity style={[styles.addButton, { backgroundColor: palette.tint }]} onPress={addContext}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </LuxCard>

        <LuxCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>People</Text>
          <View style={styles.chipsRow}>
            {people.map((person) => (
              <TouchableOpacity
                key={person}
                style={[styles.chip, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}
                onPress={() => removePerson(person)}
              >
                <Text style={[styles.chipText, { color: palette.text }]}>@{person}</Text>
                <FontAwesome name="times" size={10} color={palette.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.addRow}>
            <TextInput
              value={peopleDraft}
              onChangeText={setPeopleDraft}
              placeholder="Add person..."
              placeholderTextColor={palette.textSecondary}
              onSubmitEditing={addPerson}
              style={[styles.addInput, { color: palette.text, borderColor: palette.borderLight }]}
            />
            <TouchableOpacity style={[styles.addButton, { backgroundColor: palette.tint }]} onPress={addPerson}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </LuxCard>

        <LuxCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categoryItems.slice(categoriesOffset, categoriesOffset + 6).map(([key, val]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: category === key ? palette.tint : palette.surface,
                    borderColor: category === key ? palette.tint : palette.border,
                  },
                ]}
                onPress={() => {
                  setCategory(key);
                  setSubcategory('');
                  void saveChanges();
                }}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: category === key ? '#FFFFFF' : palette.text },
                  ]}
                >
                  {val}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {subcategoryItems.length > 0 && (
            <>
              <Text style={[styles.subLabel, { color: palette.textSecondary }]}>Subcategory</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {subcategoryItems.map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: subcategory === sub ? palette.tint : palette.surface,
                        borderColor: subcategory === sub ? palette.tint : palette.border,
                      },
                    ]}
                    onPress={() => {
                      setSubcategory(sub);
                      void saveChanges();
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        { color: subcategory === sub ? '#FFFFFF' : palette.text },
                      ]}
                    >
                      {sub}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </LuxCard>

        <LuxCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Goal & Project</Text>
          <TextInput
            value={goal}
            onChangeText={setGoal}
            onBlur={saveChanges}
            placeholder="Link to goal..."
            placeholderTextColor={palette.textSecondary}
            style={[styles.textInput, { color: palette.text, borderColor: palette.borderLight }]}
          />
          <TextInput
            value={project}
            onChangeText={setProject}
            onBlur={saveChanges}
            placeholder="Link to project..."
            placeholderTextColor={palette.textSecondary}
            style={[styles.textInput, { color: palette.text, borderColor: palette.borderLight, marginTop: 8 }]}
          />
        </LuxCard>

        {task.completedAt && (
          <LuxCard style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Completed</Text>
            <Text style={[styles.completedText, { color: palette.success }]}>
              {formatDateTime(task.completedAt)}
            </Text>
          </LuxCard>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  mainCard: {
    padding: 16,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  xpBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '700',
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  datesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
  },
  sliderRow: {
    gap: 8,
  },
  sliderLabel: {
    fontSize: 12,
  },
  sliderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sliderButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  estimateInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  estimateLabel: {
    fontSize: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  addButton: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subLabel: {
    fontSize: 12,
    marginTop: 8,
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
