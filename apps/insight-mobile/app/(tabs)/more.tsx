import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon, type InsightIconName } from '@/src/components/InsightIcon';

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
      { label: 'Capture', icon: 'mic', route: '/capture', color: '#D95D39' },
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
      { label: 'Assistant', icon: 'sparkle', route: '/assistant', color: '#22C55E' },
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
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: palette.text }]}>More</Text>
        <Text style={[styles.headerSubtitle, { color: palette.textSecondary }]}>
          All features at your fingertips
        </Text>
      </View>

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
                  style={[
                    styles.card,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                  onPress={() => router.push(item.route as any)}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${item.color}${isDark ? '30' : '15'}` },
                    ]}
                  >
                    <InsightIcon name={item.icon} size={22} color={item.color} />
                  </View>
                  <Text style={[styles.cardLabel, { color: palette.text }]}>{item.label}</Text>
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
              <Text style={styles.quickActionText}>Capture</Text>
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

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Figtree',
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '31%',
    aspectRatio: 1,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree',
    letterSpacing: -0.2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
});
