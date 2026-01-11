/**
 * Plan/Tasks Screen
 *
 * Task management with:
 * - Markdown outline editor
 * - Auto-parsing of task structure
 * - Duration parsing
 * - Synced tasks with completion tracking
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { triggerHaptic, triggerSuccess } from '@/src/utils/haptics';

export default function PlanScreen() {
  const { palette, sizes } = useTheme();
  const insets = useSafeAreaInsets();
  const [outline, setOutline] = useState('');

  const handleAddTask = () => {
    triggerHaptic('medium');
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text
          style={[styles.headerTitle, { color: palette.text, fontSize: sizes.headerTitle }]}
          accessibilityRole="header"
        >
          Tasks
        </Text>
        <Pressable
          onPress={handleAddTask}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
          accessibilityRole="button"
          accessibilityLabel="Add new task"
        >
          <InsightIcon name="plus" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Outline Editor Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle }]}>
            Daily Plan
          </Text>
          <View style={[styles.editorCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <TextInput
              style={[styles.editor, { color: palette.text, fontSize: sizes.bodyText }]}
              multiline
              placeholder="- Task 1 (30m)&#10;- Task 2 (1h)&#10;  - Subtask A&#10;  - Subtask B"
              placeholderTextColor={palette.textSecondary}
              value={outline}
              onChangeText={setOutline}
              accessibilityLabel="Task outline editor"
              accessibilityHint="Enter tasks in markdown format with durations"
            />
          </View>
        </View>

        {/* Tasks Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle }]}>
            Upcoming
          </Text>
          <View
            style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            accessibilityLabel="No tasks. Add tasks using the outline editor above."
          >
            <InsightIcon name="check" size={32} color={palette.textSecondary} />
            <Text style={[styles.emptyText, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
              No tasks yet
            </Text>
            <Text style={[styles.emptyHint, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
              Add tasks using the outline editor above
            </Text>
          </View>
        </View>

        {/* Completed Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text, fontSize: sizes.sectionTitle }]}>
            Completed
          </Text>
          <View
            style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            accessibilityLabel="No completed tasks today"
          >
            <Text style={[styles.emptyText, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
              No completed tasks today
            </Text>
          </View>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  editorCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  editor: {
    padding: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  emptyText: {
    fontWeight: '500',
  },
  emptyHint: {
    textAlign: 'center',
  },
});
