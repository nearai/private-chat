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
    // ApiClient treats a 401 as proof that the server session is already
    // invalid and emits logout before rethrowing. Do not report that outcome
    // as a failed sign-out after local credentials have already been cleared.
    const currentToken = useUserStore.getState().token;
    if (!currentToken) return true;
    if (currentToken !== expectedToken) return false;
    throw error;
  }

  if (useUserStore.getState().token !== expectedToken) return false;
  eventEmitter.emit("logout", { expectedToken });
  return true;
}
