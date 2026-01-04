import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { listPlaces, addPlace, deletePlace, type Place } from '@/src/storage/places';

export default function PlacesScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const [places, setPlaces] = useState<Place[]>([]);
  const [newPlaceName, setNewPlaceName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const data = await listPlaces();
    setPlaces(data.sort((a, b) => b.createdAt - a.createdAt));
  }

  async function handleAddPlace() {
    if (!newPlaceName.trim()) return;
    await addPlace(newPlaceName.trim());
    setNewPlaceName('');
    await loadData();
  }

  async function handleDeletePlace(id: string) {
    await deletePlace(id);
    await loadData();
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Places</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: palette.surface,
              color: palette.text,
              borderColor: palette.border
            }
          ]}
          placeholder="Add a location..."
          placeholderTextColor={palette.textSecondary}
          value={newPlaceName}
          onChangeText={setNewPlaceName}
          onSubmitEditing={handleAddPlace}
        />
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: palette.tint }]} 
          onPress={handleAddPlace}
        >
          <InsightIcon name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={places}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={[styles.card, { backgroundColor: palette.surface }]}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No places added yet. Track where you spend your time by adding locations.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.item, { backgroundColor: palette.surface }]}>
            <View style={[styles.iconCircle, { backgroundColor: palette.tint + '20' }]}>
              <InsightIcon name="pin" size={20} color={palette.tint} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: palette.text }]}>{item.name}</Text>
              <Text style={[styles.meta, { color: palette.textSecondary }]}>
                Added {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDeletePlace(item.id)} style={styles.deleteButton}>
              <InsightIcon name="plus" size={18} color={palette.border} />
            </TouchableOpacity>
          </View>
        )}
      />
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
  },
  backButton: {
    padding: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Figtree',
    borderWidth: 1,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Figtree',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Figtree',
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  deleteButton: {
    padding: 8,
    transform: [{ rotate: '45deg' }],
  },
});
