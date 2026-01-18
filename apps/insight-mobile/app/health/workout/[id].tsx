import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/state/theme';
import { getWorkout, deleteWorkout } from '@/src/storage/workouts';
import { formatDuration, formatSetSummary, resolveWorkoutMinutes } from '@/src/lib/health';
import type { ExerciseSet, WorkoutEntry } from '@/src/lib/health';
import { Screen } from '@/components/Screen';

function formatPace(set: ExerciseSet) {
  if (!set.distance || !set.duration) return null;
  const hours = set.duration / 3600;
  if (!hours) return null;
  const pace = set.distance / hours;
  const unit = set.distanceUnit === 'km' ? 'km/h' : 'mph';
  return `${pace.toFixed(1)} ${unit}`;
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { palette } = useTheme();
  const [workout, setWorkout] = useState<WorkoutEntry | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return;
      const result = await getWorkout(id);
      if (!mounted) return;
      setWorkout(result);
    };
    if (isFocused) {
      void load();
    }
    return () => {
      mounted = false;
    };
  }, [id, isFocused]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            await deleteWorkout(id);
            router.back();
          },
        },
      ],
    );
  };

  if (!workout) {
    return (
      <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Workout</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingWrap}>
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Loading...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]} numberOfLines={1}>{workout.title}</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.backButton}>
          <Ionicons name="trash-outline" size={22} color={palette.danger ?? '#ef4444'} />
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
            <Text style={[styles.metaValue, { color: palette.text }]}>
              {formatDuration(resolveWorkoutMinutes(workout))}
            </Text>
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
    flex: 1,
    textAlign: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 10,
  },
  scroll: {
    paddingHorizontal: 14,
    paddingBottom: 28,
    gap: 11,
  },
  metaCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 9,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 17,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 9,
  },
  exerciseCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
    gap: 6,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseTitle: {
    fontSize: 10,
    fontWeight: '700',
  },
  exerciseType: {
    fontSize: 8,
  },
  muscleGroups: {
    fontSize: 8,
  },
  noSets: {
    fontSize: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  setIndex: {
    fontSize: 8,
    width: 34,
  },
  setDetail: {
    fontSize: 9,
    flex: 1,
  },
  exerciseNotes: {
    fontSize: 8,
    fontStyle: 'italic',
    marginTop: 4,
  },
  notesCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
  },
  notesText: {
    fontSize: 9,
    lineHeight: 14,
  },
});