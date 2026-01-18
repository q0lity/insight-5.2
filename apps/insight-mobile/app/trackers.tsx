import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { TrackerHeatMap } from '@/src/components/TrackerHeatMap';
import { TrackerPieChart } from '@/src/components/TrackerPieChart';
import { Screen } from '@/components/Screen';
import {
  createTrackerLog,
  deleteTrackerLog,
  listTrackerLogs,
  listUniqueTrackers,
  updateTrackerLog,
  type TrackerLogEntry,
} from '@/src/storage/trackers';

type TrackerGroup = {
  key: string;
  label: string;
  logs: TrackerLogEntry[];
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(ts: number) {
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

function trackerValueForEdit(log: TrackerLogEntry) {
  if (log.valueBool != null) return log.valueBool ? 'true' : 'false';
  if (log.valueNumber != null && Number.isFinite(log.valueNumber)) return String(log.valueNumber);
  if (log.valueText != null && log.valueText !== '') return log.valueText;
  return '';
}

function parseTrackerValueInput(raw: string): number | string | boolean {
  const trimmed = raw.trim();
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
  const num = Number(trimmed);
  if (Number.isFinite(num) && trimmed !== '') return num;
  return trimmed;
}

type TrackerLogItemProps = {
  log: TrackerLogEntry;
  palette: ReturnType<typeof import('@/src/state/theme').useTheme>['palette'];
  isEditing: boolean;
  editingValue: string;
  onEditingValueChange: (value: string) => void;
  onPress: () => void;
  onLongPress: () => void;
  onSave: () => void;
  onCancel: () => void;
};

const TrackerLogItem = React.memo(function TrackerLogItem({
  log,
  palette,
  isEditing,
  editingValue,
  onEditingValueChange,
  onPress,
  onLongPress,
  onSave,
  onCancel,
}: TrackerLogItemProps) {
  return (
    <View style={styles.logItem}>
      <Pressable
        style={styles.logRow}
        onPress={onPress}
        onLongPress={onLongPress}
      >
        <View style={styles.logLeft}>
          <Text style={[styles.logTitle, { color: palette.text }]}>{log.trackerLabel}</Text>
          <Text style={[styles.logMeta, { color: palette.textSecondary }]}>{formatTime(log.occurredAt)}</Text>
        </View>
        <View style={[styles.logPill, { borderColor: palette.tint }]}>
          <Text style={[styles.logValue, { color: palette.tint }]}>
            {formatTrackerValue(log)}{log.unit ? ` ${log.unit}` : ''}
          </Text>
        </View>
      </Pressable>
      {isEditing ? (
        <View style={styles.logEditRow}>
          <TextInput
            value={editingValue}
            onChangeText={onEditingValueChange}
            placeholder="New value"
            placeholderTextColor={palette.textSecondary}
            style={[styles.logEditInput, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }]}
          />
          <TouchableOpacity style={[styles.logEditButton, { backgroundColor: palette.tint }]} onPress={onSave}>
            <Text style={styles.logEditButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.logEditButton, styles.logEditButtonGhost]} onPress={onCancel}>
            <Text style={[styles.logEditButtonText, { color: palette.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
});

type TrackerGroupProps = {
  group: TrackerGroup;
  palette: ReturnType<typeof import('@/src/state/theme').useTheme>['palette'];
  isLast: boolean;
  editingId: string | null;
  editingValue: string;
  onEditingValueChange: (value: string) => void;
  onLogPress: (log: TrackerLogEntry) => void;
  onLogLongPress: (log: TrackerLogEntry) => void;
  onSaveEdit: (log: TrackerLogEntry) => void;
  onCancelEdit: () => void;
};

const TrackerGroupComponent = React.memo(function TrackerGroupComponent({
  group,
  palette,
  isLast,
  editingId,
  editingValue,
  onEditingValueChange,
  onLogPress,
  onLogLongPress,
  onSaveEdit,
  onCancelEdit,
}: TrackerGroupProps) {
  return (
    <View style={[styles.group, isLast && { borderBottomWidth: 0 }]}>
      <Text style={[styles.groupLabel, { color: palette.textSecondary }]}>{group.label}</Text>
      {group.logs.map((log) => (
        <TrackerLogItem
          key={log.id}
          log={log}
          palette={palette}
          isEditing={editingId === log.id}
          editingValue={editingValue}
          onEditingValueChange={onEditingValueChange}
          onPress={() => onLogPress(log)}
          onLongPress={() => onLogLongPress(log)}
          onSave={() => onSaveEdit(log)}
          onCancel={onCancelEdit}
        />
      ))}
    </View>
  );
});

export default function TrackersScreen() {
  const router = useRouter();
  const { palette, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [range, setRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [logs, setLogs] = useState<TrackerLogEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [quickLogKey, setQuickLogKey] = useState('');
  const [quickLogValue, setQuickLogValue] = useState('');
  const [trackerKeys, setTrackerKeys] = useState<string[]>([]);

  const refreshLogs = async () => {
    const now = Date.now();
    const startAt =
      range === '7d' ? now - 7 * 24 * 60 * 60 * 1000 : range === '30d' ? now - 30 * 24 * 60 * 60 * 1000 : null;
    const rows = await listTrackerLogs({ startAt: startAt ?? undefined, limit: 500 });
    setLogs(rows);
    const keys = await listUniqueTrackers();
    setTrackerKeys(keys);
  };

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!mounted) return;
      await refreshLogs();
    })();
    return () => {
      mounted = false;
    };
  }, [range]);

  const handleQuickLog = async () => {
    const key = quickLogKey.trim();
    const value = quickLogValue.trim();
    if (!key || !value) return;

    await createTrackerLog({
      trackerKey: key,
      value: parseTrackerValueInput(value),
    });
    setQuickLogKey('');
    setQuickLogValue('');
    await refreshLogs();
  };

  const startEdit = (log: TrackerLogEntry) => {
    setEditingId(log.id);
    setEditingValue(trackerValueForEdit(log));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const saveEdit = async (log: TrackerLogEntry) => {
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    const nextValue = parseTrackerValueInput(trimmed);
    await updateTrackerLog(log.id, { value: nextValue });
    await refreshLogs();
    cancelEdit();
  };

  const confirmDelete = useCallback((log: TrackerLogEntry) => {
    Alert.alert('Delete tracker log?', `${log.trackerLabel} ${formatTrackerValue(log)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTrackerLog(log.id);
          await refreshLogs();
          if (editingId === log.id) cancelEdit();
        },
      },
    ]);
  }, [editingId]);

  const handleLogPress = useCallback((log: TrackerLogEntry) => {
    router.push(`/tracker/${encodeURIComponent(log.trackerKey)}`);
  }, [router]);

  const handleSaveEdit = useCallback((log: TrackerLogEntry) => {
    void saveEdit(log);
  }, []);

  const summary = useMemo(() => {
    const unique = new Set<string>();
    const counts = new Map<string, number>();
    logs.forEach((log) => {
      unique.add(log.trackerKey);
      counts.set(log.trackerLabel, (counts.get(log.trackerLabel) ?? 0) + 1);
    });
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return {
      total: logs.length,
      unique: unique.size,
      topLabel: top?.[0] ?? null,
      topCount: top?.[1] ?? 0,
    };
  }, [logs]);

  const grouped = useMemo<TrackerGroup[]>(() => {
    const map = new Map<string, TrackerGroup>();
    logs.forEach((log) => {
      const key = new Date(log.occurredAt).toDateString();
      const entry = map.get(key) ?? {
        key,
        label: formatDateLabel(log.occurredAt),
        logs: [],
      };
      entry.logs.push(log);
      map.set(key, entry);
    });
    return Array.from(map.values());
  }, [logs]);

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Trackers</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.rangeContainer}>
        <View style={[styles.rangeRow, { backgroundColor: palette.borderLight }]}>
          {['7d', '30d', 'all'].map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r as any)}
              style={[
                styles.rangeBtn,
                r === range && { backgroundColor: palette.surface },
                r === range && styles.activeShadow,
              ]}>
              <Text style={[styles.rangeText, { color: r === range ? palette.text : palette.textSecondary }]}>
                {r.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Quick Log Widget */}
        <View style={[styles.quickLogCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.quickLogTitle, { color: palette.text }]}>Quick Log</Text>
          <View style={styles.quickLogRow}>
            <TextInput
              value={quickLogKey}
              onChangeText={setQuickLogKey}
              placeholder="mood, energy..."
              placeholderTextColor={palette.textSecondary}
              style={[styles.quickLogInput, { color: palette.text, backgroundColor: palette.background, borderColor: palette.border }]}
            />
            <TextInput
              value={quickLogValue}
              onChangeText={setQuickLogValue}
              placeholder="7"
              placeholderTextColor={palette.textSecondary}
              keyboardType="numeric"
              style={[styles.quickLogInputSmall, { color: palette.text, backgroundColor: palette.background, borderColor: palette.border }]}
            />
            <TouchableOpacity
              style={[styles.quickLogButton, { backgroundColor: palette.tint }]}
              onPress={handleQuickLog}>
              <InsightIcon name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {trackerKeys.length > 0 && (
            <View style={styles.trackerChips}>
              {trackerKeys.slice(0, 5).map((key) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setQuickLogKey(key)}
                  style={[styles.trackerChip, { backgroundColor: palette.tintLight }]}>
                  <Text style={[styles.trackerChipText, { color: palette.tint }]}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Stats Overview */}
        <View style={styles.statsOverview}>
          <View style={[styles.overviewCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.overviewLabel, { color: palette.textSecondary }]}>TOTAL LOGS</Text>
            <Text style={[styles.overviewValue, { color: palette.text }]}>{summary.total}</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.overviewLabel, { color: palette.textSecondary }]}>TRACKERS</Text>
            <Text style={[styles.overviewValue, { color: palette.text }]}>{summary.unique}</Text>
          </View>
        </View>

        {summary.topLabel ? (
          <View style={[styles.highlightCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.highlightLabel, { color: palette.textSecondary }]}>MOST LOGGED</Text>
            <Text style={[styles.highlightValue, { color: palette.text }]}>{summary.topLabel}</Text>
            <Text style={[styles.highlightMeta, { color: palette.tint }]}>{summary.topCount} entries</Text>
          </View>
        ) : null}

        {/* 7-Day Heatmap */}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>7-Day Overview</Text>
        <View style={[styles.chartCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <TrackerHeatMap logs={logs} days={7} />
        </View>

        {/* Pie Chart by Category */}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>By Category</Text>
        <View style={[styles.chartCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <TrackerPieChart logs={logs} size={120} />
        </View>

        {/* Timeline */}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Timeline</Text>
        <View style={[styles.timelineCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          {grouped.length === 0 ? (
            <View style={styles.emptyState}>
              <InsightIcon name="sparkle" size={32} color={palette.textSecondary} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No tracker logs yet.</Text>
            </View>
          ) : (
            grouped.map((group, idx) => (
              <TrackerGroupComponent
                key={group.key}
                group={group}
                palette={palette}
                isLast={idx === grouped.length - 1}
                editingId={editingId}
                editingValue={editingValue}
                onEditingValueChange={setEditingValue}
                onLogPress={handleLogPress}
                onLogLongPress={confirmDelete}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={cancelEdit}
              />
            ))
          )}
        </View>
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
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  backButton: {
    padding: 6,
  },
  rangeContainer: {
    paddingHorizontal: 14,
    marginBottom: 11,
  },
  rangeRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 8,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 7,
  },
  activeShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rangeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scroll: {
    padding: 14,
    gap: 17,
    paddingBottom: 42,
  },
  quickLogCard: {
    borderRadius: 17,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  quickLogTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  quickLogRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickLogInput: {
    flex: 1,
    height: 31,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    fontSize: 10,
  },
  quickLogInputSmall: {
    width: 42,
    height: 31,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    fontSize: 10,
    textAlign: 'center',
  },
  quickLogButton: {
    width: 31,
    height: 31,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  trackerChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 11,
  },
  trackerChipText: {
    fontSize: 8,
    fontWeight: '700',
  },
  statsOverview: {
    flexDirection: 'row',
    gap: 11,
  },
  overviewCard: {
    flex: 1,
    padding: 14,
    borderRadius: 17,
    borderWidth: 1,
    gap: 4,
  },
  overviewLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  overviewValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  highlightCard: {
    borderRadius: 17,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  highlightLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  highlightValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  highlightMeta: {
    fontSize: 8,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  chartCard: {
    borderRadius: 17,
    borderWidth: 1,
    padding: 14,
  },
  timelineCard: {
    borderRadius: 17,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyState: {
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  group: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.08)',
    padding: 14,
    gap: 8,
  },
  logItem: {
    gap: 6,
  },
  groupLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  logEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logEditInput: {
    flex: 1,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 7,
    fontSize: 9,
  },
  logEditButton: {
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logEditButtonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  logEditButtonText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  logLeft: {
    gap: 2,
  },
  logTitle: {
    fontSize: 10,
    fontWeight: '700',
  },
  logMeta: {
    fontSize: 8,
    fontWeight: '600',
  },
  logPill: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logValue: {
    fontSize: 9,
    fontWeight: '800',
  },
});
