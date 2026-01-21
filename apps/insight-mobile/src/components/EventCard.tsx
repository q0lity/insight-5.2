import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from './InsightIcon';
import { ANIMATION } from '@/src/constants/design-tokens';
import type { MobileEvent, MobileEventKind } from '@/src/storage/events';

// Category colors for visual distinction
const CATEGORY_COLORS: Record<string, string> = {
  work: '#3B82F6',
  health: '#22C55E',
  personal: '#E26B3A',
  learning: '#8B5CF6',
  transport: '#6B7280',
  finance: '#F59E0B',
  default: '#64748B',
};

// Category icons
const CATEGORY_ICONS: Record<string, string> = {
  work: 'briefcase',
  health: 'heart',
  personal: 'user',
  learning: 'book',
  transport: 'car',
  finance: 'dollar-sign',
  default: 'calendar',
};

// Kind icons
const KIND_ICONS: Record<MobileEventKind, string> = {
  event: 'calendar',
  task: 'check-square',
  log: 'file-text',
  episode: 'play',
};

type EventCardProps = {
  event: MobileEvent;
  onPress?: () => void;
  compact?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatTime(ms: number) {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  const hour = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? 'AM' : 'PM';
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

function formatDuration(startMs: number, endMs: number | null) {
  if (!endMs) return 'In progress';
  const durationMins = Math.round((endMs - startMs) / 60000);
  if (durationMins < 60) return `${durationMins}m`;
  const hours = Math.floor(durationMins / 60);
  const mins = durationMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatDate(ms: number) {
  const today = new Date();
  const date = new Date(ms);
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function EventCard({ event, onPress, compact = false }: EventCardProps) {
  const { palette, sizes, isDark } = useTheme();

  // Animation values for hover/press effect
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  // Get category color and icon
  const categoryKey = (event.category ?? 'default').toLowerCase();
  const accentColor = CATEGORY_COLORS[categoryKey] ?? CATEGORY_COLORS.default;
  const categoryIcon = CATEGORY_ICONS[categoryKey] ?? CATEGORY_ICONS.default;
  const kindIcon = KIND_ICONS[event.kind] ?? KIND_ICONS.event;

  // Time formatting
  const startTime = formatTime(event.startAt);
  const endTime = event.endAt ? formatTime(event.endAt) : null;
  const duration = formatDuration(event.startAt, event.endAt);
  const dateLabel = formatDate(event.startAt);

  // Active/in-progress state
  const isActive = event.active && !event.endAt;

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
            borderColor: isActive ? accentColor : palette.border,
            borderRadius: sizes.borderRadius,
            padding: sizes.cardPadding,
          },
          animatedStyle,
        ]}
      >
        {/* Time prominence */}
        <View style={styles.compactTimeCol}>
          <Text
            style={[
              styles.compactTime,
              { color: palette.text, fontSize: sizes.sectionTitle },
            ]}
          >
            {startTime}
          </Text>
          {endTime && (
            <Text
              style={[
                styles.compactTimeEnd,
                { color: palette.textSecondary, fontSize: sizes.tinyText },
              ]}
            >
              {endTime}
            </Text>
          )}
        </View>

        {/* Content */}
        <View style={styles.compactContent}>
          <View style={styles.compactTitleRow}>
            <View
              style={[
                styles.compactIcon,
                {
                  backgroundColor: `${accentColor}20`,
                  borderRadius: sizes.borderRadiusSmall,
                },
              ]}
            >
              <InsightIcon
                name={categoryIcon}
                size={sizes.iconSizeSmall}
                color={accentColor}
              />
            </View>
            <Text
              style={[
                styles.compactTitle,
                { color: palette.text, fontSize: sizes.bodyText },
              ]}
              numberOfLines={1}
            >
              {event.title}
            </Text>
          </View>
          <View style={styles.compactMeta}>
            <Text
              style={[
                styles.compactDuration,
                { color: palette.textSecondary, fontSize: sizes.smallText },
              ]}
            >
              {duration}
            </Text>
            {event.category && (
              <Text
                style={[
                  styles.compactCategory,
                  { color: accentColor, fontSize: sizes.tinyText },
                ]}
              >
                {event.category}
              </Text>
            )}
          </View>
        </View>

        {/* Active indicator */}
        {isActive && (
          <View
            style={[styles.activeIndicator, { backgroundColor: accentColor }]}
          />
        )}
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
          borderColor: isActive ? accentColor : palette.border,
          borderRadius: sizes.borderRadius,
          padding: sizes.cardPadding,
        },
        animatedStyle,
      ]}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      {/* Header: Time + Duration */}
      <View style={styles.header}>
        <View style={styles.timeBlock}>
          <Text
            style={[
              styles.timeMain,
              { color: palette.text, fontSize: sizes.headerTitle },
            ]}
          >
            {startTime}
          </Text>
          {endTime && (
            <Text
              style={[
                styles.timeSeparator,
                { color: palette.textSecondary, fontSize: sizes.bodyText },
              ]}
            >
              {' '}-{' '}
            </Text>
          )}
          {endTime && (
            <Text
              style={[
                styles.timeEnd,
                { color: palette.textSecondary, fontSize: sizes.bodyText },
              ]}
            >
              {endTime}
            </Text>
          )}
        </View>
        <View
          style={[
            styles.durationBadge,
            {
              backgroundColor: isActive
                ? `${palette.success}20`
                : `${accentColor}15`,
              borderRadius: sizes.borderRadiusSmall,
              paddingHorizontal: sizes.chipPadding,
            },
          ]}
        >
          {isActive && (
            <View
              style={[
                styles.activeDot,
                { backgroundColor: palette.success },
              ]}
            />
          )}
          <Text
            style={[
              styles.durationText,
              {
                color: isActive ? palette.success : accentColor,
                fontSize: sizes.smallText,
              },
            ]}
          >
            {duration}
          </Text>
        </View>
      </View>

      {/* Content Row: Icon + Title */}
      <View style={styles.contentRow}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: `${accentColor}20`,
              width: sizes.buttonHeight,
              height: sizes.buttonHeight,
              borderRadius: sizes.buttonHeight / 2,
            },
          ]}
        >
          <InsightIcon
            name={categoryIcon}
            size={sizes.iconSize}
            color={accentColor}
          />
        </View>
        <View style={styles.titleBlock}>
          <Text
            style={[
              styles.title,
              { color: palette.text, fontSize: sizes.sectionTitle },
            ]}
            numberOfLines={2}
          >
            {event.title}
          </Text>
          {event.category && (
            <View style={styles.categoryRow}>
              <View
                style={[styles.categoryDot, { backgroundColor: accentColor }]}
              />
              <Text
                style={[
                  styles.categoryText,
                  { color: accentColor, fontSize: sizes.tinyText },
                ]}
              >
                {event.category}
                {event.subcategory ? ` / ${event.subcategory}` : ''}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Footer: Tags + Date + Nested indicator */}
      <View style={styles.footer}>
        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {event.tags.slice(0, 3).map((tag) => (
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
          </View>
        )}

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <InsightIcon
              name={kindIcon}
              size={sizes.iconSizeTiny}
              color={palette.textSecondary}
            />
            <Text
              style={[
                styles.kindText,
                { color: palette.textSecondary, fontSize: sizes.tinyText },
              ]}
            >
              {event.kind.charAt(0).toUpperCase() + event.kind.slice(1)}
            </Text>
          </View>
          <Text
            style={[
              styles.dateText,
              { color: palette.textSecondary, fontSize: sizes.tinyText },
            ]}
          >
            {dateLabel}
          </Text>

          {/* Nested event indicator */}
          {event.parentEventId && (
            <View
              style={[
                styles.nestedBadge,
                {
                  backgroundColor: `${palette.warning}20`,
                  borderRadius: sizes.borderRadiusSmall,
                },
              ]}
            >
              <InsightIcon
                name="corner-down-right"
                size={sizes.iconSizeTiny}
                color={palette.warning}
              />
              <Text
                style={[
                  styles.nestedText,
                  { color: palette.warning, fontSize: sizes.tinyText },
                ]}
              >
                Nested
              </Text>
            </View>
          )}
        </View>

        {/* Points display */}
        {event.points != null && event.points > 0 && (
          <View
            style={[
              styles.pointsBadge,
              {
                backgroundColor: `${palette.success}15`,
                borderRadius: sizes.borderRadiusSmall,
                paddingHorizontal: sizes.chipPadding,
              },
            ]}
          >
            <Text
              style={[
                styles.pointsText,
                { color: palette.success, fontSize: sizes.smallText },
              ]}
            >
              +{event.points} XP
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
    gap: 12,
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
    alignItems: 'center',
    paddingLeft: 8,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  timeMain: {
    fontWeight: '800',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
  },
  timeSeparator: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  timeEnd: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  durationText: {
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 8,
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  title: {
    fontWeight: '800',
    fontFamily: 'Figtree',
    letterSpacing: -0.3,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontWeight: '700',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    gap: 8,
    paddingLeft: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    paddingVertical: 3,
  },
  tagText: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kindText: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  dateText: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  nestedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  nestedText: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  pointsBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  pointsText: {
    fontWeight: '700',
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
  compactTimeCol: {
    alignItems: 'center',
    minWidth: 50,
  },
  compactTime: {
    fontWeight: '800',
    fontFamily: 'Figtree',
    letterSpacing: -0.3,
  },
  compactTimeEnd: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  compactContent: {
    flex: 1,
    gap: 4,
  },
  compactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactIcon: {
    padding: 4,
  },
  compactTitle: {
    flex: 1,
    fontWeight: '700',
    fontFamily: 'Figtree',
    letterSpacing: -0.3,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactDuration: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  compactCategory: {
    fontWeight: '700',
    fontFamily: 'Figtree',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
