import React, { useMemo, useRef } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Tabs, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '@/src/state/theme'
import { InsightIcon, type InsightIconName } from '@/src/components/InsightIcon'

type TabItem = {
  name: string
  label: string
  icon: InsightIconName | 'node'
}

const TAB_ITEMS: TabItem[] = [
  { name: 'index', label: 'Dashboard', icon: 'node' },
  { name: 'habits', label: 'Habits', icon: 'smile' },
  { name: 'assistant', label: 'Assistant', icon: 'sparkle' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar' },
  { name: 'tasks', label: 'Tasks', icon: 'check' },
  { name: 'explore', label: 'Explore', icon: 'barChart' },
  { name: 'more', label: 'More', icon: 'dots' },
]

function InsightTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter()
  const { palette, sizes, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const currentRoute = state.routes[state.index]?.name
  const isCaptureActive = currentRoute === 'capture'
  const rotateAnim = useRef(new Animated.Value(0)).current

  const [leftTabs, rightTabs] = useMemo(() => [TAB_ITEMS.slice(0, 3), TAB_ITEMS.slice(3)], [])
  const barBackground = isDark ? 'rgba(15,19,32,0.95)' : 'rgba(255,255,255,0.94)'
  const barBorder = palette.border
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  })

  const renderTab = (tab: TabItem) => {
    const route = state.routes.find((r) => r.name === tab.name)
    if (!route) return null
    const isFocused = currentRoute === tab.name
    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      })

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name as never)
      }
    }

    const color = isFocused ? palette.tint : palette.textSecondary
    return (
      <Pressable key={tab.name} onPress={onPress} style={styles.tabItem}>
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
    )
  }

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
      <View style={styles.tabRow}>
        <View style={styles.tabGroup}>{leftTabs.map(renderTab)}</View>
        <Pressable
          onPress={() => router.push('/voice')}
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
          style={({ pressed }) => [styles.captureButton, pressed && styles.captureButtonPressed]}>
          <Animated.View
            style={[
              styles.captureButtonInner,
              {
                backgroundColor: palette.tint,
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                transform: [{ rotate: rotation }],
              },
              isCaptureActive && styles.captureButtonActive,
            ]}>
            <InsightIcon name="plus" size={sizes.iconSize} color="#FFFFFF" />
          </Animated.View>
        </Pressable>
        <View style={styles.tabGroup}>{rightTabs.map(renderTab)}</View>
      </View>
    </View>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <InsightTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="habits" options={{ title: 'Habits' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="assistant" options={{ title: 'Assistant' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
      <Tabs.Screen name="plan" options={{ href: null }} />
      <Tabs.Screen name="event/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Capture',
          tabBarIcon: ({ color }) => <InsightIcon name="plus" size={22} color={color} />,
        }}
      />
    </Tabs>
  )
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
    minWidth: 30,
    height: 32,
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
})
