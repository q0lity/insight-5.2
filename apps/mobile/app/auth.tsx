/**
 * Auth Screen
 *
 * Authentication screen for signing in/signing up.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { triggerHaptic } from '@/src/utils/haptics';

export default function AuthScreen() {
  const { palette, sizes } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = () => {
    triggerHaptic('medium');
    // Auth logic would go here
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={[styles.logo, { backgroundColor: palette.tint }]}>
            <InsightIcon name="node" size={48} color="#FFFFFF" />
          </View>
          <Text style={[styles.appName, { color: palette.text, fontSize: sizes.headerTitle * 1.5 }]}>
            Insight
          </Text>
          <Text style={[styles.tagline, { color: palette.textSecondary, fontSize: sizes.bodyText }]}>
            Track your time, build your life
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={[styles.inputContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <TextInput
              style={[styles.input, { color: palette.text, fontSize: sizes.bodyText }]}
              placeholder="Email"
              placeholderTextColor={palette.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accessibilityLabel="Email address"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <TextInput
              style={[styles.input, { color: palette.text, fontSize: sizes.bodyText }]}
              placeholder="Password"
              placeholderTextColor={palette.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              accessibilityLabel="Password"
            />
          </View>

          <Pressable
            style={[styles.submitButton, { backgroundColor: palette.tint }]}
            onPress={handleSubmit}
            accessibilityRole="button"
            accessibilityLabel={isSignUp ? 'Sign up' : 'Sign in'}
          >
            <Text style={[styles.submitText, { fontSize: sizes.bodyText }]}>
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setIsSignUp(!isSignUp)}
            style={styles.switchButton}
            accessibilityRole="button"
            accessibilityLabel={isSignUp ? 'Switch to sign in' : 'Switch to sign up'}
          >
            <Text style={[styles.switchText, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  appName: {
    fontWeight: '900',
    letterSpacing: -1,
  },
  tagline: {
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    borderRadius: 16,
    borderWidth: 1,
  },
  input: {
    padding: 16,
    height: 56,
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  switchText: {},
});
