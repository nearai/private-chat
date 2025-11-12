import { create } from "zustand";
import type { ChatStore, Model } from "../types";

export const useChatStore = create<ChatStore>((set) => ({
  webSearchEnabled: true,
  setWebSearchEnabled: (webSearchEnabled: boolean) => set({ webSearchEnabled }),
  models: [],
  selectedModels: [],

  setModels: (models: Model[]) => set({ models }),
  setSelectedModels: (models: string[]) => set({ selectedModels: models }),
}));
