import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/state/theme';
import { listPeople, deletePerson } from '@/src/storage/people';
import type { Person } from '@/src/storage/people';
import { listEvents } from '@/src/storage/events';
import type { CalendarEvent } from '@/src/storage/events';
import { extractPeople } from '@/src/lib/notes';
import { Screen } from '@/components/Screen';

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { palette } = useTheme();

  const [person, setPerson] = useState<Person | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return;
      const [peopleData, eventsData] = await Promise.all([
        listPeople(),
        listEvents(),
      ]);
      if (!mounted) return;
      const found = peopleData.find((p) => p.id === id);
      setPerson(found ?? null);
      setEvents(eventsData);
    };
    if (isFocused) {
      void load();
    }
    return () => {
      mounted = false;
    };
  }, [id, isFocused]);

  const relatedEvents = useMemo(() => {
    if (!person) return [];
    const key = person.name.toLowerCase();
    return events
      .filter((e) => {
        const mentions = extractPeople(e.notes ?? '').map((m) => m.toLowerCase().replace(/^@/, ''));
        const tags = (e.tags ?? [])
          .filter((t) => t.startsWith('@'))
          .map((t) => t.toLowerCase().replace(/^@/, ''));
        return mentions.includes(key) || tags.includes(key);
      })
      .sort((a, b) => b.startAt - a.startAt)
      .slice(0, 50);
  }, [person, events]);

  const stats = useMemo(() => {
    const totalMinutes = relatedEvents.reduce((sum, e) => {
      const mins = Math.round((e.endAt - e.startAt) / 60000);
      return sum + Math.max(0, mins);
    }, 0);
    const lastAt = relatedEvents[0]?.startAt ?? null;
    return { totalEvents: relatedEvents.length, totalMinutes, lastAt };
  }, [relatedEvents]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Person',
      `Are you sure you want to delete "${person?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            await deletePerson(id);
            router.back();
          },
        },
      ],
    );
  };

  if (!person) {
    return (
      <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Person</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingWrap}>
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Loading...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]} numberOfLines={1}>
          {person.name}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.backButton}>
          <Ionicons name="trash-outline" size={22} color={palette.danger ?? '#ef4444'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={[styles.avatarLarge, { backgroundColor: palette.tint }]}>
            <Text style={styles.avatarLargeText}>{person.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.profileName, { color: palette.text }]}>{person.name}</Text>
          <Text style={[styles.profileMeta, { color: palette.textSecondary }]}>
            Added {new Date(person.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.statValue, { color: palette.tint }]}>{stats.totalEvents}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Interactions</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.statValue, { color: palette.text }]}>
              {stats.totalMinutes < 60 ? `${stats.totalMinutes}m` : `${Math.round(stats.totalMinutes / 60)}h`}
            </Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Time Together</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent Interactions</Text>

        {relatedEvents.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No interactions found. Tag @{person.name} in events to track interactions.
            </Text>
          </View>
        ) : (
          relatedEvents.map((event) => (
            <View
              key={event.id}
              style={[styles.eventCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <View style={styles.eventHeader}>
                <Text style={[styles.eventTitle, { color: palette.text }]} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text style={[styles.eventDate, { color: palette.textSecondary }]}>
                  {new Date(event.startAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.eventMeta}>
                {event.category && (
                  <Text style={[styles.eventCategory, { color: palette.textSecondary }]}>
                    {event.category}
                    {event.subcategory ? ` · ${event.subcategory}` : ''}
                  </Text>
                )}
                <Text style={[styles.eventDuration, { color: palette.textSecondary }]}>
                  {Math.round((event.endAt - event.startAt) / 60000)}m
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 10,
  },
  scroll: {
    paddingHorizontal: 14,
    paddingBottom: 28,
    gap: 11,
  },
  profileCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 17,
    alignItems: 'center',
    gap: 6,
  },
  avatarLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarLargeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 20,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
  },
  profileMeta: {
    fontSize: 9,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 11,
    padding: 11,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 17,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 14,
  },
  eventCard: {
    borderWidth: 1,
    borderRadius: 11,
    padding: 10,
    gap: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  eventTitle: {
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  eventDate: {
    fontSize: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eventCategory: {
    fontSize: 8,
  },
  eventDuration: {
    fontSize: 8,
  },
});