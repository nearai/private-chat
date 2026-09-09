import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Fuse from "fuse.js";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { useGetConversations } from "@/api/chat/queries/useGetConversations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib";
import { DEFAULT_CONVERSATION_TITLE } from "@/lib/constants";
import { toChatRoute } from "@/pages/routes";
import type { ConversationInfo } from "@/types";

interface ConversationSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: () => void;
}

type ConversationSearchItem = ConversationInfo & { searchTitle: string };

const ConversationSearchDialog: React.FC<ConversationSearchDialogProps> = ({ open, onOpenChange, onNavigate }) => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const { data: conversations, isLoading } = useGetConversations();
  const navigate = useNavigate();
  const { chatId } = useParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState("");

  const searchableConversations = useMemo<ConversationSearchItem[]>(
    () =>
      (conversations ?? [])
        .filter((chat) => !chat.metadata?.archived_at)
        .map((chat) => ({
          ...chat,
          searchTitle: chat.metadata?.title || DEFAULT_CONVERSATION_TITLE,
        })),
    [conversations]
  );

  const sortedConversations = useMemo(() => {
    const getTimestamp = (chat: ConversationInfo): number => {
      return chat.metadata?.initial_created_at ? Number(chat.metadata.initial_created_at) : chat.created_at;
    };
    return [...searchableConversations].sort((a, b) => getTimestamp(b) - getTimestamp(a));
  }, [searchableConversations]);

  const filteredConversations = useMemo(() => {
    const query = searchValue.trim();
    if (!query) return sortedConversations;
    const fuse = new Fuse(sortedConversations, {
      keys: ["searchTitle"],
      threshold: 0.4,
      ignoreLocation: true,
    });
    return fuse.search(query).map((result) => result.item);
  }, [searchValue, sortedConversations]);

  const handleStartNewChat = () => {
    navigate("/");
    onNavigate?.();
    onOpenChange(false);
  };

  const handleOpenChat = (conversationId: string) => {
    navigate(toChatRoute(conversationId));
    onNavigate?.();
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      setSearchValue("");
      return;
    }
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeout);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-medium text-lg">{t("Search chats")}</DialogTitle>
          <DialogDescription className="sr-only">{t("Search through your conversations")}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex w-full items-center space-x-2 rounded-xl border border-muted/40 bg-muted/10 px-2.5 py-1.5">
          <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            className="w-full bg-transparent py-1 pr-4 text-sm outline-hidden"
            placeholder={t("Search chats")}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
          <span className="rounded-md border border-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</span>
        </div>

        <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start rounded-xl px-3 py-2 text-left"
            onClick={handleStartNewChat}
          >
            {t("Start new chat")}
          </Button>
          {isLoading ? (
            <div className="rounded-xl border border-dashed border-muted/40 px-3 py-6 text-center text-muted-foreground text-sm">
              {t("Loading chats")}...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-muted/40 px-3 py-6 text-center text-muted-foreground text-sm">
              {t("No chats match your search.")}
            </div>
          ) : (
            filteredConversations.map((chat) => (
              <Button
                key={chat.id}
                type="button"
                variant="ghost"
                className={cn(
                  "w-full justify-start rounded-xl px-3 py-2 text-left",
                  chat.id === chatId && "bg-muted/30"
                )}
                onClick={() => handleOpenChat(chat.id)}
              >
                <span className="line-clamp-1">{chat.searchTitle}</span>
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConversationSearchDialog;
