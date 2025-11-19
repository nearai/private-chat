import type React from "react";
import { useMemo, useState } from "react";

import { Link, useNavigate, useParams } from "react-router";
import { useGetConversations } from "@/api/chat/queries/useGetConversations";

import ChatArrowDown from "@/assets/icons/chat-arrow-down.svg?react";
import NearAIIcon from "@/assets/icons/near-ai.svg?react";
import PencilIcon from "@/assets/icons/pencil-icon.svg?react";
import SidebarIcon from "@/assets/icons/sidebar.svg?react";
import { cn, getTimeRange } from "@/lib/time";
import { useViewStore } from "@/stores/useViewStore";
import type { ConversationInfo } from "@/types";
import { Button } from "../ui/button";
import ChatItem from "./ChatItem";
import UserMenu from "./UserMenu";

const LeftSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { isLeftSidebarOpen, setIsLeftSidebarOpen } = useViewStore();
  const { chatId } = useParams();

  const { data: conversations, isLoading } = useGetConversations();

  const [isChatsOpen, setIsChatsOpen] = useState(true);

  const chatsGroupedByFolder = useMemo(
    () =>
      Object.entries(
        conversations?.reduce(
          (acc, chat) => {
            const timeRange = getTimeRange(chat.created_at);
            acc[timeRange] = [...(acc[timeRange] || []), chat];
            return acc;
          },
          {} as Record<string, ConversationInfo[]>
        ) || {}
      ),
    [conversations]
  );
  return (
    <nav className="top-0 left-0 z-50 shrink-0 overflow-x-hidden text-sidebar-foreground text-sm transition-width duration-200 ease-in-out">
      <div
        id="sidebar"
        className={cn(
          "sidebar-gradient fixed top-0 left-0 z-50 flex h-svh shrink-0 select-none flex-col overflow-x-hidden rounded-r-3xl p-4 text-sm transition-width duration-200 ease-in-out",
          isLeftSidebarOpen ? "w-[260px] max-w-[260px] md:relative" : "-translate-x-[260px] invisible w-0"
        )}
      >
        <div className="flex flex-col">
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
          <div className="my-6 w-full">
            <Button variant="ghost" type="button" className="flex h-9 justify-start rounded-xl" asChild>
              <Link id="sidebar-new-chat-button" to="/">
                <PencilIcon />
                <p className="text-sm">New Chat</p>
              </Link>
            </Button>
          </div>

          <div className="w-full cursor-pointer" onClick={() => setIsChatsOpen(!isChatsOpen)}>
            <div>
              <div className="flex items-start justify-between">
                <div className="group relative flex w-full items-center justify-between rounded-md text-gray-500 transition">
                  <button className="flex w-full items-center gap-1.5 py-1.5 pl-2 font-medium text-xs">
                    <div className="size-3 text-gray-300">
                      <ChatArrowDown stroke="#676767" className={!isChatsOpen ? "rotate-270" : ""} />
                    </div>
                    <div className="translate-y-[0.5px]">Chats</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {isLoading && (
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <div className="flex items-center justify-center">
                Loading chats{" "}
                <div className="ml-2 size-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
              </div>
            </div>
          </div>
        )}
        {isChatsOpen && !isLoading && (
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto overflow-x-hidden">
              {chatsGroupedByFolder.map(([timeRange, chats], index) => (
                <div key={timeRange}>
                  <div
                    className={cn(
                      "w-full pb-1.5 pl-2.5 font-medium text-gray-500 text-xs dark:text-gray-500",
                      index !== 0 && "pt-5"
                    )}
                  >
                    {timeRange}
                  </div>
                  {chats.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isCurrentChat={chat.id === chatId}
                      handleDeleteSuccess={() => {
                        if (chat.id !== chatId) return;
                        navigate("/");
                      }}
                    />
                  ))}
                </div>
              ))}
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
