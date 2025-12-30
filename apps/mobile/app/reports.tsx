import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { InsightIcon, type InsightIconName } from '@/src/components/InsightIcon';
import { listEvents, type MobileEvent } from '@/src/storage/events';

type ReportRow = {
  key: string;
  label: string;
  minutes: number;
  points: number;
  count: number;
};

function formatMinutes(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function ReportsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    listEvents().then(setEvents);
  }, []);

  const metrics = useMemo(() => {
    const now = Date.now();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : null;
    const startAt = days ? now - days * 24 * 60 * 60 * 1000 : null;

    let totalMinutes = 0;
    let totalPoints = 0;
    
    const byCategory = new Map<string, ReportRow>();

    events.forEach(e => {
      if (startAt != null && e.startAt < startAt) return;
      const mins = e.endAt ? Math.round((e.endAt - e.startAt) / 60000) : (e.estimateMinutes ?? 0);
      const pts = e.points ?? 0;
      
      totalMinutes += mins;
      totalPoints += pts;

      const cat = e.category || 'Uncategorized';
      const existing = byCategory.get(cat) || { key: cat, label: cat, minutes: 0, points: 0, count: 0 };
      existing.minutes += mins;
      existing.points += pts;
      existing.count += 1;
      byCategory.set(cat, existing);
    });

    return {
      totalMinutes,
      totalPoints,
      byCategory: Array.from(byCategory.values()).sort((a, b) => b.points - a.points),
    };
  }, [events, range]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.rangeContainer}>
        <View style={[styles.rangeRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          {['7d', '30d', 'all'].map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r as any)}
              style={[
                styles.rangeBtn,
                r === range && { backgroundColor: isDark ? '#141a2a' : '#FFFFFF' },
                r === range && styles.activeShadow,
              ]}>
              <Text style={[styles.rangeText, { color: r === range ? palette.text : palette.tabIconDefault }]}>{r.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statsOverview}>
          <View style={[styles.overviewCard, { backgroundColor: isDark ? '#141a2a' : '#FFFFFF', borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)' }]}>
            <Text style={[styles.overviewLabel, { color: palette.tabIconDefault }]}>TOTAL TIME</Text>
            <Text style={[styles.overviewValue, { color: palette.text }]}>{formatMinutes(metrics.totalMinutes)}</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: isDark ? '#141a2a' : '#FFFFFF', borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)' }]}>
            <Text style={[styles.overviewLabel, { color: palette.tabIconDefault }]}>TOTAL XP</Text>
            <Text style={[styles.overviewValue, { color: palette.text }]}>{metrics.totalPoints.toFixed(0)}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Categories</Text>
        
        <View style={[styles.listCard, { backgroundColor: isDark ? '#141a2a' : '#FFFFFF', borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)' }]}>
          {metrics.byCategory.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.tabIconDefault }]}>No data for this range.</Text>
          ) : (
            metrics.byCategory.map((row, idx) => (
              <View key={row.key} style={[styles.row, idx === metrics.byCategory.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowLabel, { color: palette.text }]}>{row.label}</Text>
                  <Text style={[styles.rowMeta, { color: palette.tabIconDefault }]}>{row.count} entries</Text>
                </View>
                <View style={styles.rowStats}>
                  <Text style={[styles.rowMinutes, { color: palette.text }]}>{formatMinutes(row.minutes)}</Text>
                  <Text style={[styles.rowPoints, { color: palette.tint }]}>{row.points.toFixed(0)} pts</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
  },
  backButton: {
    padding: 8,
  },
  rangeContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  rangeRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rangeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scroll: {
    padding: 20,
    gap: 24,
    paddingBottom: 60,
  },
  statsOverview: {
    flexDirection: 'row',
    gap: 16,
  },
  overviewCard: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 4,
  },
  overviewLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Figtree',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  listCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  rowInfo: {
    gap: 2,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  rowMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  rowStats: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rowMinutes: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  rowPoints: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    padding: 40,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
});
