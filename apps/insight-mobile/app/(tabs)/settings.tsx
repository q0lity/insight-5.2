import { StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import { useTheme, ThemeMode } from '@/src/state/theme';
import { useAuth } from '@/src/state/auth';

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
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleThemeChange = () => {
    const modes: ThemeMode[] = ['system', 'light', 'dark'];
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setThemeMode(modes[nextIndex]);
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
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            void signOut().finally(() => {
              router.replace('/auth');
            });
          },
        },
      ]
    );
  };

  const handleForceReauth = () => {
    Alert.alert(
      'Force Re-authenticate',
      'This will clear all session data and require you to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            void forceReauthenticate().finally(() => {
              router.replace('/auth');
            });
          },
        },
      ]
    );
  };

  const handleSignIn = () => {
    void forceReauthenticate().finally(() => {
      router.replace('/auth');
    });
  };

  const themeLabel = themeMode === 'system' ? 'System' : themeMode === 'dark' ? 'Dark' : 'Light';
  const densityLabel = displayMode === 'compact' ? 'Impact' : 'Large';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100 }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>Settings</Text>
      </View>

      <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Account</Text>
        <SettingRow
          icon="user"
          label="Email"
          value={session?.user?.email ?? 'Not signed in'}
        />
      </View>

      <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
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
      </View>

      <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Actions</Text>
        {session ? (
          <>
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
          </>
        ) : (
          <SettingRow
            icon="sign-in"
            label="Sign In"
            onPress={handleSignIn}
          />
        )}
      </View>

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
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Figtree',
    marginRight: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
});
