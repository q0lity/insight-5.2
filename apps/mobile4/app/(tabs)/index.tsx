import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { useSession } from '@/src/state/session';
import { listEvents, getPointsByDay, getDailyStats, type MobileEvent } from '@/src/storage/events';
import { listTasks, completeTask, type MobileTask } from '@/src/storage/tasks';
import { listTrackerLogs, type TrackerLogEntry } from '@/src/storage/trackers';
import { InsightIcon } from '@/src/components/InsightIcon';
import { RollingNumber } from '@/src/components/RollingNumber';
import { MobileHeatmap, type HeatmapRange } from '@/src/components/MobileHeatmap';
import { TrackerHeatMap } from '@/src/components/TrackerHeatMap';
import { TrackerPieChart } from '@/src/components/TrackerPieChart';
import { computeXp, formatXp } from '@/src/utils/points';

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
      project: active.project ?? undefined,
      fallbackGoalImportance: active.importance ?? 5,
    });
  }, [active?.importance, active?.difficulty, durationMinutes, active?.goal, active?.project]);

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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={{ paddingTop: insets.top + sizes.spacing, paddingBottom: 100 }}
    >
      <View style={[styles.header, { paddingHorizontal: sizes.spacing + 4, marginBottom: sizes.spacing }]}>
        <View>
          <Text style={[styles.headerTitle, { color: palette.text, fontSize: sizes.headerTitle + 12 }]}>Dashboard</Text>
          <Text style={[styles.headerSubtitle, { color: palette.textSecondary, fontSize: sizes.smallText }]}>Tactical Lifecycle Insights</Text>
        </View>
        <TouchableOpacity
          style={[styles.nodeBadge, { borderColor: palette.border, backgroundColor: palette.tintLight }]}
          onPress={() => router.push('/settings')}
        >
          <Text style={[styles.nodeBadgeText, { color: palette.tint, fontSize: sizes.bodyText + 2 }]}>1</Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.activeCard,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            marginHorizontal: sizes.spacing + 4,
            borderRadius: sizes.borderRadius + 8,
            padding: sizes.cardPadding + 4,
            gap: sizes.rowGap,
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
            onPress={() => router.push('/tasks')}
          >
            <Text style={[styles.startBtnText, { fontSize: sizes.bodyText }]}>Start Session</Text>
          </TouchableOpacity>
        )}
      </View>

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

      <View style={[styles.pulseSection, { marginTop: sizes.spacing + 12, paddingHorizontal: sizes.spacing + 4, gap: sizes.cardGap }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle + 3 }]}>Today Pulse</Text>
          <Text style={[styles.sectionMeta, { color: palette.textSecondary, fontSize: sizes.smallText + 1 }]}>
            {formatTime(now)}
          </Text>
        </View>

        <View style={[styles.pulseCard, { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: sizes.borderRadius, padding: sizes.cardPadding }]}>
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
            <View style={[styles.pulseRow, { gap: sizes.spacingSmall }]}>
              {moodAverage != null && (
                <View style={styles.pulseStat}>
                  <Text style={[styles.pulseValue, { color: palette.success, fontSize: sizes.metricValue }]}>
                    {moodAverage}
                  </Text>
                  <Text style={[styles.pulseLabel, { color: palette.textSecondary, fontSize: sizes.metricLabel }]}>
                    Mood Avg
                  </Text>
                </View>
              )}
              {energyAverage != null && (
                <View style={styles.pulseStat}>
                  <Text style={[styles.pulseValue, { color: palette.warning, fontSize: sizes.metricValue }]}>
                    {energyAverage}
                  </Text>
                  <Text style={[styles.pulseLabel, { color: palette.textSecondary, fontSize: sizes.metricLabel }]}>
                    Energy Avg
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Overview Section with Heatmap and KPIs */}
      <View style={[styles.overviewSection, { marginTop: sizes.spacing + 12, paddingHorizontal: sizes.spacing + 4, gap: sizes.cardGap }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle + 3 }]}>Overview</Text>
        </View>

        <View style={[styles.overviewCard, { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: sizes.borderRadius, padding: sizes.cardPadding, gap: sizes.spacing }]}>
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
        </View>
      </View>

      {/* Upcoming Tasks Section */}
      {upcomingTasks.length > 0 && (
        <View style={[styles.tasksSection, { marginTop: sizes.spacing + 12, paddingHorizontal: sizes.spacing + 4, gap: sizes.cardGap }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle + 3 }]}>Upcoming Tasks</Text>
            <TouchableOpacity onPress={() => router.push('/tasks')}>
              <Text style={[styles.seeAll, { color: palette.tint, fontSize: sizes.smallText + 1 }]}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.tasksCard, { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: sizes.borderRadius }]}>
            {upcomingTasks.map((task, idx) => (
              <View
                key={task.id}
                style={[
                  styles.taskRow,
                  { padding: sizes.cardPadding, borderBottomColor: palette.borderLight, gap: sizes.rowGap },
                  idx === upcomingTasks.length - 1 && { borderBottomWidth: 0 },
                ]}>
                <Pressable
                  style={[
                    styles.taskCheckbox,
                    { borderColor: palette.tint, width: sizes.iconSizeSmall, height: sizes.iconSizeSmall, borderRadius: sizes.iconSizeSmall / 2 },
                  ]}
                  onPress={() => handleCompleteTask(task.id)}>
                  {task.status === 'in_progress' && (
                    <View style={[styles.taskCheckboxInner, { backgroundColor: palette.tint, width: sizes.iconSizeTiny / 2, height: sizes.iconSizeTiny / 2, borderRadius: sizes.iconSizeTiny / 4 }]} />
                  )}
                </Pressable>
                <Pressable
                  style={styles.taskContent}
                  onPress={() => router.push(`/task/${task.id}`)}>
                  <Text style={[styles.taskTitle, { color: palette.text, fontSize: sizes.bodyText }]} numberOfLines={1}>
                    {task.title}
                  </Text>
                  {(task.dueAt || task.scheduledAt) && (
                    <Text style={[styles.taskDue, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
                      {task.dueAt
                        ? `Due ${formatTaskDate(task.dueAt)}`
                        : task.scheduledAt
                          ? `Scheduled ${formatTaskDate(task.scheduledAt)}`
                          : ''}
                    </Text>
                  )}
                </Pressable>
                {task.importance && task.importance >= 7 && (
                  <View style={[styles.taskPriority, { backgroundColor: `${palette.error}15`, width: sizes.iconSize, height: sizes.iconSize, borderRadius: sizes.iconSize / 2 }]}>
                    <Text style={[styles.taskPriorityText, { color: palette.error, fontSize: sizes.smallText + 1 }]}>!</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.taskStartBtn, { backgroundColor: palette.tintLight, paddingHorizontal: sizes.chipPadding, paddingVertical: sizes.spacingSmall, borderRadius: sizes.borderRadiusSmall }]}
                  onPress={() => handleStartTask(task)}
                >
                  <Text style={[styles.taskStartText, { color: palette.tint, fontSize: sizes.smallText }]}>Start</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.trackerSection, { marginTop: sizes.spacing + 12, paddingHorizontal: sizes.spacing + 4, gap: sizes.cardGap }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle + 3 }]}>Trackers</Text>
          <TouchableOpacity onPress={() => router.push('/trackers')}>
            <Text style={[styles.seeAll, { color: palette.tint, fontSize: sizes.smallText + 1 }]}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.trackerCard, { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: sizes.borderRadius, padding: sizes.cardPadding, gap: sizes.spacing }]}>
          {/* Heat Map visualization */}
          <View style={[styles.trackerHeatmapSection, { gap: sizes.rowGap }]}>
            <Text style={[styles.trackerSectionLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>7-Day Overview</Text>
            <TrackerHeatMap logs={trackerLogs} days={7} />
          </View>

          {/* Pie Chart visualization */}
          <View style={[styles.trackerPieSection, { gap: sizes.rowGap, borderTopColor: palette.borderLight }]}>
            <Text style={[styles.trackerSectionLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>By Category</Text>
            <TrackerPieChart logs={trackerLogs} size={100} />
          </View>

          {/* Quick tracker chips - recent values */}
          {trackerSnapshot.length > 0 && (
            <View style={[styles.trackerQuickSection, { gap: sizes.spacingSmall, borderTopColor: palette.borderLight }]}>
              <Text style={[styles.trackerSectionLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>Recent</Text>
              <View style={[styles.trackerChipRow, { gap: sizes.spacingSmall }]}>
                {trackerSnapshot.map((log) => (
                  <View key={log.id} style={[styles.trackerChip, { borderColor: palette.tint, borderRadius: sizes.borderRadiusSmall, paddingHorizontal: sizes.chipPadding, paddingVertical: sizes.spacingSmall }]}>
                    <Text style={[styles.trackerChipLabel, { color: palette.text, fontSize: sizes.tinyText }]}>{log.trackerLabel}</Text>
                    <Text style={[styles.trackerChipValue, { color: palette.tint, fontSize: sizes.smallText + 1 }]}>
                      {formatTrackerValue(log)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.timelineSection, { marginTop: sizes.spacing + 12, paddingHorizontal: sizes.spacing + 4, gap: sizes.cardGap }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle + 3 }]}>Today's Timeline</Text>
          <TouchableOpacity onPress={() => router.push('/calendar')}>
            <Text style={[styles.seeAll, { color: palette.tint, fontSize: sizes.smallText + 1 }]}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.timelineCard, { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: sizes.borderRadius }]}>
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
        </View>
      </View>
    </ScrollView>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  nodeBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(217,93,57,0.1)',
  },
  nodeBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D95D39',
  },
  activeCard: {
    marginHorizontal: 24,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    gap: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeStatus: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  activeBreadcrumb: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  activeTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: 'Figtree',
  },
  activeClock: {
    fontSize: 48,
    fontWeight: '900',
    fontFamily: 'System',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
  activeRemaining: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeXp: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  activeActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  activeButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  activeButtonTextLight: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
  startBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 4,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  suggestionCard: {
    marginHorizontal: 24,
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  suggestionMeta: {
    gap: 4,
  },
  suggestionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  suggestionTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  suggestionButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  suggestionButtonTextLight: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
  timelineSection: {
    marginTop: 32,
    paddingHorizontal: 24,
    gap: 16,
  },
  trackerSection: {
    marginTop: 32,
    paddingHorizontal: 24,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '700',
  },
  pulseSection: {
    marginTop: 32,
    paddingHorizontal: 24,
    gap: 16,
  },
  pulseCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    padding: 20,
    gap: 16,
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
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  pulseLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timelineCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    overflow: 'hidden',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.08)',
    gap: 16,
  },
  timelineTimeCol: {
    width: 60,
  },
  timelineTime: {
    fontSize: 14,
    fontWeight: '800',
  },
  timelineContent: {
    flex: 1,
    gap: 2,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  timelineCategory: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyTimeline: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  timelineEmptyText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  trackerCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    padding: 20,
    gap: 20,
  },
  trackerHeatmapSection: {
    gap: 12,
  },
  trackerPieSection: {
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.08)',
  },
  trackerQuickSection: {
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.08)',
  },
  trackerSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  trackerChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  trackerChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  trackerChipLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  trackerChipValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  overviewSection: {
    marginTop: 32,
    paddingHorizontal: 24,
    gap: 16,
  },
  overviewCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    padding: 20,
    gap: 24,
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
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Figtree',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  kpiDivider: {
    width: 1,
    height: 32,
  },
  tasksSection: {
    marginTop: 32,
    paddingHorizontal: 24,
    gap: 16,
  },
  tasksCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    overflow: 'hidden',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.08)',
    gap: 12,
  },
  taskCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckboxInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  taskContent: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  taskDue: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskPriority: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskPriorityText: {
    fontSize: 14,
    fontWeight: '900',
  },
  taskStartBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  taskStartText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // New timeline styles matching desktop
  tlContainer: {
    paddingVertical: 8,
  },
  tlBlock: {
    flexDirection: 'row',
    minHeight: 100,
  },
  tlTimeCol: {
    width: 56,
    paddingRight: 4,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  tlTime: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  tlLineCol: {
    width: 48,
    alignItems: 'center',
  },
  tlLineSegment: {
    width: 2,
    flex: 1,
  },
  tlNode: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlActivePulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.3,
  },
  tlContent: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginVertical: 8,
    marginLeft: 8,
    marginRight: 16,
    gap: 4,
  },
  tlTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tlTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Figtree',
    flex: 1,
  },
  tlActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tlCategory: {
    fontSize: 12,
    fontWeight: '600',
  },
  tlTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tlTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tlTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tlDuration: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
