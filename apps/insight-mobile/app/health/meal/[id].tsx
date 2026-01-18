import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/state/theme';
import { getMeal, deleteMeal } from '@/src/storage/nutrition';
import type { MealEntry } from '@/src/lib/health';
import { Screen } from '@/components/Screen';

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { palette } = useTheme();
  const [meal, setMeal] = useState<MealEntry | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return;
      const result = await getMeal(id);
      if (!mounted) return;
      setMeal(result);
    };
    if (isFocused) {
      void load();
    }
    return () => {
      mounted = false;
    };
  }, [id, isFocused]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Meal',
      'Are you sure you want to delete this meal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            await deleteMeal(id);
            router.back();
          },
        },
      ],
    );
  };

  if (!meal) {
    return (
      <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Meal</Text>
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
        <Text style={[styles.headerTitle, { color: palette.text }]} numberOfLines={1}>{meal.title}</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.backButton}>
          <Ionicons name="trash-outline" size={22} color={palette.danger ?? '#ef4444'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.metaCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>Type</Text>
            <Text style={[styles.metaValue, { color: palette.text }]}>{meal.type}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>Date</Text>
            <Text style={[styles.metaValue, { color: palette.text }]}>
              {new Date(meal.eatenAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>Time</Text>
            <Text style={[styles.metaValue, { color: palette.text }]}>
              {new Date(meal.eatenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          {meal.location && (
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>Location</Text>
              <Text style={[styles.metaValue, { color: palette.text }]}>{meal.location}</Text>
            </View>
          )}
        </View>

        <View style={[styles.macroCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.macroTitle, { color: palette.text }]}>Nutrition Summary</Text>
          <View style={styles.macroGrid}>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: palette.tint }]}>{meal.totalCalories}</Text>
              <Text style={[styles.macroLabel, { color: palette.textSecondary }]}>kcal</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: palette.text }]}>{Math.round(meal.macros.protein)}g</Text>
              <Text style={[styles.macroLabel, { color: palette.textSecondary }]}>Protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: palette.text }]}>{Math.round(meal.macros.carbs)}g</Text>
              <Text style={[styles.macroLabel, { color: palette.textSecondary }]}>Carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: palette.text }]}>{Math.round(meal.macros.fat)}g</Text>
              <Text style={[styles.macroLabel, { color: palette.textSecondary }]}>Fat</Text>
            </View>
          </View>
          {(meal.macros.fiber != null || meal.macros.sodium != null) && (
            <View style={styles.macroExtra}>
              {meal.macros.fiber != null && (
                <Text style={[styles.macroExtraText, { color: palette.textSecondary }]}>
                  Fiber: {Math.round(meal.macros.fiber)}g
                </Text>
              )}
              {meal.macros.sodium != null && (
                <Text style={[styles.macroExtraText, { color: palette.textSecondary }]}>
                  Sodium: {Math.round(meal.macros.sodium)}mg
                </Text>
              )}
            </View>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Food Items</Text>

        {meal.items.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No items logged.</Text>
          </View>
        ) : (
          meal.items.map((item) => (
            <View key={item.id} style={[styles.itemCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.itemHeader}>
                <Text style={[styles.itemName, { color: palette.text }]}>{item.name}</Text>
                {item.calories != null && (
                  <Text style={[styles.itemCalories, { color: palette.text }]}>{item.calories} kcal</Text>
                )}
              </View>
              <Text style={[styles.itemQuantity, { color: palette.textSecondary }]}>
                {item.quantity} {item.unit}
              </Text>
              {(item.protein != null || item.carbs != null || item.fat != null) && (
                <Text style={[styles.itemMacros, { color: palette.textSecondary }]}>
                  {item.protein != null && `P${Math.round(item.protein)} `}
                  {item.carbs != null && `C${Math.round(item.carbs)} `}
                  {item.fat != null && `F${Math.round(item.fat)}`}
                </Text>
              )}
              {item.notes && (
                <Text style={[styles.itemNotes, { color: palette.textSecondary }]}>{item.notes}</Text>
              )}
            </View>
          ))
        )}

        {meal.notes && (
          <>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Notes</Text>
            <View style={[styles.notesCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.notesText, { color: palette.text }]}>{meal.notes}</Text>
            </View>
          </>
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
    fontSize: 14,
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
  metaCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 9,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: '600',
  },
  macroCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
    gap: 8,
  },
  macroTitle: {
    fontSize: 10,
    fontWeight: '700',
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  macroLabel: {
    fontSize: 8,
    marginTop: 2,
  },
  macroExtra: {
    flexDirection: 'row',
    gap: 11,
  },
  macroExtraText: {
    fontSize: 8,
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
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
    gap: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  itemCalories: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemQuantity: {
    fontSize: 8,
  },
  itemMacros: {
    fontSize: 8,
  },
  itemNotes: {
    fontSize: 8,
    fontStyle: 'italic',
    marginTop: 4,
  },
  notesCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
  },
  notesText: {
    fontSize: 9,
    lineHeight: 14,
  },
});