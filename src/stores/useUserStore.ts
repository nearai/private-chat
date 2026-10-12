import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LOCAL_STORAGE_KEYS } from "../lib/constants";
import { purgeLegacyPersistedToken } from "../lib/legacyTokenPurge";
import type { SessionUser, UserStore } from "../types";

const PERSIST_KEY = "user-storage";
const AUTH_STORAGE_LOCK = "private-chat-auth-storage";

async function withAuthStorageLock<T>(operation: () => T): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) return operation();
  return navigator.locks.request(AUTH_STORAGE_LOCK, operation);
}

// Runs before the store hydrates, so a token written by an older build is gone
// from localStorage rather than waiting for the next state change to overwrite it.
purgeLegacyPersistedToken(localStorage, PERSIST_KEY);

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN),
      sessionId: localStorage.getItem(LOCAL_STORAGE_KEYS.SESSION),
      setUser: (user: SessionUser | null) => set({ user }),
      setSession: (token, sessionId, options) =>
        withAuthStorageLock(() => {
          if (options && (localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN) !== options.expectedToken || options.isCurrent?.() === false)) return false;
          localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, token);
          if (sessionId) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.SESSION, sessionId);
          } else {
            localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION);
          }
          set({ token, sessionId });
          return true;
        }),
      logout: (expectedToken: string) =>
        withAuthStorageLock(() => {
          const { token, sessionId } = get();
          if (token !== expectedToken) return false;

          const persistedToken = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);

          // localStorage is shared across tabs, while this store's state is not.
          // Do not erase credentials written by a newer login in another tab.
          if (token && persistedToken === token) {
            localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
            localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION);
          } else if (!persistedToken && sessionId && localStorage.getItem(LOCAL_STORAGE_KEYS.SESSION) === sessionId) {
            localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION);
          }
          set({ user: null, token: null, sessionId: null });
          return true;
        }),
    }),
    {
      name: PERSIST_KEY,
      // The session token is already persisted under LOCAL_STORAGE_KEYS.TOKEN.
      // Never let zustand serialize a second plaintext copy into "user-storage":
      // one XSS-readable location is bad enough, two is pure extra exposure.
      partialize: (state) => ({ user: state.user }),
    }
  )
);
