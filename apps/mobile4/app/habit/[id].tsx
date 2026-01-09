import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { MobileHeatmap } from '@/src/components/MobileHeatmap';
import { useSession } from '@/src/state/session';
import {
  getHabit,
  getHabitStats,
  getHabitLogs,
  getHabitHeatmapData,
  calculateHabitPoints,
  deleteHabit,
  type HabitDef,
  type HabitLog,
} from '@/src/storage/habits';
import { startEvent } from '@/src/storage/events';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { active, startSession } = useSession();

  const [habit, setHabit] = useState<HabitDef | null>(null);
  const [stats, setStats] = useState<{
    streak: number;
    totalPoints: number;
    totalMinutes: number;
    todayLogs: number;
    weekLogs: number;
  } | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [habitData, statsData, logsData, heatmapRaw] = await Promise.all([
        getHabit(id),
        getHabitStats(id, 365),
        getHabitLogs(id, 90),
        getHabitHeatmapData(id, 365),
      ]);
      setHabit(habitData);
      setStats(statsData);
      setLogs(logsData);

      // Convert heatmap data to Record<string, number>
      const heatmapRecord: Record<string, number> = {};
      for (const item of heatmapRaw) {
        heatmapRecord[item.date] = item.value;
      }
      setHeatmapData(heatmapRecord);
    } catch (error) {
      console.error('Failed to load habit:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuickLog = useCallback(
    async (positive: boolean) => {
      if (!habit) return;
      const trackerKey = positive ? `habit:${habit.id}` : `habit:${habit.id}:neg`;
      const points = positive ? calculateHabitPoints(habit) : 0;

      try {
        await startEvent({
          title: habit.name,
          kind: 'log',
          startAt: Date.now(),
          endAt: Date.now(),
          trackerKey,
          points,
          category: habit.category,
          subcategory: habit.subcategory,
          importance: habit.importance,
          difficulty: habit.difficulty,
        });
        loadData();
      } catch (error) {
        console.error('Failed to log habit:', error);
        Alert.alert('Error', 'Failed to log habit.');
      }
    },
    [habit, loadData]
  );

  const handleStartTimed = useCallback(async () => {
    if (!habit) return;
    if (active?.locked) {
      Alert.alert('Tracker locked', 'Unlock the current focus session to switch activities.');
      return;
    }

    const doStart = async () => {
      await startSession({
        title: habit.name,
        kind: 'event',
        startedAt: Date.now(),
        category: habit.category,
        subcategory: habit.subcategory,
        importance: habit.importance,
        difficulty: habit.difficulty,
        trackerKey: `habit:${habit.id}`,
      });
      router.push('/focus');
    };

    if (active) {
      Alert.alert(
        'Switch activity?',
        `You are currently tracking "${active.title}". Start "${habit.name}" instead?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start', style: 'default', onPress: doStart },
        ]
      );
      return;
    }

    doStart();
  }, [habit, active, startSession, router]);

  const handleEdit = useCallback(() => {
    if (!habit) return;
    router.push(`/habit-form?id=${habit.id}` as any);
  }, [habit, router]);

  const handleDelete = useCallback(() => {
    if (!habit) return;
    Alert.alert('Delete Habit', `Are you sure you want to delete "${habit.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHabit(habit.id);
            router.back();
          } catch (error) {
            console.error('Failed to delete habit:', error);
            Alert.alert('Error', 'Failed to delete habit.');
          }
        },
      },
    ]);
  }, [habit, router]);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatLogTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const formatLogDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading || !habit) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <InsightIcon name="chevronLeft" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Loading...</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
    );
  }

  const showPlusButton = habit.polarity === 'positive' || habit.polarity === 'both';
  const showMinusButton = habit.polarity === 'negative' || habit.polarity === 'both';
  const categoryPath = [habit.category, habit.subcategory].filter(Boolean).join(' | ');

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]} numberOfLines={1}>
          {habit.name}
        </Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <InsightIcon name="settings" size={20} color={palette.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}>
        {/* Category Breadcrumb */}
        {categoryPath && (
          <Text style={[styles.categoryPath, { color: palette.tabIconDefault }]}>{categoryPath}</Text>
        )}

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: isDark ? 'rgba(251,146,60,0.12)' : 'rgba(251,146,60,0.08)' },
            ]}>
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={[styles.statValue, { color: '#F97316' }]}>{stats?.streak ?? 0}</Text>
            <Text style={[styles.statLabel, { color: palette.tabIconDefault }]}>Streak</Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: isDark ? 'rgba(217,93,57,0.12)' : 'rgba(217,93,57,0.08)' },
            ]}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={[styles.statValue, { color: '#D95D39' }]}>{Math.round(stats?.totalPoints ?? 0)}</Text>
            <Text style={[styles.statLabel, { color: palette.tabIconDefault }]}>Points</Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)' },
            ]}>
            <Text style={styles.statIcon}>⏱</Text>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>
              {formatDuration(stats?.totalMinutes ?? 0)}
            </Text>
            <Text style={[styles.statLabel, { color: palette.tabIconDefault }]}>Total Time</Text>
          </View>
        </View>

        {/* Heatmap */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: isDark ? 'rgba(15,19,32,0.92)' : 'rgba(255,255,255,0.95)',
              borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
            },
          ]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Activity</Text>
          <MobileHeatmap
            data={heatmapData}
            initialRange="month"
            accentColor={habit.color}
          />
        </View>

        {/* Recent Activity */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: isDark ? 'rgba(15,19,32,0.92)' : 'rgba(255,255,255,0.95)',
              borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
            },
          ]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent Activity</Text>
          {logs.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.tabIconDefault }]}>
              No activity yet. Tap + to log your first entry.
            </Text>
          ) : (
            <View style={styles.logsList}>
              {logs.slice(0, 10).map((log) => (
                <View key={log.id} style={styles.logRow}>
                  <View style={styles.logInfo}>
                    <View
                      style={[
                        styles.logIndicator,
                        { backgroundColor: log.positive ? '#22C55E' : '#EF4444' },
                      ]}
                    />
                    <View style={styles.logDetails}>
                      <Text style={[styles.logDate, { color: palette.text }]}>
                        {formatLogDate(log.startAt)}
                      </Text>
                      <Text style={[styles.logTime, { color: palette.tabIconDefault }]}>
                        {formatLogTime(log.startAt)}
                        {log.durationMinutes ? ` - ${formatDuration(log.durationMinutes)}` : ''}
                      </Text>
                    </View>
                  </View>
                  {log.positive && log.points > 0 && (
                    <Text style={[styles.logPoints, { color: '#D95D39' }]}>+{Math.round(log.points)}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            {showMinusButton && (
              <Pressable onPress={() => handleQuickLog(false)} style={[styles.actionButton, styles.minusAction]}>
                <InsightIcon name="minus" size={24} color="#EF4444" />
                <Text style={[styles.actionLabel, { color: '#EF4444' }]}>Miss</Text>
              </Pressable>
            )}
            {showPlusButton && (
              <Pressable onPress={() => handleQuickLog(true)} style={[styles.actionButton, styles.plusAction]}>
                <InsightIcon name="plus" size={24} color="#22C55E" />
                <Text style={[styles.actionLabel, { color: '#22C55E' }]}>Done</Text>
              </Pressable>
            )}
            {habit.isTimed && (
              <Pressable
                onPress={handleStartTimed}
                style={[styles.actionButton, { backgroundColor: habit.color }]}>
                <InsightIcon name="play" size={24} color="#FFFFFF" />
                <Text style={[styles.actionLabel, { color: '#FFFFFF' }]}>Start</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Delete Button */}
        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <InsightIcon name="dots" size={18} color="#EF4444" />
          <Text style={styles.deleteText}>Delete Habit</Text>
        </Pressable>
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
  backButton: {
    padding: 8,
  },
  editButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Figtree',
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  categoryPath: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Figtree',
    textAlign: 'center',
    marginTop: -8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  logsList: {
    gap: 12,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  logDetails: {
    gap: 2,
  },
  logDate: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  logTime: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  logPoints: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Figtree',
    textAlign: 'center',
    paddingVertical: 16,
  },
  actionsSection: {
    gap: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  minusAction: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  plusAction: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 20,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Figtree',
    color: '#EF4444',
  },
});
