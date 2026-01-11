/**
 * Tab Layout with Custom Tab Bar
 *
 * Features:
 * - Custom floating tab bar with center FAB
 * - Reanimated rotation animation on FAB press
 * - Haptic feedback on interactions
 * - Full accessibility support with VoiceOver labels
 * - Safe area handling
 */
import React, { useMemo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, AccessibilityInfo } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

import { useTheme, useReducedMotion } from '@/src/state/theme';
import { InsightIcon, type InsightIconName } from '@/src/components/InsightIcon';
import { triggerHaptic, triggerSelection } from '@/src/utils/haptics';

type TabItem = {
  name: string;
  label: string;
  icon: InsightIconName | 'node';
  accessibilityLabel: string;
};

const TAB_ITEMS: TabItem[] = [
  { name: 'index', label: 'Dashboard', icon: 'node', accessibilityLabel: 'Dashboard, 1 active session' },
  { name: 'habits', label: 'Habits', icon: 'smile', accessibilityLabel: 'Habits' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar', accessibilityLabel: 'Calendar' },
  { name: 'plan', label: 'Tasks', icon: 'check', accessibilityLabel: 'Tasks' },
  { name: 'more', label: 'More', icon: 'dots', accessibilityLabel: 'More options' },
];

function InsightTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const { palette, sizes, isDark } = useTheme();
  const isReducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index]?.name;
  const isCaptureActive = currentRoute === 'capture';

  // Reanimated shared value for FAB rotation
  const rotateProgress = useSharedValue(0);

  const [leftTabs, rightTabs] = useMemo(
    () => [TAB_ITEMS.slice(0, 2), TAB_ITEMS.slice(2)],
    []
  );

  const barBackground = isDark ? 'rgba(15,19,32,0.95)' : 'rgba(255,255,255,0.94)';
  const barBorder = palette.border;

  // Animated style for FAB rotation
  const animatedRotateStyle = useAnimatedStyle(() => {
    if (isReducedMotion) {
      return { transform: [{ rotate: '0deg' }] };
    }
    const rotation = interpolate(rotateProgress.value, [0, 1], [0, 90]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const handleFABPressIn = useCallback(() => {
    triggerHaptic('medium');
    if (!isReducedMotion) {
      rotateProgress.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [isReducedMotion, rotateProgress]);

  const handleFABPressOut = useCallback(() => {
    if (!isReducedMotion) {
      rotateProgress.value = withTiming(0, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [isReducedMotion, rotateProgress]);

  const handleFABPress = useCallback(() => {
    router.push('/voice');
  }, [router]);

  const renderTab = useCallback((tab: TabItem) => {
    const route = state.routes.find((r) => r.name === tab.name);
    if (!route) return null;

    const isFocused = currentRoute === tab.name;
    const color = isFocused ? palette.tint : palette.textSecondary;

    const onPress = () => {
      triggerSelection();

      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name as never);
      }
    };

    return (
      <Pressable
        key={tab.name}
        onPress={onPress}
        style={styles.tabItem}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={tab.accessibilityLabel}
        accessibilityHint={isFocused ? 'Currently selected' : `Navigate to ${tab.label}`}
      >
        {tab.icon === 'node' ? (
          <View
            style={[
              styles.nodeBadge,
              {
                borderColor: isFocused ? palette.tint : palette.border,
                backgroundColor: isFocused ? palette.tintLight : palette.borderLight,
              },
            ]}
          >
            <Text
              style={[styles.nodeBadgeText, { color, fontSize: sizes.smallText }]}
              accessibilityElementsHidden
            >
              1
            </Text>
          </View>
        ) : (
          <InsightIcon name={tab.icon} size={sizes.iconSizeSmall} color={color} />
        )}
      </Pressable>
    );
  }, [state.routes, currentRoute, palette, sizes, navigation]);

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: barBackground,
          borderColor: barBorder,
          bottom: insets.bottom + 8,
        },
      ]}
      accessibilityRole="tablist"
    >
      <View style={styles.tabRow}>
        <View style={styles.tabGroup}>{leftTabs.map(renderTab)}</View>

        {/* Center FAB */}
        <Pressable
          onPress={handleFABPress}
          onPressIn={handleFABPressIn}
          onPressOut={handleFABPressOut}
          style={({ pressed }) => [styles.captureButton, pressed && styles.captureButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Capture"
          accessibilityHint="Open voice capture or quick add"
        >
          <Animated.View
            style={[
              styles.captureButtonInner,
              animatedRotateStyle,
              {
                backgroundColor: palette.tint,
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
              },
              isCaptureActive && styles.captureButtonActive,
            ]}
          >
            <InsightIcon name="plus" size={sizes.iconSize} color="#FFFFFF" />
          </Animated.View>
        </Pressable>

        <View style={styles.tabGroup}>{rightTabs.map(renderTab)}</View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <InsightTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="habits" options={{ title: 'Habits' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="plan" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="event/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Capture',
          tabBarIcon: ({ color }) => <InsightIcon name="plus" size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="assistant" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    paddingHorizontal: 8,
    height: 44,
    borderRadius: 16,
    position: 'absolute',
    left: 16,
    right: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
    overflow: 'visible',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  tabGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44, // Minimum touch target for accessibility
    height: 44,
  },
  nodeBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  nodeBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  captureButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 7,
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  captureButtonActive: {
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  captureButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
});
