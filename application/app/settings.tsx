import { View } from 'react-native';
import { Screen, SegmentedControl, Text, Toggle } from '@/components/ui';
import { usePrefsStore, type Handedness } from '@/features/settings';
import { themeKeys, themes, useThemeStore, useThemedStyles, type Appearance, type Theme } from '@/theme';

const APPEARANCE_OPTIONS = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
] as const satisfies readonly { label: string; value: Appearance }[];

const HANDEDNESS_OPTIONS = [
  { label: 'Right', value: 'right' },
  { label: 'Left', value: 'left' },
] as const satisfies readonly { label: string; value: Handedness }[];

export default function SettingsScreen() {
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
      <Text variant="title">Settings</Text>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          Feedback
        </Text>
        <Toggle label="Sound" hint="Coming soon" value={soundEnabled} onValueChange={setSoundEnabled} />
        <Toggle label="Vibration" value={hapticsEnabled} onValueChange={setHapticsEnabled} />
      </View>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          Handedness
        </Text>
        <SegmentedControl options={HANDEDNESS_OPTIONS} value={handedness} onChange={setHandedness} />
        <Text variant="caption" color="textMuted">
          Mirrors the in-game action buttons for your dominant hand.
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          Theme
        </Text>
        <SegmentedControl options={themeOptions} value={themeKey} onChange={setThemeKey} />
      </View>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          Appearance
        </Text>
        <SegmentedControl options={APPEARANCE_OPTIONS} value={appearance} onChange={setAppearance} />
        <Text variant="caption" color="textMuted">
          Appearance applies to themes that offer both light and dark (Classic). Arcade and Vivid are
          dark by design.
        </Text>
      </View>
    </Screen>
  );
}

const makeStyles = (theme: Theme) => ({
  section: { gap: theme.spacing.sm },
});
