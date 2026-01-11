/**
 * Focus Screen
 *
 * Full screen view for active focus sessions.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { useSession } from '@/src/state/session';
import { InsightIcon } from '@/src/components/InsightIcon';
import { triggerHaptic, triggerSuccess } from '@/src/utils/haptics';

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function FocusScreen() {
  const router = useRouter();
  const { palette, sizes } = useTheme();
  const insets = useSafeAreaInsets();
  const { active, stopSession, updateNotes, setLocked } = useSession();
  const [now, setNow] = useState(Date.now());
  const [notes, setNotes] = useState(active?.notes ?? '');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setNotes(active?.notes ?? '');
  }, [active?.notes]);

  const elapsed = active ? now - active.startedAt : 0;
  const remaining = active?.estimatedMinutes
    ? Math.max(0, active.estimatedMinutes * 60000 - elapsed)
    : null;

  const handleStop = async () => {
    triggerSuccess();
    await stopSession();
    router.back();
  };

  const handleNotesChange = (text: string) => {
    setNotes(text);
    updateNotes(text);
  };

  const handleBack = () => {
    triggerHaptic('light');
    router.back();
  };

  if (!active) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <InsightIcon name="chevronLeft" size={24} color={palette.text} />
          </Pressable>
        </View>
        <View style={styles.emptyContent}>
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No active session</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text, fontSize: sizes.sectionTitle }]}>
          Focus
        </Text>
        <Pressable
          onPress={() => setLocked(!active.locked)}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={active.locked ? 'Unlock session' : 'Lock session'}
        >
          <InsightIcon name="lock" size={20} color={active.locked ? palette.tint : palette.textSecondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Session Info */}
        <View style={styles.sessionInfo}>
          <Text style={[styles.sessionTitle, { color: palette.text, fontSize: sizes.headerTitle }]}>
            {active.title}
          </Text>
          <Text style={[styles.sessionKind, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
            {active.kind === 'task' ? 'Task' : 'Event'}
          </Text>
        </View>

        {/* Clock Display */}
        <View style={[styles.clockContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text
            style={[styles.clockLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}
          >
            ELAPSED
          </Text>
          <Text
            style={[styles.clock, { color: palette.text, fontSize: sizes.metricValue * 2 }]}
            accessibilityLabel={`Elapsed time: ${formatClock(elapsed)}`}
          >
            {formatClock(elapsed)}
          </Text>
          {remaining !== null && (
            <>
              <Text
                style={[styles.clockLabel, { color: palette.textSecondary, fontSize: sizes.tinyText, marginTop: 16 }]}
              >
                REMAINING
              </Text>
              <Text
                style={[styles.remainingClock, { color: palette.tint, fontSize: sizes.metricValue }]}
                accessibilityLabel={`Remaining time: ${formatClock(remaining)}`}
              >
                {formatClock(remaining)}
              </Text>
            </>
          )}
        </View>

        {/* Progress Bar */}
        {active.estimatedMinutes && (
          <View style={[styles.progressContainer, { backgroundColor: palette.borderLight }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: palette.tint,
                  width: `${Math.min(100, (elapsed / (active.estimatedMinutes * 60000)) * 100)}%`,
                },
              ]}
            />
          </View>
        )}

        {/* Notes Section */}
        <View style={styles.notesSection}>
          <Text style={[styles.notesLabel, { color: palette.text, fontSize: sizes.sectionTitle }]}>
            Notes
          </Text>
          <View style={[styles.notesContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <TextInput
              style={[styles.notesInput, { color: palette.text, fontSize: sizes.bodyText }]}
              multiline
              placeholder="Add notes about this session..."
              placeholderTextColor={palette.textSecondary}
              value={notes}
              onChangeText={handleNotesChange}
              accessibilityLabel="Session notes"
            />
          </View>
        </View>

        {/* Stop Button */}
        <Pressable
          onPress={handleStop}
          style={[styles.stopButton, { backgroundColor: palette.error }]}
          accessibilityRole="button"
          accessibilityLabel="Stop session"
        >
          <InsightIcon name="stop" size={24} color="#FFFFFF" />
          <Text style={[styles.stopText, { fontSize: sizes.bodyText }]}>Stop Session</Text>
        </Pressable>

        <View style={{ height: insets.bottom + 40 }} />
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
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontWeight: '500',
  },
  scrollContent: {
    padding: 20,
  },
  sessionInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sessionTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  sessionKind: {
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  clockContainer: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  clockLabel: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  clock: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  remainingClock: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    marginBottom: 24,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  notesSection: {
    marginBottom: 24,
  },
  notesLabel: {
    fontWeight: '700',
    marginBottom: 12,
  },
  notesContainer: {
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 120,
  },
  notesInput: {
    padding: 16,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  stopButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stopText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
