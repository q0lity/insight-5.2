import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useSession } from '@/src/state/session';
import { listEvents, type MobileEvent } from '@/src/storage/events';
import { InsightIcon } from '@/src/components/InsightIcon';

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

export default function TodayScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { active, stopSession } = useSession();
  const [now, setNow] = useState(Date.now());
  const [events, setEvents] = useState<MobileEvent[]>([]);

  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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

  const elapsedMs = active ? now - active.startedAt : 0;
  const remainingMs =
    active?.estimatedMinutes != null ? Math.max(0, active.estimatedMinutes * 60 * 1000 - elapsedMs) : null;
  const todayKey = useMemo(() => new Date().toDateString(), []);
  const todayEvents = useMemo(() => {
    return events
      .filter((event) => new Date(event.startAt).toDateString() === todayKey)
      .sort((a, b) => a.startAt - b.startAt);
  }, [events, todayKey]);

  const pointsToday = useMemo(() => {
    return todayEvents.reduce((acc, ev) => acc + (ev.points ?? 0), 0);
  }, [todayEvents]);

  const timeToday = useMemo(() => {
    return todayEvents.reduce((acc, ev) => {
      if (!ev.endAt) return acc;
      return acc + (ev.endAt - ev.startAt);
    }, 0);
  }, [todayEvents]);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 100 }}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Dashboard</Text>
          <Text style={[styles.headerSubtitle, { color: palette.tabIconDefault }]}>Tactical Lifecycle Insights</Text>
        </View>
        <TouchableOpacity 
          style={[styles.nodeBadge, { borderColor: isDark ? 'rgba(148,163,184,0.24)' : 'rgba(28,28,30,0.1)' }]}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.nodeBadgeText}>1</Text>
        </TouchableOpacity>
      </View>

      {active ? (
        <View
          style={[
            styles.ribbon,
            {
              backgroundColor: isDark ? 'rgba(15,19,32,0.9)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
            },
          ]}>
          <View style={styles.ribbonMeta}>
            <Text style={[styles.ribbonLabel, { color: palette.tabIconDefault }]}>Active</Text>
            <Text style={[styles.ribbonTitle, { color: palette.text }]} numberOfLines={1}>
              {active.title}
            </Text>
          </View>
          <View style={styles.ribbonActions}>
            <TouchableOpacity
              style={[styles.ribbonButton, { borderColor: palette.tint }]}
              onPress={() => router.push(`/event/${active.id}`)}>
              <Text style={[styles.ribbonButtonText, { color: palette.tint }]}>Open</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ribbonButton, { backgroundColor: palette.tint }]}
              onPress={() => void stopSession()}>
              <Text style={styles.ribbonButtonTextLight}>Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.activeCard,
          {
            backgroundColor: isDark ? '#141a2a' : '#FFFFFF',
            borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.06)',
          },
        ]}>
        <View style={styles.activeHeader}>
          <View style={[styles.statusDot, { backgroundColor: active ? '#10B981' : palette.tabIconDefault }]} />
          <Text style={[styles.activeStatus, { color: palette.tabIconDefault }]}>
            {active ? 'ACTIVE SESSION' : 'NO ACTIVE EVENT'}
          </Text>
        </View>
        <Text style={[styles.activeTitle, { color: palette.text }]}>{active?.title ?? 'Ready to focus?'}</Text>
        <Text style={[styles.activeClock, { color: active ? palette.tint : palette.tabIconDefault }]}>
          {active ? formatClock(elapsedMs) : '00:00:00'}
        </Text>
        {active && remainingMs != null ? (
          <Text style={[styles.activeRemaining, { color: palette.tabIconDefault }]}>{formatClock(remainingMs)} remaining</Text>
        ) : !active ? (
          <TouchableOpacity 
            style={[styles.startBtn, { backgroundColor: palette.tint }]}
            onPress={() => router.push('/plan')}
          >
            <Text style={styles.startBtnText}>Start Session</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#141a2a' : '#FFFFFF' }]}>
          <Text style={[styles.statLabel, { color: palette.tabIconDefault }]}>POINTS</Text>
          <Text style={[styles.statValue, { color: palette.text }]}>{pointsToday.toFixed(1)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#141a2a' : '#FFFFFF' }]}>
          <Text style={[styles.statLabel, { color: palette.tabIconDefault }]}>TIME</Text>
          <Text style={[styles.statValue, { color: palette.text }]}>{Math.round(timeToday / 60000)}m</Text>
        </View>
      </View>

      <View style={styles.timelineSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Today's Timeline</Text>
          <TouchableOpacity onPress={() => router.push('/calendar')}>
            <Text style={[styles.seeAll, { color: palette.tint }]}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={[styles.timelineCard, { backgroundColor: isDark ? '#141a2a' : '#FFFFFF' }]}>
          {todayEvents.length ? (
            todayEvents.map((row, idx) => (
              <Pressable
                key={row.id}
                style={[styles.timelineRow, idx === todayEvents.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => router.push(`/event/${row.id}`)}>
                <View style={styles.timelineTimeCol}>
                  <Text style={[styles.timelineTime, { color: palette.text }]}>{formatTime(row.startAt)}</Text>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineTitle, { color: palette.text }]}>{row.title}</Text>
                  {formatCategoryLine(row) ? (
                    <Text style={[styles.timelineCategory, { color: palette.tabIconDefault }]}>
                      {formatCategoryLine(row)}
                    </Text>
                  ) : null}
                </View>
                <InsightIcon name="chevronLeft" size={16} color={palette.tabIconDefault} />
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyTimeline}>
              <InsightIcon name="calendar" size={32} color={palette.tabIconDefault} />
              <Text style={[styles.timelineEmptyText, { color: palette.tabIconDefault }]}>No events logged for today yet.</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
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
  },
  activeRemaining: {
    fontSize: 13,
    fontWeight: '600',
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
  ribbon: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  ribbonMeta: {
    gap: 6,
  },
  ribbonLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  ribbonTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  ribbonActions: {
    flexDirection: 'row',
    gap: 10,
  },
  ribbonButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbonButtonText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  ribbonButtonTextLight: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  timelineSection: {
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
  seeAll: {
    fontSize: 14,
    fontWeight: '700',
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
});
