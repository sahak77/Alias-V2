import * as SecureStore from 'expo-secure-store';

/**
 * Thin wrapper over expo-secure-store for small, sensitive values (tokens, etc.).
 * Do not use for large blobs or non-sensitive cache — that belongs in TanStack Query.
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};

export const STORAGE_KEYS = {
  authToken: 'auth.token',
} as const;
