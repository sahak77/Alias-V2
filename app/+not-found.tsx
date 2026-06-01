import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { theme, useTheme } from '@/theme';

export default function NotFoundScreen() {
  const { theme: active } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={[styles.container, { backgroundColor: active.colors.background }]}>
        <Text variant="heading">This screen does not exist.</Text>
        <Link href="/" style={styles.link}>
          <Text variant="label" color="primary">
            Go to home
          </Text>
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
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  link: {
    paddingVertical: theme.spacing.sm,
  },
});
