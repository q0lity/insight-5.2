import { StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import { useTheme, ThemeMode } from '@/src/state/theme';
import { useAuth } from '@/src/state/auth';
import { LuxCard } from '@/components/LuxCard';
import { LuxHeader } from '@/components/LuxHeader';

type SettingRowProps = {
  icon: keyof typeof FontAwesome.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
};

function SettingRow({ icon, label, value, onPress, danger }: SettingRowProps) {
  const { palette } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: palette.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <FontAwesome name={icon} size={18} color={danger ? palette.error : palette.tint} />
        <Text style={[styles.settingLabel, { color: danger ? palette.error : palette.text }]}>{label}</Text>
      </View>
      {value && (
        <Text style={[styles.settingValue, { color: palette.textSecondary }]}>{value}</Text>
      )}
      {onPress && (
        <FontAwesome name="chevron-right" size={12} color={palette.textSecondary} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { palette, themeMode, setThemeMode, displayMode, setDisplayMode } = useTheme();
  const { session, signOut, forceReauthenticate } = useAuth();
  const insets = useSafeAreaInsets();

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'warm', label: 'White / Orange' },
    { value: 'oliveOrange', label: 'Olive / Orange' },
    { value: 'midnight', label: 'Navy / Orange' },
    { value: 'midnightNeon', label: 'Black / Neon' },
  ];

  const handleThemeChange = () => {
    const currentIndex = themeOptions.findIndex((mode) => mode.value === themeMode);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % themeOptions.length;
    setThemeMode(themeOptions[nextIndex].value);
  };

  const handleDensityChange = () => {
    setDisplayMode(displayMode === 'compact' ? 'big' : 'compact');
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => void signOut() },
      ]
    );
  };

  const handleForceReauth = () => {
    Alert.alert(
      'Force Re-authenticate',
      'This will clear all session data and require you to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => void forceReauthenticate() },
      ]
    );
  };

  const themeLabel = themeOptions.find((mode) => mode.value === themeMode)?.label ?? 'Warm';
  const densityLabel = displayMode === 'compact' ? 'Compact' : 'Large';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 70 }}
    >
      <LuxHeader overline="Settings" title="Appearance & Account" style={styles.header} />

      <LuxCard style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Account</Text>
        <SettingRow
          icon="user"
          label="Email"
          value={session?.user?.email ?? 'Not signed in'}
        />
      </LuxCard>

      <LuxCard style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Appearance</Text>
        <SettingRow
          icon="moon-o"
          label="Theme"
          value={themeLabel}
          onPress={handleThemeChange}
        />
        <SettingRow
          icon="compress"
          label="Density"
          value={densityLabel}
          onPress={handleDensityChange}
        />
      </LuxCard>

      <LuxCard style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Actions</Text>
        <SettingRow
          icon="refresh"
          label="Force Re-authenticate"
          onPress={handleForceReauth}
        />
        <SettingRow
          icon="sign-out"
          label="Sign Out"
          onPress={handleSignOut}
          danger
        />
      </LuxCard>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: palette.textSecondary }]}>
          Insight Mobile v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 14,
    marginBottom: 17,
  },
  section: {
    marginHorizontal: 14,
    marginBottom: 11,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 11,
    paddingTop: 11,
    paddingBottom: 6,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  settingValue: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'Figtree',
    marginRight: 6,
  },
  footer: {
    alignItems: 'center',
    marginTop: 17,
    marginBottom: 28,
  },
  footerText: {
    fontSize: 8,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
});
