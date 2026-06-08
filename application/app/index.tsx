import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';
import { Button, Screen, Text } from '@/components/ui';
import { useGameSession } from '@/features/game';
import { useThemedStyles, type Theme } from '@/theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useGameSession((s) => s.session);
  const quit = useGameSession((s) => s.quit);
  const styles = useThemedStyles(makeStyles);
  const canResume = session !== null && session.status !== 'finished';

  const confirmDiscard = () =>
    Alert.alert(t('home.discardTitle'), t('home.discardBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('home.discardConfirm'), style: 'destructive', onPress: quit },
    ]);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text variant="display" color="primary">
          {t('common.appName')}
        </Text>
        <Text variant="heading" color="textMuted">
          {t('common.tagline')}
        </Text>
      </View>
      <View style={styles.actions}>
        {canResume ? (
          <Button title={t('home.resume')} size="xl" onPress={() => router.push('/game')} style={styles.full} />
        ) : null}
        <Button
          title={canResume ? t('home.newGame') : t('home.play')}
          size={canResume ? 'lg' : 'xl'}
          variant={canResume ? 'secondary' : 'primary'}
          onPress={() => router.push('/setup')}
          style={styles.full}
        />
        {canResume ? (
          <Button title={t('home.discard')} variant="ghost" onPress={confirmDiscard} style={styles.full} />
        ) : null}
        <Button title={t('home.howToPlay')} variant="secondary" onPress={() => router.push('/rules')} style={styles.full} />
        <Button title={t('home.settings')} variant="secondary" onPress={() => router.push('/settings')} style={styles.full} />
      </View>
    </Screen>
  );
}

const makeStyles = (theme: Theme) => ({
  hero: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: theme.spacing.xs },
  actions: { gap: theme.spacing.sm },
  full: { alignSelf: 'stretch' as const },
});
