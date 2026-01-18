import { TextInput, TextInputProps, StyleSheet, View } from 'react-native';
import { Text } from './Themed';
import { useTheme } from '@/src/state/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const { palette, sizes } = useTheme();

  return (
    <View style={[styles.container, { gap: sizes.spacingSmall }]}>
      {label && (
        <Text style={[styles.label, { color: palette.text, fontSize: sizes.smallText }]}>{label}</Text>
      )}
      <TextInput
        placeholderTextColor={palette.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: palette.surface,
            borderColor: error ? palette.error : palette.border,
            color: palette.text,
            height: sizes.buttonHeightSmall,
            borderRadius: sizes.borderRadiusSmall,
            paddingHorizontal: sizes.spacing + 4,
            fontSize: sizes.bodyText,
            shadowOpacity: 0,
            elevation: 0,
          },
          style,
        ]}
        {...props}
      />
      {error && <Text style={[styles.error, { color: palette.error, fontSize: sizes.tinyText + 2 }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: {
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  input: {
    borderWidth: 1,
    fontFamily: 'Figtree',
  },
  error: {
    fontFamily: 'Figtree',
  },
});
