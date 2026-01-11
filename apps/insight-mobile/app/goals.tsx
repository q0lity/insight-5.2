import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput, FlatList } from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { ProgressRing } from '@/src/components/charts';
import { listGoals, addGoal, deleteGoal, type Goal } from '@/src/storage/goals';
import { listEvents, type MobileEvent } from '@/src/storage/events';
import { loadMultipliers, upsertGoalMultiplier, getGoalMultiplierSync, type MultipliersState } from '@/src/storage/multipliers';

export default function GoalsScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [newGoalName, setNewGoalName] = useState('');
  const [multipliers, setMultipliers] = useState<MultipliersState>({ goals: {}, projects: {} });

  useEffect(() => {
    loadData();
    loadMultipliers().then(setMultipliers);
  }, []);

  async function loadData() {
    const [goalsData, eventsData] = await Promise.all([listGoals(), listEvents()]);
    setGoals(goalsData.sort((a, b) => b.createdAt - a.createdAt));
    setEvents(eventsData);
  }

  // Calculate stats per goal
  const goalStats = useMemo(() => {
    const stats: Record<string, { sessions: number; minutes: number; streak: number }> = {};
    for (const goal of goals) {
      const linked = events.filter((e) => e.goal === goal.name);
      const sessions = linked.length;
      const minutes = linked.reduce((sum, e) => {
        if (e.endAt) return sum + Math.round((e.endAt - e.startAt) / 60000);
        if (e.estimateMinutes) return sum + e.estimateMinutes;
        return sum;
      }, 0);

      // Calculate streak
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daySet = new Set<string>();
      for (const e of linked) {
        const d = new Date(e.startAt);
        daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      }
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
        if (daySet.has(key)) {
          streak++;
        } else if (i > 0) break;
      }

      stats[goal.id] = { sessions, minutes, streak };
    }
    return stats;
  }, [goals, events]);

  async function handleAddGoal() {
    if (!newGoalName.trim()) return;
    await addGoal(newGoalName.trim());
    setNewGoalName('');
    await loadData();
  }

  async function handleDeleteGoal(id: string) {
    await deleteGoal(id);
    await loadData();
  }

  const updateMultiplier = async (goalName: string, value: number) => {
    await upsertGoalMultiplier(goalName, value);
    const next = await loadMultipliers();
    setMultipliers(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Goals</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: palette.surface,
              color: palette.text,
              borderColor: palette.border
            }
          ]}
          placeholder="Enter a new goal..."
          placeholderTextColor={palette.textSecondary}
          value={newGoalName}
          onChangeText={setNewGoalName}
          onSubmitEditing={handleAddGoal}
        />
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: palette.tint }]} 
          onPress={handleAddGoal}
        >
          <InsightIcon name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={[styles.card, { backgroundColor: palette.surface }]}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No active goals yet. Add one to start tracking your progress.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const stats = goalStats[item.id] ?? { sessions: 0, minutes: 0, streak: 0 };
          const formatMins = (m: number) => (m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`);
          return (
            <TouchableOpacity
              style={[styles.goalItem, { backgroundColor: palette.surface }]}
              onPress={() => router.push(`/goal/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.goalLeft}>
                <ProgressRing
                  progress={Math.min(stats.streak / 7, 1)}
                  size={48}
                  strokeWidth={5}
                  color={palette.tint}
                />
                <Text style={[styles.streakText, { color: palette.text }]}>{stats.streak}</Text>
              </View>
              <View style={styles.goalInfo}>
                <Text style={[styles.goalName, { color: palette.text }]}>{item.name}</Text>
                <View style={styles.statsRow}>
                  <Text style={[styles.statText, { color: palette.textSecondary }]}>
                    {stats.sessions} sessions
                  </Text>
                  <Text style={[styles.statDot, { color: palette.textSecondary }]}>·</Text>
                  <Text style={[styles.statText, { color: palette.textSecondary }]}>
                    {formatMins(stats.minutes)}
                  </Text>
                </View>
                <View style={styles.multiplierRow}>
                  <Text style={[styles.multiplierLabel, { color: palette.textSecondary }]}>Multiplier</Text>
                  <Text style={[styles.multiplierValue, { color: palette.tint }]}>
                    {getGoalMultiplierSync(item.name, multipliers).toFixed(2)}x
                  </Text>
                </View>
                <Slider
                  minimumValue={0.1}
                  maximumValue={3}
                  step={0.1}
                  value={getGoalMultiplierSync(item.name, multipliers)}
                  onValueChange={(value) => void updateMultiplier(item.name, value)}
                  minimumTrackTintColor={palette.tint}
                  maximumTrackTintColor={palette.border}
                  thumbTintColor={palette.tint}
                />
              </View>
              <View style={styles.goalRight}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteGoal(item.id);
                  }}
                  style={styles.deleteButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <InsightIcon name="plus" size={18} color={palette.border} />
                </TouchableOpacity>
                <InsightIcon name="chevronRight" size={20} color={palette.textSecondary} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
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
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
  },
  backButton: {
    padding: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Figtree',
    borderWidth: 1,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Figtree',
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    gap: 12,
  },
  goalLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  streakText: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  goalInfo: {
    flex: 1,
  },
  goalRight: {
    alignItems: 'center',
    gap: 8,
  },
  goalName: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Figtree',
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  statDot: {
    fontSize: 12,
  },
  multiplierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  multiplierLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  multiplierValue: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  deleteButton: {
    padding: 4,
    transform: [{ rotate: '45deg' }],
  },
});
