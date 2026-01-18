import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/Themed';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/src/state/theme';
import { useSession } from '@/src/state/session';
import { ProgressRingLarge } from '@/src/components/ProgressRingLarge';
import { InsightIcon } from '@/src/components/InsightIcon';

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatEndTime(endAt: number): string {
  const date = new Date(endAt);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
}

// Placeholder for next task - in a real implementation this would come from a schedule/agenda
type NextTask = {
  title: string;
  icon: string;
  endTime: number;
};

export default function FocusTimerScreen() {
  const { palette, sizes } = useTheme();
  const { active, stopSession, startSession } = useSession();
  const [now, setNow] = useState(Date.now());
  const [isPaused, setIsPaused] = useState(false);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate timer values
  const elapsedMs = active ? now - active.startedAt : 0;
  const totalMs = active?.estimatedMinutes ? active.estimatedMinutes * 60 * 1000 : null;
  const remainingMs = totalMs != null ? Math.max(0, totalMs - elapsedMs) : elapsedMs;
  const progress = totalMs ? Math.min(1, elapsedMs / totalMs) : 0;

  // Estimated end time
  const estimatedEndTime = useMemo(() => {
    if (!active) return null;
    if (active.endAt) return active.endAt;
    if (active.estimatedMinutes) {
      return active.startedAt + active.estimatedMinutes * 60 * 1000;
    }
    return null;
  }, [active]);

  // Get icon for current activity
  const activityIcon = useMemo(() => {
    if (!active) return null;
    // Map common activities to emojis
    const title = active.title.toLowerCase();
    if (title.includes('water') || title.includes('drink')) return '\u{1F4A7}';
    if (title.includes('stretch') || title.includes('yoga')) return '\u{1F9D8}';
    if (title.includes('meditat')) return '\u{1F9D8}';
    if (title.includes('work') || title.includes('focus')) return '\u{1F4BB}';
    if (title.includes('exercise') || title.includes('workout')) return '\u{1F3CB}';
    if (title.includes('read')) return '\u{1F4D6}';
    if (title.includes('eat') || title.includes('meal') || title.includes('lunch') || title.includes('dinner')) return '\u{1F37D}';
    if (title.includes('sleep') || title.includes('nap')) return '\u{1F634}';
    if (title.includes('walk')) return '\u{1F6B6}';
    if (title.includes('coffee') || title.includes('tea')) return '\u{2615}';
    return '\u{23F0}'; // Default clock emoji
  }, [active]);

  // Mock next task (in production, this would come from agenda/schedule)
  const nextTask: NextTask | null = useMemo(() => {
    if (!active) return null;
    // This is a placeholder - in a real app, query the next scheduled item
    return {
      title: 'Stretch',
      icon: '\u{1F9D8}',
      endTime: Date.now() + 30 * 60 * 1000, // 30 min from now
    };
  }, [active]);

  // Haptic feedback helper
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'success' = 'light') => {
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
    }
  }, []);

  // Handle pause/resume
  const handlePause = useCallback(() => {
    triggerHaptic('medium');
    setIsPaused((prev) => !prev);
    // In a real implementation, this would pause the timer and live activity
  }, [triggerHaptic]);

  // Handle complete (check)
  const handleComplete = useCallback(async () => {
    triggerHaptic('success');
    await stopSession();
    router.back();
  }, [stopSession, triggerHaptic]);

  // Handle skip
  const handleSkip = useCallback(async () => {
    triggerHaptic('medium');
    await stopSession();
    // In a real implementation, start the next task if available
    if (nextTask) {
      // Start next task
    }
    router.back();
  }, [stopSession, nextTask, triggerHaptic]);

  // Handle close
  const handleClose = useCallback(() => {
    triggerHaptic('light');
    router.back();
  }, [triggerHaptic]);

  if (!active) {
    return (
      <Screen style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
            No active session
          </Text>
          <Pressable
            style={[styles.backButton, { backgroundColor: palette.tint }]}
            onPress={handleClose}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.focusDot, { backgroundColor: palette.success }]} />
          <Text style={[styles.headerTitle, { color: palette.text, fontSize: sizes.bodyText }]}>
            Focus
          </Text>
        </View>
        <Pressable onPress={handleClose} style={styles.closeButton} hitSlop={12}>
          <Text style={[styles.closeIcon, { color: palette.textSecondary }]}>{'\u2715'}</Text>
        </Pressable>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Task Title */}
        <Text style={[styles.taskTitle, { color: palette.text, fontSize: sizes.headerTitle }]}>
          {active.title}
        </Text>

        {/* Activity Icon */}
        <Text style={styles.activityIcon}>{activityIcon}</Text>

        {/* Progress Ring */}
        <View style={styles.ringContainer}>
          <ProgressRingLarge
            progress={progress}
            size={200}
            strokeWidth={12}
            color={palette.tint}
          >
            <View style={styles.ringContent}>
              <Text style={[styles.countdown, { color: palette.text }]}>
                {totalMs ? formatCountdown(remainingMs) : formatCountdown(elapsedMs)}
              </Text>
              {active.estimatedMinutes && (
                <Text style={[styles.duration, { color: palette.textSecondary }]}>
                  {formatDuration(active.estimatedMinutes)}
                </Text>
              )}
            </View>
          </ProgressRingLarge>
        </View>

        {/* Control Buttons */}
        <View style={styles.controls}>
          {/* Pause Button */}
          <Pressable
            onPress={handlePause}
            style={[
              styles.controlButton,
              styles.secondaryButton,
              { borderColor: palette.border },
            ]}
          >
            <Text style={[styles.controlIcon, { color: palette.text }]}>
              {isPaused ? '\u25B6' : '\u23F8'}
            </Text>
            <Text style={[styles.controlLabel, { color: palette.textSecondary }]}>
              {isPaused ? 'Resume' : 'Pause'}
            </Text>
          </Pressable>

          {/* Complete Button */}
          <Pressable
            onPress={handleComplete}
            style={[
              styles.controlButton,
              styles.primaryButton,
              { backgroundColor: palette.tint },
            ]}
          >
            <InsightIcon name="check" size={sizes.iconSize} color="#FFFFFF" />
            <Text style={styles.controlLabelLight}>Check</Text>
          </Pressable>

          {/* Skip Button */}
          <Pressable
            onPress={handleSkip}
            style={[
              styles.controlButton,
              styles.secondaryButton,
              { borderColor: palette.border },
            ]}
          >
            <Text style={[styles.controlIcon, { color: palette.text }]}>{'\u23ED'}</Text>
            <Text style={[styles.controlLabel, { color: palette.textSecondary }]}>Skip</Text>
          </Pressable>
        </View>

        {/* Up Next */}
        {nextTask && (
          <View style={[styles.upNext, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.upNextLabel, { color: palette.textSecondary }]}>Up next:</Text>
            <Text style={[styles.upNextTitle, { color: palette.text }]}>
              {nextTask.icon} {nextTask.title}
            </Text>
            {estimatedEndTime && (
              <Text style={[styles.upNextTime, { color: palette.textSecondary }]}>
                (Ends at {formatEndTime(estimatedEndTime)})
              </Text>
            )}
          </View>
        )}
      </View>
    </Screen>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  focusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerTitle: {
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 24,
  },
  taskTitle: {
    fontWeight: '800',
    fontFamily: 'Figtree',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  activityIcon: {
    fontSize: 48,
  },
  ringContainer: {
    marginVertical: 20,
  },
  ringContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  countdown: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: 'Figtree',
    letterSpacing: -1,
  },
  duration: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    minWidth: 80,
  },
  primaryButton: {
    paddingVertical: 20,
    paddingHorizontal: 28,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  controlIcon: {
    fontSize: 20,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  controlLabelLight: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
  upNext: {
    marginTop: 'auto',
    marginBottom: 40,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
    width: '100%',
    maxWidth: 300,
  },
  upNextLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  upNextTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  upNextTime: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
});
