import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { InsightIcon, type InsightIconName } from '@/src/components/InsightIcon';

type MenuItem = {
  label: string;
  icon: InsightIconName;
  route: string;
  color?: string;
};

const MENU_ITEMS: MenuItem[] = [
  { label: 'Goals', icon: 'target', route: '/goals', color: '#D95D39' },
  { label: 'Projects', icon: 'briefcase', route: '/projects', color: '#5B5F97' },
  { label: 'Rewards', icon: 'gift', route: '/rewards', color: '#EAB308' },
  { label: 'Reports', icon: 'barChart', route: '/reports', color: '#10B981' },
  { label: 'People', icon: 'users', route: '/people', color: '#3B82F6' },
  { label: 'Places', icon: 'pin', route: '/places', color: '#F43F5E' },
  { label: 'Tags', icon: 'tag', route: '/tags', color: '#8B5CF6' },
  { label: 'Settings', icon: 'settings', route: '/settings', color: '#64748B' },
];

export default function MoreScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: palette.text }]}>More</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            activeOpacity={0.7}
            style={[
              styles.card,
              { 
                backgroundColor: isDark ? '#141a2a' : '#FFFFFF',
                borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)',
                borderWidth: 1
              }
            ]}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.iconCircle, { backgroundColor: item.color + (isDark ? '30' : '15') }]}>
              <InsightIcon name={item.icon} size={24} color={item.color} />
            </View>
            <Text style={[styles.cardLabel, { color: palette.text }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
  },
  grid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  card: {
    width: '48%',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Figtree',
    letterSpacing: -0.2,
  },
});
