import React, { useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { InsightIcon, type InsightIconName } from '@/src/components/InsightIcon';
import { useTheme } from '@/src/state/theme';

type TabItem = {
  name: string;
  label: string;
  icon: InsightIconName | 'node';
};

const TAB_ITEMS: TabItem[] = [
  { name: 'index', label: 'Dashboard', icon: 'node' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar' },
  { name: 'tasks', label: 'Tasks', icon: 'check' },
  { name: 'habits', label: 'Habits', icon: 'target' },
  { name: 'more', label: 'More', icon: 'dots' },
];

function InsightTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const { palette, sizes, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index]?.name;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const [leftTabs, rightTabs] = useMemo(
    () => [TAB_ITEMS.slice(0, 2), TAB_ITEMS.slice(2)],
    []
  );
  const barBackground = palette.glass;
  const barBorder = palette.borderLight;
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const renderTab = (tab: TabItem) => {
    const route = state.routes.find((r) => r.name === tab.name);
    if (!route) return null;
    const isFocused = currentRoute === tab.name;
    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name as never);
      }
    };

    const color = isFocused ? palette.tint : palette.textSecondary;
    return (
      <Pressable key={tab.name} onPress={onPress} style={styles.tabItem} accessibilityLabel={tab.label}>
        {tab.icon === 'node' ? (
          <View
            style={[
              styles.nodeBadge,
              {
                borderColor: isFocused ? palette.tint : palette.border,
                backgroundColor: isFocused ? palette.tintLight : palette.borderLight,
              },
            ]}>
            <Text style={[styles.nodeBadgeText, { color, fontSize: sizes.smallText }]}>1</Text>
          </View>
        ) : (
          <InsightIcon name={tab.icon} size={sizes.iconSizeSmall} color={color} />
        )}
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: barBackground,
          borderColor: barBorder,
          bottom: insets.bottom + 8,
        },
      ]}>
      <View
        pointerEvents="none"
        style={[styles.tabBarSheen, { backgroundColor: palette.tintLight }]}
      />
      <View style={styles.tabRow}>
        <View style={styles.tabGroup}>{leftTabs.map(renderTab)}</View>
        <Pressable
          onPress={() => router.push('/capture')}
          onPressIn={() =>
            Animated.timing(rotateAnim, {
              toValue: 1,
              duration: 180,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }).start()
          }
          onPressOut={() =>
            Animated.timing(rotateAnim, {
              toValue: 0,
              duration: 180,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }).start()
          }
          style={({ pressed }) => [styles.captureButton, pressed && styles.captureButtonPressed]}
          accessibilityLabel="Capture">
          <Animated.View
            style={[
              styles.captureButtonInner,
              {
                backgroundColor: palette.tint,
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                transform: [{ rotate: rotation }],
              },
            ]}>
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
      tabBar={(props) => <InsightTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="habits" options={{ title: 'Habits' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
      <Tabs.Screen name="assistant" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    paddingHorizontal: 6,
    height: 31,
    borderRadius: 11,
    position: 'absolute',
    left: 16,
    right: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 16,
    elevation: 8,
    overflow: 'visible',
    justifyContent: 'center',
  },
  tabBarSheen: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 2,
    borderRadius: 2,
    opacity: 0.6,
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
    minWidth: 24,
    height: 22,
  },
  nodeBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  nodeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  captureButton: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 14,
    elevation: 7,
  },
  captureButtonInner: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  captureButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
});
