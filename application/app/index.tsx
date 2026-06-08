import { useRouter } from 'expo-router';
import { Alert, View } from 'react-native';
import { Button, Screen, Text } from '@/components/ui';
import { useGameSession } from '@/features/game';
import { useThemedStyles, type Theme } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const session = useGameSession((s) => s.session);
  const quit = useGameSession((s) => s.quit);
  const styles = useThemedStyles(makeStyles);
  const canResume = session !== null && session.status !== 'finished';

  const confirmDiscard = () =>
    Alert.alert('Discard saved game?', 'This ends your in-progress game and cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: quit },
    ]);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text variant="display" color="primary">
          Alias
        </Text>
        <Text variant="heading" color="textMuted">
          the party word game
        </Text>
      </View>
      <View style={styles.actions}>
        {canResume ? (
          <Button title="Resume game" size="xl" onPress={() => router.push('/game')} style={styles.full} />
        ) : null}
        <Button
          title={canResume ? 'New game' : 'Play'}
          size={canResume ? 'lg' : 'xl'}
          variant={canResume ? 'secondary' : 'primary'}
          onPress={() => router.push('/setup')}
          style={styles.full}
        />
        {canResume ? (
          <Button title="Discard saved game" variant="ghost" onPress={confirmDiscard} style={styles.full} />
        ) : null}
        <Button title="Settings" variant="secondary" onPress={() => router.push('/settings')} style={styles.full} />
      </View>
    </Screen>
  );
}

const makeStyles = (theme: Theme) => ({
  hero: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: theme.spacing.xs },
  actions: { gap: theme.spacing.sm },
  full: { alignSelf: 'stretch' as const },
});
