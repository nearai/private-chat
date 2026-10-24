import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { useUserStore } from "@/stores/useUserStore";

export type SessionWriteOptions = { expectedToken: string | null; isCurrent?: () => boolean };

/** Support both the existing storage flow and the independently released session store. */
export async function setSessionCredentials(
  token: string,
  sessionId: string | null,
  options?: SessionWriteOptions
): Promise<boolean> {
  const state = useUserStore.getState();
  if ("setSession" in state && typeof state.setSession === "function") {
    return (await state.setSession(token, sessionId, options)) !== false;
  }
  const write = () => {
    if (
      options &&
      (localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN) !== options.expectedToken || options.isCurrent?.() === false)
    )
      return false;
    localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, token);
    if (sessionId) localStorage.setItem(LOCAL_STORAGE_KEYS.SESSION, sessionId);
    else localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION);
    return true;
  };
  const locks = globalThis.navigator?.locks;
  if (locks) {
    return locks.request("private-chat-auth-storage", write);
  }
  return write();
}
