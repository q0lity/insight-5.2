import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function HabitsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.nodeBadge}>
          <Text style={styles.nodeBadgeText}>1</Text>
        </View>
        <Text style={styles.topMeta}>Habits</Text>
      </View>
      <Text style={styles.subtitle}>Placeholder: habit list + streaks + XP.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nodeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.1)',
    backgroundColor: 'rgba(217,93,57,0.12)',
  },
  nodeBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D95D39',
  },
  topMeta: {
    fontWeight: '600',
    opacity: 0.7,
  },
  subtitle: {
    opacity: 0.8,
  },
});
