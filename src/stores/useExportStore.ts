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
  itemsRead: number;
  retryAttempt?: number;
  error?: string;
}

interface ExportStore {
  progress: ExportProgress | null;
  start: () => Promise<void>;
  stop: () => void;
}

let controller: AbortController | null = null;
let checkpoint: ExportCheckpoint = { conversations: [] };

export const useExportStore = create<ExportStore>((set, get) => ({
  progress: null,
  stop: () => {
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
      progress: previous
        ? { ...previous, error: undefined, retryAttempt: 0 }
        : { phase: "preparing", completed: 0, total: 0, itemsRead: 0 },
    });
    try {
      const conversations = await chatClient.getConversationsForExport(
        (completed, total, itemsRead = 0) => {
          set({ progress: { phase: "reading", completed, total, itemsRead } });
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
        progress: { phase: "generating", completed: conversations.length, total: conversations.length, itemsRead: 0 },
      });
      const blob = await createExportFile(conversations, current.signal);
      current.signal.throwIfAborted();
      FileSaver.saveAs(blob, `private-chat-export-${dayjs().format("YYYY-MM-DD-HHmmss")}.json`);
      toast.success(
        conversations.length === 1
          ? "1 conversation exported successfully"
          : `${conversations.length} conversations exported successfully`
      );
      checkpoint = { conversations: [] };
      set({ progress: null });
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
