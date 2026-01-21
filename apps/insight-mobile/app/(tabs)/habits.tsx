import { useState, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Modal, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
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
import {
  listHabitsWithStats,
  createHabit,
  type HabitWithStats,
} from '@/src/storage/habits';
import { startEvent, stopEvent } from '@/src/storage/events';

type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Anytime';

function categorizeByTimeOfDay(habit: HabitWithStats): TimeOfDay {
  const cat = (habit.category ?? '').toLowerCase();
  if (cat.includes('morning') || cat.includes('wake')) return 'Morning';
  if (cat.includes('afternoon') || cat.includes('lunch')) return 'Afternoon';
  if (cat.includes('evening') || cat.includes('night') || cat.includes('sleep')) return 'Evening';
  return 'Anytime';
}

function formatDuration(minutes: number | null): string | undefined {
  if (!minutes) return undefined;
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

const TIME_OF_DAY_ORDER: TimeOfDay[] = ['Morning', 'Afternoon', 'Evening', 'Anytime'];

const DEFAULT_COLORS = ['#3B82F6', '#8B5CF6', '#E26B3A', '#22C55E', '#EC4899', '#F59E0B', '#6366F1', '#14B8A6'];
const DEFAULT_ICONS = ['✓', '💧', '🧘', '📖', '🚶', '💪', '📝', '🌙', '🤸', '🎯'];

export default function HabitsScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { palette, sizes } = useTheme();
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('✓');
  const [newHabitColor, setNewHabitColor] = useState('#3B82F6');
  const [newHabitDuration, setNewHabitDuration] = useState('');

  const loadHabits = useCallback(async () => {
    try {
      const data = await listHabitsWithStats();
      setHabits(data);
    } catch (err) {
      console.error('Failed to load habits:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadHabits();
    }
  }, [isFocused, loadHabits]);

  // Calculate stats
  const completedCount = useMemo(() => habits.filter((h) => h.todayLogs > 0).length, [habits]);
  const totalCount = habits.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const maxStreak = useMemo(() => Math.max(0, ...habits.map((h) => h.streak)), [habits]);

  // Group habits by time of day
  const groupedHabits = useMemo(() => {
    const groups: Record<TimeOfDay, HabitWithStats[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
      Anytime: [],
    };
    habits.forEach((habit) => {
      const timeOfDay = categorizeByTimeOfDay(habit);
      groups[timeOfDay].push(habit);
    });
    return groups;
  }, [habits]);

  // Toggle habit completion (log an event)
  const handleToggle = useCallback(async (habit: HabitWithStats) => {
    try {
      if (habit.todayLogs > 0) {
        // Already completed today - could implement undo here
        return;
      }
      // Start and immediately stop an event as a quick log
      const event = await startEvent({
        title: habit.name,
        category: habit.category ?? 'Habit',
        subcategory: habit.subcategory ?? undefined,
        tags: habit.tags,
        trackerKey: `habit:${habit.id}`,
      });
      if (event && habit.isTimed && habit.estimateMinutes) {
        // For timed habits, just mark complete immediately
        await stopEvent(event.id);
      } else if (event) {
        await stopEvent(event.id);
      }
      await loadHabits();
    } catch (err) {
      console.error('Failed to toggle habit:', err);
    }
  }, [loadHabits]);

  // Handle habit press (navigate to detail)
  const handleHabitPress = useCallback((habitId: string) => {
    router.push(`/habit/${habitId}`);
  }, [router]);

  // Create new habit
  const handleCreateHabit = useCallback(async () => {
    if (!newHabitName.trim()) return;
    try {
      await createHabit({
        name: newHabitName.trim(),
        icon: newHabitIcon,
        color: newHabitColor,
        estimateMinutes: newHabitDuration ? parseInt(newHabitDuration, 10) : null,
        isTimed: !!newHabitDuration,
        category: null,
        subcategory: null,
        difficulty: 5,
        importance: 5,
        polarity: 'positive',
        targetPerWeek: 7,
        tags: [],
        people: [],
        location: null,
        skills: [],
        character: [],
        goal: null,
        project: null,
      });
      setShowCreateModal(false);
      setNewHabitName('');
      setNewHabitDuration('');
      await loadHabits();
    } catch (err) {
      console.error('Failed to create habit:', err);
    }
  }, [newHabitName, newHabitIcon, newHabitColor, newHabitDuration, loadHabits]);

  const hasHabits = habits.length > 0;

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { gap: SPACING.lg }]}>
        <LuxHeader
          overline="Habits"
          title="Daily Streaks"
          subtitle="Build consistency with trackable habits"
          right={<LuxPill label="+ Add" variant="accent" onPress={() => setShowCreateModal(true)} />}
        />

        {loading ? (
          <LuxCard style={styles.loadingCard}>
            <Text style={{ color: palette.textSecondary }}>Loading habits...</Text>
          </LuxCard>
        ) : hasHabits ? (
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
                    value={maxStreak}
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
                        icon={habit.icon ?? '✓'}
                        iconColor={habit.color}
                        title={habit.name}
                        duration={formatDuration(habit.estimateMinutes)}
                        completed={habit.todayLogs > 0}
                        onToggle={() => handleToggle(habit)}
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
            <LuxPill label="Create your first habit" variant="accent" onPress={() => setShowCreateModal(true)} />
          </LuxCard>
        )}
      </ScrollView>

      {/* Create Habit Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.surface }]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>New Habit</Text>

            <TextInput
              style={[styles.modalInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]}
              placeholder="Habit name"
              placeholderTextColor={palette.textSecondary}
              value={newHabitName}
              onChangeText={setNewHabitName}
            />

            <Text style={[styles.modalLabel, { color: palette.textSecondary }]}>Icon</Text>
            <View style={styles.iconRow}>
              {DEFAULT_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    newHabitIcon === icon && { backgroundColor: palette.tintLight, borderColor: palette.tint },
                  ]}
                  onPress={() => setNewHabitIcon(icon)}
                >
                  <Text style={styles.iconText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: palette.textSecondary }]}>Color</Text>
            <View style={styles.colorRow}>
              {DEFAULT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newHabitColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setNewHabitColor(color)}
                />
              ))}
            </View>

            <TextInput
              style={[styles.modalInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]}
              placeholder="Duration (minutes, optional)"
              placeholderTextColor={palette.textSecondary}
              value={newHabitDuration}
              onChangeText={setNewHabitDuration}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: palette.border }]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={{ color: palette.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: palette.tint }]}
                onPress={handleCreateHabit}
              >
                <Text style={{ color: '#fff' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingCard: {
    padding: 28,
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Figtree',
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  modalInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
