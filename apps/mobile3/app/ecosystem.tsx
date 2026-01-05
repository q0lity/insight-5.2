import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon, type InsightIconName } from '@/src/components/InsightIcon';
import { getSupabaseSessionUser } from '@/src/supabase/helpers';

type SyncStatus = 'connected' | 'disconnected' | 'syncing' | 'error';

type CategoryItem = {
  name: string;
  count: number;
  color?: string;
};

export default function EcosystemScreen() {
  const router = useRouter();
  const { palette, sizes, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Sample categories (would come from storage in production)
  const [categories] = useState<CategoryItem[]>([
    { name: 'Work', count: 45, color: '#3B82F6' },
    { name: 'Personal', count: 32, color: '#10B981' },
    { name: 'Health', count: 18, color: '#EF4444' },
    { name: 'Learning', count: 24, color: '#8B5CF6' },
    { name: 'Social', count: 12, color: '#F97316' },
  ]);

  useEffect(() => {
    checkSyncStatus();
  }, []);

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
        <View
          style={[
            styles.section,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}>
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
                onPress={checkSyncStatus}>
                <Text style={styles.syncButtonText}>
                  {syncStatus === 'disconnected' ? 'Connect' : 'Sync Now'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {syncStatus === 'disconnected' && (
            <TouchableOpacity
              style={[styles.loginPrompt, { backgroundColor: isDark ? 'rgba(217,93,57,0.1)' : 'rgba(217,93,57,0.08)' }]}
              onPress={() => router.push('/auth')}>
              <InsightIcon name="lock" size={18} color={palette.tint} />
              <Text style={[styles.loginPromptText, { color: palette.tint }]}>
                Sign in to sync your data across devices
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Categories Section */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Categories</Text>
            <TouchableOpacity>
              <Text style={[styles.editLink, { color: palette.tint }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesList}>
            {categories.map((cat) => (
              <View key={cat.name} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <View style={[styles.categoryDot, { backgroundColor: cat.color ?? palette.tint }]} />
                  <Text style={[styles.categoryName, { color: palette.text }]}>{cat.name}</Text>
                </View>
                <Text style={[styles.categoryCount, { color: palette.textSecondary }]}>{cat.count} events</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={[styles.addButton, { borderColor: palette.tint }]}>
            <InsightIcon name="plus" size={16} color={palette.tint} />
            <Text style={[styles.addButtonText, { color: palette.tint }]}>Add Category</Text>
          </TouchableOpacity>
        </View>

        {/* Integrations Section */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Integrations</Text>
            <InsightIcon name="sparkle" size={16} color={palette.tint} />
          </View>

          <IntegrationRow
            name="Apple Health"
            description="Sync workouts and health data"
            icon="smile"
            connected={false}
            isDark={isDark}
            palette={palette}
          />
          <IntegrationRow
            name="Calendar"
            description="Import calendar events"
            icon="calendar"
            connected={false}
            isDark={isDark}
            palette={palette}
          />
          <IntegrationRow
            name="Reminders"
            description="Sync tasks with Apple Reminders"
            icon="check"
            connected={false}
            isDark={isDark}
            palette={palette}
          />
        </View>

        {/* Data & Privacy Section */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}>
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
              <Text style={[styles.actionDesc, { color: palette.textSecondary }]}>Permanently remove all data</Text>
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

function IntegrationRow({
  name,
  description,
  icon,
  connected,
  isDark,
  palette,
}: {
  name: string;
  description: string;
  icon: InsightIconName;
  connected: boolean;
  isDark: boolean;
  palette: ReturnType<typeof useTheme>['palette'];
}) {
  return (
    <View style={styles.integrationRow}>
      <View style={[styles.integrationIcon, { backgroundColor: palette.borderLight }]}>
        <InsightIcon name={icon} size={20} color={palette.textSecondary} />
      </View>
      <View style={styles.integrationInfo}>
        <Text style={[styles.integrationName, { color: palette.text }]}>{name}</Text>
        <Text style={[styles.integrationDesc, { color: palette.textSecondary }]}>{description}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.connectButton,
          connected
            ? { backgroundColor: 'rgba(16,185,129,0.1)' }
            : { borderColor: palette.tint, borderWidth: 1 },
        ]}>
        <Text style={[styles.connectButtonText, { color: connected ? '#10B981' : palette.tint }]}>
          {connected ? 'Connected' : 'Connect'}
        </Text>
      </TouchableOpacity>
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
  scroll: {
    padding: 20,
    gap: 20,
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
  categoriesList: {
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '500',
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
  integrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  integrationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrationInfo: {
    flex: 1,
  },
  integrationName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  integrationDesc: {
    fontSize: 12,
    fontWeight: '500',
  },
  connectButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  connectButtonText: {
    fontSize: 12,
    fontWeight: '700',
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
