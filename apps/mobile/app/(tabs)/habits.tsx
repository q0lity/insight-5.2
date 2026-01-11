/**
 * Habits Screen
 *
 * Displays and manages habit tracking with:
 * - Habit cards with streaks and mini heatmaps
 * - Quick log buttons (+/-)
 * - Timed habit tracking
 * - Pull-to-refresh
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { triggerHaptic } from '@/src/utils/haptics';

export default function HabitsScreen() {
  const router = useRouter();
  const { palette, sizes } = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate data fetch
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  };

  const handleAddHabit = () => {
    triggerHaptic('medium');
    router.push('/habit-form');
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text
          style={[styles.headerTitle, { color: palette.text, fontSize: sizes.headerTitle }]}
          accessibilityRole="header"
        >
          Habits
        </Text>
        <Pressable
          onPress={handleAddHabit}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
          accessibilityRole="button"
          accessibilityLabel="Add new habit"
        >
          <InsightIcon name="plus" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.statValue, { color: palette.tint, fontSize: sizes.metricValue }]}>0</Text>
          <Text style={[styles.statLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>Total Streaks</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.statValue, { color: palette.success, fontSize: sizes.metricValue }]}>0</Text>
          <Text style={[styles.statLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>Done Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.statValue, { color: palette.text, fontSize: sizes.metricValue }]}>0</Text>
          <Text style={[styles.statLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>Total XP</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.tint}
          />
        }
      >
        {/* Empty State */}
        <View
          style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
          accessibilityLabel="No habits created. Tap to create your first habit."
        >
          <InsightIcon name="smile" size={48} color={palette.textSecondary} />
          <Text style={[styles.emptyTitle, { color: palette.text, fontSize: sizes.bodyText }]}>
            No habits yet
          </Text>
          <Text style={[styles.emptyText, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
            Create your first habit to start tracking
          </Text>
          <Pressable
            onPress={handleAddHabit}
            style={[styles.createButton, { backgroundColor: palette.tintLight }]}
            accessibilityRole="button"
            accessibilityLabel="Create first habit"
          >
            <InsightIcon name="plus" size={16} color={palette.tint} />
            <Text style={[styles.createButtonText, { color: palette.tint, fontSize: sizes.smallText }]}>
              Create Habit
            </Text>
          </Pressable>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statValue: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    marginTop: 4,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 20,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  createButtonText: {
    fontWeight: '600',
  },
});
