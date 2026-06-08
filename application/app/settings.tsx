import { Screen, SegmentedControl, Text } from '@/components/ui';
import { themeKeys, themes, useThemeStore, type Appearance } from '@/theme';

const APPEARANCE_OPTIONS = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
] as const satisfies readonly { label: string; value: Appearance }[];

export default function SettingsScreen() {
  const themeKey = useThemeStore((s) => s.themeKey);
  const appearance = useThemeStore((s) => s.appearance);
  const setThemeKey = useThemeStore((s) => s.setThemeKey);
  const setAppearance = useThemeStore((s) => s.setAppearance);

  const themeOptions = themeKeys.map((key) => ({ label: themes[key].displayName, value: key }));

  return (
    <Screen scroll>
      <Text variant="title">Settings</Text>

      <Text variant="label" color="textMuted">
        Theme
      </Text>
      <SegmentedControl options={themeOptions} value={themeKey} onChange={setThemeKey} />

      <Text variant="label" color="textMuted">
        Appearance
      </Text>
      <SegmentedControl options={APPEARANCE_OPTIONS} value={appearance} onChange={setAppearance} />
      <Text variant="caption" color="textMuted">
        Appearance applies to themes that offer both light and dark (Classic). Arcade and Vivid are
        dark by design.
      </Text>
    </Screen>
  );
}
