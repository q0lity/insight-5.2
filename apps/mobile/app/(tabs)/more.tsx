/**
 * More Screen
 *
 * Grid menu of additional destinations:
 * - Explore, Goals, Projects, Rewards, Reports
 * - Trackers, People, Places, Tags, Ecosystem
 * - Settings
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon, type InsightIconName } from '@/src/components/InsightIcon';
import { triggerSelection } from '@/src/utils/haptics';

type MenuItem = {
  label: string;
  icon: InsightIconName;
  route: string;
  color: string;
};

const MENU_ITEMS: MenuItem[] = [
  { label: 'Explore', icon: 'file', route: '/explore', color: '#D95D39' },
  { label: 'Goals', icon: 'target', route: '/goals', color: '#D95D39' },
  { label: 'Projects', icon: 'briefcase', route: '/projects', color: '#5B5F97' },
  { label: 'Rewards', icon: 'gift', route: '/rewards', color: '#EAB308' },
  { label: 'Reports', icon: 'barChart', route: '/reports', color: '#10B981' },
  { label: 'Trackers', icon: 'sparkle', route: '/trackers', color: '#F97316' },
  { label: 'People', icon: 'users', route: '/people', color: '#3B82F6' },
  { label: 'Places', icon: 'pin', route: '/places', color: '#F43F5E' },
  { label: 'Tags', icon: 'tag', route: '/tags', color: '#8B5CF6' },
  { label: 'Ecosystem', icon: 'node', route: '/ecosystem', color: '#06B6D4' },
  { label: 'Settings', icon: 'settings', route: '/settings', color: '#64748B' },
];

export default function MoreScreen() {
  const router = useRouter();
  const { palette, sizes, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePress = (route: string) => {
    triggerSelection();
    router.push(route as never);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text
          style={[styles.headerTitle, { color: palette.text, fontSize: sizes.headerTitle }]}
          accessibilityRole="header"
        >
          More
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            activeOpacity={0.7}
            style={[
              styles.card,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                borderRadius: sizes.borderRadius,
              },
            ]}
            onPress={() => handlePress(item.route)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityHint={`Navigate to ${item.label}`}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: item.color + (isDark ? '30' : '15') },
              ]}
            >
              <InsightIcon name={item.icon} size={sizes.iconSize} color={item.color} />
            </View>
            <Text style={[styles.cardLabel, { color: palette.text, fontSize: sizes.bodyText }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Bottom padding for tab bar */}
        <View style={{ height: 120, width: '100%' }} />
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
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  grid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    padding: 20,
    marginBottom: 16,
    gap: 16,
    borderWidth: 1,
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
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
