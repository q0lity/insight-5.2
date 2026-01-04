import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { listGoals, addGoal, deleteGoal, type Goal } from '@/src/storage/goals';

export default function GoalsScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalName, setNewGoalName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const data = await listGoals();
    setGoals(data.sort((a, b) => b.createdAt - a.createdAt));
  }

  async function handleAddGoal() {
    if (!newGoalName.trim()) return;
    await addGoal(newGoalName.trim());
    setNewGoalName('');
    await loadData();
  }

  async function handleDeleteGoal(id: string) {
    await deleteGoal(id);
    await loadData();
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Goals</Text>
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
          placeholder="Enter a new goal..."
          placeholderTextColor={palette.textSecondary}
          value={newGoalName}
          onChangeText={setNewGoalName}
          onSubmitEditing={handleAddGoal}
        />
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: palette.tint }]} 
          onPress={handleAddGoal}
        >
          <InsightIcon name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={[styles.card, { backgroundColor: palette.surface }]}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No active goals yet. Add one to start tracking your progress.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.goalItem, { backgroundColor: palette.surface }]}>
            <View style={styles.goalInfo}>
              <Text style={[styles.goalName, { color: palette.text }]}>{item.name}</Text>
              <Text style={[styles.goalDate, { color: palette.textSecondary }]}>
                Started {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteGoal(item.id)} style={styles.deleteButton}>
              <InsightIcon name="plus" size={18} color={palette.border} />
              {/* Using plus as a delete icon placeholder or rotated */}
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
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    gap: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Figtree',
    marginBottom: 4,
  },
  goalDate: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  deleteButton: {
    padding: 8,
    transform: [{ rotate: '45deg' }],
  },
});
