import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { updateLiveActivity } from '@/src/native/liveActivity';
import { getEvent, updateEvent } from '@/src/storage/events';
import { useSession } from '@/src/state/session';
import {
  CHARACTER_KEYS,
  CATEGORY_SHORTCUTS,
  SUBCATEGORY_SHORTCUTS,
  parseCommaList,
  parseTagList,
  uniqStrings,
} from '@/src/utils/frontmatter';
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

export default function FocusScreen() {
  const { active, stopSession, updateNotes, updateMetrics } = useSession();
  const { palette, sizes, isDark } = useTheme();
  const [now, setNow] = useState(Date.now());
  const [notes, setNotes] = useState(active?.notes ?? '');
  const [importance, setImportance] = useState(active?.importance ?? 5);
  const [difficulty, setDifficulty] = useState(active?.difficulty ?? 5);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setNotes(active?.notes ?? '');
  }, [active?.notes, active?.id]);

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
      setTags(Array.isArray(event.tags) ? event.tags : []);
      setPeople(Array.isArray(event.people) ? event.people : []);
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
          fallbackGoalImportance: importance,
        }).toFixed(3)
      );
      void updateEvent(active.id, {
        tags,
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
      });
    }, 400);
    return () => clearTimeout(id);
  }, [
    active?.id,
    tags,
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
        fallbackGoalImportance: importance,
      }),
    [importance, difficulty, durationMinutes, goal]
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

  const addPeopleFromDraft = () => {
    const next = parseCommaList(peopleDraft);
    if (!next.length) return;
    setPeople((prev) => uniqStrings([...prev, ...next]));
    setPeopleDraft('');
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

  useEffect(() => {
    if (!active) return;
    void updateLiveActivity({
      title: active.title,
      remainingSeconds,
      trackerKey: active.trackerKey ?? null,
    });
  }, [active?.id, remainingBucket, remainingSeconds, active?.title, active?.trackerKey]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
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
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(15,19,32,0.92)' : 'rgba(255,255,255,0.85)',
              borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
            },
          ]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>
            {formatClock(elapsedMs)}
            {remainingMs != null ? ` elapsed - ${formatClock(remainingMs)} left` : ' elapsed'}
          </Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <RollingNumber value={formatXp(pointsRaw)} prefix="+" suffix=" XP" textStyle={styles.points} />

          <View style={styles.actions}>
            <Pressable style={[styles.actionButton, styles.secondaryButton]}>
              <Text style={styles.actionText}>Pause</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.primaryButton]} onPress={() => void stopSession()}>
              <Text style={[styles.actionText, styles.actionTextLight]}>End</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Pressable style={styles.timestampButton} onPress={addTimestampLine} onLongPress={addSegmentDivider}>
              <Text style={styles.timestampText}>Add timestamp</Text>
            </Pressable>
          </View>
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
        </View>

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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 18,
  },
  scroll: {
    gap: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  meta: {
    opacity: 0.7,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(217,93,57,0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#D95D39',
  },
  points: {
    fontWeight: '700',
    color: '#D95D39',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#D95D39',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.12)',
  },
  actionText: {
    fontWeight: '700',
  },
  actionTextLight: {
    color: '#FFFFFF',
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timestampButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(217,93,57,0.12)',
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D95D39',
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    opacity: 0.7,
    fontWeight: '700',
  },
  frontmatter: {
    gap: 14,
  },
  fieldRow: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.7,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(217,93,57,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    fontSize: 12,
    opacity: 0.7,
  },
  chipHint: {
    opacity: 0.6,
  },
  chipInput: {
    minWidth: 120,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  gridItem: {
    flex: 1,
    gap: 8,
  },
  smallInput: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pointsCard: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.08)',
    gap: 4,
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  pointsMeta: {
    fontSize: 12,
    opacity: 0.6,
  },
  scaleGroup: {
    gap: 8,
  },
  scaleRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  scalePill: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    minHeight: 140,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
