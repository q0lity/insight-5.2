import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, LayoutAnimation, Platform, UIManager, Vibration } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from './InsightIcon';
import { ANIMATION } from '@/src/constants/design-tokens';
import type { HabitDef } from '../storage/habits';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type HabitCardVariant = 'full' | 'simple';

type HabitCardProps = {
  habit: HabitDef;
  streak: number;
  heatmapData: { date: string; value: number; positive: number; negative: number }[];
  todayLogs: number;
  onPlus: () => void;
  onMinus: () => void;
  onStartTimed?: () => void;
  onStopTimed?: () => void;
  onPress: () => void;
  variant?: HabitCardVariant;
};

// Simple variant component - RoutineItem-style row
function HabitCardSimple({
  habit,
  streak,
  todayLogs,
  onPlus,
  onPress,
}: {
  habit: HabitDef;
  streak: number;
  todayLogs: number;
  onPlus: () => void;
  onPress: () => void;
}) {
  const { palette, sizes, isDark } = useTheme();

  const accentColor = habit.color || '#22C55E';
  const isCompleted = todayLogs > 0;

  // Animation values
  const checkScale = useSharedValue(1);
  const checkProgress = useSharedValue(isCompleted ? 1 : 0);

  // Simple haptic feedback using Vibration API
  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10);
    }
  }, []);

  const handleCheckPress = useCallback(() => {
    triggerHaptic();

    // Animate checkmark scale: 1 -> 1.2 -> 1
    checkScale.value = withSequence(
      withSpring(1.2, { damping: ANIMATION.spring.damping, stiffness: ANIMATION.spring.stiffness }),
      withSpring(1, { damping: ANIMATION.spring.damping, stiffness: ANIMATION.spring.stiffness })
    );

    // Animate check progress for color transition
    checkProgress.value = withTiming(isCompleted ? 0 : 1, { duration: ANIMATION.normal });

    onPlus();
  }, [isCompleted, checkScale, checkProgress, onPlus, triggerHaptic]);

  // Animated styles
  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    backgroundColor: interpolateColor(
      checkProgress.value,
      [0, 1],
      ['transparent', accentColor]
    ),
    borderColor: interpolateColor(
      checkProgress.value,
      [0, 1],
      [palette.border, accentColor]
    ),
  }));

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkProgress.value,
    transform: [{ scale: checkProgress.value }],
  }));

  // Check if icon is emoji
  const isEmoji = habit.icon
    ? /^[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(habit.icon)
    : false;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.simpleContainer,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderRadius: sizes.borderRadius,
          padding: sizes.cardPadding,
        },
      ]}
    >
      {/* Icon Circle */}
      <View
        style={[
          styles.simpleIconCircle,
          {
            backgroundColor: `${accentColor}20`,
            width: sizes.buttonHeight,
            height: sizes.buttonHeight,
            borderRadius: sizes.buttonHeight / 2,
          },
        ]}
      >
        {habit.icon ? (
          isEmoji ? (
            <Text style={[styles.simpleIconEmoji, { fontSize: sizes.iconSize }]}>{habit.icon}</Text>
          ) : (
            <Text style={[styles.simpleIconText, { color: accentColor, fontSize: sizes.iconSizeSmall }]}>
              {habit.icon}
            </Text>
          )
        ) : (
          <InsightIcon name="target" size={sizes.iconSizeSmall} color={accentColor} />
        )}
      </View>

      {/* Content */}
      <View style={styles.simpleContent}>
        <Text
          style={[
            styles.simpleName,
            {
              color: palette.text,
              fontSize: sizes.bodyText,
              textDecorationLine: isCompleted ? 'line-through' : 'none',
              opacity: isCompleted ? 0.6 : 1,
            },
          ]}
          numberOfLines={1}
        >
          {habit.name}
        </Text>
      </View>

      {/* Streak Badge */}
      {streak > 0 && (
        <View
          style={[
            styles.simpleStreakBadge,
            {
              backgroundColor: `${palette.warning}15`,
              paddingHorizontal: sizes.chipPadding,
              paddingVertical: sizes.spacingSmall / 2,
              borderRadius: sizes.borderRadiusSmall,
            },
          ]}
        >
          <Text style={[styles.simpleStreakIcon, { fontSize: sizes.smallText }]}>{'\uD83D\uDD25'}</Text>
          <Text style={[styles.simpleStreakText, { color: palette.warning, fontSize: sizes.smallText }]}>
            {streak}
          </Text>
        </View>
      )}

      {/* Checkmark Circle */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          handleCheckPress();
        }}
        hitSlop={8}
      >
        <Animated.View
          style={[
            styles.simpleCheckCircle,
            {
              width: sizes.iconSize + 8,
              height: sizes.iconSize + 8,
              borderRadius: (sizes.iconSize + 8) / 2,
              borderWidth: 2,
            },
            checkAnimatedStyle,
          ]}
        >
          <Animated.View style={checkmarkAnimatedStyle}>
            <Text style={[styles.simpleCheckmark, { fontSize: sizes.iconSizeSmall }]}>{'\u2713'}</Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Pressable>
  );
}

export function HabitCard({
  habit,
  streak,
  heatmapData,
  todayLogs,
  onPlus,
  onMinus,
  onStartTimed,
  onStopTimed,
  onPress,
  variant = 'full',
}: HabitCardProps) {
  // Render simple variant if requested
  if (variant === 'simple') {
    return (
      <HabitCardSimple
        habit={habit}
        streak={streak}
        todayLogs={todayLogs}
        onPlus={onPlus}
        onPress={onPress}
      />
    );
  }
  const { palette, sizes, isDark } = useTheme();

  const [isExpanded, setIsExpanded] = useState(false);

  const showPlusButton = habit.polarity === 'positive' || habit.polarity === 'both';
  const showMinusButton = habit.polarity === 'negative' || habit.polarity === 'both';
  const showTimedButtons = habit.isTimed;

  const accentColor = habit.color || '#22C55E';

  // Get the last 28 days for mini heatmap
  const miniHeatmapDays = heatmapData.slice(-28);

  const getHeatmapCellColor = (value: number) => {
    if (value > 0) {
      return accentColor;
    }
    if (value < 0) {
      return isDark ? 'rgba(239, 68, 68, 0.7)' : 'rgba(239, 68, 68, 0.6)';
    }
    return isDark ? 'rgba(148,163,184,0.1)' : 'rgba(28,28,30,0.05)';
  };

  // Simple haptic feedback using Vibration API
  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10);
    }
  }, []);

  const handlePlusPress = useCallback(() => {
    triggerHaptic();
    if (showTimedButtons) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsExpanded(!isExpanded);
    } else {
      onPlus();
    }
  }, [showTimedButtons, isExpanded, onPlus, triggerHaptic]);

  const handleStartPress = useCallback(() => {
    triggerHaptic();
    onStartTimed?.();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(false);
  }, [onStartTimed, triggerHaptic]);

  const handleStopPress = useCallback(() => {
    triggerHaptic();
    onStopTimed?.();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(false);
  }, [onStopTimed, triggerHaptic]);

  const handleMinusPress = useCallback(() => {
    triggerHaptic();
    onMinus();
  }, [onMinus, triggerHaptic]);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderRadius: sizes.borderRadius,
          padding: sizes.cardPadding,
          gap: sizes.rowGap,
        },
      ]}>
      {/* Header Row - Title and Streak */}
      <View style={styles.header}>
        <Text style={[styles.name, { color: palette.text, fontSize: sizes.sectionTitle }]} numberOfLines={1}>
          {habit.name}
        </Text>
        {streak > 0 && (
          <View style={[styles.streakBadge, { gap: sizes.spacingSmall / 3 }]}>
            <Text style={[styles.streakIcon, { fontSize: sizes.bodyText }]}>🔥</Text>
            <Text style={[styles.streakText, { color: palette.warning, fontSize: sizes.bodyText }]}>{streak}</Text>
          </View>
        )}
      </View>

      {/* Content Row - Heatmap on Left, Buttons on Right */}
      <View style={[styles.contentRow, { gap: sizes.rowGap }]}>
        {/* Left: Heatmap + Negative Button */}
        <View style={[styles.leftColumn, { gap: sizes.spacingSmall }]}>
          <View style={[styles.heatmapContainer, { gap: sizes.spacingSmall / 2 }]}>
            <View style={[styles.heatmapGrid, { gap: sizes.heatmapGap }]}>
              {miniHeatmapDays.map((day) => (
                <View
                  key={day.date}
                  style={[
                    styles.heatmapCell,
                    {
                      backgroundColor: getHeatmapCellColor(day.value),
                      width: sizes.heatmapCell,
                      height: sizes.heatmapCell,
                      borderRadius: sizes.heatmapCell / 4,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.heatmapLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
              Last 28 days
            </Text>
          </View>

          {/* Negative Button - Below heatmap on left */}
          {showMinusButton && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleMinusPress();
              }}
              style={[
                styles.minusButton,
                {
                  backgroundColor: `${palette.error}15`,
                  paddingHorizontal: sizes.chipPadding,
                  paddingVertical: sizes.spacingSmall,
                  borderRadius: sizes.borderRadiusSmall,
                  gap: sizes.spacingSmall / 2,
                }
              ]}>
              <InsightIcon name="minus" size={sizes.iconSizeTiny} color={palette.error} />
              <Text style={[styles.minusText, { color: palette.error, fontSize: sizes.smallText }]}>−1</Text>
            </Pressable>
          )}
        </View>

        {/* Right: Plus/Start/Stop Buttons */}
        <View style={[styles.buttonsColumn, { gap: sizes.spacingSmall }]}>
          {/* Plus Button - Main action */}
          {showPlusButton && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handlePlusPress();
              }}
              style={[
                styles.mainButton,
                {
                  backgroundColor: todayLogs > 0 ? accentColor : `${accentColor}15`,
                  borderColor: accentColor,
                  borderWidth: todayLogs > 0 ? 0 : 2,
                  width: sizes.buttonHeight,
                  height: sizes.buttonHeight,
                  borderRadius: sizes.borderRadiusSmall,
                },
              ]}>
              <InsightIcon name="plus" size={sizes.iconSize} color={todayLogs > 0 ? '#FFFFFF' : accentColor} />
              {todayLogs > 0 && (
                <Text style={[styles.logCount, { fontSize: sizes.smallText }]}>×{todayLogs}</Text>
              )}
            </Pressable>
          )}

          {/* Expanded Timed Buttons - Show when expanded */}
          {isExpanded && showTimedButtons && (
            <View style={[styles.expandedButtons, { gap: sizes.spacingSmall }]}>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleStartPress();
                }}
                style={[
                  styles.timedButton,
                  {
                    backgroundColor: accentColor,
                    paddingHorizontal: sizes.cardPadding,
                    paddingVertical: sizes.spacingSmall,
                    borderRadius: sizes.borderRadiusSmall,
                    gap: sizes.spacingSmall / 2,
                  }
                ]}>
                <InsightIcon name="play" size={sizes.iconSizeTiny} color="#FFFFFF" />
                <Text style={[styles.timedButtonTextWhite, { fontSize: sizes.smallText }]}>Start</Text>
              </Pressable>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleStopPress();
                }}
                style={[
                  styles.timedButton,
                  {
                    backgroundColor: palette.borderLight,
                    paddingHorizontal: sizes.cardPadding,
                    paddingVertical: sizes.spacingSmall,
                    borderRadius: sizes.borderRadiusSmall,
                    gap: sizes.spacingSmall / 2,
                  }
                ]}>
                <View style={[styles.stopIcon, { backgroundColor: palette.textSecondary, width: sizes.iconSizeTiny - 4, height: sizes.iconSizeTiny - 4 }]} />
                <Text style={[styles.timedButtonText, { color: palette.text, fontSize: sizes.smallText }]}>Stop</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Figtree',
    letterSpacing: -0.3,
    flex: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakIcon: {
    fontSize: 10,
  },
  streakText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  leftColumn: {
    flex: 1,
    gap: 7,
  },
  buttonsColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  mainButton: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  logCount: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
    marginLeft: 2,
  },
  expandedButtons: {
    gap: 6,
    alignItems: 'flex-end',
  },
  timedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 63,
  },
  timedButtonText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  timedButtonTextWhite: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  minusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 7,
    alignSelf: 'flex-start',
  },
  minusText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Figtree',
    color: '#EF4444',
  },
  heatmapContainer: {
    gap: 4,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: 126,
  },
  heatmapCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  heatmapLabel: {
    fontSize: 8,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  // Simple variant styles
  simpleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  simpleIconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleIconEmoji: {
    textAlign: 'center',
  },
  simpleIconText: {
    fontWeight: '700',
    fontFamily: 'Figtree',
    textAlign: 'center',
  },
  simpleContent: {
    flex: 1,
    gap: 2,
  },
  simpleName: {
    fontWeight: '700',
    fontFamily: 'Figtree',
    letterSpacing: -0.3,
  },
  simpleStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  simpleStreakIcon: {
    textAlign: 'center',
  },
  simpleStreakText: {
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  simpleCheckCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleCheckmark: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
