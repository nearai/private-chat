import { produce } from "immer";
import { create } from "zustand";

import { type CombinedResponse, combineMessagesById, extractBatchFromHistory } from "@/lib";
import type { Conversation, ConversationItem } from "@/types";

export type ConversationDerivedState = {
  conversation: Conversation;
  history: {
    messages: Record<string, CombinedResponse>;
  };
  allMessages: Record<string, ConversationItem>;
  currentId: string | null;
  currentMessageId: string | null;
  batches: string[];
};

interface ConversationStoreState {
  conversations: Record<string, ConversationDerivedState>;
  setConversationData: (
    conversationId: string,
    conversation: Conversation | undefined,
    overrideCurrentMessageId?: string | null
  ) => void;
  updateConversation: (
    conversationId: string,
    updater: (draft: Conversation) => void,
    options?: { overrideCurrentMessageId?: string | null; baseConversation?: Conversation }
  ) => void;
  setCurrentMessageId: (conversationId: string, nextId: string | null) => void;
  resetConversation: (conversationId: string) => void;
  clear: () => void;
}

const createEmptyConversation = (conversationId: string): Conversation => ({
  id: conversationId,
  created_at: Date.now(),
  metadata: {
    title: "New Conversation",
  },
  data: [],
  has_more: false,
  first_id: "",
  last_id: "",
  object: "list",
});

const buildConversationEntry = (
  conversation: Conversation,
  previous?: ConversationDerivedState,
  overrideCurrentMessageId?: string | null
): ConversationDerivedState => {
  const { history, allMessages, currentId } = combineMessagesById(conversation.data ?? []);

  let resolvedCurrentMessageId = overrideCurrentMessageId ?? previous?.currentMessageId ?? null;
  if (resolvedCurrentMessageId && !history.messages[resolvedCurrentMessageId]) {
    resolvedCurrentMessageId = null;
  }
  if (!resolvedCurrentMessageId) {
    resolvedCurrentMessageId = currentId;
  }

  const batches = extractBatchFromHistory(history, resolvedCurrentMessageId);

  return {
    conversation,
    history,
    allMessages,
    currentId,
    currentMessageId: resolvedCurrentMessageId,
    batches,
  };
};

export const useConversationStore = create<ConversationStoreState>((set) => ({
  conversations: {},
  setConversationData: (conversationId, conversation, overrideCurrentMessageId) =>
    set((state) => {
      if (!conversation) return state;
      const nextEntry = buildConversationEntry(
        conversation,
        state.conversations[conversationId],
        overrideCurrentMessageId
      );
      return {
        conversations: {
          ...state.conversations,
          [conversationId]: nextEntry,
        },
      };
    }),
  updateConversation: (conversationId, updater, options) =>
    set((state) => {
      const previous = state.conversations[conversationId];
      const baseConversation =
        previous?.conversation ?? options?.baseConversation ?? createEmptyConversation(conversationId);
      const nextConversation = produce(baseConversation, (draft) => {
        updater(draft);
      });

      const nextEntry = buildConversationEntry(nextConversation, previous, options?.overrideCurrentMessageId ?? null);

      return {
        conversations: {
          ...state.conversations,
          [conversationId]: nextEntry,
        },
      };
    }),
  setCurrentMessageId: (conversationId, nextId) =>
    set((state) => {
      const existing = state.conversations[conversationId];

      if (!existing) {
        const baseConversation = createEmptyConversation(conversationId);
        const entry = buildConversationEntry(baseConversation, undefined, nextId);
        return {
          conversations: {
            ...state.conversations,
            [conversationId]: entry,
          },
        };
      }

      const candidateCurrentId = nextId ?? existing.currentMessageId ?? existing.currentId;
      const hasNode = candidateCurrentId ? Boolean(existing.history.messages[candidateCurrentId]) : false;
      const batches = hasNode ? extractBatchFromHistory(existing.history, candidateCurrentId) : existing.batches;

      return {
        conversations: {
          ...state.conversations,
          [conversationId]: {
            ...existing,
            currentMessageId: candidateCurrentId,
            batches,
          },
        },
      };
    }),
  resetConversation: (conversationId) =>
    set((state) => {
      if (!state.conversations[conversationId]) return state;
      const { [conversationId]: _removed, ...rest } = state.conversations;
      return {
        conversations: rest,
      };
    }),
  clear: () => set({ conversations: {} }),
}));

export { createEmptyConversation };
