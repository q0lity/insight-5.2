import { TouchableOpacity, TouchableOpacityProps, StyleSheet } from 'react-native';
import { Text } from './Themed';
import { useTheme } from '@/src/state/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
}

export function Button({ title, variant = 'primary', loading, style, disabled, ...props }: ButtonProps) {
  const { palette } = useTheme();

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

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          opacity: loading ? 0.7 : 1,
        },
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      <Text style={[styles.text, { color: getTextColor() }]}>
        {loading ? 'Loading...' : title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
});
