import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useTheme } from '@/src/state/theme';
import { getSupabaseClient } from '@/src/supabase/client';
import { LuxCard } from '@/components/LuxCard';

WebBrowser.maybeCompleteAuthSession();

type OAuthProvider = 'google' | 'apple' | 'azure';

function parseAuthResult(url: string) {
  const parsed = new URL(url);
  const code = parsed.searchParams.get('code');
  const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  const hashParams = new URLSearchParams(hash);
  const access = hashParams.get('access_token');
  const refresh = hashParams.get('refresh_token');
  return {
    code,
    session: access && refresh ? { access_token: access, refresh_token: refresh } : null,
  };
}

export default function AuthScreen() {
  const { palette } = useTheme();
  const router = useRouter();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const isSignup = mode === 'signup';

  async function handleEmailAuth() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      Alert.alert('Supabase not configured', 'Check your environment variables.');
      return;
    }
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Enter your email and password.');
      return;
    }
    if (isSignup && password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Make sure your passwords match.');
      return;
    }
    setBusy(true);
    try {
      if (isSignup) {
        const redirectTo = Linking.createURL('auth-callback');
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectTo,
          },
        });
        if (error) throw error;
        if (data?.session) {
          Alert.alert('Account created', 'You are signed in.');
        } else {
          Alert.alert('Check your email', 'Confirm your email to finish signing up.');
        }
      } else {
        console.log('[AuthScreen] Attempting sign in with:', email.trim());
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        console.log('[AuthScreen] Sign in result - data:', !!data?.session, 'error:', error?.message);
        if (error) throw error;
        if (data?.session) {
          console.log('[AuthScreen] Sign in successful! Session user:', data.session.user?.email);
          router.replace('/(tabs)');
        }
      }
    } catch (err: any) {
      console.error('[AuthScreen] Auth error:', err);
      Alert.alert(isSignup ? 'Sign up failed' : 'Login failed', err?.message ? String(err.message) : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      Alert.alert('Supabase not configured', 'Check your environment variables.');
      return;
    }
    setBusy(true);
    try {
      const redirectTo = Linking.createURL('auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('No OAuth URL returned.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) return;
      const parsed = parseAuthResult(result.url);
      if (parsed.session) {
        await supabase.auth.setSession(parsed.session);
        return;
      }
      if (parsed.code) {
        await supabase.auth.exchangeCodeForSession(parsed.code);
        return;
      }
      Alert.alert('Auth error', 'No session returned from OAuth.');
    } catch (err: any) {
      Alert.alert('OAuth failed', err?.message ? String(err.message) : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <LuxCard style={[styles.card, { backgroundColor: palette.surface }]}>
        <View style={styles.logoRow}>
          <View style={[styles.logoBadge, { backgroundColor: palette.tint }]}>
            <Text style={styles.logoText}>i</Text>
          </View>
          <Text style={[styles.title, { color: palette.text }]}>Insight</Text>
        </View>

        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          {isSignup ? 'Create an account to sync across devices.' : 'Sign in to sync across devices.'}
        </Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="********"
        />

        {isSignup && (
          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="********"
          />
        )}

        <Button
          title={busy ? (isSignup ? 'Creating account...' : 'Signing in...') : isSignup ? 'Create Account' : 'Sign In'}
          onPress={handleEmailAuth}
          loading={busy}
        />

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleText, { color: palette.textSecondary }]}>
            {isSignup ? 'Already have an account?' : 'New here?'}
          </Text>
          <TouchableOpacity
            onPress={() => setMode(isSignup ? 'signin' : 'signup')}
            disabled={busy}
            style={styles.toggleButton}
          >
            <Text style={[styles.toggleCta, { color: palette.tint }]}>
              {isSignup ? 'Sign In' : 'Create account'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <Text style={[styles.dividerText, { color: palette.textSecondary }]}>or</Text>
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
        </View>

        <TouchableOpacity
          onPress={() => void handleOAuth('google')}
          disabled={busy}
          style={[styles.oauthButton, { borderColor: palette.border }]}
        >
          <FontAwesome name="google" size={18} color={palette.text} />
          <Text style={[styles.oauthText, { color: palette.text }]}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => void handleOAuth('apple')}
          disabled={busy}
          style={[styles.oauthButton, { borderColor: palette.border }]}
        >
          <FontAwesome name="apple" size={18} color={palette.text} />
          <Text style={[styles.oauthText, { color: palette.text }]}>Continue with Apple</Text>
        </TouchableOpacity>
      </LuxCard>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 17,
  },
  card: {
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    gap: 11,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  toggleButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  toggleText: {
    fontSize: 8,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  toggleCta: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  oauthButton: {
    height: 35,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  oauthText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
});