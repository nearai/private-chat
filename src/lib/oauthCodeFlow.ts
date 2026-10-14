const OAUTH_CODE_VERIFIER_KEY = "oauth_code_verifier";
const OAUTH_FRONTEND_STATE_KEY = "oauth_frontend_state";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomBase64Url(cryptoApi: Crypto): string {
  const bytes = new Uint8Array(32);
  cryptoApi.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function createPkceChallenge(verifier: string, cryptoApi: Crypto = globalThis.crypto): Promise<string> {
  const digest = await cryptoApi.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export async function prepareOAuthCodeFlow(
  storage: StorageLike = sessionStorage,
  cryptoApi: Crypto = globalThis.crypto
): Promise<{ codeChallenge: string; state: string }> {
  const verifier = randomBase64Url(cryptoApi);
  const state = randomBase64Url(cryptoApi);
  const codeChallenge = await createPkceChallenge(verifier, cryptoApi);

  // Persist only after all cryptographic operations succeed. A navigation must
  // never start unless its verifier and state can survive the OAuth round trip.
  storage.setItem(OAUTH_CODE_VERIFIER_KEY, verifier);
  storage.setItem(OAUTH_FRONTEND_STATE_KEY, state);
  return { codeChallenge, state };
}

export function consumeOAuthCodeFlow(returnedState: string | null, storage: StorageLike = sessionStorage): string {
  const verifier = storage.getItem(OAUTH_CODE_VERIFIER_KEY);
  const expectedState = storage.getItem(OAUTH_FRONTEND_STATE_KEY);
  storage.removeItem(OAUTH_CODE_VERIFIER_KEY);
  storage.removeItem(OAUTH_FRONTEND_STATE_KEY);

  if (!verifier || !expectedState || !returnedState || returnedState !== expectedState) {
    throw new Error("Invalid OAuth callback state");
  }
  return verifier;
}

export function clearOAuthCodeFlow(storage?: StorageLike): void {
  try {
    const target = storage ?? sessionStorage;
    target.removeItem(OAUTH_CODE_VERIFIER_KEY);
    target.removeItem(OAUTH_FRONTEND_STATE_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted contexts. The caller
    // already fails closed by refusing to start or complete code-mode OAuth.
  }
}
