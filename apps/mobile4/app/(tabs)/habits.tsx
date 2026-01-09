import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { HabitCard } from '@/src/components/HabitCard';
import { useSession } from '@/src/state/session';
import {
  listHabitsWithStats,
  calculateHabitPoints,
  type HabitWithStats,
} from '@/src/storage/habits';
import { startEvent } from '@/src/storage/events';

export default function HabitsScreen() {
  const { palette, sizes, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { active, startSession } = useSession();

  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHabits = useCallback(async () => {
    try {
      const data = await listHabitsWithStats();
      setHabits(data);
    } catch (error) {
      console.error('Failed to load habits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadHabits();
  }, [loadHabits]);

  const handleQuickLog = useCallback(
    async (habit: HabitWithStats, positive: boolean) => {
      const trackerKey = positive ? `habit:${habit.id}` : `habit:${habit.id}:neg`;
      const points = positive ? calculateHabitPoints(habit) : 0;

      try {
        await startEvent({
          title: habit.name,
          kind: 'log',
          startAt: Date.now(),
          endAt: Date.now(),
          trackerKey,
          points,
          category: habit.category,
          subcategory: habit.subcategory,
          importance: habit.importance,
          difficulty: habit.difficulty,
          // Pass all extended fields from habit definition
          tags: habit.tags ?? [],
          people: habit.people ?? [],
          location: habit.location ?? null,
          skills: habit.skills ?? [],
          character: habit.character ?? [],
          goal: habit.goal ?? null,
          project: habit.project ?? null,
          estimateMinutes: habit.estimateMinutes ?? null,
        });
        // Refresh to update stats
        loadHabits();
      } catch (error) {
        console.error('Failed to log habit:', error);
        Alert.alert('Error', 'Failed to log habit. Please try again.');
      }
    },
    [loadHabits]
  );

  const handleStartTimed = useCallback(
    async (habit: HabitWithStats) => {
      if (active?.locked) {
        Alert.alert('Tracker locked', 'Unlock the current focus session to switch activities.');
        return;
      }

      const startTimedHabit = async () => {
        await startSession({
          title: habit.name,
          kind: 'event',
          startedAt: Date.now(),
          category: habit.category,
          subcategory: habit.subcategory,
          importance: habit.importance,
          difficulty: habit.difficulty,
          trackerKey: `habit:${habit.id}`,
          // Pass all extended fields from habit definition
          tags: habit.tags ?? [],
          people: habit.people ?? [],
          location: habit.location ?? null,
          skills: habit.skills ?? [],
          character: habit.character ?? [],
          goal: habit.goal ?? null,
          project: habit.project ?? null,
          estimateMinutes: habit.estimateMinutes ?? null,
        });
        router.push('/focus');
      };

      if (active) {
        Alert.alert(
          'Switch activity?',
          `You are currently tracking "${active.title}". Start "${habit.name}" instead?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Start', style: 'default', onPress: startTimedHabit },
          ]
        );
        return;
      }

      startTimedHabit();
    },
    [active, startSession]
  );

  const handleHabitPress = useCallback((habit: HabitWithStats) => {
    router.push(`/habit/${habit.id}` as any);
  }, []);

  const handleAddHabit = useCallback(() => {
    router.push('/habit-form' as any);
  }, []);

  // Calculate total stats
  const totalStreaks = habits.reduce((sum, h) => sum + h.streak, 0);
  const totalPoints = habits.reduce((sum, h) => sum + h.totalPoints, 0);
  const activeHabitsToday = habits.filter((h) => h.todayLogs > 0).length;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + sizes.spacingSmall, paddingBottom: insets.bottom + 100, padding: sizes.spacing, gap: sizes.spacing },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.tint} />
        }>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.titleRow, { gap: sizes.spacingSmall }]}>
            <View
              style={[
                styles.nodeBadge,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.tintLight,
                  width: sizes.buttonHeightSmall,
                  height: sizes.buttonHeightSmall,
                  borderRadius: sizes.buttonHeightSmall / 2,
                },
              ]}>
              <Text style={[styles.nodeBadgeText, { color: palette.tint, fontSize: sizes.bodyText }]}>H</Text>
            </View>
            <Text style={[styles.headerTitle, { color: palette.text, fontSize: sizes.headerTitle + 6 }]}>Habits</Text>
          </View>
          <Pressable
            onPress={handleAddHabit}
            style={[
              styles.addButton,
              {
                backgroundColor: palette.tint,
                width: sizes.buttonHeightSmall,
                height: sizes.buttonHeightSmall,
                borderRadius: sizes.buttonHeightSmall / 2,
              }
            ]}>
            <InsightIcon name="plus" size={sizes.iconSizeSmall} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, { gap: sizes.spacingSmall }]}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: isDark ? 'rgba(251,146,60,0.12)' : 'rgba(251,146,60,0.08)',
                padding: sizes.cardPadding - 2,
                borderRadius: sizes.borderRadiusSmall,
                gap: sizes.spacingSmall / 2,
              },
            ]}>
            <Text style={[styles.statValue, { color: palette.warning, fontSize: sizes.metricValue }]}>{totalStreaks}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary, fontSize: sizes.metricLabel }]}>Total Streaks</Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)',
                padding: sizes.cardPadding - 2,
                borderRadius: sizes.borderRadiusSmall,
                gap: sizes.spacingSmall / 2,
              },
            ]}>
            <Text style={[styles.statValue, { color: palette.success, fontSize: sizes.metricValue }]}>{activeHabitsToday}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary, fontSize: sizes.metricLabel }]}>Done Today</Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: palette.tintLight,
                padding: sizes.cardPadding - 2,
                borderRadius: sizes.borderRadiusSmall,
                gap: sizes.spacingSmall / 2,
              },
            ]}>
            <Text style={[styles.statValue, { color: palette.tint, fontSize: sizes.metricValue }]}>{Math.round(totalPoints)}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary, fontSize: sizes.metricLabel }]}>Total XP</Text>
          </View>
        </View>

        {/* Habits List */}
        <View style={[styles.habitsSection, { gap: sizes.cardGap }]}>
          <Text style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle }]}>Your Habits</Text>

          {loading ? (
            <View style={[styles.emptyState, { paddingVertical: sizes.spacing * 2 }]}>
              <Text style={[styles.emptyText, { color: palette.textSecondary, fontSize: sizes.bodyText }]}>Loading habits...</Text>
            </View>
          ) : habits.length === 0 ? (
            <View style={[styles.emptyState, { paddingVertical: sizes.spacing * 2, gap: sizes.rowGap }]}>
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor: palette.borderLight,
                    width: sizes.iconSize * 3,
                    height: sizes.iconSize * 3,
                    borderRadius: sizes.iconSize * 1.5,
                  }
                ]}>
                <InsightIcon name="sparkle" size={sizes.iconSize + 8} color={palette.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.text, fontSize: sizes.sectionTitle }]}>No habits yet</Text>
              <Text style={[styles.emptyText, { color: palette.textSecondary, fontSize: sizes.bodyText }]}>
                Create habits here or open the desktop app to sync existing habits
              </Text>
              <Pressable
                onPress={handleAddHabit}
                style={[
                  styles.emptyButton,
                  {
                    backgroundColor: palette.tint,
                    borderRadius: sizes.borderRadiusSmall,
                    paddingHorizontal: sizes.spacing,
                    paddingVertical: sizes.spacingSmall,
                    gap: sizes.spacingSmall / 2,
                  }
                ]}>
                <InsightIcon name="plus" size={sizes.iconSizeTiny} color="#FFFFFF" />
                <Text style={[styles.emptyButtonText, { fontSize: sizes.bodyText }]}>Create Habit</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.habitsList, { gap: sizes.rowGap }]}>
              {habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  streak={habit.streak}
                  heatmapData={habit.heatmapData}
                  todayLogs={habit.todayLogs}
                  onPlus={() => handleQuickLog(habit, true)}
                  onMinus={() => handleQuickLog(habit, false)}
                  onStartTimed={habit.isTimed ? () => handleStartTimed(habit) : undefined}
                  onPress={() => handleHabitPress(habit)}
                />
              ))}
            </View>
          )}
        </View>
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
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nodeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(217,93,57,0.12)',
  },
  nodeBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D95D39',
    fontFamily: 'Figtree',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  habitsSection: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  habitsList: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Figtree',
    textAlign: 'center',
    maxWidth: 240,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
});
