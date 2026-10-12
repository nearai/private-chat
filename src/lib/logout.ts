import { authClient } from "@/api/auth/client";
import { eventEmitter } from "@/lib/event";
import { useUserStore } from "@/stores/useUserStore";

/**
 * Revoke the current server-side session before clearing local credentials.
 *
 * Keeping these operations ordered prevents the UI from reporting a completed
 * sign-out while the bearer token is still valid on the server.
 */
export async function revokeCurrentSessionAndLogout(): Promise<boolean> {
  const expectedToken = useUserStore.getState().token;
  if (!expectedToken) return false;

  try {
    await authClient.signOut();
  } catch (error) {
    // A bearer-authenticated 401 proves this session is already invalid. Await
    // the guarded cleanup instead of racing an asynchronous event listener.
    if (!(typeof error === "object" && error !== null && "status" in error && error.status === 401)) {
      const currentToken = useUserStore.getState().token;
      if (!currentToken) return true;
      if (currentToken !== expectedToken) return false;
      throw error;
    }
  }

  if (useUserStore.getState().token !== expectedToken) return false;
  return new Promise((complete) => eventEmitter.emit("logout", { expectedToken, complete }));
}
