import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { ProgressRing, LineChart, type DataPoint } from '@/src/components/charts';
import { listProjects, type Project } from '@/src/storage/projects';
import { listEvents, type MobileEvent } from '@/src/storage/events';
import {
  loadMultipliers,
  upsertProjectMultiplier,
  getProjectMultiplierSync,
  type MultipliersState,
} from '@/src/storage/multipliers';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(ts);
}

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [project, setProject] = useState<Project | null>(null);
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [multipliers, setMultipliers] = useState<MultipliersState>({ goals: {}, projects: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [projects, allEvents, mults] = await Promise.all([
        listProjects(),
        listEvents(),
        loadMultipliers(),
      ]);

      const found = projects.find((p) => p.id === id);
      setProject(found ?? null);
      setMultipliers(mults);

      if (found) {
        // Filter events linked to this project
        const linked = allEvents.filter((e) => e.project === found.name);
        setEvents(linked.sort((a, b) => b.startAt - a.startAt));
      }
    } finally {
      setLoading(false);
    }
  }

  const updateMultiplier = async (projectName: string, value: number) => {
    await upsertProjectMultiplier(projectName, value);
    const next = await loadMultipliers();
    setMultipliers(next);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalEvents = events.length;
    const totalMinutes = events.reduce((sum, e) => {
      if (e.endAt) return sum + Math.round((e.endAt - e.startAt) / 60000);
      if (e.estimateMinutes) return sum + e.estimateMinutes;
      return sum;
    }, 0);
    const totalPoints = events.reduce((sum, e) => sum + (e.points ?? 0), 0);

    // Active days
    const daySet = new Set<string>();
    for (const e of events) {
      const d = new Date(e.startAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      daySet.add(key);
    }
    const activeDays = daySet.size;

    // Last activity
    const lastActivity = events.length > 0 ? events[0].startAt : null;

    return { totalEvents, totalMinutes, totalPoints, activeDays, lastActivity };
  }, [events]);

  // Timeline data for line chart (last 14 days)
  const timelineData = useMemo((): DataPoint[] => {
    const result: DataPoint[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();

      let dayMinutes = 0;
      for (const e of events) {
        const eDate = new Date(e.startAt);
        if (
          eDate.getFullYear() === year &&
          eDate.getMonth() === month &&
          eDate.getDate() === day
        ) {
          if (e.endAt) {
            dayMinutes += Math.round((e.endAt - e.startAt) / 60000);
          } else if (e.estimateMinutes) {
            dayMinutes += e.estimateMinutes;
          }
        }
      }

      result.push({
        label: formatShortDate(date.getTime()),
        value: dayMinutes,
      });
    }

    return result;
  }, [events]);

  // Project age
  const projectAge = useMemo(() => {
    if (!project) return 0;
    return Math.floor((Date.now() - project.createdAt) / (1000 * 60 * 60 * 24));
  }, [project]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <InsightIcon name="chevronLeft" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Project</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <InsightIcon name="chevronLeft" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Project</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Project not found</Text>
        </View>
      </View>
    );
  }

  const multiplier = getProjectMultiplierSync(project.name, multipliers);
  const statusColor = project.status === 'active' ? '#7BAF7B' : palette.textSecondary;

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]} numberOfLines={1}>
          {project.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Project Info Card */}
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <View style={styles.projectHeader}>
            <Text style={[styles.projectName, { color: palette.text }]}>{project.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {project.status === 'active' ? 'Active' : 'Archived'}
              </Text>
            </View>
          </View>
          <Text style={[styles.projectDate, { color: palette.textSecondary }]}>
            Created {formatDate(project.createdAt)} ({projectAge} days ago)
          </Text>

          <View style={styles.multiplierSection}>
            <View style={styles.multiplierRow}>
              <Text style={[styles.multiplierLabel, { color: palette.textSecondary }]}>XP Multiplier</Text>
              <Text style={[styles.multiplierValue, { color: palette.tint }]}>{multiplier.toFixed(2)}x</Text>
            </View>
            <Slider
              minimumValue={0.1}
              maximumValue={3}
              step={0.1}
              value={multiplier}
              onValueChange={(value) => void updateMultiplier(project.name, value)}
              minimumTrackTintColor={palette.tint}
              maximumTrackTintColor={palette.border}
              thumbTintColor={palette.tint}
            />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <ProgressRing
              progress={Math.min(stats.activeDays / 30, 1)}
              size={56}
              strokeWidth={6}
              color={palette.tint}
            />
            <Text style={[styles.statValue, { color: palette.text }]}>{stats.activeDays}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Active Days</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <Text style={[styles.statBigValue, { color: palette.text }]}>{stats.totalEvents}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Sessions</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <Text style={[styles.statBigValue, { color: palette.text }]}>
              {formatDuration(stats.totalMinutes)}
            </Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Total Time</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <Text style={[styles.statBigValue, { color: palette.tint }]}>{stats.totalPoints}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>XP Earned</Text>
          </View>
        </View>

        {/* Timeline Chart */}
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Activity Timeline</Text>
          <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
            Minutes per day (last 14 days)
          </Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={timelineData}
              height={140}
              color={palette.tint}
              showPoints={true}
              showLabels={false}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent Sessions</Text>
          {events.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No sessions linked to this project yet
            </Text>
          ) : (
            <View style={styles.eventsList}>
              {events.slice(0, 10).map((event, index) => (
                <View key={event.id} style={styles.timelineItem}>
                  <View style={styles.timelineLine}>
                    <View style={[styles.timelineDot, { backgroundColor: palette.tint }]} />
                    {index < Math.min(events.length - 1, 9) && (
                      <View style={[styles.timelineConnector, { backgroundColor: palette.border }]} />
                    )}
                  </View>
                  <View style={styles.eventContent}>
                    <Text style={[styles.eventTitle, { color: palette.text }]} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <View style={styles.eventMeta}>
                      <Text style={[styles.eventTime, { color: palette.textSecondary }]}>
                        {formatRelativeTime(event.startAt)}
                      </Text>
                      {event.endAt && (
                        <Text style={[styles.eventDuration, { color: palette.textSecondary }]}>
                          {formatDuration(Math.round((event.endAt - event.startAt) / 60000))}
                        </Text>
                      )}
                      {(event.points ?? 0) > 0 && (
                        <Text style={[styles.eventPoints, { color: palette.tint }]}>
                          +{event.points} XP
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
              {events.length > 10 && (
                <Text style={[styles.moreText, { color: palette.textSecondary }]}>
                  +{events.length - 10} more sessions
                </Text>
              )}
            </View>
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
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'Figtree',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  projectName: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  projectDate: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  multiplierSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.16)',
  },
  multiplierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  multiplierLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  multiplierValue: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
    position: 'absolute',
    top: 37,
  },
  statBigValue: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Figtree',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Figtree',
    marginBottom: 16,
  },
  chartContainer: {
    marginHorizontal: -8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Figtree',
    textAlign: 'center',
    paddingVertical: 20,
  },
  eventsList: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLine: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  eventContent: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 16,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree',
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  eventDuration: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  eventPoints: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  moreText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    marginLeft: 32,
  },
});
