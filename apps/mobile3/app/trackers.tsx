import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { deleteTrackerLog, listTrackerLogs, updateTrackerLog, type TrackerLogEntry } from '@/src/storage/trackers';

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

export default function TrackersScreen() {
  const router = useRouter();
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [logs, setLogs] = useState<TrackerLogEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const refreshLogs = async () => {
    const now = Date.now();
    const startAt =
      range === '7d' ? now - 7 * 24 * 60 * 60 * 1000 : range === '30d' ? now - 30 * 24 * 60 * 60 * 1000 : null;
    const rows = await listTrackerLogs({ startAt: startAt ?? undefined, limit: 500, entryId: entryId ?? null });
    setLogs(rows);
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
  }, [range, entryId]);

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
    await updateTrackerLog(log.id, { value: nextValue, rawToken: `#${log.trackerKey}(${trimmed})` });
    await refreshLogs();
    cancelEdit();
  };

  const confirmDelete = (log: TrackerLogEntry) => {
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
  };

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
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Trackers</Text>
        <View style={{ width: 40 }} />
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
        <View style={styles.statsOverview}>
          <View
            style={[
              styles.overviewCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}>
            <Text style={[styles.overviewLabel, { color: palette.textSecondary }]}>TOTAL LOGS</Text>
            <Text style={[styles.overviewValue, { color: palette.text }]}>{summary.total}</Text>
          </View>
          <View
            style={[
              styles.overviewCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}>
            <Text style={[styles.overviewLabel, { color: palette.textSecondary }]}>TRACKERS</Text>
            <Text style={[styles.overviewValue, { color: palette.text }]}>{summary.unique}</Text>
          </View>
        </View>

        {summary.topLabel ? (
          <View
            style={[
              styles.highlightCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}>
            <Text style={[styles.highlightLabel, { color: palette.textSecondary }]}>MOST LOGGED</Text>
            <Text style={[styles.highlightValue, { color: palette.text }]}>{summary.topLabel}</Text>
            <Text style={[styles.highlightMeta, { color: palette.tint }]}>{summary.topCount} entries</Text>
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Timeline</Text>
        <View
          style={[
            styles.timelineCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          {grouped.length === 0 ? (
            <View style={styles.emptyState}>
              <InsightIcon name="sparkle" size={32} color={palette.textSecondary} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No tracker logs yet.</Text>
            </View>
          ) : (
            grouped.map((group, idx) => (
              <View key={group.key} style={[styles.group, idx === grouped.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={[styles.groupLabel, { color: palette.textSecondary }]}>{group.label}</Text>
                {group.logs.map((log) => (
                  <View key={log.id} style={styles.logItem}>
                    <Pressable
                      style={styles.logRow}
                      onPress={() => startEdit(log)}
                      onLongPress={() => confirmDelete(log)}>
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
                    {editingId === log.id ? (
                      <View style={styles.logEditRow}>
                        <TextInput
                          value={editingValue}
                          onChangeText={setEditingValue}
                          placeholder="New value"
                          placeholderTextColor={palette.textSecondary}
                          style={[
                            styles.logEditInput,
                            {
                              color: palette.text,
                              backgroundColor: palette.surface,
                              borderColor: palette.border,
                            },
                          ]}
                        />
                        <TouchableOpacity style={[styles.logEditButton, { backgroundColor: palette.tint }]} onPress={() => void saveEdit(log)}>
                          <Text style={styles.logEditButtonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.logEditButton, styles.logEditButtonGhost]} onPress={cancelEdit}>
                          <Text style={[styles.logEditButtonText, { color: palette.text }]}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ))}
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
  highlightCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 4,
  },
  highlightLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  highlightValue: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Figtree',
  },
  highlightMeta: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  timelineCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  group: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.08)',
    padding: 20,
    gap: 12,
  },
  logItem: {
    gap: 8,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  logEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logEditInput: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontFamily: 'Figtree',
  },
  logEditButton: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logEditButtonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  logEditButtonText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
  logLeft: {
    gap: 2,
  },
  logTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  logMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  logPill: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logValue: {
    fontSize: 13,
    fontWeight: '800',
  },
});
