import Constants from 'expo-constants';

type Extra = {
  apiUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Typed, centralized access to runtime config from `app.config.ts` -> `extra`. */
export const config = {
  apiUrl: extra.apiUrl ?? 'https://api.example.com',
} as const;
