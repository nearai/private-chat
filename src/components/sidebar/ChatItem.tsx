import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useConversation } from "@/api/chat/queries/useConversation";
import { cn } from "@/lib/time";
import { toChatRoute } from "@/pages/routes";
import { useChatStore } from "@/stores/useChatStore";
import type { ConversationInfo } from "@/types";
import Spinner from "../common/Spinner";
import ChatMenu from "../sidebar/ChatMenu";
import { CompactTooltip } from "../ui/tooltip";
import { DEFAULT_CONVERSATION_TITLE } from "@/lib/constants";

type ChatItemProps = {
  chat: ConversationInfo;
  isCurrentChat: boolean;
  isPinned?: boolean;
  handleDeleteSuccess?: () => void;
};

function getChatTitle(chat: ConversationInfo) {
  return chat.metadata.title || DEFAULT_CONVERSATION_TITLE;
}

const ChatItem = ({ chat, isCurrentChat, isPinned, handleDeleteSuccess }: ChatItemProps) => {
  const { startEditingChatName, stopEditingChatName, editingChatId } = useChatStore();
  const [showRename, setShowRename] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  const [renameInput, setRenameInput] = useState(chat.metadata.title ?? DEFAULT_CONVERSATION_TITLE);
  const { isReloadingConversations, updateConversation, reloadConversations } = useConversation();

  const isRenaming = updateConversation.isPending || isReloadingConversations;

  const confirmRename = () => {
    updateConversation.mutate(
      {
        conversationId: chat.id,
        metadata: {
          ...chat.metadata,
          title: renameInput,
        }
      },
      {
        onSuccess: () => {
          reloadConversations({
            onSettled: () => {
              stopEditingChatName();
            },
          });
        },
        onError: () => {
          setShowRename(true);
        },
      }
    );
    setShowRename(false);
  };

  const handleRename = async () => {
    setShowRename(true);
    startEditingChatName(chat.id);
    await new Promise((resolve) => setTimeout(resolve, 100));
    renameRef.current?.focus();
  };

  const handleCancelRename = () => {
    if (isRenaming) return;
    setShowRename(false);
    setRenameInput(chat.metadata.title);
    stopEditingChatName();
  };

  useEffect(() => {
    setRenameInput(chat.metadata.title ?? DEFAULT_CONVERSATION_TITLE);
  }, [chat?.metadata?.title]);

  return (
    <div className="group relative w-full" draggable="true">
      <Link
        className={cn(
          "flex w-full justify-between gap-2 whitespace-nowrap rounded-lg px-2 py-1.5",
          isCurrentChat && "bg-secondary/30"
        )}
        to={toChatRoute(chat.id)}
        draggable="false"
      >
        {showRename ? (
          <>
            <div className="flex w-full flex-1 self-center">
              <input
                ref={renameRef}
                className="h-5 w-full self-center border-none bg-transparent text-left outline-none"
                value={renameInput}
                onClick={() => startEditingChatName(chat.id)}
                onChange={(e) => setRenameInput(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <CompactTooltip content="Confirm" align="center">
                <button onClick={confirmRename}>
                  <CheckIcon className="size-4" />
                </button>
              </CompactTooltip>
              <CompactTooltip content="Cancel" align="center">
                <button onClick={handleCancelRename}>
                  <XMarkIcon className="size-4" />
                </button>
              </CompactTooltip>
            </div>
          </>
        ) : (
          <>
            <div dir="auto" className="h-5 w-full self-center overflow-hidden truncate text-left">
              {getChatTitle(chat)}
            </div>
            {isRenaming && editingChatId === chat.id ? (
              <Spinner className="size-4" />
            ) : (
              <ChatMenu
                chat={chat}
                isPinned={isPinned}
                handleRename={handleRename}
                handleDeleteSuccess={handleDeleteSuccess}
              />
            )}
          </>
        )}
      </Link>
    </div>
  );
};

export default ChatItem;
