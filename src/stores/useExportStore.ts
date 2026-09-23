import dayjs from "dayjs";
import FileSaver from "file-saver";
import { toast } from "sonner";
import { create } from "zustand";
import { chatClient, type ExportCheckpoint, type ExportScope } from "@/api/chat/client";
import { createExportFile } from "@/lib/export-file";
import { getExportErrorMessage } from "@/lib/export-retry";
import { useDeleteChatsStore } from "@/stores/useDeleteChatsStore";

interface ExportProgress {
  phase: "preparing" | "reading" | "generating";
  completed: number;
  total: number;
  retryAttempt?: number;
  error?: string;
}

interface ExportStore {
  scope: ExportScope;
  progress: ExportProgress | null;
  result: { count: number; filename: string } | null;
  dismissResult: () => void;
  start: (scope?: ExportScope) => Promise<void>;
  stop: () => void;
}

let controller: AbortController | null = null;
let checkpoint: ExportCheckpoint = { conversations: [] };

export const useExportStore = create<ExportStore>((set, get) => ({
  scope: "all",
  progress: null,
  result: null,
  dismissResult: () => set({ result: null }),
  stop: () => {
    set({ result: null });
    if (controller) {
      controller.abort();
    } else {
      checkpoint = { conversations: [] };
      set({ progress: null });
    }
  },
  start: async (requestedScope) => {
    if (controller) return;
    if (useDeleteChatsStore.getState().controller) {
      toast.error("Wait for chat deletion to finish before exporting.");
      return;
    }
    const previous = get().progress;
    // Retry keeps the original selection and checkpoint; a new export defaults to all chats.
    if (previous && requestedScope && requestedScope !== get().scope) return;
    const scope = requestedScope ?? (previous ? get().scope : "all");
    const current = new AbortController();
    controller = current;
    set({
      scope,
      result: null,
      progress: previous
        ? { ...previous, error: undefined, retryAttempt: 0 }
        : { phase: "preparing", completed: 0, total: 0 },
    });
    try {
      const conversations = await chatClient.getConversationsForExport(
        (completed, total) => {
          set({ progress: { phase: "reading", completed, total } });
        },
        current.signal,
        checkpoint,
        (retryAttempt) =>
          set((state) => ({
            progress: state.progress ? { ...state.progress, retryAttempt } : null,
          })),
        scope
      );
      current.signal.throwIfAborted();
      set({
        progress: { phase: "generating", completed: conversations.length, total: conversations.length },
      });
      const blob = await createExportFile(conversations, current.signal);
      current.signal.throwIfAborted();
      const prefix = scope === "archived" ? "archived-chat-export" : "private-chat-export";
      const filename = `${prefix}-${dayjs().format("YYYY-MM-DD-HHmmss")}.json`;
      FileSaver.saveAs(blob, filename);
      checkpoint = { conversations: [] };
      set({ progress: null, result: { count: conversations.length, filename } });
    } catch (error) {
      if (current.signal.aborted) {
        checkpoint = { conversations: [] };
        set({ progress: null });
        toast.info("Export stopped. No file was downloaded.");
      } else {
        console.error("Failed to export conversations:", error);
        const message = getExportErrorMessage(error);
        set((state) => ({
          progress: state.progress ? { ...state.progress, error: message, retryAttempt: 0 } : null,
        }));
      }
    } finally {
      controller = null;
    }
  },
}));
