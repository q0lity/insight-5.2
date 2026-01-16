import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/state/theme';
import { RadarChart, type RadarDataPoint } from '@/src/components/charts/RadarChart';
import type { TrackerLogEntry } from '@/src/storage/trackers';

const TRACKER_CATEGORIES: Record<string, string[]> = {
  mood: ['mood', 'happy', 'sad', 'anxious', 'anxiety', 'depressed', 'joy', 'calm'],
  energy: ['energy', 'tired', 'fatigue', 'sleep', 'exhausted', 'alert', 'awake'],
  pain: ['pain', 'headache', 'backpain', 'soreness', 'ache', 'cramp', 'migraine'],
  stress: ['stress', 'overwhelmed', 'pressure', 'tense', 'worried', 'nervous'],
};

const CATEGORY_COLORS: Record<string, string> = {
  mood: '#8B7EC8',
  energy: '#7BAF7B',
  pain: '#C97B7B',
  stress: '#D4A574',
  other: '#6B8CAE',
};

const CATEGORY_LABELS: Record<string, string> = {
  mood: 'Mood',
  energy: 'Energy',
  pain: 'Pain',
  stress: 'Stress',
  other: 'Other',
};

function categorizeTracker(key: string): string {
  const lower = key.toLowerCase();
  for (const [cat, keywords] of Object.entries(TRACKER_CATEGORIES)) {
    if (keywords.some((k) => lower.includes(k))) return cat;
  }
  return 'other';
}

type TrackerRadarProps = {
  logs: TrackerLogEntry[];
  size?: number;
};

export function TrackerRadar({ logs, size = 180 }: TrackerRadarProps) {
  const { palette } = useTheme();

  const { radarData, totals } = useMemo(() => {
    const totalsByCat: Record<string, { sum: number; count: number }> = {};
    Object.keys(TRACKER_CATEGORIES).forEach((cat) => {
      totalsByCat[cat] = { sum: 0, count: 0 };
    });
    totalsByCat.other = { sum: 0, count: 0 };

    logs.forEach((log) => {
      const cat = categorizeTracker(log.trackerKey);
      const value = log.valueNumber ?? (log.valueBool ? 10 : 0);
      if (!Number.isFinite(value)) return;
      totalsByCat[cat].sum += Number(value);
      totalsByCat[cat].count += 1;
    });

    const data: RadarDataPoint[] = Object.keys(totalsByCat).map((cat) => {
      const avg = totalsByCat[cat].count > 0 ? totalsByCat[cat].sum / totalsByCat[cat].count : 0;
      const normalized = Math.max(0, Math.min(10, avg)) * 10;
      return {
        label: CATEGORY_LABELS[cat] ?? cat,
        shortLabel: CATEGORY_LABELS[cat]?.slice(0, 3) ?? cat.slice(0, 3),
        value: Math.round(normalized),
      };
    });

    const totalCount = logs.length;
    return { radarData: data, totals: totalCount };
  }, [logs]);

  if (!totals) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
          Log a few feelings to build your radar.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RadarChart data={radarData} size={size} color={palette.tint} showLabels />
      <View style={styles.legendRow}>
        {radarData.map((entry) => (
          <View key={entry.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[entry.label.toLowerCase()] ?? palette.tint }]} />
            <Text style={[styles.legendText, { color: palette.textSecondary }]}>
              {entry.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  legendRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  empty: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
