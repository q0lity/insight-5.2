/**
 * Event Detail Screen
 *
 * Shows detailed view of a single event.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/state/theme';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette, sizes } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: palette.text, fontSize: sizes.headerTitle }]}>Event</Text>
        <Text style={[styles.eventId, { color: palette.textSecondary }]}>ID: {id}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={{ color: palette.textSecondary }}>Event details will appear here</Text>
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontWeight: '900', letterSpacing: -0.5 },
  eventId: { marginTop: 4 },
  content: { padding: 20 },
});
