import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Text } from '@/components/ui';
import { theme, useTheme } from '@/theme';

export default function HomeScreen() {
  const { theme: active } = useTheme();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: active.colors.background }]}
      edges={['bottom']}
    >
      <View style={styles.content}>
        <Text variant="title">Welcome to Alias</Text>
        <Text variant="body" color="textMuted">
          This screen is intentionally thin — feature logic lives in `src/features`.
        </Text>
        <Card>
          <Text variant="heading">Getting started</Text>
          <Text variant="body" color="textMuted">
            Edit app/(tabs)/index.tsx, or build out a feature under src/features.
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
});
