import { XCircleIcon } from "@heroicons/react/24/outline";
import type React from "react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { toast } from "sonner";
import { useGetConversation } from "@/api/chat/queries/useGetConversation";
import RegenerateIcon from "@/assets/icons/regenerate-icon.svg?react";
import NearAIIcon from "@/assets/images/near-icon.svg?react";
import VerifiedIcon from "@/assets/images/verified-2.svg?react";
import { Button } from "@/components/ui/button";
import { CompactTooltip } from "@/components/ui/tooltip";
import { type CombinedResponse, cn, MessageStatus } from "@/lib";
import { IMPORTED_MESSAGE_SIGNATURE_TIP, MOCK_MESSAGE_RESPONSE_ID_PREFIX, RESPONSE_MESSAGE_CLASSNAME } from "@/lib/constants";
import { verifySignature } from "@/lib/signature";
import { formatDate } from "@/lib/time";
import { useChatStore } from "@/stores/useChatStore";
import { useConversationStore } from "@/stores/useConversationStore";
import { useMessagesSignaturesStore } from "@/stores/useMessagesSignaturesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useViewStore } from "@/stores/useViewStore";
import type {
  ChatStartStreamOptions,
  ConversationItem,
  ConversationModelOutput,
  ConversationReasoning,
  ConversationUserInput,
  ConversationWebSearchCall,
} from "@/types";
import { extractCitations, extractMessageContent, getModelAndCreatedTimestamp } from "@/types/openai";
import MessageSkeleton from "../MessageSkeleton";
import Citations from "./Citations";
import { MarkDown } from "./MarkdownTokens";
import { unwrapMockResponseID } from "@/lib/utils/mock";

interface ResponseMessageProps {
  history: { messages: Record<string, CombinedResponse> };
  batchId: string;
  allMessages: Record<string, ConversationItem>;
  siblings: string[];
  isLastMessage: boolean;
  readOnly: boolean;
  regenerateResponse: (options: ChatStartStreamOptions) => Promise<void>;
}

const ResponseMessage: React.FC<ResponseMessageProps> = ({
  history,
  allMessages,
  batchId,
  isLastMessage,
  readOnly,
  regenerateResponse,
  siblings,
}) => {
  const { setLastResponseId } = useConversationStore();
  const { webSearchEnabled } = useChatStore();
  const { t } = useTranslation("translation", { useSuspense: false });
  const { settings } = useSettingsStore();
  const { messagesSignatures, messagesSignaturesErrors } = useMessagesSignaturesStore();
  const { setIsRightSidebarOpen, setSelectedMessageIdForVerifier, setShouldScrollToSignatureDetails } = useViewStore();
  const { chatId } = useParams<{ chatId: string }>();
  const { models } = useChatStore();
  const { data: conversationData } = useGetConversation(chatId);
  const conversationImportedAt = conversationData?.metadata?.imported_at;

  const batch = history.messages[batchId];

  const messageId = batch.responseId;
  const signature = messagesSignatures[messageId];
  const signatureError = messagesSignaturesErrors[messageId];
  const isBatchCompleted = batch.status === MessageStatus.COMPLETED || batch.status === MessageStatus.OUTPUT;
  const isMessageCompleted = batch.outputMessagesIds.every((id) => allMessages[id]?.status === "completed");

  const handleVerificationBadgeClick = () => {
    setShouldScrollToSignatureDetails(true);
    setSelectedMessageIdForVerifier(messageId);
    setIsRightSidebarOpen(true);
  };

  const verificationStatus = useMemo(() => {
    if (!isBatchCompleted || !isMessageCompleted) {
      return null;
    }

    if (signature?.verified === true) {
      return "verified";
    }

    if (signature?.verified === false) {
      return "failed";
    }

    const hasSignature = signature?.signature && signature.signing_address && signature.text;

    if (!hasSignature) {
      if (conversationImportedAt) {
        if (messageId.startsWith(MOCK_MESSAGE_RESPONSE_ID_PREFIX) || signatureError) {
          return "imported";
        }
      }
      if (signatureError) return "failed";
      return "verifying";
    }

    try {
      const isValid = verifySignature(signature.signing_address, signature.text, signature.signature);
      return isValid ? "verified" : "failed";
    } catch {
      return "failed";
    }
  }, [signature, signatureError, isMessageCompleted, conversationImportedAt, isBatchCompleted, messageId]);

  const outputMessages = batch.outputMessagesIds.map((id) => allMessages[id] as ConversationModelOutput);

  const prevMessageIsImported = useMemo(() => {
    const prevResponseId = batch?.parentResponseId || undefined;
    if (!prevResponseId) return false;
    if (!conversationImportedAt) return false;
    return prevResponseId.startsWith(MOCK_MESSAGE_RESPONSE_ID_PREFIX);
  }, [conversationImportedAt, batch]);

  const { model, createdTimestamp } = getModelAndCreatedTimestamp(batch, allMessages);

  const handleRegenerateResponse = useCallback(async () => {
    const userPrompt = allMessages[batch.userPromptId as string] as ConversationUserInput;
    // Need fix for files that will display input_file correctly
    let prevResponseId = batch?.parentResponseId || undefined;
    if (prevResponseId?.startsWith(MOCK_MESSAGE_RESPONSE_ID_PREFIX)) {
      prevResponseId = unwrapMockResponseID(prevResponseId);
    }
    await regenerateResponse({
      contentItems: userPrompt.content,
      webSearchEnabled,
      conversationId: chatId,
      previous_response_id: prevResponseId,
      currentModels: model ? [model] : undefined,
      initiator: "regenerate",
    });
  }, [regenerateResponse, webSearchEnabled, batch, chatId, allMessages, model]);

  const modelIcon = useMemo(() => {
    const icon = models.find((m) => m.modelId === model)?.metadata?.modelIcon;
    if (icon) {
      return <img src={icon} alt="Model Icon" className="mt-0.5 h-6 w-6 rounded" />;
    }
    return <NearAIIcon className="mt-0.5 h-6 w-6 rounded" />;
  }, [models, model]);

  const messageContent = useMemo(() => {
    return outputMessages.map((msg) => extractMessageContent(msg?.content ?? {}, "output_text")).join("");
  }, [outputMessages]);

  const citations = useMemo(() => outputMessages.flatMap(({ content }) => extractCitations(content)), [outputMessages]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  // const handleKeyDown = (e: React.KeyboardEvent) => {
  //   if (e.key === "Escape") {
  //     handleCancel();
  //   }
  //   if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
  //     handleSave();
  //   }
  // };

  // const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  //   e.target.style.height = "";
  //   e.target.style.height = `${e.target.scrollHeight}px`;
  // };

  const renderBatchContent = (batch: CombinedResponse) => {
    switch (batch.status) {
      case MessageStatus.WEB_SEARCH: {
        const latest = batch.webSearchMessagesIds.at(-1);
        const latestWebSearchCall = allMessages[latest ?? ""] as ConversationWebSearchCall | undefined;
        const q = latestWebSearchCall?.action?.query
          ? `Searching for: ${latestWebSearchCall.action.query}`
          : "Performing web search";
        return <MessageSkeleton key={latestWebSearchCall?.id ?? `search-${batch.responseId}`} message={q} />;
      }

      case MessageStatus.REASONING: {
        const latest = batch.reasoningMessagesIds.at(-1);
        const latestReasoning = allMessages[latest ?? ""] as ConversationReasoning | undefined;
        const q = latestReasoning?.summary ? `Reasoning: ${latestReasoning.content}` : "Reasoning";
        return <MessageSkeleton key={latest ?? `reasoning-${batch.responseId}`} message={q} />;
      }

      case MessageStatus.OUTPUT:
      case MessageStatus.COMPLETED:
        return (
          <div className="relative flex w-full flex-col" id="response-content-container">
            {messageContent === "" ? (
              <div className="text-muted-foreground" id={`empty-message-${batch.responseId}`}>
                {webSearchEnabled ? "Generating search query..." : "Generating response..."}
              </div>
            ) : messageContent ? (
              <div className="markdown-content">
                <MarkDown messageContent={messageContent} batchId={batch.responseId} />
              </div>
            ) : null}
          </div>
        );
    }
    return null;
  };

  return (
    <div
      className={cn("group flex w-full overflow-hidden", RESPONSE_MESSAGE_CLASSNAME)}
      id={`message-${batch.responseId}`}
      dir={settings.chatDirection || "ltr"}
      data-response-id={batch.responseId || ""}
      data-parent-response-id={batch.parentResponseId || ""}
      data-model-id={model || ""}
    >
      <div className="shrink-0 ltr:mr-2 rtl:ml-2">
        {modelIcon}
      </div>

      <div className="w-0 flex-auto pl-1">
        <div className="flex items-center space-x-2">
          <span
            className="line-clamp-1 font-normal text-muted-foreground"
            title={model || "Assistant"}
          >
            {model || "Assistant"}
          </span>

          {/* Verification Badge */}
          <div className="message-verification-badge ml-3 flex items-center">
            {verificationStatus === "failed" ? (
              <CompactTooltip content={signatureError} align="start">
                <button
                  onClick={handleVerificationBadgeClick}
                  className="flex items-center gap-1 rounded border border-destructive bg-destructive/10 px-1.5 py-0.5 transition-colors hover:bg-destructive/20"
                  title="Click to view verification details"
                >
                  <XCircleIcon className="h-4 w-4 text-destructive-foreground" />
                  <span className="font-medium text-destructive-foreground text-xs">{t("Not Verified")}</span>
                </button>
              </CompactTooltip>
            ) : verificationStatus === "verifying" ? (
              <div className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                <span className="font-medium text-muted-foreground text-xs">{t("Verifying")}</span>
              </div>
            ) : verificationStatus === "imported" ? (
              <CompactTooltip content={t(IMPORTED_MESSAGE_SIGNATURE_TIP)} align="start">
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

          {createdTimestamp && (
            <div
              className="invisible ml-0.5 translate-y-px self-center font-medium text-muted-foreground text-xs first-letter:capitalize group-hover:visible"
              title={formatDate(createdTimestamp * 1000)}
            >
              <span className="line-clamp-1">{formatDate(createdTimestamp * 1000)}</span>
            </div>
          )}
        </div>

        <div className={cn("markdown-prose w-full min-w-full", `chat-${batchId}`)}>
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

            {renderBatchContent(batch)}
          </div>
        </div>

        <div className="buttons mt-0.5 flex justify-start overflow-x-auto text-muted-foreground">
          {siblings && siblings.length > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => {
                  if (siblings[siblings.indexOf(batch.responseId) - 1]) {
                    setLastResponseId(siblings[siblings.indexOf(batch.responseId) - 1]);
                  }
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
                {siblings.indexOf(batch.responseId) + 1}/{siblings.length}
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => {
                  if (siblings[siblings.indexOf(batch.responseId) + 1]) {
                    setLastResponseId(siblings[siblings.indexOf(batch.responseId) + 1]);
                  }
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

              {batch?.parentResponseId && verificationStatus !== "imported" && !prevMessageIsImported && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("text-muted-foreground", isLastMessage ? "visible" : "invisible group-hover:visible")}
                  onClick={handleRegenerateResponse}
                  title="Regenerate"
                >
                  <RegenerateIcon />
                </Button>
              )}
            </>
          )}
        </div>

        <Citations citations={citations} />
      </div>
    </div>
  );
};

export default ResponseMessage;
