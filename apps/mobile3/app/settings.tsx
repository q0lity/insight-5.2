import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InsightIcon } from '@/src/components/InsightIcon';
import { useTheme, ThemePalettes, type ThemeMode, type DisplayMode } from '@/src/state/theme';

const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: 'dark', label: 'Dark' },
  { key: 'light', label: 'Light' },
  { key: 'warm', label: 'Warm' },
  { key: 'olive', label: 'Olive' },
];

const DISPLAY_OPTIONS: { key: DisplayMode; label: string; description: string }[] = [
  { key: 'big', label: 'Big', description: 'Larger text & spacing' },
  { key: 'compact', label: 'Compact', description: 'More info on screen' },
];

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

  const [apiKey, setApiKey] = useState('');
  const [useLlm, setUseLlm] = useState(false);

  const surface = isDark ? palette.surface : '#FFFFFF';
  const border = palette.border;

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

        {/* AI Section */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Artificial Intelligence</Text>
            <InsightIcon name="sparkle" size={16} color={palette.tint} />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Enable LLM Parsing</Text>
              <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>Use AI to parse natural language captures.</Text>
            </View>
            <Switch
              value={useLlm}
              onValueChange={setUseLlm}
              trackColor={{ false: border, true: palette.tint }}
              thumbColor="#FFFFFF"
            />
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
              onChangeText={setApiKey}
            />
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
    width: '47%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  themeSwatchActive: {
    borderWidth: 2,
  },
  swatchPreview: {
    width: '100%',
    height: 56,
    borderRadius: 10,
    padding: 8,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  swatchSurface: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 24,
    borderRadius: 6,
  },
  swatchAccent: {
    width: 48,
    height: 10,
    borderRadius: 5,
  },
  swatchLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree',
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
});
