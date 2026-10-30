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

export type DesktopNearCallback = { callbackUrl: string; state: string };

/** Validate the state-bound POST protocol before requesting a wallet signature. */
export function resolveDesktopNearCallback(params: URLSearchParams): DesktopNearCallback {
  for (const name of ["frontend_callback", "state"]) {
    if (params.getAll(name).length !== 1) throw new Error("Invalid desktop login parameter");
  }
  if (params.has("oauth_channel")) throw new Error("Unsupported desktop login protocol");
  const state = params.get("state") ?? "";
  return { callbackUrl: validateDesktopNearCallback(params.get("frontend_callback"), state), state };
}

export function completeDesktopNearCallback(callback: DesktopNearCallback, response: NearAuthResponse): void {
  postDesktopNearCallback(callback.callbackUrl, callback.state, response);
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
