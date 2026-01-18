import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { Screen } from '@/components/Screen';
import { LuxCard } from '@/components/LuxCard';
import { useTheme } from '@/src/state/theme';
import { updateLiveActivity } from '@/src/native/liveActivity';
import { getEvent, updateEvent, listEvents, type MobileEvent } from '@/src/storage/events';
import { createTrackerLog, deleteTrackerLog, listTrackerLogs, updateTrackerLog, type TrackerLogEntry } from '@/src/storage/trackers';
import { useSession } from '@/src/state/session';
import {
  CHARACTER_KEYS,
  CATEGORY_SHORTCUTS,
  SUBCATEGORY_SHORTCUTS,
  parseCommaList,
  parseTagList,
  uniqStrings,
} from '@/src/utils/frontmatter';
import { formatSegmentsPreview, parseCapture } from '@/src/lib/schema';
import { computeXp, formatXp } from '@/src/utils/points';
import { RollingNumber } from '@/src/components/RollingNumber';

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatTimeMarker(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `[${hh}:${mm}] `;
}

function normalizeCaptureText(rawText: string) {
  return rawText
    .split('\n')
    .map((line) => line.replace(/^- \*\*(\d{1,2}:\d{2})\*\* -\s*/, '[$1] '))
    .join('\n')
    .trim();
}

export default function FocusScreen() {
  const { active, stopSession, updateNotes, updateMetrics } = useSession();
  const { palette, sizes, isDark } = useTheme();
  const [now, setNow] = useState(Date.now());
  const [event, setEvent] = useState<MobileEvent | null>(null);
  const [notes, setNotes] = useState(active?.notes ?? '');
  const [noteMode, setNoteMode] = useState<'raw' | 'transcript' | 'outline'>('raw');
  const [importance, setImportance] = useState(active?.importance ?? 5);
  const [difficulty, setDifficulty] = useState(active?.difficulty ?? 5);
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
  const [subEvents, setSubEvents] = useState<MobileEvent[]>([]);
  const [trackerLogs, setTrackerLogs] = useState<TrackerLogEntry[]>([]);
  const [activeTrackerKey, setActiveTrackerKey] = useState<string | null>(null);
  const [trackerKeyDraft, setTrackerKeyDraft] = useState('');
  const [trackerValueDraft, setTrackerValueDraft] = useState('');
  const [editingTrackerId, setEditingTrackerId] = useState<string | null>(null);
  const [editingTrackerValue, setEditingTrackerValue] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // Fetch sub-events for the current session
  useEffect(() => {
    if (!active?.id) {
      setSubEvents([]);
      return;
    }
    let mounted = true;
    const fetchSubEvents = async () => {
      const allEvents = await listEvents();
      const children = allEvents.filter((e) => e.parentEventId === active.id);
      if (mounted) setSubEvents(children);
    };
    fetchSubEvents();
    const interval = setInterval(fetchSubEvents, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [active?.id]);

  const fetchTrackerLogs = useCallback(async () => {
    if (!active?.id) return [] as TrackerLogEntry[];
    return listTrackerLogs({ entryId: active.id, limit: 200 });
  }, [active?.id]);

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
    setNotes(active?.notes ?? '');
  }, [active?.notes, active?.id]);

  const normalizedNotes = useMemo(() => (notes.trim() ? normalizeCaptureText(notes) : ''), [notes]);
  const outlineNotes = useMemo(() => {
    if (!normalizedNotes) return '';
    const parsed = parseCapture(normalizedNotes);
    return parsed.segments.length ? formatSegmentsPreview(parsed.segments) : normalizedNotes;
  }, [normalizedNotes]);

  useEffect(() => {
    setImportance(active?.importance ?? 5);
    setDifficulty(active?.difficulty ?? 5);
  }, [active?.id, active?.importance, active?.difficulty]);

  useEffect(() => {
    updateNotes(notes);
  }, [notes, updateNotes]);

  useEffect(() => {
    if (!active?.id) return;
    updateMetrics({ importance, difficulty });
  }, [active?.id, importance, difficulty, updateMetrics]);

  useEffect(() => {
    if (!active?.id) return;
    let mounted = true;
    getEvent(active.id).then((event) => {
      if (!mounted || !event) return;
      setEvent(event);
      setNotes(event.notes ?? '');
      setTags(Array.isArray(event.tags) ? event.tags : []);
      setContexts(Array.isArray(event.contexts) ? event.contexts : []);
      setPeople(Array.isArray(event.people) ? event.people : []);
      let frontmatter: Record<string, unknown> = {};
      if (event.frontmatter) {
        try {
          frontmatter = JSON.parse(event.frontmatter);
        } catch {
          frontmatter = {};
        }
      }
      setPlaces(Array.isArray(frontmatter.places) ? (frontmatter.places as string[]) : []);
      setLocations(event.location ? parseCommaList(event.location) : []);
      setSkills(Array.isArray(event.skills) ? event.skills : []);
      setCharacter(Array.isArray(event.character) ? event.character : []);
      setGoal(event.goal ?? '');
      setProject(event.project ?? '');
      setCategory(event.category ?? '');
      setSubcategory(event.subcategory ?? '');
      setEstimateMinutes(event.estimateMinutes != null ? String(event.estimateMinutes) : '');
      setImportance(event.importance ?? 5);
      setDifficulty(event.difficulty ?? 5);
    });
    return () => {
      mounted = false;
    };
  }, [active?.id]);

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
    if (!active?.id) return;
    const id = setTimeout(() => {
      const duration = estimateMinutesValue ?? Math.max(0, elapsedMs / 60000);
      const pointsValue = Number(
        computeXp({
          importance,
          difficulty,
          durationMinutes: duration,
          goal,
          project,
          fallbackGoalImportance: importance,
        }).toFixed(3)
      );
      void updateEvent(active.id, {
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
        importance,
        difficulty,
        points: pointsValue,
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
      });
    }, 400);
    return () => clearTimeout(id);
  }, [
    active?.id,
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
    importance,
    difficulty,
    places,
    event?.frontmatter,
  ]);

  const elapsedMs = active ? now - active.startedAt : 0;
  const totalMs =
    estimateMinutesValue != null
      ? estimateMinutesValue * 60 * 1000
      : active?.estimatedMinutes
        ? active.estimatedMinutes * 60 * 1000
        : null;
  const remainingMs = totalMs != null ? Math.max(0, totalMs - elapsedMs) : null;
  const progress = totalMs ? Math.min(1, elapsedMs / totalMs) : 0;
  const remainingSeconds = remainingMs != null ? Math.max(0, Math.round(remainingMs / 1000)) : null;
  const remainingBucket = remainingSeconds != null ? Math.floor(remainingSeconds / 30) : null;

  const title = active?.title ?? 'No active focus';
  const durationMinutes = Math.max(0, elapsedMs / 60000);
  const pointsRaw = useMemo(
    () =>
      computeXp({
        importance,
        difficulty,
        durationMinutes,
        goal,
        project,
        fallbackGoalImportance: importance,
      }),
    [importance, difficulty, durationMinutes, goal, project]
  );
  const addTimestampLine = () => {
    const line = formatTimeMarker();
    setNotes((prev) => (prev ? `${prev}\n${line}` : line));
  };

  const addSegmentDivider = () => {
    setNotes((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return '---\n';
      return `${trimmed}\n\n---\n`;
    });
  };

  const addTagsFromDraft = () => {
    const next = parseTagList(tagDraft);
    if (!next.length) return;
    setTags((prev) => uniqStrings([...prev, ...next]));
    setTagDraft('');
  };

  const addContextsFromDraft = () => {
    const next = parseCommaList(contextDraft).map((item) => item.replace(/^\+/, ''));
    if (!next.length) return;
    setContexts((prev) => uniqStrings([...prev, ...next]));
    setContextDraft('');
  };

  const addPeopleFromDraft = () => {
    const next = parseCommaList(peopleDraft);
    if (!next.length) return;
    setPeople((prev) => uniqStrings([...prev, ...next]));
    setPeopleDraft('');
  };

  const addPlacesFromDraft = () => {
    const next = parseCommaList(placeDraft);
    if (!next.length) return;
    setPlaces((prev) => uniqStrings([...prev, ...next]));
    setPlaceDraft('');
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
    if (!active?.id) return;
    const key = trackerKeyDraft.trim();
    const trimmedValue = trackerValueDraft.trim();
    if (!key || !trimmedValue) return;
    const value = parseTrackerValueInput(trimmedValue);
    await createTrackerLog({
      trackerKey: key,
      value,
      occurredAt: Date.now(),
      entryId: active.id,
      rawToken: `#${key}(${trimmedValue})`,
    });
    setTrackerKeyDraft('');
    setTrackerValueDraft('');
    const rows = await fetchTrackerLogs();
    setTrackerLogs(rows);
  };

  useEffect(() => {
    if (!active) return;
    void updateLiveActivity({
      title: active.title,
      remainingSeconds,
      trackerKey: active.trackerKey ?? null,
    });
  }, [active?.id, remainingBucket, remainingSeconds, active?.title, active?.trackerKey]);

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: 'transparent' }]}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <FontAwesome name="chevron-left" size={18} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Focus</Text>
        <Pressable style={styles.iconButton}>
          <FontAwesome name="ellipsis-h" size={18} color={palette.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LuxCard style={styles.card} accent={palette.tint}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>
            {formatClock(elapsedMs)}
            {remainingMs != null ? ` elapsed - ${formatClock(remainingMs)} left` : ' elapsed'}
          </Text>

          <View style={[styles.progressTrack, { backgroundColor: palette.tintLight }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: palette.tint },
              ]}
            />
          </View>
          <RollingNumber
            value={formatXp(pointsRaw)}
            prefix="+"
            suffix=" XP"
            textStyle={[styles.points, { color: palette.tint }]}
          />

          <View style={styles.actions}>
            <Pressable style={[styles.actionButton, styles.secondaryButton, { borderColor: palette.borderLight }]}>
              <Text style={styles.actionText}>Pause</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.primaryButton, { backgroundColor: palette.tint }]}
              onPress={() => void stopSession()}
            >
              <Text style={[styles.actionText, styles.actionTextLight]}>End</Text>
            </Pressable>
          </View>
        </LuxCard>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <View style={styles.noteHeaderActions}>
              <Pressable style={[styles.timestampButton, { backgroundColor: palette.tintLight }]} onPress={addTimestampLine}>
                <Text style={[styles.timestampText, { color: palette.tint }]}>Add timestamp</Text>
              </Pressable>
              <Pressable style={[styles.timestampButton, { backgroundColor: palette.tintLight }]} onPress={addSegmentDivider}>
                <Text style={[styles.timestampText, { color: palette.tint }]}>Add segment</Text>
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
                      { borderColor: palette.borderLight, backgroundColor: palette.panelAlpha },
                      activeOption && { backgroundColor: palette.tintLight, borderColor: palette.tintBorder },
                    ]}>
                    <Text
                      style={[
                        styles.modeText,
                        { color: palette.textSecondary },
                        activeOption && { color: palette.tint, opacity: 1 },
                      ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {noteMode === 'raw' ? (
            <TextInput
              style={[
                styles.notesInput,
                {
                  color: palette.text,
                  borderColor: isDark ? 'rgba(148,163,184,0.24)' : 'rgba(28,28,30,0.1)',
                },
              ]}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="[09:20] Draft outline"
              placeholderTextColor={isDark ? 'rgba(148,163,184,0.6)' : 'rgba(28,28,30,0.35)'}
            />
          ) : (
            <View
              style={[
                styles.notesPreviewCard,
                {
                  backgroundColor: palette.surfaceAlt,
                  borderColor: isDark ? 'rgba(148,163,184,0.24)' : 'rgba(28,28,30,0.1)',
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

        {subEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Sub-Events ({subEvents.length})</Text>
            <View style={styles.subEventsList}>
              {subEvents.map((subEvent) => {
                const duration = subEvent.endAt
                  ? Math.round((subEvent.endAt - subEvent.startAt) / 60000)
                  : Math.round((now - subEvent.startAt) / 60000);
                const pts = subEvent.points ?? 0;
                return (
                  <View
                    key={subEvent.id}
                    style={[
                      styles.subEventCard,
                      {
                        backgroundColor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(28,28,30,0.04)',
                        borderColor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(28,28,30,0.08)',
                      },
                    ]}>
                    <View style={styles.subEventHeader}>
                      <Text style={[styles.subEventTitle, { color: palette.text }]} numberOfLines={1}>
                        {subEvent.title}
                      </Text>
                      {!subEvent.endAt && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>ACTIVE</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.subEventMeta}>
                      <Text style={[styles.subEventMetaText, { color: palette.textSecondary }]}>
                        {duration}m
                      </Text>
                      {pts > 0 && (
                        <Text style={styles.subEventPoints}>+{pts.toFixed(1)} XP</Text>
                      )}
                      {subEvent.category && (
                        <Text style={[styles.subEventMetaText, { color: palette.textSecondary }]}>
                          {subEvent.category}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.frontmatter}>
          <Text style={styles.sectionLabel}>Frontmatter</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Tags</Text>
            <View style={styles.chipRow}>
              {tags.map((tag) => (
                <Pressable key={tag} onPress={() => setTags((prev) => prev.filter((entry) => entry !== tag))} style={styles.chip}>
                  <Text style={styles.chipText}>#{tag}</Text>
                  <Text style={styles.chipRemove}>x</Text>
                </Pressable>
              ))}
              {!tags.length ? <Text style={styles.chipHint}>#tags will appear here</Text> : null}
              <TextInput
                value={tagDraft}
                onChangeText={setTagDraft}
                onSubmitEditing={addTagsFromDraft}
                onBlur={addTagsFromDraft}
                placeholder="#work #meeting"
                placeholderTextColor={isDark ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[styles.chipInput, { color: palette.text }]}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Contexts</Text>
            <View style={styles.chipRow}>
              {contexts.map((ctx) => (
                <Pressable key={ctx} onPress={() => setContexts((prev) => prev.filter((entry) => entry !== ctx))} style={styles.chip}>
                  <Text style={styles.chipText}>+{ctx}</Text>
                  <Text style={styles.chipRemove}>x</Text>
                </Pressable>
              ))}
              <TextInput
                value={contextDraft}
                onChangeText={setContextDraft}
                onSubmitEditing={addContextsFromDraft}
                onBlur={addContextsFromDraft}
                placeholder="+car, +clinic"
                placeholderTextColor={isDark ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[styles.chipInput, { color: palette.text }]}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>People</Text>
            <View style={styles.chipRow}>
              {people.map((person) => (
                <Pressable key={person} onPress={() => setPeople((prev) => prev.filter((entry) => entry !== person))} style={styles.chip}>
                  <Text style={styles.chipText}>@{person}</Text>
                  <Text style={styles.chipRemove}>x</Text>
                </Pressable>
              ))}
              <TextInput
                value={peopleDraft}
                onChangeText={setPeopleDraft}
                onSubmitEditing={addPeopleFromDraft}
                onBlur={addPeopleFromDraft}
                placeholder="Mom, Alex"
                placeholderTextColor={isDark ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[styles.chipInput, { color: palette.text }]}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Places</Text>
            <View style={styles.chipRow}>
              {places.map((place) => (
                <Pressable key={place} onPress={() => setPlaces((prev) => prev.filter((entry) => entry !== place))} style={styles.chip}>
                  <Text style={styles.chipText}>!{place}</Text>
                  <Text style={styles.chipRemove}>x</Text>
                </Pressable>
              ))}
              <TextInput
                value={placeDraft}
                onChangeText={setPlaceDraft}
                onSubmitEditing={addPlacesFromDraft}
                onBlur={addPlacesFromDraft}
                placeholder="!home, !office"
                placeholderTextColor={isDark ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[styles.chipInput, { color: palette.text }]}
              />
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Estimate (min)</Text>
              <TextInput
                value={estimateMinutes}
                onChangeText={setEstimateMinutes}
                keyboardType="number-pad"
                placeholder="45"
                placeholderTextColor={isDark ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.1)',
                  },
                ]}
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Location</Text>
              <View style={styles.chipRow}>
                {locations.map((loc) => (
                  <Pressable key={loc} onPress={() => setLocations((prev) => prev.filter((entry) => entry !== loc))} style={styles.chip}>
                    <Text style={styles.chipText}>{loc}</Text>
                    <Text style={styles.chipRemove}>x</Text>
                  </Pressable>
                ))}
                <TextInput
                  value={locationDraft}
                  onChangeText={setLocationDraft}
                  onSubmitEditing={addLocationsFromDraft}
                  onBlur={addLocationsFromDraft}
                  placeholder="Home"
                  placeholderTextColor={isDark ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                  style={[styles.chipInput, { color: palette.text }]}
                />
              </View>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Skills</Text>
            <View style={styles.chipRow}>
              {skills.map((skill) => (
                <Pressable key={skill} onPress={() => setSkills((prev) => prev.filter((entry) => entry !== skill))} style={styles.chip}>
                  <Text style={styles.chipText}>{skill}</Text>
                  <Text style={styles.chipRemove}>x</Text>
                </Pressable>
              ))}
              <TextInput
                value={skillsDraft}
                onChangeText={setSkillsDraft}
                onSubmitEditing={addSkillsFromDraft}
                onBlur={addSkillsFromDraft}
                placeholder="communication, lifting"
                placeholderTextColor={isDark ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[styles.chipInput, { color: palette.text }]}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Character</Text>
            <View style={styles.chipRow}>
              {CHARACTER_KEYS.map((key) => {
                const activeChip = character.includes(key);
                return (
                  <Pressable key={key} onPress={() => toggleCharacter(key)} style={[styles.chip, activeChip && styles.chipActive]}>
                    <Text style={[styles.chipText, activeChip && styles.chipTextActive]}>{key}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Goal</Text>
              <TextInput
                value={goal}
                onChangeText={setGoal}
                placeholder="get shredded"
                placeholderTextColor={isDark ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.1)',
                  },
                ]}
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Project</Text>
              <TextInput
                value={project}
                onChangeText={setProject}
                placeholder="workout plan"
                placeholderTextColor={isDark ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.1)',
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Category</Text>
              <TextInput
                value={category}
                onChangeText={setCategory}
                placeholder="Work / Health / Study"
                placeholderTextColor={isDark ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.1)',
                  },
                ]}
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Subcategory</Text>
              <TextInput
                value={subcategory}
                onChangeText={setSubcategory}
                placeholder="Clinic / Surgery / Gym"
                placeholderTextColor={isDark ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.1)',
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Category shortcuts</Text>
            <View style={styles.chipRow}>
              {CATEGORY_SHORTCUTS.map((shortcut) => {
                const activeChip = shortcut.toLowerCase() === category.trim().toLowerCase();
                return (
                  <Pressable key={shortcut} onPress={() => setCategory(shortcut)} style={[styles.chip, activeChip && styles.chipActive]}>
                    <Text style={[styles.chipText, activeChip && styles.chipTextActive]}>{shortcut}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {subcategoryOptions.length ? (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Subcategory shortcuts</Text>
              <View style={styles.chipRow}>
                {subcategoryOptions.map((shortcut) => {
                  const activeChip = shortcut.toLowerCase() === subcategory.trim().toLowerCase();
                  return (
                    <Pressable key={shortcut} onPress={() => setSubcategory(shortcut)} style={[styles.chip, activeChip && styles.chipActive]}>
                      <Text style={[styles.chipText, activeChip && styles.chipTextActive]}>{shortcut}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.scaleGroup}>
          <Text style={styles.sectionLabel}>Importance</Text>
          <View style={styles.scaleRow}>
            {Array.from({ length: 10 }, (_, idx) => idx + 1).map((level) => (
              <Pressable
                key={`imp_${level}`}
                style={[styles.scalePill, level <= importance && styles.scalePillActive]}
                onPress={() => setImportance(level)}>
                <Text style={[styles.scaleText, level <= importance && styles.scaleTextActive]}>{level}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.sectionLabel}>Difficulty / Energy</Text>
          <View style={styles.scaleRow}>
            {Array.from({ length: 10 }, (_, idx) => idx + 1).map((level) => (
              <Pressable
                key={`dif_${level}`}
                style={[styles.scalePill, level <= difficulty && styles.scalePillActive]}
                onPress={() => setDifficulty(level)}>
                <Text style={[styles.scaleText, level <= difficulty && styles.scaleTextActive]}>{level}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Trackers</Text>
            <TouchableOpacity
              onPress={() => {
                if (active?.id) router.push(`/trackers?entryId=${active.id}`);
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
                      if (!active?.id) return;
                      await createTrackerLog({
                        trackerKey: activeTrackerKey,
                        value,
                        occurredAt: Date.now(),
                        entryId: active.id,
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
                No tracker logs for this session yet.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
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
    padding: 14,
    gap: 13,
  },
  scroll: {
    gap: 11,
    paddingBottom: 17,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    padding: 11,
    gap: 7,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  meta: {
    opacity: 0.7,
  },
  progressTrack: {
    height: 12,
    borderRadius: 699,
    overflow: 'hidden',
  },
  progressFill: {
    height: 12,
    borderRadius: 699,
  },
  points: {
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 7,
  },
  actionButton: {
    flex: 1,
    height: 31,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: 'transparent',
  },
  secondaryButton: {
    borderWidth: 1,
  },
  actionText: {
    fontWeight: '700',
  },
  actionTextLight: {
    color: '#FFFFFF',
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionAction: {
    fontSize: 8,
    fontWeight: '700',
  },
  noteHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  modePill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 699,
    borderWidth: 1,
  },
  modePillActive: {
  },
  modeText: {
    fontWeight: '700',
    opacity: 0.7,
  },
  modeTextActive: {
    opacity: 1,
  },
  timestampButton: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 699,
  },
  timestampText: {
    fontSize: 8,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 8,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    opacity: 0.7,
    fontWeight: '700',
  },
  frontmatter: {
    gap: 10,
  },
  fieldRow: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 8,
    fontWeight: '700',
    opacity: 0.7,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 699,
    backgroundColor: 'rgba(217,93,57,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipActive: {
    backgroundColor: 'rgba(217,93,57,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(217,93,57,0.4)',
  },
  chipText: {
    fontWeight: '600',
    color: '#D95D39',
  },
  chipTextActive: {
    color: '#D95D39',
    fontWeight: '700',
  },
  chipRemove: {
    fontSize: 8,
    opacity: 0.7,
  },
  chipHint: {
    opacity: 0.6,
  },
  chipInput: {
    minWidth: 84,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  gridItem: {
    flex: 1,
    gap: 6,
  },
  smallInput: {
    minHeight: 28,
    borderRadius: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pointsCard: {
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.08)',
    gap: 4,
  },
  pointsValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  pointsMeta: {
    fontSize: 8,
    opacity: 0.6,
  },
  scaleGroup: {
    gap: 6,
  },
  scaleRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  scalePill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.08)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  scalePillActive: {
    borderColor: 'rgba(217,93,57,0.4)',
    backgroundColor: 'rgba(217,93,57,0.18)',
  },
  scaleText: {
    fontWeight: '700',
    opacity: 0.6,
  },
  scaleTextActive: {
    color: '#D95D39',
    opacity: 1,
  },
  notesInput: {
    minHeight: 98,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  notesPreviewCard: {
    minHeight: 98,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
  },
  notesPreviewText: {
    fontSize: 9,
    lineHeight: 13,
  },
  trackerCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
    gap: 8,
  },
  trackerHint: {
    fontSize: 8,
    fontWeight: '700',
  },
  trackerChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  trackerChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  trackerChipText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  trackerCustomRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  trackerCustomInput: {
    flex: 1,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 7,
    fontSize: 9,
    fontFamily: 'Figtree',
  },
  trackerCustomButton: {
    paddingHorizontal: 8,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerCustomButtonText: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
  trackerValueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  trackerValuePill: {
    width: 21,
    height: 21,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerValueText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  trackerLogList: {
    gap: 7,
  },
  trackerLogItem: {
    gap: 6,
  },
  trackerLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackerEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackerEditInput: {
    flex: 1,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 7,
    fontSize: 9,
    fontFamily: 'Figtree',
  },
  trackerEditButton: {
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerEditButtonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  trackerEditButtonText: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
  trackerLogLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  trackerLogMeta: {
    fontSize: 8,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  trackerLogValuePill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  trackerLogValue: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  trackerEmpty: {
    fontSize: 8,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  subEventsList: {
    gap: 6,
  },
  subEventCard: {
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    gap: 4,
  },
  subEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  subEventTitle: {
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
  activeBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(52,211,153,0.2)',
  },
  activeBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  subEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subEventMetaText: {
    fontSize: 8,
    fontWeight: '600',
  },
  subEventPoints: {
    fontSize: 8,
    fontWeight: '700',
    color: '#D95D39',
  },
});
