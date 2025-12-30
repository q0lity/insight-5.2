import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { InsightIcon } from '@/src/components/InsightIcon';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [apiKey, setApiKey] = useState('');
  const [useLlm, setUseLlm] = useState(false);

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
        <View style={[styles.section, { backgroundColor: isDark ? '#141a2a' : '#FFFFFF', borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)' }]}>
          <Text style={[styles.sectionLabel, { color: palette.tabIconDefault }]}>Appearance</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Theme</Text>
              <Text style={[styles.settingDesc, { color: palette.tabIconDefault }]}>Current: {colorScheme.toUpperCase()}</Text>
            </View>
            <View style={[styles.segmented, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              {['light', 'dark', 'system'].map((t) => (
                <TouchableOpacity 
                  key={t} 
                  style={[styles.segBtn, colorScheme === t && styles.segBtnActive]}
                >
                  <Text style={[styles.segText, colorScheme === t && styles.segTextActive]}>{t.charAt(0).toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: isDark ? '#141a2a' : '#FFFFFF', borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.tabIconDefault }]}>Artificial Intelligence</Text>
            <InsightIcon name="sparkle" size={16} color={palette.tint} />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: palette.text }]}>Enable LLM Parsing</Text>
              <Text style={[styles.settingDesc, { color: palette.tabIconDefault }]}>Use AI to parse natural language captures.</Text>
            </View>
            <Switch 
              value={useLlm} 
              onValueChange={setUseLlm}
              trackColor={{ false: '#767577', true: palette.tint }}
              thumbColor={isDark ? '#f4f3f4' : '#FFFFFF'}
            />
          </View>

          <View style={styles.inputField}>
            <Text style={[styles.fieldLabel, { color: palette.text }]}>OpenAI API Key</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  color: palette.text,
                  borderColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(28, 28, 30, 0.05)'
                }
              ]}
              placeholder="sk-..."
              placeholderTextColor={palette.tabIconDefault}
              secureTextEntry
              value={apiKey}
              onChangeText={setApiKey}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: isDark ? '#141a2a' : '#FFFFFF', borderColor: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(28, 28, 30, 0.06)' }]}>
          <Text style={[styles.sectionLabel, { color: palette.tabIconDefault }]}>Data Management</Text>
          
          <TouchableOpacity style={styles.actionRow}>
            <Text style={[styles.actionName, { color: palette.text }]}>Export Data</Text>
            <InsightIcon name="file" size={20} color={palette.tabIconDefault} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.actionName, { color: '#EF4444' }]}>Clear All Data</Text>
            <InsightIcon name="dots" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: palette.tabIconDefault }]}>Insight 5 Mobile · v1.0.0</Text>
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
  segmented: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 10,
  },
  segBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segBtnActive: {
    backgroundColor: '#D95D39',
  },
  segText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segTextActive: {
    color: '#FFFFFF',
  },
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  actionName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
});
