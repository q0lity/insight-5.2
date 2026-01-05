import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, type PressableStateCallbackType, ScrollView, Share, StyleSheet, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { addInboxCapture, listInboxCaptures, updateInboxCapture, type CaptureAttachment, type InboxCapture } from '@/src/storage/inbox';
import { useSession } from '@/src/state/session';
import { createTask } from '@/src/storage/tasks';
import { createTrackerLog } from '@/src/storage/trackers';
import { getEvent, startEvent, stopEvent, updateEvent } from '@/src/storage/events';
import { autoCategorize, detectIntent, formatSegmentsPreview, parseCapture } from '@/src/lib/schema';
import { invokeCaptureParse } from '@/src/supabase/functions';
import {
  CHARACTER_KEYS,
  CATEGORY_SHORTCUTS,
  SUBCATEGORY_SHORTCUTS,
  parseCommaList,
  parseTagList,
  uniqStrings,
} from '@/src/utils/frontmatter';
import { computeXp, formatXp, resolveGoalMultiplier } from '@/src/utils/points';

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

function formatTimeMarker(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `[${hh}:${mm}] `;
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const TIMESTAMP_LINE_RE = /^\[\d{2}:\d{2}(?::\d{2})?\]\s*$/;
const PAUSE_FOR_MARKER_MS = 5000;
const PAUSE_FOR_DIVIDER_MS = 15000;
const MIN_MARKER_GAP_MS = 12000;

function lastNonEmptyLine(text: string) {
  const lines = text.trimEnd().split('\n').filter((line) => line.trim());
  return lines.length ? lines[lines.length - 1] : '';
}

function hasSemanticContent(text: string) {
  return text.split('\n').some((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (TIMESTAMP_LINE_RE.test(trimmed)) return false;
    if (trimmed.startsWith('---')) return false;
    return true;
  });
}

function buildAutoInsertion(current: string, opts: { divider: boolean; timestamp: boolean }) {
  if (!opts.divider && !opts.timestamp) return '';
  const hasText = current.trim().length > 0;
  const prefix = hasText ? (opts.divider ? '\n\n' : '\n') : '';
  const lines: string[] = [];
  if (opts.divider) lines.push('---');
  if (opts.timestamp) lines.push(formatTimeMarker().trim());
  return `${prefix}${lines.join('\n')}\n`;
}

function normalizeCaptureText(rawText: string) {
  return rawText
    .split('\n')
    .map((line) => line.replace(/^- \\*\\*(\\d{1,2}:\\d{2})\\*\\* -\\s*/, '[$1] '))
    .join('\n')
    .trim();
}

function countSegments(normalized: string) {
  const dividerCount = normalized.split('\n').filter((line) => line.trim().startsWith('---')).length;
  return dividerCount ? dividerCount + 1 : 0;
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
  const router = useRouter();
  const { eventId: eventIdParam } = useLocalSearchParams<{ eventId?: string | string[] }>();
  const appendEventId = Array.isArray(eventIdParam) ? eventIdParam[0] : eventIdParam;
  const [rawText, setRawText] = useState('');
  const [noteMode, setNoteMode] = useState<'raw' | 'transcript' | 'outline'>('raw');
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
  const [reviewQueue, setReviewQueue] = useState<InboxCapture[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const lastMarkerAtRef = useRef<number | null>(null);
  const lastInputAtRef = useRef<number | null>(null);
  const pendingMarkerRef = useRef(false);
  const pendingDividerRef = useRef(false);
  const rawTextRef = useRef('');
  const { palette, sizes, isDark } = useTheme();
  const { active, startSession, stopSession } = useSession();
  const elapsedMs = active ? now - active.startedAt : 0;
  const remainingMs = useMemo(() => {
    if (!active) return null;
    if (active.endAt) return Math.max(0, active.endAt - now);
    if (active.estimatedMinutes != null) {
      return Math.max(0, active.estimatedMinutes * 60 * 1000 - elapsedMs);
    }
    return null;
  }, [active, now, elapsedMs]);

  const hasAttachments = useMemo(() => attachments.length > 0, [attachments]);
  const hasAudio = useMemo(() => attachments.some((item) => item.type === 'audio'), [attachments]);
  const canSave = useMemo(
    () => (rawText.trim().length > 0 || hasAttachments) && !saving,
    [rawText, hasAttachments, saving]
  );
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
  const goalMultiplier = useMemo(
    () => resolveGoalMultiplier({ goal, fallbackImportance: importance }),
    [goal, importance]
  );
  const pointsPreview = useMemo(
    () =>
      computeXp({
        importance,
        difficulty,
        durationMinutes: estimateMinutesValue ?? 0,
        goal,
        fallbackGoalImportance: importance,
      }),
    [importance, difficulty, estimateMinutesValue, goal]
  );
  const pointsFormula = useMemo(() => {
    const minutesLabel = estimateMinutesValue != null ? `${estimateMinutesValue}m` : '--';
    return `${importance} × ${difficulty} × ${minutesLabel} ÷ 60 × ${goalMultiplier.toFixed(2)}`;
  }, [importance, difficulty, estimateMinutesValue, goalMultiplier]);
  const waveformBars = useMemo(
    () => [6, 10, 14, 20, 12, 8, 16, 22, 14, 10, 18, 24, 12, 8, 16, 20, 10, 6, 12],
    []
  );
  const subcategoryOptions = useMemo(() => {
    const match = CATEGORY_SHORTCUTS.find((entry) => entry.toLowerCase() === category.trim().toLowerCase());
    return match ? SUBCATEGORY_SHORTCUTS[match] ?? [] : [];
  }, [category]);
  const transcriptPreview = useMemo(() => (rawText.trim() ? normalizeCaptureText(rawText) : ''), [rawText]);
  const outlinePreview = useMemo(() => {
    if (!rawText.trim()) return '';
    const parsed = parseCapture(normalizeCaptureText(rawText));
    if (!parsed.segments.length) return normalizeCaptureText(rawText);
    return formatSegmentsPreview(parsed.segments);
  }, [rawText]);

  const eventPreview = useMemo(() => {
    if (!rawText.trim()) return null;
    const normalized = normalizeCaptureText(rawText);
    const segmentCount = countSegments(normalized);
    if (segmentCount > 1) return null;

    const command = detectDrivingCommand(rawText);
    if (command?.action === 'start') {
      return {
        title: command.title,
        category: command.category ?? null,
        subcategory: command.subcategory ?? null,
        contexts: command.contexts ?? [],
      };
    }

    const intent = detectIntent(normalized);
    if (intent.type !== 'start_event') return null;
    const { category: autoCategory, subcategory: autoSubcategory } = autoCategorize(normalized);
    const firstLine =
      normalized
        .split('\n')
        .find((line) => line.trim() && !line.trim().startsWith('---')) ?? 'Capture';
    const safeTitle = firstLine.replace(/^\[\d{2}:\d{2}(?::\d{2})?\]\s*/, '').slice(0, 60);
    return {
      title: safeTitle || 'Capture',
      category: autoCategory,
      subcategory: autoSubcategory,
      contexts,
    };
  }, [rawText, contexts]);

  const refreshInbox = useCallback(async () => {
    const captures = await listInboxCaptures();
    setReviewQueue(captures.filter((capture) => capture.status === 'raw').slice(0, 3));
  }, []);

  useEffect(() => {
    void refreshInbox();
  }, [refreshInbox]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    rawTextRef.current = rawText;
  }, [rawText]);

  useEffect(() => {
    if (recordingState !== 'recording') {
      pendingMarkerRef.current = false;
      pendingDividerRef.current = false;
      return;
    }
    setNoteMode('raw');
    const now = Date.now();
    lastInputAtRef.current = now;
    lastMarkerAtRef.current = now;
    setRawText((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) {
        const next = formatTimeMarker();
        rawTextRef.current = next;
        return next;
      }
      const lastLine = trimmed.split('\n').pop() ?? '';
      if (TIMESTAMP_LINE_RE.test(lastLine.trim())) {
        rawTextRef.current = prev;
        return prev;
      }
      const next = `${trimmed}\n${formatTimeMarker()}`;
      rawTextRef.current = next;
      return next;
    });
  }, [recordingState]);

  useEffect(() => {
    if (recordingState !== 'recording') return;
    const id = setInterval(() => {
      const lastInputAt = lastInputAtRef.current;
      if (!lastInputAt) return;
      const now = Date.now();
      const idleMs = now - lastInputAt;
      const lastMarkerAt = lastMarkerAtRef.current ?? 0;
      if (idleMs >= PAUSE_FOR_MARKER_MS && now - lastMarkerAt >= MIN_MARKER_GAP_MS) {
        if (!pendingMarkerRef.current) {
          pendingMarkerRef.current = true;
        }
        if (idleMs >= PAUSE_FOR_DIVIDER_MS) {
          pendingDividerRef.current = true;
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [recordingState]);
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
    const line = formatTimeMarker();
    const now = Date.now();
    lastMarkerAtRef.current = now;
    lastInputAtRef.current = now;
    setRawText((prev) => {
      const next = prev ? `${prev}\n${line}` : line;
      rawTextRef.current = next;
      return next;
    });
  };

  const addSegmentDivider = () => {
    lastInputAtRef.current = Date.now();
    setRawText((prev) => {
      const trimmed = prev.trim();
      const next = !trimmed ? '---\n' : `${trimmed}\n\n---\n`;
      rawTextRef.current = next;
      return next;
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
      const trimmed = rawText.trim();
      const normalized =
        trimmed.length > 0
          ? normalizeCaptureText(trimmed)
          : hasAudio
            ? '[Audio capture pending transcription]'
            : '';
      const command = appendEventId ? null : detectDrivingCommand(rawText);
      if (command?.action === 'start') {
        if (active?.locked) {
          Alert.alert('Tracker locked', 'Unlock the current session before starting a new event.');
          return;
        }
        const start = async () => {
          const session = await startSession({
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
          router.push(`/event/${session.id}`);
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

      const saved = await addInboxCapture(trimmed, attachments, {
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
        points: Number(pointsPreview.toFixed(3)),
        processedText: normalized,
      });

      if (transcriptionProvider === 'supabase') {
        try {
          await invokeCaptureParse({
            captureId: saved.id,
            transcript: normalized,
            context: { activeEntryId: active?.id ?? null },
          });
        } catch {
          // ignore server-side parse failures (local review queue still available)
        }
      }
      await refreshInbox();
      if (appendEventId && normalized) {
        const existing = await getEvent(appendEventId);
        const mergedNotes = [existing?.notes, normalized].filter(Boolean).join('\n\n');
        await updateEvent(appendEventId, { notes: mergedNotes });
        router.replace(`/event/${appendEventId}`);
      }
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

  const processCapture = async (capture: InboxCapture) => {
    if (reviewingId) return;
    setReviewingId(capture.id);
    try {
      const normalized = normalizeCaptureText(capture.rawText);
      const parsed = parseCapture(normalized);
      const tokens = parsed.tokens;
      const mergedTags = uniqStrings([...(capture.tags ?? []), ...tokens.tags]);
      const mergedContexts = uniqStrings([...(capture.contexts ?? []), ...tokens.contexts]);
      const mergedPeople = uniqStrings([...(capture.people ?? []), ...tokens.people]);

      let eventId: string | null = null;
      if (parsed.activeEvent) {
        const startAt = capture.createdAt;
        const event = await startEvent({
          title: parsed.activeEvent.title || 'Capture Event',
          kind: 'event',
          startAt,
          notes: normalized,
          tags: mergedTags,
          contexts: mergedContexts,
          people: mergedPeople,
          location: capture.location ?? null,
          category: parsed.activeEvent.category ?? capture.category ?? null,
          subcategory: parsed.activeEvent.subcategory ?? capture.subcategory ?? null,
          estimateMinutes: capture.estimateMinutes ?? null,
          importance: capture.importance ?? null,
          difficulty: capture.difficulty ?? null,
          goal: capture.goal ?? null,
          project: capture.project ?? null,
        });
        eventId = event.id;
        const endAt = capture.estimateMinutes ? startAt + capture.estimateMinutes * 60 * 1000 : startAt;
        await stopEvent(event.id, endAt);
      }

      for (const task of parsed.tasks) {
        await createTask({
          title: task.title,
          status: task.completed ? 'done' : 'todo',
          estimateMinutes: capture.estimateMinutes ?? null,
          tags: mergedTags,
          contexts: mergedContexts,
          people: mergedPeople,
          goal: capture.goal ?? null,
          project: capture.project ?? null,
          category: capture.category ?? null,
          subcategory: capture.subcategory ?? null,
          importance: capture.importance ?? null,
          difficulty: capture.difficulty ?? null,
          parentEventId: eventId ?? null,
        });
      }

      for (const tracker of parsed.trackerLogs) {
        const tokenValue = typeof tracker.value === 'string' ? tracker.value : String(tracker.value);
        await createTrackerLog({
          trackerKey: tracker.key,
          value: tracker.value,
          occurredAt: tracker.timestamp ?? capture.createdAt,
          entryId: eventId ?? capture.id,
          rawToken: `#${tracker.key}(${tokenValue})`,
        });
      }

      const processedText = parsed.segments.length ? formatSegmentsPreview(parsed.segments) : normalized;
      await updateInboxCapture(capture.id, {
        status: 'parsed',
        processedText,
        tags: mergedTags,
        contexts: mergedContexts,
        people: mergedPeople,
      });
      await refreshInbox();
    } catch (err) {
      Alert.alert('Review failed', err instanceof Error ? err.message : 'Unable to process this capture.');
    } finally {
      setReviewingId(null);
    }
  };

  const dismissCapture = async (capture: InboxCapture) => {
    if (reviewingId) return;
    setReviewingId(capture.id);
    try {
      await updateInboxCapture(capture.id, { status: 'parsed', processedText: 'Dismissed' });
      await refreshInbox();
    } finally {
      setReviewingId(null);
    }
  };

  const shareNotes = async () => {
    const message =
      noteMode === 'raw' ? rawText : noteMode === 'transcript' ? transcriptPreview : outlinePreview;
    if (!message.trim()) return;
    try {
      await Share.share({ message });
    } catch {
      // ignore share errors
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.recordCard}>
          <View style={styles.recordHeader}>
            <View style={styles.recordHeaderLeft}>
              <FontAwesome name="microphone" size={14} color="#FFFFFF" />
              <View style={styles.recordDot} />
            </View>
            <Text style={styles.recordTitle}>{appendEventId ? 'Append note' : 'Record'}</Text>
            <View style={styles.recordHeaderRight}>
              <FontAwesome name="cog" size={14} color="rgba(255,255,255,0.6)" />
            </View>
          </View>
          <View style={styles.waveform}>
            {waveformBars.map((height, idx) => (
              <View key={`bar_${idx}`} style={[styles.waveBar, { height }]} />
            ))}
          </View>
          <Text style={styles.recordPrompt}>
            {recordingState === 'recording' ? 'Recording… keep talking.' : 'Record a message to capture this moment.'}
          </Text>
          <Text style={styles.recordSubPrompt}>Start talking, then tap stop.</Text>
          <View style={styles.recordControls}>
            <Pressable style={styles.recordControl} onPress={() => router.back()}>
              <Text style={styles.recordControlText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.recordButton,
                recordingState === 'recording' && styles.recordButtonActive,
              ]}
              onPress={() => void toggleRecording()}>
              <View style={styles.recordButtonInner}>
                {recordingState === 'recording' ? (
                  <View style={styles.recordStop} />
                ) : (
                  <View style={styles.recordDotInner} />
                )}
              </View>
            </Pressable>
            <Pressable
              style={[
                styles.recordControl,
                recordingState !== 'recording' && styles.recordControlDisabled,
              ]}
              disabled={recordingState !== 'recording'}>
              <Text style={styles.recordControlText}>Pause</Text>
            </Pressable>
          </View>
        </View>

        {active ? (
          <View
            style={[
              styles.activeCard,
              {
                borderColor: palette.border,
                backgroundColor: palette.surface,
              },
            ]}>
            <View style={styles.activeHeader}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.activeStatus, { color: palette.textSecondary }]}>ACTIVE SESSION</Text>
            </View>
            <Text style={[styles.activeTitle, { color: palette.text }]} numberOfLines={1}>
              {active.title}
            </Text>
            <View style={styles.activeTiming}>
              <Text style={[styles.activeClock, { color: palette.tint }]}>{formatClock(elapsedMs)}</Text>
              {remainingMs != null ? (
                <Text style={[styles.activeRemaining, { color: palette.textSecondary }]}>
                  {formatClock(remainingMs)} remaining
                </Text>
              ) : null}
            </View>
            <View style={styles.activeActions}>
              <Pressable
                style={[styles.activeButton, { borderColor: palette.tint }]}
                onPress={() => router.push(`/event/${active.id}`)}>
                <Text style={[styles.activeButtonText, { color: palette.tint }]}>Open</Text>
              </Pressable>
              <Pressable
                style={[styles.activeButton, { backgroundColor: palette.tint }]}
                onPress={() => void stopSession()}>
                <Text style={styles.activeButtonTextLight}>Stop</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.notesCard}>
          <View style={styles.notesHeader}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Pressable style={styles.sendButton} onPress={() => void shareNotes()}>
              <FontAwesome name="paper-plane" size={14} color="#D95D39" />
            </Pressable>
          </View>
          <View style={styles.notesToolbar}>
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
                        borderColor: palette.border,
                      },
                    ]}>
                    <Text style={[styles.modeText, activeOption && styles.modeTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.notesActions}>
              <Pressable style={styles.timestampButton} onPress={addSegmentDivider}>
                <Text style={styles.timestampText}>Add segment</Text>
              </Pressable>
            </View>
          </View>
          {noteMode === 'raw' ? (
            <TextInput
              value={rawText}
              onChangeText={(nextText) => {
                const now = Date.now();
                const prev = rawTextRef.current;
                let updated = nextText;
                if (recordingState === 'recording' && nextText.startsWith(prev)) {
                  const needsDivider =
                    pendingDividerRef.current &&
                    hasSemanticContent(prev) &&
                    !lastNonEmptyLine(prev).startsWith('---');
                  const needsTimestamp =
                    pendingMarkerRef.current && !TIMESTAMP_LINE_RE.test(lastNonEmptyLine(prev).trim());
                  if (needsDivider || needsTimestamp) {
                    const insertion = buildAutoInsertion(prev, { divider: needsDivider, timestamp: needsTimestamp });
                    const appended = nextText.slice(prev.length);
                    updated = `${prev}${insertion}${appended}`;
                    pendingDividerRef.current = false;
                    pendingMarkerRef.current = false;
                    lastMarkerAtRef.current = now;
                  }
                }
                rawTextRef.current = updated;
                lastInputAtRef.current = now;
                setRawText(updated);
              }}
              placeholder="What happened?"
              placeholderTextColor={palette.textSecondary}
              multiline
              style={[
                styles.input,
                {
                  color: palette.text,
                  borderColor: palette.border,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.processedCard,
                { borderColor: palette.border },
              ]}>
              {eventPreview ? (
                <View style={styles.previewEvent}>
                  <Text style={styles.previewEventLabel}>Event preview</Text>
                  <Text style={styles.previewEventTitle}>
                    {eventPreview.category || 'General'}/{eventPreview.subcategory || 'General'}/{eventPreview.title}
                  </Text>
                  {eventPreview.contexts?.length ? (
                    <Text style={styles.previewEventMeta}>
                      {eventPreview.contexts.map((ctx) => `+${ctx}`).join(' ')}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <Text style={styles.processedText}>
                {noteMode === 'transcript'
                  ? transcriptPreview || 'Transcript will appear here.'
                  : outlinePreview || 'Outline will appear here.'}
              </Text>
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
                placeholderTextColor={palette.textSecondary}
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
                placeholderTextColor={palette.textSecondary}
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
                placeholderTextColor={palette.textSecondary}
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
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: palette.border,
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
                  placeholderTextColor={palette.textSecondary}
                  style={[styles.chipInput, { color: palette.text }]}
                />
              </View>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Points</Text>
              <View style={styles.pointsCard}>
                <Text style={styles.pointsValue}>{formatXp(pointsPreview)}</Text>
                <Text style={styles.pointsMeta}>{pointsFormula}</Text>
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
                placeholderTextColor={palette.textSecondary}
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
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: palette.border,
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
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: palette.border,
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
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: palette.border,
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
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: palette.border,
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
          <Text style={styles.recordingHint}>Recording... markers added automatically</Text>
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
                    borderColor: palette.border,
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

        <View style={styles.reviewSection}>
          <Text style={styles.sectionLabel}>Review queue</Text>
          {!reviewQueue.length ? (
            <Text style={styles.reviewEmpty}>No pending captures yet.</Text>
          ) : (
            reviewQueue.map((capture) => (
              <View key={capture.id} style={styles.reviewCard}>
                <Text style={styles.reviewTitle}>
                  {capture.rawText.split('\n')[0]?.slice(0, 80) || 'Capture'}
                </Text>
                <Text style={styles.reviewMeta}>
                  {new Date(capture.createdAt).toLocaleString()}
                </Text>
                <View style={styles.reviewActions}>
                  <Pressable
                    style={[styles.reviewButton, styles.reviewButtonPrimary]}
                    disabled={reviewingId === capture.id}
                    onPress={() => void processCapture(capture)}>
                    <Text style={styles.reviewButtonText}>
                      {reviewingId === capture.id ? 'Processing...' : 'Process'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.reviewButton, styles.reviewButtonSecondary]}
                    disabled={reviewingId === capture.id}
                    onPress={() => void dismissCapture(capture)}>
                    <Text style={styles.reviewButtonText}>Dismiss</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

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
  recordCard: {
    backgroundColor: '#111315',
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordHeaderRight: {
    width: 24,
    alignItems: 'flex-end',
  },
  recordDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  recordTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 48,
  },
  waveBar: {
    width: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  recordPrompt: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  recordSubPrompt: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontSize: 12,
  },
  recordControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  recordControl: {
    minWidth: 64,
    alignItems: 'center',
  },
  recordControlText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    fontSize: 12,
  },
  recordControlDisabled: {
    opacity: 0.4,
  },
  recordButton: {
    width: 74,
    height: 44,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#D95D39',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217,93,57,0.08)',
  },
  recordButtonActive: {
    backgroundColor: 'rgba(217,93,57,0.18)',
  },
  recordButtonInner: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D95D39',
  },
  recordStop: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  recordDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  activeCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    gap: 10,
    alignItems: 'center',
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeStatus: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: 'Figtree',
  },
  activeTiming: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
  },
  activeClock: {
    fontSize: 38,
    fontWeight: '900',
    fontFamily: 'System',
    textAlign: 'right',
  },
  activeRemaining: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  activeActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  activeButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  activeButtonTextLight: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
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
    alignItems: 'center',
  },
  notesToolbar: {
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
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217,93,57,0.12)',
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
  previewEvent: {
    gap: 4,
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.16)',
  },
  previewEventLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '700',
    opacity: 0.6,
  },
  previewEventTitle: {
    fontWeight: '700',
  },
  previewEventMeta: {
    fontSize: 12,
    opacity: 0.6,
  },
  reviewSection: {
    gap: 12,
  },
  reviewEmpty: {
    opacity: 0.6,
  },
  reviewCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  reviewTitle: {
    fontWeight: '700',
  },
  reviewMeta: {
    fontSize: 12,
    opacity: 0.6,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  reviewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  reviewButtonPrimary: {
    backgroundColor: 'rgba(217,93,57,0.18)',
  },
  reviewButtonSecondary: {
    backgroundColor: 'rgba(148,163,184,0.12)',
  },
  reviewButtonText: {
    fontWeight: '700',
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
    minHeight: 220,
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
