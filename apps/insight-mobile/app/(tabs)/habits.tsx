import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';

export default function HabitsScreen() {
  const { palette, sizes } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.header, { backgroundColor: 'transparent' }]}>
          <Text style={[styles.title, { fontSize: sizes.headerTitle }]}>Habits</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            Track your daily habits
          </Text>
        </View>

        <View style={[styles.emptyState, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.emptyTitle, { fontSize: sizes.sectionTitle }]}>No Habits Yet</Text>
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
            Create habits to build consistency and track streaks
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontWeight: '800',
    fontFamily: 'Figtree_800ExtraBold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Figtree_500Medium',
  },
  emptyState: {
    borderRadius: 20,
    padding: 40,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Figtree_400Regular',
    textAlign: 'center',
  },
});
