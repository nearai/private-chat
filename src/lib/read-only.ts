// Conversations are read-only. Keep reads, local exports, and user settings available.
export const CONVERSATION_WRITES_ENABLED: boolean = false;
export const READ_ONLY_MESSAGE = "Private Chat is read-only. You can view and export existing conversations.";

export function assertConversationWritesEnabled(): void {
  if (!CONVERSATION_WRITES_ENABLED) {
    throw new Error(READ_ONLY_MESSAGE);
  }
}
