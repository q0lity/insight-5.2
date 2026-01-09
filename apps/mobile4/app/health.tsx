import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { listTrackerLogs, type TrackerLogEntry } from '@/src/storage/trackers';
import { listWorkouts } from '@/src/storage/workouts';
import { listMeals } from '@/src/storage/nutrition';
import type { MealEntry, WorkoutEntry } from '@/src/lib/health';

function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '-';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function resolveWorkoutMinutes(workout: WorkoutEntry) {
  if (workout.totalDuration != null) return workout.totalDuration;
  const seconds = workout.exercises
    .flatMap((ex) => ex.sets)
    .reduce((sum, set) => sum + (set.duration ?? 0), 0);
  return seconds ? Math.round(seconds / 60) : null;
}

export default function HealthDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { palette } = useTheme();

  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [trackerLogs, setTrackerLogs] = useState<TrackerLogEntry[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [nextWorkouts, nextMeals, nextTrackers] = await Promise.all([
        listWorkouts(),
        listMeals(),
        listTrackerLogs({ limit: 200 }),
      ]);
      if (!mounted) return;
      setWorkouts(nextWorkouts);
      setMeals(nextMeals);
      setTrackerLogs(nextTrackers);
    };
    if (isFocused) {
      void load();
    }
    return () => {
      mounted = false;
    };
  }, [isFocused]);

  const workoutSummary = useMemo(() => {
    const totalSessions = workouts.length;
    const totalMinutes = workouts.reduce((sum, workout) => sum + (resolveWorkoutMinutes(workout) ?? 0), 0);
    const totalCalories = workouts.reduce((sum, workout) => sum + (workout.estimatedCalories ?? 0), 0);
    return { totalSessions, totalMinutes, totalCalories };
  }, [workouts]);

  const nutritionSummary = useMemo(() => {
    const totalCalories = meals.reduce((sum, meal) => sum + (meal.totalCalories ?? 0), 0);
    const totalProtein = meals.reduce((sum, meal) => sum + (meal.macros?.protein ?? 0), 0);
    const totalCarbs = meals.reduce((sum, meal) => sum + (meal.macros?.carbs ?? 0), 0);
    const totalFat = meals.reduce((sum, meal) => sum + (meal.macros?.fat ?? 0), 0);
    return { totalCalories, totalProtein, totalCarbs, totalFat };
  }, [meals]);

  const trackerSummary = useMemo(() => {
    const counts = new Map<string, number>();
    trackerLogs.forEach((log) => {
      counts.set(log.trackerLabel, (counts.get(log.trackerLabel) ?? 0) + 1);
    });
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return {
      total: trackerLogs.length,
      topLabel: top?.[0] ?? null,
      topCount: top?.[1] ?? 0,
    };
  }, [trackerLogs]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Health & Fitness</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cardRow}>
          <TouchableOpacity
            style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={() => router.push('/health/workouts')}
          >
            <Text style={[styles.cardLabel, { color: palette.textSecondary }]}>WORKOUTS</Text>
            <Text style={[styles.cardValue, { color: palette.text }]}>{workoutSummary.totalSessions}</Text>
            <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>
              {formatDuration(workoutSummary.totalMinutes)} - {Math.round(workoutSummary.totalCalories)} kcal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={() => router.push('/health/nutrition')}
          >
            <Text style={[styles.cardLabel, { color: palette.textSecondary }]}>NUTRITION</Text>
            <Text style={[styles.cardValue, { color: palette.text }]}>{Math.round(nutritionSummary.totalCalories)}</Text>
            <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>
              P{Math.round(nutritionSummary.totalProtein)} C{Math.round(nutritionSummary.totalCarbs)} F{Math.round(nutritionSummary.totalFat)}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.wideCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={() => router.push('/trackers')}
        >
          <View style={styles.wideCardHeader}>
            <Text style={[styles.cardLabel, { color: palette.textSecondary }]}>TRACKERS</Text>
            <Text style={[styles.cardMeta, { color: palette.tint }]}>
              {trackerSummary.total} logs
            </Text>
          </View>
          <Text style={[styles.wideCardValue, { color: palette.text }]}>
            {trackerSummary.topLabel ? trackerSummary.topLabel : 'No tracker logs yet'}
          </Text>
          {trackerSummary.topLabel ? (
            <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>
              {trackerSummary.topCount} entries
            </Text>
          ) : null}
        </TouchableOpacity>

        <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Latest Workouts</Text>
            <TouchableOpacity onPress={() => router.push('/health/workouts')}>
              <Text style={[styles.sectionLink, { color: palette.tint }]}>View all</Text>
            </TouchableOpacity>
          </View>
          {workouts.slice(0, 3).map((workout) => (
            <View key={workout.id} style={styles.rowItem}>
              <View>
                <Text style={[styles.rowTitle, { color: palette.text }]}>{workout.title}</Text>
                <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>
                  {new Date(workout.startAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>
                {formatDuration(resolveWorkoutMinutes(workout) ?? 0)}
              </Text>
            </View>
          ))}
          {workouts.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No workouts logged yet.</Text>
          ) : null}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Latest Meals</Text>
            <TouchableOpacity onPress={() => router.push('/health/nutrition')}>
              <Text style={[styles.sectionLink, { color: palette.tint }]}>View all</Text>
            </TouchableOpacity>
          </View>
          {meals.slice(0, 3).map((meal) => (
            <View key={meal.id} style={styles.rowItem}>
              <View>
                <Text style={[styles.rowTitle, { color: palette.text }]}>{meal.title}</Text>
                <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>
                  {new Date(meal.eatenAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>{meal.totalCalories} kcal</Text>
            </View>
          ))}
          {meals.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No meals logged yet.</Text>
          ) : null}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Apple Health Import</Text>
          <Text style={[styles.sectionBody, { color: palette.textSecondary }]}>
            Connect Apple Health to pull workouts, steps, and recovery metrics.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: palette.tint }]}
            onPress={() => Alert.alert('Apple Health', 'This requires a dev client with HealthKit permissions. Ready when you are.')}
          >
            <Text style={styles.primaryButtonText}>Connect Apple Health</Text>
          </TouchableOpacity>
        </View>
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
    fontFamily: 'Figtree',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  wideCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  wideCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 6,
  },
  wideCardValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 12,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
