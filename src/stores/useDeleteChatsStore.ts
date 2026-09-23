import { create } from "zustand";

interface DeleteChatsState {
  controller: AbortController | null;
  isStopping: boolean;
  progress: { completed: number; total: number };
  begin: () => AbortController;
  stop: () => void;
  finish: (controller: AbortController) => void;
  setProgress: (completed: number, total: number) => void;
}

// Keep the stop control and progress available if the settings tab is reopened.
export const useDeleteChatsStore = create<DeleteChatsState>((set, get) => ({
  controller: null,
  isStopping: false,
  progress: { completed: 0, total: 0 },
  begin: () => {
    if (get().controller) throw new Error("Chat deletion is already running.");
    const controller = new AbortController();
    set({ controller, isStopping: false, progress: { completed: 0, total: 0 } });
    return controller;
  },
  stop: () => {
    const controller = get().controller;
    if (!controller || controller.signal.aborted) return;
    set({ isStopping: true });
    controller.abort();
  },
  finish: (controller) => {
    if (get().controller === controller) set({ controller: null, isStopping: false });
  },
  setProgress: (completed, total) => set({ progress: { completed, total } }),
}));
