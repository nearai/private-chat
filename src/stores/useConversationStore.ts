import { produce } from "immer";
import { create } from "zustand";
import { type CombinedResponse, combineMessagesById, extractBatchFromHistory, findLastResponseId } from "@/lib";
import type { Conversation, ConversationItem } from "@/types";
import { convertImportedMessages } from "@/lib/message-converter";

export type ConversationDerivedState = {
  conversationId: string;
  conversation: Conversation;
  history: {
    messages: Record<string, CombinedResponse>;
  };
  messagesList: ConversationItem[];
  allMessages: Record<string, ConversationItem>;
  lastResponseId: string | null;
  batches: string[];
};

export interface ConversationStoreState {
  conversation: ConversationDerivedState | null;
  setConversationData: (conversation: Conversation, previous_response_id?: string | null) => void;
  updateConversation: (updater: (state: ConversationStoreState) => ConversationStoreState) => void;
  setLastResponseId: (nextId: string) => void;
  resetConversation: () => void;
}

export const createEmptyConversation = (conversationId: string): Conversation => ({
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

export const buildConversationEntry = (
  conversation: Conversation,
  preserveLastResponseId?: string | null
): ConversationDerivedState => {
  const isImportedConversation = conversation.metadata?.initial_created_at !== undefined;
  const messages = conversation.data || [];
  const messagesList =  isImportedConversation ? convertImportedMessages(conversation, messages) : messages;
  const { history, allMessages, currentId } = combineMessagesById(messagesList  );
  const lastResponseId = preserveLastResponseId ?? currentId;
  const batches = extractBatchFromHistory(history, lastResponseId);

  return {
    conversationId: conversation.id,
    conversation,
    history,
    allMessages,
    messagesList,
    lastResponseId,
    batches,
  };
};

export const useConversationStore = create<ConversationStoreState>((set) => ({
  conversation: null,
  setConversationData: (conversation: Conversation, previous_response_id?: string | null) =>
    set((state) => {
      if (!conversation) return state;
      const nextEntry = buildConversationEntry(conversation, previous_response_id ?? null);
      return {
        conversation: nextEntry,
      };
    }),

  updateConversation: (updater) =>
    set((state) => {
      return produce(state, updater);
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
      return { conversation: null };
    }),
}));
