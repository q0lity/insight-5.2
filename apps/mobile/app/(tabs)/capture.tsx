/**
 * Capture Screen
 *
 * Quick capture interface for voice notes and quick logs.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';

export default function CaptureScreen() {
  const { palette, sizes } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: palette.text, fontSize: sizes.headerTitle }]}>Capture</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.recordButton, { backgroundColor: palette.tint }]}>
          <InsightIcon name="mic" size={48} color="#FFFFFF" />
        </View>
        <Text style={[styles.hint, { color: palette.textSecondary }]}>Tap to start recording</Text>
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontWeight: '900', letterSpacing: -0.5 },
  content: { padding: 20, alignItems: 'center' },
  recordButton: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  hint: { marginTop: 20, fontWeight: '500' },
});
