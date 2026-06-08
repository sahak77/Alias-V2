import '@/i18n'; // initialize i18next once, before any screen renders
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGameLifecycle, useGameSession, useSetupStore } from '@/features/game';
import { usePrefsStore } from '@/features/settings';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider, useTheme } from '@/theme';

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

/**
 * Reads any persisted in-progress game before the first route renders (so Home's
 * Resume state is correct on first paint) and pauses the active round whenever
 * the app leaves the foreground. Holds a themed splash until hydration resolves.
 */
function GameGate({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const isHydrated = useGameSession((s) => s.isHydrated);
  const hydrate = useGameSession((s) => s.hydrate);
  const hydrateSetup = useSetupStore((s) => s.hydrate);
  const hydratePrefs = usePrefsStore((s) => s.hydrate);
  useGameLifecycle();

  useEffect(() => {
    void hydrate();
    // Setup defaults + prefs aren't render gates (neither is the first route);
    // load them in the background so they're ready by the time they're needed.
    void hydrateSetup();
    void hydratePrefs();
  }, [hydrate, hydrateSetup, hydratePrefs]);

  if (!isHydrated) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <ThemedStatusBar />
            <GameGate>
              <Stack screenOptions={{ headerShown: false }} />
            </GameGate>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
