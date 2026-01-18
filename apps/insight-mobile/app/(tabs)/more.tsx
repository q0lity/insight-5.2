import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { InsightIcon, type InsightIconName } from '@/src/components/InsightIcon';
import { Screen } from '@/components/Screen';
import { LuxCard } from '@/components/LuxCard';
import { LuxHeader } from '@/components/LuxHeader';

type MenuItem = {
  label: string;
  icon: InsightIconName;
  route: string;
  color: string;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Capture',
    items: [
      { label: 'Voice', icon: 'mic', route: '/capture', color: '#D95D39' },
      { label: 'Focus', icon: 'zap', route: '/focus', color: '#F59E0B' },
      { label: 'Notes', icon: 'file', route: '/notes', color: '#3B82F6' },
    ],
  },
  {
    title: 'Planning',
    items: [
      { label: 'Planner', icon: 'calendar', route: '/planner', color: '#8B5CF6' },
      { label: 'Timeline', icon: 'clock', route: '/timeline', color: '#A3B87C' },
      { label: 'Agenda', icon: 'list', route: '/agenda', color: '#22C55E' },
    ],
  },
  {
    title: 'Goals & Projects',
    items: [
      { label: 'Goals', icon: 'target', route: '/goals', color: '#D95D39' },
      { label: 'Projects', icon: 'briefcase', route: '/projects', color: '#5B5F97' },
      { label: 'Rewards', icon: 'gift', route: '/rewards', color: '#EAB308' },
    ],
  },
  {
    title: 'Tracking',
    items: [
      { label: 'Health', icon: 'heart', route: '/health', color: '#22C55E' },
      { label: 'Trackers', icon: 'chart', route: '/trackers', color: '#F97316' },
      { label: 'Life Tracker', icon: 'sparkle', route: '/life-tracker', color: '#8B5CF6' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Reports', icon: 'barChart', route: '/reports', color: '#10B981' },
      { label: 'Reflections', icon: 'sparkle', route: '/reflections', color: '#6366F1' },
    ],
  },
  {
    title: 'Connections',
    items: [
      { label: 'People', icon: 'users', route: '/people', color: '#3B82F6' },
      { label: 'Places', icon: 'pin', route: '/places', color: '#F43F5E' },
      { label: 'Tags', icon: 'tag', route: '/tags', color: '#8B5CF6' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Ecosystem', icon: 'node', route: '/ecosystem', color: '#06B6D4' },
      { label: 'Settings', icon: 'settings', route: '/settings', color: '#64748B' },
    ],
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const { palette, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <LuxHeader
        overline="More"
        title="Explore"
        subtitle="All features at your fingertips"
        style={styles.header}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>
              {section.title}
            </Text>
            <View style={styles.grid}>
              {section.items.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  activeOpacity={0.7}
                  onPress={() => router.push(item.route as any)}
                >
                  <LuxCard style={styles.card}>
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: `${item.color}${isDark ? '30' : '15'}` },
                      ]}
                    >
                      <InsightIcon name={item.icon} size={22} color={item.color} />
                    </View>
                    <Text style={[styles.cardLabel, { color: palette.text }]}>{item.label}</Text>
                  </LuxCard>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: palette.tint }]}
              onPress={() => router.push('/capture')}
            >
              <InsightIcon name="mic" size={20} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Voice Capture</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#F59E0B' }]}
              onPress={() => router.push('/focus')}
            >
              <InsightIcon name="zap" size={20} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Start Focus</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 70 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 6,
  },
  content: {
    padding: 11,
    paddingTop: 6,
  },
  section: {
    marginBottom: 17,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    width: '31%',
    aspectRatio: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Figtree',
    letterSpacing: -0.2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 11,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
});
