import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import ArchiveBoxIcon from "@heroicons/react/24/outline/ArchiveBoxIcon";
import BookmarkIcon from "@heroicons/react/24/outline/BookmarkIcon";
import BookmarkSlashIcon from "@heroicons/react/24/outline/BookmarkSlashIcon";
import DocumentDuplicateIcon from "@heroicons/react/24/outline/DocumentDuplicateIcon";
import PencilIcon from "@heroicons/react/24/outline/PencilIcon";
import TrashIcon from "@heroicons/react/24/outline/TrashIcon";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useArchiveChat, useCloneChat, useDeleteChat, useTogglePinnedStatus } from "@/api/chat/queries";
import DownloadDropdown from "@/components/chat/DownloadDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { ConversationInfo } from "@/types";

import ConfirmDialog from "../common/dialogs/ConfirmDialog";

type ChatMenuProps = {
  chat: ConversationInfo;
  handleRename: () => void;
  handleDeleteSuccess?: () => void;
  isPinned?: boolean;
};

export default function ChatMenu({ chat, handleRename, handleDeleteSuccess, isPinned }: ChatMenuProps) {
  const { t } = useTranslation("translation", { useSuspense: false });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { mutate: toggleChatPinnedStatusById } = useTogglePinnedStatus();
  const { mutate: cloneChatById } = useCloneChat();
  const { mutate: archiveChatById } = useArchiveChat();
  const { mutate: deleteChatById } = useDeleteChat({
    onSuccess: () => {
      setShowDeleteConfirm(false);
      if (handleDeleteSuccess) {
        handleDeleteSuccess();
      }
    },
  });

  const handlePinToggle = () => {
    toggleChatPinnedStatusById({ id: chat.id });
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
                <BookmarkSlashIcon className="h-4 w-4" strokeWidth={2} />
                <span>{t("Unpin")}</span>
              </>
            ) : (
              <>
                <BookmarkIcon className="h-4 w-4" strokeWidth={2} />
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
            <DocumentDuplicateIcon className="h-4 w-4" strokeWidth={2} />
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
