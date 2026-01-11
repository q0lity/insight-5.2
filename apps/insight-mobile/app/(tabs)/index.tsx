import { StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { useAuth } from '@/src/state/auth';

export default function DashboardScreen() {
  const { palette } = useTheme();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100 }}
    >
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: palette.textSecondary }]}>Welcome back</Text>
        <Text style={[styles.title, { color: palette.text }]}>Dashboard</Text>
      </View>

      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>Today's Overview</Text>
        <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
          {session?.user?.email ?? 'Not signed in'}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>Quick Actions</Text>
        <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
          Add tasks, events, and more from here
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>Recent Activity</Text>
        <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
          Your recent tasks and events will appear here
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Figtree',
    marginTop: 4,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Figtree',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
});
