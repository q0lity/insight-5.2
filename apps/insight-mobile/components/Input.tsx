import { TextInput, TextInputProps, StyleSheet, View } from 'react-native';
import { Text } from './Themed';
import { useTheme } from '@/src/state/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const { palette } = useTheme();

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: palette.text }]}>{label}</Text>}
      <TextInput
        placeholderTextColor={palette.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: palette.background,
            borderColor: error ? palette.error : palette.border,
            color: palette.text,
          },
          style,
        ]}
        {...props}
      />
      {error && <Text style={[styles.error, { color: palette.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  input: {
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 15,
    fontFamily: 'Figtree',
  },
  error: {
    fontSize: 12,
    fontFamily: 'Figtree',
  },
});
