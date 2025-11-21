import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import CopyIcon from "@/assets/icons/clipboard.svg?react";
import PencilIcon from "@/assets/icons/pen.svg?react";
import TrashIcon from "@/assets/icons/trash.svg?react";
import ConfirmDialog from "@/components/common/dialogs/ConfirmDialog";
import FileDialog from "@/components/common/dialogs/FileDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/time";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ConversationUserInput } from "@/types";
import { extractFiles, extractMessageContent } from "@/types/openai";

interface UserMessageProps {
  message: ConversationUserInput;
  isFirstMessage: boolean;
  readOnly: boolean;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => Promise<void>;
  siblings: string[];
}

const UserMessage: React.FC<UserMessageProps> = ({
  message,
  isFirstMessage,
  readOnly,
  editMessage,
  deleteMessage,
  siblings,
}) => {
  const { settings } = useSettingsStore();

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [edit, setEdit] = useState(false);
  const messageEditTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const messageContent = extractMessageContent(message.content);
  const messageFiles = extractFiles(message.content);
  const [editedContent, setEditedContent] = useState(messageContent || "");

  useEffect(() => {
    if (edit && messageEditTextAreaRef.current) {
      messageEditTextAreaRef.current.focus();
      messageEditTextAreaRef.current.select();
    }
  }, [edit]);

  const handleEdit = () => {
    setEdit(true);
    setEditedContent(messageContent || "");
  };
  const handleSave = () => {
    if (editedContent.trim() !== messageContent) {
      editMessage(message.id, editedContent.trim());
    }
    setEdit(false);
    setEditedContent("");
  };

  const handleCancel = () => {
    setEdit(false);
    setEditedContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSave();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = "";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteMessage(message.id);
      setShowDeleteConfirm(false);
    } catch {
      toast.error("Failed to delete message");
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="user-message group flex w-full" dir={settings.chatDirection || "ltr"} id={`message-${message.id}`}>
      <div className="w-0 max-w-full flex-auto pl-1">
        <div className={cn("markdown-prose w-full min-w-full", `chat-${message.role}`)}>
          {messageFiles && messageFiles.length > 0 && (
            <div className="mt-2.5 mb-1 flex w-full flex-col flex-wrap justify-end gap-1 overflow-x-auto">
              {messageFiles.map((file, idx) => (
                <div key={file.file_id || file.audio_file_id || file.image_url || idx} className="self-end">
                  <FileDialog file={file} />
                </div>
              ))}
            </div>
          )}

          {messageContent !== "" && (
            <>
              {edit ? (
                <div className="mb-2 w-full rounded-3xl bg-card px-5 py-3">
                  <div className="max-h-96 overflow-auto">
                    <textarea
                      id={`message-edit-${message.id}`}
                      ref={messageEditTextAreaRef}
                      className="w-full resize-none bg-transparent outline-hidden"
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      onInput={handleTextareaInput}
                      onKeyDown={handleKeyDown}
                    />
                  </div>

                  <div className="mt-2 mb-1 flex justify-between font-medium text-sm">
                    <div />
                    <div className="flex gap-1.5">
                      <Button
                        id="close-edit-message-button"
                        onClick={handleCancel}
                        variant="secondary"
                        className="h-9 rounded-3xl"
                      >
                        Cancel
                      </Button>
                      <Button id="confirm-edit-message-button" onClick={handleSave} className="h-9 rounded-3xl">
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <div className="flex w-full justify-end pb-1">
                    <div className="max-w-[90%] rounded-xl bg-card px-4 py-2">
                      {messageContent && <div className="whitespace-pre-wrap">{messageContent}</div>}
                    </div>
                  </div>

                  <div className="flex justify-end text-muted-foreground">
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="invisible text-muted-foreground group-hover:visible"
                        onClick={handleEdit}
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="invisible text-muted-foreground group-hover:visible"
                      onClick={() => copyToClipboard(messageContent)}
                      title="Copy"
                    >
                      <CopyIcon className="h-4 w-4" />
                    </Button>

                    {!readOnly && (!isFirstMessage || siblings.length > 1) && (
                      <button
                        className="invisible rounded-sm p-1 transition hover:text-black group-hover:visible"
                        onClick={() => setShowDeleteConfirm(true)}
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        title={"Delete message?"}
        description={"Are you sure you want to delete this message? This action cannot be undone."}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        onCancel={() => setShowDeleteConfirm(false)}
        open={showDeleteConfirm}
      />
    </div>
  );
};

export default UserMessage;
