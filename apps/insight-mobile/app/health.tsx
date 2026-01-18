import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/state/theme';
import { listWorkouts } from '@/src/storage/workouts';
import { listMeals } from '@/src/storage/nutrition';
import { formatDuration, resolveWorkoutMinutes } from '@/src/lib/health';
import type { MealEntry, WorkoutEntry } from '@/src/lib/health';
import { Screen } from '@/components/Screen';
import { LuxCard } from '@/components/LuxCard';

export default function HealthDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { palette } = useTheme();

  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [meals, setMeals] = useState<MealEntry[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [nextWorkouts, nextMeals] = await Promise.all([
        listWorkouts(),
        listMeals(),
      ]);
      if (!mounted) return;
      setWorkouts(nextWorkouts);
      setMeals(nextMeals);
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

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Health & Fitness</Text>
        <View style={{ width: 28 }} />
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

        <LuxCard style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Latest Workouts</Text>
            <TouchableOpacity onPress={() => router.push('/health/workouts')}>
              <Text style={[styles.sectionLink, { color: palette.tint }]}>View all</Text>
            </TouchableOpacity>
          </View>
          {workouts.slice(0, 3).map((workout) => (
            <TouchableOpacity
              key={workout.id}
              style={styles.rowItem}
              onPress={() => router.push(`/health/workout/${workout.id}`)}
            >
              <View>
                <Text style={[styles.rowTitle, { color: palette.text }]}>{workout.title}</Text>
                <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>
                  {new Date(workout.startAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>
                {formatDuration(resolveWorkoutMinutes(workout))}
              </Text>
            </TouchableOpacity>
          ))}
          {workouts.length === 0 && (
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No workouts logged yet.</Text>
          )}
        </LuxCard>

        <LuxCard style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Latest Meals</Text>
            <TouchableOpacity onPress={() => router.push('/health/nutrition')}>
              <Text style={[styles.sectionLink, { color: palette.tint }]}>View all</Text>
            </TouchableOpacity>
          </View>
          {meals.slice(0, 3).map((meal) => (
            <TouchableOpacity
              key={meal.id}
              style={styles.rowItem}
              onPress={() => router.push(`/health/meal/${meal.id}`)}
            >
              <View>
                <Text style={[styles.rowTitle, { color: palette.text }]}>{meal.title}</Text>
                <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>
                  {new Date(meal.eatenAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>{meal.totalCalories} kcal</Text>
            </TouchableOpacity>
          ))}
          {meals.length === 0 && (
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No meals logged yet.</Text>
          )}
        </LuxCard>

        <LuxCard style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Apple Health Import</Text>
          <Text style={[styles.sectionBody, { color: palette.textSecondary }]}>
            Connect Apple Health to pull workouts, steps, and recovery metrics.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: palette.tint }]}
            onPress={() => Alert.alert('Apple Health', 'This requires a dev client with HealthKit permissions.')}
          >
            <Text style={styles.primaryButtonText}>Connect Apple Health</Text>
          </TouchableOpacity>
        </LuxCard>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 14,
    paddingBottom: 28,
    gap: 11,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
  },
  cardLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  cardMeta: {
    fontSize: 8,
    marginTop: 4,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionLink: {
    fontSize: 8,
    fontWeight: '700',
  },
  sectionBody: {
    fontSize: 9,
    lineHeight: 13,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 10,
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 8,
  },
  emptyText: {
    fontSize: 8,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});