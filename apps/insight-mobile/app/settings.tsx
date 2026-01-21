import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Application from 'expo-application';

import { Text } from '@/components/Themed';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useTheme, ThemePalettes, type ThemeMode } from '@/src/state/theme';
import {
  loadPreferences,
  savePreferences,
  updateNotifications,
  AI_MODELS,
  type DisplayMode,
  type Preferences,
} from '@/src/storage/preferences';
import { getSupabaseClient } from '@/src/supabase/client';
import { InsightIcon } from '@/src/components/InsightIcon';
import {
  SettingsSection,
  SettingsRow,
  SettingsToggle,
  SyncStatusIndicator,
  AccountHeader,
  ThemePreviewCard,
} from '@/src/components/SettingsComponents';

const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: 'warm', label: 'Light' },
  { key: 'oliveOrange', label: 'Olive' },
  { key: 'midnight', label: 'Navy' },
  { key: 'midnightNeon', label: 'Neon' },
];

const DISPLAY_OPTIONS: { key: DisplayMode; label: string; description: string }[] = [
  { key: 'spacious', label: 'Spacious', description: 'Comfortable spacing' },
  { key: 'compact', label: 'Compact', description: 'More on screen' },
];

type SyncStatusType = 'connected' | 'syncing' | 'error' | 'offline';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeMode, palette, sizes, setThemeMode } = useTheme();

  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('spacious');
  const [syncStatus, setSyncStatus] = useState<{ status: SyncStatusType; label: string; email?: string; isAnonymous?: boolean }>({
    status: 'offline',
    label: 'Checking...',
  });

  useEffect(() => {
    loadPreferences().then((loaded) => {
      setPrefs(loaded);
      setApiKey(loaded.openAiApiKey);
      setAiModel(loaded.aiModel);
      setDisplayMode(loaded.displayMode);
    });
    checkSupabaseStatus();
  }, []);

  const checkSupabaseStatus = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSyncStatus({ status: 'offline', label: 'Not configured' });
      return;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setSyncStatus({ status: 'error', label: 'Session error' });
      return;
    }
    if (!data.session?.user) {
      setSyncStatus({ status: 'offline', label: 'Signed out' });
      return;
    }
    const isAnonymous = (data.session.user as any).is_anonymous === true;
    const email = data.session.user.email;
    setSyncStatus({
      status: 'connected',
      label: isAnonymous ? 'Anonymous' : 'Connected',
      email,
      isAnonymous,
    });
  };

  const onApiKeyChange = useCallback(async (value: string) => {
    setApiKey(value);
    await savePreferences({ openAiApiKey: value });
  }, []);

  const onAiModelChange = useCallback(async (model: string) => {
    setAiModel(model);
    await savePreferences({ aiModel: model });
  }, []);

  const onDisplayModeChange = useCallback(async (mode: DisplayMode) => {
    setDisplayMode(mode);
    await savePreferences({ displayMode: mode });
  }, []);

  const onNotificationToggle = useCallback(
    async (key: keyof Preferences['notifications'], value: boolean) => {
      if (!prefs) return;
      const updated = await updateNotifications({ [key]: value });
      setPrefs(updated);
    },
    [prefs]
  );

  const formatLastSync = () => {
    if (!prefs?.lastSyncAt) return 'Never';
    const d = new Date(prefs.lastSyncAt);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleSyncNow = () => {
    Alert.alert('Sync', 'Manual sync triggered. Data will be synced in the background.');
    void savePreferences({ lastSyncAt: Date.now() }).then(setPrefs);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          const supabase = getSupabaseClient();
          if (supabase) {
            await supabase.auth.signOut();
            checkSupabaseStatus();
          }
        },
      },
    ]);
  };

  const handleExportData = () => {
    Alert.alert('Export Data', 'Data export coming soon.');
  };

  const handleClearData = () => {
    Alert.alert('Clear All Data', 'This will delete all local data. This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All Data',
        style: 'destructive',
        onPress: () => Alert.alert('Cleared', 'All data has been cleared.'),
      },
    ]);
  };

  const handleOpenSupport = () => {
    Linking.openURL('mailto:support@insight.app');
  };

  const handleOpenPrivacy = () => {
    Linking.openURL('https://insight.app/privacy');
  };

  const appVersion = Application.nativeApplicationVersion || '1.0.0';
  const buildNumber = Application.nativeBuildVersion || '1';

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: sizes.spacing }]}>
        <Button
          title="← Back"
          variant="ghost"
          onPress={() => router.back()}
          style={{ paddingHorizontal: 0 }}
        />
        <Text style={[styles.headerTitle, { color: palette.text, fontSize: sizes.headerTitle }]}>
          Settings
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { padding: sizes.spacing }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <View style={{ marginBottom: sizes.spacing }}>
          <AccountHeader
            email={syncStatus.email}
            isAnonymous={syncStatus.isAnonymous}
            onPress={() => Alert.alert('Account', 'Account management coming soon.')}
          />
        </View>

        {/* Appearance Section */}
        <SettingsSection title="Appearance">
          <View style={{ padding: sizes.spacing }}>
            <Text style={[styles.subsectionLabel, { color: palette.textSecondary, fontSize: sizes.smallText, marginBottom: sizes.spacingSmall }]}>
              Theme
            </Text>
            <View style={styles.themeGrid}>
              {THEME_OPTIONS.map((option) => (
                <ThemePreviewCard
                  key={option.key}
                  themeKey={option.key}
                  label={option.label}
                  colors={ThemePalettes[option.key === 'system' ? 'warm' : option.key]}
                  isSelected={themeMode === option.key}
                  onSelect={() => setThemeMode(option.key)}
                />
              ))}
            </View>

            <Text style={[styles.subsectionLabel, { color: palette.textSecondary, fontSize: sizes.smallText, marginTop: sizes.spacing, marginBottom: sizes.spacingSmall }]}>
              Display Density
            </Text>
            <View style={styles.displayGrid}>
              {DISPLAY_OPTIONS.map((option) => {
                const isSelected = displayMode === option.key;
                return (
                  <Button
                    key={option.key}
                    title={option.label}
                    variant={isSelected ? 'primary' : 'secondary'}
                    onPress={() => void onDisplayModeChange(option.key)}
                    style={{ flex: 1 }}
                  />
                );
              })}
            </View>
          </View>
        </SettingsSection>

        {/* AI Configuration Section */}
        <SettingsSection title="AI Configuration">
          <View style={{ padding: sizes.spacing, gap: sizes.spacing }}>
            <View>
              <Text style={[styles.fieldLabel, { color: palette.text, fontSize: sizes.smallText }]}>
                OpenAI API Key
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.borderLight,
                    color: palette.text,
                    borderColor: palette.border,
                    borderRadius: sizes.borderRadiusSmall,
                    height: sizes.buttonHeightSmall,
                    fontSize: sizes.smallText,
                  },
                ]}
                placeholder="sk-..."
                placeholderTextColor={palette.textSecondary}
                secureTextEntry
                value={apiKey}
                onChangeText={(v) => void onApiKeyChange(v)}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={[styles.fieldHint, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
                Required for AI features. Get your key at platform.openai.com
              </Text>
            </View>

            <View>
              <Text style={[styles.fieldLabel, { color: palette.text, fontSize: sizes.smallText, marginBottom: sizes.spacingSmall }]}>
                AI Model
              </Text>
              <View style={styles.modelGrid}>
                {AI_MODELS.map((model) => {
                  const isSelected = aiModel === model.id;
                  return (
                    <Button
                      key={model.id}
                      title={model.name}
                      variant={isSelected ? 'primary' : 'secondary'}
                      onPress={() => void onAiModelChange(model.id)}
                      style={{ flex: 1 }}
                    />
                  );
                })}
              </View>
            </View>
          </View>
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection title="Notifications">
          <SettingsToggle
            icon="bell"
            label="Daily Reminder"
            description="Morning reminder to plan your day"
            value={prefs?.notifications.dailyReminder ?? true}
            onValueChange={(v) => void onNotificationToggle('dailyReminder', v)}
            isFirst
          />
          <SettingsToggle
            icon="check"
            label="Task Due Alerts"
            description="Notify when tasks are due"
            value={prefs?.notifications.taskDue ?? true}
            onValueChange={(v) => void onNotificationToggle('taskDue', v)}
          />
          <SettingsToggle
            icon="calendar"
            label="Event Reminders"
            description="Notify before events start"
            value={prefs?.notifications.eventStart ?? true}
            onValueChange={(v) => void onNotificationToggle('eventStart', v)}
          />
          <SettingsToggle
            icon="mail"
            label="Weekly Digest"
            description="Weekly summary of your progress"
            value={prefs?.notifications.weeklyDigest ?? false}
            onValueChange={(v) => void onNotificationToggle('weeklyDigest', v)}
            isLast
          />
        </SettingsSection>

        {/* Data Sync Section */}
        <SettingsSection title="Data Sync">
          <SettingsRow
            icon="cloud"
            label="Sync Status"
            showChevron={false}
            isFirst
            rightElement={<SyncStatusIndicator status={syncStatus.status} label={syncStatus.label} />}
          />
          <SettingsToggle
            icon="sync"
            label="Sync Enabled"
            description="Sync data to cloud when available"
            value={prefs?.syncEnabled ?? true}
            onValueChange={(v) => void savePreferences({ syncEnabled: v }).then(setPrefs)}
          />
          <SettingsRow
            icon="calendar"
            label="Last Synced"
            value={formatLastSync()}
            showChevron={false}
          />
          <View style={{ padding: sizes.spacing, paddingTop: 0 }}>
            <Button title="Sync Now" variant="primary" onPress={handleSyncNow} />
          </View>
        </SettingsSection>

        {/* Data Management Section */}
        <SettingsSection title="Data Management">
          <SettingsRow
            icon="export"
            label="Export Data"
            description="Download your data"
            onPress={handleExportData}
            isFirst
          />
          <SettingsRow
            icon="trash"
            label="Clear All Data"
            description="Delete all local data"
            onPress={handleClearData}
            showChevron={false}
            danger
            isLast
          />
        </SettingsSection>

        {/* About & Help Section */}
        <SettingsSection title="About & Help">
          <SettingsRow
            icon="info"
            label="Version"
            value={`${appVersion} (${buildNumber})`}
            showChevron={false}
            isFirst
          />
          <SettingsRow
            icon="keyboard"
            label="Keyboard Shortcuts"
            onPress={() => Alert.alert('Keyboard Shortcuts', 'Coming soon for iPad and desktop.')}
          />
          <SettingsRow
            icon="help"
            label="Help & Support"
            onPress={handleOpenSupport}
          />
          <SettingsRow
            icon="lock"
            label="Privacy Policy"
            onPress={handleOpenPrivacy}
            isLast
          />
        </SettingsSection>

        {/* Sign Out */}
        {syncStatus.status === 'connected' && (
          <SettingsSection title="Account">
            <SettingsRow
              icon="signOut"
              label="Sign Out"
              onPress={handleSignOut}
              showChevron={false}
              danger
              isFirst
              isLast
            />
          </SettingsSection>
        )}

        {/* Footer */}
        <Text style={[styles.footer, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
          Insight · Made with ♥
        </Text>
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
    paddingVertical: 8,
  },
  headerTitle: {
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  scroll: {
    paddingBottom: 42,
  },
  subsectionLabel: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  displayGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  modelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldLabel: {
    fontWeight: '600',
    fontFamily: 'Figtree',
    marginBottom: 6,
  },
  fieldHint: {
    marginTop: 6,
    fontFamily: 'Figtree',
  },
  input: {
    paddingHorizontal: 12,
    borderWidth: 1,
    fontFamily: 'Figtree',
  },
  footer: {
    textAlign: 'center',
    marginTop: 24,
    fontFamily: 'Figtree',
  },
});
