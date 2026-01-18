import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/state/theme';
import { listPeople, addPerson } from '@/src/storage/people';
import type { Person } from '@/src/storage/people';
import { listEvents } from '@/src/storage/events';
import type { CalendarEvent } from '@/src/storage/events';
import { extractPeople } from '@/src/lib/notes';
import { Screen } from '@/components/Screen';

type PersonWithStats = Person & {
  eventCount: number;
  lastInteraction: number | null;
};

export default function PeopleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { palette } = useTheme();

  const [people, setPeople] = useState<Person[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [peopleData, eventsData] = await Promise.all([
        listPeople(),
        listEvents(),
      ]);
      if (!mounted) return;
      setPeople(peopleData);
      setEvents(eventsData);
    };
    if (isFocused) {
      void load();
    }
    return () => {
      mounted = false;
    };
  }, [isFocused]);

  const peopleWithStats = useMemo(() => {
    const stats = new Map<string, { count: number; lastAt: number }>();

    for (const event of events) {
      const mentions = extractPeople(event.notes ?? '');
      const tags = (event.tags ?? []).filter((t) => t.startsWith('@'));
      const allPeople = [...mentions, ...tags.map((t) => t.replace(/^@/, ''))];

      for (const name of allPeople) {
        const key = name.toLowerCase();
        const current = stats.get(key) ?? { count: 0, lastAt: 0 };
        current.count += 1;
        current.lastAt = Math.max(current.lastAt, event.startAt);
        stats.set(key, current);
      }
    }

    return people.map((p) => {
      const stat = stats.get(p.name.toLowerCase());
      return {
        ...p,
        eventCount: stat?.count ?? 0,
        lastInteraction: stat?.lastAt ?? null,
      };
    });
  }, [people, events]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = needle
      ? peopleWithStats.filter((p) => p.name.toLowerCase().includes(needle))
      : peopleWithStats;
    return list.sort((a, b) => b.eventCount - a.eventCount || a.name.localeCompare(b.name));
  }, [peopleWithStats, search]);

  const handleAddPerson = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const person = await addPerson(name);
      setPeople((prev) => [...prev, person]);
      setNewName('');
      setShowAdd(false);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to add person');
    }
  }, [newName]);

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>People</Text>
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={styles.backButton}>
          <Ionicons name={showAdd ? 'close' : 'add'} size={26} color={palette.tint} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBadge, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="people" size={14} color={palette.tint} />
          <Text style={[styles.statText, { color: palette.text }]}>{people.length} Connections</Text>
        </View>
      </View>

      {showAdd && (
        <View style={[styles.addRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <TextInput
            style={[styles.addInput, { color: palette.text }]}
            value={newName}
            onChangeText={setNewName}
            placeholder="Enter name..."
            placeholderTextColor={palette.textSecondary}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: palette.tint }]}
            onPress={handleAddPerson}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="search" size={16} color={palette.textSecondary} />
          <TextInput
            style={[styles.searchText, { color: palette.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search people..."
            placeholderTextColor={palette.textSecondary}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="people-outline" size={32} color={palette.textSecondary} />
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              {search ? 'No people match your search.' : 'No people added yet.'}
            </Text>
          </View>
        ) : (
          filtered.map((person) => (
            <TouchableOpacity
              key={person.id}
              style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
              onPress={() => router.push(`/person/${person.id}`)}
            >
              <View style={styles.cardMain}>
                <View style={[styles.avatar, { backgroundColor: palette.tint }]}>
                  <Text style={styles.avatarText}>{person.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: palette.text }]}>{person.name}</Text>
                  <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>
                    {person.eventCount} interaction{person.eventCount !== 1 ? 's' : ''}
                    {person.lastInteraction && ` · Last ${new Date(person.lastInteraction).toLocaleDateString()}`}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </Screen>
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
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statText: {
    fontSize: 8,
    fontWeight: '600',
  },
  addRow: {
    marginHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 7,
  },
  addInput: {
    flex: 1,
    fontSize: 10,
  },
  addButton: {
    borderRadius: 7,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 9,
  },
  searchRow: {
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 6,
  },
  searchText: {
    flex: 1,
    fontSize: 10,
  },
  scroll: {
    paddingHorizontal: 14,
    paddingBottom: 28,
    gap: 7,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 10,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 11,
    padding: 10,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 8,
    marginTop: 2,
  },
});