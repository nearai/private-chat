import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { useRenameChat } from "@/api/chat/queries";
import { cn } from "@/lib/time";
import { toChatRoute } from "@/pages/routes";
import type { ChatInfo, ConversationInfo } from "@/types";
import ChatMenu from "../sidebar/ChatMenu";
import { CompactTooltip } from "../ui/tooltip";

const BASIC_PLACEHOLDER = "TEMP CHAT";

type ChatItemProps = {
  chat: ChatInfo | ConversationInfo;
  isCurrentChat: boolean;
  isPinned?: boolean;
};

function getChatTitle(chat: ChatInfo | ConversationInfo) {
  if (chat.title) return chat.title;
  const conv = chat as ConversationInfo;
  return conv.title || conv.metadata?.title || BASIC_PLACEHOLDER;
}

const ChatItem = ({ chat, isCurrentChat, isPinned }: ChatItemProps) => {
  const [showRename, setShowRename] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  const [renameInput, setRenameInput] = useState(() => getChatTitle(chat));
  const { mutate: renameChat } = useRenameChat();

  const confirmRename = () => {
    renameChat({ id: chat.id, title: renameInput });
    setShowRename(false);
  };

  const handleRename = async () => {
    setShowRename(true);
    await new Promise((resolve) => setTimeout(resolve, 100));
    renameRef.current?.focus();
  };

  const handleCancelRename = () => {
    setShowRename(false);
    setRenameInput(chat.title);
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
            <ChatMenu chat={chat} handleRename={handleRename} isPinned={isPinned} />
          </>
        )}
      </Link>
    </div>
  );
};

export default ChatItem;
