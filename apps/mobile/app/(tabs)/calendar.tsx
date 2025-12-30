import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { listEvents, type MobileEvent } from '@/src/storage/events';
import { useSession } from '@/src/state/session';
import { InsightIcon } from '@/src/components/InsightIcon';

const SEGMENTS = ['Day', 'Week'];
const HOURS = Array.from({ length: 24 }).map((_, i) => i);

function formatHour(h: number) {
  const hour = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? 'AM' : 'PM';
  return `${hour} ${period}`;
}

export default function CalendarScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { active } = useSession();
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [segment, setSegment] = useState('Day');

  const isDark = colorScheme === 'dark';

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

  const todayKey = useMemo(() => new Date().toDateString(), []);
  const todayEvents = useMemo(() => {
    return events
      .filter((event) => new Date(event.startAt).toDateString() === todayKey)
      .sort((a, b) => a.startAt - b.startAt);
  }, [events, todayKey]);

  const hourHeight = 80;

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Calendar</Text>
          <Text style={[styles.headerSubtitle, { color: palette.tabIconDefault }]}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.nodeBadge, { borderColor: isDark ? 'rgba(148,163,184,0.24)' : 'rgba(28,28,30,0.1)' }]}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.nodeBadgeText}>1</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.segmentContainer}>
        <View style={[styles.segmentRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          {SEGMENTS.map((label) => (
            <TouchableOpacity
              key={label}
              onPress={() => setSegment(label)}
              style={[
                styles.segment,
                label === segment && { backgroundColor: isDark ? '#141a2a' : '#FFFFFF' },
                label === segment && styles.segmentActiveShadow,
              ]}>
              <Text style={[styles.segmentText, { color: label === segment ? palette.text : palette.tabIconDefault }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.timelineGrid}>
          {HOURS.map((h) => (
            <View key={h} style={[styles.hourRow, { height: hourHeight }]}>
              <View style={styles.hourLabelCol}>
                <Text style={[styles.hourLabel, { color: palette.tabIconDefault }]}>{h === 0 ? '' : formatHour(h)}</Text>
              </View>
              <View style={[styles.hourLine, { borderTopColor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(28,28,30,0.04)' }]} />
            </View>
          ))}

          {segment === 'Day' && todayEvents.map((ev) => {
            const start = new Date(ev.startAt);
            const end = ev.endAt ? new Date(ev.endAt) : new Date(ev.startAt + 3600000);
            const startMins = start.getHours() * 60 + start.getMinutes();
            const durationMins = (end.getTime() - start.getTime()) / 60000;
            const top = (startMins / 60) * hourHeight;
            const height = (durationMins / 60) * hourHeight;
            
            return (
              <Pressable
                key={ev.id}
                onPress={() => router.push(`/event/${ev.id}`)}
                style={[
                  styles.eventBlock,
                  {
                    top,
                    height: Math.max(height, 30),
                    backgroundColor: isDark ? 'rgba(217,93,57,0.15)' : 'rgba(217,93,57,0.08)',
                    borderColor: 'rgba(217,93,57,0.3)',
                  }
                ]}
              >
                <View style={[styles.eventStripe, { backgroundColor: palette.tint }]} />
                <Text style={[styles.eventTitle, { color: palette.text }]} numberOfLines={1}>{ev.title}</Text>
                {height > 40 && (
                  <Text style={[styles.eventTime, { color: palette.tabIconDefault }]}>
                    {formatHour(start.getHours())}:{start.getMinutes().toString().padStart(2, '0')}
                  </Text>
                )}
              </Pressable>
            );
          })}
        
        </View>
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
  eventTime: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
