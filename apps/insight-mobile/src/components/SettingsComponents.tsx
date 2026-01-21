import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View, type ViewStyle, type StyleProp } from 'react-native';
import { MotiPressable } from 'moti/interactions';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { InsightIcon, type InsightIconName } from './InsightIcon';

// ============================================================================
// SettingsSection - Groups settings with a header
// ============================================================================

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SettingsSection({ title, children, style }: SettingsSectionProps) {
  const { palette, sizes } = useTheme();

  return (
    <View style={[styles.section, style]}>
      <Text
        style={[
          styles.sectionHeader,
          {
            color: palette.textSecondary,
            fontSize: sizes.tinyText,
            marginBottom: sizes.spacingSmall,
            marginLeft: sizes.spacingSmall,
          },
        ]}
      >
        {title}
      </Text>
      <View
        style={[
          styles.sectionContent,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            borderRadius: sizes.borderRadius,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// ============================================================================
// SettingsRow - A row with icon, label, optional value, and chevron
// ============================================================================

type SettingsRowProps = {
  icon: InsightIconName;
  label: string;
  value?: string;
  description?: string;
  onPress?: () => void;
  showChevron?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  danger?: boolean;
  rightElement?: React.ReactNode;
};

export function SettingsRow({
  icon,
  label,
  value,
  description,
  onPress,
  showChevron = true,
  isFirst = false,
  isLast = false,
  danger = false,
  rightElement,
}: SettingsRowProps) {
  const { palette, sizes } = useTheme();

  const textColor = danger ? palette.error : palette.text;
  const iconColor = danger ? palette.error : palette.textSecondary;

  const content = (
    <View
      style={[
        styles.row,
        {
          paddingVertical: sizes.spacing - 4,
          paddingHorizontal: sizes.spacing,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: palette.border,
        },
      ]}
    >
      <View
        style={[
          styles.rowIconContainer,
          {
            width: sizes.iconSize + 8,
            height: sizes.iconSize + 8,
            borderRadius: sizes.borderRadiusSmall - 4,
            backgroundColor: danger ? `${palette.error}15` : palette.borderLight,
          },
        ]}
      >
        <InsightIcon name={icon} size={sizes.iconSizeSmall} color={iconColor} />
      </View>

      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: textColor, fontSize: sizes.bodyText }]}>
          {label}
        </Text>
        {description && (
          <Text
            style={[styles.rowDescription, { color: palette.textSecondary, fontSize: sizes.smallText }]}
          >
            {description}
          </Text>
        )}
      </View>

      {rightElement ? (
        rightElement
      ) : (
        <View style={styles.rowRight}>
          {value && (
            <Text style={[styles.rowValue, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
              {value}
            </Text>
          )}
          {showChevron && onPress && (
            <InsightIcon name="chevronRight" size={sizes.iconSizeSmall} color={palette.textSecondary} />
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <MotiPressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        animate={({ pressed }) => {
          'worklet';
          return {
            opacity: pressed ? 0.7 : 1,
          };
        }}
        transition={{ type: 'timing', duration: 100 }}
      >
        {content}
      </MotiPressable>
    );
  }

  return content;
}

// ============================================================================
// SettingsToggle - Animated toggle switch
// ============================================================================

type SettingsToggleProps = {
  icon: InsightIconName;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isFirst?: boolean;
  isLast?: boolean;
};

export function SettingsToggle({
  icon,
  label,
  description,
  value,
  onValueChange,
  isFirst = false,
  isLast = false,
}: SettingsToggleProps) {
  const { palette, sizes } = useTheme();
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 60,
    }).start();
  }, [value, animatedValue]);

  const trackColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.border, palette.tint],
  });

  const thumbPosition = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  };

  return (
    <View
      style={[
        styles.row,
        {
          paddingVertical: sizes.spacing - 4,
          paddingHorizontal: sizes.spacing,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: palette.border,
        },
      ]}
    >
      <View
        style={[
          styles.rowIconContainer,
          {
            width: sizes.iconSize + 8,
            height: sizes.iconSize + 8,
            borderRadius: sizes.borderRadiusSmall - 4,
            backgroundColor: palette.borderLight,
          },
        ]}
      >
        <InsightIcon name={icon} size={sizes.iconSizeSmall} color={palette.textSecondary} />
      </View>

      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: palette.text, fontSize: sizes.bodyText }]}>
          {label}
        </Text>
        {description && (
          <Text
            style={[styles.rowDescription, { color: palette.textSecondary, fontSize: sizes.smallText }]}
          >
            {description}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={styles.toggleContainer}
      >
        <Animated.View
          style={[
            styles.toggleTrack,
            {
              backgroundColor: trackColor,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.toggleThumb,
              {
                transform: [{ translateX: thumbPosition }],
              },
            ]}
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// SyncStatusIndicator - Colored dot indicator for sync status
// ============================================================================

type SyncStatus = 'connected' | 'syncing' | 'error' | 'offline';

type SyncStatusIndicatorProps = {
  status: SyncStatus;
  label: string;
};

export function SyncStatusIndicator({ status, label }: SyncStatusIndicatorProps) {
  const { palette, sizes } = useTheme();

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return palette.success;
      case 'syncing':
        return palette.warning;
      case 'error':
        return palette.error;
      case 'offline':
        return palette.textSecondary;
      default:
        return palette.textSecondary;
    }
  };

  return (
    <View style={styles.statusContainer}>
      <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
      <Text style={[styles.statusLabel, { color: palette.text, fontSize: sizes.smallText }]}>
        {label}
      </Text>
    </View>
  );
}

// ============================================================================
// AccountHeader - Avatar, email, and account info
// ============================================================================

type AccountHeaderProps = {
  email?: string;
  name?: string;
  avatarUrl?: string;
  isAnonymous?: boolean;
  onPress?: () => void;
};

export function AccountHeader({ email, name, avatarUrl, isAnonymous, onPress }: AccountHeaderProps) {
  const { palette, sizes } = useTheme();

  const displayName = name || email?.split('@')[0] || 'User';
  const initials = displayName.substring(0, 2).toUpperCase();

  const content = (
    <View
      style={[
        styles.accountContainer,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderRadius: sizes.borderRadius,
          padding: sizes.spacing,
        },
      ]}
    >
      <View
        style={[
          styles.avatar,
          {
            width: sizes.iconSize * 2,
            height: sizes.iconSize * 2,
            borderRadius: sizes.iconSize,
            backgroundColor: palette.tint,
          },
        ]}
      >
        <Text style={[styles.avatarText, { fontSize: sizes.bodyText, color: '#FFFFFF' }]}>
          {initials}
        </Text>
      </View>

      <View style={styles.accountInfo}>
        <Text style={[styles.accountName, { color: palette.text, fontSize: sizes.bodyText }]}>
          {displayName}
        </Text>
        {email && (
          <Text style={[styles.accountEmail, { color: palette.textSecondary, fontSize: sizes.smallText }]}>
            {email}
          </Text>
        )}
        {isAnonymous && (
          <View
            style={[
              styles.anonymousBadge,
              { backgroundColor: palette.borderLight, borderRadius: sizes.borderRadiusSmall },
            ]}
          >
            <Text style={{ color: palette.textSecondary, fontSize: sizes.tinyText, fontWeight: '600' }}>
              Anonymous
            </Text>
          </View>
        )}
      </View>

      {onPress && (
        <InsightIcon name="chevronRight" size={sizes.iconSizeSmall} color={palette.textSecondary} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <MotiPressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        animate={({ pressed }) => {
          'worklet';
          return { scale: pressed ? 0.98 : 1 };
        }}
        transition={{ type: 'timing', duration: 100 }}
      >
        {content}
      </MotiPressable>
    );
  }

  return content;
}

// ============================================================================
// ThemePreviewCard - Visual theme preview card
// ============================================================================

type ThemePreviewCardProps = {
  themeKey: string;
  label: string;
  colors: {
    background: string;
    surface: string;
    tint: string;
  };
  isSelected: boolean;
  onSelect: () => void;
};

export function ThemePreviewCard({ themeKey, label, colors, isSelected, onSelect }: ThemePreviewCardProps) {
  const { palette, sizes } = useTheme();

  return (
    <MotiPressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect();
      }}
      animate={({ pressed }) => {
        'worklet';
        return { scale: pressed ? 0.95 : 1 };
      }}
      transition={{ type: 'timing', duration: 100 }}
      style={[
        styles.themeCard,
        {
          borderColor: isSelected ? palette.tint : palette.border,
          borderWidth: isSelected ? 2 : 1,
          borderRadius: sizes.borderRadiusSmall,
          overflow: 'hidden',
        },
      ]}
    >
      <View style={[styles.themePreview, { backgroundColor: colors.background }]}>
        <View style={[styles.themeSurface, { backgroundColor: colors.surface }]} />
        <View style={[styles.themeAccent, { backgroundColor: colors.tint }]} />
      </View>
      <View
        style={[
          styles.themeLabelContainer,
          { backgroundColor: isSelected ? palette.tint : palette.borderLight },
        ]}
      >
        <Text
          style={[
            styles.themeLabel,
            {
              color: isSelected ? '#FFFFFF' : palette.text,
              fontSize: sizes.tinyText,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </MotiPressable>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionContent: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  rowLabel: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  rowDescription: {
    marginTop: 2,
    fontFamily: 'Figtree',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontWeight: '500',
    fontFamily: 'Figtree',
  },
  toggleContainer: {
    padding: 2,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
  accountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  accountInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  accountName: {
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  accountEmail: {
    fontFamily: 'Figtree',
  },
  anonymousBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  themeCard: {
    flex: 1,
    minWidth: 70,
    maxWidth: 90,
  },
  themePreview: {
    height: 48,
    padding: 6,
    justifyContent: 'space-between',
  },
  themeSurface: {
    width: '60%',
    height: 14,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  themeAccent: {
    width: '40%',
    height: 10,
    borderRadius: 4,
  },
  themeLabelContainer: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  themeLabel: {
    fontWeight: '700',
    fontFamily: 'Figtree',
    textAlign: 'center',
  },
});
