/**
 * Voice Capture Screen
 *
 * Modal screen for voice capture and transcription.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from '@/src/components/InsightIcon';
import { triggerHaptic } from '@/src/utils/haptics';

export default function VoiceScreen() {
  const router = useRouter();
  const { palette, sizes } = useTheme();
  const insets = useSafeAreaInsets();
  const [isRecording, setIsRecording] = useState(false);

  const handleRecord = () => {
    triggerHaptic(isRecording ? 'success' : 'medium');
    setIsRecording(!isRecording);
  };

  const handleClose = () => {
    triggerHaptic('light');
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable
          onPress={handleClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close voice capture"
        >
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text, fontSize: sizes.sectionTitle }]}>
          Voice Capture
        </Text>
        <View style={styles.closeButton} />
      </View>

      <View style={styles.content}>
        <Pressable
          onPress={handleRecord}
          style={[
            styles.recordButton,
            { backgroundColor: isRecording ? palette.error : palette.tint },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
          accessibilityState={{ selected: isRecording }}
        >
          <InsightIcon name={isRecording ? 'stop' : 'mic'} size={48} color="#FFFFFF" />
        </Pressable>

        <Text style={[styles.hint, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
          {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
        </Text>

        {isRecording && (
          <View style={styles.waveform}>
            {[...Array(12)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    backgroundColor: palette.tint,
                    height: 20 + Math.random() * 40,
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={[styles.footerText, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
          Voice notes are automatically transcribed and categorized
        </Text>
      </View>
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
    paddingBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  hint: {
    marginTop: 24,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    marginTop: 32,
    gap: 4,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  footer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
  },
});
