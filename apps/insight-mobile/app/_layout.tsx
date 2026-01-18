import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '@/src/supabase/polyfills';
import '../global.css';
import {
  Figtree_300Light,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  Figtree_900Black,
} from '@expo-google-fonts/figtree';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

import { AuthProvider, useAuth } from '@/src/state/auth';
import { SessionProvider } from '@/src/state/session';
import { ThemeProvider, useTheme } from '@/src/state/theme';
import { processSyncQueue } from '@/src/storage/sync';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Figtree_300Light,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
    Figtree_900Black,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { isDark } = useTheme();
  const { session, loading } = useAuth();

  // Process sync queue when user logs in
  useEffect(() => {
    if (session) {
      void processSyncQueue();
    }
  }, [session?.user?.id]);

  if (loading) {
    return null;
  }

  const screens = session
    ? [
        <Stack.Screen key="tabs" name="(tabs)" />,
        <Stack.Screen key="modal" name="modal" options={{ presentation: 'modal' }} />,
        <Stack.Screen key="capture" name="capture" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />,
        <Stack.Screen key="voice" name="voice" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />,
        <Stack.Screen key="focus" name="focus" />,
      ]
    : [<Stack.Screen key="auth" name="auth" />];

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <SessionProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>{screens}</Stack>
      </SessionProvider>
    </NavigationThemeProvider>
  );
}
