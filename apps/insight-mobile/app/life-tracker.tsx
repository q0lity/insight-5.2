import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/state/theme';
import { listWorkouts } from '@/src/storage/workouts';
import type { Workout } from '@/src/storage/workouts';
import { listMeals } from '@/src/storage/nutrition';
import type { Meal } from '@/src/storage/nutrition';

type TrackerType = 'mood' | 'energy' | 'water' | 'stress' | 'sleep';

type TrackerValue = {
  type: TrackerType;
  value: number;
  updatedAt: number;
};

type QuickAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route?: string;
};

const TRACKER_CONFIG: Record<TrackerType, { label: string; icon: keyof typeof Ionicons.glyphMap; max: number; unit: string }> = {
  mood: { label: 'Mood', icon: 'happy-outline', max: 5, unit: '' },
  energy: { label: 'Energy', icon: 'flash-outline', max: 5, unit: '' },
  water: { label: 'Water', icon: 'water-outline', max: 8, unit: 'glasses' },
  stress: { label: 'Stress', icon: 'pulse-outline', max: 5, unit: '' },
  sleep: { label: 'Sleep', icon: 'moon-outline', max: 12, unit: 'hrs' },
};

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'workout', label: 'Log Workout', icon: 'barbell-outline', color: '#ef4444', route: '/health/workouts' },
  { id: 'meal', label: 'Log Meal', icon: 'nutrition-outline', color: '#22c55e', route: '/health/nutrition' },
  { id: 'note', label: 'Quick Note', icon: 'create-outline', color: '#3b82f6', route: '/notes' },
  { id: 'event', label: 'New Event', icon: 'calendar-outline', color: '#8b5cf6', route: '/calendar' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return 'Good Night';
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function isToday(ms: number) {
  const d = new Date(ms);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

export default function LifeTrackerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { palette } = useTheme();
  const screenWidth = Dimensions.get('window').width;

  const [trackers, setTrackers] = useState<TrackerValue[]>([
    { type: 'mood', value: 3, updatedAt: Date.now() },
    { type: 'energy', value: 4, updatedAt: Date.now() },
    { type: 'water', value: 2, updatedAt: Date.now() },
    { type: 'stress', value: 2, updatedAt: Date.now() },
    { type: 'sleep', value: 7, updatedAt: Date.now() - 86400000 },
  ]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [workoutsData, mealsData] = await Promise.all([
        listWorkouts(),
        listMeals(),
      ]);
      if (!mounted) return;
      setWorkouts(workoutsData);
      setMeals(mealsData);
    };
    if (isFocused) {
      void load();
    }
    return () => {
      mounted = false;
    };
  }, [isFocused]);

  const todayStats = useMemo(() => {
    const todayWorkouts = workouts.filter((w) => isToday(w.date));
    const todayMeals = meals.filter((m) => isToday(m.date));

    const workoutMinutes = todayWorkouts.reduce((sum, w) => sum + (w.duration ?? 0), 0);
    const calories = todayMeals.reduce((sum, m) => sum + (m.calories ?? 0), 0);

    return {
      workouts: todayWorkouts.length,
      workoutMinutes,
      meals: todayMeals.length,
      calories,
    };
  }, [workouts, meals]);

  const weekStats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    const weekWorkouts = workouts.filter((w) => w.date >= weekAgo);
    const totalMinutes = weekWorkouts.reduce((sum, w) => sum + (w.duration ?? 0), 0);
    return {
      workouts: weekWorkouts.length,
      totalMinutes,
      avgPerDay: Math.round(totalMinutes / 7),
    };
  }, [workouts]);

  const handleTrackerTap = useCallback((type: TrackerType) => {
    const config = TRACKER_CONFIG[type];
    setTrackers((prev) =>
      prev.map((t) => {
        if (t.type !== type) return t;
        const next = t.value >= config.max ? 1 : t.value + 1;
        return { ...t, value: next, updatedAt: Date.now() };
      })
    );
  }, []);

  const handleTrackerLongPress = useCallback((type: TrackerType) => {
    const config = TRACKER_CONFIG[type];
    Alert.alert(
      `Set ${config.label}`,
      `Current: ${trackers.find((t) => t.type === type)?.value ?? 0}`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...Array.from({ length: config.max }, (_, i) => ({
          text: String(i + 1),
          onPress: () => {
            setTrackers((prev) =>
              prev.map((t) =>
                t.type === type ? { ...t, value: i + 1, updatedAt: Date.now() } : t
              )
            );
          },
        })),
      ]
    );
  }, [trackers]);

  const tileWidth = (screenWidth - 60) / 2;

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Life Tracker</Text>
        <TouchableOpacity onPress={() => router.push('/health')} style={styles.backButton}>
          <Ionicons name="fitness-outline" size={22} color={palette.tint} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.greetingSection}>
          <Text style={[styles.greeting, { color: palette.text }]}>{getGreeting()}</Text>
          <Text style={[styles.greetingSub, { color: palette.textSecondary }]}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View style={styles.trackersGrid}>
          {trackers.map((tracker) => {
            const config = TRACKER_CONFIG[tracker.type];
            const percentage = (tracker.value / config.max) * 100;

            return (
              <TouchableOpacity
                key={tracker.type}
                style={[
                  styles.trackerTile,
                  { width: tileWidth, backgroundColor: palette.surface, borderColor: palette.border },
                ]}
                onPress={() => handleTrackerTap(tracker.type)}
                onLongPress={() => handleTrackerLongPress(tracker.type)}
              >
                <View style={styles.trackerHeader}>
                  <Ionicons name={config.icon} size={20} color={palette.tint} />
                  <Text style={[styles.trackerLabel, { color: palette.textSecondary }]}>
                    {config.label}
                  </Text>
                </View>
                <Text style={[styles.trackerValue, { color: palette.text }]}>
                  {tracker.value}
                  {config.unit && (
                    <Text style={[styles.trackerUnit, { color: palette.textSecondary }]}>
                      {' '}{config.unit}
                    </Text>
                  )}
                </Text>
                <View style={[styles.trackerBar, { backgroundColor: palette.border }]}>
                  <View
                    style={[
                      styles.trackerBarFill,
                      { width: `${percentage}%`, backgroundColor: palette.tint },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Today's Progress</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="barbell" size={24} color="#ef4444" />
            <Text style={[styles.statValue, { color: palette.text }]}>{todayStats.workouts}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Workouts</Text>
            {todayStats.workoutMinutes > 0 && (
              <Text style={[styles.statSub, { color: palette.tint }]}>
                {formatDuration(todayStats.workoutMinutes)}
              </Text>
            )}
          </View>
          <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="nutrition" size={24} color="#22c55e" />
            <Text style={[styles.statValue, { color: palette.text }]}>{todayStats.meals}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Meals</Text>
            {todayStats.calories > 0 && (
              <Text style={[styles.statSub, { color: palette.tint }]}>
                {todayStats.calories} cal
              </Text>
            )}
          </View>
          <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="trending-up" size={24} color="#3b82f6" />
            <Text style={[styles.statValue, { color: palette.text }]}>{weekStats.workouts}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>This Week</Text>
            <Text style={[styles.statSub, { color: palette.tint }]}>
              {weekStats.avgPerDay}m/day
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.actionTile,
                { width: tileWidth, backgroundColor: palette.surface, borderColor: palette.border },
              ]}
              onPress={() => action.route && router.push(action.route as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={[styles.actionLabel, { color: palette.text }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent Workouts</Text>
        {workouts.slice(0, 3).length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No workouts logged yet. Start tracking your fitness journey!
            </Text>
          </View>
        ) : (
          workouts.slice(0, 3).map((workout) => (
            <TouchableOpacity
              key={workout.id}
              style={[styles.workoutCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
              onPress={() => router.push(`/health/workout/${workout.id}`)}
            >
              <View style={[styles.workoutIcon, { backgroundColor: '#ef4444' + '20' }]}>
                <Ionicons name="barbell" size={20} color="#ef4444" />
              </View>
              <View style={styles.workoutContent}>
                <Text style={[styles.workoutTitle, { color: palette.text }]} numberOfLines={1}>
                  {workout.name}
                </Text>
                <Text style={[styles.workoutMeta, { color: palette.textSecondary }]}>
                  {new Date(workout.date).toLocaleDateString()}
                  {workout.duration && ` · ${formatDuration(workout.duration)}`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={[styles.viewAllButton, { borderColor: palette.border }]}
          onPress={() => router.push('/health/workouts')}
        >
          <Text style={[styles.viewAllText, { color: palette.tint }]}>View All Workouts</Text>
          <Ionicons name="arrow-forward" size={16} color={palette.tint} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 6 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  greetingSection: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
  },
  greetingSub: {
    fontSize: 14,
    marginTop: 4,
  },
  trackersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  trackerTile: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  trackerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackerLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  trackerValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  trackerUnit: {
    fontSize: 14,
    fontWeight: '600',
  },
  trackerBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackerBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
  },
  statSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionTile: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutContent: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  workoutMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
