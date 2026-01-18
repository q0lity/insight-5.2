import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { useSession } from '@/src/state/session';
import { listEvents, getPointsByDay, getDailyStats, type MobileEvent } from '@/src/storage/events';
import { listTasks, completeTask, type MobileTask } from '@/src/storage/tasks';
import { listTrackerLogs, type TrackerLogEntry } from '@/src/storage/trackers';
import { InsightIcon, type InsightIconName } from '@/src/components/InsightIcon';
import { RollingNumber } from '@/src/components/RollingNumber';
import { MobileHeatmap, type HeatmapRange } from '@/src/components/MobileHeatmap';
import { TrackerHeatMap } from '@/src/components/TrackerHeatMap';
import { TrackerPieChart } from '@/src/components/TrackerPieChart';
import { RadarChart } from '@/src/components/charts/RadarChart';
import { RoutineItem } from '@/src/components/RoutineItem';
import { computeXp, formatXp } from '@/src/utils/points';
import { Screen } from '@/components/Screen';
import { LuxCard } from '@/components/LuxCard';
import { LuxHeader } from '@/components/LuxHeader';
import { SPACING } from '@/src/constants/design-tokens';

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatCategoryLine(event: MobileEvent) {
  const parts = [event.category, event.subcategory].filter(Boolean);
  return parts.length ? parts.join(' / ') : '';
}

function formatBreadcrumb(category?: string | null, subcategory?: string | null, title?: string | null) {
  const parts = [category, subcategory, title].filter(Boolean);
  if (parts.length === 0) return null;
  // If only title, return it directly
  if (!category && !subcategory && title) return null;
  return parts.join(' | ');
}

function formatTaskDate(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getTaskIcon(task: MobileTask): InsightIconName {
  const text = `${task.title} ${(task.tags ?? []).join(' ')} ${task.category ?? ''}`.toLowerCase();
  if (/(work|meeting|call)/i.test(text)) return 'briefcase';
  if (/(gym|workout|exercise)/i.test(text)) return 'target';
  if (/(write|note|doc)/i.test(text)) return 'file';
  if (/(email|message)/i.test(text)) return 'sparkle';
  if (/(buy|shop|errand)/i.test(text)) return 'gift';
  return 'check';
}

function formatTaskTime(timestamp: number | null | undefined): string | undefined {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatMinutes(minutes: number | null | undefined): string | undefined {
  if (!minutes) return undefined;
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// Event accent colors and icons based on category/type
function getEventAccent(event: MobileEvent): { color: string; icon: 'calendar' | 'check' | 'briefcase' | 'target' | 'sparkle' | 'smile' | 'pin' | 'users' } {
  const text = `${event.title} ${(event.tags ?? []).join(' ')} ${event.category ?? ''} ${event.subcategory ?? ''}`.toLowerCase();

  if (event.kind === 'task') return { color: '#6B8CAE', icon: 'check' };
  if (/(work|shift|meeting|call|standup|rounds)/i.test(text)) return { color: '#5B5F97', icon: 'briefcase' };
  if (/(gym|workout|lift|run|cardio|yoga|exercise)/i.test(text)) return { color: '#7BAF7B', icon: 'target' };
  if (/(food|dinner|lunch|breakfast|snack|coffee)/i.test(text)) return { color: '#D95D39', icon: 'sparkle' };
  if (/(sleep|nap|bed|rest)/i.test(text)) return { color: '#8C8B88', icon: 'smile' };
  if (/(commute|drive|transport)/i.test(text)) return { color: '#8C8B88', icon: 'pin' };
  if (/(social|friend|family|call|mom|dad)/i.test(text)) return { color: '#C88B9D', icon: 'users' };

  return { color: '#A3B87C', icon: 'calendar' };
}

function formatDuration(startMs: number, endMs: number) {
  const mins = Math.round((endMs - startMs) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

function isSameDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function averageTrackerValue(logs: TrackerLogEntry[], key: string) {
  const values = logs
    .filter((log) => log.trackerKey === key && typeof log.valueNumber === 'number')
    .map((log) => log.valueNumber as number);
  if (!values.length) return null;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(avg * 10) / 10;
}

export default function TodayScreen() {
  const router = useRouter();
  const { palette, sizes, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { active, stopSession, startSession } = useSession();
  const isFocused = useIsFocused();
  const [now, setNow] = useState(Date.now());
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [trackerLogs, setTrackerLogs] = useState<TrackerLogEntry[]>([]);
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [dailyStats, setDailyStats] = useState<{ totalPoints: number; totalMinutes: number; activeDays: number; streak: number } | null>(null);
  const [heatmapRange, setHeatmapRange] = useState<HeatmapRange>('month');
  const [upcomingTasks, setUpcomingTasks] = useState<MobileTask[]>([]);
  const [quickStartOpen, setQuickStartOpen] = useState(false);
  const [quickStartTitle, setQuickStartTitle] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    let mounted = true;
    listEvents().then((rows) => {
      if (!mounted) return;
      setEvents(rows);
    });
    return () => {
      mounted = false;
    };
  }, [active?.id, isFocused]);

  useEffect(() => {
    if (!isFocused) return;
    let mounted = true;
    const startAt = Date.now() - 7 * 24 * 60 * 60 * 1000;
    listTrackerLogs({ startAt, limit: 40 }).then((rows) => {
      if (!mounted) return;
      setTrackerLogs(rows);
    });
    return () => {
      mounted = false;
    };
  }, [active?.id, isFocused]);

  // Load heatmap data based on selected range
  useEffect(() => {
    if (!isFocused) return;
    let mounted = true;
    const days = heatmapRange === 'week' ? 7 : heatmapRange === 'month' ? 30 : heatmapRange === 'quarter' ? 90 : 365;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);

    getPointsByDay(startDate, endDate).then((data) => {
      if (!mounted) return;
      setHeatmapData(data);
    });

    getDailyStats(days).then((stats) => {
      if (!mounted) return;
      setDailyStats(stats);
    });

    return () => {
      mounted = false;
    };
  }, [isFocused, heatmapRange]);

  // Load upcoming tasks
  useEffect(() => {
    if (!isFocused) return;
    let mounted = true;
    listTasks().then((tasks) => {
      if (!mounted) return;
      // Filter for non-completed tasks, sorted by due date then scheduled date
      const upcoming = tasks
        .filter((t) => t.status !== 'done' && t.status !== 'canceled')
        .sort((a, b) => {
          const aDue = a.dueAt ?? a.scheduledAt ?? Infinity;
          const bDue = b.dueAt ?? b.scheduledAt ?? Infinity;
          return aDue - bDue;
        })
        .slice(0, 5);
      setUpcomingTasks(upcoming);
    });
    return () => {
      mounted = false;
    };
  }, [isFocused]);

  const handleCompleteTask = async (taskId: string) => {
    await completeTask(taskId);
    setUpcomingTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleStartTask = async (task: MobileTask) => {
    await startSession({
      title: task.title,
      kind: 'task',
      startedAt: Date.now(),
      estimatedMinutes: task.estimateMinutes ?? null,
      importance: task.importance ?? null,
      difficulty: task.difficulty ?? null,
      parentEventId: task.parentEventId ?? null,
      tags: task.tags ?? [],
      contexts: task.contexts ?? [],
      people: task.people ?? [],
      location: null,
      category: task.category ?? null,
      subcategory: task.subcategory ?? null,
      project: task.project ?? null,
      goal: task.goal ?? null,
      skills: [],
      character: [],
    });
    router.push('/focus');
  };

  const startQuickSession = async () => {
    const title = quickStartTitle.trim();
    if (!title) return;
    await startSession({
      title,
      kind: 'event',
      startedAt: Date.now(),
      estimatedMinutes: null,
    });
    setQuickStartTitle('');
    setQuickStartOpen(false);
    router.push('/focus');
  };

  const elapsedMs = active ? now - active.startedAt : 0;
  const remainingMs =
    active?.estimatedMinutes != null ? Math.max(0, active.estimatedMinutes * 60 * 1000 - elapsedMs) : null;
  const totalMs = active?.estimatedMinutes != null ? active.estimatedMinutes * 60 * 1000 : null;
  const progress = totalMs ? Math.min(1, elapsedMs / totalMs) : 0;
  const durationMinutes = Math.max(0, elapsedMs / 60000);

  const activeXp = useMemo(() => {
    if (!active) return 0;
    return computeXp({
      importance: active.importance ?? 5,
      difficulty: active.difficulty ?? 5,
      durationMinutes,
      goal: active.goal ?? undefined,
      fallbackGoalImportance: active.importance ?? 5,
    });
  }, [active?.importance, active?.difficulty, durationMinutes, active?.goal]);

  const activeBreadcrumb = useMemo(() => {
    if (!active) return null;
    return formatBreadcrumb(active.category, active.subcategory, active.title);
  }, [active?.category, active?.subcategory, active?.title]);

  const todayKey = useMemo(() => new Date().toDateString(), []);
  const todayEvents = useMemo(() => {
    return events
      .filter((event) => new Date(event.startAt).toDateString() === todayKey)
      .sort((a, b) => a.startAt - b.startAt);
  }, [events, todayKey]);

  const todaySummary = useMemo(() => {
    let totalMinutes = 0;
    const categoryCounts = new Map<string, number>();

    for (const event of todayEvents) {
      const duration =
        event.endAt != null
          ? Math.max(0, (event.endAt - event.startAt) / 60000)
          : event.estimateMinutes ?? 0;
      totalMinutes += duration;
      const category = event.category ?? 'Other';
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }

    let topCategory: string | null = null;
    let topCount = 0;
    for (const [category, count] of categoryCounts.entries()) {
      if (count > topCount) {
        topCount = count;
        topCategory = category;
      }
    }

    return {
      count: todayEvents.length,
      totalMinutes,
      topCategory,
    };
  }, [todayEvents]);

  const moodAverage = useMemo(() => averageTrackerValue(trackerLogs, 'mood'), [trackerLogs]);
  const energyAverage = useMemo(() => averageTrackerValue(trackerLogs, 'energy'), [trackerLogs]);
  const radarData = useMemo(() => {
    const metrics = [
      { label: 'Mood', key: 'mood' },
      { label: 'Energy', key: 'energy' },
      { label: 'Stress', key: 'stress' },
      { label: 'Pain', key: 'pain' },
    ];
    return metrics.map((metric) => {
      const avg = averageTrackerValue(trackerLogs, metric.key);
      const value = avg != null ? Math.min(100, Math.round(avg * 10)) : 0;
      return { label: metric.label, shortLabel: metric.label[0], value };
    });
  }, [trackerLogs]);

  const upcomingSuggestion = useMemo(() => {
    if (active) return null;
    if (snoozedUntil && now < snoozedUntil) return null;
    const windowStart = now - 5 * 60 * 1000;
    const windowEnd = now + 10 * 60 * 1000;
    return events
      .filter((event) => !event.endAt || event.endAt > now)
      .find((event) => event.startAt >= windowStart && event.startAt <= windowEnd);
  }, [active, events, now, snoozedUntil]);

  const trackerSnapshot = useMemo(() => {
    const seen = new Set<string>();
    const latest: TrackerLogEntry[] = [];
    for (const log of trackerLogs) {
      if (seen.has(log.trackerKey)) continue;
      seen.add(log.trackerKey);
      latest.push(log);
      if (latest.length >= 4) break;
    }
    return latest;
  }, [trackerLogs]);

  const trackerCount = useMemo(() => new Set(trackerLogs.map((log) => log.trackerKey)).size, [trackerLogs]);

  const recentTrackerLogs = useMemo(() => trackerLogs.slice(0, 3), [trackerLogs]);
  const sparkBars = useMemo(() => buildSparkBars(heatmapData), [heatmapData]);
  const sparkMax = useMemo(() => Math.max(1, ...sparkBars.map((bar) => bar.value)), [sparkBars]);

  const quickActions = useMemo(
    (): Array<{ key: string; label: string; icon: InsightIconName; onPress: () => void }> => [
      { key: 'event', label: 'Event', icon: 'calendar', onPress: () => setQuickStartOpen(true) },
      { key: 'task', label: 'Task', icon: 'check', onPress: () => router.push('/tasks') },
      { key: 'note', label: 'Note', icon: 'file', onPress: () => router.push('/capture') },
      { key: 'habit', label: 'Habit', icon: 'target', onPress: () => router.push('/habits') },
      { key: 'tracker', label: 'Tracker', icon: 'sparkle', onPress: () => router.push('/trackers') },
    ],
    [router]
  );

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + sizes.spacing, paddingBottom: 70 }}
        showsVerticalScrollIndicator={false}
      >
      <LuxHeader
        overline="Dashboard"
        title="Visualize"
        subtitle="Tactical lifecycle insights"
        right={
          <TouchableOpacity
            style={[styles.nodeBadge, { borderColor: palette.border, backgroundColor: palette.tintLight }]}
            onPress={() => router.push('/settings')}
          >
            <Text style={[styles.nodeBadgeText, { color: palette.tint, fontSize: sizes.bodyText + 2 }]}>1</Text>
          </TouchableOpacity>
        }
        style={[styles.header, { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg }]}
      />

      <LuxCard
        accent={active ? palette.tintLight : palette.borderLight}
        style={[
          styles.activeCard,
          {
            marginHorizontal: SPACING.lg,
            borderRadius: sizes.borderRadius + 8,
            padding: SPACING.lg,
            gap: SPACING.md,
          },
        ]}>
        <View style={styles.activeHeader}>
          <View style={[styles.statusDot, { backgroundColor: active ? palette.success : palette.textSecondary }]} />
          <Text style={[styles.activeStatus, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
            {active ? 'ACTIVE SESSION' : 'NO ACTIVE EVENT'}
          </Text>
        </View>
        {activeBreadcrumb ? (
          <Text style={[styles.activeBreadcrumb, { color: palette.textSecondary, fontSize: sizes.smallText }]} numberOfLines={1}>
            {activeBreadcrumb}
          </Text>
        ) : null}
        <Text style={[styles.activeTitle, { color: palette.text, fontSize: sizes.headerTitle }]}>
          {active?.title && active.title !== 'Untitled'
            ? active.title
            : active
              ? (activeBreadcrumb || 'Active Session')
              : 'Ready to focus?'}
        </Text>
        <Text style={[styles.activeClock, { color: active ? palette.tint : palette.textSecondary }]}>
          {active ? formatClock(elapsedMs) : '00:00:00'}
        </Text>
        {active && totalMs ? (
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { backgroundColor: palette.borderLight }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(progress * 100)}%`,
                    backgroundColor: palette.tint,
                  }
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        ) : null}
        {active && remainingMs != null ? (
          <Text style={[styles.activeRemaining, { color: palette.textSecondary, fontSize: sizes.smallText }]}>{formatClock(remainingMs)} remaining</Text>
        ) : null}
        {active ? (
          <RollingNumber
            value={formatXp(activeXp)}
            prefix="+"
            suffix=" XP"
            textStyle={[styles.activeXp, { color: palette.tint, fontSize: sizes.sectionTitle + 3 }]}
          />
        ) : null}
        {active ? (
          <View style={[styles.activeActions, { gap: sizes.rowGap }]}>
            <TouchableOpacity
              style={[styles.activeButton, { borderColor: palette.tint, height: sizes.buttonHeightSmall, borderRadius: sizes.borderRadiusSmall }]}
              onPress={() => router.push(`/event/${active.id}`)}>
              <Text style={[styles.activeButtonText, { color: palette.tint, fontSize: sizes.smallText }]}>Open</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.activeButton, { backgroundColor: palette.tint, height: sizes.buttonHeightSmall, borderRadius: sizes.borderRadiusSmall }]}
              onPress={() => void stopSession()}>
              <Text style={[styles.activeButtonTextLight, { fontSize: sizes.smallText }]}>Stop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: palette.tint, borderRadius: sizes.borderRadiusSmall }]}
            onPress={() => setQuickStartOpen(true)}
          >
            <Text style={[styles.startBtnText, { fontSize: sizes.bodyText }]}>Start Session</Text>
          </TouchableOpacity>
        )}
      </LuxCard>

      <View style={[styles.quickActionsSection, { marginTop: SPACING.lg, paddingHorizontal: SPACING.lg, gap: SPACING.md }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle + 2 }]}>Capture</Text>
          <Text style={[styles.sectionHint, { color: palette.textSecondary, fontSize: sizes.smallText }]}>Start here</Text>
        </View>
        <View style={[styles.quickActionsRow, { gap: SPACING.sm }]}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={[
                styles.quickActionChip,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  paddingHorizontal: sizes.chipPadding,
                  paddingVertical: sizes.spacingSmall,
                  borderRadius: sizes.borderRadiusSmall,
                },
              ]}
              onPress={action.onPress}
            >
              <InsightIcon name={action.icon} size={sizes.iconSizeTiny} color={palette.tint} />
              <Text style={[styles.quickActionText, { color: palette.text, fontSize: sizes.smallText }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Modal transparent visible={quickStartOpen} animationType="fade" onRequestClose={() => setQuickStartOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPress} onPress={() => setQuickStartOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Start a new event</Text>
            <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>
              Give it a title to kick off a focus session.
            </Text>
            <TextInput
              value={quickStartTitle}
              onChangeText={setQuickStartTitle}
              placeholder="e.g., Code the app"
              placeholderTextColor={palette.textSecondary}
              style={[
                styles.modalInput,
                { color: palette.text, borderColor: palette.border, backgroundColor: palette.surfaceAlt },
              ]}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void startQuickSession()}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: palette.border }]}
                onPress={() => setQuickStartOpen(false)}
              >
                <Text style={[styles.modalButtonText, { color: palette.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: palette.tint }]}
                onPress={() => void startQuickSession()}
              >
                <Text style={[styles.modalButtonTextLight, { color: '#FFFFFF' }]}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {upcomingSuggestion ? (
        <View
          style={[
            styles.suggestionCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              marginHorizontal: sizes.spacing + 4,
              borderRadius: sizes.borderRadius,
              padding: sizes.cardPadding,
              gap: sizes.rowGap,
            },
          ]}>
          <View style={[styles.suggestionMeta, { gap: sizes.spacingSmall / 2 }]}>
            <Text style={[styles.suggestionLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>Starting soon</Text>
            <Text style={[styles.suggestionTitle, { color: palette.text, fontSize: sizes.bodyText }]} numberOfLines={1}>
              {upcomingSuggestion.title}
            </Text>
            <Text style={[styles.suggestionTime, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
              {formatTime(upcomingSuggestion.startAt)}
            </Text>
          </View>
          <View style={[styles.suggestionActions, { gap: sizes.spacingSmall }]}>
            <TouchableOpacity
              style={[styles.suggestionButton, { borderColor: palette.tint, height: sizes.buttonHeightSmall, borderRadius: sizes.borderRadiusSmall }]}
              onPress={() => {
                setSnoozedUntil(Date.now() + 10 * 60 * 1000);
              }}>
              <Text style={[styles.suggestionButtonText, { color: palette.tint, fontSize: sizes.smallText }]}>Snooze 10m</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.suggestionButton, { backgroundColor: palette.tint, height: sizes.buttonHeightSmall, borderRadius: sizes.borderRadiusSmall }]}
              onPress={() => {
                void startSession({
                  title: upcomingSuggestion.title,
                  kind: 'event',
                  startedAt: Date.now(),
                  estimatedMinutes: upcomingSuggestion.estimateMinutes ?? null,
                  importance: upcomingSuggestion.importance ?? null,
                  difficulty: upcomingSuggestion.difficulty ?? null,
                  parentEventId: upcomingSuggestion.id,
                  tags: upcomingSuggestion.tags ?? [],
                  contexts: upcomingSuggestion.contexts ?? [],
                  people: upcomingSuggestion.people ?? [],
                  location: upcomingSuggestion.location ?? null,
                  category: upcomingSuggestion.category ?? null,
                  subcategory: upcomingSuggestion.subcategory ?? null,
                  project: upcomingSuggestion.project ?? null,
                  goal: upcomingSuggestion.goal ?? null,
                  skills: upcomingSuggestion.skills ?? [],
                  character: upcomingSuggestion.character ?? [],
                }).then(() => router.push('/focus'));
              }}>
              <Text style={[styles.suggestionButtonTextLight, { fontSize: sizes.smallText }]}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={[styles.pulseSection, { marginTop: SPACING.lg, paddingHorizontal: SPACING.lg, gap: SPACING.md }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle + 3 }]}>Today Pulse</Text>
          <Text style={[styles.sectionMeta, { color: palette.textSecondary, fontSize: sizes.smallText + 1 }]}>
            {formatTime(now)}
          </Text>
        </View>

        <LuxCard style={styles.pulseCard}>
          <View style={[styles.pulseRow, { gap: sizes.spacingSmall }]}>
            <View style={styles.pulseStat}>
              <Text style={[styles.pulseValue, { color: palette.tint, fontSize: sizes.metricValue }]}>
                {todaySummary.count}
              </Text>
              <Text style={[styles.pulseLabel, { color: palette.textSecondary, fontSize: sizes.metricLabel }]}>
                Events
              </Text>
            </View>
            <View style={styles.pulseStat}>
              <Text style={[styles.pulseValue, { color: palette.text, fontSize: sizes.metricValue }]}>
                {todaySummary.totalMinutes ? `${Math.round((todaySummary.totalMinutes / 60) * 10) / 10}h` : '—'}
              </Text>
              <Text style={[styles.pulseLabel, { color: palette.textSecondary, fontSize: sizes.metricLabel }]}>
                Tracked
              </Text>
            </View>
            <View style={styles.pulseStat}>
              <Text style={[styles.pulseValue, { color: palette.text, fontSize: sizes.metricValue }]}>
                {todaySummary.topCategory ?? '—'}
              </Text>
              <Text style={[styles.pulseLabel, { color: palette.textSecondary, fontSize: sizes.metricLabel }]}>
                Top Category
              </Text>
            </View>
          </View>

          {(moodAverage != null || energyAverage != null) && (
            <View style={styles.pulseMiniRow}>
              {moodAverage != null && (
                <View style={[styles.pulseMiniTile, { borderColor: palette.borderLight, backgroundColor: palette.surfaceAlt }]}>
                  <Text style={[styles.pulseMiniValue, { color: palette.success }]}>
                    {moodAverage}
                  </Text>
                  <Text style={[styles.pulseMiniLabel, { color: palette.textSecondary }]}>
                    Mood Avg
                  </Text>
                </View>
              )}
              {energyAverage != null && (
                <View style={[styles.pulseMiniTile, { borderColor: palette.borderLight, backgroundColor: palette.surfaceAlt }]}>
                  <Text style={[styles.pulseMiniValue, { color: palette.warning }]}>
                    {energyAverage}
                  </Text>
                  <Text style={[styles.pulseMiniLabel, { color: palette.textSecondary }]}>
                    Energy Avg
                  </Text>
                </View>
              )}
            </View>
          )}
        </LuxCard>
      </View>

      {/* Overview Section with Heatmap and KPIs */}
      <View style={[styles.overviewSection, { marginTop: SPACING.lg, paddingHorizontal: SPACING.lg, gap: SPACING.md }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle + 3 }]}>Overview</Text>
        </View>

        <LuxCard style={styles.overviewCard}>
          <MobileHeatmap
            data={heatmapData}
            initialRange={heatmapRange}
            onRangeChange={setHeatmapRange}
          />

          {dailyStats && (
            <View style={[styles.kpiRow, { gap: sizes.spacingSmall }]}>
              <View style={[styles.kpiItem, { gap: sizes.spacingSmall / 2 }]}>
                <Text style={[styles.kpiValue, { color: palette.tint, fontSize: sizes.metricValue }]}>
                  {Math.round(dailyStats.totalPoints)}
                </Text>
                <Text style={[styles.kpiLabel, { color: palette.textSecondary, fontSize: sizes.metricLabel }]}>
                  Total Points
                </Text>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: palette.borderLight }]} />
              <View style={[styles.kpiItem, { gap: sizes.spacingSmall / 2 }]}>
                <Text style={[styles.kpiValue, { color: palette.text, fontSize: sizes.metricValue }]}>
                  {Math.round(dailyStats.totalMinutes / 60)}h
                </Text>
                <Text style={[styles.kpiLabel, { color: palette.textSecondary, fontSize: sizes.metricLabel }]}>
                  Time Tracked
                </Text>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: palette.borderLight }]} />
              <View style={[styles.kpiItem, { gap: sizes.spacingSmall / 2 }]}>
                <Text style={[styles.kpiValue, { color: dailyStats.streak > 0 ? palette.success : palette.text, fontSize: sizes.metricValue }]}>
                  {dailyStats.streak}
                </Text>
                <Text style={[styles.kpiLabel, { color: palette.textSecondary, fontSize: sizes.metricLabel }]}>
                  Day Streak
                </Text>
              </View>
            </View>
          )}
        </LuxCard>
      </View>

      {/* Upcoming Tasks Section */}
      {upcomingTasks.length > 0 && (
        <View style={[styles.tasksSection, { marginTop: SPACING.lg, paddingHorizontal: SPACING.lg, gap: SPACING.md }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle + 3 }]}>Upcoming Tasks</Text>
          <TouchableOpacity onPress={() => router.push('/tasks')}>
            <Text style={[styles.seeAll, { color: palette.tint, fontSize: sizes.smallText + 1 }]}>See All</Text>
          </TouchableOpacity>
          </View>

          <View style={[styles.tasksCard, { gap: SPACING.sm }]}>
            {upcomingTasks.map((task) => (
              <RoutineItem
                key={task.id}
                icon={getTaskIcon(task)}
                time={formatTaskTime(task.scheduledAt ?? task.dueAt)}
                title={task.title}
                duration={formatMinutes(task.estimateMinutes)}
                completed={task.status === 'done'}
                onToggle={() => handleCompleteTask(task.id)}
                onPress={() => router.push('/tasks')}
              />
            ))}
          </View>
        </View>
      )}

      <View style={[styles.graphSection, { marginTop: SPACING.lg, paddingHorizontal: SPACING.lg, gap: SPACING.md }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle + 3 }]}>Graphs</Text>
          <TouchableOpacity onPress={() => router.push('/trackers')}>
            <Text style={[styles.seeAll, { color: palette.tint, fontSize: sizes.smallText + 1 }]}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.graphGrid}>
          <LuxCard style={styles.graphCard}>
            <Text style={[styles.cardTitle, { color: palette.textSecondary }]}>Tracker Heatmap</Text>
            <TrackerHeatMap logs={trackerLogs} days={7} />
          </LuxCard>

          <LuxCard style={styles.graphCard}>
            <Text style={[styles.cardTitle, { color: palette.textSecondary }]}>Category Split</Text>
            <TrackerPieChart logs={trackerLogs} size={90} />
          </LuxCard>

          <LuxCard style={styles.graphCard}>
            <Text style={[styles.cardTitle, { color: palette.textSecondary }]}>Focus Radar</Text>
            <RadarChart data={radarData} size={120} showLabels={false} />
          </LuxCard>

          <LuxCard style={styles.graphCard}>
            <Text style={[styles.cardTitle, { color: palette.textSecondary }]}>Weekly XP</Text>
            <View style={styles.sparkRow}>
              {sparkBars.length ? (
                sparkBars.map((bar) => {
                  const height = Math.max(6, Math.round((bar.value / sparkMax) * 48));
                  return (
                    <View key={bar.label} style={styles.sparkItem}>
                      <View style={[styles.sparkBar, { height, backgroundColor: bar.value ? palette.tint : palette.borderLight }]} />
                      <Text style={[styles.sparkLabel, { color: palette.textSecondary }]}>{bar.label}</Text>
                    </View>
                  );
                })
              ) : (
                <Text style={[styles.emptySpark, { color: palette.textSecondary }]}>No data yet</Text>
              )}
            </View>
          </LuxCard>

          <LuxCard style={styles.graphCard}>
            <Text style={[styles.cardTitle, { color: palette.textSecondary }]}>Recent Trackers</Text>
            <View style={styles.trackerMiniRow}>
              {trackerSnapshot.length ? (
                trackerSnapshot.map((log) => (
                  <View key={log.id} style={[styles.trackerMiniTile, { borderColor: palette.borderLight }]}>
                    <Text style={[styles.trackerMiniLabel, { color: palette.textSecondary }]}>{log.trackerLabel}</Text>
                    <Text style={[styles.trackerMiniValue, { color: palette.tint }]}>{formatTrackerValue(log)}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptySpark, { color: palette.textSecondary }]}>No logs yet</Text>
              )}
            </View>
          </LuxCard>
        </View>
      </View>

      <View style={[styles.timelineSection, { marginTop: SPACING.lg, paddingHorizontal: SPACING.lg, gap: SPACING.md }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle + 3 }]}>Today's Timeline</Text>
          <TouchableOpacity onPress={() => router.push('/calendar')}>
            <Text style={[styles.seeAll, { color: palette.tint, fontSize: sizes.smallText + 1 }]}>See All</Text>
          </TouchableOpacity>
        </View>

        <LuxCard style={[styles.timelineCard, { borderRadius: sizes.borderRadius }]}>
          {todayEvents.length ? (
            <View style={[styles.tlContainer, { paddingVertical: sizes.spacingSmall }]}>
              {todayEvents.map((event, idx) => {
                const accent = getEventAccent(event);
                const isActive = active?.id === event.id;
                const isLast = idx === todayEvents.length - 1;
                return (
                  <Pressable
                    key={event.id}
                    style={styles.tlBlock}
                    onPress={() => router.push(`/event/${event.id}`)}>
                    {/* Left: Time */}
                    <View style={styles.tlTimeCol}>
                      <Text style={[styles.tlTime, { color: palette.text, fontSize: sizes.smallText + 1 }]}>
                        {formatTime(event.startAt)}
                      </Text>
                    </View>

                    {/* Center: Line + Node */}
                    <View style={styles.tlLineCol}>
                      <View style={[styles.tlLineSegment, { backgroundColor: palette.borderLight }]} />
                      <View style={[styles.tlNode, { borderColor: accent.color, backgroundColor: palette.surface, width: sizes.iconSize + 16, height: sizes.iconSize + 16, borderRadius: (sizes.iconSize + 16) / 2 }]}>
                        <InsightIcon name={accent.icon} size={sizes.iconSizeSmall} color={accent.color} />
                        {isActive && (
                          <View style={[styles.tlActivePulse, { backgroundColor: accent.color, width: sizes.iconSize + 16, height: sizes.iconSize + 16, borderRadius: (sizes.iconSize + 16) / 2 }]} />
                        )}
                      </View>
                      {!isLast && (
                        <View style={[styles.tlLineSegment, { backgroundColor: palette.borderLight }]} />
                      )}
                    </View>

                    {/* Right: Content card */}
                    <View style={[styles.tlContent, { borderColor: `${accent.color}40`, borderRadius: sizes.borderRadiusSmall, padding: sizes.cardPadding - 4, marginVertical: sizes.spacingSmall }]}>
                      <View style={styles.tlTitleRow}>
                        <Text style={[styles.tlTitle, { color: accent.color, fontSize: sizes.bodyText }]} numberOfLines={1}>
                          {event.title}
                        </Text>
                        {isActive && (
                          <View style={[styles.tlActiveDot, { backgroundColor: accent.color }]} />
                        )}
                      </View>
                      {(event.category || event.subcategory) && (
                        <Text style={[styles.tlCategory, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
                          {[event.category, event.subcategory].filter(Boolean).join(' · ')}
                        </Text>
                      )}
                      {event.tags && event.tags.length > 0 && (
                        <View style={[styles.tlTags, { gap: sizes.spacingSmall / 2, marginTop: sizes.spacingSmall / 2 }]}>
                          {event.tags.slice(0, 3).map((tag) => (
                            <View key={tag} style={[styles.tlTag, { backgroundColor: palette.borderLight, paddingHorizontal: sizes.spacingSmall, paddingVertical: sizes.spacingSmall / 2, borderRadius: sizes.borderRadiusSmall / 2 }]}>
                              <Text style={[styles.tlTagText, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {!isActive && event.endAt && (
                        <Text style={[styles.tlDuration, { color: palette.textSecondary, fontSize: sizes.tinyText, marginTop: sizes.spacingSmall / 2 }]}>
                          {formatDuration(event.startAt, event.endAt)}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyTimeline, { padding: sizes.spacing * 2, gap: sizes.rowGap }]}>
              <InsightIcon name="calendar" size={sizes.iconSize + 8} color={palette.textSecondary} />
              <Text style={[styles.timelineEmptyText, { color: palette.textSecondary, fontSize: sizes.smallText + 1 }]}>No events logged for today yet.</Text>
            </View>
          )}
        </LuxCard>
      </View>
      </ScrollView>
    </Screen>
  );
}

function formatTrackerValue(log: TrackerLogEntry) {
  if (log.valueBool != null) return log.valueBool ? 'Yes' : 'No';
  if (log.valueNumber != null && Number.isFinite(log.valueNumber)) {
    return Number.isInteger(log.valueNumber) ? `${log.valueNumber}` : log.valueNumber.toFixed(1);
  }
  if (log.valueText != null && log.valueText !== '') return log.valueText;
  return '-';
}

type SparkBarDatum = { label: string; value: number };

function buildSparkBars(data: Record<string, number>): SparkBarDatum[] {
  const keys = Object.keys(data).sort();
  const recent = keys.slice(-7);
  return recent.map((key) => ({
    label: key.slice(5).replace('-', '/'),
    value: data[key] ?? 0,
  }));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 17,
    marginBottom: 17,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  nodeBadge: {
    width: 31,
    height: 31,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(217,93,57,0.1)',
  },
  nodeBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D95D39',
  },
  activeCard: {
    borderRadius: 22,
    padding: 17,
    gap: 8,
    alignItems: 'center',
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  activeStatus: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  activeBreadcrumb: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  activeTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: 'Figtree',
  },
  activeClock: {
    fontSize: 34,
    fontWeight: '900',
    fontFamily: 'System',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 8,
    fontWeight: '700',
    width: 25,
    textAlign: 'right',
  },
  activeRemaining: {
    fontSize: 9,
    fontWeight: '600',
  },
  activeXp: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  activeActions: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  activeButton: {
    flex: 1,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButtonText: {
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  activeButtonTextLight: {
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
  startBtn: {
    paddingHorizontal: 17,
    paddingVertical: 8,
    borderRadius: 11,
    marginTop: 4,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 17,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalBackdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderRadius: 17,
    padding: 14,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  modalInput: {
    marginTop: 11,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 11,
  },
  modalButton: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  modalButtonTextLight: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  suggestionCard: {
    marginHorizontal: 17,
    marginTop: 14,
    borderRadius: 17,
    borderWidth: 1,
    padding: 11,
    gap: 8,
  },
  suggestionMeta: {
    gap: 4,
  },
  suggestionLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  suggestionTitle: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  suggestionTime: {
    fontSize: 8,
    fontWeight: '600',
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 7,
  },
  suggestionButton: {
    flex: 1,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionButtonText: {
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  suggestionButtonTextLight: {
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
  timelineSection: {
    marginTop: 22,
    paddingHorizontal: 17,
    gap: 11,
  },
  trackerSection: {
    marginTop: 22,
    paddingHorizontal: 17,
    gap: 11,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  sectionHint: {
    fontSize: 8,
    fontWeight: '600',
  },
  quickActionsSection: {
    marginTop: 17,
    gap: 7,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 4,
  },
  quickActionText: {
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  sectionMeta: {
    fontSize: 8,
    fontWeight: '600',
  },
  seeAll: {
    fontSize: 10,
    fontWeight: '700',
  },
  pulseSection: {
    marginTop: 22,
    paddingHorizontal: 17,
    gap: 11,
  },
  pulseCard: {
    padding: 10,
    gap: 8,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pulseStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  pulseValue: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  pulseLabel: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pulseMiniRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pulseMiniTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  pulseMiniValue: {
    fontSize: 10,
    fontWeight: '800',
  },
  pulseMiniLabel: {
    fontSize: 7,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timelineCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.08)',
    gap: 11,
  },
  timelineTimeCol: {
    width: 42,
  },
  timelineTime: {
    fontSize: 10,
    fontWeight: '800',
  },
  timelineContent: {
    flex: 1,
    gap: 2,
  },
  timelineTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  timelineCategory: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyTimeline: {
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  timelineEmptyText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  graphSection: {
    marginTop: 22,
    paddingHorizontal: 17,
    gap: 11,
  },
  graphGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16, // SPACING.md
  },
  graphCard: {
    width: '48%',
    padding: 10,
    gap: 6,
  },
  cardTitle: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    minHeight: 60,
  },
  sparkItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  sparkBar: {
    width: 8,
    borderRadius: 4,
  },
  sparkLabel: {
    fontSize: 7,
    fontWeight: '600',
  },
  emptySpark: {
    fontSize: 8,
  },
  trackerMiniRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  trackerMiniTile: {
    flexBasis: '48%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    gap: 2,
  },
  trackerMiniLabel: {
    fontSize: 7,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  trackerMiniValue: {
    fontSize: 9,
    fontWeight: '800',
  },
  overviewSection: {
    marginTop: 22,
    paddingHorizontal: 17,
    gap: 11,
  },
  overviewCard: {
    padding: 10,
    gap: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Figtree',
  },
  kpiLabel: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  kpiDivider: {
    width: 1,
    height: 22,
  },
  tasksSection: {
    marginTop: 22,
    paddingHorizontal: 17,
    gap: 11,
  },
  tasksCard: {
    gap: 8, // Will be overridden by inline SPACING.sm
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.08)',
    gap: 8,
  },
  taskCheckbox: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckboxInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  taskContent: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  taskDue: {
    fontSize: 8,
    fontWeight: '600',
  },
  taskPriority: {
    width: 17,
    height: 17,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskPriorityText: {
    fontSize: 10,
    fontWeight: '900',
  },
  taskStartBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 6,
  },
  taskStartText: {
    fontSize: 9,
    fontWeight: '700',
  },
  // New timeline styles matching desktop
  tlContainer: {
    paddingVertical: 6,
  },
  tlBlock: {
    flexDirection: 'row',
    minHeight: 70,
  },
  tlTimeCol: {
    width: 39,
    paddingRight: 4,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  tlTime: {
    fontSize: 10,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  tlLineCol: {
    width: 34,
    alignItems: 'center',
  },
  tlLineSegment: {
    width: 2,
    flex: 1,
  },
  tlNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlActivePulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    opacity: 0.3,
  },
  tlContent: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1,
    padding: 10,
    marginVertical: 6,
    marginLeft: 6,
    marginRight: 11,
    gap: 4,
  },
  tlTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tlTitle: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Figtree',
    flex: 1,
  },
  tlActiveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tlCategory: {
    fontSize: 8,
    fontWeight: '600',
  },
  tlTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  tlTag: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tlTagText: {
    fontSize: 8,
    fontWeight: '600',
  },
  tlDuration: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
