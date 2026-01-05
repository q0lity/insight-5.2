import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { getEvent, updateEvent, type MobileEvent } from '@/src/storage/events';
import { createTask, listTasks, completeTask, type MobileTask } from '@/src/storage/tasks';
import { createTrackerLog, deleteTrackerLog, listTrackerLogs, updateTrackerLog, type TrackerLogEntry } from '@/src/storage/trackers';
import { useSession } from '@/src/state/session';
import { InsightIcon } from '@/src/components/InsightIcon';
import { RollingNumber } from '@/src/components/RollingNumber';
import {
  CHARACTER_KEYS,
  CATEGORY_SHORTCUTS,
  SUBCATEGORY_SHORTCUTS,
  parseCommaList,
  parseTagList,
  uniqStrings,
} from '@/src/utils/frontmatter';
import { formatSegmentsPreview, parseCapture } from '@/src/lib/schema';
import { computeXp, extractGoalImportance, formatXp } from '@/src/utils/points';

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function normalizeCaptureText(rawText: string) {
  return rawText
    .split('\n')
    .map((line) => line.replace(/^- \\*\\*(\\d{1,2}:\\d{2})\\*\\* -\\s*/, '[$1] '))
    .join('\n')
    .trim();
}

export default function EventDetailScreen() {
  const { palette, sizes, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const { active, startSession, stopSession } = useSession();
  const [event, setEvent] = useState<MobileEvent | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [noteMode, setNoteMode] = useState<'raw' | 'transcript' | 'outline'>('raw');
  const [now, setNow] = useState(Date.now());
  const [importance, setImportance] = useState(5);
  const [difficulty, setDifficulty] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [contexts, setContexts] = useState<string[]>([]);
  const [contextDraft, setContextDraft] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [peopleDraft, setPeopleDraft] = useState('');
  const [places, setPlaces] = useState<string[]>([]);
  const [placeDraft, setPlaceDraft] = useState('');
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
  const [trackerLogs, setTrackerLogs] = useState<TrackerLogEntry[]>([]);
  const [activeTrackerKey, setActiveTrackerKey] = useState<string | null>(null);
  const [trackerKeyDraft, setTrackerKeyDraft] = useState('');
  const [trackerValueDraft, setTrackerValueDraft] = useState('');
  const [editingTrackerId, setEditingTrackerId] = useState<string | null>(null);
  const [editingTrackerValue, setEditingTrackerValue] = useState('');
  const [categoriesOffset, setCategoriesOffset] = useState(0);

    const isActive = Boolean(active && eventId && active.id === eventId);
  const normalizedNotes = useMemo(() => (notes.trim() ? normalizeCaptureText(notes) : ''), [notes]);
  const outlineNotes = useMemo(() => {
    if (!normalizedNotes) return '';
    const parsed = parseCapture(normalizedNotes);
    return parsed.segments.length ? formatSegmentsPreview(parsed.segments) : normalizedNotes;
  }, [normalizedNotes]);
  const shareNotes = useCallback(async () => {
    const message =
      noteMode === 'raw' ? notes : noteMode === 'transcript' ? normalizedNotes : outlineNotes;
    if (!message.trim()) return;
    try {
      await Share.share({ message });
    } catch {
      // ignore share errors
    }
  }, [noteMode, notes, normalizedNotes, outlineNotes]);

  useEffect(() => {
    if (!eventId) return;
    let mounted = true;
    getEvent(eventId).then((found) => {
      if (!mounted) return;
      setEvent(found);
      setTitle(found?.title ?? '');
      setNotes(found?.notes ?? '');
      setImportance(found?.importance ?? 5);
      setDifficulty(found?.difficulty ?? 5);
      setTags(Array.isArray(found?.tags) ? found?.tags ?? [] : []);
      setContexts(Array.isArray(found?.contexts) ? found?.contexts ?? [] : []);
      setPeople(Array.isArray(found?.people) ? found?.people ?? [] : []);
      let frontmatter: Record<string, unknown> = {};
      if (found?.frontmatter) {
        try {
          frontmatter = JSON.parse(found.frontmatter);
        } catch {
          frontmatter = {};
        }
      }
      setPlaces(Array.isArray(frontmatter.places) ? (frontmatter.places as string[]) : []);
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

  const fetchTrackerLogs = useCallback(async () => {
    if (!eventId || !event) return [] as TrackerLogEntry[];
    const startAt = event.startAt;
    const endAt = event.endAt ?? Date.now();
    return listTrackerLogs({ startAt, endAt, limit: 200, entryId: eventId });
  }, [eventId, event]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const rows = await fetchTrackerLogs();
      if (!mounted) return;
      setTrackerLogs(rows);
    })();
    return () => {
      mounted = false;
    };
  }, [fetchTrackerLogs]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const estimateMinutesValue = useMemo(() => {
    const parsed = Number.parseInt(estimateMinutes, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [estimateMinutes]);

  const locationValue = useMemo(() => uniqStrings(locations).join(', '), [locations]);
  const goalImportance = useMemo(() => extractGoalImportance(event?.frontmatter), [event?.frontmatter]);
  const activityTitle = useMemo(() => {
    const categoryLabel = category.trim() || 'Category';
    const subcategoryLabel = subcategory.trim() || 'Subcategory';
    const titleLabel = title.trim() || event?.title || 'Title';
    return `${categoryLabel} | ${subcategoryLabel} | ${titleLabel}`;
  }, [category, subcategory, title, event?.title]);

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
  const durationMinutes = useMemo(() => Math.max(0, elapsedMs / 60000), [elapsedMs]);
  const pointsRaw = useMemo(
    () =>
      computeXp({
        importance,
        difficulty,
        durationMinutes,
        goal,
        goalImportance,
        fallbackGoalImportance: importance,
      }),
    [importance, difficulty, durationMinutes, goal, goalImportance]
  );
  const pointsForStorage = useMemo(() => {
    if (!event) return null;
    if (event.endAt) {
      const duration = Math.max(0, (event.endAt - event.startAt) / 60000);
      const value = computeXp({
        importance,
        difficulty,
        durationMinutes: duration,
        goal,
        goalImportance,
        fallbackGoalImportance: importance,
      });
      return Number(value.toFixed(3));
    }
    if (!isActive && estimateMinutesValue != null) {
      const value = computeXp({
        importance,
        difficulty,
        durationMinutes: estimateMinutesValue,
        goal,
        goalImportance,
        fallbackGoalImportance: importance,
      });
      return Number(value.toFixed(3));
    }
    return null;
  }, [event, importance, difficulty, estimateMinutesValue, goal, goalImportance, isActive]);

  useEffect(() => {
    if (!eventId) return;
    const id = setTimeout(() => {
      const safeTitle = title.trim() || event?.title || 'Untitled';
      const patch: Partial<MobileEvent> = {
        title: safeTitle,
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
        frontmatter: (() => {
          let fm: Record<string, unknown> = {};
          if (event?.frontmatter) {
            try {
              fm = JSON.parse(event.frontmatter);
            } catch {
              fm = {};
            }
          }
          return JSON.stringify({
            ...fm,
            places: uniqStrings(places),
          });
        })(),
      };
      if (pointsForStorage != null) {
        patch.points = pointsForStorage;
      }
      void updateEvent(eventId, patch);
    }, 300);
    return () => clearTimeout(id);
  }, [
    eventId,
    importance,
    difficulty,
    tags,
    contexts,
    people,
    title,
    locationValue,
    skills,
    character,
    goal,
    project,
    category,
    subcategory,
    estimateMinutesValue,
    places,
    pointsForStorage,
    event?.frontmatter,
    event?.title,
  ]);

  const conflict = useMemo(() => {
    if (!event?.frontmatter) return null;
    try {
      const fm = JSON.parse(event.frontmatter) as Record<string, unknown>;
      return (fm.conflict ?? fm.externalConflict) as unknown;
    } catch {
      return null;
    }
  }, [event?.frontmatter]);

  const trackerPresets = useMemo(
    () => [
      { key: 'mood', label: 'Mood' },
      { key: 'energy', label: 'Energy' },
      { key: 'stress', label: 'Stress' },
      { key: 'pain', label: 'Pain' },
    ],
    []
  );
  const trackerScale = useMemo(() => Array.from({ length: 10 }, (_, idx) => idx + 1), []);

  const startEditingTracker = (log: TrackerLogEntry) => {
    setEditingTrackerId(log.id);
    setEditingTrackerValue(trackerValueForEdit(log));
  };

  const cancelEditingTracker = () => {
    setEditingTrackerId(null);
    setEditingTrackerValue('');
  };

  const saveEditingTracker = async (log: TrackerLogEntry) => {
    const trimmed = editingTrackerValue.trim();
    if (!trimmed) return;
    const nextValue = parseTrackerValueInput(trimmed);
    await updateTrackerLog(log.id, {
      value: nextValue,
      rawToken: `#${log.trackerKey}(${trimmed})`,
    });
    const rows = await fetchTrackerLogs();
    setTrackerLogs(rows);
    cancelEditingTracker();
  };

  const confirmDeleteTracker = (log: TrackerLogEntry) => {
    Alert.alert('Delete tracker log?', `${log.trackerLabel} ${formatTrackerValue(log)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTrackerLog(log.id);
          const rows = await fetchTrackerLogs();
          setTrackerLogs(rows);
          if (editingTrackerId === log.id) cancelEditingTracker();
        },
      },
    ]);
  };

  const logCustomTracker = async () => {
    if (!eventId) return;
    const key = trackerKeyDraft.trim().replace(/^#/, '');
    const value = trackerValueDraft.trim();
    if (!key || !value) return;
    await createTrackerLog({
      trackerKey: key,
      value,
      occurredAt: Date.now(),
      entryId: eventId,
      rawToken: `#${key}(${value})`,
    });
    setTrackerKeyDraft('');
    setTrackerValueDraft('');
    const rows = await fetchTrackerLogs();
    setTrackerLogs(rows);
  };

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

  const addPlacesFromDraft = () => {
    const next = parseCommaList(placeDraft).map((entry) => entry.replace(/^!/, ''));
    if (!next.length) return;
    setPlaces((prev) => uniqStrings([...prev, ...next]));
    setPlaceDraft('');
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

  const resolveConflict = async (resolution: 'app' | 'external') => {
    if (!eventId || !event) return;
    let fm: Record<string, unknown> = {};
    if (event.frontmatter) {
      try {
        fm = JSON.parse(event.frontmatter);
      } catch {
        fm = {};
      }
    }
    const nextFrontmatter = {
      ...fm,
      conflict: null,
      externalConflict: null,
      conflictResolution: resolution,
      conflictResolvedAt: new Date().toISOString(),
    };
    const serialized = JSON.stringify(nextFrontmatter);
    setEvent((prev) => (prev ? { ...prev, frontmatter: serialized } : prev));
    await updateEvent(eventId, { frontmatter: serialized });
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
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Event not found.</Text>
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
        <Pressable
          style={[styles.appendButton, { backgroundColor: palette.tint }]}
          onPress={() => router.push(`/voice?eventId=${eventId}`)}>
          <InsightIcon name="plus" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}>
          <Text style={[styles.activityTitle, { color: palette.text }]}>{activityTitle}</Text>
          <Text style={[styles.meta, { color: palette.textSecondary }]}>
            {formatClock(elapsedMs)} elapsed
            {remainingMs != null ? ` - ${formatClock(remainingMs)} left` : ''}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(217,93,57,0.1)' : 'rgba(217,93,57,0.05)' }]}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: palette.tint }]} />
          </View>
          <RollingNumber value={formatXp(pointsRaw)} prefix="+" suffix=" XP" textStyle={[styles.points, { color: palette.tint }]} />

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

        {conflict ? (
          <View
            style={[
              styles.conflictCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}>
            <Text style={[styles.conflictLabel, { color: palette.textSecondary }]}>Calendar conflict</Text>
            <Text style={[styles.conflictTitle, { color: palette.text }]}>
              {typeof conflict === 'string' ? conflict : 'External update detected.'}
            </Text>
            <View style={styles.conflictActions}>
              <TouchableOpacity
                style={[styles.conflictButton, { borderColor: palette.tint }]}
                onPress={() => void resolveConflict('app')}>
                <Text style={[styles.conflictButtonText, { color: palette.tint }]}>Keep app</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.conflictButton, { backgroundColor: palette.tint }]}
                onPress={() => void resolveConflict('external')}>
                <Text style={styles.conflictButtonTextLight}>Keep external</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Notes</Text>
            <View style={styles.noteHeaderActions}>
              <Pressable
                style={styles.sendButton}
                onPress={() => {
                  if (!eventId) return;
                  router.push(`/voice?eventId=${eventId}`);
                }}>
                <InsightIcon name="plus" size={16} color={palette.tint} />
              </Pressable>
              <Pressable style={styles.sendButton} onPress={() => void shareNotes()}>
                <FontAwesome name="paper-plane" size={14} color={palette.tint} />
              </Pressable>
            </View>
          </View>
          <View style={styles.noteModeRow}>
            <View style={styles.modeRow}>
              {[
                { key: 'raw', label: 'Raw' },
                { key: 'transcript', label: 'Transcript' },
                { key: 'outline', label: 'Outline' },
              ].map((option) => {
                const activeOption = noteMode === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setNoteMode(option.key as 'raw' | 'transcript' | 'outline')}
                    style={[
                      styles.modePill,
                      activeOption && styles.modePillActive,
                      {
                        borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
                      },
                    ]}>
                    <Text style={[styles.modeText, activeOption && styles.modeTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.noteActions}>
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
          {noteMode === 'raw' ? (
          <TextInput
            style={[
              styles.notesInput,
              {
                color: palette.text,
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder="- **09:20** - Draft outline"
            placeholderTextColor={palette.textSecondary}
          />
          ) : (
            <View
              style={[
                styles.notesPreviewCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}>
              <Text style={[styles.notesPreviewText, { color: palette.text }]}>
                {noteMode === 'transcript'
                  ? normalizedNotes || 'Transcript will appear here.'
                  : outlineNotes || 'Outline will appear here.'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Details</Text>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>Tags</Text>
              <View style={styles.chipRow}>
                {tags.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => setTags((prev) => prev.filter((entry) => entry !== tag))}
                    style={[styles.chip, { backgroundColor: isDark ? 'rgba(217,93,57,0.15)' : 'rgba(217,93,57,0.08)' }]}>
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
                  placeholderTextColor={palette.textSecondary}
                  style={[styles.chipInput, { color: palette.text }]}
                />
              </View>
            </View>
            <View style={styles.gridItem}>
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
                  placeholderTextColor={palette.textSecondary}
                  style={[styles.chipInput, { color: palette.text }]}
                />
              </View>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>People</Text>
              <View style={styles.chipRow}>
                {people.map((person) => (
                  <Pressable
                    key={person}
                    onPress={() => setPeople((prev) => prev.filter((entry) => entry !== person))}
                    style={[styles.chip, { backgroundColor: isDark ? 'rgba(217,93,57,0.15)' : 'rgba(217,93,57,0.08)' }]}>
                    <Text style={[styles.chipText, { color: palette.tint }]}>@{person}</Text>
                    <Text style={[styles.chipRemove, { color: palette.tint }]}>×</Text>
                  </Pressable>
                ))}
                <TextInput
                  value={peopleDraft}
                  onChangeText={setPeopleDraft}
                  onSubmitEditing={addPeopleFromDraft}
                  onBlur={addPeopleFromDraft}
                  placeholder="Mom, Dr. Smith"
                  placeholderTextColor={palette.textSecondary}
                  style={[styles.chipInput, { color: palette.text }]}
                />
              </View>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>Places</Text>
              <View style={styles.chipRow}>
                {places.map((place) => (
                  <Pressable
                    key={place}
                    onPress={() => setPlaces((prev) => prev.filter((entry) => entry !== place))}
                    style={[styles.chip, { backgroundColor: isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.1)' }]}>
                    <Text style={[styles.chipText, { color: palette.text }]}>!{place}</Text>
                    <Text style={[styles.chipRemove, { color: palette.text }]}>×</Text>
                  </Pressable>
                ))}
                <TextInput
                  value={placeDraft}
                  onChangeText={setPlaceDraft}
                  onSubmitEditing={addPlacesFromDraft}
                  onBlur={addPlacesFromDraft}
                  placeholder="!home, !office"
                  placeholderTextColor={palette.textSecondary}
                  style={[styles.chipInput, { color: palette.text }]}
                />
              </View>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>Skills</Text>
              <View style={styles.chipRow}>
                {skills.map((skill) => (
                  <Pressable
                    key={skill}
                    onPress={() => setSkills((prev) => prev.filter((entry) => entry !== skill))}
                    style={[styles.chip, { backgroundColor: isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.1)' }]}>
                    <Text style={[styles.chipText, { color: palette.text }]}>{skill}</Text>
                    <Text style={[styles.chipRemove, { color: palette.text }]}>×</Text>
                  </Pressable>
                ))}
                <TextInput
                  value={skillsDraft}
                  onChangeText={setSkillsDraft}
                  onSubmitEditing={addSkillsFromDraft}
                  onBlur={addSkillsFromDraft}
                  placeholder="communication, lifting"
                  placeholderTextColor={palette.textSecondary}
                  style={[styles.chipInput, { color: palette.text }]}
                />
              </View>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>Character</Text>
              <View style={styles.chipRow}>
                {CHARACTER_KEYS.map((key) => {
                  const isActiveChip = character.includes(key);
                  return (
                    <Pressable
                      key={key}
                      onPress={() => toggleCharacter(key)}
                      style={[
                        styles.chip,
                        { backgroundColor: isActiveChip ? 'rgba(217,93,57,0.2)' : 'rgba(217,93,57,0.08)' },
                      ]}>
                      <Text style={[styles.chipText, { color: palette.tint }]}>{key}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>Goal</Text>
              <TextInput
                value={goal}
                onChangeText={setGoal}
                placeholder="get shredded"
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.pillInput,
                  {
                    color: palette.text,
                    backgroundColor: isDark ? 'rgba(217,93,57,0.2)' : 'rgba(217,93,57,0.12)',
                    borderColor: 'rgba(217,93,57,0.35)',
                  },
                ]}
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>Project</Text>
              <TextInput
                value={project}
                onChangeText={setProject}
                placeholder="workout plan"
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.pillInput,
                  {
                    color: palette.text,
                    backgroundColor: isDark ? 'rgba(217,93,57,0.2)' : 'rgba(217,93,57,0.12)',
                    borderColor: 'rgba(217,93,57,0.35)',
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: palette.text }]}>Locations</Text>
            <View style={styles.chipRow}>
              {locations.map((loc) => (
                <Pressable
                  key={loc}
                  onPress={() => setLocations((prev) => prev.filter((entry) => entry !== loc))}
                  style={[styles.chip, { backgroundColor: isDark ? 'rgba(217,93,57,0.15)' : 'rgba(217,93,57,0.08)' }]}>
                  <Text style={[styles.chipText, { color: palette.tint }]}>{loc}</Text>
                  <Text style={[styles.chipRemove, { color: palette.tint }]}>×</Text>
                </Pressable>
              ))}
              <TextInput
                value={locationDraft}
                onChangeText={setLocationDraft}
                onSubmitEditing={addLocationsFromDraft}
                onBlur={addLocationsFromDraft}
                placeholder="Home"
                placeholderTextColor={palette.textSecondary}
                style={[styles.chipInput, { color: palette.text }]}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: palette.text }]}>Estimate (min)</Text>
            <TextInput
              value={estimateMinutes}
              onChangeText={setEstimateMinutes}
              keyboardType="number-pad"
              placeholder="45"
              placeholderTextColor={palette.textSecondary}
              style={[
                styles.smallInput,
                {
                  color: palette.text,
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            />
          </View>

          <View style={styles.scaleGroup}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Importance</Text>
            <View style={styles.scaleRow}>
              {Array.from({ length: 10 }, (_, idx) => idx + 1).map((level) => (
                <TouchableOpacity
                  key={`imp_${level}`}
                  activeOpacity={0.7}
                  style={[
                    styles.scalePill,
                    { 
                      backgroundColor: level <= importance ? palette.tint : (palette.surface),
                      borderColor: level <= importance ? palette.tint : (palette.border)
                    }
                  ]}
                  onPress={() => setImportance(level)}>
                  <Text style={[styles.scaleText, { color: level <= importance ? '#FFFFFF' : palette.text }]}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: palette.textSecondary, marginTop: 12 }]}>Difficulty</Text>
            <View style={styles.scaleRow}>
              {Array.from({ length: 10 }, (_, idx) => idx + 1).map((level) => (
                <TouchableOpacity
                  key={`dif_${level}`}
                  activeOpacity={0.7}
                  style={[
                    styles.scalePill,
                    { 
                      backgroundColor: level <= difficulty ? palette.tint : (palette.surface),
                      borderColor: level <= difficulty ? palette.tint : (palette.border)
                    }
                  ]}
                  onPress={() => setDifficulty(level)}>
                  <Text style={[styles.scaleText, { color: level <= difficulty ? '#FFFFFF' : palette.text }]}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View
          style={styles.section}
          onLayout={(event) => setCategoriesOffset(event.nativeEvent.layout.y)}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Categories</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: palette.text }]}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Driving home"
              placeholderTextColor={palette.textSecondary}
              style={[
                styles.pillInput,
                {
                  color: palette.text,
                  backgroundColor: isDark ? 'rgba(217,93,57,0.2)' : 'rgba(217,93,57,0.12)',
                  borderColor: 'rgba(217,93,57,0.35)',
                },
              ]}
            />
          </View>
          <View style={styles.chipRow}>
            {CATEGORY_SHORTCUTS.map((shortcut) => {
              const isActiveChip = shortcut.toLowerCase() === category.trim().toLowerCase();
              return (
                <Pressable
                  key={shortcut}
                  onPress={() => setCategory(shortcut)}
                  style={[
                    styles.chip,
                    { backgroundColor: isActiveChip ? 'rgba(217,93,57,0.2)' : 'rgba(217,93,57,0.08)' },
                  ]}>
                  <Text style={[styles.chipText, { color: palette.tint }]}>{shortcut}</Text>
                </Pressable>
              );
            })}
          </View>
          {subcategoryOptions.length ? (
            <View style={styles.chipRow}>
              {subcategoryOptions.map((shortcut) => {
                const isActiveChip = shortcut.toLowerCase() === subcategory.trim().toLowerCase();
                return (
                  <Pressable
                    key={shortcut}
                    onPress={() => setSubcategory(shortcut)}
                    style={[
                      styles.chip,
                      { backgroundColor: isActiveChip ? 'rgba(217,93,57,0.2)' : 'rgba(217,93,57,0.08)' },
                    ]}>
                    <Text style={[styles.chipText, { color: palette.tint }]}>{shortcut}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Subtasks</Text>
          </View>
          <View style={styles.subtaskRow}>
            <TextInput
              value={subtaskDraft}
              onChangeText={setSubtaskDraft}
              placeholder="Add a subtask (e.g. Call prior auth 20m)"
              placeholderTextColor={palette.textSecondary}
              style={[
                styles.subtaskInput,
                {
                  color: palette.text,
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
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
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
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
                      <Text style={[styles.subtaskEstimate, { color: palette.textSecondary }]}>
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
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No subtasks yet.</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Trackers</Text>
            <TouchableOpacity
              onPress={() => {
                if (eventId) router.push(`/trackers?entryId=${eventId}`);
              }}>
              <Text style={[styles.sectionAction, { color: palette.tint }]}>View all</Text>
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.trackerCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}>
            <Text style={[styles.trackerHint, { color: palette.textSecondary }]}>Quick add</Text>
            <View style={styles.trackerChipRow}>
              {trackerPresets.map((preset) => {
                const isActiveChip = activeTrackerKey === preset.key;
                return (
                  <Pressable
                    key={preset.key}
                    onPress={() => setActiveTrackerKey((prev) => (prev === preset.key ? null : preset.key))}
                    style={[
                      styles.trackerChip,
                      {
                        backgroundColor: isActiveChip
                          ? 'rgba(217,93,57,0.2)'
                          : isDark
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(0,0,0,0.03)',
                        borderColor: isActiveChip ? palette.tint : 'transparent',
                      },
                    ]}>
                    <Text style={[styles.trackerChipText, { color: isActiveChip ? palette.tint : palette.text }]}>
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.trackerHint, { color: palette.textSecondary }]}>Tap a log to edit, hold to delete.</Text>
            <View style={styles.trackerCustomRow}>
              <TextInput
                value={trackerKeyDraft}
                onChangeText={setTrackerKeyDraft}
                placeholder="tracker"
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.trackerCustomInput,
                  {
                    color: palette.text,
                    backgroundColor: isDark ? '#0f1320' : '#FFFFFF',
                    borderColor: palette.border,
                  },
                ]}
              />
              <TextInput
                value={trackerValueDraft}
                onChangeText={setTrackerValueDraft}
                placeholder="value"
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.trackerCustomInput,
                  {
                    color: palette.text,
                    backgroundColor: isDark ? '#0f1320' : '#FFFFFF',
                    borderColor: palette.border,
                  },
                ]}
                onSubmitEditing={() => void logCustomTracker()}
              />
              <TouchableOpacity style={[styles.trackerCustomButton, { backgroundColor: palette.tint }]} onPress={() => void logCustomTracker()}>
                <Text style={styles.trackerCustomButtonText}>Log</Text>
              </TouchableOpacity>
            </View>
            {activeTrackerKey ? (
              <View style={styles.trackerValueRow}>
                {trackerScale.map((value) => (
                  <TouchableOpacity
                    key={`${activeTrackerKey}_${value}`}
                    activeOpacity={0.7}
                    style={[
                      styles.trackerValuePill,
                      {
                        backgroundColor: palette.tint,
                      },
                    ]}
                    onPress={async () => {
                      if (!eventId) return;
                      await createTrackerLog({
                        trackerKey: activeTrackerKey,
                        value,
                        occurredAt: Date.now(),
                        entryId: eventId,
                        rawToken: `#${activeTrackerKey}(${value})`,
                      });
                      const rows = await fetchTrackerLogs();
                      setTrackerLogs(rows);
                      setActiveTrackerKey(null);
                    }}>
                    <Text style={styles.trackerValueText}>{value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {trackerLogs.length ? (
              <View style={styles.trackerLogList}>
                {trackerLogs.slice(0, 6).map((log) => (
                  <View key={log.id} style={styles.trackerLogItem}>
                    <Pressable
                      style={styles.trackerLogRow}
                      onPress={() => startEditingTracker(log)}
                      onLongPress={() => confirmDeleteTracker(log)}>
                      <View>
                        <Text style={[styles.trackerLogLabel, { color: palette.text }]}>{log.trackerLabel}</Text>
                        <Text style={[styles.trackerLogMeta, { color: palette.textSecondary }]}>
                          {formatTime(log.occurredAt)}
                        </Text>
                      </View>
                      <View style={[styles.trackerLogValuePill, { borderColor: palette.tint }]}>
                        <Text style={[styles.trackerLogValue, { color: palette.tint }]}>
                          {formatTrackerValue(log)}
                        </Text>
                      </View>
                    </Pressable>
                    {editingTrackerId === log.id ? (
                      <View style={styles.trackerEditRow}>
                        <TextInput
                          value={editingTrackerValue}
                          onChangeText={setEditingTrackerValue}
                          placeholder="New value"
                          placeholderTextColor={palette.textSecondary}
                          style={[
                            styles.trackerEditInput,
                            {
                              color: palette.text,
                              backgroundColor: isDark ? '#0f1320' : '#FFFFFF',
                              borderColor: palette.border,
                            },
                          ]}
                        />
                        <TouchableOpacity
                          style={[styles.trackerEditButton, { backgroundColor: palette.tint }]}
                          onPress={() => void saveEditingTracker(log)}>
                          <Text style={styles.trackerEditButtonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.trackerEditButton, styles.trackerEditButtonGhost]}
                          onPress={cancelEditingTracker}>
                          <Text style={[styles.trackerEditButtonText, { color: palette.text }]}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.trackerEmpty, { color: palette.textSecondary }]}>
                No tracker logs for this event yet.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

    </View>
  );
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function trackerValueForEdit(log: TrackerLogEntry) {
  if (log.valueBool != null) return log.valueBool ? 'true' : 'false';
  if (log.valueNumber != null && Number.isFinite(log.valueNumber)) return String(log.valueNumber);
  if (log.valueText != null && log.valueText !== '') return log.valueText;
  return '';
}

function parseTrackerValueInput(raw: string): number | string | boolean {
  const trimmed = raw.trim();
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
  const num = Number(trimmed);
  if (Number.isFinite(num) && trimmed !== '') return num;
  return trimmed;
}

function formatTrackerValue(log: TrackerLogEntry) {
  if (log.valueBool != null) return log.valueBool ? 'Yes' : 'No';
  if (log.valueNumber != null && Number.isFinite(log.valueNumber)) {
    return Number.isInteger(log.valueNumber) ? `${log.valueNumber}` : log.valueNumber.toFixed(1);
  }
  if (log.valueText != null && log.valueText !== '') return log.valueText;
  return '-';
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
  appendButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: 120,
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
  activityTitle: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.4,
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
  conflictCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  conflictLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  conflictTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  conflictActions: {
    flexDirection: 'row',
    gap: 10,
  },
  conflictButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conflictButtonText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  conflictButtonTextLight: {
    fontSize: 12,
    fontWeight: '700',
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
    alignItems: 'center',
  },
  noteModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modePill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  modePillActive: {
    backgroundColor: 'rgba(217,93,57,0.16)',
    borderColor: 'rgba(217,93,57,0.35)',
  },
  modeText: {
    fontWeight: '700',
    opacity: 0.7,
  },
  modeTextActive: {
    color: '#D95D39',
    opacity: 1,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217,93,57,0.12)',
  },
  noteHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '700',
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
    minHeight: 240,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Figtree',
    textAlignVertical: 'top',
  },
  notesPreviewCard: {
    minHeight: 240,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  notesPreviewText: {
    fontSize: 15,
    lineHeight: 20,
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
    alignItems: 'flex-start',
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
  pillInput: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Figtree',
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
  trackerCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  trackerHint: {
    fontSize: 12,
    fontWeight: '700',
  },
  trackerChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trackerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  trackerChipText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  trackerCustomRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  trackerCustomInput: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontFamily: 'Figtree',
  },
  trackerCustomButton: {
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerCustomButtonText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
  trackerValueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trackerValuePill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerValueText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  trackerLogList: {
    gap: 10,
  },
  trackerLogItem: {
    gap: 8,
  },
  trackerLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackerEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackerEditInput: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontFamily: 'Figtree',
  },
  trackerEditButton: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerEditButtonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  trackerEditButtonText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
  trackerLogLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  trackerLogMeta: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  trackerLogValuePill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  trackerLogValue: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  trackerEmpty: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
});
