export const UTM_SOURCE = "private_chat";
export const UTM_MEDIUM = "web";

export function withUtm(url: string) {
  const u = new URL(url);
  if (!u.searchParams.get("utm_source")) u.searchParams.set("utm_source", UTM_SOURCE);
  if (!u.searchParams.get("utm_medium")) u.searchParams.set("utm_medium", UTM_MEDIUM);
  return u.toString();
}
