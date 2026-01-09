import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { listEvents, type MobileEvent } from '@/src/storage/events';
import { useSession } from '@/src/state/session';
import { InsightIcon } from '@/src/components/InsightIcon';
import { syncConnectedCalendars, type CalendarSyncOutcome } from '@/src/services/calendarSync';

const SEGMENTS = ['Day', 'Week', 'Month'];
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

function formatSyncSummary(outcomes: CalendarSyncOutcome[]): string {
  if (!outcomes.length) return 'No providers connected.';
  return outcomes
    .map((outcome) => {
      if (outcome.error) {
        return `${outcome.provider}: ${outcome.error}`;
      }
      if (!outcome.result) {
        return `${outcome.provider}: no updates.`;
      }
      return `${outcome.provider}: ${outcome.result.pulled} pulled, ${outcome.result.pushed} pushed.`;
    })
    .join('\n');
}

export default function CalendarScreen() {
  const router = useRouter();
  const { palette, sizes, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { active, stopSession } = useSession();
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [segment, setSegment] = useState('Day');
  const [syncing, setSyncing] = useState(false);

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

  const syncCalendar = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const outcomes = await syncConnectedCalendars();
      const refreshed = await listEvents();
      setEvents(refreshed);
      Alert.alert('Calendar sync', formatSyncSummary(outcomes));
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

  const hourHeight = 80;
  const weekDayWidth = 44; // Width per day column in week view

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
            <Text style={[styles.syncButtonText, { color: palette.text, fontSize: sizes.smallText }]}>{syncing ? 'Syncing...' : 'Sync'}</Text>
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
        ) : (
          <View style={styles.timelineGrid}>
            {HOURS.map((h) => (
              <View key={h} style={[styles.hourRow, { height: hourHeight }]}>
                <View style={styles.hourLabelCol}>
                  <Text style={[styles.hourLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>{h === 0 ? '' : formatHour(h)}</Text>
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
                    }
                  ]}
                >
                  <View style={[styles.eventStripe, { backgroundColor: palette.tint, opacity: pointsIntensity }]} />
                  <Text style={[styles.eventTitle, { color: palette.text, fontSize: sizes.bodyText }]} numberOfLines={1}>{getDisplayTitle(ev)}</Text>
                  {isActiveEvent ? (
                    <Text style={[styles.eventActive, { color: palette.tint, fontSize: sizes.tinyText }]}>Active</Text>
                  ) : eventPoints > 0 ? (
                    <Text style={[styles.eventPoints, { color: palette.tint, fontSize: sizes.tinyText }]}>{eventPoints.toFixed(1)} pts</Text>
                  ) : null}
                  {height > 40 && (
                    <Text style={[styles.eventTime, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
                      {formatHour(start.getHours())}:{start.getMinutes().toString().padStart(2, '0')}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
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
  timelineGrid: {
    flex: 1,
    paddingRight: 16,
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
