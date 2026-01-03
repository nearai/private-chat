import type React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";

import { useGetConversations } from "@/api/chat/queries/useGetConversations";

import ChatArrowDown from "@/assets/icons/chat-arrow-down.svg?react";
import FeedbackIcon from "@/assets/icons/feedback.svg?react";
import NearAIIcon from "@/assets/icons/near-ai.svg?react";
import PencilIcon from "@/assets/icons/pencil-icon.svg?react";
import SidebarIcon from "@/assets/icons/sidebar.svg?react";
import { cn } from "@/lib";
import { getTimeRange } from "@/lib/time";
import { useViewStore } from "@/stores/useViewStore";
import type { ConversationInfo } from "@/types";
import { Button } from "../ui/button";
import ChatItem from "./ChatItem";
import UserMenu from "./UserMenu";

const LeftSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("translation", { useSuspense: false });
  const { chatId } = useParams();
  const { isLeftSidebarOpen, setIsLeftSidebarOpen, isMobile } = useViewStore();

  // Helper to close sidebar on mobile
  const handleMobileNavigation = () => {
    if (isMobile) {
      setIsLeftSidebarOpen(false);
    }
  };

  const openCrisp = () => {
    if ((window as any).$crisp) {
      (window as any).$crisp.push(["do", "chat:show"]);
      (window as any).$crisp.push(["do", "chat:open"]);
    }
  };

  const { data: conversations, isLoading } = useGetConversations();

  const [isPinnedOpen, setIsPinnedOpen] = useState(true);
  const [isChatsOpen, setIsChatsOpen] = useState(true);

  const { pinned, unpinned } = useMemo(() => {
    const pinned = (conversations || []).filter((c) => !!c.metadata?.pinned_at && !c.metadata?.archived_at);
    const unpinned = (conversations || []).filter((c) => !c.metadata?.pinned_at && !c.metadata?.archived_at);
    return { pinned, unpinned };
  }, [conversations]);

  const chatsGrouped = useMemo(() => {
    // Helper function to get timestamp
    const getTimestamp = (chat: ConversationInfo): number => {
      return chat.metadata?.initial_created_at ? Number(chat.metadata.initial_created_at) : chat.created_at;
    };

    // Sort chats by timestamp (newest first)
    const list = [...unpinned].sort((a, b) => getTimestamp(b) - getTimestamp(a));

    // Group chats by time range
    const grouped = list.reduce(
      (acc, chat) => {
        const timestamp = getTimestamp(chat);
        const timeRange = getTimeRange(timestamp);
        acc[timeRange] = [...(acc[timeRange] || []), chat];
        return acc;
      },
      {} as Record<string, ConversationInfo[]>
    );

    // Sort groups by the first conversation in each group (newest first)
    return Object.entries(grouped)
      .sort(([, chatsA], [, chatsB]) => getTimestamp(chatsB[0]) - getTimestamp(chatsA[0]));
  }, [unpinned]);

  return (
    <nav className="top-0 left-0 z-50 shrink-0 overflow-x-hidden text-sidebar-foreground text-sm">
      <div
        id="sidebar"
        className={cn(
          "sidebar-gradient fixed top-0 left-0 z-50 flex h-svh shrink-0 select-none flex-col rounded-r-3xl p-4 text-sm transition-width duration-200",
          isLeftSidebarOpen ? "w-[260px] max-w-[260px] md:relative" : "-translate-x-[260px] invisible w-0"
        )}
      >
        {/* Header */}
        <div className="flex w-full justify-between">
          <NearAIIcon className="h-8" />
          <Button
            variant="ghost"
            type="button"
            size="icon"
            className="text-muted-foreground"
            onClick={() => setIsLeftSidebarOpen(false)}
          >
            <SidebarIcon className="size-5" />
          </Button>
        </div>

        {/* New Chat */}
        <div className="my-6 w-full space-y-1">
          <Button
            variant="ghost"
            type="button"
            className="flex h-9 w-full justify-start rounded-xl"
            asChild
          >
            <Link id="sidebar-new-chat-button" to="/" onClick={handleMobileNavigation}>
              <PencilIcon />
              <p className="text-sm">{t("New Chat")}</p>
            </Link>
          </Button>

          <Button
            variant="ghost"
            type="button"
            className="flex h-9 w-full justify-start rounded-xl"
            onClick={openCrisp}
          >
            <FeedbackIcon />
            <p className="text-sm">{t("Feedback")}</p>
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            {t("Loading chats")}{" "}
            <div className="ml-2 size-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
          </div>
        )}

        {!isLoading && (
          <div className="flex-1 overflow-hidden">
            <div className="h-full space-y-5 overflow-y-auto overflow-x-hidden">
              {pinned.length > 0 && (
                <div>
                  <div
                    className="flex cursor-pointer items-center gap-1.5 pl-2 text-gray-500 text-xs"
                    onClick={() => setIsPinnedOpen(!isPinnedOpen)}
                  >
                    <ChatArrowDown
                      stroke="#676767"
                      className={cn("size-3 text-gray-300 transition-transform", !isPinnedOpen && "rotate-270")}
                    />
                    <span>{t("Pinned")}</span>
                  </div>

                  {isPinnedOpen &&
                    pinned.map((chat) => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        isPinned
                        isCurrentChat={chat.id === chatId}
                        handleDeleteSuccess={() => {
                          if (chat.id === chatId) navigate("/");
                        }}
                        onNavigate={handleMobileNavigation}
                      />
                    ))}
                </div>
              )}

              <div>
                <div
                  className="flex cursor-pointer items-center gap-1.5 pl-2 text-gray-500 text-xs"
                  onClick={() => setIsChatsOpen(!isChatsOpen)}
                >
                  <ChatArrowDown
                    stroke="#676767"
                    className={cn("size-3 text-gray-300 transition-transform", !isChatsOpen && "rotate-270")}
                  />
                  <span>{t("Chats")}</span>
                </div>

                {isChatsOpen &&
                  chatsGrouped.map(([range, chats]) => (
                    <div key={range}>
                      <div className="w-full py-1.5 pl-2.5 font-medium text-gray-500 text-xs">{range}</div>
                      {chats.map((chat) => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          isCurrentChat={chat.id === chatId}
                          handleDeleteSuccess={() => {
                            if (chat.id === chatId) navigate("/");
                          }}
                          isPinned={false}
                          onNavigate={handleMobileNavigation}
                        />
                      ))}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col items-start gap-6">
          <div className="w-full border border-primary border-t opacity-20" />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
};

export default LeftSidebar;
