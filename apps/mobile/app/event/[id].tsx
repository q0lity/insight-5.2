import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { getEvent, updateEvent, type MobileEvent } from '@/src/storage/events';
import { createTask, listTasks, completeTask, type MobileTask } from '@/src/storage/tasks';
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

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function EventDetailScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const { active, startSession, stopSession } = useSession();
  const [event, setEvent] = useState<MobileEvent | null>(null);
  const [notes, setNotes] = useState('');
  const [now, setNow] = useState(Date.now());
  const [importance, setImportance] = useState(5);
  const [difficulty, setDifficulty] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [contexts, setContexts] = useState<string[]>([]);
  const [contextDraft, setContextDraft] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [peopleDraft, setPeopleDraft] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [locationDraft, setLocationDraft] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillsDraft, setSkillsDraft] = useState('');
  const [character, setCharacter] = useState<string[]>([]);
  const [goal, setGoal] = useState('');
  const [project, setProject] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [estimateMinutes, setEstimateMinutes] = useState('');
  const [subtasks, setSubtasks] = useState<MobileTask[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState('');

  const isDark = colorScheme === 'dark';
  const isActive = Boolean(active && eventId && active.id === eventId);

  useEffect(() => {
    if (!eventId) return;
    let mounted = true;
    getEvent(eventId).then((found) => {
      if (!mounted) return;
      setEvent(found);
      setNotes(found?.notes ?? '');
      setImportance(found?.importance ?? 5);
      setDifficulty(found?.difficulty ?? 5);
      setTags(Array.isArray(found?.tags) ? found?.tags ?? [] : []);
      setContexts(Array.isArray(found?.contexts) ? found?.contexts ?? [] : []);
      setPeople(Array.isArray(found?.people) ? found?.people ?? [] : []);
      setLocations(found?.location ? parseCommaList(found.location) : []);
      setSkills(Array.isArray(found?.skills) ? found?.skills ?? [] : []);
      setCharacter(Array.isArray(found?.character) ? found?.character ?? [] : []);
      setGoal(found?.goal ?? '');
      setProject(found?.project ?? '');
      setCategory(found?.category ?? '');
      setSubcategory(found?.subcategory ?? '');
      setEstimateMinutes(found?.estimateMinutes != null ? String(found.estimateMinutes) : '');
    });
    return () => {
      mounted = false;
    };
  }, [eventId, active?.id]);

  useEffect(() => {
    if (!eventId) return;
    let mounted = true;
    listTasks().then((tasks) => {
      if (!mounted) return;
      setSubtasks(tasks.filter((task) => task.parentEventId === eventId));
    });
    return () => {
      mounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const estimateMinutesValue = useMemo(() => {
    const parsed = Number.parseInt(estimateMinutes, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [estimateMinutes]);

  const locationValue = useMemo(() => uniqStrings(locations).join(', '), [locations]);

  const subcategoryOptions = useMemo(() => {
    const match = CATEGORY_SHORTCUTS.find((entry) => entry.toLowerCase() === category.trim().toLowerCase());
    return match ? SUBCATEGORY_SHORTCUTS[match] ?? [] : [];
  }, [category]);

  useEffect(() => {
    if (!eventId) return;
    const id = setTimeout(() => {
      void updateEvent(eventId, { notes });
    }, 400);
    return () => clearTimeout(id);
  }, [eventId, notes]);

  useEffect(() => {
    if (!eventId) return;
    const id = setTimeout(() => {
      void updateEvent(eventId, {
        importance,
        difficulty,
        tags,
        contexts,
        people,
        location: locationValue || null,
        skills,
        character,
        goal: goal.trim() || null,
        project: project.trim() || null,
        category: category.trim() || null,
        subcategory: subcategory.trim() || null,
        estimateMinutes: estimateMinutesValue ?? null,
        points: Math.round(importance * difficulty),
      });
    }, 300);
    return () => clearTimeout(id);
  }, [
    eventId,
    importance,
    difficulty,
    tags,
    contexts,
    people,
    locationValue,
    skills,
    character,
    goal,
    project,
    category,
    subcategory,
    estimateMinutesValue,
  ]);

  const elapsedMs = useMemo(() => {
    if (isActive && active) return now - active.startedAt;
    if (event?.endAt) return event.endAt - event.startAt;
    if (event) return now - event.startAt;
    return 0;
  }, [isActive, active, event, now]);
  const totalMs =
    estimateMinutesValue != null
      ? estimateMinutesValue * 60 * 1000
      : event?.estimateMinutes
        ? event.estimateMinutes * 60 * 1000
        : null;
  const remainingMs = totalMs != null ? Math.max(0, totalMs - elapsedMs) : null;
  const progress = totalMs ? Math.min(1, elapsedMs / totalMs) : 0;

  const points = useMemo(() => Math.round(importance * difficulty), [importance, difficulty]);

  const addLogEntry = () => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const line = `- **${timestamp}** - `;
    setNotes((prev) => (prev ? `${prev}\n${line}` : line));
  };

  const addSegmentDivider = () => {
    setNotes((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return '---\n';
      return `${trimmed}\n\n---\n`;
    });
  };

  const parseEstimateFromText = (raw: string) => {
    const match = raw.match(/(\d+)\s*h|\b(\d+)\s*m/i);
    if (!match) return null;
    if (match[1]) return Number(match[1]) * 60;
    if (match[2]) return Number(match[2]);
    return null;
  };

  const stripEstimate = (raw: string) => {
    return raw.replace(/\(([^)]*?\d+\s*(h|m)[^)]*?)\)/gi, '').replace(/\s{2,}/g, ' ').trim();
  };

  const segments = useMemo(() => {
    if (!notes.trim()) return [];
    return notes
      .split(/\n-{3,}\n/)
      .map((seg) => seg.trim())
      .filter(Boolean)
      .map((seg, idx) => {
        const timeMatch = seg.match(/\*\*(\d{1,2}:\d{2})\*\*/);
        const previewLine = seg.split('\n')[0] ?? '';
        return {
          id: `${eventId ?? 'seg'}_${idx}`,
          time: timeMatch?.[1] ?? null,
          preview: previewLine.replace(/^-+\s*/, '').slice(0, 120),
          body: seg,
        };
      });
  }, [notes, eventId]);

  const addSubtask = async () => {
    if (!eventId) return;
    const raw = subtaskDraft.trim();
    if (!raw) return;
    const estimate = parseEstimateFromText(raw);
    const title = stripEstimate(raw);
    const created = await createTask({
      title,
      estimateMinutes: estimate,
      status: 'todo',
      parentEventId: eventId,
      category: category || null,
      subcategory: subcategory || null,
      tags,
      contexts,
      people,
    });
    setSubtasks((prev) => [created, ...prev]);
    setSubtaskDraft('');
  };

  const extractSegmentToTask = async (segment: { body: string }) => {
    if (!eventId) return;
    const firstLine = segment.body.split('\n')[0] ?? '';
    const title = firstLine
      .replace(/-?\s*\*\*\d{1,2}:\d{2}\*\*\s*-\s*/g, '')
      .replace(/^-+\s*/, '')
      .trim() || 'Segment task';
    const created = await createTask({
      title,
      notes: segment.body,
      status: 'todo',
      parentEventId: eventId,
      category: category || null,
      subcategory: subcategory || null,
      tags,
      contexts,
      people,
    });
    setSubtasks((prev) => [created, ...prev]);
  };

  const addTagsFromDraft = () => {
    const next = parseTagList(tagDraft);
    if (!next.length) return;
    setTags((prev) => uniqStrings([...prev, ...next]));
    setTagDraft('');
  };

  const addPeopleFromDraft = () => {
    const next = parseCommaList(peopleDraft);
    if (!next.length) return;
    setPeople((prev) => uniqStrings([...prev, ...next]));
    setPeopleDraft('');
  };

  const addContextsFromDraft = () => {
    const next = parseCommaList(contextDraft);
    if (!next.length) return;
    setContexts((prev) => uniqStrings([...prev, ...next]));
    setContextDraft('');
  };

  const addLocationsFromDraft = () => {
    const next = parseCommaList(locationDraft);
    if (!next.length) return;
    setLocations((prev) => uniqStrings([...prev, ...next]));
    setLocationDraft('');
  };

  const addSkillsFromDraft = () => {
    const next = parseCommaList(skillsDraft);
    if (!next.length) return;
    setSkills((prev) => uniqStrings([...prev, ...next]));
    setSkillsDraft('');
  };

  const toggleCharacter = (key: string) => {
    setCharacter((prev) => (prev.includes(key) ? prev.filter((entry) => entry !== key) : [...prev, key]));
  };

  const startNewSession = async () => {
    if (!event) return;
    if (active?.locked) {
      Alert.alert('Tracker locked', 'Unlock the current session before starting a new event.');
      return;
    }
    const run = async () => {
      const session = await startSession({
        title: event.title,
        kind: 'event',
        startedAt: Date.now(),
        estimatedMinutes: estimateMinutesValue ?? event.estimateMinutes ?? null,
        importance,
        difficulty,
        trackerKey: event.trackerKey ?? null,
      });
      router.replace(`/event/${session.id}`);
    };
    if (active && !isActive) {
      Alert.alert(
        'Switch activity?',
        `You are currently in "${active.title}". Start "${event.title}" instead?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start', style: 'default', onPress: () => void run() },
        ]
      );
      return;
    }
    await run();
  };

  const startSubtaskSession = async (task: MobileTask) => {
    if (active?.locked) {
      Alert.alert('Tracker locked', 'Unlock the current session before starting a new task.');
      return;
    }
    await startSession({
      title: task.title,
      kind: 'task',
      startedAt: Date.now(),
      estimatedMinutes: task.estimateMinutes ?? null,
      importance: task.importance ?? 5,
      difficulty: task.difficulty ?? 5,
      taskId: task.id,
      parentEventId: eventId ?? null,
    });
    router.push('/focus');
  };

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <InsightIcon name="chevronLeft" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Event</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContent}>
          <Text style={[styles.emptyText, { color: palette.tabIconDefault }]}>Event not found.</Text>
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
        <Text style={[styles.headerTitle, { color: palette.text }]}>Detail</Text>
        <TouchableOpacity style={styles.moreButton}>
          <InsightIcon name="dots" size={24} color={palette.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#141a2a' : '#FFFFFF',
              borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)',
            },
          ]}>
          <Text style={[styles.title, { color: palette.text }]}>{event.title}</Text>
          {category || subcategory ? (
            <Text style={[styles.titleMeta, { color: palette.tabIconDefault }]}>
              {[category, subcategory].filter(Boolean).join(' / ')}
            </Text>
          ) : null}
          <Text style={[styles.meta, { color: palette.tabIconDefault }]}>
            {formatClock(elapsedMs)} elapsed
            {remainingMs != null ? ` - ${formatClock(remainingMs)} left` : ''}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(217,93,57,0.1)' : 'rgba(217,93,57,0.05)' }]}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: palette.tint }]} />
          </View>
          <Text style={[styles.points, { color: palette.tint }]}>+{points} XP</Text>

          <View style={styles.actions}>
            {isActive ? (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: palette.tint }]} onPress={() => void stopSession()}>
                <Text style={styles.actionTextLight}>Stop Session</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: palette.tint }]} onPress={() => void startNewSession()}>
                <Text style={styles.actionTextLight}>Start Session</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.secondaryActionButton, { borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.1)' }]} 
              onPress={addLogEntry}
            >
              <Text style={[styles.actionText, { color: palette.text }]}>Add Log</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.tabIconDefault }]}>Notes</Text>
            <View style={styles.noteActions}>
              <TouchableOpacity
                style={[
                  styles.timestampButton,
                  { backgroundColor: isDark ? 'rgba(217,93,57,0.15)' : 'rgba(217,93,57,0.08)' },
                ]}
                onPress={addLogEntry}>
                <Text style={[styles.timestampText, { color: palette.tint }]}>Add timestamp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.timestampButton,
                  { backgroundColor: isDark ? 'rgba(217,93,57,0.15)' : 'rgba(217,93,57,0.08)' },
                ]}
                onPress={addSegmentDivider}>
                <Text style={[styles.timestampText, { color: palette.tint }]}>Add segment</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            style={[
              styles.notesInput,
              {
                color: palette.text,
                backgroundColor: isDark ? '#141a2a' : '#FFFFFF',
                borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)',
              },
            ]}
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder="- **09:20** - Draft outline"
            placeholderTextColor={palette.tabIconDefault}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.tabIconDefault }]}>Segments</Text>
          </View>
          {segments.length ? (
            segments.map((segment) => (
              <View
                key={segment.id}
                style={[
                  styles.segmentCard,
                  {
                    backgroundColor: isDark ? '#141a2a' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)',
                  },
                ]}>
                <View style={styles.segmentHeader}>
                  <Text style={[styles.segmentTitle, { color: palette.text }]}>
                    {segment.preview || 'Segment'}
                  </Text>
                  {segment.time ? (
                    <Text style={[styles.segmentTime, { color: palette.tabIconDefault }]}>{segment.time}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[styles.segmentAction, { borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.1)' }]}
                  onPress={() => void extractSegmentToTask(segment)}>
                  <Text style={[styles.segmentActionText, { color: palette.text }]}>Extract task</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: palette.tabIconDefault }]}>Add segments with the divider.</Text>
          )}
        </View>

        <View style={styles.frontmatter}>
          <Text style={[styles.sectionLabel, { color: palette.tabIconDefault }]}>Frontmatter</Text>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: palette.text }]}>Tags</Text>
            <View style={styles.chipRow}>
              {tags.map((tag) => (
                <Pressable key={tag} onPress={() => setTags((prev) => prev.filter((entry) => entry !== tag))} style={[styles.chip, { backgroundColor: isDark ? 'rgba(217,93,57,0.15)' : 'rgba(217,93,57,0.08)' }]}>
                  <Text style={[styles.chipText, { color: palette.tint }]}>#{tag}</Text>
                  <Text style={[styles.chipRemove, { color: palette.tint }]}>×</Text>
                </Pressable>
              ))}
              <TextInput
                value={tagDraft}
                onChangeText={setTagDraft}
                onSubmitEditing={addTagsFromDraft}
                onBlur={addTagsFromDraft}
                placeholder="#work #meeting"
                placeholderTextColor={palette.tabIconDefault}
                style={[styles.chipInput, { color: palette.text }]}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: palette.text }]}>Contexts</Text>
            <View style={styles.chipRow}>
              {contexts.map((ctx) => (
                <Pressable
                  key={ctx}
                  onPress={() => setContexts((prev) => prev.filter((entry) => entry !== ctx))}
                  style={[
                    styles.chip,
                    { backgroundColor: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.1)' },
                  ]}>
                  <Text style={[styles.chipText, { color: '#3B82F6' }]}>+{ctx}</Text>
                  <Text style={[styles.chipRemove, { color: '#3B82F6' }]}>×</Text>
                </Pressable>
              ))}
              <TextInput
                value={contextDraft}
                onChangeText={setContextDraft}
                onSubmitEditing={addContextsFromDraft}
                onBlur={addContextsFromDraft}
                placeholder="+car +clinic"
                placeholderTextColor={palette.tabIconDefault}
                style={[styles.chipInput, { color: palette.text }]}
              />
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>Estimate (min)</Text>
              <TextInput
                value={estimateMinutes}
                onChangeText={setEstimateMinutes}
                keyboardType="number-pad"
                placeholder="45"
                placeholderTextColor={palette.tabIconDefault}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    backgroundColor: isDark ? '#141a2a' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)',
                  },
                ]}
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>Location</Text>
              <TextInput
                value={locationDraft}
                onChangeText={setLocationDraft}
                onSubmitEditing={addLocationsFromDraft}
                onBlur={addLocationsFromDraft}
                placeholder="Home"
                placeholderTextColor={palette.tabIconDefault}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    backgroundColor: isDark ? '#141a2a' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)',
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.scaleGroup}>
            <Text style={[styles.sectionLabel, { color: palette.tabIconDefault }]}>Importance</Text>
            <View style={styles.scaleRow}>
              {Array.from({ length: 10 }, (_, idx) => idx + 1).map((level) => (
                <TouchableOpacity
                  key={`imp_${level}`}
                  activeOpacity={0.7}
                  style={[
                    styles.scalePill,
                    { 
                      backgroundColor: level <= importance ? palette.tint : (isDark ? '#141a2a' : '#FFFFFF'),
                      borderColor: level <= importance ? palette.tint : (isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)')
                    }
                  ]}
                  onPress={() => setImportance(level)}>
                  <Text style={[styles.scaleText, { color: level <= importance ? '#FFFFFF' : palette.text }]}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={[styles.sectionLabel, { color: palette.tabIconDefault, marginTop: 12 }]}>Difficulty</Text>
            <View style={styles.scaleRow}>
              {Array.from({ length: 10 }, (_, idx) => idx + 1).map((level) => (
                <TouchableOpacity
                  key={`dif_${level}`}
                  activeOpacity={0.7}
                  style={[
                    styles.scalePill,
                    { 
                      backgroundColor: level <= difficulty ? palette.tint : (isDark ? '#141a2a' : '#FFFFFF'),
                      borderColor: level <= difficulty ? palette.tint : (isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)')
                    }
                  ]}
                  onPress={() => setDifficulty(level)}>
                  <Text style={[styles.scaleText, { color: level <= difficulty ? '#FFFFFF' : palette.text }]}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.tabIconDefault }]}>Subtasks</Text>
          </View>
          <View style={styles.subtaskRow}>
            <TextInput
              value={subtaskDraft}
              onChangeText={setSubtaskDraft}
              placeholder="Add a subtask (e.g. Call prior auth 20m)"
              placeholderTextColor={palette.tabIconDefault}
              style={[
                styles.subtaskInput,
                {
                  color: palette.text,
                  backgroundColor: isDark ? '#141a2a' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)',
                },
              ]}
            />
            <TouchableOpacity style={[styles.subtaskButton, { backgroundColor: palette.tint }]} onPress={addSubtask}>
              <Text style={styles.subtaskButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {subtasks.length ? (
            subtasks.map((task) => (
              <View
                key={task.id}
                style={[
                  styles.subtaskCard,
                  {
                    backgroundColor: isDark ? '#141a2a' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)',
                  },
                ]}>
                <View style={styles.subtaskHeader}>
                  <Pressable
                    style={[styles.subtaskCheckbox, task.status === 'done' && styles.subtaskCheckboxActive]}
                    onPress={() => void completeTask(task.id).then(() => {
                      setSubtasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'done' } : t)));
                    })}
                  />
                  <View style={styles.subtaskMeta}>
                    <Text style={[styles.subtaskTitle, { color: palette.text }]}>{task.title}</Text>
                    {task.estimateMinutes != null ? (
                      <Text style={[styles.subtaskEstimate, { color: palette.tabIconDefault }]}>
                        {task.estimateMinutes}m
                      </Text>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.subtaskButton, { backgroundColor: palette.tint }]}
                  onPress={() => void startSubtaskSession(task)}>
                  <Text style={styles.subtaskButtonText}>Start</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: palette.tabIconDefault }]}>No subtasks yet.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
  },
  backButton: {
    padding: 8,
  },
  moreButton: {
    padding: 8,
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Figtree',
  },
  scroll: {
    padding: 20,
    gap: 24,
    paddingBottom: 60,
  },
  card: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
  },
  titleMeta: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  meta: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  points: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Figtree',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  actionTextLight: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timestampButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  notesInput: {
    minHeight: 160,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Figtree',
    textAlignVertical: 'top',
  },
  frontmatter: {
    gap: 20,
  },
  fieldRow: {
    gap: 8,
  },
  subtaskRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  subtaskInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  subtaskButton: {
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskButtonText: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
  subtaskCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  subtaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subtaskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D95D39',
  },
  subtaskCheckboxActive: {
    backgroundColor: '#D95D39',
  },
  subtaskMeta: {
    flex: 1,
  },
  subtaskTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  subtaskEstimate: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  segmentCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  segmentTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  segmentTime: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  segmentAction: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActionText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  chipRemove: {
    fontSize: 16,
    fontWeight: '400',
    marginLeft: 2,
  },
  chipInput: {
    minWidth: 100,
    fontSize: 14,
    fontFamily: 'Figtree',
    paddingVertical: 4,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 16,
  },
  gridItem: {
    flex: 1,
    gap: 8,
  },
  smallInput: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'Figtree',
    borderWidth: 1,
  },
  scaleGroup: {
    gap: 10,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scalePill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scaleText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
});
