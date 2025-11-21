import { ArchiveBoxIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useArchiveChat, useCloneChat, useDeleteChat, usePinConversationById, useUnpinConversationById } from "@/api/chat/queries";
import ClipboardIcon from "@/assets/icons/clipboard.svg?react";
import PencilIcon from "@/assets/icons/pen.svg?react";

import PinIcon from "@/assets/icons/pin.svg?react";
import TrashIcon from "@/assets/icons/trash.svg?react";
import UnpinIcon from "@/assets/icons/unpin.svg?react";
import DownloadDropdown from "@/components/chat/DownloadDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ConversationInfo } from "@/types";

import ConfirmDialog from "../common/dialogs/ConfirmDialog";
import { useConversation } from "@/api/chat/queries/useConversation";

type ChatMenuProps = {
  chat: ConversationInfo;
  handleRename: () => void;
  handleDeleteSuccess?: () => void;
  isPinned?: boolean;
};

export default function ChatMenu({ chat, handleRename, handleDeleteSuccess, isPinned }: ChatMenuProps) {
  const { t } = useTranslation("translation", { useSuspense: false });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { reloadConversations } = useConversation()
  const { mutate: pinConversationById } = usePinConversationById();
  const { mutate: unpinConversationById } = useUnpinConversationById();
  const { mutate: cloneChatById } = useCloneChat();
  const { mutate: archiveChatById } = useArchiveChat({ onSuccess: () => reloadConversations() });
  const { mutate: deleteChatById } = useDeleteChat({
    onSuccess: () => {
      setShowDeleteConfirm(false);
      if (handleDeleteSuccess) {
        handleDeleteSuccess();
      }
    },
  });

  const handlePinToggle = () => {
    isPinned ? unpinConversationById({ id: chat.id }) : pinConversationById({ id: chat.id });
  };

  const handleClone = () => {
    cloneChatById({ id: chat.id });
  };

  const handleArchive = () => {
    archiveChatById({ id: chat.id });
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  return (
    <>
      <ConfirmDialog
        title={t("Delete chat?")}
        description={
          <>
            {t("This will delete")} <span className="font-semibold">{chat.metadata.title}</span>
          </>
        }
        onConfirm={() => deleteChatById({ id: chat.id })}
        onCancel={() => setShowDeleteConfirm(false)}
        open={showDeleteConfirm}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="shrink-0">
          <button className="rounded-md px-0.5 hover:bg-secondary/30 focus:outline-none">
            <EllipsisHorizontalIcon className="hidden h-4 w-4 transition-opacity group-hover:block group-hover:opacity-100" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-full min-w-[200px] rounded-xl px-1 py-1.5"
          sideOffset={-2}
          side="bottom"
          align="start"
        >
          <DropdownMenuItem
            className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-1.5"
            onClick={handlePinToggle}
          >
            {isPinned ? (
              <>
                <UnpinIcon className="h-4 w-4" strokeWidth={2} />
                <span>{t("Unpin")}</span>
              </>
            ) : (
              <>
                <PinIcon className="h-4 w-4" strokeWidth={2} />
                <span>{t("Pin")}</span>
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-1.5"
            onClick={handleRename}
          >
            <PencilIcon className="h-4 w-4" strokeWidth={2} />
            <span>{t("Rename")}</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-1.5" onClick={handleClone}>
            <ClipboardIcon className="h-4 w-4" strokeWidth={2} />
            <span>{t("Clone")}</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-1.5"
            onClick={handleArchive}
          >
            <ArchiveBoxIcon className="h-4 w-4" strokeWidth={2} />
            <span>{t("Archive")}</span>
          </DropdownMenuItem>

          <DownloadDropdown chatId={chat.id} />

          <DropdownMenuItem
            className="flex cursor-pointer flex-row gap-2 rounded-md bg-destructive/10 px-3 py-1.5 text-destructive-foreground hover:bg-destructive/20! hover:text-destructive-foreground!"
            onClick={handleDelete}
          >
            <TrashIcon className="h-4 w-4" strokeWidth={2} />
            <span>{t("Delete")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
