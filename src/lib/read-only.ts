// Keep conversation creation and editing disabled; reads, exports, deletion, and user settings remain available.
export const CONVERSATION_WRITES_ENABLED: boolean = false;
export const READ_ONLY_MESSAGE = "Private Chat is read-only. You can view and export existing conversations.";

export function assertConversationWritesEnabled(): void {
  if (!CONVERSATION_WRITES_ENABLED) {
    throw new Error(READ_ONLY_MESSAGE);
  }
}
