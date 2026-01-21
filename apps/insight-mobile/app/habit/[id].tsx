import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { Screen } from '@/components/Screen';
import { LuxCard } from '@/components/LuxCard';
import { LuxHeader } from '@/components/LuxHeader';
import { LuxPill } from '@/components/LuxPill';
import { useTheme } from '@/src/state/theme';
import { MobileHeatmap } from '@/src/components/MobileHeatmap';
import { RollingNumber } from '@/src/components/RollingNumber';
import { SPACING } from '@/src/constants/design-tokens';
import {
  getHabitWithStats,
  deleteHabit,
  type HabitWithStats,
} from '@/src/storage/habits';
import { startEvent, stopEvent } from '@/src/storage/events';

function formatDuration(minutes: number | null): string {
  if (!minutes) return 'No duration';
  if (minutes < 60) return `${minutes} minutes`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hours`;
}

export default function HabitDetailScreen() {
  const { palette, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const habitId = Array.isArray(id) ? id[0] : id;

  const [habit, setHabit] = useState<HabitWithStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!habitId) return;
    let mounted = true;
    getHabitWithStats(habitId).then((data) => {
      if (!mounted) return;
      setHabit(data);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [habitId]);

  const heatmapData = useMemo(() => {
    if (!habit?.heatmapData) return {};
    const result: Record<string, number> = {};
    for (const d of habit.heatmapData) {
      result[d.date] = d.value;
    }
    return result;
  }, [habit?.heatmapData]);

  const handleLogHabit = async () => {
    if (!habit) return;
    try {
      const event = await startEvent({
        title: habit.name,
        category: habit.category ?? 'Habit',
        subcategory: habit.subcategory ?? undefined,
        tags: habit.tags,
        trackerKey: `habit:${habit.id}`,
      });
      if (event) {
        await stopEvent(event.id);
      }
      // Refresh
      const updated = await getHabitWithStats(habit.id);
      setHabit(updated);
    } catch (err) {
      console.error('Failed to log habit:', err);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!habitId) return;
            try {
              await deleteHabit(habitId);
              router.back();
            } catch (err) {
              console.error('Failed to delete habit:', err);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <LuxCard style={styles.loadingCard}>
          <Text style={{ color: palette.textSecondary }}>Loading habit...</Text>
        </LuxCard>
      </Screen>
    );
  }

  if (!habit) {
    return (
      <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <LuxCard style={styles.loadingCard}>
          <Text style={{ color: palette.textSecondary }}>Habit not found</Text>
        </LuxCard>
      </Screen>
    );
  }

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <LuxHeader
          overline="Habit"
          title={habit.name}
          subtitle={habit.category ? `${habit.category}${habit.subcategory ? ` / ${habit.subcategory}` : ''}` : undefined}
          right={
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ color: palette.tint }}>Done</Text>
            </TouchableOpacity>
          }
        />

        {/* Icon & Quick Log */}
        <View style={styles.heroSection}>
          <View style={[styles.iconCircle, { backgroundColor: habit.color }]}>
            <Text style={styles.iconText}>{habit.icon ?? '✓'}</Text>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.statRow}>
              <Text style={styles.fireEmoji}>🔥</Text>
              <RollingNumber value={habit.streak} textStyle={[styles.statValue, { color: palette.text }]} />
              <Text style={[styles.statLabel, { color: palette.textSecondary }]}> day streak</Text>
            </View>
            <Text style={[styles.todayStatus, { color: palette.textSecondary }]}>
              {habit.todayLogs > 0 ? '✓ Done today' : 'Not yet today'}
            </Text>
          </View>
        </View>

        {/* Quick Log Button */}
        {habit.todayLogs === 0 && (
          <TouchableOpacity
            style={[styles.logButton, { backgroundColor: palette.tint }]}
            onPress={handleLogHabit}
          >
            <Text style={styles.logButtonText}>Log Now</Text>
          </TouchableOpacity>
        )}

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <LuxCard style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: palette.text }]}>{habit.totalPoints}</Text>
            <Text style={[styles.statCardLabel, { color: palette.textSecondary }]}>Total XP</Text>
          </LuxCard>
          <LuxCard style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: palette.text }]}>{habit.weekLogs}</Text>
            <Text style={[styles.statCardLabel, { color: palette.textSecondary }]}>This Week</Text>
          </LuxCard>
          <LuxCard style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: palette.text }]}>{formatDuration(habit.totalMinutes)}</Text>
            <Text style={[styles.statCardLabel, { color: palette.textSecondary }]}>Total Time</Text>
          </LuxCard>
        </View>

        {/* Heatmap */}
        <LuxCard style={styles.heatmapCard}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Activity</Text>
          <MobileHeatmap
            data={heatmapData}
            range="quarter"
            cellSize={12}
            gap={2}
            showMonthLabels
          />
        </LuxCard>

        {/* Details */}
        <LuxCard style={styles.detailsCard}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: palette.textSecondary }]}>Difficulty</Text>
            <Text style={{ color: palette.text }}>{habit.difficulty}/10</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: palette.textSecondary }]}>Importance</Text>
            <Text style={{ color: palette.text }}>{habit.importance}/10</Text>
          </View>
          {habit.estimateMinutes && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: palette.textSecondary }]}>Duration</Text>
              <Text style={{ color: palette.text }}>{formatDuration(habit.estimateMinutes)}</Text>
            </View>
          )}
          {habit.targetPerWeek && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: palette.textSecondary }]}>Target</Text>
              <Text style={{ color: palette.text }}>{habit.targetPerWeek}x per week</Text>
            </View>
          )}
          {habit.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {habit.tags.map((tag) => (
                <LuxPill key={tag} label={`#${tag}`} variant="ghost" />
              ))}
            </View>
          )}
        </LuxCard>

        {/* Delete */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete Habit</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.lg,
    paddingBottom: 40,
  },
  loadingCard: {
    padding: 28,
    alignItems: 'center',
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 36,
  },
  heroStats: {
    flex: 1,
    gap: SPACING.xs,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fireEmoji: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  todayStatus: {
    fontSize: 14,
    fontFamily: 'Figtree',
  },
  logButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  statCardLabel: {
    fontSize: 11,
    fontFamily: 'Figtree',
    marginTop: 4,
  },
  heatmapCard: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  detailsCard: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Figtree',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  deleteButton: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  deleteText: {
    color: '#D95D39',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
});
