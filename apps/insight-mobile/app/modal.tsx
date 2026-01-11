import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';

export default function ModalScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <FontAwesome name="close" size={20} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.text }]}>Modal</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.message, { color: palette.textSecondary }]}>
          This is a modal screen. Use it for forms, details, or other overlaid content.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Figtree',
    textAlign: 'center',
  },
});
