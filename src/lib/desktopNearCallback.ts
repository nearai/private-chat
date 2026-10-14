import type { NearAuthResponse } from "@/api/auth/client";

function validateCallbackUrl(callback: string | null): string {
  if (!callback) throw new Error("Invalid desktop callback URL");
  const url = new URL(callback);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    !url.port ||
    url.pathname !== "/oauth/callback" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Invalid desktop callback URL");
  return url.href;
}

export function validateDesktopNearCallback(callback: string | null, state: string | null): string {
  if (!state || !/^[A-Za-z0-9_-]{43}$/.test(state)) throw new Error("Invalid desktop login state");
  return validateCallbackUrl(callback);
}

function validateLegacyChannel(channel: string | null): string {
  // Older desktop clients generate this channel with crypto.randomUUID().
  if (!channel || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(channel))
    throw new Error("Invalid desktop login channel");
  return channel;
}

export type DesktopNearCallback =
  | { mode: "post"; callbackUrl: string; state: string }
  | { mode: "legacy"; callbackUrl: string; oauthChannel: string };

/** Select the protocol before requesting a wallet signature; malformed modern requests never fall back. */
export function resolveDesktopNearCallback(params: URLSearchParams): DesktopNearCallback {
  for (const name of ["frontend_callback", "state", "oauth_channel"]) {
    if (params.getAll(name).length > 1) throw new Error("Duplicate desktop login parameter");
  }
  const callback = params.get("frontend_callback");
  if (params.has("state")) {
    const state = params.get("state") ?? "";
    return { mode: "post", callbackUrl: validateDesktopNearCallback(callback, state), state };
  }
  return {
    mode: "legacy",
    callbackUrl: validateCallbackUrl(callback),
    oauthChannel: validateLegacyChannel(params.get("oauth_channel")),
  };
}

export function completeDesktopNearCallback(callback: DesktopNearCallback, response: NearAuthResponse): void {
  if (callback.mode === "post") {
    postDesktopNearCallback(callback.callbackUrl, callback.state, response);
    return;
  }
  // Only old clients require a bearer URL. Keep the channel so their active
  // listener can match the response; modern requests never use this transport.
  const destination = new URL(validateCallbackUrl(callback.callbackUrl));
  destination.searchParams.set("oauth_channel", validateLegacyChannel(callback.oauthChannel));
  destination.searchParams.set("token", response.token);
  destination.searchParams.set("session_id", response.session_id);
  destination.searchParams.set("is_new_user", String(response.is_new_user));
  try {
    window.location.replace(destination.href);
  } catch {
    // Navigation exceptions can include the destination; do not log a bearer URL.
    throw new Error("Unable to deliver desktop login callback");
  }
}

/** A top-level form POST avoids placing credentials in navigation URLs or requiring loopback CORS. */
export function postDesktopNearCallback(callback: string, state: string, response: NearAuthResponse): void {
  const action = validateDesktopNearCallback(callback, state);
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  const fields = {
    token: response.token,
    session_id: response.session_id,
    is_new_user: String(response.is_new_user),
    state,
  };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  form.remove();
}
