export const UTM_SOURCE = "private_chat";
export const UTM_MEDIUM = "web";

/**
 * Adds default UTM parameters to a URL string.
 *
 * - Sets `utm_source` and `utm_medium` only when the corresponding query
 *   parameters are missing (e.g. `?utm_source=` is considered "present" and
 *   will not be overwritten).
 * - If the value cannot be parsed as a URL, the original `url` string is
 *   returned unchanged.
 *
 * @param url - A URL (absolute or relative) to augment.
 * @param base - Optional base used to resolve `url` when it's relative.
 * @returns The augmented URL as a string, or the original input on parse failure.
 */
export function withUtm(url: string, base?: string) {
  let u: URL;
  try {
    u = base ? new URL(url, base) : new URL(url);
  } catch (error) {
    console.error(
      `[withUtm] Failed to construct URL from value: "${url}". Returning original string.`,
      error
    );
    return url;
  }
  if (!u.searchParams.has("utm_source")) u.searchParams.set("utm_source", UTM_SOURCE);
  if (!u.searchParams.has("utm_medium")) u.searchParams.set("utm_medium", UTM_MEDIUM);
  return u.toString();
}
