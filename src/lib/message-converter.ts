import dayjs from "dayjs";
import { MOCK_MESSAGE_RESPONSE_ID_PREFIX } from "@/lib/constants";
import type { Conversation, ConversationItem } from "@/types";

export function convertImportedMessages(
  conversation: Conversation,
  messages: ConversationItem[],
): {
  newMessages: ConversationItem[];
  idMapping?: Record<string, string>;
} {
  const importedAtStr = conversation.metadata?.imported_at;
  if (!importedAtStr) return {
    newMessages: messages,
    idMapping: {},
  };

  const importedAt = dayjs(Number(importedAtStr));
  const result = messages.map(m => ({ ...m }));
  const importedIndices: number[] = [];
  
  result.forEach((msg, index) => {
    const msgCreatedAt = dayjs(msg.created_at * 1000);
    if (Math.abs(msgCreatedAt.diff(importedAt, 'second')) < 10) {
      importedIndices.push(index);
    }
  });
  if (importedIndices.length === 0) {
    return {
      newMessages: result,
      idMapping: {},
    };
  }

  const idMapping: Record<string, string> = {};

  // 1. Update IDs for imported messages and record mapping
  importedIndices.forEach((index) => {
    const oldId = result[index].response_id;
    const newId = `${MOCK_MESSAGE_RESPONSE_ID_PREFIX}${index + 1}_${oldId}`;
    result[index].response_id = newId;
    idMapping[oldId] = newId;
  });

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

  importedIndices.forEach((index) => {
    const msg = result[index];

    // Connect with previous
    if (index > 0) {
      const prevMsg = result[index - 1];
      msg.previous_response_id = prevMsg.response_id;
      prevMsg.next_response_ids = [msg.response_id];
    } else {
      msg.previous_response_id = undefined;
    }

    // Connect with next
    if (index < result.length - 1) {
      const nextMsg = result[index + 1];
      msg.next_response_ids = [nextMsg.response_id];
      nextMsg.previous_response_id = msg.response_id;
    } else {
      msg.next_response_ids = [];
    }
  });

  return {
    newMessages: result,
    idMapping,
  };
}
