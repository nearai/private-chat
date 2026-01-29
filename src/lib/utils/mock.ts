import { MOCK_MESSAGE_RESPONSE_ID_PREFIX } from "@/lib/constants";
import { ConversationRoles, ConversationTypes, type ConversationModelOutput } from "@/types";

/**
 * Unwrap a mock response_id to get the original response_id
 */
export function unwrapMockResponseID(id?: string) {
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

export function generateMockAIResponseID(userRespId: string): string {
  return `mock_ai_resp_${userRespId}`;
}

export function generateMockAIResponse(
  userMsgId: string,
  userRespId: string,
  model: string
): ConversationModelOutput {
  return {
    id: generateMockAIResponseID(userMsgId),
    type: ConversationTypes.MESSAGE,
    response_id: userRespId,
    next_response_ids: [],
    created_at: Date.now(),
    status: "pending",
    role: ConversationRoles.ASSISTANT,
    content: [
      {
        type: "output_text",
        text: "Generating response...",
        annotations: [],
      }
    ],
    model,
  }
}
