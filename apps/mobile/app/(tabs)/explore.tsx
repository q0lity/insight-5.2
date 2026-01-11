/**
 * Explore Screen
 *
 * Browse and search through events, with filtering and sorting options.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';

export default function ExploreScreen() {
  const { palette, sizes } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: palette.text, fontSize: sizes.headerTitle }]}>Explore</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <InsightIcon name="file" size={32} color={palette.textSecondary} />
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Search and browse events</Text>
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontWeight: '900', letterSpacing: -0.5 },
  content: { padding: 20 },
  emptyCard: { padding: 32, borderRadius: 16, alignItems: 'center', gap: 12, borderWidth: 1 },
  emptyText: { fontWeight: '500' },
});
