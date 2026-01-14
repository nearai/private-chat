import { marked } from "marked";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import FileDialog from "@/components/common/dialogs/FileDialog";
import { Button } from "@/components/ui/button";
import { type CombinedResponse, cn } from "@/lib";
import markedExtension from "@/lib/utils/extension";
import { processResponseContent, replaceTokens } from "@/lib/utils/markdown";
import markedKatexExtension from "@/lib/utils/marked-katex-extension";
import { useChatStore } from "@/stores/useChatStore";
import { useConversationStore } from "@/stores/useConversationStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ChatStartStreamOptions, ConversationItem, ConversationUserInput } from "@/types";
import { type ContentItem, extractFiles, extractMessageContent, getModelAndCreatedTimestamp } from "@/types/openai";
import MarkdownTokens from "./MarkdownTokens";
import { useGetConversation } from "@/api/chat/queries/useGetConversation";
import { MOCK_MESSAGE_RESPONSE_ID_PREFIX } from "@/lib/constants";

interface UserMessageProps {
  history: { messages: Record<string, CombinedResponse> };
  allMessages: Record<string, ConversationItem>;
  batchId: string;
  regenerateResponse: (options: ChatStartStreamOptions) => Promise<void>;
  siblings?: string[];
}

const UserMessage: React.FC<UserMessageProps> = ({
  history,
  allMessages,
  batchId,
  regenerateResponse,
  siblings,
}) => {
  const { settings } = useSettingsStore();
  const { setLastResponseId } = useConversationStore();
  const batch = history.messages[batchId];
  const message = batch.userPromptId ? (allMessages[batch.userPromptId] as ConversationUserInput) : null;
  const [edit, setEdit] = useState(false);
  const messageEditTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const { webSearchEnabled } = useChatStore();
  const { chatId } = useParams();
  const messageContent = extractMessageContent(message?.content ?? []);
  const messageFiles = extractFiles(message?.content ?? []);
  const { model } = getModelAndCreatedTimestamp(batch, allMessages);
  const { data: conversationData } = useGetConversation(chatId);
  const conversationImportedAt = conversationData?.metadata?.imported_at;

  const messageIsImported = useMemo(() => {
    if (!conversationImportedAt) return false;
    if (!message?.response_id) return false;
    return message.response_id.startsWith(MOCK_MESSAGE_RESPONSE_ID_PREFIX);
  }, [conversationImportedAt, message?.response_id]);

  const prevMessageIsImported = useMemo(() => {
    const prevResponseId = batch?.parentResponseId || undefined;
    if (!prevResponseId) return false;
    if (!conversationImportedAt) return false;
    return prevResponseId.startsWith(MOCK_MESSAGE_RESPONSE_ID_PREFIX);
  }, [conversationImportedAt, batch]);

  // Find the current index in siblings by comparing input content
  const currentSiblingIndex = useMemo(() => {
    if (!siblings || siblings.length <= 1) return 0;

    // Compare input content to find which sibling group we belong to
    for (let i = 0; i < siblings.length; i++) {
      const siblingBatch = history.messages[siblings[i]];
      if (!siblingBatch?.userPromptId) continue;

      const siblingUserMessage = allMessages[siblingBatch.userPromptId] as ConversationUserInput;
      const siblingContent = extractMessageContent(siblingUserMessage?.content ?? []);

      if (siblingContent === messageContent) {
        return i;
      }
    }

    return 0;
  }, [siblings, history, allMessages, messageContent]);

  const [editedContent, setEditedContent] = useState(messageContent || "");

  const disabledSendButton = useMemo(() => {
    if (editedContent === "") return true;
    if (editedContent === messageContent) return true;
    return false;
  }, [messageContent, editedContent]);

  const handleSave = useCallback(async () => {
    if (disabledSendButton) return;
    const userPromptMessage = allMessages[batch.userPromptId as string] as ConversationUserInput;
    const filteredFiles = userPromptMessage.content.filter((item) => item.type === "input_file");
    const contentItems: ContentItem[] = [...filteredFiles, { type: "input_text", text: editedContent.trim() }];

    await regenerateResponse({
      contentItems,
      webSearchEnabled,
      conversationId: chatId,
      previous_response_id: batch?.parentResponseId || undefined,
      currentModel: model || undefined,
      initiator: "edit_message",
    });
    setEdit(false);
    setEditedContent("");
  }, [regenerateResponse, webSearchEnabled, batch, model, chatId, allMessages, editedContent, disabledSendButton]);

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

  // const handleDelete = () => {
  //   deleteMessage(message.id);
  //   setShowDeleteConfirm(false);
  // };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const tokens = useMemo(() => {
    if (!message?.content) return [];

    marked.use(markedKatexExtension());
    marked.use(markedExtension());
    const processedContent = replaceTokens(processResponseContent(messageContent), [], undefined, undefined);

    return marked.lexer(processedContent);
  }, [messageContent, message]);

  if (!message) return null;

  return (
    <div
      className="user-message group flex w-full"
      dir={settings.chatDirection || "ltr"}
      id={`message-${message.id}`}
      data-response-id={message.response_id || ""}
      data-model-id={model || ""}
    >
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
                      <div>
                        <Button
                          id="close-edit-message-button"
                          onClick={handleCancel}
                          variant="secondary"
                          className="h-9 rounded-3xl"
                        >
                          Cancel
                        </Button>
                      </div>
                      <div className={cn({
                        "cursor-not-allowed! opacity-40!": disabledSendButton,
                      })}>
                        <Button
                          id="confirm-edit-message-button"
                          onClick={handleSave}
                          className={cn("h-9 rounded-3xl")}
                          disabled={disabledSendButton}
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <div className="flex w-full justify-end pb-1">
                    <div className="max-w-[90%] rounded-xl bg-card px-4 py-2">
                      {messageContent && (
                        <div className="markdown-content">
                          <MarkdownTokens tokens={tokens} id={`message-${message.id}`} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end text-muted-foreground">
                    {siblings && siblings.length > 1 && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => {
                            if (currentSiblingIndex > 0) {
                              setLastResponseId(siblings[currentSiblingIndex - 1]);
                            }
                          }}
                          disabled={currentSiblingIndex === 0}
                          title="Previous variant"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className="size-3.5"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                          </svg>
                        </Button>

                        <div className="min-w-fit self-center font-semibold text-sm tracking-widest">
                          {currentSiblingIndex + 1}/{siblings.length}
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => {
                            if (currentSiblingIndex < siblings.length - 1) {
                              setLastResponseId(siblings[currentSiblingIndex + 1]);
                            }
                          }}
                          disabled={currentSiblingIndex === siblings.length - 1}
                          title="Next variant"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className="size-3.5"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                        </Button>
                      </>
                    )}

                    {batch.parentResponseId && !messageIsImported && !prevMessageIsImported && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="invisible text-muted-foreground group-hover:visible"
                        onClick={handleEdit}
                        title="Edit"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2.3"
                          stroke="currentColor"
                          className="h-4 w-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                          />
                        </svg>
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="invisible text-muted-foreground group-hover:visible"
                      onClick={() => copyToClipboard(messageContent)}
                      title="Copy"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2.3"
                        stroke="currentColor"
                        className="h-4 w-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                        />
                      </svg>
                    </Button>

                    {/* {!readOnly && (!isFirstMessage || siblings.length > 1) && (
                      <button
                        className="invisible rounded-sm p-1 transition hover:text-black group-hover:visible"
                        onClick={() => setShowDeleteConfirm(true)}
                        title="Delete"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                          className="h-4 w-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                          />
                        </svg>
                      </button>
                    )} */}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-card p-6">
            <h3 className="mb-4 font-medium text-foreground text-lg">Delete Message</h3>
            <p className="mb-6 text-muted-foreground text-sm">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                className="h-9 rounded px-4 py-2 text-sm"
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} className="h-9 rounded px-4 py-2 text-sm">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default UserMessage;
