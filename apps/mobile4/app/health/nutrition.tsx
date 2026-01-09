import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { listMeals } from '@/src/storage/nutrition';
import type { MealEntry } from '@/src/lib/health';

export default function NutritionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { palette } = useTheme();
  const [meals, setMeals] = useState<MealEntry[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const rows = await listMeals();
      if (!mounted) return;
      setMeals(rows);
    };
    if (isFocused) {
      void load();
    }
    return () => {
      mounted = false;
    };
  }, [isFocused]);

  const sorted = useMemo(() => meals.sort((a, b) => b.eatenAt - a.eatenAt), [meals]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Nutrition</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {sorted.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No meals logged yet.
            </Text>
          </View>
        ) : (
          sorted.map((meal) => (
            <View key={meal.id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: palette.text }]}>{meal.title}</Text>
                  <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>
                    {new Date(meal.eatenAt).toLocaleDateString()} - {meal.type}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.cardTitle, { color: palette.text }]}>{meal.totalCalories} kcal</Text>
                  <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>
                    P{Math.round(meal.macros.protein)} C{Math.round(meal.macros.carbs)} F{Math.round(meal.macros.fat)}
                  </Text>
                </View>
              </View>

              {meal.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={[styles.itemName, { color: palette.text }]}>{item.name}</Text>
                  <Text style={[styles.itemMeta, { color: palette.textSecondary }]}>
                    {item.quantity} {item.unit}
                    {item.calories != null ? ` - ${item.calories} kcal` : ''}
                  </Text>
                </View>
              ))}
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
    fontFamily: 'Figtree',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 12,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  itemRow: {
    gap: 2,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemMeta: {
    fontSize: 12,
  },
});
