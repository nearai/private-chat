import type { Conversation, ConversationItem } from "@/types";
import dayjs from "dayjs";
import { IMPORT_TIMESTAMP_TOLERANCE_SECONDS, MOCK_MESSAGE_RESPONSE_ID_PREFIX } from "../constants";

export function isImportedMessage(conversation: Conversation, message: ConversationItem): boolean {
  if (!message) return false;
  const importedAtStr = conversation.metadata?.imported_at;
  if (!importedAtStr) return false;

  const importedAtNum = Number(importedAtStr);
  if (importedAtNum === undefined || !Number.isFinite(importedAtNum)) return false;
  if (message.response_id?.startsWith(MOCK_MESSAGE_RESPONSE_ID_PREFIX)) {
    return true;
  }
  const importedAt = dayjs(importedAtNum);
  const msgCreatedAt = dayjs(message.created_at * 1000);

  return Math.abs(msgCreatedAt.diff(importedAt, 'second')) < IMPORT_TIMESTAMP_TOLERANCE_SECONDS;
}

export function isClonedMessage(conversation?: Conversation, message?: ConversationItem): boolean {
  if (!message || !conversation) return false;
  const cloneFromId = conversation.metadata?.cloned_from_id;
  if (!cloneFromId) {
    return false;
  }
  const clonedAt = dayjs(conversation.created_at * 1000);
  const msgCreatedAt = dayjs(message.created_at * 1000);

  return msgCreatedAt.isBefore(clonedAt) || Math.abs(msgCreatedAt.diff(clonedAt, 'second')) < IMPORT_TIMESTAMP_TOLERANCE_SECONDS;
}