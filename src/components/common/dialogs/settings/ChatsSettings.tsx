import { ArrowUpOnSquareIcon } from "@heroicons/react/24/solid";
import type { ResponseInputItem } from "openai/resources/responses/responses.mjs";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useConversation } from "@/api/chat/queries/useConversation";
import { useGetConversations } from "@/api/chat/queries/useGetConversations";
import { type Conversation, historiesToConversations } from "@/lib/utils/transform-chat-history";
import dayjs from "dayjs";

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
  const { refetch } = useGetConversations();
  const { createConversation, addItemsToConversation } = useConversation();

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

  const handleImport = async (json: any) => {
    try {
      const conversions = historiesToConversations(json);
      console.log("Imported JSON:", conversions);

      const errors: string[] = [];
      const newConversations: string[] = [];
      
      toast.loading("Importing conversations...");
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

      onImportFinish && onImportFinish();
    } catch (error) {
      toast.error(`Failed to import chats: ${error}`);
    } finally {
      toast.dismiss();
      setImporting(false);
    }
  };

  return (
    <div className="flex h-full flex-col text-sm">
      <ul className="flex flex-col gap-2">
        <li
          className="flex w-full cursor-pointer items-center rounded-md px-3.5 py-2 transition hover:bg-secondary/30"
          onClick={() => {
            if (!importing) {
              inputRef.current?.click();
            }
          }}
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
      </ul>
    </div>
  );
};

export default ChatsSettings;
