import { ArrowUpOnSquareIcon } from "@heroicons/react/24/solid";
import type { ResponseInputItem } from "openai/resources/responses/responses.mjs";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useConversation } from "@/api/chat/queries/useConversation";
import { useGetConversations } from "@/api/chat/queries/useGetConversations";
import { type Conversation, historiesToConversations } from "@/lib/utils/transform-chat-history";
import dayjs from "dayjs";
import { useChatStore } from "@/stores/useChatStore";
import { DEFAULT_MODEL } from "@/api/constants";

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
  const { models } = useChatStore();
  const { createConversation, addItemsToConversation } = useConversation();

  const handleImportConversation = async (conv: Conversation): Promise<ImportConversationResult> => {
    try {
      const newConversation = await createConversation.mutateAsync({
        items: [],
        metadata: {
          title: conv.title || "Imported Chat",
          imported_at: dayjs().valueOf().toString(),
          timestamp: String(conv.timestamp),
        },
      });
      if (!newConversation.id) {
        return { success: false, message: "Failed to create conversation" };
      }

      if (conv.items && conv.items.length > 0) {
        const batchSize = 20;
        for (let i = 0; i < conv.items.length; i += batchSize) {
          const batch = conv.items.slice(i, i + batchSize);

          await addItemsToConversation.mutateAsync({
            conversationId: newConversation.id,
            items: batch.map((item) => {
              let model = item.model
              if (!model) {
                model = DEFAULT_MODEL
              } else {
                model = models.find(m => m.modelId.toLowerCase().includes(model!.toLowerCase()))?.modelId || item.model
              }
              return {
                ...item,
                model,
              }
            }) as ResponseInputItem[],
          });
        }
      }

      return { success: true, message: "Conversation imported successfully" };
    } catch (error) {
      return { success: false, message: `${error}` };
    }
  };

  const handleImport = (json: any) => {
    try {
      const conversions = historiesToConversations(json);
      console.log("Imported JSON:", conversions);

      const errors: string[] = [];
      const newConversations: string[] = [];
      const importPromises = conversions.map(async (conv) => {
        const result = await handleImportConversation(conv);
        if (!result.success) {
          errors.push(`${conv.title}: ${result.message}`);
        } else {
          newConversations.push(conv.title);
        }
      });

      toast.loading("Importing conversations...");
      setImporting(true);
      Promise.all(importPromises)
        .then(() => {
          if (errors.length > 0) {
            toast.error(`Some conversations failed to import:\n${errors.join("\n")}`);
          } else {
            toast.success("All conversations imported successfully");
          }

          if (newConversations.length > 0) {
            refetch();
          }
        })
        .finally(() => {
          toast.dismiss();
          setImporting(false);
          onImportFinish && onImportFinish();
        });
    } catch (error) {
      toast.error(`Failed to import chats: ${error}`);
      return;
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
