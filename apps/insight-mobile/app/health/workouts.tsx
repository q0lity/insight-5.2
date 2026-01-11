import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/state/theme';
import { listWorkouts } from '@/src/storage/workouts';
import { formatDuration, resolveWorkoutMinutes } from '@/src/lib/health';
import type { WorkoutEntry } from '@/src/lib/health';

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

  const sorted = useMemo(() => [...workouts].sort((a, b) => b.startAt - a.startAt), [workouts]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
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
            <TouchableOpacity
              key={workout.id}
              style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
              onPress={() => router.push(`/health/workout/${workout.id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: palette.text }]}>{workout.title}</Text>
                  <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>
                    {new Date(workout.startAt).toLocaleDateString()} - {workout.type}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>
                    {formatDuration(resolveWorkoutMinutes(workout))}
                  </Text>
                  {workout.overallRpe != null && (
                    <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>RPE {workout.overallRpe}</Text>
                  )}
                </View>
              </View>

              <View style={styles.exercisePreview}>
                <Text style={[styles.exerciseCount, { color: palette.textSecondary }]}>
                  {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
                </Text>
                {workout.estimatedCalories != null && (
                  <Text style={[styles.exerciseCount, { color: palette.textSecondary }]}>
                    {workout.estimatedCalories} kcal
                  </Text>
                )}
              </View>
            </TouchableOpacity>
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
  exercisePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exerciseCount: {
    fontSize: 12,
  },
});
