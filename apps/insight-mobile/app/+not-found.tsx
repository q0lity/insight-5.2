import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';

export default function NotFoundScreen() {
  const { palette } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <Text style={[styles.title, { color: palette.text }]}>This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: palette.tint }]}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Figtree',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Figtree',
  },
});
