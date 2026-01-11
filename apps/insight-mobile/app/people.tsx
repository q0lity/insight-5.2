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
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 6 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  statsRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addRow: {
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  addInput: {
    flex: 1,
    fontSize: 14,
  },
  addButton: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  searchRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 10,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 12,
    marginTop: 2,
  },
});
