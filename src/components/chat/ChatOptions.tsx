import { useState } from "react";
import { ChatBubbleLeftEllipsisIcon, ClipboardIcon, CubeIcon, ShareIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { chatClient } from "@/api/chat/client";
import EllipsisHorizontal from "@/assets/icons/ellipsis-horizontal.svg?react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copyToClipboard } from "@/lib";
import { Button } from "../ui/button";
import DownloadDropdown from "./DownloadDropdown";
import ShareConversationDialog from "./ShareConversationDialog";

type ChatOptionsProps = {
  chatId: string;
};

const ChatOptions = ({ chatId }: ChatOptionsProps) => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const copyChatAsText = async () => {
    const chat = await chatClient.getConversation(chatId);

    const chatText =
      chat?.data?.reduce(
        (a, message) =>
          `${a}### ${message.type === "message" ? message.role.toUpperCase() : message.type}\n${message.type === "message" ? message.content : message.id}\n\n`,
        ""
      ) ?? "";

    const res = await copyToClipboard(chatText).catch((e) => {
      console.error(e);
    });

    if (res) {
      toast.success(t("Copied to clipboard"));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" id="chat-context-menu-button" title="Chat Options" className="size-8">
            <EllipsisHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-full min-w-[220px] rounded-xl px-1 py-1.5"
          sideOffset={-2}
          side="bottom"
          align="end"
        >
          <DropdownMenuItem disabled className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-1.5">
            <ChatBubbleLeftEllipsisIcon className="h-4 w-4" strokeWidth={2} />
            <span>{t("Overview")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-1.5">
            <CubeIcon className="h-4 w-4" strokeWidth={2} />
            <span>{t("Artifacts")}</span>
          </DropdownMenuItem>
          <DownloadDropdown chatId={chatId} />
          <DropdownMenuItem
            className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-1.5"
            onClick={copyChatAsText}
          >
            <ClipboardIcon className="h-4 w-4" strokeWidth={2} />
            <span>{t("Copy")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-1.5"
            onClick={() => setIsShareDialogOpen(true)}
          >
            <ShareIcon className="h-4 w-4" strokeWidth={2} />
            <span>{t("Share Chat")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ShareConversationDialog
        conversationId={chatId}
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
      />
    </>
  );
};

export default ChatOptions;
