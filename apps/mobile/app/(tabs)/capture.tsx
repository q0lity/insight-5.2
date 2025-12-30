import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, type PressableStateCallbackType, ScrollView, StyleSheet, TextInput } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import Colors from '@/constants/Colors';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { addInboxCapture, type CaptureAttachment } from '@/src/storage/inbox';
import { useSession } from '@/src/state/session';
import {
  CHARACTER_KEYS,
  CATEGORY_SHORTCUTS,
  SUBCATEGORY_SHORTCUTS,
  parseCommaList,
  parseTagList,
  uniqStrings,
} from '@/src/utils/frontmatter';

function extractTags(rawText: string) {
  const out = new Set<string>();
  for (const m of rawText.matchAll(/#([a-zA-Z][\\w/-]*)/g)) out.add(m[1].toLowerCase());
  return [...out].slice(0, 8);
}

function extractContexts(rawText: string) {
  const out = new Set<string>();
  for (const m of rawText.matchAll(/(^|[\\s(])\\+([a-zA-Z][\\w/-]*)/g)) {
    out.add(m[2].toLowerCase());
  }
  return [...out].slice(0, 8);
}

function detectDrivingCommand(text: string) {
  const lower = text.toLowerCase();
  if (/(driving right now|started driving|start driving|on my way)/.test(lower)) {
    return {
      action: 'start' as const,
      title: 'Commute',
      trackerKey: 'transport',
      category: 'Transport',
      subcategory: 'Driving',
      contexts: ['car'],
    };
  }
  if (/(stopped driving|stop driving|done driving|arrived)/.test(lower)) {
    return { action: 'stop' as const, title: 'Commute', trackerKey: 'transport' };
  }
  return null;
}

export default function CaptureScreen() {
  const [rawText, setRawText] = useState('');
  const [noteMode, setNoteMode] = useState<'raw' | 'processed'>('raw');
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<CaptureAttachment[]>([]);
  const [transcriptionProvider, setTranscriptionProvider] = useState<'supabase' | 'whisper'>('supabase');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [importance, setImportance] = useState(5);
  const [difficulty, setDifficulty] = useState(5);
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [manualContexts, setManualContexts] = useState<string[]>([]);
  const [contextDraft, setContextDraft] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [peopleDraft, setPeopleDraft] = useState('');
  const [manualLocations, setManualLocations] = useState<string[]>([]);
  const [locationDraft, setLocationDraft] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillsDraft, setSkillsDraft] = useState('');
  const [character, setCharacter] = useState<string[]>([]);
  const [goal, setGoal] = useState('');
  const [project, setProject] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [estimateMinutes, setEstimateMinutes] = useState('');
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { active, startSession, stopSession } = useSession();

  const canSave = useMemo(() => rawText.trim().length > 0 && !saving, [rawText, saving]);
  const derivedTags = useMemo(() => extractTags(rawText), [rawText]);
  const derivedContexts = useMemo(() => extractContexts(rawText), [rawText]);
  const tags = useMemo(() => uniqStrings([...derivedTags, ...manualTags]), [derivedTags, manualTags]);
  const contexts = useMemo(
    () => uniqStrings([...derivedContexts, ...manualContexts]),
    [derivedContexts, manualContexts]
  );
  const locationLabel = useMemo(() => {
    const loc = attachments.find((item) => item.type === 'location');
    return loc?.label ?? null;
  }, [attachments]);
  const locations = useMemo(
    () => uniqStrings([...(locationLabel ? [locationLabel] : []), ...manualLocations]),
    [locationLabel, manualLocations]
  );
  const locationValue = locations.join(', ');
  const estimateMinutesValue = useMemo(() => {
    const parsed = Number.parseInt(estimateMinutes, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [estimateMinutes]);
  const points = useMemo(() => Math.round(importance * difficulty), [importance, difficulty]);
  const subcategoryOptions = useMemo(() => {
    const match = CATEGORY_SHORTCUTS.find((entry) => entry.toLowerCase() === category.trim().toLowerCase());
    return match ? SUBCATEGORY_SHORTCUTS[match] ?? [] : [];
  }, [category]);
  const processedPreview = useMemo(() => {
    if (!rawText.trim()) return 'Parsed output will appear here.';
    const parts = [];
    if (tags.length) parts.push(`tags ${tags.map((t) => `#${t}`).join(' ')}`);
    if (contexts.length) parts.push(`contexts ${contexts.map((c) => `+${c}`).join(' ')}`);
    if (people.length) parts.push(`people ${people.map((p) => `@${p}`).join(', ')}`);
    if (locationValue) parts.push(`location ${locationValue}`);
    if (category) parts.push(`category ${category}`);
    if (subcategory) parts.push(`subcategory ${subcategory}`);
    if (!parts.length) return 'No entities detected yet.';
    return parts.join(' - ');
  }, [rawText, tags, contexts, people, locationValue, category, subcategory]);
  const queueAttachmentUpdate = (id: string, patch: Partial<CaptureAttachment>) => {
    setTimeout(() => {
      setAttachments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'ready', ...patch } : item))
      );
    }, 600);
  };

  const addImageAttachment = (asset: ImagePicker.ImagePickerAsset, source: 'camera' | 'library') => {
    const id = `att_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const next: CaptureAttachment = {
      id,
      type: 'image',
      createdAt: Date.now(),
      status: 'pending',
      uri: asset.uri,
      label: source === 'camera' ? 'Camera photo' : asset.fileName || 'Image',
      metadata: {
        width: asset.width ?? 0,
        height: asset.height ?? 0,
      },
    };
    setAttachments((prev) => [next, ...prev]);
    queueAttachmentUpdate(id, { analysis: 'Vision summary queued (analysis pending).' });
  };

  const addAudioAttachment = (uri: string, provider: 'supabase' | 'whisper') => {
    const id = `att_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const next: CaptureAttachment = {
      id,
      type: 'audio',
      createdAt: Date.now(),
      status: 'pending',
      uri,
      label: 'Voice memo',
      metadata: { provider },
    };
    setAttachments((prev) => [next, ...prev]);
    queueAttachmentUpdate(id, {
      transcription: provider === 'whisper' ? 'Whisper transcription queued.' : 'Supabase transcription queued.',
    });
  };

  const addLocationAttachment = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location permission needed', 'Enable location to attach a place.');
      return;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = position.coords;
    let label = `Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`;
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (place) {
        const parts = [place.name, place.street, place.city, place.region].filter(Boolean);
        if (parts.length) label = parts.join(', ');
      }
    } catch {
      // ignore reverse geocode errors
    }

    const id = `att_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const next: CaptureAttachment = {
      id,
      type: 'location',
      createdAt: Date.now(),
      status: 'pending',
      label,
      metadata: {
        latitude,
        longitude,
        accuracy: position.coords.accuracy ?? 0,
      },
    };
    setAttachments((prev) => [next, ...prev]);
    queueAttachmentUpdate(id, { analysis: `Location tagged - ${label}` });
  };

  const addTimestampLine = () => {
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const line = `- **${stamp}** - `;
    setRawText((prev) => (prev ? `${prev}\n${line}` : line));
  };

  const addSegmentDivider = () => {
    setRawText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return '---\n';
      return `${trimmed}\n\n---\n`;
    });
  };

  const addTagsFromDraft = () => {
    const next = parseTagList(tagDraft);
    if (!next.length) return;
    setManualTags((prev) => uniqStrings([...prev, ...next]));
    setTagDraft('');
  };

  const addContextsFromDraft = () => {
    const next = parseCommaList(contextDraft);
    if (!next.length) return;
    setManualContexts((prev) => uniqStrings([...prev, ...next]));
    setContextDraft('');
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
    setManualLocations((prev) => uniqStrings([...prev, ...next]));
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

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera permission needed', 'Enable camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    addImageAttachment(result.assets[0], 'camera');
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo permission needed', 'Enable photo access to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    addImageAttachment(result.assets[0], 'library');
  };

  const toggleRecording = async () => {
    if (recordingState === 'processing') return;
    if (recording) {
      setRecordingState('processing');
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri) {
          addAudioAttachment(uri, transcriptionProvider);
        }
      } catch {
        Alert.alert('Recording failed', 'Unable to stop the recording.');
      } finally {
        setRecording(null);
        setRecordingState('idle');
      }
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission needed', 'Enable mic access to record audio.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const next = new Audio.Recording();
      await next.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await next.startAsync();
      setRecording(next);
      setRecordingState('recording');
    } catch {
      Alert.alert('Recording failed', 'Unable to start audio recording.');
      setRecordingState('idle');
    }
  };

  async function onSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const command = detectDrivingCommand(rawText);
      if (command?.action === 'start') {
        if (active?.locked) {
          Alert.alert('Tracker locked', 'Unlock the current session before starting a new event.');
          return;
        }
        const start = async () => {
          await startSession({
            id: `transport_${Date.now()}`,
            title: command.title,
            kind: 'event',
            startedAt: Date.now(),
            trackerKey: command.trackerKey,
            estimatedMinutes: null,
            category: command.category ?? null,
            subcategory: command.subcategory ?? null,
            contexts: command.contexts ?? [],
          });
        };

        if (active) {
          Alert.alert(
            'Switch activity?',
            `You are currently in "${active.title}". Start "${command.title}" instead?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Start', style: 'default', onPress: () => void start() },
            ]
          );
        } else {
          void start();
        }
      }

      if (command?.action === 'stop' && active?.trackerKey === 'transport') {
        void stopSession();
      }

      await addInboxCapture(rawText.trim(), attachments, {
        importance,
        difficulty,
        tags,
        contexts,
        location: locationValue || undefined,
        people,
        skills,
        character,
        goal: goal.trim() || null,
        project: project.trim() || null,
        category: category.trim() || null,
        subcategory: subcategory.trim() || null,
        estimateMinutes: estimateMinutesValue ?? null,
        points,
        processedText: processedPreview,
      });
      setRawText('');
      setNoteMode('raw');
      setAttachments([]);
      setImportance(5);
      setDifficulty(5);
      setManualTags([]);
      setTagDraft('');
      setManualContexts([]);
      setContextDraft('');
      setPeople([]);
      setPeopleDraft('');
      setManualLocations([]);
      setLocationDraft('');
      setSkills([]);
      setSkillsDraft('');
      setCharacter([]);
      setGoal('');
      setProject('');
      setCategory('');
      setSubcategory('');
      setEstimateMinutes('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View
            style={[
              styles.nodeBadge,
              { borderColor: colorScheme === 'dark' ? 'rgba(148,163,184,0.24)' : 'rgba(28,28,30,0.1)' },
            ]}>
            <Text style={styles.nodeBadgeText}>1</Text>
          </View>
          <Text style={styles.topMeta}>Capture</Text>
        </View>

        <View style={styles.notesCard}>
          <View style={styles.notesHeader}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <View style={styles.notesActions}>
              <Pressable style={styles.timestampButton} onPress={addTimestampLine}>
                <Text style={styles.timestampText}>Add timestamp</Text>
              </Pressable>
              <Pressable style={styles.timestampButton} onPress={addSegmentDivider}>
                <Text style={styles.timestampText}>Add segment</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.modeRow}>
            {[
              { key: 'raw', label: 'Raw' },
              { key: 'processed', label: 'Processed' },
            ].map((option) => {
              const activeOption = noteMode === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setNoteMode(option.key as 'raw' | 'processed')}
                  style={[
                    styles.modePill,
                    activeOption && styles.modePillActive,
                    {
                      borderColor: colorScheme === 'dark' ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
                    },
                  ]}>
                  <Text style={[styles.modeText, activeOption && styles.modeTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {noteMode === 'raw' ? (
            <TextInput
              value={rawText}
              onChangeText={setRawText}
              placeholder="What happened?"
              placeholderTextColor={colorScheme === 'dark' ? 'rgba(148,163,184,0.6)' : 'rgba(28,28,30,0.35)'}
              multiline
              style={[
                styles.input,
                {
                  color: palette.text,
                  borderColor: colorScheme === 'dark' ? 'rgba(148,163,184,0.24)' : 'rgba(28,28,30,0.1)',
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.processedCard,
                { borderColor: colorScheme === 'dark' ? 'rgba(148,163,184,0.24)' : 'rgba(28,28,30,0.1)' },
              ]}>
              <Text style={styles.processedText}>{processedPreview}</Text>
            </View>
          )}
        </View>

        <View style={styles.frontmatter}>
          <Text style={styles.sectionLabel}>Frontmatter</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Tags</Text>
            <View style={styles.chipRow}>
              {tags.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => setManualTags((prev) => prev.filter((entry) => entry !== tag))}
                  style={styles.chip}>
                  <Text style={styles.chipText}>#{tag}</Text>
                  {manualTags.includes(tag) ? <Text style={styles.chipRemove}>x</Text> : null}
                </Pressable>
              ))}
              {!tags.length ? <Text style={styles.chipHint}>#tags will appear here</Text> : null}
              <TextInput
                value={tagDraft}
                onChangeText={setTagDraft}
                onSubmitEditing={addTagsFromDraft}
                onBlur={addTagsFromDraft}
                placeholder="#work #meeting"
                placeholderTextColor={colorScheme === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[styles.chipInput, { color: palette.text }]}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Contexts</Text>
            <View style={styles.chipRow}>
              {contexts.map((ctx) => (
                <Pressable
                  key={ctx}
                  onPress={() => setManualContexts((prev) => prev.filter((entry) => entry !== ctx))}
                  style={[styles.chip, styles.contextChip]}>
                  <Text style={[styles.chipText, styles.contextChipText]}>+{ctx}</Text>
                  {manualContexts.includes(ctx) ? (
                    <Text style={[styles.chipRemove, styles.contextChipText]}>x</Text>
                  ) : null}
                </Pressable>
              ))}
              {!contexts.length ? <Text style={styles.chipHint}>+contexts will appear here</Text> : null}
              <TextInput
                value={contextDraft}
                onChangeText={setContextDraft}
                onSubmitEditing={addContextsFromDraft}
                onBlur={addContextsFromDraft}
                placeholder="+car +clinic"
                placeholderTextColor={colorScheme === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[styles.chipInput, { color: palette.text }]}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>People</Text>
            <View style={styles.chipRow}>
              {people.map((person) => (
                <Pressable
                  key={person}
                  onPress={() => setPeople((prev) => prev.filter((entry) => entry !== person))}
                  style={styles.chip}>
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
                placeholderTextColor={colorScheme === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
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
                placeholderTextColor={colorScheme === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: colorScheme === 'dark' ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.1)',
                  },
                ]}
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Location</Text>
              <View style={styles.chipRow}>
                {locations.map((loc) => (
                  <Pressable
                    key={loc}
                    onPress={() => setManualLocations((prev) => prev.filter((entry) => entry !== loc))}
                    style={styles.chip}>
                    <Text style={styles.chipText}>{loc}</Text>
                    {manualLocations.includes(loc) ? <Text style={styles.chipRemove}>x</Text> : null}
                  </Pressable>
                ))}
                <TextInput
                  value={locationDraft}
                  onChangeText={setLocationDraft}
                  onSubmitEditing={addLocationsFromDraft}
                  onBlur={addLocationsFromDraft}
                  placeholder="Home"
                  placeholderTextColor={colorScheme === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                  style={[styles.chipInput, { color: palette.text }]}
                />
              </View>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Points</Text>
              <View style={styles.pointsCard}>
                <Text style={styles.pointsValue}>{points}</Text>
                <Text style={styles.pointsMeta}>
                  {importance} x {difficulty}
                  {estimateMinutesValue ? ` - ${estimateMinutesValue} min` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Running</Text>
              <View style={styles.pointsCard}>
                <Text style={styles.pointsValue}>--</Text>
                <Text style={styles.pointsMeta}>Not running</Text>
              </View>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Skills</Text>
            <View style={styles.chipRow}>
              {skills.map((skill) => (
                <Pressable
                  key={skill}
                  onPress={() => setSkills((prev) => prev.filter((entry) => entry !== skill))}
                  style={styles.chip}>
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
                placeholderTextColor={colorScheme === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
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
                  <Pressable
                    key={key}
                    onPress={() => toggleCharacter(key)}
                    style={[styles.chip, activeChip && styles.chipActive]}>
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
                placeholderTextColor={colorScheme === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: colorScheme === 'dark' ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.1)',
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
                placeholderTextColor={colorScheme === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: colorScheme === 'dark' ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.1)',
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
                placeholderTextColor={colorScheme === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: colorScheme === 'dark' ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.1)',
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
                placeholderTextColor={colorScheme === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(28,28,30,0.35)'}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: colorScheme === 'dark' ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.1)',
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
                  <Pressable
                    key={shortcut}
                    onPress={() => setCategory(shortcut)}
                    style={[styles.chip, activeChip && styles.chipActive]}>
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
                    <Pressable
                      key={shortcut}
                      onPress={() => setSubcategory(shortcut)}
                      style={[styles.chip, activeChip && styles.chipActive]}>
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

        <View style={styles.attachments}>
          <Pressable style={styles.attachButton} onPress={pickFromCamera}>
            <FontAwesome name="camera" size={16} color={palette.text} />
          </Pressable>
          <Pressable style={styles.attachButton} onPress={pickFromLibrary}>
            <FontAwesome name="image" size={16} color={palette.text} />
          </Pressable>
          <Pressable
            style={[styles.attachButton, recordingState === 'recording' && styles.attachButtonActive]}
            onPress={() => void toggleRecording()}>
            <FontAwesome
              name={recordingState === 'recording' ? 'stop' : 'microphone'}
              size={16}
              color={recordingState === 'recording' ? '#D95D39' : palette.text}
            />
          </Pressable>
          <Pressable style={styles.attachButton} onPress={() => void addLocationAttachment()}>
            <FontAwesome name="map-marker" size={16} color={palette.text} />
          </Pressable>
        </View>
        {recordingState === 'recording' ? (
          <Text style={styles.recordingHint}>Recording... tap mic to stop</Text>
        ) : null}

        <Text style={styles.sectionLabel}>Transcription</Text>
        <View style={styles.segmentRow}>
          {[
            { key: 'supabase', label: 'Supabase' },
            { key: 'whisper', label: 'Whisper' },
          ].map((option) => {
            const activeOption = transcriptionProvider === option.key;
            return (
              <Pressable
                key={option.key}
                style={[
                  styles.segment,
                  {
                    backgroundColor: activeOption ? 'rgba(217,93,57,0.16)' : 'rgba(255,255,255,0.04)',
                    borderColor: colorScheme === 'dark' ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
                  },
                ]}
                onPress={() => setTranscriptionProvider(option.key as 'supabase' | 'whisper')}>
                <Text style={styles.segmentText}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {attachments.length ? (
          <View style={styles.attachmentList}>
            {attachments.map((item) => (
              <View key={item.id} style={styles.attachmentCard}>
                {item.type === 'image' && item.uri ? (
                  <Image source={{ uri: item.uri }} style={styles.attachmentPreview} />
                ) : (
                  <View style={styles.attachmentIcon}>
                    <FontAwesome
                      name={item.type === 'audio' ? 'microphone' : item.type === 'location' ? 'map-marker' : 'paperclip'}
                      size={14}
                      color={palette.text}
                    />
                  </View>
                )}
                <View style={styles.attachmentBody}>
                  <Text style={styles.attachmentTitle}>{item.label ?? item.type}</Text>
                  <Text style={styles.attachmentMeta}>
                    {item.status === 'pending'
                      ? 'Processing...'
                      : item.transcription || item.analysis || 'Ready'}
                    {item.type === 'audio' && item.metadata?.provider
                      ? ` - ${item.metadata.provider === 'whisper' ? 'Whisper' : 'Supabase'}`
                      : ''}
                  </Text>
                </View>
                <Pressable
                  style={styles.attachmentRemove}
                  onPress={() => setAttachments((prev) => prev.filter((entry) => entry.id !== item.id))}>
                  <FontAwesome name="times" size={12} color={palette.text} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          onPress={onSave}
          disabled={!canSave}
          style={({ pressed }: PressableStateCallbackType) => [
            styles.button,
            !canSave && styles.buttonDisabled,
            pressed && canSave && styles.buttonPressed,
          ]}>
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Send'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scroll: {
    gap: 16,
    paddingBottom: 120,
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
  notesCard: {
    gap: 10,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notesActions: {
    flexDirection: 'row',
    gap: 8,
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
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modePill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
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
  processedCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  processedText: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
  frontmatter: {
    gap: 14,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '700',
    opacity: 0.7,
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
  contextChip: {
    backgroundColor: 'rgba(59,130,246,0.12)',
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
  contextChipText: {
    color: '#3B82F6',
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
  attachments: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  segmentText: {
    fontWeight: '700',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.1)',
  },
  attachButtonActive: {
    borderColor: '#D95D39',
    backgroundColor: 'rgba(217,93,57,0.12)',
  },
  recordingHint: {
    fontSize: 12,
    opacity: 0.7,
  },
  attachmentList: {
    gap: 10,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.08)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  attachmentPreview: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(28,28,30,0.08)',
  },
  attachmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.08)',
  },
  attachmentBody: {
    flex: 1,
    gap: 2,
  },
  attachmentTitle: {
    fontWeight: '700',
  },
  attachmentMeta: {
    fontSize: 12,
    opacity: 0.7,
  },
  attachmentRemove: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 140,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D95D39',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(109,94,241,0.35)',
  },
  buttonText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
