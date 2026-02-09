import type { Conversation, ConversationItem } from "@/types";
import dayjs from "dayjs";
import { IMPORT_TIMESTAMP_TOLERANCE_SECONDS, MOCK_MESSAGE_RESPONSE_ID_PREFIX } from "../constants";

export function isImportedMessage(conversation: Conversation, message: ConversationItem): boolean {
  if (!message) return false;
  const importedAtStr = conversation.metadata?.imported_at;
  const cloneFromId = conversation.metadata?.cloned_from_id;

  if (!importedAtStr && !cloneFromId) {
    return false;
  }

  const importedAtNum = importedAtStr ? Number(importedAtStr) : conversation.created_at * 1000;
  if (importedAtNum === undefined || !Number.isFinite(importedAtNum)) return false;
  if (message.response_id?.startsWith(MOCK_MESSAGE_RESPONSE_ID_PREFIX)) {
    return true;
  }
  const importedAt = dayjs(importedAtNum);
  const msgCreatedAt = dayjs(message.created_at * 1000);

  return msgCreatedAt.isBefore(importedAt) || Math.abs(msgCreatedAt.diff(importedAt, 'second')) < IMPORT_TIMESTAMP_TOLERANCE_SECONDS;
}
