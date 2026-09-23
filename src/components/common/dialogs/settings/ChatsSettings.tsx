import { ArrowDownTrayIcon, ArrowUpOnSquareIcon, TrashIcon } from "@heroicons/react/24/solid";
import dayjs from "dayjs";
import type { ResponseInputItem } from "openai/resources/responses/responses.mjs";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useConversation } from "@/api/chat/queries/useConversation";
import { useGetConversations } from "@/api/chat/queries/useGetConversations";
import { useDeleteAllConversations } from "@/api/chat/queries/useDeleteAllConversations";
import { ExportProgress } from "@/components/common/ExportProgress";
import { CONVERSATION_WRITES_ENABLED } from "@/lib/read-only";
import { type Conversation, historiesToConversations } from "@/lib/utils/transform-chat-history";
import { useExportStore } from "@/stores/useExportStore";
import DeleteAllChatsDialog from "./DeleteAllChatsDialog";

interface ImportConversationResult {
  success: boolean;
  message: string;
}

interface ChatsSettingsProps {
  onImportFinish?: () => void;
}

const ChatsSettings = ({ onImportFinish }: ChatsSettingsProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [importing, setImporting] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const deleteInFlight = useRef(false);
  const { mutateAsync: deleteAll, isDeleting, isStopping, progress: deleteProgress, stop: stopDeleting } = useDeleteAllConversations();
  const exportProgress = useExportStore((state) => state.progress);
  const exportResult = useExportStore((state) => state.result);
  const handleExport = useExportStore((state) => state.start);
  const { refetch } = useGetConversations();
  const { createConversation, addItemsToConversation } = useConversation();

  const handleDeleteAll = async () => {
    if (deleteInFlight.current || isDeleting || exportProgress || importing) return;
    deleteInFlight.current = true;
    try {
      const result = await deleteAll();
      if (result.stopped || result.failedIds.length === 0) setShowDeleteAll(false);
    } catch {
      // The mutation displays the error and keeps the confirmation open for retry.
    } finally {
      deleteInFlight.current = false;
    }
  };

  const handleImportConversation = async (conv: Conversation): Promise<ImportConversationResult> => {
    try {
      const newConversation = await createConversation.mutateAsync({
        items: [],
        metadata: {
          title: conv.title || "Imported Chat",
          imported_at: dayjs().valueOf().toString(),
          initial_created_at: String(conv.timestamp),
        },
      });
      if (!newConversation.id) {
        return { success: false, message: "Failed to create conversation" };
      }

      if (conv.items && conv.items.length > 0) {
        const batches: ResponseInputItem[][] = [];
        let currentBatch: ResponseInputItem[] = [];
        let hasResponseInBatch = false;
        for (const item of conv.items) {
          const castItem = item as ResponseInputItem;
          if ("role" in castItem && castItem.role === "user") {
            // If the current batch already contains a response (non-user),
            // close it before starting a new user-initiated batch.
            if (currentBatch.length > 0 && hasResponseInBatch) {
              batches.push([...currentBatch]);
              currentBatch = [];
              hasResponseInBatch = false;
            }
            currentBatch.push(castItem);
          } else {
            currentBatch.push(castItem);
            if ("role" in castItem && castItem.role !== "user") {
              hasResponseInBatch = true;
            }
          }
        }
        if (currentBatch.length > 0) {
          if (hasResponseInBatch || batches.length === 0) {
            // Either this batch has a response, or it's the only batch.
            batches.push([...currentBatch]);
          } else {
            // Trailing user-only messages with prior context:
            // merge them into the previous batch to avoid an incomplete
            // standalone user-only batch.
            const lastIndex = batches.length - 1;
            batches[lastIndex] = [...batches[lastIndex], ...currentBatch];
          }
        }

        for (const batch of batches) {
          await addItemsToConversation.mutateAsync({
            conversationId: newConversation.id,
            items: batch,
          });
        }
      }

      return { success: true, message: "Conversation imported successfully" };
    } catch (error) {
      return { success: false, message: `${error}` };
    }
  };

  const handleImport = async (json: unknown) => {
    if (!CONVERSATION_WRITES_ENABLED) return;
    let loadingId: string | number = "";
    try {
      const conversions = historiesToConversations(json);
      console.log("Imported JSON:", conversions);

      const errors: string[] = [];
      const newConversations: string[] = [];

      loadingId = toast.loading("Importing conversations...");
      setImporting(true);

      const batchSize = 10;
      for (let i = 0; i < conversions.length; i += batchSize) {
        const batch = conversions.slice(i, i + batchSize);
        const batchPromises = batch.map(async (conv) => {
          const result = await handleImportConversation(conv);
          if (!result.success) {
            errors.push(`${conv.title}: ${result.message}`);
          } else {
            newConversations.push(conv.title);
          }
        });
        await Promise.all(batchPromises);
      }

      if (errors.length > 0) {
        toast.error(`Some conversations failed to import:\n${errors.join("\n")}`);
      } else {
        toast.success("All conversations imported successfully");
      }

      if (newConversations.length > 0) {
        refetch();
      }

      onImportFinish?.();
    } catch (error) {
      console.warn("Import error:", error);
      toast.error(`Failed to import chats: ${error}`);
    } finally {
      if (loadingId) {
        toast.dismiss(loadingId);
      }
      setImporting(false);
    }
  };

  return (
    <div className="flex h-full flex-col text-sm">
      {showDeleteAll && (
        <DeleteAllChatsDialog
          isDeleting={isDeleting}
          isStopping={isStopping}
          progress={deleteProgress}
          onCancel={() => setShowDeleteAll(false)}
          onExport={() => {
            setShowDeleteAll(false);
            void handleExport();
          }}
          onConfirm={() => void handleDeleteAll()}
          onStop={stopDeleting}
        />
      )}
      <div className="mb-5 space-y-1.5">
        <h3 className="font-semibold text-base">Chat history</h3>
        {!CONVERSATION_WRITES_ENABLED && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            Chatting is disabled. You can still view, export, or delete your history.
          </p>
        )}
      </div>
      <ul className="divide-y divide-border/50 rounded-xl border border-border/50">
        <li>
          <div className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-4 p-4">
            <button
              type="button"
              className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-secondary/10 px-3 font-medium text-sm transition-colors hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-40"
              onClick={() => void handleExport()}
              disabled={!!exportProgress || importing || isDeleting}
              aria-label="Export chats"
            >
              <ArrowDownTrayIcon className="size-4" aria-hidden="true" />
              Export Chats
            </button>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Download a copy of your conversations.
            </p>
          </div>
          {(exportProgress || exportResult) && (
            <div className="px-4 pb-4">
              <ExportProgress />
            </div>
          )}
        </li>
        {CONVERSATION_WRITES_ENABLED && (
          <li
            className="flex w-full cursor-pointer items-center rounded-md px-3.5 py-2 transition hover:bg-secondary/30"
            onClick={() => {
              if (!importing && !exportProgress && !isDeleting) {
                inputRef.current?.click();
              }
            }}
            aria-disabled={importing || !!exportProgress || isDeleting}
          >
            <ArrowUpOnSquareIcon className="h-4 w-4" />
            <span className="ml-2">Import Chats</span>
            <input
              type="file"
              accept="application/json"
              className="hidden"
              ref={inputRef}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                try {
                  const json = JSON.parse(text);
                  handleImport(json);
                } catch (err) {
                  console.error("Invalid JSON format", err);
                  toast.error("Invalid JSON format");
                }
                e.target.value = "";
              }}
            />
          </li>
        )}
        <li className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-4 p-4">
          <button
            type="button"
            className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 font-medium text-destructive-foreground text-sm transition-colors hover:border-destructive/50 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-40 dark:text-destructive"
            disabled={!!exportProgress || importing || isStopping}
            onClick={() => isDeleting ? stopDeleting() : setShowDeleteAll(true)}
          >
            {!isDeleting && <TrashIcon className="size-4" aria-hidden="true" />}
            {isStopping ? "Stopping…" : isDeleting ? "Stop deleting" : "Delete Chats"}
          </button>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {isDeleting
              ? `Processed ${deleteProgress.completed} of ${deleteProgress.total} chats. Deleted chats cannot be restored.`
              : "Permanently remove your history. Export a copy first."}
          </p>
        </li>
      </ul>
    </div>
  );
};

export default ChatsSettings;
