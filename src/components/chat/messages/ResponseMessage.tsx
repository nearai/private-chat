import { XCircleIcon } from "@heroicons/react/24/outline";
import { marked } from "marked";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
// import RegenerateIcon from "@/assets/icons/regenerate-icon.svg?react";
import NearAIIcon from "@/assets/images/near-icon.svg?react";
import VerifiedIcon from "@/assets/images/verified-2.svg?react";
import { Button } from "@/components/ui/button";
import { verifySignature } from "@/lib/signature";
import { cn, formatDate } from "@/lib/time";
import markedExtension from "@/lib/utils/extension";
import { processResponseContent, replaceTokens } from "@/lib/utils/markdown";
import markedKatexExtension from "@/lib/utils/marked-katex-extension";
import { useMessagesSignaturesStore } from "@/stores/useMessagesSignaturesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useChatStore } from "@/stores/useChatStore";
import { useViewStore } from "@/stores/useViewStore";
import type { ConversationInfo, ConversationModelOutput } from "@/types";
import { extractCitations, extractMessageContent } from "@/types/openai";
import Citations from "./Citations";
import MarkdownTokens from "./MarkdownTokens";
import { CompactTooltip } from "@/components/ui/tooltip";
import { IMPORTED_MESSAGE_SIGNATURE_TIP } from "@/lib/constants";

interface ResponseMessageProps {
  conversation?: ConversationInfo;
  message: ConversationModelOutput;
  siblings: string[];
  isLastMessage: boolean;
  readOnly: boolean;
  webSearchEnabled: boolean;
  saveMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  regenerateResponse: (message: ConversationModelOutput) => Promise<void>;
  showPreviousMessage: (message: ConversationModelOutput) => void;
  showNextMessage: (message: ConversationModelOutput) => void;
}

const ResponseMessage: React.FC<ResponseMessageProps> = ({
  conversation,
  message,
  isLastMessage,
  readOnly,
  webSearchEnabled,
  saveMessage,
  // regenerateResponse,
  showPreviousMessage,
  showNextMessage,
  siblings,
}) => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const { settings } = useSettingsStore();
  const { messagesSignatures, messagesSignaturesErrors } = useMessagesSignaturesStore();
  const { setIsRightSidebarOpen, setSelectedMessageIdForVerifier, setShouldScrollToSignatureDetails } = useViewStore();
  const { models } = useChatStore();
  const conversationImportedAt = conversation?.metadata?.imported_at;

  const [edit, setEdit] = useState(false);
  const [editedContent, setEditedContent] = useState("");

  const messageId = message.response_id || message.id;

  const handleVerificationBadgeClick = () => {
    setShouldScrollToSignatureDetails(true);
    setSelectedMessageIdForVerifier(messageId);
    setIsRightSidebarOpen(true);
  };

  const signature = messagesSignatures[messageId];
  const signatureError = messagesSignaturesErrors[messageId];
  const isMessageCompleted = message.status === "completed";

  const verificationStatus = useMemo(() => {
    if (!isMessageCompleted) {
      return null;
    }

    const hasSignature = signature && signature.signature && signature.signing_address && signature.text;
    if (!hasSignature) {
      if (signatureError && conversationImportedAt) {
        return "imported";
      }
      return "verifying";
    }

    try {
      const isValid = verifySignature(signature.signing_address, signature.text, signature.signature);
      return isValid ? "verified" : "failed";
    } catch {
      return "failed";
    }
  }, [signature, signatureError, isMessageCompleted, conversationImportedAt]);

  const modelIcon = useMemo(() => {
    const modelParts = message.model?.split("/") || [];
    const modelSuffix = modelParts[modelParts.length - 1] || message.model;
    return models.find((m) => m.modelId.includes(modelSuffix))?.metadata?.modelIcon;
  }, [models, message.model]);

  const messageEditTextAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (edit && messageEditTextAreaRef.current) {
      messageEditTextAreaRef.current.focus();
      messageEditTextAreaRef.current.select();
    }
  }, [edit]);

  const messageContent = extractMessageContent(message.content, "output_text");
  const citations = extractCitations(message.content);

  const extendedMessageResponse = {
    ...message,
    modelName: message.model || "",
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
        {modelIcon ? (
          <img src={modelIcon} alt="Model Icon" className="mt-0.5 h-6 w-6 rounded" />
        ) : (
          <NearAIIcon className="mt-0.5 h-6 w-6 rounded" />
        )}
      </div>

      <div className="w-0 flex-auto pl-1">
        <div className="flex items-center space-x-2">
          <span className="line-clamp-1 font-normal text-muted-foreground">{message.model || "Assistant"}</span>

          {/* Verification Badge */}
          <div className="ml-3 flex items-center">
            {verificationStatus === "failed" ? (
              <button
                onClick={handleVerificationBadgeClick}
                className="flex items-center gap-1 rounded border border-destructive bg-destructive/10 px-1.5 py-0.5 transition-colors hover:bg-destructive/20"
                title="Click to view verification details"
              >
                <XCircleIcon className="h-4 w-4 text-destructive-foreground" />
                <span className="font-medium text-destructive-foreground text-xs">{t("Not Verified")}</span>
              </button>
            ) : verificationStatus === "verifying" ? (
              <div className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                <span className="font-medium text-muted-foreground text-xs">{t("Verifying")}</span>
              </div>
            ) : verificationStatus === "imported" ? (
              <CompactTooltip
                content={t(IMPORTED_MESSAGE_SIGNATURE_TIP)}
                align="start"
              >
                <div className="flex items-center gap-1 rounded border border-blue-500 bg-blue-50 px-1.5 py-0.5">
                  <span className="font-medium text-blue-500 text-xs">{t("Imported")}</span>
                </div>
              </CompactTooltip>
            ) : verificationStatus === "verified" ? (
              <button
                onClick={handleVerificationBadgeClick}
                className="text-green transition-opacity hover:opacity-80"
                title="Click to view verification details"
              >
                <VerifiedIcon className="h-6" />
              </button>
            ) : null}
          </div>

          {extendedMessageResponse.timestamp && !conversationImportedAt && (
            <div className="invisible ml-0.5 translate-y-px self-center font-medium text-muted-foreground text-xs first-letter:capitalize group-hover:visible">
              <span className="line-clamp-1">{formatDate(extendedMessageResponse.timestamp)}</span>
            </div>
          )}
        </div>

        <div className={cn("markdown-prose w-full min-w-full", `chat-${message.role}`)}>
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
              <div className="my-2 w-full rounded-3xl bg-card px-5 py-3">
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
                  <Button id="close-edit-message-button" onClick={handleCancel} variant="secondary" className="h-9">
                    Cancel
                  </Button>
                  <Button id="confirm-edit-message-button" onClick={handleSave} className="h-9">
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative flex w-full flex-col" id="response-content-container">
                {messageContent === "" ? (
                  <div className="text-muted-foreground" id={`empty-message-${message.id}`}>
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
          <div className="buttons mt-0.5 flex justify-start overflow-x-auto text-muted-foreground">
            {siblings && siblings.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground"
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
                </Button>

                <div className="min-w-fit self-center font-semibold text-sm tracking-widest">
                  {siblings.indexOf(message.id) + 1}/{siblings.length}
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground"
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
                </Button>
              </>
            )}
            {!readOnly && isMessageCompleted && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn("text-muted-foreground", isLastMessage ? "visible" : "invisible group-hover:visible")}
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
                </Button>

                {/* <Button
                  variant="ghost"
                  size="icon"
                  className={cn("text-muted-foreground", isLastMessage ? "visible" : "invisible group-hover:visible")}
                  onClick={() => regenerateResponse(message)}
                  title="Regenerate"
                >
                  <RegenerateIcon />
                </Button> */}
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
