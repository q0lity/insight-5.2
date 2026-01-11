import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, LayoutAnimation, Platform, UIManager, Vibration } from 'react-native';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from './InsightIcon';
import type { HabitDef } from '../storage/habits';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
};

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
}: HabitCardProps) {
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
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 14,
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
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Figtree',
    letterSpacing: -0.3,
    flex: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  streakIcon: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  leftColumn: {
    flex: 1,
    gap: 10,
  },
  buttonsColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  mainButton: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  logCount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
    marginLeft: 2,
  },
  expandedButtons: {
    gap: 8,
    alignItems: 'flex-end',
  },
  timedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 90,
  },
  timedButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  timedButtonTextWhite: {
    fontSize: 14,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  minusText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree',
    color: '#EF4444',
  },
  heatmapContainer: {
    gap: 6,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    maxWidth: 180,
  },
  heatmapCell: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  heatmapLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
});
