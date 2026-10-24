/** OAuth callbacks accept only a PKCE-bound code and its initiating state.
 * Bearer credentials are stripped from URLs and discarded before third-party startup.
 */
export const CREDENTIAL_URL_PARAMS = ["token", "session_id", "code"] as const;

export interface AuthCallbackCredentials {
  code: string | null;
  state: string | null;
  invalid: boolean;
}

export interface StrippedCallback {
  query: AuthCallbackCredentials;
  search: string;
  hash: string;
  changed: boolean;
}

const emptyCredentials = (): AuthCallbackCredentials => ({ code: null, state: null, invalid: false });

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

/** Strip every credential copy, including encoded parameter names and duplicates.
 * Ordinary non-auth codes and plain anchors remain unchanged.
 */
export function readAndStripCallbackCredentials(
  search: string,
  hash: string,
  includeCallbackCode = false
): StrippedCallback {
  const params = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const hasBearer = [params, fragment].some((values) => values.has("token") || values.has("session_id"));
  const hasCode = includeCallbackCode && params.has("code");
  const invalid =
    hasBearer ||
    params.has("oauth_channel") ||
    (includeCallbackCode && fragment.has("code")) ||
    (hasCode &&
      (params.getAll("code").length !== 1 ||
        !params.get("code") ||
        params.getAll("state").length !== 1 ||
        !params.get("state")));
  const query: AuthCallbackCredentials = {
    code: hasCode && !invalid ? params.get("code") : null,
    state: hasCode && !invalid ? params.get("state") : null,
    invalid: Boolean(invalid),
  };
  const searchChanged = removeCredentials(params, includeCallbackCode);
  const hashChanged = removeCredentials(fragment, includeCallbackCode);
  const nextSearch = params.toString();
  const nextHash = fragment.toString();
  return {
    query,
    search: searchChanged ? (nextSearch ? `?${nextSearch}` : "") : search,
    hash: hashChanged ? (nextHash ? `#${nextHash}` : "") : hash,
    changed: searchChanged || hashChanged,
  };
}

let queryHandoff = emptyCredentials();
let consumed = false;
let urlSanitized = false;

/** Run synchronously before analytics or support scripts start. */
export function consumeAuthCallbackCredentials(): boolean {
  if (consumed) return urlSanitized;
  consumed = true;
  if (typeof window === "undefined") {
    urlSanitized = true;
    return true;
  }
  try {
    const { search, hash, changed, query } = readAndStripCallbackCredentials(
      window.location.search,
      window.location.hash,
      window.location.pathname === "/auth" || window.location.pathname.startsWith("/auth/")
    );
    if (changed) {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${search}${hash}`);
    }
    queryHandoff = query;
    urlSanitized = true;
    return true;
  } catch {
    queryHandoff = { ...emptyCredentials(), invalid: true };
    return false;
  }
}

export function getQueryCallbackCredentials(): AuthCallbackCredentials {
  return queryHandoff;
}

export function clearQueryCallbackCredentials(): void {
  queryHandoff = emptyCredentials();
}

/** Test seam: forget everything captured so far. */
export function resetAuthCallbackCredentials(): void {
  queryHandoff = emptyCredentials();
  consumed = false;
  urlSanitized = false;
}
