import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '@/src/state/theme';
import { ANIMATION } from '@/src/constants/design-tokens';

// Category colors for visual distinction
const CATEGORY_COLORS: Record<string, string> = {
  work: '#3B82F6',      // Blue
  health: '#22C55E',    // Green
  personal: '#E26B3A',  // Orange (tint)
  learning: '#8B5CF6',  // Purple
  transport: '#6B7280', // Gray
  finance: '#F59E0B',   // Yellow
  default: '#64748B',   // Slate
};

// Mood indicators
const MOOD_EMOJI: Record<string, string> = {
  happy: '\uD83D\uDE0A',
  sad: '\uD83D\uDE14',
  anxious: '\uD83D\uDE1F',
  excited: '\uD83E\uDD29',
  tired: '\uD83D\uDE34',
  neutral: '\uD83D\uDE10',
  focused: '\uD83E\uDDD0',
  grateful: '\uD83D\uDE4F',
};

export type NoteEntry = {
  id: string;
  title: string;
  body?: string;
  category?: string | null;
  mood?: string | null;
  tags?: string[];
  createdAt: number;
};

type NoteCardProps = {
  note: NoteEntry;
  onPress?: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function NoteCard({ note, onPress }: NoteCardProps) {
  const { palette, sizes } = useTheme();

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

  // Get category color for left border accent
  const categoryKey = (note.category ?? 'default').toLowerCase();
  const accentColor = CATEGORY_COLORS[categoryKey] ?? CATEGORY_COLORS.default;

  // Get mood emoji if available
  const moodKey = (note.mood ?? '').toLowerCase();
  const moodEmoji = MOOD_EMOJI[moodKey] ?? null;

  // Truncate body text for preview
  const truncatedBody = note.body
    ? note.body.length > 120
      ? note.body.slice(0, 120).trim() + '...'
      : note.body
    : null;

  // Format date
  const formattedDate = new Date(note.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

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
        animatedStyle,
      ]}
    >
      {/* Category color accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      {/* Header: Title + Mood */}
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: palette.text, fontSize: sizes.sectionTitle },
          ]}
          numberOfLines={2}
        >
          {note.title}
        </Text>
        {moodEmoji && (
          <View
            style={[
              styles.moodBadge,
              {
                backgroundColor: `${accentColor}20`,
                borderRadius: sizes.borderRadiusSmall,
              },
            ]}
          >
            <Text style={[styles.moodEmoji, { fontSize: sizes.iconSize }]}>
              {moodEmoji}
            </Text>
          </View>
        )}
      </View>

      {/* Body preview */}
      {truncatedBody && (
        <Text
          style={[
            styles.body,
            { color: palette.textSecondary, fontSize: sizes.bodyText },
          ]}
          numberOfLines={3}
        >
          {truncatedBody}
        </Text>
      )}

      {/* Footer: Tags + Date */}
      <View style={styles.footer}>
        {/* Tags as colored pills */}
        {note.tags && note.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {note.tags.slice(0, 3).map((tag, idx) => (
              <View
                key={tag}
                style={[
                  styles.tagPill,
                  {
                    backgroundColor: `${accentColor}${15 + idx * 5}`,
                    borderRadius: sizes.borderRadiusSmall,
                    paddingHorizontal: sizes.chipPadding,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: accentColor, fontSize: sizes.smallText },
                  ]}
                >
                  #{tag}
                </Text>
              </View>
            ))}
            {note.tags.length > 3 && (
              <Text
                style={[
                  styles.moreTagsText,
                  { color: palette.textSecondary, fontSize: sizes.smallText },
                ]}
              >
                +{note.tags.length - 3}
              </Text>
            )}
          </View>
        )}

        {/* Category badge + Date */}
        <View style={styles.metaRow}>
          {note.category && (
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor: `${accentColor}20`,
                  borderRadius: sizes.borderRadiusSmall,
                  paddingHorizontal: sizes.chipPadding,
                },
              ]}
            >
              <View
                style={[styles.categoryDot, { backgroundColor: accentColor }]}
              />
              <Text
                style={[
                  styles.categoryText,
                  { color: accentColor, fontSize: sizes.tinyText },
                ]}
              >
                {note.category}
              </Text>
            </View>
          )}
          <Text
            style={[
              styles.dateText,
              { color: palette.textSecondary, fontSize: sizes.tinyText },
            ]}
          >
            {formattedDate}
          </Text>
        </View>
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
    gap: 8,
    paddingLeft: 8,
  },
  title: {
    flex: 1,
    fontWeight: '800',
    fontFamily: 'Figtree',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  moodBadge: {
    padding: 6,
  },
  moodEmoji: {
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Figtree',
    lineHeight: 20,
    paddingLeft: 8,
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
    paddingVertical: 4,
  },
  tagText: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  moreTagsText: {
    fontWeight: '600',
    fontFamily: 'Figtree',
    alignSelf: 'center',
    marginLeft: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
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
  dateText: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
});
