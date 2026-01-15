import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { deleteWorkout, getWorkout } from '@/src/storage/workouts';
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
  return parts.join(' · ');
}

function formatPace(set: ExerciseSet) {
  if (!set.distance || !set.duration) return null;
  const hours = set.duration / 3600;
  if (!hours) return null;
  const pace = set.distance / hours;
  const unit = set.distanceUnit === 'km' ? 'km/h' : 'mph';
  return `${pace.toFixed(1)} ${unit}`;
}

export default function WorkoutDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const workoutId = Array.isArray(idParam) ? idParam[0] : idParam;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { palette } = useTheme();
  const [workout, setWorkout] = useState<WorkoutEntry | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!workoutId) return;
      const result = await getWorkout(workoutId);
      if (!mounted) return;
      setWorkout(result);
    };
    if (isFocused) {
      void load();
    }
    return () => {
      mounted = false;
    };
  }, [isFocused, workoutId]);

  const handleDelete = () => {
    if (!workoutId) return;
    Alert.alert('Delete Workout', 'Are you sure you want to delete this workout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkout(workoutId);
          router.back();
        },
      },
    ]);
  };

  if (!workout) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <InsightIcon name="chevronLeft" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Workout</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingWrap}>
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
            {workoutId ? 'Loading...' : 'Workout not found.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]} numberOfLines={1}>
          {workout.title}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Text style={[styles.deleteText, { color: palette.error ?? '#ef4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.metaCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>Type</Text>
            <Text style={[styles.metaValue, { color: palette.text }]}>{workout.type}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>Date</Text>
            <Text style={[styles.metaValue, { color: palette.text }]}>
              {new Date(workout.startAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>Duration</Text>
            <Text style={[styles.metaValue, { color: palette.text }]}>{formatDuration(resolveWorkoutMinutes(workout))}</Text>
          </View>
          {workout.estimatedCalories != null && (
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>Calories</Text>
              <Text style={[styles.metaValue, { color: palette.text }]}>{workout.estimatedCalories} kcal</Text>
            </View>
          )}
          {workout.overallRpe != null && (
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>Overall RPE</Text>
              <Text style={[styles.metaValue, { color: palette.text }]}>{workout.overallRpe}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Exercises</Text>

        {workout.exercises.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No exercises logged.</Text>
          </View>
        ) : (
          workout.exercises.map((exercise) => (
            <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.exerciseHeader}>
                <Text style={[styles.exerciseTitle, { color: palette.text }]}>{exercise.name}</Text>
                <Text style={[styles.exerciseType, { color: palette.textSecondary }]}>{exercise.type}</Text>
              </View>
              {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                <Text style={[styles.muscleGroups, { color: palette.textSecondary }]}>
                  {exercise.muscleGroups.join(', ')}
                </Text>
              )}
              {exercise.sets.length === 0 ? (
                <Text style={[styles.noSets, { color: palette.textSecondary }]}>No sets logged</Text>
              ) : (
                exercise.sets.map((set, idx) => {
                  const pace = formatPace(set);
                  return (
                    <View key={`${exercise.id}_${idx}`} style={styles.setRow}>
                      <Text style={[styles.setIndex, { color: palette.textSecondary }]}>Set {idx + 1}</Text>
                      <Text style={[styles.setDetail, { color: palette.text }]}>
                        {formatSetSummary(set)}
                        {pace ? ` · ${pace}` : ''}
                      </Text>
                    </View>
                  );
                })
              )}
              {exercise.notes && (
                <Text style={[styles.exerciseNotes, { color: palette.textSecondary }]}>{exercise.notes}</Text>
              )}
            </View>
          ))
        )}

        {workout.notes && (
          <>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Notes</Text>
            <View style={[styles.notesCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.notesText, { color: palette.text }]}>{workout.notes}</Text>
            </View>
          </>
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
  deleteButton: { padding: 6 },
  deleteText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Figtree',
    flex: 1,
    textAlign: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  metaCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  exerciseCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  exerciseTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  exerciseType: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  muscleGroups: {
    fontSize: 12,
    fontWeight: '500',
  },
  noSets: {
    fontSize: 12,
    fontWeight: '500',
  },
  setRow: {
    gap: 4,
  },
  setIndex: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  setDetail: {
    fontSize: 12,
    fontWeight: '600',
  },
  exerciseNotes: {
    fontSize: 12,
    fontWeight: '500',
  },
  notesCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  notesText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
