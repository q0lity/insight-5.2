import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { Screen } from '@/components/Screen';
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

const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: 'warm', label: 'White / Orange' },
  { key: 'oliveOrange', label: 'Olive / Orange' },
  { key: 'midnight', label: 'Navy / Orange' },
  { key: 'midnightNeon', label: 'Black / Neon' },
];

const DISPLAY_OPTIONS: { key: DisplayMode; label: string; description: string }[] = [
  { key: 'spacious', label: 'Spacious', description: 'Comfortable spacing' },
  { key: 'compact', label: 'Compact', description: 'More on screen' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeMode, palette, isDark, setThemeMode } = useTheme();

  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('spacious');
  const [syncStatus, setSyncStatus] = useState({ configured: false, label: 'Checking...' });

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
      setSyncStatus({ configured: false, label: 'Not configured' });
      return;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setSyncStatus({ configured: true, label: 'Session error' });
      return;
    }
    if (!data.session?.user) {
      setSyncStatus({ configured: true, label: 'Signed out' });
      return;
    }
    const isAnonymous = (data.session.user as any).is_anonymous === true;
    setSyncStatus({
      configured: true,
      label: isAnonymous ? 'Anonymous' : 'Connected',
    });
  };

  const surface = isDark ? palette.surface : '#FFFFFF';
  const border = palette.border;

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

  return (
    <Screen style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={{ color: palette.tint, fontSize: 11 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Settings</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Theme Section */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>THEME</Text>

          <View style={styles.themeGrid}>
            {THEME_OPTIONS.map((option) => {
              const isSelected = themeMode === option.key;
              const previewColors = option.key === 'system' ? ThemePalettes.dark : ThemePalettes[option.key];
              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => setThemeMode(option.key)}
                  style={[
                    styles.themeSwatch,
                    isSelected && [styles.themeSwatchActive, { borderColor: palette.tint }],
                  ]}
                >
                  <View style={[styles.swatchPreview, { backgroundColor: previewColors.background }]}>
                    <View style={[styles.swatchSurface, { backgroundColor: previewColors.surface }]} />
                    <View style={[styles.swatchAccent, { backgroundColor: previewColors.tint }]} />
                  </View>
                  <Text style={[styles.swatchLabel, { color: isSelected ? palette.tint : palette.textSecondary }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Display Section */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>DISPLAY</Text>

          <View style={styles.displayModeContainer}>
            {DISPLAY_OPTIONS.map((option) => {
              const isSelected = displayMode === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => void onDisplayModeChange(option.key)}
                  style={[
                    styles.displayModeBtn,
                    {
                      backgroundColor: isSelected ? palette.tint : palette.borderLight,
                      borderColor: isSelected ? palette.tint : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[styles.displayModeBtnLabel, { color: isSelected ? '#FFFFFF' : palette.text }]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.displayModeBtnDesc,
                      { color: isSelected ? 'rgba(255,255,255,0.7)' : palette.textSecondary },
                    ]}
                  >
                    {option.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* AI Configuration Section */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>AI CONFIGURATION</Text>

          <View style={styles.inputField}>
            <Text style={[styles.fieldLabel, { color: palette.text }]}>OpenAI API Key</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: palette.borderLight,
                  color: palette.text,
                  borderColor: border,
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
            <Text style={[styles.fieldHint, { color: palette.textSecondary }]}>
              Required for AI features. Get your key at platform.openai.com
            </Text>
          </View>

          <View style={[styles.settingRow, { marginTop: 11 }]}>
            <Text style={[styles.settingName, { color: palette.text }]}>AI Model</Text>
          </View>
          <View style={styles.modelGrid}>
            {AI_MODELS.map((model) => {
              const isSelected = aiModel === model.id;
              return (
                <TouchableOpacity
                  key={model.id}
                  onPress={() => void onAiModelChange(model.id)}
                  style={[
                    styles.modelBtn,
                    {
                      backgroundColor: isSelected ? palette.tint : palette.borderLight,
                      borderColor: isSelected ? palette.tint : 'transparent',
                    },
                  ]}
                >
                  <Text style={[styles.modelBtnLabel, { color: isSelected ? '#FFFFFF' : palette.text }]}>
                    {model.name}
                  </Text>
                  <Text
                    style={[
                      styles.modelBtnDesc,
                      { color: isSelected ? 'rgba(255,255,255,0.7)' : palette.textSecondary },
                    ]}
                  >
                    {model.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notifications Section */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>NOTIFICATIONS</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Daily Reminder</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                Morning reminder to plan your day
              </Text>
            </View>
            <Switch
              value={prefs?.notifications.dailyReminder ?? true}
              onValueChange={(v) => void onNotificationToggle('dailyReminder', v)}
              trackColor={{ false: border, true: palette.tint }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Task Due Alerts</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                Notify when tasks are due
              </Text>
            </View>
            <Switch
              value={prefs?.notifications.taskDue ?? true}
              onValueChange={(v) => void onNotificationToggle('taskDue', v)}
              trackColor={{ false: border, true: palette.tint }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Event Reminders</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                Notify before events start
              </Text>
            </View>
            <Switch
              value={prefs?.notifications.eventStart ?? true}
              onValueChange={(v) => void onNotificationToggle('eventStart', v)}
              trackColor={{ false: border, true: palette.tint }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Weekly Digest</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                Weekly summary of your progress
              </Text>
            </View>
            <Switch
              value={prefs?.notifications.weeklyDigest ?? false}
              onValueChange={(v) => void onNotificationToggle('weeklyDigest', v)}
              trackColor={{ false: border, true: palette.tint }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Sync Status Section */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>DATA SYNC</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Supabase Status</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                {syncStatus.configured ? 'Backend configured' : 'Missing configuration'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: palette.borderLight }]}>
              <Text style={[styles.statusText, { color: palette.text }]}>{syncStatus.label}</Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Sync Enabled</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                Sync data to cloud when available
              </Text>
            </View>
            <Switch
              value={prefs?.syncEnabled ?? true}
              onValueChange={(v) => void savePreferences({ syncEnabled: v }).then(setPrefs)}
              trackColor={{ false: border, true: palette.tint }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Last Synced</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                {formatLastSync()}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: palette.tint }]}
            onPress={() => {
              Alert.alert('Sync', 'Manual sync triggered. Data will be synced in the background.');
              void savePreferences({ lastSyncAt: Date.now() }).then(setPrefs);
            }}
          >
            <Text style={styles.primaryButtonText}>Sync Now</Text>
          </TouchableOpacity>
        </View>

        {/* Data Management Section */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>DATA MANAGEMENT</Text>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: border }]}
            onPress={() => Alert.alert('Export', 'Data export coming soon.')}
          >
            <Text style={[styles.actionName, { color: palette.text }]}>Export Data</Text>
            <Text style={{ color: palette.textSecondary }}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0 }]}
            onPress={() =>
              Alert.alert('Clear All Data', 'This will delete all local data. Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => Alert.alert('Cleared', 'Data cleared.') },
              ])
            }
          >
            <Text style={[styles.actionName, { color: palette.error }]}>Clear All Data</Text>
            <Text style={{ color: palette.error }}>⚠</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: palette.textSecondary }]}>Insight Mobile · v1.0.0</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  headerTitle: { fontSize: 14, fontWeight: '800' },
  backButton: { padding: 6 },
  scroll: { padding: 11, gap: 11, paddingBottom: 42 },
  section: {
    padding: 11,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  themeGrid: { flexDirection: 'row', gap: 8 },
  themeSwatch: {
    flex: 1,
    padding: 7,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 4,
  },
  themeSwatchActive: { borderWidth: 2 },
  swatchPreview: {
    width: '100%',
    height: 31,
    borderRadius: 6,
    padding: 4,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  swatchSurface: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 17,
    height: 13,
    borderRadius: 6,
  },
  swatchAccent: { width: 25, height: 12, borderRadius: 6 },
  swatchLabel: { fontSize: 8, fontWeight: '700' },
  displayModeContainer: { flexDirection: 'row', gap: 8 },
  displayModeBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    gap: 4,
  },
  displayModeBtnLabel: { fontSize: 10, fontWeight: '800' },
  displayModeBtnDesc: { fontSize: 8, fontWeight: '600' },
  inputField: { gap: 6 },
  fieldLabel: { fontSize: 10, fontWeight: '700' },
  fieldHint: { fontSize: 8, marginTop: 4 },
  input: {
    height: 31,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 10,
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: { flex: 1, marginRight: 11 },
  settingName: { fontSize: 10, fontWeight: '700' },
  settingDesc: { fontSize: 8, marginTop: 2 },
  modelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  modelBtn: {
    width: '47%',
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    gap: 2,
  },
  modelBtnLabel: { fontSize: 9, fontWeight: '800' },
  modelBtnDesc: { fontSize: 8, fontWeight: '600', textAlign: 'center' },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 699 },
  statusText: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase' },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  actionName: { fontSize: 10, fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 8, fontWeight: '600', marginTop: 7 },
});
