import dayjs from "dayjs";
import FileSaver from "file-saver";
import { toast } from "sonner";
import { create } from "zustand";
import { chatClient, type ExportCheckpoint } from "@/api/chat/client";
import { createExportFile } from "@/lib/export-file";
import { getExportErrorMessage } from "@/lib/export-retry";

interface ExportProgress {
  phase: "preparing" | "reading" | "generating";
  completed: number;
  total: number;
  retryAttempt?: number;
  error?: string;
}

interface ExportStore {
  progress: ExportProgress | null;
  result: { count: number; filename: string } | null;
  dismissResult: () => void;
  start: () => Promise<void>;
  stop: () => void;
}

let controller: AbortController | null = null;
let checkpoint: ExportCheckpoint = { conversations: [] };

export const useExportStore = create<ExportStore>((set, get) => ({
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
  start: async () => {
    if (controller) return;
    const current = new AbortController();
    controller = current;
    const previous = get().progress;
    set({
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
          }))
      );
      current.signal.throwIfAborted();
      set({
        progress: { phase: "generating", completed: conversations.length, total: conversations.length },
      });
      const blob = await createExportFile(conversations, current.signal);
      current.signal.throwIfAborted();
      const filename = `private-chat-export-${dayjs().format("YYYY-MM-DD-HHmmss")}.json`;
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
