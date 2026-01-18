import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line, Circle } from 'react-native-svg';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { Screen } from '@/components/Screen';
import { LuxCard } from '@/components/LuxCard';
import {
  createTrackerLog,
  deleteTrackerLog,
  getTrackerHeatmapData,
  getTrackerStats,
  listTrackerLogs,
  type TrackerLogEntry,
} from '@/src/storage/trackers';

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTrackerValue(log: TrackerLogEntry) {
  if (log.valueBool != null) return log.valueBool ? 'Yes' : 'No';
  if (log.valueNumber != null && Number.isFinite(log.valueNumber)) {
    return Number.isInteger(log.valueNumber) ? `${log.valueNumber}` : log.valueNumber.toFixed(1);
  }
  if (log.valueText != null && log.valueText !== '') return log.valueText;
  return '-';
}

function parseValue(raw: string): number | string | boolean {
  const trimmed = raw.trim();
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
  const num = Number(trimmed);
  if (Number.isFinite(num) && trimmed !== '') return num;
  return trimmed;
}

type HeatmapDay = { date: string; value: number; count: number };
type Stats = {
  streak: number;
  totalLogs: number;
  todayLogs: number;
  weekLogs: number;
  lastValue: number | string | boolean | null;
  lastLoggedAt: number | null;
};

function MiniLineChart({ data, width, height, color }: { data: number[]; width: number; height: number; color: string }) {
  if (data.length < 2) return null;

  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;
  const padding = 8;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((val, idx) => ({
    x: padding + (idx / (data.length - 1)) * chartWidth,
    y: padding + chartHeight - ((val - minVal) / range) * chartHeight,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <Svg width={width} height={height}>
      <Path d={pathD} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}
    </Svg>
  );
}

function HeatmapStrip({ data, palette, isDark }: { data: HeatmapDay[]; palette: any; isDark: boolean }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const getColor = (count: number) => {
    if (count === 0) {
      return isDark ? 'rgba(148,163,184,0.08)' : 'rgba(28,28,30,0.04)';
    }
    const intensity = Math.min(1, count / maxCount);
    const minOpacity = isDark ? 0.3 : 0.2;
    const maxOpacity = isDark ? 0.95 : 0.9;
    const opacity = minOpacity + intensity * (maxOpacity - minOpacity);
    return `rgba(217,93,57,${opacity})`;
  };

  return (
    <View style={styles.heatmapContainer}>
      <View style={styles.heatmapRow}>
        {data.map((day, idx) => (
          <View key={idx} style={styles.heatmapCellWrapper}>
            <View style={[styles.heatmapCell, { backgroundColor: getColor(day.count) }]}>
              {day.count > 0 && (
                <Text style={[styles.heatmapCellText, { color: day.count > maxCount * 0.5 ? '#FFFFFF' : palette.textSecondary }]}>
                  {day.count}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
      <View style={styles.heatmapLabels}>
        {data.map((day, idx) => (
          <View key={idx} style={styles.heatmapLabelWrapper}>
            <Text style={[styles.heatmapLabel, { color: palette.textSecondary }]}>
              {new Date(day.date).toLocaleDateString([], { weekday: 'narrow' })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function TrackerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trackerKey = decodeURIComponent(id ?? '');
  const { palette, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [logs, setLogs] = useState<TrackerLogEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [newValue, setNewValue] = useState('');

  const refreshData = async () => {
    if (!trackerKey) return;
    const [logsData, statsData, heatmap] = await Promise.all([
      listTrackerLogs({ trackerKey, limit: 50 }),
      getTrackerStats(trackerKey),
      getTrackerHeatmapData(trackerKey, 7),
    ]);
    setLogs(logsData);
    setStats(statsData);
    setHeatmapData(heatmap);
  };

  useEffect(() => {
    refreshData();
  }, [trackerKey]);

  const handleQuickLog = async () => {
    const value = newValue.trim();
    if (!value || !trackerKey) return;
    await createTrackerLog({
      trackerKey,
      value: parseValue(value),
    });
    setNewValue('');
    await refreshData();
  };

  const confirmDelete = (log: TrackerLogEntry) => {
    Alert.alert('Delete log?', `${formatTrackerValue(log)} at ${formatTime(log.occurredAt)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTrackerLog(log.id);
          await refreshData();
        },
      },
    ]);
  };

  const chartData = useMemo(() => {
    return logs
      .filter((l) => l.valueNumber != null)
      .slice(0, 14)
      .reverse()
      .map((l) => l.valueNumber ?? 0);
  }, [logs]);

  const trackerLabel = logs[0]?.trackerLabel ?? trackerKey;

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]} numberOfLines={1}>
          {trackerLabel}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Quick Log */}
        <LuxCard style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>Log Value</Text>
          <View style={styles.quickLogRow}>
            <TextInput
              value={newValue}
              onChangeText={setNewValue}
              placeholder="Enter value..."
              placeholderTextColor={palette.textSecondary}
              keyboardType="numeric"
              style={[styles.input, { color: palette.text, backgroundColor: palette.background, borderColor: palette.border }]}
            />
            <TouchableOpacity style={[styles.logButton, { backgroundColor: palette.tint }]} onPress={handleQuickLog}>
              <InsightIcon name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LuxCard>

        {/* Stats Grid */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.statLabel, { color: palette.textSecondary }]}>STREAK</Text>
              <Text style={[styles.statValue, { color: palette.tint }]}>{stats.streak}</Text>
              <Text style={[styles.statUnit, { color: palette.textSecondary }]}>days</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.statLabel, { color: palette.textSecondary }]}>TODAY</Text>
              <Text style={[styles.statValue, { color: palette.text }]}>{stats.todayLogs}</Text>
              <Text style={[styles.statUnit, { color: palette.textSecondary }]}>logs</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.statLabel, { color: palette.textSecondary }]}>THIS WEEK</Text>
              <Text style={[styles.statValue, { color: palette.text }]}>{stats.weekLogs}</Text>
              <Text style={[styles.statUnit, { color: palette.textSecondary }]}>logs</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.statLabel, { color: palette.textSecondary }]}>TOTAL</Text>
              <Text style={[styles.statValue, { color: palette.text }]}>{stats.totalLogs}</Text>
              <Text style={[styles.statUnit, { color: palette.textSecondary }]}>all time</Text>
            </View>
          </View>
        )}

        {/* 7-Day Heatmap */}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>7-Day Heatmap</Text>
        <LuxCard style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          {heatmapData.length > 0 ? (
            <HeatmapStrip data={heatmapData} palette={palette} isDark={isDark} />
          ) : (
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No data yet</Text>
          )}
        </LuxCard>

        {/* Trend Chart */}
        {chartData.length >= 2 && (
          <>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Trend</Text>
            <LuxCard style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <MiniLineChart data={chartData} width={300} height={120} color={palette.tint} />
            </LuxCard>
          </>
        )}

        {/* Recent Values */}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent Values</Text>
        <LuxCard style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <InsightIcon name="sparkle" size={32} color={palette.textSecondary} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No logs yet</Text>
            </View>
          ) : (
            logs.slice(0, 10).map((log, idx) => (
              <TouchableOpacity
                key={log.id}
                style={[styles.logRow, idx < Math.min(logs.length, 10) - 1 && styles.logRowBorder]}
                onLongPress={() => confirmDelete(log)}>
                <View style={styles.logLeft}>
                  <Text style={[styles.logDate, { color: palette.text }]}>{formatDate(log.occurredAt)}</Text>
                  <Text style={[styles.logTime, { color: palette.textSecondary }]}>{formatTime(log.occurredAt)}</Text>
                </View>
                <View style={[styles.logValuePill, { backgroundColor: palette.tintLight }]}>
                  <Text style={[styles.logValueText, { color: palette.tint }]}>
                    {formatTrackerValue(log)}{log.unit ? ` ${log.unit}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </LuxCard>
      </ScrollView>
    </Screen>
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
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.5,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 6,
  },
  scroll: {
    padding: 14,
    gap: 14,
    paddingBottom: 42,
  },
  card: {
    borderRadius: 17,
    borderWidth: 1,
    padding: 14,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 8,
  },
  quickLogRow: {
    flexDirection: 'row',
    gap: 6,
  },
  input: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    fontSize: 11,
  },
  logButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    width: '47%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 4,
  },
  statUnit: {
    fontSize: 8,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  heatmapContainer: {
    gap: 6,
  },
  heatmapRow: {
    flexDirection: 'row',
    gap: 4,
  },
  heatmapCellWrapper: {
    flex: 1,
  },
  heatmapCell: {
    aspectRatio: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapCellText: {
    fontSize: 8,
    fontWeight: '800',
  },
  heatmapLabels: {
    flexDirection: 'row',
    gap: 4,
  },
  heatmapLabelWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  heatmapLabel: {
    fontSize: 8,
    fontWeight: '700',
  },
  emptyState: {
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  logRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.08)',
  },
  logLeft: {
    gap: 2,
  },
  logDate: {
    fontSize: 10,
    fontWeight: '700',
  },
  logTime: {
    fontSize: 8,
    fontWeight: '600',
  },
  logValuePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 11,
  },
  logValueText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
