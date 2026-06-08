import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Screen, SegmentedControl, Text, Toggle } from '@/components/ui';
import { usePrefsStore, type Handedness } from '@/features/settings';
import { themeKeys, themes, useThemeStore, useThemedStyles, type Appearance, type Theme } from '@/theme';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const APPEARANCE_OPTIONS = [
    { label: t('settings.appearanceLight'), value: 'light' },
    { label: t('settings.appearanceDark'), value: 'dark' },
    { label: t('settings.appearanceSystem'), value: 'system' },
  ] as const satisfies readonly { label: string; value: Appearance }[];

  const HANDEDNESS_OPTIONS = [
    { label: t('settings.handRight'), value: 'right' },
    { label: t('settings.handLeft'), value: 'left' },
  ] as const satisfies readonly { label: string; value: Handedness }[];

  const themeKey = useThemeStore((s) => s.themeKey);
  const appearance = useThemeStore((s) => s.appearance);
  const setThemeKey = useThemeStore((s) => s.setThemeKey);
  const setAppearance = useThemeStore((s) => s.setAppearance);

  const soundEnabled = usePrefsStore((s) => s.soundEnabled);
  const hapticsEnabled = usePrefsStore((s) => s.hapticsEnabled);
  const handedness = usePrefsStore((s) => s.handedness);
  const setSoundEnabled = usePrefsStore((s) => s.setSoundEnabled);
  const setHapticsEnabled = usePrefsStore((s) => s.setHapticsEnabled);
  const setHandedness = usePrefsStore((s) => s.setHandedness);

  const styles = useThemedStyles(makeStyles);
  const themeOptions = themeKeys.map((key) => ({ label: themes[key].displayName, value: key }));

  return (
    <Screen scroll>
      <Text variant="title">{t('settings.title')}</Text>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          {t('settings.feedback')}
        </Text>
        <Toggle label={t('settings.sound')} hint={t('settings.soundHint')} value={soundEnabled} onValueChange={setSoundEnabled} />
        <Toggle label={t('settings.vibration')} value={hapticsEnabled} onValueChange={setHapticsEnabled} />
      </View>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          {t('settings.handedness')}
        </Text>
        <SegmentedControl options={HANDEDNESS_OPTIONS} value={handedness} onChange={setHandedness} />
        <Text variant="caption" color="textMuted">
          {t('settings.handednessHint')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          {t('settings.theme')}
        </Text>
        <SegmentedControl options={themeOptions} value={themeKey} onChange={setThemeKey} />
      </View>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          {t('settings.appearance')}
        </Text>
        <SegmentedControl options={APPEARANCE_OPTIONS} value={appearance} onChange={setAppearance} />
        <Text variant="caption" color="textMuted">
          {t('settings.appearanceHint')}
        </Text>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: Theme) => ({
  section: { gap: theme.spacing.sm },
});
