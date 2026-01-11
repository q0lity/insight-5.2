/**
 * Haptic Feedback Utilities
 *
 * Provides platform-appropriate haptic feedback for user interactions.
 * Uses expo-haptics for a consistent experience across iOS and Android.
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

/**
 * Trigger haptic feedback with the specified style
 */
export function triggerHaptic(style: HapticStyle = 'light'): void {
  // Skip on web
  if (Platform.OS === 'web') return;

  switch (style) {
    case 'light':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'error':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    case 'selection':
      void Haptics.selectionAsync();
      break;
    default:
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/**
 * Trigger selection feedback (lighter than impact)
 */
export function triggerSelection(): void {
  triggerHaptic('selection');
}

/**
 * Trigger success feedback
 */
export function triggerSuccess(): void {
  triggerHaptic('success');
}

/**
 * Trigger warning feedback
 */
export function triggerWarning(): void {
  triggerHaptic('warning');
}

/**
 * Trigger error feedback
 */
export function triggerError(): void {
  triggerHaptic('error');
}
