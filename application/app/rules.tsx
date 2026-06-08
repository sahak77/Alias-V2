import { useTranslation } from 'react-i18next';
import { Card, Screen, Text } from '@/components/ui';
import { useThemedStyles, type Theme } from '@/theme';

/** How-to-play sections, in reading order (keys resolve from the i18n catalog). */
const SECTIONS = [
  { heading: 'rules.goalHeading', body: 'rules.goalBody' },
  { heading: 'rules.turnsHeading', body: 'rules.turnsBody' },
  { heading: 'rules.actionsHeading', body: 'rules.actionsBody' },
  { heading: 'rules.timerHeading', body: 'rules.timerBody' },
  { heading: 'rules.winHeading', body: 'rules.winBody' },
] as const;

/** Static How-to-play / Rules screen (spec §6.6). */
export default function RulesScreen() {
  const { t } = useTranslation();
  const styles = useThemedStyles(makeStyles);

  return (
    <Screen scroll>
      <Text variant="title">{t('rules.title')}</Text>
      {SECTIONS.map((section) => (
        <Card key={section.heading} style={styles.card}>
          <Text variant="heading">{t(section.heading)}</Text>
          <Text variant="body" color="textMuted">
            {t(section.body)}
          </Text>
        </Card>
      ))}
    </Screen>
  );
}

const makeStyles = (theme: Theme) => ({
  card: { gap: theme.spacing.sm },
});
