import { produce } from "immer";
import { create } from "zustand";
import { type CombinedResponse, combineMessagesById, extractBatchFromHistory, findLastResponseId } from "@/lib";
import type { Conversation, ConversationItem } from "@/types";
import { convertImportedMessages } from "@/lib/message-converter";
import { DEFAULT_CONVERSATION_TITLE } from "@/lib/constants";

export type ConversationDerivedState = {
  conversationId: string;
  conversation: Conversation;
  history: {
    messages: Record<string, CombinedResponse>;
  };
  allMessages: Record<string, ConversationItem>;
  importedMessagesIdMapping?: Record<string, string>;
  lastResponseId: string | null;
  batches: string[];
};

export type ConversationInitStatus = 'initializing' | 'ready';
export type ConversationStreamStatus = 'streaming' | 'idle';

export interface ConversationStoreState {
  conversation: ConversationDerivedState | null;
  conversationInitStatus: Map<string, ConversationInitStatus>;
  conversationStreamStatus: Map<string, ConversationStreamStatus>;
  setConversationData: (conversation: Conversation, previous_response_id?: string | null) => void;
  updateConversation: (updater: (state: ConversationStoreState) => ConversationStoreState) => void;
  setLastResponseId: (nextId: string) => void;
  resetConversation: () => void;
  setConversationInitStatus: (conversationId: string, status: ConversationInitStatus) => void;
  setConversationStreamStatus: (conversationId: string, status: ConversationStreamStatus) => void;
}

export const createEmptyConversation = (conversationId: string): Conversation => ({
  id: conversationId,
  created_at: Date.now(),
  metadata: {
    title: DEFAULT_CONVERSATION_TITLE,
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
  let importedMessagesIdMapping: Record<string, string> = {};
  let messages = conversation.data || [];

  if (isImportedConversation) {
    const converted = convertImportedMessages(conversation, messages);
    messages = converted.newMessages;
    importedMessagesIdMapping = converted.idMapping || {};
  }

  const { history, allMessages, currentId } = combineMessagesById(messages);
  const lastResponseId = preserveLastResponseId ?? currentId;
  const batches = extractBatchFromHistory(history, lastResponseId);
  return {
    conversationId: conversation.id,
    conversation,
    history,
    allMessages,
    importedMessagesIdMapping,
    lastResponseId,
    batches,
  };
};

export const useConversationStore = create<ConversationStoreState>((set) => ({
  conversation: null,
  conversationInitStatus: new Map(),
  conversationStreamStatus: new Map(),
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
  setConversationInitStatus: (conversationId: string, status: ConversationInitStatus) =>
    set((state) => {
      const newStatus = new Map(state.conversationInitStatus);
      newStatus.set(conversationId, status);
      return {
        conversationInitStatus: newStatus,
      };
    }),
  setConversationStreamStatus: (conversationId: string, status: ConversationStreamStatus) =>
    set((state) => {
      const newStatus = new Map(state.conversationStreamStatus);
      newStatus.set(conversationId, status);
      return {
        conversationStreamStatus: newStatus,
      };
    }),
}));
