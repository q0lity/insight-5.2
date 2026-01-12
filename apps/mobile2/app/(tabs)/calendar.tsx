import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, PanResponder, Pressable, StyleSheet, ScrollView, TouchableOpacity, View as RNView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { listEvents, startEvent, type MobileEvent } from '@/src/storage/events';
import { useSession } from '@/src/state/session';
import { InsightIcon } from '@/src/components/InsightIcon';
import { invokeCalendarSync } from '@/src/supabase/functions';
import { listHabits, type HabitDef } from '@/src/storage/habits';
import { listTasks, updateTask, type MobileTask } from '@/src/storage/tasks';

const SEGMENTS = ['Day', 'Week', 'Month', 'Timeline'];
const HOURS = Array.from({ length: 24 }).map((_, i) => i);

function formatHour(h: number) {
  const hour = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? 'AM' : 'PM';
  return `${hour} ${period}`;
}

function getDisplayTitle(item: { title?: string | null; category?: string | null; subcategory?: string | null }) {
  if (item.title && item.title !== 'Untitled') {
    return item.title;
  }
  const parts = [item.category, item.subcategory].filter(Boolean);
  return parts.length > 0 ? parts.join(' | ') : 'Active Session';
}

function getWeekDays(date: Date) {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function startOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDuration(startMs: number, endMs: number) {
  const mins = Math.round((endMs - startMs) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);

  // Start from Sunday of the week containing the 1st
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  // End on Saturday of the week containing the last day
  const endDate = new Date(lastDay);
  endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const days: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return { days, month, year };
}

function getPointsIntensity(points: number): number {
  // Returns opacity between 0.15 and 1.0 based on points
  // 0 points = 0.15, 100+ points = 1.0
  if (points <= 0) return 0.15;
  if (points >= 100) return 1.0;
  return 0.15 + (points / 100) * 0.85;
}

function getPointsColor(points: number, isDark: boolean): string {
  const intensity = getPointsIntensity(points);
  // Base orange color: #D95D39
  // More points = more saturated/intense color
  if (isDark) {
    return `rgba(217, 93, 57, ${intensity})`;
  }
  return `rgba(217, 93, 57, ${intensity * 0.9})`;
}

function formatTimelineDay(date: Date) {
  const today = new Date();
  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, addDays(today, 1))) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatTimelineTime(ms: number) {
  const date = new Date(ms);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

type DragPayload = {
  id: string;
  title: string;
  type: 'task' | 'habit';
  estimateMinutes?: number | null;
  category?: string | null;
  subcategory?: string | null;
  importance?: number | null;
  difficulty?: number | null;
  tags?: string[];
  contexts?: string[];
  people?: string[];
  location?: string | null;
  skills?: string[];
  character?: string[];
  goal?: string | null;
  project?: string | null;
  trackerKey?: string | null;
};

function DragSidebarItem({
  item,
  tint,
  surface,
  textSecondary,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  item: DragPayload;
  tint: string;
  surface: string;
  textSecondary: string;
  onDragStart: (payload: DragPayload, ref: React.RefObject<RNView>) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (payload: DragPayload, x: number, y: number) => void;
}) {
  const itemRef = useRef<RNView>(null);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
        onPanResponderGrant: () => onDragStart(item, itemRef),
        onPanResponderMove: (_, gesture) => onDragMove(gesture.moveX, gesture.moveY),
        onPanResponderRelease: (_, gesture) => onDragEnd(item, gesture.moveX, gesture.moveY),
        onPanResponderTerminate: (_, gesture) => onDragEnd(item, gesture.moveX, gesture.moveY),
      }),
    [item, onDragStart, onDragMove, onDragEnd]
  );

  return (
    <RNView
      ref={itemRef}
      {...panResponder.panHandlers}
      style={[styles.sidebarItem, { borderColor: tint, backgroundColor: surface }]}
    >
      <Text style={styles.sidebarItemTitle} numberOfLines={2}>
        {item.title}
      </Text>
      {item.estimateMinutes != null ? (
        <Text style={[styles.sidebarItemMeta, { color: textSecondary }]}>{item.estimateMinutes}m</Text>
      ) : (
        <Text style={[styles.sidebarItemMeta, { color: textSecondary }]}>
          {item.type === 'habit' ? 'Habit' : 'Task'}
        </Text>
      )}
    </RNView>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const { palette, sizes, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { active, stopSession } = useSession();
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [segment, setSegment] = useState('Day');
  const [syncing, setSyncing] = useState(false);
  const [tasks, setTasks] = useState<MobileTask[]>([]);
  const [habits, setHabits] = useState<HabitDef[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'tasks' | 'habits'>('tasks');
  const [dragItem, setDragItem] = useState<DragPayload | null>(null);
  const dragPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragOffset = useRef({ x: 0, y: 0 });
  const dropZoneRef = useRef<RNView>(null);
  const [dropZone, setDropZone] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const hourHeight = 80;
  const weekDayWidth = 44;

  useEffect(() => {
    let mounted = true;
    listEvents().then((rows) => {
      if (!mounted) return;
      setEvents(rows);
    });
    return () => {
      mounted = false;
    };
  }, [active?.id]);

  const refreshSidebar = useCallback(async () => {
    const [taskRows, habitRows] = await Promise.all([listTasks(), listHabits()]);
    const pendingTasks = taskRows
      .filter((task) => task.status !== 'done' && task.status !== 'canceled' && !task.scheduledAt)
      .sort((a, b) => (a.dueAt ?? a.createdAt) - (b.dueAt ?? b.createdAt))
      .slice(0, 12);
    const recentHabits = habitRows.slice(0, 12);
    setTasks(pendingTasks);
    setHabits(recentHabits);
  }, []);

  useEffect(() => {
    void refreshSidebar();
  }, [refreshSidebar]);

  const updateDropZone = useCallback(() => {
    dropZoneRef.current?.measureInWindow((x, y, width, height) => {
      setDropZone({ x, y, width, height });
    });
  }, []);

  useEffect(() => {
    if (segment !== 'Day') {
      setDropZone(null);
    }
  }, [segment]);

  const handleDragStart = useCallback(
    (payload: DragPayload, ref: React.RefObject<RNView>) => {
      if (segment !== 'Day') return;
      dropZoneRef.current?.measureInWindow((x, y, width, height) => {
        setDropZone({ x, y, width, height });
      });
      ref.current?.measureInWindow((x, y, width, height) => {
        dragOffset.current = { x: width / 2, y: height / 2 };
        dragPosition.setValue({ x, y });
        setDragItem(payload);
      });
    },
    [dragPosition, segment]
  );

  const handleDragMove = useCallback(
    (x: number, y: number) => {
      if (!dragItem) return;
      dragPosition.setValue({
        x: x - dragOffset.current.x,
        y: y - dragOffset.current.y,
      });
    },
    [dragItem, dragPosition]
  );

  const handleDragEnd = useCallback(
    async (payload: DragPayload, x: number, y: number) => {
      setDragItem(null);
      if (segment !== 'Day' || !dropZone) return;
      const withinX = x >= dropZone.x && x <= dropZone.x + dropZone.width;
      const withinY = y >= dropZone.y && y <= dropZone.y + dropZone.height;
      if (!withinX || !withinY) return;

      const relativeY = Math.max(0, Math.min(dropZone.height, y - dropZone.y));
      const rawMinutes = (relativeY / hourHeight) * 60;
      const snappedMinutes = Math.round(rawMinutes / 5) * 5;
      const startAt = startOfDay(new Date()).getTime() + snappedMinutes * 60 * 1000;
      const durationMinutes = payload.estimateMinutes ?? 30;
      const endAt = startAt + durationMinutes * 60 * 1000;

      if (payload.type === 'task') {
        await startEvent({
          title: payload.title,
          kind: 'task',
          startAt,
          endAt,
          taskId: payload.id,
          estimateMinutes: payload.estimateMinutes ?? null,
          importance: payload.importance ?? null,
          difficulty: payload.difficulty ?? null,
          tags: payload.tags ?? [],
          contexts: payload.contexts ?? [],
          people: payload.people ?? [],
          location: payload.location ?? null,
          category: payload.category ?? null,
          subcategory: payload.subcategory ?? null,
          project: payload.project ?? null,
          goal: payload.goal ?? null,
          skills: payload.skills ?? [],
          character: payload.character ?? [],
        });
        await updateTask(payload.id, { scheduledAt: startAt });
      } else {
        await startEvent({
          title: payload.title,
          kind: 'event',
          startAt,
          endAt,
          trackerKey: payload.trackerKey ?? `habit:${payload.id}`,
          estimateMinutes: payload.estimateMinutes ?? null,
          importance: payload.importance ?? null,
          difficulty: payload.difficulty ?? null,
          tags: payload.tags ?? [],
          people: payload.people ?? [],
          location: payload.location ?? null,
          category: payload.category ?? null,
          subcategory: payload.subcategory ?? null,
          project: payload.project ?? null,
          goal: payload.goal ?? null,
          skills: payload.skills ?? [],
          character: payload.character ?? [],
        });
      }

      const refreshed = await listEvents();
      setEvents(refreshed);
      await refreshSidebar();
    },
    [dropZone, hourHeight, refreshSidebar, segment]
  );

  const syncCalendar = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await invokeCalendarSync();
      const refreshed = await listEvents();
      setEvents(refreshed);
      Alert.alert('Calendar sync', 'Sync request queued.');
    } catch (err) {
      Alert.alert('Calendar sync failed', err instanceof Error ? err.message : 'Unable to sync calendar.');
    } finally {
      setSyncing(false);
    }
  };

  const todayKey = useMemo(() => new Date().toDateString(), []);
  const todayEvents = useMemo(() => {
    return events
      .filter((event) => new Date(event.startAt).toDateString() === todayKey)
      .sort((a, b) => a.startAt - b.startAt);
  }, [events, todayKey]);

  const weekDays = useMemo(() => getWeekDays(new Date()), []);
  const weekEvents = useMemo(() => {
    const weekStart = weekDays[0].getTime();
    const weekEnd = weekDays[6].getTime() + 24 * 60 * 60 * 1000;
    return events
      .filter((event) => event.startAt >= weekStart && event.startAt < weekEnd)
      .sort((a, b) => a.startAt - b.startAt);
  }, [events, weekDays]);

  const { days: monthDays, month: currentMonth } = useMemo(() => getMonthDays(new Date()), []);

  const monthEvents = useMemo(() => {
    if (monthDays.length === 0) return {};
    const monthStart = monthDays[0].getTime();
    const monthEnd = monthDays[monthDays.length - 1].getTime() + 24 * 60 * 60 * 1000;

    const eventsInMonth = events.filter(
      (event) => event.startAt >= monthStart && event.startAt < monthEnd
    );

    // Group events by date string
    const grouped: Record<string, MobileEvent[]> = {};
    for (const ev of eventsInMonth) {
      const dateKey = new Date(ev.startAt).toDateString();
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(ev);
    }

    return grouped;
  }, [events, monthDays]);

  const timelineGroups = useMemo(() => {
    const start = startOfDay(new Date());
    const end = addDays(start, 7);
    const startMs = start.getTime();
    const endMs = end.getTime();
    const filtered = events
      .filter((event) => event.startAt >= startMs && event.startAt < endMs)
      .sort((a, b) => a.startAt - b.startAt);

    const byDate = new Map<string, MobileEvent[]>();
    for (const event of filtered) {
      const key = new Date(event.startAt).toDateString();
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(event);
    }

    const groups: Array<{ date: Date; items: MobileEvent[] }> = [];
    for (let day = new Date(start); day < end; day = addDays(day, 1)) {
      const key = day.toDateString();
      const items = byDate.get(key);
      if (items && items.length) {
        groups.push({ date: new Date(day), items });
      }
    }
    return groups;
  }, [events]);

  // Calculate daily points for color intensity
  const dailyPoints = useMemo(() => {
    const points: Record<string, number> = {};
    for (const ev of events) {
      const dateKey = new Date(ev.startAt).toDateString();
      const evPoints = ev.points ?? 0;
      points[dateKey] = (points[dateKey] ?? 0) + evPoints;
    }
    return points;
  }, [events]);

  const taskDragItems = useMemo<DragPayload[]>(
    () =>
      tasks.map((task) => ({
        id: task.id,
        title: task.title,
        type: 'task',
        estimateMinutes: task.estimateMinutes ?? null,
        category: task.category ?? null,
        subcategory: task.subcategory ?? null,
        importance: task.importance ?? null,
        difficulty: task.difficulty ?? null,
        tags: task.tags ?? [],
        contexts: task.contexts ?? [],
        people: task.people ?? [],
        goal: task.goal ?? null,
        project: task.project ?? null,
      })),
    [tasks]
  );

  const habitDragItems = useMemo<DragPayload[]>(
    () =>
      habits.map((habit) => ({
        id: habit.id,
        title: habit.name,
        type: 'habit',
        estimateMinutes: habit.estimateMinutes ?? null,
        category: habit.category ?? null,
        subcategory: habit.subcategory ?? null,
        importance: habit.importance ?? null,
        difficulty: habit.difficulty ?? null,
        tags: habit.tags ?? [],
        people: habit.people ?? [],
        location: habit.location ?? null,
        skills: habit.skills ?? [],
        character: habit.character ?? [],
        goal: habit.goal ?? null,
        project: habit.project ?? null,
        trackerKey: `habit:${habit.id}`,
      })),
    [habits]
  );

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top + sizes.spacingSmall }]}>
      <View style={[styles.header, { paddingHorizontal: sizes.spacing + 4, marginBottom: sizes.spacing }]}>
        <View style={[styles.headerLeft, { gap: sizes.spacingSmall }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backButton,
              {
                backgroundColor: palette.tintLight,
                width: sizes.buttonHeightSmall,
                height: sizes.buttonHeightSmall,
                borderRadius: sizes.buttonHeightSmall / 2,
              }
            ]}>
            <InsightIcon name="chevronLeft" size={sizes.iconSizeSmall} color={palette.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: palette.text, fontSize: sizes.headerTitle + 6 }]}>Calendar</Text>
            <Text style={[styles.headerSubtitle, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
        </View>
        <View style={[styles.headerActions, { gap: sizes.spacingSmall }]}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              {
                borderColor: palette.border,
                backgroundColor: palette.tintLight,
                height: sizes.buttonHeightSmall,
                paddingHorizontal: sizes.chipPadding,
                borderRadius: sizes.buttonHeightSmall / 2,
                gap: sizes.spacingSmall / 2,
              },
            ]}
            onPress={() => router.push('/voice')}>
            <InsightIcon name="plus" size={sizes.iconSizeTiny} color={palette.text} />
            <Text style={[styles.recordButtonText, { color: palette.text, fontSize: sizes.smallText }]}>Record</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.syncButton,
              {
                borderColor: palette.border,
                backgroundColor: palette.tintLight,
                height: sizes.buttonHeightSmall,
                paddingHorizontal: sizes.chipPadding,
                borderRadius: sizes.buttonHeightSmall / 2,
              }
            ]}
            onPress={() => void syncCalendar()}>
            <Text style={[styles.syncButtonText, { color: palette.text, fontSize: sizes.smallText }]}>{syncing ? 'Syncing…' : 'Sync'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.nodeBadge,
              {
                borderColor: palette.border,
                backgroundColor: palette.tintLight,
                width: sizes.buttonHeightSmall,
                height: sizes.buttonHeightSmall,
                borderRadius: sizes.buttonHeightSmall / 2,
              }
            ]}
            onPress={() => router.push('/settings')}>
            <Text style={[styles.nodeBadgeText, { color: palette.tint, fontSize: sizes.bodyText }]}>1</Text>
          </TouchableOpacity>
        </View>
      </View>

      {active ? (
        <View
          style={[
            styles.activeCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              marginHorizontal: sizes.spacing + 4,
              marginBottom: sizes.spacing,
              borderRadius: sizes.borderRadius,
              padding: sizes.cardPadding,
              gap: sizes.rowGap,
            },
          ]}>
          <View style={[styles.activeMeta, { gap: sizes.spacingSmall / 2 }]}>
            <Text style={[styles.activeLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>ACTIVE NOW</Text>
            <Text style={[styles.activeTitle, { color: palette.text, fontSize: sizes.bodyText }]} numberOfLines={1}>
              {getDisplayTitle(active)}
            </Text>
          </View>
          <View style={[styles.activeActions, { gap: sizes.spacingSmall }]}>
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
        </View>
      ) : null}

      <View style={[styles.segmentContainer, { paddingHorizontal: sizes.spacing + 4, marginBottom: sizes.spacing }]}>
        <View style={[styles.segmentRow, { backgroundColor: palette.borderLight, borderRadius: sizes.borderRadiusSmall, padding: sizes.spacingSmall / 2 }]}>
          {SEGMENTS.map((label) => (
            <TouchableOpacity
              key={label}
              onPress={() => setSegment(label)}
              style={[
                styles.segment,
                { borderRadius: sizes.borderRadiusSmall - 2, paddingVertical: sizes.spacingSmall },
                label === segment && { backgroundColor: palette.surface },
                label === segment && styles.segmentActiveShadow,
              ]}>
              <Text style={[styles.segmentText, { color: label === segment ? palette.text : palette.textSecondary, fontSize: sizes.smallText }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {segment === 'Month' ? (
          <View style={[styles.monthContainer, { paddingHorizontal: sizes.cardPadding }]}>
            {/* Month header with day labels */}
            <View style={[styles.monthHeader, { borderBottomColor: palette.borderLight, paddingBottom: sizes.spacingSmall, marginBottom: sizes.spacingSmall }]}>
              {DAY_LABELS.map((label) => (
                <View key={label} style={styles.monthDayHeader}>
                  <Text style={[styles.monthDayLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Month grid */}
            <View style={styles.monthGrid}>
              {Array.from({ length: Math.ceil(monthDays.length / 7) }).map((_, weekIdx) => (
                <View key={weekIdx} style={[styles.monthWeekRow, { marginBottom: sizes.spacingSmall / 2 }]}>
                  {monthDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, dayIdx) => {
                    const dateKey = day.toDateString();
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = day.getMonth() === currentMonth;
                    const dayEvents = monthEvents[dateKey] ?? [];
                    const dayPointsTotal = dailyPoints[dateKey] ?? 0;
                    const hasEvents = dayEvents.length > 0;
                    const hasActiveEvent = dayEvents.some((ev) => ev.active);

                    return (
                      <Pressable
                        key={dayIdx}
                        style={[
                          styles.monthDayCell,
                          {
                            backgroundColor: hasEvents
                              ? getPointsColor(dayPointsTotal, isDark)
                              : 'transparent',
                            borderColor: palette.borderLight,
                            borderRadius: sizes.borderRadiusSmall,
                            padding: sizes.spacingSmall / 2,
                          },
                          hasActiveEvent && { borderColor: palette.tint, borderWidth: 2 },
                        ]}
                        onPress={() => {
                          if (dayEvents.length === 1) {
                            router.push(`/event/${dayEvents[0].id}`);
                          } else if (dayEvents.length > 1) {
                            setSegment('Day');
                          }
                        }}>
                        <View style={[
                          styles.monthDayNumber,
                          isToday && { backgroundColor: palette.tint },
                          { width: sizes.iconSize, height: sizes.iconSize, borderRadius: sizes.iconSize / 2 }
                        ]}>
                          <Text style={[
                            styles.monthDayNumberText,
                            { color: isToday ? '#fff' : isCurrentMonth ? palette.text : palette.textSecondary, fontSize: sizes.smallText },
                            !isCurrentMonth && { opacity: 0.4 },
                          ]}>
                            {day.getDate()}
                          </Text>
                        </View>
                        {hasEvents && (
                          <View style={styles.monthDayContent}>
                            <Text style={[styles.monthEventCount, { color: isDark ? '#fff' : palette.text, fontSize: sizes.bodyText }]}>
                              {dayEvents.length}
                            </Text>
                            {dayPointsTotal > 0 && (
                              <Text style={[styles.monthPointsText, { color: isDark ? 'rgba(255,255,255,0.8)' : palette.textSecondary, fontSize: sizes.tinyText }]}>
                                {dayPointsTotal.toFixed(0)}p
                              </Text>
                            )}
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        ) : segment === 'Week' ? (
          <View style={styles.weekContainer}>
            {/* Week header with day labels */}
            <View style={[styles.weekHeader, { borderBottomColor: palette.borderLight }]}>
              <View style={styles.hourLabelCol} />
              {weekDays.map((day, idx) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <View key={idx} style={[styles.weekDayHeader, { gap: sizes.spacingSmall / 2 }]}>
                    <Text style={[styles.weekDayLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
                      {DAY_LABELS[idx]}
                    </Text>
                    <View style={[
                      styles.weekDayNumber,
                      isToday && { backgroundColor: palette.tint },
                      { width: sizes.iconSize + 4, height: sizes.iconSize + 4, borderRadius: (sizes.iconSize + 4) / 2 }
                    ]}>
                      <Text style={[
                        styles.weekDayNumberText,
                        { color: isToday ? '#fff' : palette.text, fontSize: sizes.smallText }
                      ]}>
                        {day.getDate()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Week grid */}
            <View style={styles.weekGrid}>
              {HOURS.map((h) => (
                <View key={h} style={[styles.weekHourRow, { height: hourHeight }]}>
                  <View style={styles.hourLabelCol}>
                    <Text style={[styles.hourLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
                      {h === 0 ? '' : formatHour(h)}
                    </Text>
                  </View>
                  {weekDays.map((_, dayIdx) => (
                    <View
                      key={dayIdx}
                      style={[
                        styles.weekDayCell,
                        { borderTopColor: palette.borderLight },
                        dayIdx < 6 && { borderRightColor: palette.borderLight, borderRightWidth: 1 }
                      ]}
                    />
                  ))}
                </View>
              ))}

              {/* Week events */}
              {weekEvents.map((ev) => {
                const start = new Date(ev.startAt);
                const end = ev.endAt ? new Date(ev.endAt) : new Date(ev.startAt + 3600000);
                const dayIdx = start.getDay();
                const startMins = start.getHours() * 60 + start.getMinutes();
                const durationMins = Math.min((end.getTime() - start.getTime()) / 60000, 24 * 60 - startMins);
                const top = (startMins / 60) * hourHeight;
                const height = (durationMins / 60) * hourHeight;
                const isActiveEvent = ev.active;
                const left = 70 + dayIdx * weekDayWidth;
                const eventPoints = ev.points ?? 0;
                const pointsIntensity = getPointsIntensity(eventPoints);

                return (
                  <Pressable
                    key={ev.id}
                    onPress={() => router.push(`/event/${ev.id}`)}
                    style={[
                      styles.weekEventBlock,
                      {
                        top,
                        left,
                        width: weekDayWidth - 4,
                        height: Math.max(height, 20),
                        backgroundColor: isActiveEvent
                          ? palette.tint
                          : `rgba(217, 93, 57, ${Math.max(0.3, pointsIntensity)})`,
                      }
                    ]}
                  >
                    {height > 30 && (
                      <Text style={styles.weekEventTitle} numberOfLines={1}>
                        {getDisplayTitle(ev).substring(0, 8)}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : segment === 'Timeline' ? (
          <View style={[styles.timelineList, { paddingHorizontal: sizes.spacing + 4, gap: sizes.spacingSmall }]}>
            {timelineGroups.length === 0 ? (
              <View style={[styles.timelineEmpty, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                <Text style={[styles.timelineEmptyText, { color: palette.textSecondary }]}>
                  No events scheduled yet. Drag tasks or habits into the day view to plan.
                </Text>
              </View>
            ) : (
              timelineGroups.map((group) => (
                <View key={group.date.toDateString()} style={styles.timelineDay}>
                  <Text style={[styles.timelineDayLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
                    {formatTimelineDay(group.date)}
                  </Text>
                  <View style={styles.timelineDayList}>
                    {group.items.map((ev) => (
                      <Pressable
                        key={ev.id}
                        onPress={() => router.push(`/event/${ev.id}`)}
                        style={[
                          styles.timelineRow,
                          { borderColor: palette.borderLight, backgroundColor: palette.surface },
                        ]}
                      >
                        <View style={styles.timelineTimeCol}>
                          <Text style={[styles.timelineTimeText, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
                            {formatTimelineTime(ev.startAt)}
                          </Text>
                          {ev.endAt ? (
                            <Text style={[styles.timelineDurationText, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
                              {formatDuration(ev.startAt, ev.endAt)}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.timelineBody}>
                          <Text style={[styles.timelineTitle, { color: palette.text, fontSize: sizes.bodyText }]} numberOfLines={1}>
                            {getDisplayTitle(ev)}
                          </Text>
                          {(ev.category || ev.subcategory) && (
                            <Text style={[styles.timelineMeta, { color: palette.textSecondary, fontSize: sizes.tinyText }]} numberOfLines={1}>
                              {[ev.category, ev.subcategory].filter(Boolean).join(' / ')}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.dayRow}>
            <RNView ref={dropZoneRef} onLayout={updateDropZone} style={[styles.timelineGrid, styles.dayTimeline]}>
              {HOURS.map((h) => (
                <View key={h} style={[styles.hourRow, { height: hourHeight }]}>
                  <View style={styles.hourLabelCol}>
                    <Text style={[styles.hourLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
                      {h === 0 ? '' : formatHour(h)}
                    </Text>
                  </View>
                  <View style={[styles.hourLine, { borderTopColor: palette.borderLight }]} />
                </View>
              ))}

              {todayEvents.map((ev) => {
                const start = new Date(ev.startAt);
                const end = ev.endAt ? new Date(ev.endAt) : new Date(ev.startAt + 3600000);
                const startMins = start.getHours() * 60 + start.getMinutes();
                const durationMins = (end.getTime() - start.getTime()) / 60000;
                const top = (startMins / 60) * hourHeight;
                const height = (durationMins / 60) * hourHeight;
                const isActiveEvent = ev.active;
                const eventPoints = ev.points ?? 0;
                const pointsIntensity = getPointsIntensity(eventPoints);

                return (
                  <Pressable
                    key={ev.id}
                    onPress={() => router.push(`/event/${ev.id}`)}
                    style={[
                      styles.eventBlock,
                      {
                        top,
                        height: Math.max(height, 30),
                        backgroundColor: isActiveEvent
                          ? (isDark ? 'rgba(217,93,57,0.35)' : 'rgba(217,93,57,0.22)')
                          : getPointsColor(eventPoints, isDark),
                        borderColor: isActiveEvent ? palette.tint : `rgba(217,93,57,${pointsIntensity * 0.5})`,
                        borderRadius: sizes.borderRadiusSmall,
                        padding: sizes.spacingSmall,
                      },
                    ]}
                  >
                    <View style={[styles.eventStripe, { backgroundColor: palette.tint, opacity: pointsIntensity }]} />
                    <Text style={[styles.eventTitle, { color: palette.text, fontSize: sizes.bodyText }]} numberOfLines={1}>
                      {getDisplayTitle(ev)}
                    </Text>
                    {isActiveEvent ? (
                      <Text style={[styles.eventActive, { color: palette.tint, fontSize: sizes.tinyText }]}>Active</Text>
                    ) : eventPoints > 0 ? (
                      <Text style={[styles.eventPoints, { color: palette.tint, fontSize: sizes.tinyText }]}>
                        {eventPoints.toFixed(1)} pts
                      </Text>
                    ) : null}
                    {height > 40 && (
                      <Text style={[styles.eventTime, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
                        {formatHour(start.getHours())}:{start.getMinutes().toString().padStart(2, '0')}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </RNView>

            <RNView
              style={[
                styles.sidebar,
                { backgroundColor: palette.surface, borderColor: palette.border },
                !sidebarOpen && styles.sidebarCollapsed,
              ]}
            >
              <TouchableOpacity
                style={[styles.sidebarToggle, { backgroundColor: palette.tintLight }]}
                onPress={() => setSidebarOpen((prev) => !prev)}
              >
                <InsightIcon name={sidebarOpen ? 'chevronRight' : 'chevronLeft'} size={16} color={palette.tint} />
              </TouchableOpacity>

              {sidebarOpen ? (
                <View style={styles.sidebarContent}>
                  <View style={styles.sidebarHeader}>
                    <Text style={[styles.sidebarTitle, { color: palette.text }]}>Schedule</Text>
                    <Text style={[styles.sidebarSubtitle, { color: palette.textSecondary }]}>Drag into day</Text>
                  </View>

                  <View style={[styles.sidebarTabs, { borderColor: palette.borderLight }]}>
                    {(['tasks', 'habits'] as const).map((tab) => {
                      const isActiveTab = tab === sidebarTab;
                      return (
                        <TouchableOpacity
                          key={tab}
                          style={[
                            styles.sidebarTabButton,
                            isActiveTab && { backgroundColor: palette.tintLight },
                          ]}
                          onPress={() => setSidebarTab(tab)}
                        >
                          <Text style={[styles.sidebarTabText, { color: isActiveTab ? palette.tint : palette.textSecondary }]}>
                            {tab === 'tasks' ? 'Tasks' : 'Habits'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <ScrollView contentContainerStyle={styles.sidebarList} showsVerticalScrollIndicator={false}>
                    {(sidebarTab === 'tasks' ? taskDragItems : habitDragItems).length === 0 ? (
                      <View style={styles.sidebarEmpty}>
                        <Text style={[styles.sidebarEmptyText, { color: palette.textSecondary }]}>
                          {sidebarTab === 'tasks' ? 'No tasks to schedule.' : 'No habits yet.'}
                        </Text>
                      </View>
                    ) : (
                      (sidebarTab === 'tasks' ? taskDragItems : habitDragItems).map((item) => (
                        <DragSidebarItem
                          key={`${item.type}_${item.id}`}
                          item={item}
                          tint={palette.border}
                          surface={palette.surfaceAlt}
                          textSecondary={palette.textSecondary}
                          onDragStart={handleDragStart}
                          onDragMove={handleDragMove}
                          onDragEnd={handleDragEnd}
                        />
                      ))
                    )}
                  </ScrollView>
                </View>
              ) : null}
            </RNView>
          </View>
        )}
      </ScrollView>

      {dragItem ? (
        <RNView pointerEvents="none" style={styles.dragOverlay}>
          <Animated.View
            style={[
              styles.dragGhost,
              { backgroundColor: palette.surface, borderColor: palette.tint },
              { transform: dragPosition.getTranslateTransform() },
            ]}
          >
            <Text style={[styles.dragGhostText, { color: palette.text }]} numberOfLines={1}>
              {dragItem.title}
            </Text>
            {dragItem.estimateMinutes != null ? (
              <Text style={[styles.dragGhostMeta, { color: palette.textSecondary }]}>
                {dragItem.estimateMinutes}m
              </Text>
            ) : null}
          </Animated.View>
        </RNView>
      ) : null}
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
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217,93,57,0.12)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordButton: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(217,93,57,0.08)',
  },
  recordButtonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  syncButton: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217,93,57,0.08)',
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  nodeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(217,93,57,0.1)',
  },
  nodeBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D95D39',
  },
  segmentContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  activeCard: {
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  activeMeta: {
    gap: 6,
  },
  activeLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  activeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  activeButton: {
    flex: 1,
    height: 38,
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
  segmentRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentActiveShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    gap: 12,
  },
  dayTimeline: {
    flex: 1,
    minWidth: 0,
    paddingRight: 0,
  },
  timelineGrid: {
    flex: 1,
    paddingRight: 16,
  },
  sidebar: {
    width: 140,
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
  },
  sidebarCollapsed: {
    width: 36,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sidebarToggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarHeader: {
    marginTop: 8,
    marginBottom: 10,
  },
  sidebarTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  sidebarSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  sidebarTabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 2,
    gap: 4,
  },
  sidebarTabButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarTabText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  sidebarList: {
    gap: 8,
    paddingTop: 10,
    paddingBottom: 8,
  },
  sidebarItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
  },
  sidebarItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  sidebarItemMeta: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  sidebarEmpty: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  sidebarEmptyText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourLabelCol: {
    width: 70,
    alignItems: 'center',
    marginTop: -6,
  },
  hourLabel: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  hourLine: {
    flex: 1,
    borderTopWidth: 1,
    marginTop: 8,
  },
  eventBlock: {
    position: 'absolute',
    left: 70,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    overflow: 'hidden',
  },
  eventStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  eventActive: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  eventPoints: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  eventTime: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  weekContainer: {
    flex: 1,
  },
  timelineList: {
    paddingBottom: 24,
  },
  timelineEmpty: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  timelineEmptyText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  timelineDay: {
    gap: 8,
    marginBottom: 16,
  },
  timelineDayLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timelineDayList: {
    gap: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  timelineTimeCol: {
    width: 64,
    alignItems: 'flex-start',
  },
  timelineTimeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timelineDurationText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  timelineBody: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  timelineMeta: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  dragOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  dragGhost: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    maxWidth: 180,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  dragGhostText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  dragGhostMeta: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  weekHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.08)',
    marginBottom: 4,
  },
  weekDayHeader: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  weekDayLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  weekDayNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayNumberText: {
    fontSize: 14,
    fontWeight: '800',
  },
  weekGrid: {
    flex: 1,
  },
  weekHourRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  weekDayCell: {
    flex: 1,
    borderTopWidth: 1,
    marginTop: 8,
  },
  weekEventBlock: {
    position: 'absolute',
    borderRadius: 4,
    padding: 2,
    overflow: 'hidden',
  },
  weekEventTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  // Month view styles
  monthContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.08)',
    marginBottom: 8,
  },
  monthDayHeader: {
    flex: 1,
    alignItems: 'center',
  },
  monthDayLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  monthGrid: {
    flex: 1,
  },
  monthWeekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  monthDayCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  monthDayNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  monthDayNumberText: {
    fontSize: 13,
    fontWeight: '800',
  },
  monthDayContent: {
    alignItems: 'center',
    gap: 1,
  },
  monthEventCount: {
    fontSize: 14,
    fontWeight: '900',
  },
  monthPointsText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
