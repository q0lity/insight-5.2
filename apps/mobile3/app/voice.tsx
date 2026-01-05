import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { addInboxCapture, type CaptureAttachment } from '@/src/storage/inbox';
import { getEvent, updateEvent } from '@/src/storage/events';
import { invokeCaptureParse } from '@/src/supabase/functions';

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
  const fullTranscriptRef = useRef('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingState, setRecordingState] = useState<'starting' | 'recording' | 'processing'>('starting');
  const [displayText, setDisplayText] = useState('');

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
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission needed', 'Enable mic access to record audio.');
        router.back();
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const next = new Audio.Recording();
      await next.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await next.startAsync();
      recordingRef.current = next;
      setRecording(next);
      setRecordingState('recording');
    } catch {
      Alert.alert('Recording failed', 'Unable to start audio recording.');
      router.back();
    }
  }, []);

  useEffect(() => {
    void startRecording();
    return () => {
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

  const finishCapture = useCallback(
    async (rawTranscript: string, attachment?: CaptureAttachment | null) => {
      const trimmed = rawTranscript.trim();
      const normalized = hasSemanticContent(trimmed) ? normalizeCaptureText(trimmed) : '';
      const captureText = normalized || '[Audio capture pending transcription]';
      const saved = await addInboxCapture(captureText, attachment ? [attachment] : []);
      if (normalized) {
        try {
          await invokeCaptureParse({
            captureId: saved.id,
            transcript: normalized,
            context: { activeEntryId: appendEventId ?? null },
          });
        } catch {
          // ignore server-side parse failures
        }
      }
      if (appendEventId) {
        const existing = await getEvent(appendEventId);
        const mergedNotes = [existing?.notes, captureText].filter(Boolean).join('\n\n');
        await updateEvent(appendEventId, { notes: mergedNotes });
        router.replace(`/event/${appendEventId}`);
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
            transcription: 'Supabase transcription queued.',
            metadata: { provider: 'supabase' },
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
        <ScrollView style={styles.transcriptScroll} contentContainerStyle={styles.transcriptContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.transcriptText, { color: palette.text }]}>{previewText}</Text>
        </ScrollView>
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
});
