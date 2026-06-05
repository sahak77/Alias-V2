import { create } from 'zustand';
import { storage, STORAGE_KEYS } from '@/lib/storage';

/**
 * Session / auth state — UI/client state only. Server data never lives here (use TanStack Query).
 * The token is mirrored to secure storage so it survives app restarts.
 */
type SessionState = {
  token: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useSession = create<SessionState>((set) => ({
  token: null,
  isHydrated: false,
  hydrate: async () => {
    const token = await storage.getItem(STORAGE_KEYS.authToken);
    set({ token, isHydrated: true });
  },
  signIn: async (token) => {
    await storage.setItem(STORAGE_KEYS.authToken, token);
    set({ token });
  },
  signOut: async () => {
    await storage.removeItem(STORAGE_KEYS.authToken);
    set({ token: null });
  },
}));
