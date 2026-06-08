import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { LAUNCH_LOCALES, type Pack } from '@alias/contracts';
import { Button, Screen, SegmentedControl, Text } from '@/components/ui';
import { buildCustomPack, newCustomPackId, parseWordList, usePackStore } from '@/features/packs';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

function Splash() {
  const { theme } = useTheme();
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
}

const LOCALE_OPTIONS: { value: string; label: string }[] = LAUNCH_LOCALES.map((code) => ({
  value: code,
  label: code.toUpperCase(),
}));

/**
 * Create / edit a custom word pack — the offline "add words to a language" path
 * (no backend). When editing, we wait for the pack library to hydrate before rendering
 * the form, so an open-by-id never shows a stale empty form (the store hydrates in the
 * background — see _layout.tsx). The form lives in a child so its `useState` initializers
 * run once on REAL data.
 */
export default function PackEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isHydrated = usePackStore((s) => s.isHydrated);
  const existing = usePackStore((s) => (id ? s.customPacks.find((p) => p.id === id) : undefined));

  // Editing depends on the persisted library; hold a themed splash until it's loaded.
  if (id && !isHydrated) return <Splash />;
  return <PackEditorForm id={id} existing={existing} />;
}

function PackEditorForm({ id, existing }: { id?: string; existing?: Pack }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const upsertPack = usePackStore((s) => s.upsertPack);
  const removePack = usePackStore((s) => s.removePack);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [locale, setLocale] = useState<string>(existing?.locale ?? LAUNCH_LOCALES[0]);
  const [wordsText, setWordsText] = useState(existing ? existing.cards.map((c) => c.w).join('\n') : '');
  // One stable id per editor session: re-pressing Save upserts the SAME pack (idempotent),
  // so a double-tap can't create a duplicate / silently overwrite a different pack.
  const [newPackId] = useState(() => newCustomPackId(Date.now()));

  const words = useMemo(() => parseWordList(wordsText), [wordsText]);
  const canSave = title.trim().length > 0 && words.length > 0;

  const onSave = () => {
    const pack = buildCustomPack({ id: id ?? newPackId, title, locale, wordsText });
    if (!pack) return; // guarded; Save is also disabled until valid
    upsertPack(pack);
    router.back();
  };

  const confirmDelete = () => {
    if (!id) return;
    Alert.alert(t('packs.deleteTitle'), t('packs.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('packs.delete'),
        style: 'destructive',
        onPress: () => {
          removePack(id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('packs.back')}
          hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }}
        >
          <Text variant="body" color="primary">{`‹ ${t('packs.back')}`}</Text>
        </Pressable>
        <Text variant="title">{existing ? t('packs.editTitle') : t('packs.newTitle')}</Text>
      </View>

      <View style={styles.field}>
        <Text variant="label" color="textMuted">
          {t('packs.nameLabel')}
        </Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={t('packs.namePlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          accessibilityLabel={t('packs.nameLabel')}
        />
      </View>

      <View style={styles.field}>
        <Text variant="label" color="textMuted">
          {t('packs.languageLabel')}
        </Text>
        <SegmentedControl options={LOCALE_OPTIONS} value={locale} onChange={setLocale} />
      </View>

      <View style={styles.field}>
        <Text variant="label" color="textMuted">
          {t('packs.wordsLabel')}
        </Text>
        <Text variant="caption" color="textMuted">
          {t('packs.wordsHint')}
        </Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={wordsText}
          onChangeText={setWordsText}
          placeholder={t('packs.wordsPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          accessibilityLabel={t('packs.wordsLabel')}
          multiline
          textAlignVertical="top"
        />
        <Text variant="caption" color="textMuted">
          {t('packs.wordCount', { count: words.length })}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button title={t('packs.save')} size="lg" onPress={onSave} disabled={!canSave} style={styles.full} />
        {existing ? (
          <Button title={t('packs.delete')} variant="ghost" onPress={confirmDelete} style={styles.full} />
        ) : null}
      </View>
    </Screen>
  );
}

const makeStyles = (theme: Theme) => ({
  header: { gap: theme.spacing.xs, marginBottom: theme.spacing.sm },
  field: { gap: theme.spacing.xs, marginBottom: theme.spacing.lg },
  input: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.body.fontSize,
  },
  multiline: { minHeight: theme.spacing.xxl * 3 },
  actions: { gap: theme.spacing.sm, marginTop: theme.spacing.md },
  full: { alignSelf: 'stretch' as const },
});
