import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { addInboxCapture, updateInboxCapture, updateInboxCaptureText, type CaptureAttachment } from '@/src/storage/inbox';
import { getEvent, updateEvent } from '@/src/storage/events';
import { formatSegmentsPreview, parseCapture } from '@/src/lib/schema';
import { processInboxCapture } from '@/src/lib/capture/processor';
import { estimateWorkoutCalories, parseMealFromText, parseWorkoutFromText } from '@/src/lib/health';
import { invokeCaptureParse } from '@/src/supabase/functions';
import { upsertTranscriptSegment } from '@/src/supabase/segments';
import { uploadCaptureAudio } from '@/src/supabase/storage';
import { uniqStrings } from '@/src/supabase/helpers';
import { saveMeal } from '@/src/storage/nutrition';
import { saveWorkout } from '@/src/storage/workouts';
import { RECORDING_OPTIONS } from '@/src/lib/audio';

function normalizeCaptureText(rawText: string) {
  return rawText
    .split('\n')
    .map((line) => line.replace(/^- \\*\\*(\\d{1,2}:\\d{2})\\*\\* -\\s*/, '[$1] '))
    .join('\n')
    .trim();
}

function formatTimeMarker(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `[${hh}:${mm}] `;
}

const TIMESTAMP_LINE_RE = /^\[\d{2}:\d{2}(?::\d{2})?\]\s*$/;

function hasSemanticContent(text?: string | null) {
  if (!text || typeof text !== 'string') return false;
  return text.split('\n').some((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (TIMESTAMP_LINE_RE.test(trimmed)) return false;
    if (trimmed.startsWith('---')) return false;
    return true;
  });
}

export default function VoiceCaptureScreen() {
  const { eventId: eventIdParam } = useLocalSearchParams<{ eventId?: string | string[] }>();
  const appendEventId = Array.isArray(eventIdParam) ? eventIdParam[0] : eventIdParam;
  const { palette, sizes, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const startTokenRef = useRef(0);
  const isStartingRef = useRef(false);
  const fullTranscriptRef = useRef('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingState, setRecordingState] = useState<'starting' | 'recording' | 'processing'>('starting');
  const [displayText, setDisplayText] = useState('');
  const [initError, setInitError] = useState<string | null>(null);

  const markdownHint = useMemo(() => '#mood(8) +gym @person\n---', []);
  const maxDisplayChars = 4000;

  const updateTranscript = useCallback((next: string) => {
    fullTranscriptRef.current = next;
    if (next.length > maxDisplayChars) {
      setDisplayText(`...${next.slice(-maxDisplayChars)}`);
      return;
    }
    setDisplayText(next);
  }, []);

  const startRecording = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    const token = ++startTokenRef.current;
    setInitError(null);
    setRecordingState('starting');
    if (!Audio?.requestPermissionsAsync || !Audio?.Recording) {
      setInitError('Audio recording is not available in this build.');
      isStartingRef.current = false;
      return;
    }
    try {
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch {
          // ignore stop failures
        }
        recordingRef.current = null;
        setRecording(null);
      }
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission needed', 'Enable mic access to record audio.');
        setInitError('Microphone permission denied.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const next = new Audio.Recording();
      await next.prepareToRecordAsync(RECORDING_OPTIONS);
      await next.startAsync();
      if (token !== startTokenRef.current) {
        await next.stopAndUnloadAsync().catch(() => {});
        return;
      }
      recordingRef.current = next;
      setRecording(next);
      setRecordingState('recording');
    } catch (err) {
      console.error('Audio recording start failed', err);
      setInitError(err instanceof Error ? err.message : 'Unable to start audio recording.');
      setRecording(null);
      recordingRef.current = null;
    } finally {
      isStartingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void startRecording();
    return () => {
      startTokenRef.current += 1;
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, [startRecording]);

  useEffect(() => {
    if (recordingState !== 'recording') return;
    const prev = fullTranscriptRef.current || '';
    const trimmed = prev.trimEnd();
    if (!trimmed) {
      updateTranscript(formatTimeMarker());
      return;
    }
    const lastLine = trimmed.split('\n').pop() ?? '';
    if (TIMESTAMP_LINE_RE.test(lastLine.trim())) return;
    updateTranscript(`${trimmed}\n${formatTimeMarker()}`);
  }, [recordingState, updateTranscript]);

  const transcribeVoiceAttachment = useCallback(
    async (captureId: string, attachment: CaptureAttachment) => {
      if (!attachment.uri) return '';
      let nextAttachment = attachment;
      try {
        const upload = await uploadCaptureAudio({
          captureId,
          attachmentId: attachment.id,
          uri: attachment.uri,
        });

        nextAttachment = {
          ...attachment,
          status: 'pending',
          metadata: {
            ...attachment.metadata,
            storageBucket: upload.bucket,
            storagePath: upload.path,
            contentType: upload.contentType,
            byteSize: upload.size,
          },
        };
        await updateInboxCapture(captureId, { attachments: [nextAttachment] });

        const result = await invokeCaptureParse({
          captureId,
          audioBucket: upload.bucket,
          audioPath: upload.path,
          context: { activeEntryId: appendEventId ?? null },
          mode: 'transcribe_only',
        });

        if (typeof result?.transcript === 'string' && result.transcript.trim()) {
          const transcriptText = result.transcript.trim();
          await updateInboxCaptureText(captureId, transcriptText);
          await upsertTranscriptSegment(captureId, transcriptText);
          const parsed = parseCapture(transcriptText);
          const processed = parsed.segments.length ? formatSegmentsPreview(parsed.segments) : transcriptText;
          await updateInboxCapture(captureId, {
            processedText: processed,
            tags: uniqStrings(parsed.tokens.tags),
            contexts: uniqStrings(parsed.tokens.contexts),
            people: uniqStrings(parsed.tokens.people),
            attachments: [
              {
                ...nextAttachment,
                status: 'ready',
                transcription: transcriptText,
              },
            ],
          });
          return transcriptText;
        }

        await updateInboxCapture(captureId, {
          attachments: [
            {
              ...nextAttachment,
              status: 'ready',
            },
          ],
        });
        return '';
      } catch (err) {
        console.error('Transcription failed', err);
        const message = err instanceof Error ? err.message : 'Transcription failed.';
        if (/Supabase session not available/i.test(message)) {
          Alert.alert('Transcription unavailable', 'Sign in to Supabase or enable anonymous auth in your project.');
        } else if (/Edge Function error \\(404\\)/i.test(message) || /not found/i.test(message)) {
          Alert.alert('Transcription unavailable', 'Edge Function not deployed. Deploy "transcribe_and_parse_capture" in Supabase.');
        } else if (/Edge Function error \\(401\\)|unauthorized|session expired/i.test(message)) {
          Alert.alert('Transcription unavailable', 'Supabase auth failed. Please sign in again.');
        }
        await updateInboxCapture(captureId, {
          attachments: [
            {
              ...nextAttachment,
              status: 'failed',
              transcription: 'Transcription failed.',
            },
          ],
        });
        return '';
      }
    },
    [appendEventId]
  );

  const finishCapture = useCallback(
    async (rawTranscript: string, attachment?: CaptureAttachment | null) => {
      const trimmed = rawTranscript.trim();
      const normalized = hasSemanticContent(trimmed) ? normalizeCaptureText(trimmed) : '';
      const captureText = normalized || '[Audio capture pending transcription]';
      const saved = await addInboxCapture(captureText, attachment ? [attachment] : []);
      let transcriptForAppend = normalized;
      if (!normalized && attachment?.uri) {
        transcriptForAppend = await transcribeVoiceAttachment(saved.id, attachment);
      }

      const healthText = transcriptForAppend || normalized;
      if (healthText) {
        const parsedWorkout = parseWorkoutFromText(healthText);
        if (parsedWorkout) {
          const derivedDuration = Math.round(
            parsedWorkout.exercises.flatMap((ex) => ex.sets).reduce((sum, set) => sum + (set.duration ?? 0), 0) / 60,
          );
          const durationMinutes = parsedWorkout.totalDuration ?? (derivedDuration ? derivedDuration : undefined);
          const startAt = saved.createdAt ?? Date.now();
          const endAt = durationMinutes ? startAt + durationMinutes * 60 * 1000 : startAt;
          const typeLabel = parsedWorkout.type ?? 'mixed';
          const defaultTitle =
            typeLabel === 'cardio'
              ? 'Cardio'
              : typeLabel === 'strength'
                ? 'Strength'
                : typeLabel === 'mobility'
                  ? 'Mobility'
                  : typeLabel === 'recovery'
                    ? 'Recovery'
                    : 'Workout';
          const title =
            parsedWorkout.exercises.length === 1
              ? parsedWorkout.exercises[0].name
              : `${defaultTitle} Workout`;
          const estimatedCalories = estimateWorkoutCalories({
            type: parsedWorkout.type ?? 'mixed',
            exercises: parsedWorkout.exercises,
            overallRpe: parsedWorkout.overallRpe,
          });

          await saveWorkout({
            id: `wrk_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            title,
            type: parsedWorkout.type ?? 'mixed',
            exercises: parsedWorkout.exercises,
            startAt,
            endAt,
            totalDuration: durationMinutes,
            estimatedCalories: estimatedCalories || undefined,
            overallRpe: parsedWorkout.overallRpe,
            sourceCaptureId: saved.id,
          });
        }

        const parsedMeal = parseMealFromText(healthText);
        if (parsedMeal) {
          const now = saved.createdAt ?? Date.now();
          const mealTitle =
            parsedMeal.items.length === 1
              ? parsedMeal.items[0].name
              : parsedMeal.type === 'breakfast'
                ? 'Breakfast'
                : parsedMeal.type === 'lunch'
                  ? 'Lunch'
                  : parsedMeal.type === 'dinner'
                    ? 'Dinner'
                    : parsedMeal.type === 'drink'
                      ? 'Drink'
                      : 'Snack';
          await saveMeal({
            id: `meal_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            title: mealTitle,
            type: parsedMeal.type,
            items: parsedMeal.items,
            totalCalories: Math.round(parsedMeal.totalCalories ?? 0),
            macros: {
              protein: Math.round(parsedMeal.macros.protein ?? 0),
              carbs: Math.round(parsedMeal.macros.carbs ?? 0),
              fat: Math.round(parsedMeal.macros.fat ?? 0),
              fiber: parsedMeal.macros.fiber ? Math.round(parsedMeal.macros.fiber) : undefined,
            },
            eatenAt: now,
            createdAt: now,
            updatedAt: now,
            sourceCaptureId: saved.id,
          });
        }
      }
      if (!appendEventId && (transcriptForAppend || normalized)) {
        try {
          const rawText = transcriptForAppend || normalized;
          const processed = await processInboxCapture({ ...saved, rawText });
          if (processed.primaryEventId) {
            router.replace(`/event/${encodeURIComponent(processed.primaryEventId)}`);
            return;
          }
        } catch (err) {
          console.warn('Voice auto-parse failed', err);
        }
      }
      if (appendEventId) {
        const existing = await getEvent(appendEventId);
        const mergedNotes = [existing?.notes, transcriptForAppend || captureText].filter(Boolean).join('\n\n');
        const updated = await updateEvent(appendEventId, { notes: mergedNotes });
        if (updated) {
          router.replace(`/event/${encodeURIComponent(appendEventId)}`);
          return;
        }
        Alert.alert('Append failed', 'Saved to your inbox, but could not append to this event.');
        router.back();
        return;
      }
      router.back();
    },
    [appendEventId]
  );

  const stopRecording = useCallback(async () => {
    if (recordingState !== 'recording') return;
    if (!recording) {
      router.back();
      return;
    }
    setRecordingState('processing');
    try {
      await recording.stopAndUnloadAsync();
      recordingRef.current = null;
      const uri = recording.getURI();
      const attachment = uri
        ? ({
            id: `att_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            type: 'audio',
            createdAt: Date.now(),
            status: 'pending',
            uri,
            label: 'Voice memo',
            transcription: 'Whisper transcription queued.',
            metadata: { provider: 'whisper' },
          } satisfies CaptureAttachment)
        : null;
      await finishCapture(fullTranscriptRef.current.trim(), attachment);
    } catch {
      Alert.alert('Recording failed', 'Unable to stop the recording.');
      setRecordingState('recording');
    } finally {
      setRecording(null);
    }
  }, [finishCapture, recording, recordingState]);

  const cancelRecording = useCallback(async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // ignore stop failures
      }
      recordingRef.current = null;
    }
    setRecording(null);
    router.back();
  }, []);

  const hasContent = useMemo(() => hasSemanticContent(fullTranscriptRef.current), [displayText]);
  const previewText = useMemo(() => {
    if (hasContent) return displayText;
    const trimmed = displayText.trim();
    return [trimmed, markdownHint].filter(Boolean).join('\n');
  }, [hasContent, displayText, markdownHint]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.background, paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
      ]}>
      <View style={styles.header}>
        <Pressable onPress={cancelRecording} style={styles.cancelButton}>
          <Text style={[styles.cancelText, { color: palette.textSecondary }]}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        {initError ? (
          <View style={styles.errorCard}>
            <Text style={[styles.errorTitle, { color: palette.text }]}>Recording unavailable</Text>
            <Text style={[styles.errorBody, { color: palette.textSecondary }]}>{initError}</Text>
            <Pressable
              style={[styles.retryButton, { borderColor: palette.border }]}
              onPress={() => void startRecording()}>
              <Text style={[styles.retryText, { color: palette.text }]}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            style={styles.transcriptScroll}
            contentContainerStyle={styles.transcriptContent}
            showsVerticalScrollIndicator={false}>
            <Text style={[styles.transcriptText, { color: palette.text }]}>{previewText}</Text>
          </ScrollView>
        )}
      </View>

      <Pressable
        style={[styles.stopButton, { backgroundColor: palette.tint }, recordingState !== 'recording' && styles.stopButtonDisabled]}
        onPress={stopRecording}
        disabled={recordingState !== 'recording'}>
        <View style={styles.stopInner} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    paddingHorizontal: 28,
  },
  transcriptContent: {
    paddingBottom: 20,
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptText: {
    fontSize: 20,
    fontWeight: '400',
    fontFamily: 'SpaceMono',
    lineHeight: 30,
  },
  stopButton: {
    alignSelf: 'center',
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopInner: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  stopButtonDisabled: {
    opacity: 0.6,
  },
  errorCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    padding: 18,
    gap: 10,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  errorBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
