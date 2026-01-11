/**
 * Dashboard Screen
 *
 * The main home screen showing:
 * - Active session card (if one is running)
 * - XP counter with rolling animation
 * - Upcoming events suggestion
 * - Heatmap visualization
 * - Timeline of today's events
 * - Quick task list
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, ScrollView, Text, View, AccessibilityInfo } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { useSession } from '@/src/state/session';
import { InsightIcon } from '@/src/components/InsightIcon';
import { triggerHaptic } from '@/src/utils/haptics';

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { palette, sizes, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { active, stopSession, startSession } = useSession();
  const [now, setNow] = useState(Date.now());

  // Update clock every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = active ? now - active.startedAt : 0;

  const handleStopSession = async () => {
    triggerHaptic('success');
    await stopSession();
  };

  const handleStartQuickSession = async () => {
    triggerHaptic('medium');
    await startSession({
      title: 'Quick Focus',
      kind: 'event',
      startedAt: Date.now(),
      estimatedMinutes: 25,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        accessible
        accessibilityLabel="Dashboard screen"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[styles.headerTitle, { color: palette.text, fontSize: sizes.headerTitle }]}
            accessibilityRole="header"
          >
            Dashboard
          </Text>
          <Text style={[styles.headerSubtitle, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {/* Active Session Card */}
        {active ? (
          <Pressable
            style={[
              styles.activeCard,
              {
                backgroundColor: palette.tint,
                borderRadius: sizes.borderRadius,
              },
            ]}
            onPress={() => router.push('/focus')}
            accessibilityRole="button"
            accessibilityLabel={`Active session: ${active.title}. Elapsed time: ${formatClock(elapsed)}. Tap to view details.`}
            accessibilityHint="Opens the focus screen"
          >
            <View style={styles.activeCardHeader}>
              <Text style={[styles.activeTitle, { fontSize: sizes.bodyText }]}>{active.title}</Text>
              <Pressable
                onPress={handleStopSession}
                style={styles.stopButton}
                accessibilityRole="button"
                accessibilityLabel="Stop session"
              >
                <InsightIcon name="stop" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
            <Text style={[styles.activeClock, { fontSize: sizes.metricValue * 1.5 }]}>
              {formatClock(elapsed)}
            </Text>
            <View style={[styles.progressBar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: '#FFFFFF',
                    width: active.estimatedMinutes
                      ? `${Math.min(100, (elapsed / (active.estimatedMinutes * 60000)) * 100)}%`
                      : '0%',
                  },
                ]}
              />
            </View>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.startCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                borderRadius: sizes.borderRadius,
              },
            ]}
            onPress={handleStartQuickSession}
            accessibilityRole="button"
            accessibilityLabel="Start a quick focus session"
            accessibilityHint="Starts a 25 minute focus session"
          >
            <InsightIcon name="play" size={sizes.iconSize} color={palette.tint} />
            <Text style={[styles.startText, { color: palette.text, fontSize: sizes.bodyText }]}>
              Start Quick Focus
            </Text>
          </Pressable>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow} accessibilityRole="list" accessibilityLabel="Quick stats">
          <View
            style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            accessibilityRole="listitem"
            accessibilityLabel="0 experience points today"
          >
            <Text style={[styles.statValue, { color: palette.tint, fontSize: sizes.metricValue }]}>0</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>XP Today</Text>
          </View>
          <View
            style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            accessibilityRole="listitem"
            accessibilityLabel="0 day streak"
          >
            <Text style={[styles.statValue, { color: palette.success, fontSize: sizes.metricValue }]}>0</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>Streak</Text>
          </View>
          <View
            style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            accessibilityRole="listitem"
            accessibilityLabel="0 tasks completed"
          >
            <Text style={[styles.statValue, { color: palette.text, fontSize: sizes.metricValue }]}>0</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>Tasks</Text>
          </View>
        </View>

        {/* Section: Today's Events */}
        <View style={styles.section}>
          <Text
            style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle }]}
            accessibilityRole="header"
          >
            Today
          </Text>
          <View
            style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            accessibilityLabel="No events logged today"
          >
            <InsightIcon name="calendar" size={32} color={palette.textSecondary} />
            <Text style={[styles.emptyText, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
              No events logged today
            </Text>
          </View>
        </View>

        {/* Section: Tasks */}
        <View style={styles.section}>
          <Text
            style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle }]}
            accessibilityRole="header"
          >
            Tasks
          </Text>
          <View
            style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            accessibilityLabel="No upcoming tasks"
          >
            <InsightIcon name="check" size={32} color={palette.textSecondary} />
            <Text style={[styles.emptyText, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
              No upcoming tasks
            </Text>
          </View>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 4,
  },
  activeCard: {
    padding: 20,
    marginBottom: 20,
  },
  activeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  stopButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeClock: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 16,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  startCard: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  startText: {
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statValue: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    marginTop: 4,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  emptyText: {
    fontWeight: '500',
  },
});
