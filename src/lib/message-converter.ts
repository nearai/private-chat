
import type { Conversation, ConversationItem } from "@/types";
import { wrapMockResponseID } from "./utils/mock";
import { isImportedMessage } from "./utils/imported-message";

export function convertImportedMessages(
  conversation: Conversation,
  messages: ConversationItem[],
): {
  newMessages: ConversationItem[];
  idMapping?: Record<string, string>;
} {
  let importedAtStr = conversation.metadata?.imported_at;
  const cloneFromId = conversation.metadata?.cloned_from_id;
  if (cloneFromId) {
    importedAtStr = conversation.created_at.toString();
  }

  if (!importedAtStr) {
    return {
      newMessages: messages,
      idMapping: {},
    };
  }

  const result = messages.map(m => ({ ...m }));
  const idMapping: Record<string, string> = {};

  result.forEach((msg, index) => {
    if (isImportedMessage(conversation, msg)) {
      if (msg.response_id in idMapping) {
        msg.response_id = idMapping[msg.response_id];
        return;
      }
      idMapping[msg.response_id] = wrapMockResponseID(msg.response_id, index);
      msg.response_id = idMapping[msg.response_id];
    }
  });
  if (Object.keys(idMapping).length === 0) {
    return {
      newMessages: result,
      idMapping: {},
    };
  }

  result.forEach((msg) => {
    if (msg.previous_response_id && idMapping[msg.previous_response_id]) {
      msg.previous_response_id = idMapping[msg.previous_response_id];
    }

    if (msg.next_response_ids && msg.next_response_ids.length > 0) {
      msg.next_response_ids = msg.next_response_ids.map(
        (id) => idMapping[id] || id
      );
    }
  });

  return {
    newMessages: result,
    idMapping,
  };
}
