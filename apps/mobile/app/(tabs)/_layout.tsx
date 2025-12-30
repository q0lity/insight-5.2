import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { InsightIcon, type InsightIconName } from '@/src/components/InsightIcon';

type TabItem = {
  name: string;
  label: string;
  icon: InsightIconName | 'node';
};

const TAB_ITEMS: TabItem[] = [
  { name: 'index', label: 'Dashboard', icon: 'node' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar' },
  { name: 'plan', label: 'Tasks', icon: 'check' },
  { name: 'habits', label: 'Habits', icon: 'smile' },
  { name: 'explore', label: 'Explore', icon: 'file' },
  { name: 'more', label: 'More', icon: 'dots' },
];

function InsightTabBar({ state, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const currentRoute = state.routes[state.index]?.name;
  const isCaptureActive = currentRoute === 'capture';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.24] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] });

  const [leftTabs, rightTabs] = useMemo(
    () => [TAB_ITEMS.slice(0, 3), TAB_ITEMS.slice(3)],
    []
  );

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

    const color = isFocused ? palette.tabIconSelected : palette.tabIconDefault;
    return (
      <Pressable key={tab.name} onPress={onPress} style={styles.tabItem}>
        {tab.icon === 'node' ? (
          <View
            style={[
              styles.nodeBadge,
              {
                borderColor: isFocused
                  ? palette.tint
                  : colorScheme === 'dark'
                    ? 'rgba(148,163,184,0.3)'
                    : 'rgba(28,28,30,0.16)',
                backgroundColor: isFocused ? 'rgba(217,93,57,0.18)' : 'rgba(217,93,57,0.08)',
              },
            ]}>
            <Text style={[styles.nodeBadgeText, { color } ]}>1</Text>
          </View>
        ) : (
          <InsightIcon name={tab.icon} size={22} color={color} />
        )}
        <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: palette.background,
          borderTopColor: colorScheme === 'dark' ? 'rgba(148,163,184,0.16)' : 'rgba(28,28,30,0.08)',
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}>
      <View style={styles.tabGroup}>{leftTabs.map(renderTab)}</View>
      <View style={styles.captureSpacer} />
      <View style={styles.tabGroup}>{rightTabs.map(renderTab)}</View>

      <View pointerEvents="none" style={styles.capturePulseWrap}>
        <Animated.View
          style={[
            styles.capturePulse,
            { backgroundColor: palette.tint, opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
          ]}
        />
      </View>

      <Pressable
        onPress={() => navigation.navigate('capture' as never)}
        onPressIn={() =>
          Animated.spring(rotation, { toValue: 1, useNativeDriver: true, friction: 6, tension: 140 }).start()
        }
        onPressOut={() =>
          Animated.spring(rotation, { toValue: 0, useNativeDriver: true, friction: 6, tension: 140 }).start()
        }
        style={({ pressed }) => [
          styles.captureButton,
          {
            backgroundColor: palette.tint,
            borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
          },
          isCaptureActive && styles.captureButtonActive,
          pressed && styles.captureButtonPressed,
        ]}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <InsightIcon name="plus" size={22} color="#FFFFFF" />
        </Animated.View>
      </Pressable>
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
      <Tabs.Screen name="plan" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="habits" options={{ title: 'Habits' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
      <Tabs.Screen name="capture" options={{ href: null }} />
      <Tabs.Screen name="assistant" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  tabGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-around',
  },
  captureSpacer: {
    width: 70,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 52,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  nodeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  nodeBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  capturePulseWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    top: -18,
  },
  capturePulse: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  captureButton: {
    position: 'absolute',
    left: '50%',
    marginLeft: -30,
    top: -26,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 6,
  },
  captureButtonActive: {
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  captureButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
});
