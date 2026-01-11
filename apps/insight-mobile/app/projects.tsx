import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput, FlatList } from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { ProgressRing } from '@/src/components/charts';
import { listProjects, addProject, deleteProject, type Project } from '@/src/storage/projects';
import { listEvents, type MobileEvent } from '@/src/storage/events';
import { loadMultipliers, upsertProjectMultiplier, getProjectMultiplierSync, type MultipliersState } from '@/src/storage/multipliers';

export default function ProjectsScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [multipliers, setMultipliers] = useState<MultipliersState>({ goals: {}, projects: {} });

  useEffect(() => {
    loadData();
    loadMultipliers().then(setMultipliers);
  }, []);

  async function loadData() {
    const [projectsData, eventsData] = await Promise.all([listProjects(), listEvents()]);
    setProjects(projectsData.sort((a, b) => b.createdAt - a.createdAt));
    setEvents(eventsData);
  }

  // Calculate stats per project
  const projectStats = useMemo(() => {
    const stats: Record<string, { sessions: number; minutes: number; activeDays: number }> = {};
    for (const project of projects) {
      const linked = events.filter((e) => e.project === project.name);
      const sessions = linked.length;
      const minutes = linked.reduce((sum, e) => {
        if (e.endAt) return sum + Math.round((e.endAt - e.startAt) / 60000);
        if (e.estimateMinutes) return sum + e.estimateMinutes;
        return sum;
      }, 0);

      // Calculate active days
      const daySet = new Set<string>();
      for (const e of linked) {
        const d = new Date(e.startAt);
        daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      }

      stats[project.id] = { sessions, minutes, activeDays: daySet.size };
    }
    return stats;
  }, [projects, events]);

  async function handleAddProject() {
    if (!newProjectName.trim()) return;
    await addProject(newProjectName.trim());
    setNewProjectName('');
    await loadData();
  }

  async function handleDeleteProject(id: string) {
    await deleteProject(id);
    await loadData();
  }

  const updateMultiplier = async (projectName: string, value: number) => {
    await upsertProjectMultiplier(projectName, value);
    const next = await loadMultipliers();
    setMultipliers(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Projects</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: palette.surface,
              color: palette.text,
              borderColor: palette.border
            }
          ]}
          placeholder="Enter a new project..."
          placeholderTextColor={palette.textSecondary}
          value={newProjectName}
          onChangeText={setNewProjectName}
          onSubmitEditing={handleAddProject}
        />
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: palette.tint }]} 
          onPress={handleAddProject}
        >
          <InsightIcon name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={[styles.card, { backgroundColor: palette.surface }]}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No active projects yet. Group your tasks into projects to stay organized.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const stats = projectStats[item.id] ?? { sessions: 0, minutes: 0, activeDays: 0 };
          const formatMins = (m: number) => (m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`);
          const statusColor = item.status === 'active' ? '#7BAF7B' : palette.textSecondary;
          return (
            <TouchableOpacity
              style={[styles.projectItem, { backgroundColor: palette.surface }]}
              onPress={() => router.push(`/project/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.projectLeft}>
                <ProgressRing
                  progress={Math.min(stats.activeDays / 14, 1)}
                  size={48}
                  strokeWidth={5}
                  color={statusColor}
                />
                <Text style={[styles.daysText, { color: palette.text }]}>{stats.activeDays}</Text>
              </View>
              <View style={styles.projectInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.projectName, { color: palette.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {item.status === 'active' ? 'Active' : 'Done'}
                    </Text>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <Text style={[styles.statText, { color: palette.textSecondary }]}>
                    {stats.sessions} sessions
                  </Text>
                  <Text style={[styles.statDot, { color: palette.textSecondary }]}>·</Text>
                  <Text style={[styles.statText, { color: palette.textSecondary }]}>
                    {formatMins(stats.minutes)}
                  </Text>
                </View>
                <View style={styles.multiplierRow}>
                  <Text style={[styles.multiplierLabel, { color: palette.textSecondary }]}>Multiplier</Text>
                  <Text style={[styles.multiplierValue, { color: palette.tint }]}>
                    {getProjectMultiplierSync(item.name, multipliers).toFixed(2)}x
                  </Text>
                </View>
                <Slider
                  minimumValue={0.1}
                  maximumValue={3}
                  step={0.1}
                  value={getProjectMultiplierSync(item.name, multipliers)}
                  onValueChange={(value) => void updateMultiplier(item.name, value)}
                  minimumTrackTintColor={palette.tint}
                  maximumTrackTintColor={palette.border}
                  thumbTintColor={palette.tint}
                />
              </View>
              <View style={styles.projectRight}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(item.id);
                  }}
                  style={styles.deleteButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <InsightIcon name="plus" size={18} color={palette.border} />
                </TouchableOpacity>
                <InsightIcon name="chevronRight" size={20} color={palette.textSecondary} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
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
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Figtree',
    borderWidth: 1,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Figtree',
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    gap: 12,
  },
  projectLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  daysText: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  projectInfo: {
    flex: 1,
  },
  projectRight: {
    alignItems: 'center',
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  projectName: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Figtree',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  statDot: {
    fontSize: 12,
  },
  multiplierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  multiplierLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  multiplierValue: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  deleteButton: {
    padding: 4,
    transform: [{ rotate: '45deg' }],
  },
});
