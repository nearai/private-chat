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
  isPinned?: boolean;
};

export default function ChatMenu({ chat, handleRename, isPinned }: ChatMenuProps) {
  const { t } = useTranslation("translation", { useSuspense: false });
  const { mutate: toggleChatPinnedStatusById } = useTogglePinnedStatus();
  const { mutate: cloneChatById } = useCloneChat();
  const { mutate: archiveChatById } = useArchiveChat();
  const { mutate: deleteChatById } = useDeleteChat();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        <DropdownMenuTrigger asChild>
          <button className="focus:outline-none">
            <EllipsisHorizontalIcon className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-full min-w-[200px] rounded-xl border-none bg-gray-875 px-1 py-1.5 outline-none ring-0"
          sideOffset={-2}
          side="bottom"
          align="start"
        >
          <DropdownMenuItem
            className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-1.5 text-white hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white"
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
            className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-1.5 text-white hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white"
            onClick={handleRename}
          >
            <PencilIcon className="h-4 w-4" strokeWidth={2} />
            <span>{t("Rename")}</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-1.5 text-white hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white"
            onClick={handleClone}
          >
            <DocumentDuplicateIcon className="h-4 w-4" strokeWidth={2} />
            <span>{t("Clone")}</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-1.5 text-white hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white"
            onClick={handleArchive}
          >
            <ArchiveBoxIcon className="h-4 w-4" strokeWidth={2} />
            <span>{t("Archive")}</span>
          </DropdownMenuItem>

          <DownloadDropdown chatId={chat.id} />

          <DropdownMenuItem
            className="flex cursor-pointer flex-row gap-2 rounded-md px-3 py-1.5 text-white hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white"
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
