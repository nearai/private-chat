import dayjs from "dayjs";
import FileSaver from "file-saver";
import { toast } from "sonner";
import { create } from "zustand";
import { chatClient } from "@/api/chat/client";
import { createExportFile } from "@/lib/export-file";

interface ExportProgress {
  phase: "preparing" | "reading" | "generating";
  completed: number;
  total: number;
  itemsRead: number;
}

interface ExportStore {
  progress: ExportProgress | null;
  start: () => Promise<void>;
  stop: () => void;
}

let controller: AbortController | null = null;

export const useExportStore = create<ExportStore>((set) => ({
  progress: null,
  stop: () => controller?.abort(),
  start: async () => {
    if (controller) return;
    const current = new AbortController();
    controller = current;
    set({ progress: { phase: "preparing", completed: 0, total: 0, itemsRead: 0 } });
    try {
      const conversations = await chatClient.getConversationsForExport((completed, total, itemsRead = 0) => {
        set({ progress: { phase: "reading", completed, total, itemsRead } });
      }, current.signal);
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
    } catch (error) {
      if (current.signal.aborted) {
        toast.info("Export stopped. No file was downloaded.");
      } else {
        console.error("Failed to export conversations:", error);
        toast.error(`Failed to export conversations: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      controller = null;
      set({ progress: null });
    }
  },
}));
