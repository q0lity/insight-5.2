/**
 * Haptics Utility Tests
 *
 * Tests for haptic feedback functions.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import {
  triggerHaptic,
  triggerSelection,
  triggerSuccess,
  triggerWarning,
  triggerError,
} from '@/src/utils/haptics';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

describe('Haptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform.OS to ios for each test
    Platform.OS = 'ios';
  });

  describe('triggerHaptic', () => {
    it('triggers light impact by default', () => {
      triggerHaptic();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('triggers light impact when specified', () => {
      triggerHaptic('light');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('triggers medium impact when specified', () => {
      triggerHaptic('medium');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('triggers heavy impact when specified', () => {
      triggerHaptic('heavy');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
    });

    it('triggers success notification when specified', () => {
      triggerHaptic('success');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    });

    it('triggers warning notification when specified', () => {
      triggerHaptic('warning');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
    });

    it('triggers error notification when specified', () => {
      triggerHaptic('error');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
    });

    it('triggers selection feedback when specified', () => {
      triggerHaptic('selection');
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });

    it('does not trigger on web platform', () => {
      Platform.OS = 'web';
      triggerHaptic('medium');
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it('works on Android', () => {
      Platform.OS = 'android';
      triggerHaptic('medium');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });
  });

  describe('triggerSelection', () => {
    it('calls triggerHaptic with selection style', () => {
      triggerSelection();
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });

    it('does not trigger on web', () => {
      Platform.OS = 'web';
      triggerSelection();
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    });
  });

  describe('triggerSuccess', () => {
    it('calls triggerHaptic with success style', () => {
      triggerSuccess();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    });
  });

  describe('triggerWarning', () => {
    it('calls triggerHaptic with warning style', () => {
      triggerWarning();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
    });
  });

  describe('triggerError', () => {
    it('calls triggerHaptic with error style', () => {
      triggerError();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
    });
  });
});
