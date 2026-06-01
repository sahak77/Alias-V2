import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Typed Expo config. Read runtime values via `expo-constants`
 * (`Constants.expoConfig?.extra`). Never commit secrets here —
 * use EAS Secrets or `EXPO_PUBLIC_*` env vars for public config.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Alias',
  slug: 'alias',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'alias',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'am.smartsoft.alias',
  },
  android: {
    package: 'am.smartsoft.alias',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-router', 'expo-secure-store'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Public, non-sensitive runtime config. Override per-environment with env vars.
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.example.com',
  },
});
