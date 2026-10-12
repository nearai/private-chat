/**
 * Query/hash parameters that carry credentials on the OAuth callback.
 *
 * New OAuth callbacks carry a short-lived, PKCE-bound code; legacy deployments
 * may still redirect to `/auth?token=<bearer>&session_id=...`, and one older
 * flow delivers those values in the fragment. Remove either handoff before
 * analytics or support scripts can observe it.
 */
export const CREDENTIAL_URL_PARAMS = ["token", "session_id", "code"] as const;

export interface AuthCallbackCredentials {
  token: string | null;
  sessionId: string | null;
  code: string | null;
}

export interface StrippedCallback {
  /** Credentials found in the query string. */
  query: AuthCallbackCredentials;
  /** Credentials found in the fragment. */
  fragment: AuthCallbackCredentials;
  search: string;
  hash: string;
  changed: boolean;
}

const EMPTY_CREDENTIALS: AuthCallbackCredentials = { token: null, sessionId: null, code: null };

function takeCredentials(params: URLSearchParams, includeCallbackCode: boolean): AuthCallbackCredentials {
  return {
    token: params.get("token"),
    sessionId: params.get("session_id"),
    code: includeCallbackCode ? params.get("code") : null,
  };
}

function removeCredentials(params: URLSearchParams, includeCallbackCode: boolean): boolean {
  let removed = false;
  for (const name of CREDENTIAL_URL_PARAMS) {
    if (name === "code" && !includeCallbackCode) continue;
    if (params.has(name)) {
      params.delete(name);
      removed = true;
    }
  }
  return removed;
}

/**
 * Pure core: pulls the credentials out of a location's query and fragment and
 * returns the same location with only those parameters removed.
 *
 * A fragment that is a plain anchor (`#plans`) is left untouched — parsing and
 * re-serializing it as a query string would corrupt it.
 */
export function readAndStripCallbackCredentials(
  search: string,
  hash: string,
  includeCallbackCode = false
): StrippedCallback {
  let query = { ...EMPTY_CREDENTIALS };
  let fragment = { ...EMPTY_CREDENTIALS };
  let nextSearch = search;
  let nextHash = hash;
  let changed = false;

  if (search) {
    const params = new URLSearchParams(search);
    query = takeCredentials(params, includeCallbackCode);
    if (removeCredentials(params, includeCallbackCode)) {
      const rest = params.toString();
      nextSearch = rest ? `?${rest}` : "";
      changed = true;
    }
  }

  if (hash) {
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    fragment = takeCredentials(params, includeCallbackCode);
    if (removeCredentials(params, includeCallbackCode)) {
      const rest = params.toString();
      nextHash = rest ? `#${rest}` : "";
      changed = true;
    }
  }

  return { query, fragment, search: nextSearch, hash: nextHash, changed };
}

const emptyCredentials = (): AuthCallbackCredentials => ({ ...EMPTY_CREDENTIALS });

let queryHandoff = emptyCredentials();
let hashHandoff = emptyCredentials();
let consumed = false;
let urlSanitized = false;

/**
 * Reads the callback credentials and rewrites the address bar without them.
 *
 * Must run synchronously before anything else starts — analytics included — so
 * no other code ever observes a URL carrying the credential. The values are
 * handed to the auth flow in memory instead.
 *
 * Query and fragment credentials are kept apart because different consumers own
 * them: AuthPage drives the `?token=` flow, useAppInitialization the `#token=`
 * one. Sharing a single slot would let whichever effect runs first clear the
 * other's value — and child effects run before their parent's.
 */
export function consumeAuthCallbackCredentials(): boolean {
  if (consumed) return urlSanitized;
  consumed = true;

  if (typeof window === "undefined") {
    urlSanitized = true;
    return true;
  }

  try {
    const { search, hash, changed, query, fragment } = readAndStripCallbackCredentials(
      window.location.search,
      window.location.hash,
      window.location.pathname === "/auth" || window.location.pathname.startsWith("/auth/")
    );
    queryHandoff = query;
    hashHandoff = fragment;
    if (changed) {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${search}${hash}`);
    }
    urlSanitized = true;
    return true;
  } catch {
    // The app may still boot, but callers must not initialize third-party
    // scripts while a callback credential might remain in the address bar.
    return false;
  }
}

/** Credentials delivered in the query string. Owned by the auth page. */
export function getQueryCallbackCredentials(): AuthCallbackCredentials {
  return queryHandoff;
}

/**
 * Forgets the query credentials once the auth page has acted on them, so a later
 * remount — after a logout redirect, say — does not replay a spent token.
 */
export function clearQueryCallbackCredentials(): void {
  queryHandoff = emptyCredentials();
}

/** Credentials delivered in the fragment. Owned by app initialization. */
export function getHashCallbackCredentials(): AuthCallbackCredentials {
  return hashHandoff;
}

export function clearHashCallbackCredentials(): void {
  hashHandoff = emptyCredentials();
}

/** Test seam: forgets everything captured so far. */
export function resetAuthCallbackCredentials(): void {
  queryHandoff = emptyCredentials();
  hashHandoff = emptyCredentials();
  consumed = false;
  urlSanitized = false;
}
