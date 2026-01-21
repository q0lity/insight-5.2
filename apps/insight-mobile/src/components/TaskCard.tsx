import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, Platform, Vibration } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from './InsightIcon';
import { ANIMATION } from '@/src/constants/design-tokens';
import type { MobileTask, MobileTaskStatus } from '@/src/storage/tasks';

// Priority colors
const PRIORITY_COLORS: Record<number, string> = {
  1: '#6B7280', // Low - Gray
  2: '#6B7280',
  3: '#6B7280',
  4: '#3B82F6', // Medium - Blue
  5: '#3B82F6',
  6: '#3B82F6',
  7: '#F59E0B', // High - Yellow/Amber
  8: '#F59E0B',
  9: '#EF4444', // Critical - Red
  10: '#EF4444',
};

// Status colors and icons
const STATUS_CONFIG: Record<
  MobileTaskStatus,
  { color: string; icon: string; label: string }
> = {
  todo: { color: '#6B7280', icon: 'circle', label: 'To Do' },
  in_progress: { color: '#3B82F6', icon: 'play-circle', label: 'In Progress' },
  done: { color: '#22C55E', icon: 'check-circle', label: 'Done' },
  canceled: { color: '#9CA3AF', icon: 'x-circle', label: 'Canceled' },
};

type TaskCardProps = {
  task: MobileTask;
  onPress?: () => void;
  onToggleDone?: () => void;
  compact?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatDueDate(ms: number | null | undefined) {
  if (!ms) return null;

  const now = new Date();
  const due = new Date(ms);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round(
    (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return { label: 'Overdue', isOverdue: true };
  if (diffDays === 0) return { label: 'Today', isOverdue: false };
  if (diffDays === 1) return { label: 'Tomorrow', isOverdue: false };
  if (diffDays <= 7) return { label: `${diffDays} days`, isOverdue: false };

  return {
    label: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    isOverdue: false,
  };
}

function computeXp(task: MobileTask) {
  const importance = task.importance ?? 5;
  const difficulty = task.difficulty ?? 5;
  const duration = task.estimateMinutes ?? 30;
  // Simple XP formula based on importance, difficulty, and duration
  const base = importance * difficulty;
  const durationBonus = Math.floor(duration / 15);
  return base + durationBonus;
}

export function TaskCard({
  task,
  onPress,
  onToggleDone,
  compact = false,
}: TaskCardProps) {
  const { palette, sizes } = useTheme();

  // Animation values
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const checkScale = useSharedValue(1);
  const checkProgress = useSharedValue(task.status === 'done' ? 1 : 0);

  // Simple haptic feedback
  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10);
    }
  }, []);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, {
      damping: ANIMATION.spring.damping,
      stiffness: ANIMATION.spring.stiffness,
    });
    translateY.value = withSpring(-2, {
      damping: ANIMATION.spring.damping,
      stiffness: ANIMATION.spring.stiffness,
    });
  }, [scale, translateY]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {
      damping: ANIMATION.spring.damping,
      stiffness: ANIMATION.spring.stiffness,
    });
    translateY.value = withSpring(0, {
      damping: ANIMATION.spring.damping,
      stiffness: ANIMATION.spring.stiffness,
    });
  }, [scale, translateY]);

  const handleCheckPress = useCallback(() => {
    triggerHaptic();

    // Animate checkmark: 1 -> 1.2 -> 1
    checkScale.value = withSequence(
      withSpring(1.2, {
        damping: ANIMATION.spring.damping,
        stiffness: ANIMATION.spring.stiffness,
      }),
      withSpring(1, {
        damping: ANIMATION.spring.damping,
        stiffness: ANIMATION.spring.stiffness,
      })
    );

    // Toggle check progress
    const newDone = task.status !== 'done';
    checkProgress.value = withTiming(newDone ? 1 : 0, {
      duration: ANIMATION.normal,
    });

    onToggleDone?.();
  }, [task.status, checkScale, checkProgress, onToggleDone, triggerHaptic]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    backgroundColor: interpolateColor(
      checkProgress.value,
      [0, 1],
      ['transparent', palette.success]
    ),
    borderColor: interpolateColor(
      checkProgress.value,
      [0, 1],
      [palette.border, palette.success]
    ),
  }));

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkProgress.value,
    transform: [{ scale: checkProgress.value }],
  }));

  // Priority indicator
  const importance = task.importance ?? 5;
  const priorityColor = PRIORITY_COLORS[importance] ?? PRIORITY_COLORS[5];
  const isPriorityHigh = importance >= 7;

  // Status config
  const statusConfig = STATUS_CONFIG[task.status];

  // Due date
  const dueInfo = formatDueDate(task.dueAt);

  // XP calculation
  const xp = computeXp(task);

  // Determine accent color (priority for high, status for others)
  const accentColor = isPriorityHigh ? priorityColor : statusConfig.color;

  if (compact) {
    // Compact variant for lists
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.compactContainer,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            borderRadius: sizes.borderRadius,
            padding: sizes.cardPadding,
          },
          cardAnimatedStyle,
        ]}
      >
        {/* Priority indicator dot */}
        <View
          style={[
            styles.priorityDot,
            {
              backgroundColor: priorityColor,
              width: sizes.iconSizeTiny,
              height: sizes.iconSizeTiny,
              borderRadius: sizes.iconSizeTiny / 2,
            },
          ]}
        />

        {/* Content */}
        <View style={styles.compactContent}>
          <Text
            style={[
              styles.compactTitle,
              {
                color: palette.text,
                fontSize: sizes.bodyText,
                textDecorationLine:
                  task.status === 'done' ? 'line-through' : 'none',
                opacity: task.status === 'done' ? 0.6 : 1,
              },
            ]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          <View style={styles.compactMeta}>
            {dueInfo && (
              <Text
                style={[
                  styles.compactDue,
                  {
                    color: dueInfo.isOverdue ? palette.error : palette.textSecondary,
                    fontSize: sizes.tinyText,
                  },
                ]}
              >
                {dueInfo.label}
              </Text>
            )}
            <Text
              style={[
                styles.compactXp,
                { color: palette.success, fontSize: sizes.tinyText },
              ]}
            >
              +{xp} XP
            </Text>
          </View>
        </View>

        {/* Checkbox */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleCheckPress();
          }}
          hitSlop={8}
        >
          <Animated.View
            style={[
              styles.checkbox,
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
              <Text
                style={[styles.checkmark, { fontSize: sizes.iconSizeSmall }]}
              >
                {'\u2713'}
              </Text>
            </Animated.View>
          </Animated.View>
        </Pressable>
      </AnimatedPressable>
    );
  }

  // Full variant
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderRadius: sizes.borderRadius,
          padding: sizes.cardPadding,
        },
        cardAnimatedStyle,
      ]}
    >
      {/* Left accent bar (priority-based) */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      {/* Header: Title + Checkbox */}
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          {/* Priority indicator */}
          {isPriorityHigh && (
            <View
              style={[
                styles.priorityBadge,
                {
                  backgroundColor: `${priorityColor}20`,
                  borderRadius: sizes.borderRadiusSmall,
                },
              ]}
            >
              <View
                style={[styles.priorityDotSmall, { backgroundColor: priorityColor }]}
              />
              <Text
                style={[
                  styles.priorityText,
                  { color: priorityColor, fontSize: sizes.tinyText },
                ]}
              >
                P{11 - importance}
              </Text>
            </View>
          )}
          <Text
            style={[
              styles.title,
              {
                color: palette.text,
                fontSize: sizes.sectionTitle,
                textDecorationLine:
                  task.status === 'done' ? 'line-through' : 'none',
                opacity: task.status === 'done' ? 0.6 : 1,
              },
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
        </View>

        {/* Animated checkbox */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleCheckPress();
          }}
          hitSlop={12}
        >
          <Animated.View
            style={[
              styles.checkbox,
              {
                width: sizes.buttonHeightSmall,
                height: sizes.buttonHeightSmall,
                borderRadius: sizes.borderRadiusSmall,
                borderWidth: 2,
              },
              checkAnimatedStyle,
            ]}
          >
            <Animated.View style={checkmarkAnimatedStyle}>
              <Text style={[styles.checkmark, { fontSize: sizes.iconSize }]}>
                {'\u2713'}
              </Text>
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>

      {/* Badges row: Status, Due date, XP */}
      <View style={styles.badgesRow}>
        {/* Status badge */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: `${statusConfig.color}20`,
              borderRadius: sizes.borderRadiusSmall,
              paddingHorizontal: sizes.chipPadding,
            },
          ]}
        >
          <InsightIcon
            name={statusConfig.icon}
            size={sizes.iconSizeTiny}
            color={statusConfig.color}
          />
          <Text
            style={[
              styles.statusText,
              { color: statusConfig.color, fontSize: sizes.tinyText },
            ]}
          >
            {statusConfig.label}
          </Text>
        </View>

        {/* Due date badge */}
        {dueInfo && (
          <View
            style={[
              styles.dueBadge,
              {
                backgroundColor: dueInfo.isOverdue
                  ? `${palette.error}20`
                  : `${palette.warning}15`,
                borderRadius: sizes.borderRadiusSmall,
                paddingHorizontal: sizes.chipPadding,
              },
            ]}
          >
            <InsightIcon
              name="calendar"
              size={sizes.iconSizeTiny}
              color={dueInfo.isOverdue ? palette.error : palette.warning}
            />
            <Text
              style={[
                styles.dueText,
                {
                  color: dueInfo.isOverdue ? palette.error : palette.warning,
                  fontSize: sizes.tinyText,
                },
              ]}
            >
              {dueInfo.label}
            </Text>
          </View>
        )}

        {/* XP badge */}
        <View
          style={[
            styles.xpBadge,
            {
              backgroundColor: `${palette.success}15`,
              borderRadius: sizes.borderRadiusSmall,
              paddingHorizontal: sizes.chipPadding,
            },
          ]}
        >
          <Text
            style={[
              styles.xpText,
              { color: palette.success, fontSize: sizes.smallText },
            ]}
          >
            +{xp} XP
          </Text>
        </View>
      </View>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {task.tags.slice(0, 4).map((tag) => (
            <View
              key={tag}
              style={[
                styles.tagPill,
                {
                  backgroundColor: `${accentColor}15`,
                  borderRadius: sizes.borderRadiusSmall,
                  paddingHorizontal: sizes.chipPadding,
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: accentColor, fontSize: sizes.tinyText },
                ]}
              >
                #{tag}
              </Text>
            </View>
          ))}
          {task.tags.length > 4 && (
            <Text
              style={[
                styles.moreTagsText,
                { color: palette.textSecondary, fontSize: sizes.tinyText },
              ]}
            >
              +{task.tags.length - 4}
            </Text>
          )}
        </View>
      )}

      {/* Footer: Estimate, Category, Project */}
      <View style={styles.footer}>
        {task.estimateMinutes && (
          <View style={styles.metaItem}>
            <InsightIcon
              name="clock"
              size={sizes.iconSizeTiny}
              color={palette.textSecondary}
            />
            <Text
              style={[
                styles.metaText,
                { color: palette.textSecondary, fontSize: sizes.tinyText },
              ]}
            >
              {task.estimateMinutes}m
            </Text>
          </View>
        )}
        {task.category && (
          <View style={styles.metaItem}>
            <View
              style={[styles.categoryDot, { backgroundColor: accentColor }]}
            />
            <Text
              style={[
                styles.metaText,
                { color: palette.textSecondary, fontSize: sizes.tinyText },
              ]}
            >
              {task.category}
            </Text>
          </View>
        )}
        {task.project && (
          <View style={styles.metaItem}>
            <InsightIcon
              name="folder"
              size={sizes.iconSizeTiny}
              color={palette.textSecondary}
            />
            <Text
              style={[
                styles.metaText,
                { color: palette.textSecondary, fontSize: sizes.tinyText },
              ]}
            >
              {task.project}
            </Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: 'hidden',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingLeft: 8,
  },
  titleBlock: {
    flex: 1,
    gap: 6,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontWeight: '700',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  title: {
    fontWeight: '800',
    fontFamily: 'Figtree',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  checkbox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  statusText: {
    fontWeight: '700',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  dueText: {
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  xpBadge: {
    paddingVertical: 4,
  },
  xpText: {
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingLeft: 8,
  },
  tagPill: {
    paddingVertical: 3,
  },
  tagText: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  moreTagsText: {
    fontWeight: '600',
    fontFamily: 'Figtree',
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingLeft: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metaText: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  // Compact variant styles
  compactContainer: {
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
  priorityDot: {},
  compactContent: {
    flex: 1,
    gap: 2,
  },
  compactTitle: {
    fontWeight: '700',
    fontFamily: 'Figtree',
    letterSpacing: -0.3,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactDue: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  compactXp: {
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
});
