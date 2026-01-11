import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useTheme } from '@/src/state/theme';
import { Text } from '@/components/Themed';

type TabItem = {
  name: string;
  label: string;
  icon: keyof typeof FontAwesome.glyphMap;
};

const TAB_ITEMS: TabItem[] = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'tasks', label: 'Tasks', icon: 'check-square-o' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar' },
  { name: 'settings', label: 'Settings', icon: 'cog' },
];

function InsightTabBar({ state, navigation }: BottomTabBarProps) {
  const { palette, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index]?.name;

  const barBackground = isDark ? 'rgba(15,19,32,0.95)' : 'rgba(255,255,255,0.94)';
  const barBorder = palette.border;

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
      <Pressable key={tab.name} onPress={onPress} style={styles.tabItem}>
        <FontAwesome name={tab.icon} size={20} color={color} />
        <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
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
          paddingBottom: insets.bottom || 8,
        },
      ]}
    >
      <View style={styles.tabRow}>{TAB_ITEMS.map(renderTab)}</View>
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
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 60,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    fontFamily: 'Figtree',
  },
});
