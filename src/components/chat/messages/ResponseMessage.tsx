import { XCircleIcon } from "@heroicons/react/24/outline";
import { marked } from "marked";
import type { ResponseOutputMessage } from "openai/resources/responses/responses.mjs";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import RegenerateIcon from "@/assets/icons/regenerate-icon.svg?react";
import NearAIIcon from "@/assets/images/near-icon.svg?react";
import VerifiedIcon from "@/assets/images/verified-2.svg?react";
import { verifySignature } from "@/lib/signature";
import { formatDate } from "@/lib/time";
import markedExtension from "@/lib/utils/extension";
import { processResponseContent, replaceTokens } from "@/lib/utils/markdown";
import markedKatexExtension from "@/lib/utils/marked-katex-extension";
import { useMessagesSignaturesStore } from "@/stores/useMessagesSignaturesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useViewStore } from "@/stores/useViewStore";
import { extractCitations, extractMessageContent } from "@/types/openai";
import Citations from "./Citations";
import MarkdownTokens from "./MarkdownTokens";

interface MessageItem extends ResponseOutputMessage {
  created_at?: number;
  response_id?: string;
}

interface ResponseMessageProps {
  message: MessageItem;
  siblings: string[];
  isLastMessage: boolean;
  readOnly: boolean;
  webSearchEnabled: boolean;
  saveMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  regenerateResponse: (message: MessageItem) => Promise<void>;
  showPreviousMessage: (message: MessageItem) => void;
  showNextMessage: (message: MessageItem) => void;
}

const ResponseMessage: React.FC<ResponseMessageProps> = ({
  message,
  isLastMessage,
  readOnly,
  webSearchEnabled,
  saveMessage,
  regenerateResponse,
  showPreviousMessage,
  showNextMessage,
  siblings,
}) => {
  const { settings } = useSettingsStore();
  const { messagesSignatures } = useMessagesSignaturesStore();
  const { setIsRightSidebarOpen, setSelectedMessageIdForVerifier, setShouldScrollToSignatureDetails } = useViewStore();

  const [edit, setEdit] = useState(false);
  const [editedContent, setEditedContent] = useState("");

  // Get message ID for verification
  const messageId = message.response_id || message.id;

  const handleVerificationBadgeClick = () => {
    // Set flag to scroll to signature details
    setShouldScrollToSignatureDetails(true);
    // Set the message ID to be selected in the verifier
    setSelectedMessageIdForVerifier(messageId);
    // Open the verification sidebar
    setIsRightSidebarOpen(true);
  };

  const signature = messagesSignatures[messageId];
  const isMessageCompleted = message.status === "completed";

  const verificationStatus = useMemo(() => {
    // If message is not completed, don't show verification status
    if (!isMessageCompleted) {
      return null;
    }

    // If no signature yet, show "Verifying"
    const hasSignature = signature && signature.signature && signature.signing_address && signature.text;
    if (!hasSignature) {
      return "verifying";
    }

    // Verify the signature
    try {
      const isValid = verifySignature(signature.signing_address, signature.text, signature.signature);
      return isValid ? "verified" : "failed";
    } catch {
      return "failed";
    }
  }, [signature, isMessageCompleted]);

  const messageEditTextAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (edit && messageEditTextAreaRef.current) {
      messageEditTextAreaRef.current.focus();
      messageEditTextAreaRef.current.select();
    }
  }, [edit]);

  const messageContent = extractMessageContent(message, "output_text");
  const citations = extractCitations(message);
  const extendedMessageResponse = {
    ...message,
    modelName: "",
    timestamp: message.created_at ? message.created_at * 1000 : Date.now(),
    files: [],
    content: messageContent,
  };
  const handleSave = () => {
    if (editedContent.trim() !== messageContent) {
      saveMessage(message.id, editedContent.trim());
    }
    setEdit(false);
    setEditedContent("");
  };

  const handleCancel = () => {
    setEdit(false);
    setEditedContent("");
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
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
  const tokens = useMemo(() => {
    if (!message?.content) return [];

    marked.use(markedKatexExtension());
    marked.use(markedExtension());
    const processedContent = replaceTokens(processResponseContent(messageContent), [], undefined, undefined);

    return marked.lexer(processedContent);
  }, [messageContent, message]);

  if (!message) return null;

  return (
    <div className="group flex w-full" id={`message-${message.id}`} dir={settings.chatDirection || "ltr"}>
      <div className="shrink-0 ltr:mr-2 rtl:ml-2">
        <NearAIIcon className="mt-0.5 h-6 w-6" />
      </div>

      <div className="w-0 flex-auto pl-1">
        <div className="flex items-center space-x-2">
          <span className="line-clamp-1 font-normal text-black dark:text-white">
            {extendedMessageResponse.modelName || "Assistant"}
          </span>

          {/* Verification Badge */}
          <div className="ml-3 flex items-center">
            {verificationStatus === "failed" ? (
              <button
                onClick={handleVerificationBadgeClick}
                className="flex items-center gap-1 rounded border border-red-500 bg-red-50 px-1.5 py-0.5 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                title="Click to view verification details"
              >
                <XCircleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="font-medium text-red-700 text-xs dark:text-red-200">Not Verified</span>
              </button>
            ) : verificationStatus === "verifying" ? (
              <div className="flex items-center gap-1 rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 dark:border-gray-700 dark:bg-gray-800/50">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent dark:border-gray-500" />
                <span className="font-medium text-gray-600 text-xs dark:text-gray-400">Verifying</span>
              </div>
            ) : verificationStatus === "verified" ? (
              <button
                onClick={handleVerificationBadgeClick}
                className="transition-opacity hover:opacity-80"
                title="Click to view verification details"
              >
                <VerifiedIcon className="h-6" />
              </button>
            ) : null}
          </div>

          {extendedMessageResponse.timestamp && (
            <div className="invisible ml-0.5 translate-y-[1px] self-center font-medium text-gray-400 text-xs first-letter:capitalize group-hover:visible">
              <span className="line-clamp-1">{formatDate(extendedMessageResponse.timestamp)}</span>
            </div>
          )}
        </div>

        <div className={`chat-${message.role} markdown-prose w-full min-w-full`}>
          <div>
            {/* {extendedMessageResponse.files &&
              extendedMessageResponse.files.length > 0 && (
                <div className="my-1 flex w-full flex-wrap gap-2 overflow-x-auto">
                  {message.files.map((file) => (
                    <div key={file.id}>
                      {file.type === "image" ? (
                        <img
                          src={file.url}
                          alt={message.content}
                          className="max-h-96 rounded-lg"
                        />
                      ) : (
                        <div className="flex items-center space-x-2 rounded bg-white p-2 text-gray-500 text-xs dark:bg-gray-850">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <span>{file.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )} */}

            {edit ? (
              <div className="my-2 w-full rounded-3xl bg-gray-50 px-5 py-3 dark:bg-gray-800">
                <textarea
                  id={`message-edit-${message.id}`}
                  ref={messageEditTextAreaRef}
                  className="w-full resize-none bg-transparent outline-hidden"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  onInput={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                />

                <div className="mt-2 mb-1 flex justify-between font-medium text-sm">
                  <div className="flex space-x-1.5">
                    <button
                      id="close-edit-message-button"
                      className="rounded-3xl bg-white px-4 py-2 text-gray-800 transition hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-100"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                    <button
                      id="confirm-edit-message-button"
                      className="rounded-3xl bg-gray-900 px-4 py-2 text-gray-100 transition hover:bg-gray-850 dark:bg-white dark:text-gray-800"
                      onClick={handleSave}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative flex w-full flex-col" id="response-content-container">
                {messageContent === "" ? (
                  <div className="text-gray-500 dark:text-gray-400">
                    {webSearchEnabled ? "Generating search query..." : "Generating response..."}
                  </div>
                ) : messageContent ? (
                  <div className="markdown-content">
                    <MarkdownTokens tokens={tokens} id={`message-${message.id}`} />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {!edit && (
          <div className="buttons mt-0.5 flex justify-start overflow-x-auto text-gray-600 dark:text-gray-500">
            {siblings && siblings.length > 1 && (
              <>
                <button
                  className="self-center rounded-md p-1 transition hover:bg-black/5 hover:text-black dark:hover:bg-white/5 dark:hover:text-white"
                  onClick={() => {
                    showPreviousMessage(message);
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                    className="size-3.5"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </button>

                <div className="min-w-fit self-center font-semibold text-sm tracking-widest dark:text-gray-100">
                  {siblings.indexOf(message.id) + 1}/{siblings.length}
                </div>

                <button
                  className="self-center rounded-md p-1 transition hover:bg-black/5 hover:text-black dark:hover:bg-white/5 dark:hover:text-white"
                  onClick={() => {
                    showNextMessage(message);
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                    className="size-3.5"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </>
            )}
            {!readOnly && (
              <>
                <button
                  className={`${
                    isLastMessage ? "visible" : "invisible group-hover:visible"
                  } copy-response-button rounded-lg p-1.5 transition hover:bg-black/5 hover:text-black dark:hover:bg-white/5 dark:hover:text-white`}
                  onClick={() => {
                    copyToClipboard(messageContent);
                  }}
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
                </button>

                <button
                  className={`${
                    isLastMessage ? "visible" : "invisible group-hover:visible"
                  } rounded-lg p-1.5 transition hover:bg-black/5 hover:text-black dark:hover:bg-white/5 dark:hover:text-white`}
                  onClick={() => regenerateResponse(message)}
                  title="Regenerate"
                >
                  <RegenerateIcon />
                </button>
              </>
            )}
          </div>
        )}

        <Citations citations={citations} />
      </div>
    </div>
  );
};

export default ResponseMessage;
