import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text } from '@/components/ui';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { useSession } from '@/stores/session';
import { theme, useTheme } from '@/theme';

export default function ProfileScreen() {
  const { theme: active } = useTheme();
  const token = useSession((s) => s.token);
  const signOut = useSession((s) => s.signOut);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: active.colors.background }]}
      edges={['bottom']}
    >
      <View style={styles.content}>
        <Text variant="title">Profile</Text>
        {token ? (
          <>
            <Text variant="body" color="textMuted">
              You are signed in.
            </Text>
            <Button title="Sign out" variant="secondary" onPress={() => void signOut()} />
          </>
        ) : (
          <>
            <Text variant="body" color="textMuted">
              Sign in to continue.
            </Text>
            <LoginForm />
          </>
        )}
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
