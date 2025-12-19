import { MOCK_MESSAGE_RESPONSE_ID_PREFIX } from "@/lib/constants";

/**
 * Unwrap a mock response_id to get the original response_id
 */
export function unwrapMockResponseId(id?: string) {
  if (!id) return id;
  return id.replace(new RegExp(`^${MOCK_MESSAGE_RESPONSE_ID_PREFIX}\\d+_`), "");
}

/**
 * Wrap an original response_id into a mock response_id
 * Format: mock_resp_<index>_<originalId>
 */
export function wrapMockResponseID(
  originalId: string,
  index: number
): string {
  return `${MOCK_MESSAGE_RESPONSE_ID_PREFIX}${index + 1}_${originalId}`;
}
