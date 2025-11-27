import { produce } from "immer";
import { create } from "zustand";

import { type CombinedResponse, combineMessagesById, extractBatchFromHistory, findLastResponseId } from "@/lib";
import type { Conversation, ConversationItem } from "@/types";

export type ConversationDerivedState = {
  conversationId: string;
  conversation: Conversation;
  history: {
    messages: Record<string, CombinedResponse>;
  };
  allMessages: Record<string, ConversationItem>;
  lastResponseId: string | null;
  batches: string[];
};

interface ConversationStoreState {
  conversation: ConversationDerivedState | null;
  setConversationData: (conversation: Conversation) => void;
  updateConversation: (updater: (draft: Conversation) => void) => void;
  setLastResponseId: (nextId: string) => void;
  resetConversation: () => void;
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

const buildConversationEntry = (conversation: Conversation): ConversationDerivedState => {
  const { history, allMessages, currentId } = combineMessagesById(conversation.data ?? []);
  const batches = extractBatchFromHistory(history, currentId);

  return {
    conversationId: conversation.id,
    conversation,
    history,
    allMessages,
    lastResponseId: currentId,
    batches,
  };
};

export const useConversationStore = create<ConversationStoreState>((set) => ({
  conversation: null,
  setConversationData: (conversation) =>
    set((state) => {
      if (!conversation) return state;
      const nextEntry = buildConversationEntry(conversation);
      return {
        conversation: nextEntry,
      };
    }),

  updateConversation: (updater) =>
    set((state) => {
      if (!state.conversation) return state;
      const nextConversation = produce(
        state.conversation?.conversation ?? createEmptyConversation(state.conversation?.conversationId ?? ""),
        (draft) => {
          updater(draft);
        }
      );
      return { conversation: buildConversationEntry(nextConversation) };
    }),

  setLastResponseId: (nextId) =>
    set((state) => {
      if (!state.conversation) return state;

      const lastResponseId = findLastResponseId(state.conversation.history, nextId);

      const batches = extractBatchFromHistory(state.conversation.history, lastResponseId ?? nextId);

      return {
        conversation: {
          ...state.conversation,
          lastResponseId: lastResponseId ?? nextId,
          batches,
        },
      };
    }),
  resetConversation: () =>
    set((state) => {
      if (!state.conversation) return state;
      return { conversation: null, lastResponseId: null, batches: [], allMessages: {}, history: { messages: {} } };
    }),
}));

export { createEmptyConversation };
