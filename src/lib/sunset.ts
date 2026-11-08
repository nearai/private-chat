export const SHUTDOWN_AT = Date.parse("2026-11-15T00:00:00Z");
export const SHUTDOWN_DATE = "November 15, 2026";

export function isPrivateChatShutdown(now = Date.now()): boolean {
  return now >= SHUTDOWN_AT;
}
