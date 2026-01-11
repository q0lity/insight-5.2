import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon, type InsightIconName } from '@/src/components/InsightIcon';
import { getSupabaseSessionUser } from '@/src/supabase/helpers';
import { listGoals, type Goal } from '@/src/storage/goals';
import { listProjects, type Project } from '@/src/storage/projects';
import { listEvents, type MobileEvent } from '@/src/storage/events';
import {
  loadMultipliers,
  getGoalMultiplierSync,
  getProjectMultiplierSync,
  type MultipliersState,
} from '@/src/storage/multipliers';

type SyncStatus = 'connected' | 'disconnected' | 'syncing' | 'error';

type EntityCount = {
  tags: number;
  people: number;
  contexts: number;
  skills: number;
  categories: number;
};

export default function EcosystemScreen() {
  const router = useRouter();
  const { palette, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [multipliers, setMultipliers] = useState<MultipliersState>({ goals: {}, projects: {} });

  useEffect(() => {
    checkSyncStatus();
    loadData();
  }, []);

  async function loadData() {
    const [goalsData, projectsData, eventsData, multsData] = await Promise.all([
      listGoals(),
      listProjects(),
      listEvents(),
      loadMultipliers(),
    ]);
    setGoals(goalsData);
    setProjects(projectsData);
    setEvents(eventsData);
    setMultipliers(multsData);
  }

  const checkSyncStatus = async () => {
    setSyncStatus('syncing');
    try {
      const session = await getSupabaseSessionUser();
      if (session) {
        setSyncStatus('connected');
        setUserEmail(session.user.email ?? null);
        setLastSyncTime(new Date());
      } else {
        setSyncStatus('disconnected');
        setUserEmail(null);
      }
    } catch {
      setSyncStatus('error');
    }
  };

  // Calculate entity counts from events
  const entityCounts = useMemo((): EntityCount => {
    const tagSet = new Set<string>();
    const peopleSet = new Set<string>();
    const contextSet = new Set<string>();
    const skillSet = new Set<string>();
    const categorySet = new Set<string>();

    for (const e of events) {
      (e.tags ?? []).forEach((t) => tagSet.add(t.startsWith('#') ? t.slice(1) : t));
      (e.people ?? []).forEach((p) => peopleSet.add(p));
      (e.contexts ?? []).forEach((c) => contextSet.add(c));
      (e.skills ?? []).forEach((s) => skillSet.add(s));
      if (e.category) categorySet.add(e.category);
    }

    return {
      tags: tagSet.size,
      people: peopleSet.size,
      contexts: contextSet.size,
      skills: skillSet.size,
      categories: categorySet.size,
    };
  }, [events]);

  // Stats per goal
  const goalStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const g of goals) {
      stats[g.id] = events.filter((e) => e.goal === g.name).length;
    }
    return stats;
  }, [goals, events]);

  // Stats per project
  const projectStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const p of projects) {
      stats[p.id] = events.filter((e) => e.project === p.name).length;
    }
    return stats;
  }, [projects, events]);

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'connected':
        return '#10B981';
      case 'disconnected':
        return palette.textSecondary;
      case 'syncing':
        return '#F59E0B';
      case 'error':
        return '#EF4444';
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Not Connected';
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Connection Error';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Ecosystem</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Sync Status Section */}
        <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Sync Status</Text>
            <InsightIcon name="node" size={16} color={palette.tint} />
          </View>

          <View style={styles.syncStatusRow}>
            <View style={styles.syncInfo}>
              <View style={styles.syncIndicator}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                <Text style={[styles.statusText, { color: palette.text }]}>{getStatusText()}</Text>
              </View>
              {userEmail && (
                <Text style={[styles.syncEmail, { color: palette.textSecondary }]}>{userEmail}</Text>
              )}
              {lastSyncTime && syncStatus === 'connected' && (
                <Text style={[styles.syncTime, { color: palette.textSecondary }]}>
                  Last synced {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
            {syncStatus === 'syncing' ? (
              <ActivityIndicator size="small" color={palette.tint} />
            ) : (
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: palette.tint }]}
                onPress={checkSyncStatus}
              >
                <Text style={styles.syncButtonText}>
                  {syncStatus === 'disconnected' ? 'Connect' : 'Sync Now'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {syncStatus === 'disconnected' && (
            <TouchableOpacity
              style={[
                styles.loginPrompt,
                { backgroundColor: isDark ? 'rgba(217,93,57,0.1)' : 'rgba(217,93,57,0.08)' },
              ]}
              onPress={() => router.push('/auth')}
            >
              <InsightIcon name="lock" size={18} color={palette.tint} />
              <Text style={[styles.loginPromptText, { color: palette.tint }]}>
                Sign in to sync your data across devices
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Goals Section */}
        <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <InsightIcon name="target" size={18} color={palette.tint} />
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Goals</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/goals')}>
              <Text style={[styles.editLink, { color: palette.tint }]}>Manage</Text>
            </TouchableOpacity>
          </View>

          {goals.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No goals defined yet
            </Text>
          ) : (
            <View style={styles.itemList}>
              {goals.slice(0, 5).map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.itemRow}
                  onPress={() => router.push(`/goal/${goal.id}`)}
                >
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: palette.text }]}>{goal.name}</Text>
                    <Text style={[styles.itemMeta, { color: palette.textSecondary }]}>
                      {goalStats[goal.id] ?? 0} sessions · {getGoalMultiplierSync(goal.name, multipliers).toFixed(1)}x
                    </Text>
                  </View>
                  <InsightIcon name="chevronRight" size={18} color={palette.textSecondary} />
                </TouchableOpacity>
              ))}
              {goals.length > 5 && (
                <Text style={[styles.moreText, { color: palette.textSecondary }]}>
                  +{goals.length - 5} more goals
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.addButton, { borderColor: palette.tint }]}
            onPress={() => router.push('/goals')}
          >
            <InsightIcon name="plus" size={16} color={palette.tint} />
            <Text style={[styles.addButtonText, { color: palette.tint }]}>Add Goal</Text>
          </TouchableOpacity>
        </View>

        {/* Projects Section */}
        <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <InsightIcon name="briefcase" size={18} color={palette.tint} />
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Projects</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/projects')}>
              <Text style={[styles.editLink, { color: palette.tint }]}>Manage</Text>
            </TouchableOpacity>
          </View>

          {projects.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No projects defined yet
            </Text>
          ) : (
            <View style={styles.itemList}>
              {projects.slice(0, 5).map((project) => {
                const statusColor = project.status === 'active' ? '#7BAF7B' : palette.textSecondary;
                return (
                  <TouchableOpacity
                    key={project.id}
                    style={styles.itemRow}
                    onPress={() => router.push(`/project/${project.id}`)}
                  >
                    <View style={styles.itemInfo}>
                      <View style={styles.itemNameRow}>
                        <Text style={[styles.itemName, { color: palette.text }]}>{project.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                          <View style={[styles.statusDotSmall, { backgroundColor: statusColor }]} />
                        </View>
                      </View>
                      <Text style={[styles.itemMeta, { color: palette.textSecondary }]}>
                        {projectStats[project.id] ?? 0} sessions · {getProjectMultiplierSync(project.name, multipliers).toFixed(1)}x
                      </Text>
                    </View>
                    <InsightIcon name="chevronRight" size={18} color={palette.textSecondary} />
                  </TouchableOpacity>
                );
              })}
              {projects.length > 5 && (
                <Text style={[styles.moreText, { color: palette.textSecondary }]}>
                  +{projects.length - 5} more projects
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.addButton, { borderColor: palette.tint }]}
            onPress={() => router.push('/projects')}
          >
            <InsightIcon name="plus" size={16} color={palette.tint} />
            <Text style={[styles.addButtonText, { color: palette.tint }]}>Add Project</Text>
          </TouchableOpacity>
        </View>

        {/* Entities Overview */}
        <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <InsightIcon name="tag" size={18} color={palette.tint} />
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Entities</Text>
            </View>
          </View>

          <View style={styles.entitiesGrid}>
            <TouchableOpacity
              style={[styles.entityCard, { backgroundColor: palette.borderLight }]}
              onPress={() => router.push('/tags')}
            >
              <Text style={[styles.entityCount, { color: palette.text }]}>{entityCounts.tags}</Text>
              <Text style={[styles.entityLabel, { color: palette.textSecondary }]}>Tags</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.entityCard, { backgroundColor: palette.borderLight }]}
              onPress={() => router.push('/tags')}
            >
              <Text style={[styles.entityCount, { color: palette.text }]}>{entityCounts.people}</Text>
              <Text style={[styles.entityLabel, { color: palette.textSecondary }]}>People</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.entityCard, { backgroundColor: palette.borderLight }]}
              onPress={() => router.push('/tags')}
            >
              <Text style={[styles.entityCount, { color: palette.text }]}>{entityCounts.contexts}</Text>
              <Text style={[styles.entityLabel, { color: palette.textSecondary }]}>Contexts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.entityCard, { backgroundColor: palette.borderLight }]}
              onPress={() => router.push('/tags')}
            >
              <Text style={[styles.entityCount, { color: palette.text }]}>{entityCounts.skills}</Text>
              <Text style={[styles.entityLabel, { color: palette.textSecondary }]}>Skills</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Links */}
        <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <InsightIcon name="sparkle" size={18} color={palette.tint} />
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Quick Links</Text>
            </View>
          </View>

          <QuickLinkRow
            name="Planner"
            description="Day, week, and month views"
            icon="calendar"
            palette={palette}
            onPress={() => router.push('/planner')}
          />
          <QuickLinkRow
            name="Reports"
            description="Analytics and insights"
            icon="chart"
            palette={palette}
            onPress={() => router.push('/reports')}
          />
          <QuickLinkRow
            name="Rewards"
            description="XP, streaks, and achievements"
            icon="smile"
            palette={palette}
            onPress={() => router.push('/rewards')}
          />
        </View>

        {/* Data & Privacy Section */}
        <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Data & Privacy</Text>

          <TouchableOpacity style={styles.actionRow}>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionName, { color: palette.text }]}>Export All Data</Text>
              <Text style={[styles.actionDesc, { color: palette.textSecondary }]}>Download as JSON</Text>
            </View>
            <InsightIcon name="file" size={20} color={palette.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow}>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionName, { color: palette.text }]}>Import Data</Text>
              <Text style={[styles.actionDesc, { color: palette.textSecondary }]}>From backup file</Text>
            </View>
            <InsightIcon name="file" size={20} color={palette.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]}>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionName, { color: '#EF4444' }]}>Delete Account</Text>
              <Text style={[styles.actionDesc, { color: palette.textSecondary }]}>
                Permanently remove all data
              </Text>
            </View>
            <InsightIcon name="dots" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.footer, { color: palette.textSecondary }]}>
          Your data is stored securely and never shared with third parties.
        </Text>
      </ScrollView>
    </View>
  );
}

function QuickLinkRow({
  name,
  description,
  icon,
  palette,
  onPress,
}: {
  name: string;
  description: string;
  icon: InsightIconName;
  palette: ReturnType<typeof useTheme>['palette'];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickLinkRow} onPress={onPress}>
      <View style={[styles.quickLinkIcon, { backgroundColor: palette.borderLight }]}>
        <InsightIcon name={icon} size={20} color={palette.tint} />
      </View>
      <View style={styles.quickLinkInfo}>
        <Text style={[styles.quickLinkName, { color: palette.text }]}>{name}</Text>
        <Text style={[styles.quickLinkDesc, { color: palette.textSecondary }]}>{description}</Text>
      </View>
      <InsightIcon name="chevronRight" size={18} color={palette.textSecondary} />
    </TouchableOpacity>
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
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 60,
  },
  section: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  editLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncInfo: {
    flex: 1,
    gap: 4,
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  syncEmail: {
    fontSize: 13,
    fontWeight: '500',
  },
  syncTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  syncButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  loginPromptText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Figtree',
  },
  itemList: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  itemMeta: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Figtree',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
    fontStyle: 'italic',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  entitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  entityCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
  },
  entityCount: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -1,
  },
  entityLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  quickLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkInfo: {
    flex: 1,
  },
  quickLinkName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  quickLinkDesc: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  actionInfo: {
    gap: 2,
  },
  actionName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  actionDesc: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
