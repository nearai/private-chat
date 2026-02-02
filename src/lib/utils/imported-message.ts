import type { Conversation, ConversationItem } from "@/types";
import dayjs from "dayjs";
import { MOCK_MESSAGE_RESPONSE_ID_PREFIX } from "../constants";

export function isImportedMessage(conversation: Conversation, message: ConversationItem): boolean {
    if (!conversation.metadata) return false;
    if (!message) return false;
    const importedAtStr = conversation.metadata?.imported_at;
    if (!importedAtStr) return false;
    if (message.response_id?.startsWith(MOCK_MESSAGE_RESPONSE_ID_PREFIX)) {
        return true;
    }
    const importedAt = dayjs(Number(importedAtStr));
    const msgCreatedAt = dayjs(message.created_at * 1000);
    return Math.abs(msgCreatedAt.diff(importedAt, 'second')) < 59;
}