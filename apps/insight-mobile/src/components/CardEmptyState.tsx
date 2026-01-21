import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/state/theme';
import { InsightIcon } from './InsightIcon';

type CardEmptyStateVariant = 'note' | 'event' | 'task' | 'tracker' | 'generic';

type CardEmptyStateProps = {
  variant?: CardEmptyStateVariant;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

// Default content per variant
const VARIANT_DEFAULTS: Record<
  CardEmptyStateVariant,
  { icon: string; title: string; message: string; actionLabel: string }
> = {
  note: {
    icon: 'file-text',
    title: 'No notes yet',
    message: 'Capture your thoughts, ideas, and observations',
    actionLabel: 'Create Note',
  },
  event: {
    icon: 'calendar',
    title: 'No events found',
    message: 'Events will appear here as you track your day',
    actionLabel: 'Log Event',
  },
  task: {
    icon: 'check-square',
    title: 'All clear!',
    message: "You don't have any tasks in this view",
    actionLabel: 'Add Task',
  },
  tracker: {
    icon: 'activity',
    title: 'No tracker data',
    message: 'Start logging values to see your trends',
    actionLabel: 'Log Value',
  },
  generic: {
    icon: 'inbox',
    title: 'Nothing here',
    message: 'This section is empty',
    actionLabel: 'Get Started',
  },
};

export function CardEmptyState({
  variant = 'generic',
  title,
  message,
  actionLabel,
  onAction,
}: CardEmptyStateProps) {
  const { palette, sizes, isDark } = useTheme();

  const defaults = VARIANT_DEFAULTS[variant];
  const displayTitle = title ?? defaults.title;
  const displayMessage = message ?? defaults.message;
  const displayActionLabel = actionLabel ?? defaults.actionLabel;
  const iconName = defaults.icon;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? `${palette.surface}80` : `${palette.surface}60`,
          borderColor: palette.border,
          borderRadius: sizes.borderRadius,
          padding: sizes.cardPadding * 2,
        },
      ]}
    >
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: `${palette.tint}15`,
            width: sizes.buttonHeight * 1.5,
            height: sizes.buttonHeight * 1.5,
            borderRadius: sizes.buttonHeight * 0.75,
          },
        ]}
      >
        <InsightIcon
          name={iconName}
          size={sizes.iconSize * 1.2}
          color={palette.tint}
        />
      </View>

      {/* Title */}
      <Text
        style={[
          styles.title,
          { color: palette.text, fontSize: sizes.sectionTitle },
        ]}
      >
        {displayTitle}
      </Text>

      {/* Message */}
      <Text
        style={[
          styles.message,
          { color: palette.textSecondary, fontSize: sizes.bodyText },
        ]}
      >
        {displayMessage}
      </Text>

      {/* Action button */}
      {onAction && (
        <Pressable
          onPress={onAction}
          style={[
            styles.actionButton,
            {
              backgroundColor: palette.tint,
              borderRadius: sizes.borderRadiusSmall,
              paddingHorizontal: sizes.cardPadding,
              paddingVertical: sizes.spacingSmall,
            },
          ]}
        >
          <InsightIcon name="plus" size={sizes.iconSizeSmall} color="#FFFFFF" />
          <Text
            style={[styles.actionText, { fontSize: sizes.smallText }]}
          >
            {displayActionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// Inline empty state for within cards/sections
export function InlineEmptyState({
  message = 'No items',
  compact = false,
}: {
  message?: string;
  compact?: boolean;
}) {
  const { palette, sizes } = useTheme();

  return (
    <View
      style={[
        styles.inlineContainer,
        {
          paddingVertical: compact ? sizes.spacingSmall : sizes.cardPadding,
        },
      ]}
    >
      <InsightIcon
        name="inbox"
        size={compact ? sizes.iconSizeSmall : sizes.iconSize}
        color={palette.textSecondary}
      />
      <Text
        style={[
          styles.inlineMessage,
          {
            color: palette.textSecondary,
            fontSize: compact ? sizes.smallText : sizes.bodyText,
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontWeight: '800',
    fontFamily: 'Figtree',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Figtree',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  // Inline styles
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inlineMessage: {
    fontFamily: 'Figtree',
  },
});
