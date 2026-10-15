type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Removes a plaintext `token` field left in a zustand persist record that was
 * written before `partialize` excluded it.
 *
 * zustand only runs a `migrate` function for records carrying a numeric
 * `version`, and the legacy records were written without one — so relying on
 * `migrate` would leave the credential sitting in localStorage indefinitely.
 *
 * Returns true when a record was rewritten or dropped.
 */
export function purgeLegacyPersistedToken(storage: StorageLike, key: string): boolean {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return false;
  }
  if (!raw) return false;

  try {
    const record = JSON.parse(raw) as { state?: Record<string, unknown> } | null;
    const state = record?.state;
    if (!state || typeof state !== "object" || !("token" in state)) return false;
    delete state.token;
    storage.setItem(key, JSON.stringify(record));
    return true;
  } catch {
    // Unparseable record: drop it rather than leave a credential behind. It only
    // caches the user profile, which is refetched on the next load.
    storage.removeItem(key);
    return true;
  }
}
