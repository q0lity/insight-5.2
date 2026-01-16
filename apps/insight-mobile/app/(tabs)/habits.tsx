import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

import { Text } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { HabitCard } from '@/src/components/HabitCard';
import { listHabitsWithStats, calculateHabitPoints, type HabitWithStats } from '@/src/storage/habits';
import { startEvent, stopEvent } from '@/src/storage/events';

export default function HabitsScreen() {
  const { palette, sizes } = useTheme();
  const isFocused = useIsFocused();

  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [activeTimed, setActiveTimed] = useState<Record<string, string>>({});

  const refreshHabits = useCallback(async () => {
    const rows = await listHabitsWithStats();
    setHabits(rows);
  }, []);

  useEffect(() => {
    if (isFocused) {
      void refreshHabits();
    }
  }, [isFocused, refreshHabits]);

  const logHabit = useCallback(async (habit: HabitWithStats, positive: boolean) => {
    const now = Date.now();
    const points = calculateHabitPoints(habit);
    const trackerKey = `habit:${habit.id}${positive ? '' : ':neg'}`;
    await startEvent({
      title: habit.name,
      kind: 'log',
      startAt: now,
      endAt: now,
      trackerKey,
      points,
      tags: habit.tags ?? [],
      contexts: [],
      people: habit.people ?? [],
      location: habit.location ?? null,
      skills: habit.skills ?? [],
      character: habit.character ?? [],
      goal: habit.goal ?? null,
      project: habit.project ?? null,
      category: habit.category ?? null,
      subcategory: habit.subcategory ?? null,
      estimateMinutes: habit.estimateMinutes ?? null,
      importance: habit.importance ?? null,
      difficulty: habit.difficulty ?? null,
    });
    await refreshHabits();
  }, [refreshHabits]);

  const startTimed = useCallback(async (habit: HabitWithStats) => {
    if (activeTimed[habit.id]) return;
    const now = Date.now();
    const event = await startEvent({
      title: habit.name,
      kind: 'event',
      startAt: now,
      endAt: null,
      trackerKey: `habit:${habit.id}`,
      points: calculateHabitPoints(habit),
      tags: habit.tags ?? [],
      contexts: [],
      people: habit.people ?? [],
      location: habit.location ?? null,
      skills: habit.skills ?? [],
      character: habit.character ?? [],
      goal: habit.goal ?? null,
      project: habit.project ?? null,
      category: habit.category ?? null,
      subcategory: habit.subcategory ?? null,
      estimateMinutes: habit.estimateMinutes ?? null,
      importance: habit.importance ?? null,
      difficulty: habit.difficulty ?? null,
    });
    setActiveTimed((prev) => ({ ...prev, [habit.id]: event.id }));
    await refreshHabits();
  }, [activeTimed, refreshHabits]);

  const stopTimed = useCallback(async (habit: HabitWithStats) => {
    const eventId = activeTimed[habit.id];
    if (!eventId) return;
    await stopEvent(eventId);
    setActiveTimed((prev) => {
      const next = { ...prev };
      delete next[habit.id];
      return next;
    });
    await refreshHabits();
  }, [activeTimed, refreshHabits]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: sizes.headerTitle, color: palette.text }]}>Habits</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            Synced from your ecosystem
          </Text>
        </View>

        {habits.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.emptyTitle, { fontSize: sizes.sectionTitle, color: palette.text }]}>No Habits Yet</Text>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              Add habits on the web app and they will appear here automatically.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                streak={habit.streak}
                heatmapData={habit.heatmapData}
                todayLogs={habit.todayLogs}
                onPlus={() => void logHabit(habit, true)}
                onMinus={() => void logHabit(habit, false)}
                onStartTimed={() => void startTimed(habit)}
                onStopTimed={() => void stopTimed(habit)}
                onPress={() => {}}
              />
            ))}
          </View>
        )}

        <TouchableOpacity style={[styles.syncHint, { borderColor: palette.border }]}>
          <Text style={[styles.syncHintText, { color: palette.textSecondary }]}>
            Habits sync automatically when you are signed in.
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  header: { marginBottom: 8 },
  title: { fontWeight: '800', fontFamily: 'Figtree_800ExtraBold', marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '500', fontFamily: 'Figtree_500Medium' },
  emptyState: { borderRadius: 20, padding: 40, borderWidth: 1, alignItems: 'center', gap: 8 },
  emptyTitle: { fontWeight: '700', fontFamily: 'Figtree_700Bold' },
  emptyText: { fontSize: 14, fontWeight: '400', fontFamily: 'Figtree_400Regular', textAlign: 'center' },
  list: { gap: 16 },
  syncHint: { borderRadius: 16, borderWidth: 1, padding: 12, alignItems: 'center' },
  syncHintText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
