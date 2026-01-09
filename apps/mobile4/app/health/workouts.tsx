import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { listWorkouts } from '@/src/storage/workouts';
import type { ExerciseSet, WorkoutEntry } from '@/src/lib/health';

function formatDuration(minutes?: number | null) {
  if (!minutes || !Number.isFinite(minutes)) return '-';
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

function formatSetSummary(set: ExerciseSet) {
  const parts: string[] = [];
  if (set.reps != null) parts.push(`${set.reps} reps`);
  if (set.weight != null) parts.push(`${set.weight} lb`);
  if (set.distance != null) parts.push(`${set.distance} ${set.distanceUnit ?? 'mi'}`);
  if (set.duration != null) parts.push(`${Math.round(set.duration / 60)}m`);
  if (set.rpe != null) parts.push(`RPE ${set.rpe}`);
  return parts.join(' - ');
}

function formatPace(set: ExerciseSet) {
  if (!set.distance || !set.duration) return null;
  const hours = set.duration / 3600;
  if (!hours) return null;
  const distance = set.distance;
  const pace = distance / hours;
  const unit = set.distanceUnit === 'km' ? 'km/h' : 'mph';
  return `${pace.toFixed(1)} ${unit}`;
}

export default function WorkoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { palette } = useTheme();
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const rows = await listWorkouts();
      if (!mounted) return;
      setWorkouts(rows);
    };
    if (isFocused) {
      void load();
    }
    return () => {
      mounted = false;
    };
  }, [isFocused]);

  const sorted = useMemo(() => workouts.sort((a, b) => b.startAt - a.startAt), [workouts]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Workouts</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {sorted.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No workouts logged yet.
            </Text>
          </View>
        ) : (
          sorted.map((workout) => (
            <View key={workout.id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: palette.text }]}>{workout.title}</Text>
                  <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>
                    {new Date(workout.startAt).toLocaleDateString()} - {workout.type}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>
                    {formatDuration(resolveWorkoutMinutes(workout))}
                  </Text>
                  {workout.overallRpe ? (
                    <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>RPE {workout.overallRpe}</Text>
                  ) : null}
                </View>
              </View>

              {workout.exercises.map((exercise) => (
                <View key={exercise.id} style={styles.exerciseBlock}>
                  <Text style={[styles.exerciseTitle, { color: palette.text }]}>{exercise.name}</Text>
                  {exercise.sets.length === 0 ? (
                    <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>No sets logged</Text>
                  ) : (
                    exercise.sets.map((set, idx) => {
                      const pace = formatPace(set);
                      return (
                        <Text key={`${exercise.id}_${idx}`} style={[styles.setLine, { color: palette.textSecondary }]}>
                          {formatSetSummary(set)}
                          {pace ? ` - ${pace}` : ''}
                        </Text>
                      );
                    })
                  )}
                </View>
              ))}
            </View>
          ))
        )}
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
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 12,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  exerciseBlock: {
    gap: 4,
  },
  exerciseTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  setLine: {
    fontSize: 12,
  },
});
