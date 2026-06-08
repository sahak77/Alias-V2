import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { type Pack } from '@alias/contracts';
import { Button, Card, Screen, Text } from '@/components/ui';
import { usePackStore } from '@/features/packs';
import { useThemedStyles, type Theme } from '@/theme';

/**
 * My-Packs library — browse, edit, and delete the user's custom word packs (the
 * bundled starter is always available + not managed here). Create / edit open the
 * Pack Editor; the list is reactive to the store, so it stays correct as packs are
 * added or removed. Fully offline (no backend). Game-time pack SELECTION lives in
 * Setup; this screen is about managing the collection.
 */
export default function PacksScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const isHydrated = usePackStore((s) => s.isHydrated);
  const customPacks = usePackStore((s) => s.customPacks);
  const removePack = usePackStore((s) => s.removePack);

  // Hold a themed splash until the library has loaded (background hydration).
  // (After all hooks above — rules-of-hooks safe.)
  if (!isHydrated) return <View style={styles.splash} />;

  const confirmDelete = (pack: Pack) => {
    Alert.alert(t('packs.deleteTitle'), t('packs.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('packs.delete'), style: 'destructive', onPress: () => removePack(pack.id) },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('packs.back')}
          hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }}
        >
          <Text variant="body" color="primary">{`‹ ${t('packs.back')}`}</Text>
        </Pressable>
        <Text variant="title">{t('packs.libraryTitle')}</Text>
        <Text variant="caption" color="textMuted">
          {t('packs.starterNote')}
        </Text>
      </View>

      <FlatList
        data={customPacks}
        keyExtractor={(p) => p.id}
        style={styles.listFlex}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text variant="body" color="textMuted">
            {t('packs.empty')}
          </Text>
        }
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <Pressable
              style={styles.rowMain}
              accessibilityRole="button"
              accessibilityLabel={t('packs.editPack', { title: item.title })}
              onPress={() => router.push({ pathname: '/pack-editor', params: { id: item.id } })}
            >
              <Text variant="heading">{item.title}</Text>
              <Text variant="caption" color="textMuted">
                {`${t('packs.wordCount', { count: item.cards.length })} · ${item.locale.toUpperCase()}`}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('packs.deletePack', { title: item.title })}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={() => confirmDelete(item)}
              style={styles.delete}
            >
              <Text variant="heading" color="danger">
                ×
              </Text>
            </Pressable>
          </Card>
        )}
      />

      <Button title={t('packs.create')} size="lg" onPress={() => router.push('/pack-editor')} style={styles.full} />
    </Screen>
  );
}

const makeStyles = (theme: Theme) => ({
  splash: { flex: 1, backgroundColor: theme.colors.background },
  header: { gap: theme.spacing.xs, marginBottom: theme.spacing.sm },
  listFlex: { flex: 1 },
  listContent: { gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: theme.spacing.sm,
  },
  rowMain: { flex: 1, gap: theme.spacing.xs },
  delete: { paddingLeft: theme.spacing.md },
  full: { alignSelf: 'stretch' as const },
});
