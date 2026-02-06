import { create } from "zustand";

// Store the user's selected response version (page) for each model under a parent message
// Used to remember which version/page the user was viewing when navigating between response siblings
// Key format: `${parentId}:${model}` -> selected batch ID (response version)
type ResponseSelectionKey = string;

interface MessagesStoreState {
  selectedResponseVersions: Record<ResponseSelectionKey, string>;
  setSelectedResponseVersion: (parentId: string, model: string, batchId: string) => void;
  getSelectedResponseVersion: (parentId: string, model: string) => string | undefined;
  clearSelectedResponseVersions: () => void;
}

export const useMessagesStore = create<MessagesStoreState>()((set, get) => ({
  selectedResponseVersions: {},
  setSelectedResponseVersion: (parentId, model, batchId) => {
    const key = `${parentId}:${model}`;
    set((state) => ({
      selectedResponseVersions: {
        ...state.selectedResponseVersions,
        [key]: batchId,
      },
    }));
  },
  getSelectedResponseVersion: (parentId, model) => {
    const key = `${parentId}:${model}`;
    return get().selectedResponseVersions[key];
  },
  clearSelectedResponseVersions: () => {
    set({ selectedResponseVersions: {} });
  },
}));
