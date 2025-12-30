import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import Colors from '@/constants/Colors';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { getSupabaseClient } from '@/src/supabase/client';

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
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

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
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
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
      <View style={[styles.card, { backgroundColor: isDark ? '#111726' : '#FFFFFF' }]}>
        <View style={styles.logoRow}>
          <View style={[styles.logoBadge, { backgroundColor: palette.tint }]}>
            <Text style={styles.logoText}>i</Text>
          </View>
          <Text style={[styles.title, { color: palette.text }]}>Insight</Text>
        </View>

        <Text style={[styles.subtitle, { color: palette.tabIconDefault }]}>
          {isSignup ? 'Create an account to sync across desktop + mobile.' : 'Sign in to sync across desktop + mobile.'}
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: palette.text }]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={palette.tabIconDefault}
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#0c1220' : '#F7F4F0',
                borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.06)',
                color: palette.text,
              },
            ]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: palette.text }]}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={palette.tabIconDefault}
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#0c1220' : '#F7F4F0',
                borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.06)',
                color: palette.text,
              },
            ]}
          />
        </View>

        {isSignup ? (
          <View style={styles.field}>
            <Text style={[styles.label, { color: palette.text }]}>Confirm Password</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={palette.tabIconDefault}
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#0c1220' : '#F7F4F0',
                  borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(28,28,30,0.06)',
                  color: palette.text,
                },
              ]}
            />
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleEmailAuth}
          disabled={busy}
          style={[styles.primaryButton, { backgroundColor: palette.tint, opacity: busy ? 0.7 : 1 }]}
        >
          <Text style={styles.primaryButtonText}>
            {busy ? (isSignup ? 'Creating account…' : 'Signing in…') : isSignup ? 'Create Account' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleText, { color: palette.tabIconDefault }]}>
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
          <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(148,163,184,0.25)' : 'rgba(28,28,30,0.1)' }]} />
          <Text style={[styles.dividerText, { color: palette.tabIconDefault }]}>or</Text>
          <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(148,163,184,0.25)' : 'rgba(28,28,30,0.1)' }]} />
        </View>

        <TouchableOpacity
          onPress={() => void handleOAuth('google')}
          disabled={busy}
          style={[styles.oauthButton, { borderColor: palette.tint }]}
        >
          <InsightIcon name="sparkle" size={18} color={palette.tint} />
          <Text style={[styles.oauthText, { color: palette.text }]}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => void handleOAuth('apple')}
          disabled={busy}
          style={[styles.oauthButton, { borderColor: palette.tint }]}
        >
          <InsightIcon name="sparkle" size={18} color={palette.tint} />
          <Text style={[styles.oauthText, { color: palette.text }]}>Continue with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => void handleOAuth('azure')}
          disabled={busy}
          style={[styles.oauthButton, { borderColor: palette.tint }]}
        >
          <InsightIcon name="sparkle" size={18} color={palette.tint} />
          <Text style={[styles.oauthText, { color: palette.text }]}>Continue with Microsoft</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    gap: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  input: {
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 15,
    fontFamily: 'Figtree',
  },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  toggleButton: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  toggleCta: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  oauthButton: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  oauthText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
});
