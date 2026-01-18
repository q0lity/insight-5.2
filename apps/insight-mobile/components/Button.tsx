import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { MotiPressable } from 'moti/interactions';
import * as Haptics from 'expo-haptics';
import { Text } from './Themed';
import { useTheme } from '@/src/state/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface ButtonProps {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  enableHaptics?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
}

export function Button({ title, variant = 'primary', loading, style, disabled, enableHaptics = true, onPress, testID }: ButtonProps) {
  const { palette, sizes } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return palette.borderLight;
    switch (variant) {
      case 'primary':
        return palette.tint;
      case 'secondary':
        return palette.surface;
      case 'outline':
      case 'ghost':
        return 'transparent';
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'outline':
        return palette.tint;
      default:
        return 'transparent';
    }
  };

  const getTextColor = () => {
    if (disabled) return palette.textSecondary;
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return palette.text;
      case 'outline':
      case 'ghost':
        return palette.tint;
    }
  };

  const handlePress = () => {
    if (enableHaptics) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  return (
    <MotiPressable
      onPress={handlePress}
      disabled={disabled || loading}
      animate={({ pressed }) => {
        'worklet';
        return {
          scale: pressed ? 0.95 : 1,
        };
      }}
      transition={{
        type: 'timing',
        duration: 100,
      }}
      testID={testID}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          opacity: loading ? 0.7 : 1,
          height: sizes.buttonHeightSmall,
          borderRadius: sizes.borderRadiusSmall,
          paddingHorizontal: sizes.spacing + 6,
          shadowOpacity: 0,
          elevation: 0,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: getTextColor(), fontSize: sizes.bodyText }]}>
        {loading ? 'Loading...' : title}
      </Text>
    </MotiPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
});
