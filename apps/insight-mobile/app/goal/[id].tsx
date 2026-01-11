import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { Heatmap, ProgressRing } from '@/src/components/charts';
import { listGoals, type Goal } from '@/src/storage/goals';
import { listEvents, type MobileEvent } from '@/src/storage/events';
import {
  loadMultipliers,
  upsertGoalMultiplier,
  getGoalMultiplierSync,
  type MultipliersState,
} from '@/src/storage/multipliers';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(ts);
}

export default function GoalDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [multipliers, setMultipliers] = useState<MultipliersState>({ goals: {}, projects: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [goals, allEvents, mults] = await Promise.all([
        listGoals(),
        listEvents(),
        loadMultipliers(),
      ]);

      const found = goals.find((g) => g.id === id);
      setGoal(found ?? null);
      setMultipliers(mults);

      if (found) {
        // Filter events linked to this goal
        const linked = allEvents.filter((e) => e.goal === found.name);
        setEvents(linked.sort((a, b) => b.startAt - a.startAt));
      }
    } finally {
      setLoading(false);
    }
  }

  const updateMultiplier = async (goalName: string, value: number) => {
    await upsertGoalMultiplier(goalName, value);
    const next = await loadMultipliers();
    setMultipliers(next);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalEvents = events.length;
    const totalMinutes = events.reduce((sum, e) => {
      if (e.endAt) return sum + Math.round((e.endAt - e.startAt) / 60000);
      if (e.estimateMinutes) return sum + e.estimateMinutes;
      return sum;
    }, 0);
    const totalPoints = events.reduce((sum, e) => sum + (e.points ?? 0), 0);

    // Activity by day for last 30 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let activeDays = 0;
    const daySet = new Set<string>();
    for (const e of events) {
      const d = new Date(e.startAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      daySet.add(key);
    }
    activeDays = daySet.size;

    // Recent streak
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      if (daySet.has(key)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return { totalEvents, totalMinutes, totalPoints, activeDays, streak };
  }, [events]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    const result: Record<string, number> = {};
    for (const e of events) {
      const d = new Date(e.startAt);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;
      result[key] = (result[key] ?? 0) + (e.points ?? 1);
    }
    return result;
  }, [events]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <InsightIcon name="chevronLeft" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Goal</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <InsightIcon name="chevronLeft" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Goal</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Goal not found</Text>
        </View>
      </View>
    );
  }

  const multiplier = getGoalMultiplierSync(goal.name, multipliers);

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]} numberOfLines={1}>
          {goal.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Goal Info Card */}
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <Text style={[styles.goalName, { color: palette.text }]}>{goal.name}</Text>
          <Text style={[styles.goalDate, { color: palette.textSecondary }]}>
            Started {formatDate(goal.createdAt)}
          </Text>

          <View style={styles.multiplierSection}>
            <View style={styles.multiplierRow}>
              <Text style={[styles.multiplierLabel, { color: palette.textSecondary }]}>XP Multiplier</Text>
              <Text style={[styles.multiplierValue, { color: palette.tint }]}>{multiplier.toFixed(2)}x</Text>
            </View>
            <Slider
              minimumValue={0.1}
              maximumValue={3}
              step={0.1}
              value={multiplier}
              onValueChange={(value) => void updateMultiplier(goal.name, value)}
              minimumTrackTintColor={palette.tint}
              maximumTrackTintColor={palette.border}
              thumbTintColor={palette.tint}
            />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <ProgressRing
              progress={Math.min(stats.streak / 30, 1)}
              size={56}
              strokeWidth={6}
              color={palette.tint}
            />
            <Text style={[styles.statValue, { color: palette.text }]}>{stats.streak}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Day Streak</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <Text style={[styles.statBigValue, { color: palette.text }]}>{stats.totalEvents}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Sessions</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <Text style={[styles.statBigValue, { color: palette.text }]}>
              {formatDuration(stats.totalMinutes)}
            </Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Time</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <Text style={[styles.statBigValue, { color: palette.tint }]}>{stats.totalPoints}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>XP Earned</Text>
          </View>
        </View>

        {/* Activity Heatmap */}
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Activity</Text>
          <View style={styles.heatmapContainer}>
            <Heatmap data={heatmapData} weeks={12} cellSize={12} color={palette.tint} />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent Sessions</Text>
          {events.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No sessions linked to this goal yet
            </Text>
          ) : (
            <View style={styles.eventsList}>
              {events.slice(0, 10).map((event) => (
                <View key={event.id} style={styles.eventItem}>
                  <View style={styles.eventDot}>
                    <View style={[styles.dot, { backgroundColor: palette.tint }]} />
                  </View>
                  <View style={styles.eventContent}>
                    <Text style={[styles.eventTitle, { color: palette.text }]} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <View style={styles.eventMeta}>
                      <Text style={[styles.eventTime, { color: palette.textSecondary }]}>
                        {formatRelativeTime(event.startAt)}
                      </Text>
                      {event.endAt && (
                        <Text style={[styles.eventDuration, { color: palette.textSecondary }]}>
                          {formatDuration(Math.round((event.endAt - event.startAt) / 60000))}
                        </Text>
                      )}
                      {(event.points ?? 0) > 0 && (
                        <Text style={[styles.eventPoints, { color: palette.tint }]}>
                          +{event.points} XP
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
              {events.length > 10 && (
                <Text style={[styles.moreText, { color: palette.textSecondary }]}>
                  +{events.length - 10} more sessions
                </Text>
              )}
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
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'Figtree',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  goalName: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  goalDate: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  multiplierSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.16)',
  },
  multiplierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  multiplierLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  multiplierValue: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
    position: 'absolute',
    top: 37,
  },
  statBigValue: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Figtree',
    marginBottom: 16,
  },
  heatmapContainer: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Figtree',
    textAlign: 'center',
    paddingVertical: 20,
  },
  eventsList: {
    gap: 12,
  },
  eventItem: {
    flexDirection: 'row',
    gap: 12,
  },
  eventDot: {
    width: 20,
    alignItems: 'center',
    paddingTop: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree',
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  eventDuration: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  eventPoints: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  moreText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
