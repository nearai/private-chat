import type { Conversation, ConversationItem } from "@/types";
import dayjs from "dayjs";
import { IMPORT_TIMESTAMP_TOLERANCE_SECONDS, MOCK_MESSAGE_RESPONSE_ID_PREFIX } from "../constants";

export function isImportedMessage(conversation: Conversation, message: ConversationItem): boolean {
    if (!message) return false;
    let importedAtNum: number | undefined;
    const importedAtStr = conversation.metadata?.imported_at;
    if (importedAtStr) {
        importedAtNum = Number(importedAtStr);
    } else {
        const cloneFromId = conversation.metadata?.cloned_from_id;
        if (cloneFromId) {
            importedAtNum = conversation.created_at * 1000;
        }
    }

    if (!importedAtNum) return false;
    if (message.response_id?.startsWith(MOCK_MESSAGE_RESPONSE_ID_PREFIX)) {
        return true;
    }
    const importedAt = dayjs(importedAtNum);
    const msgCreatedAt = dayjs(message.created_at * 1000);
    return Math.abs(msgCreatedAt.diff(importedAt, 'second')) < IMPORT_TIMESTAMP_TOLERANCE_SECONDS;
}