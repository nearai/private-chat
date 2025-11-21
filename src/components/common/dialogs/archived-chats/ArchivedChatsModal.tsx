import {
  ArrowUpOnSquareIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import fileSaver from "file-saver";
import { useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompactTooltip } from "@/components/ui/tooltip";
import ConfirmDialog from "../ConfirmDialog";

import { useQueryClient } from "@tanstack/react-query";
import { useGetConversations } from "@/api/chat/queries/useGetConversations";
import { useDeleteChat, useUnarchiveChat } from "@/api/chat/queries";
import { queryKeys } from "@/api/query-keys";

dayjs.extend(localizedFormat);
const { saveAs } = fileSaver;

export default function ArchivedChatsModal({ open, onOpenChange }: any) {
  const { t } = useTranslation("translation", { useSuspense: false });

  const queryClient = useQueryClient();
  const { data: conversations } = useGetConversations();

  const { mutateAsync: unarchiveChat } = useUnarchiveChat();
  const { mutateAsync: deleteChat } = useDeleteChat();

  const [searchValue, setSearchValue] = useState("");
  const [showUnarchiveAllConfirmDialog, setShowUnarchiveAllConfirmDialog] =
    useState(false);

  const archived = useMemo(() => {
    return (conversations ?? []).filter((c) => !!c.metadata?.archived_at);
  }, [conversations]);

  const filteredChats = useMemo(() => {
    if (!searchValue) return archived;
    const s = searchValue.toLowerCase();
    return archived.filter((c) => c.metadata.title.toLowerCase().includes(s));
  }, [archived, searchValue]);

  const optimisticUpdate = (updater: (old: any[]) => any[]) => {
    const prev = queryClient.getQueryData(queryKeys.conversation.all) as any[] | undefined;

    queryClient.setQueryData(
      queryKeys.conversation.all,
      (old: any[] = []) => updater(old)
    );

    return () => queryClient.setQueryData(queryKeys.conversation.all, prev ?? []);
  };

  const handleUnarchive = useCallback(
    async (id: string) => {
      const rollback = optimisticUpdate((old) =>
        old.map((c) =>
          c.id === id ? { ...c, metadata: { ...c.metadata, archived_at: null } } : c
        )
      );

      try {
        await unarchiveChat({ id });
        toast.success(t("Chat unarchived"));
      } catch (err) {
        rollback();
        toast.error(String(err));
      }
    },
    [unarchiveChat, queryClient]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const rollback = optimisticUpdate((old) => old.filter((c) => c.id !== id));

      try {
        await deleteChat({ id });
        toast.success(t("Chat deleted"));
      } catch (err) {
        rollback();
        toast.error(String(err));
      }
    },
    [deleteChat, queryClient]
  );

  const handleUnarchiveAll = useCallback(async () => {
    const rollback = optimisticUpdate((old) =>
      old.map((c) =>
        c.metadata?.archived_at ? { ...c, metadata: { ...c.metadata, archived_at: null } } : c
      )
    );

    try {
      await Promise.all(
        archived.map((c) => unarchiveChat({ id: c.id }))
      );
      toast.success(t("All chats unarchived"));
    } catch (err) {
      rollback();
      toast.error(String(err));
    }
  }, [archived, unarchiveChat, queryClient]);

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(archived, null, 2)], {
        type: "application/json",
      });
      saveAs(blob, `${t("archived-chat-export")}-${Date.now()}.json`);
    } catch (err) {
      toast.error(String(err));
    }
  };

  return (
    <>
      <ConfirmDialog
        open={showUnarchiveAllConfirmDialog}
        title={t("Unarchive All")}
        description={t("Are you sure you want to unarchive all archived chats?")}
        confirmText={t("Unarchive All")}
        onConfirm={() => {
          setShowUnarchiveAllConfirmDialog(false);
          handleUnarchiveAll();
        }}
        onCancel={() => setShowUnarchiveAllConfirmDialog(false)}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-medium text-lg">
              {t("Archived Chats")}
            </DialogTitle>
            <DialogDescription className="sr-only" />
          </DialogHeader>

          {/* Search */}
          <div className="mt-2 flex w-full items-center space-x-2">
            <MagnifyingGlassIcon className="mr-2 ml-1 size-4" />
            <input
              className="w-full bg-transparent py-1 pr-4 text-sm outline-hidden"
              placeholder={t("Search Chats")}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          <hr className="my-2 border-muted/30" />

          {archived.length > 0 ? (
            <>
              <div className="mb-3 max-h-88 overflow-y-scroll text-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-3 py-2">{t("Name")}</TableHead>
                      <TableHead className="hidden px-3 py-2 md:table-cell">
                        {t("Created At")}
                      </TableHead>
                      <TableHead className="px-3 py-2 text-right" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredChats.map((chat) => (
                      <TableRow key={chat.id} className="border-muted/30 text-xs hover:bg-secondary/30">
                        <TableCell className="w-2/3 px-3 py-1">
                          <a
                            href={`/c/${chat.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="line-clamp-1 underline"
                          >
                            {chat.metadata.title}
                          </a>
                        </TableCell>

                        <TableCell className="hidden px-3 py-1 md:table-cell">
                          {dayjs(chat.metadata.archived_at! * 1000).format("LLL")}
                        </TableCell>

                        <TableCell className="px-3 py-1 text-right">
                          <div className="flex justify-end gap-2">
                            <CompactTooltip content={t("Unarchive Chat")}>
                              <button
                                className="rounded-xl p-2"
                                onClick={() => handleUnarchive(chat.id)}
                              >
                                <ArrowUpOnSquareIcon className="size-4" />
                              </button>
                            </CompactTooltip>

                            <CompactTooltip content={t("Delete Chat")}>
                              <button
                                className="rounded-xl p-2"
                                onClick={() => handleDelete(chat.id)}
                              >
                                <TrashIcon className="size-4" />
                              </button>
                            </CompactTooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  className="h-9 rounded-3xl px-3.5"
                  onClick={() => setShowUnarchiveAllConfirmDialog(true)}
                >
                  {t("Unarchive All Archived Chats")}
                </Button>

                <Button
                  variant="secondary"
                  className="h-9 rounded-3xl px-3.5"
                  onClick={handleExport}
                >
                  {t("Export All Archived Chats")}
                </Button>
              </div>
            </>
          ) : (
            <div className="mb-8 text-sm">{t("You have no archived conversations.")}</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
