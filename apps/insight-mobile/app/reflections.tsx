import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/state/theme';
import { Screen } from '@/components/Screen';

type Reflection = {
  id: string;
  title: string;
  summary: string;
  themes: string[];
  insights: string[];
  createdAt: number;
  archived: boolean;
  periodStart: number;
  periodEnd: number;
};

type ViewMode = 'reflections' | 'archive';

// Mock data for now - would come from storage/API
const MOCK_REFLECTIONS: Reflection[] = [
  {
    id: '1',
    title: 'Weekly Reflection',
    summary: 'This week showed strong focus on deep work sessions, particularly in the mornings. Your energy patterns suggest peak productivity between 9-11am.',
    themes: ['Focus', 'Productivity', 'Morning Routine'],
    insights: [
      'Deep work sessions averaged 2.5 hours, up from last week',
      'Best focus days were Tuesday and Thursday',
      'Evening wind-down routines improved sleep quality',
    ],
    createdAt: Date.now() - 86400000,
    archived: false,
    periodStart: Date.now() - 7 * 86400000,
    periodEnd: Date.now(),
  },
  {
    id: '2',
    title: 'Monthly Overview',
    summary: 'January brought significant progress on personal projects. Social connections remained strong with regular interactions.',
    themes: ['Projects', 'Social', 'Balance'],
    insights: [
      'Completed 3 major project milestones',
      'Maintained weekly social activities',
      'Exercise consistency improved by 40%',
    ],
    createdAt: Date.now() - 7 * 86400000,
    archived: false,
    periodStart: Date.now() - 30 * 86400000,
    periodEnd: Date.now() - 7 * 86400000,
  },
  {
    id: '3',
    title: 'Q4 Review',
    summary: 'Strong finish to the year with balanced work and personal life. Key achievements in career growth.',
    themes: ['Career', 'Growth', 'Achievement'],
    insights: [
      'Promoted to senior role',
      'Learned 2 new skills',
      'Traveled to 3 new places',
    ],
    createdAt: Date.now() - 30 * 86400000,
    archived: true,
    periodStart: Date.now() - 90 * 86400000,
    periodEnd: Date.now() - 30 * 86400000,
  },
];

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeDate(ms: number) {
  const now = Date.now();
  const diff = now - ms;
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return formatDate(ms);
}

export default function ReflectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { palette } = useTheme();

  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('reflections');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null);

  useEffect(() => {
    if (isFocused) {
      // Load reflections - using mock data for now
      setReflections(MOCK_REFLECTIONS);
    }
  }, [isFocused]);

  const filteredReflections = useMemo(() => {
    return reflections
      .filter((r) => (viewMode === 'archive' ? r.archived : !r.archived))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [reflections, viewMode]);

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
  }, []);

  const handleArchive = useCallback((id: string) => {
    setReflections((prev) =>
      prev.map((r) => (r.id === id ? { ...r, archived: !r.archived } : r))
    );
    setSelectedReflection(null);
  }, []);

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Reflections</Text>
        <TouchableOpacity onPress={handleGenerate} style={styles.backButton} disabled={isGenerating}>
          <Ionicons name="sparkles" size={22} color={palette.tint} />
        </TouchableOpacity>
      </View>

      <View style={styles.viewToggle}>
        {(['reflections', 'archive'] as ViewMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.toggleTab,
              {
                backgroundColor: viewMode === mode ? palette.tint : palette.surface,
                borderColor: palette.border,
              },
            ]}
            onPress={() => setViewMode(mode)}
          >
            <Text
              style={[
                styles.toggleText,
                { color: viewMode === mode ? '#FFFFFF' : palette.text },
              ]}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isGenerating && (
        <View style={[styles.generatingCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <ActivityIndicator size="small" color={palette.tint} />
          <Text style={[styles.generatingText, { color: palette.text }]}>
            Synthesizing your reflections...
          </Text>
          <Text style={[styles.generatingSubtext, { color: palette.textSecondary }]}>
            Analyzing patterns from your recent activity
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {filteredReflections.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="bulb-outline" size={40} color={palette.textSecondary} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>
              {viewMode === 'archive' ? 'No Archived Reflections' : 'No Reflections Yet'}
            </Text>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              {viewMode === 'archive'
                ? 'Archived reflections will appear here'
                : 'Tap the sparkle icon to generate AI insights from your activity'}
            </Text>
          </View>
        ) : (
          filteredReflections.map((reflection) => (
            <TouchableOpacity
              key={reflection.id}
              style={[styles.reflectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
              onPress={() => setSelectedReflection(reflection)}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { backgroundColor: palette.tint + '20' }]}>
                  <Ionicons name="bulb" size={20} color={palette.tint} />
                </View>
                <View style={styles.cardTitleWrap}>
                  <Text style={[styles.cardTitle, { color: palette.text }]}>{reflection.title}</Text>
                  <Text style={[styles.cardDate, { color: palette.textSecondary }]}>
                    {formatRelativeDate(reflection.createdAt)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.cardSummary, { color: palette.textSecondary }]} numberOfLines={3}>
                {reflection.summary}
              </Text>

              <View style={styles.themesRow}>
                {reflection.themes.slice(0, 3).map((theme) => (
                  <View key={theme} style={[styles.themeTag, { backgroundColor: palette.border }]}>
                    <Text style={[styles.themeText, { color: palette.text }]}>{theme}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.periodText, { color: palette.textSecondary }]}>
                  {formatDate(reflection.periodStart)} - {formatDate(reflection.periodEnd)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={palette.textSecondary} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={selectedReflection !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedReflection(null)}
      >
        {selectedReflection && (
          <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <TouchableOpacity onPress={() => setSelectedReflection(null)} style={styles.modalClose}>
                <Ionicons name="close" size={24} color={palette.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: palette.text }]}>{selectedReflection.title}</Text>
              <TouchableOpacity
                onPress={() => handleArchive(selectedReflection.id)}
                style={styles.modalClose}
              >
                <Ionicons
                  name={selectedReflection.archived ? 'archive' : 'archive-outline'}
                  size={22}
                  color={palette.tint}
                />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={[styles.periodCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Ionicons name="calendar-outline" size={16} color={palette.textSecondary} />
                <Text style={[styles.periodCardText, { color: palette.textSecondary }]}>
                  {formatDate(selectedReflection.periodStart)} - {formatDate(selectedReflection.periodEnd)}
                </Text>
              </View>

              <Text style={[styles.sectionTitle, { color: palette.text }]}>Summary</Text>
              <Text style={[styles.summaryText, { color: palette.text }]}>
                {selectedReflection.summary}
              </Text>

              <Text style={[styles.sectionTitle, { color: palette.text }]}>Key Insights</Text>
              {selectedReflection.insights.map((insight, idx) => (
                <View key={idx} style={styles.insightRow}>
                  <View style={[styles.insightDot, { backgroundColor: palette.tint }]} />
                  <Text style={[styles.insightText, { color: palette.text }]}>{insight}</Text>
                </View>
              ))}

              <Text style={[styles.sectionTitle, { color: palette.text }]}>Themes</Text>
              <View style={styles.modalThemes}>
                {selectedReflection.themes.map((theme) => (
                  <View key={theme} style={[styles.modalThemeTag, { backgroundColor: palette.tint + '20' }]}>
                    <Text style={[styles.modalThemeText, { color: palette.tint }]}>{theme}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
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
  viewToggle: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 6,
    marginBottom: 11,
  },
  toggleTab: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  toggleText: {
    fontSize: 9,
    fontWeight: '600',
  },
  generatingCard: {
    marginHorizontal: 14,
    marginBottom: 11,
    borderWidth: 1,
    borderRadius: 11,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  generatingText: {
    fontSize: 10,
    fontWeight: '600',
  },
  generatingSubtext: {
    fontSize: 9,
  },
  scroll: {
    paddingHorizontal: 14,
    paddingBottom: 28,
    gap: 8,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  reflectionCard: {
    borderWidth: 1,
    borderRadius: 11,
    padding: 11,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDate: {
    fontSize: 8,
    marginTop: 2,
  },
  cardSummary: {
    fontSize: 10,
    lineHeight: 14,
  },
  themesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  themeTag: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  themeText: {
    fontSize: 8,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodText: {
    fontSize: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  modalClose: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalScroll: {
    padding: 14,
    gap: 11,
  },
  periodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  periodCardText: {
    fontSize: 9,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 15,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  insightDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 5,
  },
  insightText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
  },
  modalThemes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalThemeTag: {
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalThemeText: {
    fontSize: 9,
    fontWeight: '600',
  },
});