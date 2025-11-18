import { create } from "zustand";
import type { ChatStore, ModelV1 } from "../types";

export const useChatStore = create<ChatStore>((set) => ({
  webSearchEnabled: true,
  setWebSearchEnabled: (webSearchEnabled: boolean) => set({ webSearchEnabled }),
  models: [],
  selectedModels: [],
  setModels: (models: ModelV1[]) => set({ models }),
  setSelectedModels: (models: string[]) => set({ selectedModels: models }),
  isEditingChatName: false,
  editingChatId: null as string | null,
  startEditingChatName: (chatId: string) =>
    set({
      isEditingChatName: true,
      editingChatId: chatId,
    }),

  stopEditingChatName: () =>
    set({
      isEditingChatName: false,
      editingChatId: null,
    }),
}));
