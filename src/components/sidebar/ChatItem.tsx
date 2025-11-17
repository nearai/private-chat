import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { useConversation } from "@/api/chat/queries/useConversation";
import { cn } from "@/lib/time";
import { toChatRoute } from "@/pages/routes";
import type { ConversationInfo } from "@/types";
import ChatMenu from "../sidebar/ChatMenu";
import { CompactTooltip } from "../ui/tooltip";

const BASIC_PLACEHOLDER = "TEMP CHAT";

type ChatItemProps = {
  chat: ConversationInfo;
  isCurrentChat: boolean;
  isPinned?: boolean;
  handleDeleteSuccess?: () => void;
};

function getChatTitle(chat: ConversationInfo) {
  if (chat.metadata.title) return chat.metadata.title;
  const conv = chat as ConversationInfo;
  return conv.metadata?.title || BASIC_PLACEHOLDER;
}

const ChatItem = ({ chat, isCurrentChat, isPinned, handleDeleteSuccess }: ChatItemProps) => {
  const [showRename, setShowRename] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  const [renameInput, setRenameInput] = useState(chat.metadata.title ?? BASIC_PLACEHOLDER);
  const { updateConversation } = useConversation();

  const confirmRename = () => {
    updateConversation.mutate({ conversationId: chat.id, metadata: { title: renameInput } });
    setShowRename(false);
  };

  const handleRename = async () => {
    setShowRename(true);
    await new Promise((resolve) => setTimeout(resolve, 100));
    renameRef.current?.focus();
  };

  const handleCancelRename = () => {
    setShowRename(false);
    setRenameInput(chat.metadata.title);
  };

  return (
    <div className="group relative w-full" draggable="true">
      <Link
        className={cn(
          "flex w-full justify-between text-ellipsis whitespace-nowrap rounded-lg px-[11px] py-[6px]",
          isCurrentChat && "bg-[#00ec9714]"
        )}
        to={toChatRoute(chat.id)}
        draggable="false"
      >
        {showRename ? (
          <>
            <div className="flex w-full flex-1 self-center">
              <input
                ref={renameRef}
                className="h-[20px] w-full self-center border-none bg-transparent text-left text-white outline-none"
                value={renameInput}
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
            <div className="flex w-full flex-1 self-center">
              <div dir="auto" className="h-[20px] w-full self-center overflow-hidden text-left text-white">
                {getChatTitle(chat)}
              </div>
            </div>
            <ChatMenu
              chat={chat}
              isPinned={isPinned}
              handleRename={handleRename}
              handleDeleteSuccess={handleDeleteSuccess}
            />
          </>
        )}
      </Link>
    </div>
  );
};

export default ChatItem;
