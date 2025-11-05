import { create } from "zustand";
import type { Chat, ChatInfo, ChatStore, Message, Model } from "../types";

export const useChatStore = create<ChatStore>((set) => ({
  chats: [],
  setChats: (chats: ChatInfo[]) => set({ chats }),

  currentChat: null,
  setCurrentChat: (chat: Chat | null) => set({ currentChat: chat }),
  isLoading: false,
  models: [],
  selectedModels: [],

  setModels: (models: Model[]) => set({ models }),

  addChat: (chat: ChatInfo) => set((state) => ({ chats: [chat, ...state.chats] })),

  updateChat: (id: string, chatUpdate: Partial<ChatInfo>) =>
    set((state) => ({
      chats: state.chats.map((chat) => (chat.id === id ? { ...chat, ...chatUpdate } : chat)),
    })),

  deleteChat: (id: string) =>
    set((state) => ({
      chats: state.chats.filter((chat) => chat.id !== id),
    })),

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setSelectedModels: (models: string[]) => set({ selectedModels: models }),

  addMessage: (message: Message) =>
    set((state) => {
      if (!state.currentChat) return state;

      return {
        currentChat: {
          ...state.currentChat,
          chat: {
            ...state.currentChat.chat,
            history: {
              ...state.currentChat.chat.history,
              messages: {
                ...state.currentChat.chat.history.messages,
                [message.id]: message,
              },
              currentId: message.id,
            },
            messages: [...state.currentChat.chat.messages, message],
          },
        },
      };
    }),

  updateMessage: (messageId: string, update: Partial<Message>) =>
    set((state) => {
      if (!state.currentChat) return state;

      const currentMessage = state.currentChat.chat.history.messages[messageId];
      if (!currentMessage) return state;

      const updatedMessage = { ...currentMessage, ...update };

      return {
        currentChat: {
          ...state.currentChat,
          chat: {
            ...state.currentChat.chat,
            history: {
              ...state.currentChat.chat.history,
              messages: {
                ...state.currentChat.chat.history.messages,
                [messageId]: updatedMessage,
              },
            },
            messages: state.currentChat.chat.messages.map((msg) => (msg.id === messageId ? updatedMessage : msg)),
          },
        },
      };
    }),
  appendToMessage: (messageId: string, content: string) =>
    set((state) => {
      if (!state.currentChat) return state;

      const message = state.currentChat.chat.history.messages[messageId];
      if (!message) return state;

      const updatedMessage = {
        ...message,
        content: message.content + content,
      };

      return {
        currentChat: {
          ...state.currentChat,
          chat: {
            ...state.currentChat.chat,
            history: {
              ...state.currentChat.chat.history,
              messages: {
                ...state.currentChat.chat.history.messages,
                [messageId]: updatedMessage,
              },
            },
            messages: state.currentChat.chat.messages.map((msg) => (msg.id === messageId ? updatedMessage : msg)),
          },
        },
      };
    }),
}));
