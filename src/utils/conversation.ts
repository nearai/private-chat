import type { Conversation, ConversationInfo } from "@/types";

export const checkIsImportedConversation = (conversation?: Conversation | ConversationInfo) => {
    if (!conversation) return false;
    return !!conversation.metadata?.imported_at || !!conversation.metadata?.cloned_from_id;
};
