import { useState, useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, View, Pressable } from 'react-native';
import { Text } from '@/components/Themed';
import { Screen } from '@/components/Screen';
import { LuxCard } from '@/components/LuxCard';
import { LuxHeader } from '@/components/LuxHeader';
import { LuxPill } from '@/components/LuxPill';
import { useTheme } from '@/src/state/theme';
import { ProgressRingLarge } from '@/src/components/ProgressRingLarge';
import { RoutineItem } from '@/src/components/RoutineItem';
import { RollingNumber } from '@/src/components/RollingNumber';
import { SPACING } from '@/src/constants/design-tokens';

type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Anytime';

type MockHabit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  timeOfDay: TimeOfDay;
  duration?: string;
  frequency?: string;
  completed: boolean;
};

// Mock data for demonstration
const initialMockHabits: MockHabit[] = [
  { id: '1', name: 'Drink water', icon: '💧', color: '#3B82F6', timeOfDay: 'Morning', frequency: 'x3', completed: true },
  { id: '2', name: 'Meditate', icon: '🧘', color: '#8B5CF6', timeOfDay: 'Morning', duration: '10m', completed: true },
  { id: '3', name: 'Read', icon: '📖', color: '#E26B3A', timeOfDay: 'Morning', duration: '20m', completed: false },
  { id: '4', name: 'Walk', icon: '🚶', color: '#22C55E', timeOfDay: 'Anytime', duration: '10m', completed: false },
  { id: '5', name: 'Exercise', icon: '💪', color: '#EC4899', timeOfDay: 'Anytime', duration: '30m', completed: false },
  { id: '6', name: 'Journal', icon: '📝', color: '#F59E0B', timeOfDay: 'Evening', duration: '15m', completed: true },
  { id: '7', name: 'Review day', icon: '🌙', color: '#6366F1', timeOfDay: 'Evening', duration: '5m', completed: false },
  { id: '8', name: 'Stretch', icon: '🤸', color: '#14B8A6', timeOfDay: 'Afternoon', duration: '10m', completed: false },
];

const TIME_OF_DAY_ORDER: TimeOfDay[] = ['Morning', 'Afternoon', 'Evening', 'Anytime'];

export default function HabitsScreen() {
  const { palette, sizes } = useTheme();
  const [habits, setHabits] = useState<MockHabit[]>(initialMockHabits);

  // Calculate stats
  const completedCount = useMemo(() => habits.filter((h) => h.completed).length, [habits]);
  const totalCount = habits.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const streak = 12; // Mock streak value

  // Group habits by time of day
  const groupedHabits = useMemo(() => {
    const groups: Record<TimeOfDay, MockHabit[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
      Anytime: [],
    };
    habits.forEach((habit) => {
      groups[habit.timeOfDay].push(habit);
    });
    return groups;
  }, [habits]);

  // Toggle habit completion
  const handleToggle = useCallback((habitId: string) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === habitId ? { ...h, completed: !h.completed } : h))
    );
  }, []);

  // Handle habit press (navigate to detail)
  const handleHabitPress = useCallback((habitId: string) => {
    // TODO: Navigate to habit detail screen
    console.log('Navigate to habit:', habitId);
  }, []);

  const hasHabits = habits.length > 0;

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { gap: SPACING.lg }]}>
        <LuxHeader
          overline="Habits"
          title="Daily Streaks"
          subtitle="Build consistency with trackable habits"
          right={<LuxPill label="+ Add" variant="accent" />}
        />

        {hasHabits ? (
          <>
            {/* Hero Stats Section */}
            <View style={styles.heroSection}>
              {/* Progress Ring */}
              <ProgressRingLarge progress={progress} size={120} strokeWidth={10}>
                <View style={styles.ringContent}>
                  <Text style={[styles.ringValue, { color: palette.text }]}>
                    {completedCount}/{totalCount}
                  </Text>
                  <Text style={[styles.ringLabel, { color: palette.textSecondary }]}>done</Text>
                </View>
              </ProgressRingLarge>

              {/* Stats Column */}
              <View style={styles.statsColumn}>
                {/* Today Progress */}
                <Text style={[styles.todayLabel, { color: palette.textSecondary }]}>
                  Today: {completedCount}/{totalCount}
                </Text>

                {/* Progress Bar */}
                <View style={[styles.progressBarContainer, { backgroundColor: palette.border }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: palette.tint,
                        width: `${completionPercentage}%`,
                      },
                    ]}
                  />
                </View>

                {/* Percentage */}
                <Text style={[styles.percentageText, { color: palette.text }]}>
                  {completionPercentage}%
                </Text>

                {/* Streak */}
                <View style={styles.streakRow}>
                  <Text style={styles.fireEmoji}>🔥</Text>
                  <RollingNumber
                    value={streak}
                    textStyle={[styles.streakValue, { color: palette.text }]}
                  />
                  <Text style={[styles.streakLabel, { color: palette.textSecondary }]}>
                    {' '}day streak
                  </Text>
                </View>
              </View>
            </View>

            {/* Habit Groups */}
            {TIME_OF_DAY_ORDER.map((timeOfDay) => {
              const groupHabits = groupedHabits[timeOfDay];
              if (groupHabits.length === 0) return null;

              return (
                <View key={timeOfDay} style={{ gap: SPACING.md }}>
                  {/* Section Header */}
                  <Text style={[styles.sectionHeader, { color: palette.text }]}>{timeOfDay}</Text>

                  {/* Habits List */}
                  <View style={{ gap: SPACING.sm }}>
                    {groupHabits.map((habit) => (
                      <RoutineItem
                        key={habit.id}
                        icon={habit.icon}
                        iconColor={habit.color}
                        title={habit.name}
                        duration={habit.duration || habit.frequency}
                        completed={habit.completed}
                        onToggle={() => handleToggle(habit.id)}
                        onPress={() => handleHabitPress(habit.id)}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          /* Empty State */
          <LuxCard style={[styles.emptyState, { gap: SPACING.md }]}>
            <Text style={[styles.emptyTitle, { fontSize: sizes.sectionTitle }]}>No Habits Yet</Text>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              Create habits to build consistency, show streaks, and sync to your calendar.
            </Text>
            <LuxPill label="Create your first habit" variant="accent" />
          </LuxCard>
        )}
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
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  ringContent: {
    alignItems: 'center',
  },
  ringValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
  },
  ringLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
    marginTop: 2,
  },
  statsColumn: {
    flex: 1,
    gap: SPACING.sm,
  },
  todayLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  fireEmoji: {
    fontSize: 16,
  },
  streakValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree',
    letterSpacing: -0.3,
  },
  emptyState: {
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'Figtree',
  },
});
