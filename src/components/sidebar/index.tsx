import type React from "react";
import { useMemo, useState } from "react";

import { Link, useParams } from "react-router";
import { useGetConversations } from "@/api/chat/queries/useGetConversations";

import ChatArrowDown from "@/assets/icons/chat-arrow-down.svg?react";
import CloseIcon from "@/assets/icons/close-icon.svg?react";
import NearAIIcon from "@/assets/icons/near-icon-green.svg?react";
import PencilIcon from "@/assets/icons/pencil-icon.svg?react";
import { cn, getTimeRange } from "@/lib/time";
import { useViewStore } from "@/stores/useViewStore";
import type { ConversationInfo } from "@/types";
import ChatItem from "./ChatItem";

import UserMenu from "./UserMenu";

const LeftSidebar: React.FC = () => {
  const { isLeftSidebarOpen, setIsLeftSidebarOpen } = useViewStore();
  const { chatId } = useParams();

  const { data: conversations } = useGetConversations();

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
    <nav className="top-0 left-0 z-50 shrink-0 overflow-x-hidden text-sm transition-width duration-200 ease-in-out">
      <div
        id="sidebar"
        className={cn(
          "fixed top-0 left-0 z-50 flex h-svh shrink-0 select-none flex-col overflow-x-hidden bg-gray-900 text-gray-900 text-sm transition-width duration-200 ease-in-out dark:bg-gray-900 dark:text-gray-200",
          isLeftSidebarOpen ? "w-[260px] max-w-[260px] md:relative" : "-translate-x-[260px] invisible w-0"
        )}
      >
        <div className="flex flex-col px-2">
          <div className="my-4 flex w-full justify-between px-2">
            <button
              type="button"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded shadow hover:bg-gray-850 dark:bg-[rgba(248,248,248,0.04)]"
            >
              <NearAIIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded text-white shadow transition-colors hover:bg-gray-850 dark:bg-[rgba(248,248,248,0.04)] dark:hover:text-gray-300"
              onClick={() => setIsLeftSidebarOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="w-full">
            <div className="mb-5 flex h-9 items-center justify-center space-x-1 text-gray-600 dark:text-white">
              <Link
                id="sidebar-new-chat-button"
                className="no-drag-region flex h-full flex-1 items-center justify-center gap-x-2 rounded-lg bg-[#F8F8F80A] px-2 py-1 text-right text-white transition hover:bg-gray-850"
                to="/"
              >
                <div className="flex items-center">
                  <div className="self-center font-medium font-primary text-sm">New Chat</div>
                </div>
                <div>
                  <PencilIcon fill={"#000"} />
                </div>
              </Link>
            </div>
          </div>
          <div className="w-full cursor-pointer" onClick={() => setIsChatsOpen(!isChatsOpen)}>
            <div>
              <div className="flex items-start justify-between">
                <div className="group relative flex w-full items-center justify-between rounded-md text-gray-500 transition">
                  <button className="flex w-full items-center gap-1.5 py-1.5 pl-2 font-medium text-xs">
                    <div className="size-3 text-gray-300 dark:text-gray-600">
                      <ChatArrowDown stroke="#676767" className={!isChatsOpen ? "rotate-270" : ""} />
                    </div>
                    <div className="translate-y-[0.5px]">Chats</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isChatsOpen && (
          <div className="flex-1 overflow-hidden px-2">
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
                    <ChatItem key={chat.id} chat={chat} isCurrentChat={chat.id === chatId} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto px-2">
          <UserMenu />
        </div>
      </div>
    </nav>
  );
};

export default LeftSidebar;
