import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InsightIcon } from '@/src/components/InsightIcon';
import { useTheme, ThemePalettes, type ThemeMode, type DisplayMode } from '@/src/state/theme';
import { useAuth } from '@/src/state/auth';
import { getSupabaseClient } from '@/src/supabase/client';
import { getSupabaseSessionUser } from '@/src/supabase/helpers';
import { invokeCaptureParse } from '@/src/supabase/functions';
import { connectCalendarProvider } from '@/src/services/calendarOAuth';
import { disconnectCalendarProvider, listCalendarConnections, type CalendarConnection, type CalendarProvider } from '@/src/services/calendarConnections';
import { syncConnectedCalendars, type CalendarSyncOutcome } from '@/src/services/calendarSync';
import {
  loadPreferences,
  savePreferences,
  AI_MODELS,
  type WeightUnit,
  type DistanceUnit,
} from '@/src/storage/preferences';
import type { AssistantMode } from '@/src/assistant/storage';

const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: 'dark', label: 'Dark' },
  { key: 'light', label: 'Light' },
  { key: 'warm', label: 'Warm' },
  { key: 'olive', label: 'Olive' },
  { key: 'oliveOrange', label: 'Olive Orange' },
  { key: 'roseGold', label: 'Rose Gold' },
];

const DISPLAY_OPTIONS: { key: DisplayMode; label: string; description: string }[] = [
  { key: 'big', label: 'Big', description: 'Larger text & spacing' },
  { key: 'compact', label: 'Compact', description: 'More info on screen' },
];

const CALENDAR_ROWS = [
  {
    id: 'google',
    label: 'Google Calendar',
    detail: 'Two-way sync via server',
    color: '#4285F4',
    enabled: true,
  },
  {
    id: 'microsoft',
    label: 'Microsoft Outlook',
    detail: 'Two-way sync via server',
    color: '#0A74DA',
    enabled: true,
  },
  {
    id: 'apple',
    label: 'Apple Calendar (device)',
    detail: 'On-device sync coming next',
    color: '#111827',
    enabled: false,
  },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    themeMode,
    displayMode,
    resolvedTheme,
    palette,
    isDark,
    setThemeMode,
    setDisplayMode
  } = useTheme();
  const { session, signOut, forceReauthenticate } = useAuth();

  const [apiKey, setApiKey] = useState('');
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('local');
  const [assistantModel, setAssistantModel] = useState('gpt-4o-mini');
  const [supabaseStatus, setSupabaseStatus] = useState({
    configured: false,
    sessionLabel: 'Unknown',
    userId: '',
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [calendarConnections, setCalendarConnections] = useState<CalendarConnection[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const [calendarConnecting, setCalendarConnecting] = useState<CalendarProvider | null>(null);
  const [calendarSyncing, setCalendarSyncing] = useState(false);
  const [calendarSyncMessage, setCalendarSyncMessage] = useState('');
  const [calendarLastSyncAt, setCalendarLastSyncAt] = useState<Date | null>(null);

  // Health preferences
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lbs');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('mi');
  const [nutritionModel, setNutritionModel] = useState('gpt-4o-mini');

  // Load preferences on mount
  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setAssistantMode((prefs.assistantMode ?? (prefs.llmEnabled ? 'hybrid' : 'local')) as AssistantMode);
      setApiKey(prefs.openAiApiKey);
      setAssistantModel(prefs.assistantModel);
      setWeightUnit(prefs.preferredWeightUnit);
      setDistanceUnit(prefs.preferredDistanceUnit);
      setNutritionModel(prefs.nutritionModel);
    });
  }, []);

  const onWeightUnitChange = useCallback(async (unit: WeightUnit) => {
    setWeightUnit(unit);
    await savePreferences({ preferredWeightUnit: unit });
  }, []);

  const onDistanceUnitChange = useCallback(async (unit: DistanceUnit) => {
    setDistanceUnit(unit);
    await savePreferences({ preferredDistanceUnit: unit });
  }, []);

  const onNutritionModelChange = useCallback(async (model: string) => {
    setNutritionModel(model);
    await savePreferences({ nutritionModel: model });
  }, []);

  const onAssistantModelChange = useCallback(async (model: string) => {
    setAssistantModel(model);
    await savePreferences({ assistantModel: model });
  }, []);

  const onAssistantModeChange = useCallback(async (mode: AssistantMode) => {
    setAssistantMode(mode);
    await savePreferences({ assistantMode: mode, llmEnabled: mode !== 'local' });
  }, []);

  const onApiKeyChange = useCallback((next: string) => {
    setApiKey(next);
    void savePreferences({ openAiApiKey: next });
  }, []);

  const surface = isDark ? palette.surface : '#FFFFFF';
  const border = palette.border;
  const userEmail = session?.user?.email ?? '';

  const calendarConnectionMap = useMemo(() => {
    return new Map(calendarConnections.map((connection) => [connection.provider, connection]));
  }, [calendarConnections]);

  const refreshSupabaseStatus = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSupabaseStatus({ configured: false, sessionLabel: 'Not configured', userId: '' });
      return;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setSupabaseStatus({ configured: true, sessionLabel: 'Session error', userId: '' });
      return;
    }
    const user = data.session?.user;
    if (!user) {
      setSupabaseStatus({ configured: true, sessionLabel: 'Signed out', userId: '' });
      return;
    }
    const isAnonymous = (user as { is_anonymous?: boolean }).is_anonymous === true;
    setSupabaseStatus({
      configured: true,
      sessionLabel: isAnonymous ? 'Anonymous session' : 'Signed in',
      userId: user.id,
    });
  }, []);

  const loadCalendarConnections = useCallback(async () => {
    setCalendarLoading(true);
    setCalendarError('');
    try {
      const connections = await listCalendarConnections();
      setCalendarConnections(connections);
    } catch (err) {
      setCalendarError(err instanceof Error ? err.message : 'Unable to load calendar connections.');
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const calendarProviderLabel = useCallback((provider: CalendarProvider) => {
    return provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook';
  }, []);


  const handleCalendarConnect = useCallback(
    async (provider: CalendarProvider) => {
      if (!session) {
        Alert.alert('Sign in required', 'Sign in to connect calendars.');
        router.push('/auth');
        return;
      }
      setCalendarConnecting(provider);
      setCalendarError('');
      try {
        const connected = await connectCalendarProvider(provider);
        if (connected) {
          await loadCalendarConnections();
          Alert.alert('Calendar connected', `${calendarProviderLabel(provider)} linked successfully.`);
        }
      } catch (err) {
        Alert.alert(
          'Calendar connect failed',
          err instanceof Error ? err.message : 'Unable to connect calendar.'
        );
      } finally {
        setCalendarConnecting(null);
      }
    },
    [calendarProviderLabel, loadCalendarConnections, router, session]
  );

  const handleCalendarDisconnect = useCallback(
    (provider: CalendarProvider) => {
      Alert.alert('Disconnect calendar', `Disconnect ${calendarProviderLabel(provider)}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectCalendarProvider(provider);
              await loadCalendarConnections();
              Alert.alert('Disconnected', `${calendarProviderLabel(provider)} removed.`);
            } catch (err) {
              Alert.alert(
                'Disconnect failed',
                err instanceof Error ? err.message : 'Unable to disconnect calendar.'
              );
            }
          },
        },
      ]);
    },
    [calendarProviderLabel, loadCalendarConnections]
  );

  const formatCalendarSyncSummary = useCallback((outcomes: CalendarSyncOutcome[]) => {
    if (!outcomes.length) return 'No providers connected.';
    return outcomes
      .map((outcome) => {
        if (outcome.error) {
          return `${outcome.provider}: ${outcome.error}`;
        }
        if (!outcome.result) {
          return `${outcome.provider}: no updates.`;
        }
        return `${outcome.provider}: ${outcome.result.pulled} pulled, ${outcome.result.pushed} pushed.`;
      })
      .join('\n');
  }, []);

  const handleCalendarSync = useCallback(async () => {
    if (calendarSyncing) return;
    setCalendarSyncing(true);
    setCalendarSyncMessage('');
    try {
      const outcomes = await syncConnectedCalendars();
      const summary = formatCalendarSyncSummary(outcomes);
      setCalendarSyncMessage(summary);
      setCalendarLastSyncAt(new Date());
      Alert.alert('Calendar sync', summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sync calendars.';
      setCalendarSyncMessage(message);
      Alert.alert('Calendar sync failed', message);
    } finally {
      setCalendarSyncing(false);
    }
  }, [calendarSyncing, formatCalendarSyncSummary]);

  useEffect(() => {
    void refreshSupabaseStatus();
  }, [refreshSupabaseStatus]);

  useEffect(() => {
    void loadCalendarConnections();
  }, [loadCalendarConnections, session]);

  const runTranscriptionTest = useCallback(async () => {
    setTestStatus('running');
    setTestMessage('');
    const supabase = getSupabaseClient();
    if (!supabase) {
      setTestStatus('error');
      setTestMessage('Supabase not configured. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }
    const session = await getSupabaseSessionUser({ allowAnonymous: true });
    if (!session) {
      setTestStatus('error');
      setTestMessage('No Supabase session. Sign in or enable anonymous auth.');
      return;
    }
    try {
      const result = await invokeCaptureParse({
        captureId: `test_${Date.now()}`,
        transcript: 'Row. This is a test of the parsing system.',
        mode: 'transcribe_only',
      });
      const status = typeof result?.status === 'string' ? result.status : 'ok';
      setTestStatus('success');
      setTestMessage(`Transcription test succeeded (${status}).`);
    } catch (err) {
      setTestStatus('error');
      const message = err instanceof Error ? err.message : 'Transcription test failed.';
      if (/\\(404\\)/.test(message) || /not found/i.test(message)) {
        setTestMessage(`${message} Deploy the Supabase function "transcribe_and_parse_capture".`);
      } else if (/\\(401\\)|unauthorized/i.test(message)) {
        setTestMessage(`${message} Check auth/session or enable anonymous auth.`);
      } else if (/OPENAI_API_KEY/i.test(message)) {
        setTestMessage(`${message} Add OPENAI_API_KEY to your Supabase function environment.`);
      } else {
        setTestMessage(message);
      }
    } finally {
      void refreshSupabaseStatus();
    }
  }, [refreshSupabaseStatus]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Account</Text>
            <InsightIcon name="users" size={16} color={palette.tint} />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Signed in</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                {userEmail || 'Unknown user'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: palette.borderLight }]}>
              <Text style={[styles.statusText, { color: palette.text }]}>Active</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={async () => {
              console.log('[Settings] Sign out button pressed');
              await signOut();
              Alert.alert('Signed Out', 'You have been signed out.');
            }}
            style={[styles.secondaryButton, { borderColor: palette.border, backgroundColor: palette.borderLight }]}
          >
            <Text style={[styles.secondaryButtonText, { color: palette.text }]}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              console.log('[Settings] Clear Session button pressed');
              Alert.alert(
                'Clear Session',
                'This will clear all cached auth data and sign you out. Continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear & Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                      await forceReauthenticate();
                      Alert.alert('Session Cleared', 'Please sign in again.');
                    },
                  },
                ]
              );
            }}
            style={[styles.secondaryButton, { borderColor: palette.error, backgroundColor: 'transparent' }]}
          >
            <Text style={[styles.secondaryButtonText, { color: palette.error }]}>Clear Session & Re-login</Text>
          </TouchableOpacity>
        </View>
        {/* Display Mode Section */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Display</Text>

          <View style={styles.displayModeContainer}>
            {DISPLAY_OPTIONS.map((option) => {
              const isSelected = displayMode === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => setDisplayMode(option.key)}
                  style={[
                    styles.displayModeBtn,
                    {
                      backgroundColor: isSelected ? palette.tint : palette.borderLight,
                      borderColor: isSelected ? palette.tint : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.displayModeBtnLabel,
                      { color: isSelected ? '#FFFFFF' : palette.text }
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.displayModeBtnDesc,
                      { color: isSelected ? 'rgba(255,255,255,0.7)' : palette.textSecondary }
                    ]}
                  >
                    {option.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Theme Section */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Theme</Text>

          <View style={styles.themeGrid}>
            {THEME_OPTIONS.map((option) => {
              const isSelected = themeMode === option.key;
              const previewColors = ThemePalettes[option.key];
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
                  <Text style={[styles.swatchLabel, { color: palette.textSecondary }]}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: palette.tint }]}>
                      <InsightIcon name="check" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* System toggle */}
          <View style={[styles.settingRow, { marginTop: 8 }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Follow System</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                Auto-switch based on device settings
              </Text>
            </View>
            <Switch
              value={themeMode === 'system'}
              onValueChange={(enabled) => setThemeMode(enabled ? 'system' : resolvedTheme)}
              trackColor={{ false: border, true: palette.tint }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Calendar Sync Section */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Calendar Sync</Text>
            <InsightIcon name="calendar" size={16} color={palette.tint} />
          </View>

          <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
            Two-way sync, forward-only from today. Connect providers here and sync on demand.
          </Text>

          {!session ? (
            <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
              Sign in to connect calendars.
            </Text>
          ) : null}

          {calendarLoading ? (
            <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>Loading connections...</Text>
          ) : null}

          {calendarError ? (
            <Text style={[styles.settingDesc, { color: palette.error }]}>{calendarError}</Text>
          ) : null}

          {CALENDAR_ROWS.map((row) => {
            const provider = row.id === 'google' || row.id === 'microsoft' ? row.id : null;
            const connection = provider ? calendarConnectionMap.get(provider) : null;
            const connected = Boolean(connection);
            const connecting = provider ? calendarConnecting === provider : false;
            const disabled = !row.enabled || connecting || calendarLoading;
            const buttonLabel = !row.enabled ? 'Soon' : connected ? 'Disconnect' : connecting ? 'Connecting...' : 'Connect';
            const subtitle = connected ? connection?.email ?? 'Connected' : row.detail;

            return (
              <View
                key={row.id}
                style={[
                  styles.providerRow,
                  { backgroundColor: palette.borderLight, borderColor: palette.border },
                ]}
              >
                <View style={styles.providerInfo}>
                  <View style={[styles.providerDot, { backgroundColor: row.color }]} />
                  <View style={styles.providerText}>
                    <Text style={[styles.providerTitle, { color: palette.text }]}>{row.label}</Text>
                    <Text style={[styles.providerSubtitle, { color: palette.textSecondary }]}>{subtitle}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  disabled={disabled || !provider}
                  onPress={() => {
                    if (!provider) return;
                    if (connected) {
                      handleCalendarDisconnect(provider);
                    } else {
                      void handleCalendarConnect(provider);
                    }
                  }}
                  style={[
                    styles.providerButton,
                    {
                      backgroundColor: connected ? palette.borderLight : palette.tint,
                      borderColor: connected ? palette.border : palette.tint,
                      opacity: disabled ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.providerButtonText,
                      { color: connected ? palette.text : '#FFFFFF' },
                    ]}
                  >
                    {buttonLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <TouchableOpacity
            onPress={() => void handleCalendarSync()}
            disabled={calendarSyncing || calendarLoading || !session}
            style={[
              styles.primaryButton,
              { backgroundColor: palette.tint, opacity: calendarSyncing || !session ? 0.6 : 1 },
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {calendarSyncing ? 'Syncing...' : 'Sync Now'}
            </Text>
          </TouchableOpacity>

          {calendarSyncMessage ? (
            <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>{calendarSyncMessage}</Text>
          ) : null}

          {calendarLastSyncAt ? (
            <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
              Last sync {calendarLastSyncAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          ) : null}
        </View>

        {/* AI Section */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Artificial Intelligence</Text>
            <InsightIcon name="sparkle" size={16} color={palette.tint} />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Assistant Mode</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                Local uses on-device search, Hybrid adds LLM, LLM always uses API.
              </Text>
            </View>
          </View>
          <View style={styles.modeRow}>
            {(['local', 'hybrid', 'llm'] as AssistantMode[]).map((mode) => {
              const isSelected = assistantMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => void onAssistantModeChange(mode)}
                  style={[
                    styles.modeChip,
                    {
                      backgroundColor: isSelected ? palette.tint : palette.borderLight,
                      borderColor: isSelected ? palette.tint : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ color: isSelected ? '#FFFFFF' : palette.text }}>{mode.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.inputField}>
            <Text style={[styles.fieldLabel, { color: palette.text }]}>OpenAI API Key</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: palette.borderLight,
                  color: palette.text,
                  borderColor: border,
                }
              ]}
              placeholder="sk-..."
              placeholderTextColor={palette.textSecondary}
              secureTextEntry
              value={apiKey}
              onChangeText={onApiKeyChange}
            />
          </View>

          <View style={[styles.settingRow, { marginTop: 12 }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Assistant Model</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                Model used for ChatGPT-style search answers
              </Text>
            </View>
          </View>
          <View style={styles.modelGrid}>
            {AI_MODELS.map((model) => {
              const isSelected = assistantModel === model.id;
              return (
                <TouchableOpacity
                  key={`assistant-${model.id}`}
                  onPress={() => void onAssistantModelChange(model.id)}
                  style={[
                    styles.modelBtn,
                    {
                      backgroundColor: isSelected ? palette.tint : palette.borderLight,
                      borderColor: isSelected ? palette.tint : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modelBtnLabel,
                      { color: isSelected ? '#FFFFFF' : palette.text }
                    ]}
                  >
                    {model.name}
                  </Text>
                  <Text
                    style={[
                      styles.modelBtnDesc,
                      { color: isSelected ? 'rgba(255,255,255,0.7)' : palette.textSecondary }
                    ]}
                  >
                    {model.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Transcription Diagnostics */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Transcription</Text>
            <InsightIcon name="mic" size={16} color={palette.tint} />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Supabase Status</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                {supabaseStatus.configured ? 'Configured' : 'Missing environment variables'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: palette.borderLight }]}>
              <Text style={[styles.statusText, { color: palette.text }]}>{supabaseStatus.sessionLabel}</Text>
            </View>
          </View>

          {supabaseStatus.userId ? (
            <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
              User: {supabaseStatus.userId.slice(0, 8)}...
            </Text>
          ) : null}

          <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
            Runs a safe transcript test using Supabase Edge Functions (no data stored).
          </Text>

          <TouchableOpacity
            onPress={() => void runTranscriptionTest()}
            disabled={testStatus === 'running'}
            style={[
              styles.primaryButton,
              { backgroundColor: palette.tint, opacity: testStatus === 'running' ? 0.7 : 1 },
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {testStatus === 'running' ? 'Testing...' : 'Run Transcription Test'}
            </Text>
          </TouchableOpacity>

          {testMessage ? (
            <Text
              style={[
                styles.settingDesc,
                { color: testStatus === 'error' ? palette.error : palette.textSecondary },
              ]}
            >
              {testMessage}
            </Text>
          ) : null}
        </View>

        {/* Health Preferences Section */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Health Preferences</Text>
            <InsightIcon name="workout" size={16} color={palette.tint} />
          </View>

          {/* Weight Unit */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Weight Unit</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                For workout tracking
              </Text>
            </View>
          </View>
          <View style={styles.displayModeContainer}>
            {(['lbs', 'kg'] as const).map((unit) => {
              const isSelected = weightUnit === unit;
              return (
                <TouchableOpacity
                  key={unit}
                  onPress={() => void onWeightUnitChange(unit)}
                  style={[
                    styles.unitBtn,
                    {
                      backgroundColor: isSelected ? palette.tint : palette.borderLight,
                      borderColor: isSelected ? palette.tint : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.unitBtnLabel,
                      { color: isSelected ? '#FFFFFF' : palette.text }
                    ]}
                  >
                    {unit.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Distance Unit */}
          <View style={[styles.settingRow, { marginTop: 12 }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Distance Unit</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                For cardio tracking
              </Text>
            </View>
          </View>
          <View style={styles.displayModeContainer}>
            {(['mi', 'km'] as const).map((unit) => {
              const isSelected = distanceUnit === unit;
              return (
                <TouchableOpacity
                  key={unit}
                  onPress={() => void onDistanceUnitChange(unit)}
                  style={[
                    styles.unitBtn,
                    {
                      backgroundColor: isSelected ? palette.tint : palette.borderLight,
                      borderColor: isSelected ? palette.tint : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.unitBtnLabel,
                      { color: isSelected ? '#FFFFFF' : palette.text }
                    ]}
                  >
                    {unit === 'mi' ? 'Miles' : 'Kilometers'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Nutrition Model */}
          <View style={[styles.settingRow, { marginTop: 12 }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Nutrition Estimation</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                AI model for calorie & nutrient estimates
              </Text>
            </View>
          </View>
          <View style={styles.modelGrid}>
            {AI_MODELS.map((model) => {
              const isSelected = nutritionModel === model.id;
              return (
                <TouchableOpacity
                  key={model.id}
                  onPress={() => void onNutritionModelChange(model.id)}
                  style={[
                    styles.modelBtn,
                    {
                      backgroundColor: isSelected ? palette.tint : palette.borderLight,
                      borderColor: isSelected ? palette.tint : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modelBtnLabel,
                      { color: isSelected ? '#FFFFFF' : palette.text }
                    ]}
                  >
                    {model.name}
                  </Text>
                  <Text
                    style={[
                      styles.modelBtnDesc,
                      { color: isSelected ? 'rgba(255,255,255,0.7)' : palette.textSecondary }
                    ]}
                  >
                    {model.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Data Management Section */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Data Management</Text>

          <TouchableOpacity style={[styles.actionRow, { borderBottomColor: border }]}>
            <Text style={[styles.actionName, { color: palette.text }]}>Export Data</Text>
            <InsightIcon name="file" size={20} color={palette.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.actionName, { color: palette.error }]}>Clear All Data</Text>
            <InsightIcon name="dots" size={20} color={palette.error} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: palette.textSecondary }]}>Insight 5 Mobile · v1.0.0</Text>
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
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Display Mode Styles
  displayModeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  displayModeBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    gap: 4,
  },
  displayModeBtnLabel: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  displayModeBtnDesc: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Theme Swatch Styles
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeSwatch: {
    width: '30%',
    padding: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  themeSwatchActive: {
    borderWidth: 2,
  },
  swatchPreview: {
    width: '100%',
    height: 44,
    borderRadius: 8,
    padding: 6,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  swatchSurface: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 18,
    borderRadius: 4,
  },
  swatchAccent: {
    width: 36,
    height: 8,
    borderRadius: 4,
  },
  swatchLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Figtree',
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Setting Row Styles
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  settingDesc: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  providerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  providerText: {
    flex: 1,
  },
  providerTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  providerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  providerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  providerButtonText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Input Styles
  inputField: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'Figtree',
    borderWidth: 1,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  // Action Row Styles
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  actionName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  // Version
  version: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
  // Unit button styles
  unitBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  unitBtnLabel: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  // Model grid styles
  modelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modelBtn: {
    width: '47%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    gap: 2,
  },
  modelBtnLabel: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  modelBtnDesc: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  modeChip: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
