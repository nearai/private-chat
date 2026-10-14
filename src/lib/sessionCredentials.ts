import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { useUserStore } from "@/stores/useUserStore";

export type SessionWriteOptions = { expectedToken: string | null; isCurrent?: () => boolean };

export function clearLegacyHashCredentials(): void {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (!params.has("token") && !params.has("session_id")) return;
  params.delete("token");
  params.delete("session_id");
  const hash = params.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ""}`);
}

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
    if (options && (localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN) !== options.expectedToken || options.isCurrent?.() === false)) return false;
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
