import { XMarkIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { useGetConversation } from "@/api/chat/queries/useGetConversation";
import IntelLogo from "@/assets/images/intel-2.svg";
import NvidiaLogo from "@/assets/images/nvidia-2.svg";
import SafeLogo from "@/assets/images/safe.svg";
import { cn } from "@/lib/time";
import { useChatStore } from "@/stores/useChatStore";
import { useViewStore } from "@/stores/useViewStore";
import type { Message } from "@/types";
import { extractMessageContent } from "@/types/openai";
import MessagesVerifier from "./MessagesVerifier";
import ModelVerifier from "./ModelVerifier";
import type { VerificationStatus } from "./types";

const ChatVerifier: React.FC = () => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const { chatId } = useParams();
  const { selectedModels } = useChatStore();
  const { data: conversationData } = useGetConversation(chatId);

  const { isRightSidebarOpen, setIsRightSidebarOpen } = useViewStore();
  const [showModelVerifier, setShowModelVerifier] = useState(false);
  const [modelVerificationStatus, setModelVerificationStatus] = useState<VerificationStatus | null>(null);

  // Transform conversation data into history format for MessagesVerifier
  const history = useMemo(() => {
    if (!conversationData?.data) {
      return {
        messages: {},
        currentId: null,
      };
    }

    const messages: Record<string, Message> = {};
    let currentId: string | null = null;

    conversationData.data.forEach((item) => {
      if (item.type === "message") {
        // Only process assistant messages
        if (item.role !== "assistant") {
          return;
        }

        const messageId = item.id;
        const isCompleted = item.status === "completed";
        const content = extractMessageContent(item, "output_text");

        // Get response_id for assistant messages (this is the chatCompletionId)
        // response_id is available on ResponseOutputMessage (assistant messages)
        const responseId =
          "response_id" in item ? String((item as { response_id?: unknown }).response_id || "") : undefined;
        const id = "id" in item ? String((item as { id?: unknown }).id || "") : undefined;

        // Get model from the message
        const model = "model" in item ? String((item as { model?: unknown }).model || "") : undefined;

        // Get created_at timestamp
        const timestamp = (item as { created_at?: number }).created_at || Date.now();

        messages[messageId] = {
          id: messageId,
          parentId: null,
          childrenIds: [],
          role: "assistant",
          content,
          timestamp,
          models: [],
          model,
          chatCompletionId: responseId ?? id ?? undefined, // Map response_id to chatCompletionId
          done: isCompleted,
        };

        if (isCompleted) {
          currentId = messageId;
        }
      }
    });

    return {
      messages,
      currentId,
    };
  }, [conversationData]);

  const toggleVerifier = () => {
    setIsRightSidebarOpen(!isRightSidebarOpen);
  };

  const openModelVerifier = () => {
    setShowModelVerifier(true);
  };

  const closeModelVerifier = () => {
    setShowModelVerifier(false);
  };

  const handleModelStatusUpdate = (status: VerificationStatus) => {
    setModelVerificationStatus(status);
  };

  useEffect(() => {
    if (!isRightSidebarOpen) {
      setModelVerificationStatus(null);
    }
  }, [isRightSidebarOpen]);

  return (
    <div className="relative z-50">
      <div
        id="chat-verifier-sidebar"
        className={cn(
          "h-screen max-h-[100dvh] min-h-screen select-none overflow-y-hidden",
          "fixed top-0 right-0 z-50 shrink-0 overflow-x-hidden bg-gray-50 text-gray-900 text-sm dark:bg-gray-950 dark:text-gray-200",
          isRightSidebarOpen ? "w-[320px] max-w-[320px] md:relative" : "w-[0px] translate-x-[320px]"
        )}
      >
        <div className="flex w-[320px] items-center justify-between px-4 pt-3.5 pb-4">
          <h2 className="flex items-center gap-2 text-base text-gray-900 dark:text-white">
            <img alt="safe" src={SafeLogo} className="h-6 w-6" />
            {t("AI Chat Verification")}
          </h2>
          <button
            onClick={toggleVerifier}
            className="flex h-8 w-8 items-center justify-center rounded text-white shadow transition-colors hover:text-gray-600 dark:bg-[rgba(248,248,248,0.04)] dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-full w-[320px] flex-col">
          <div className="flex-shrink-0 dark:border-gray-700">
            <div className="p-4">
              <h2 className="mb-3 flex h-8 items-center rounded font-semibold text-base text-gray-900 dark:text-gray-300">
                {t("Model Verification")}
              </h2>

              <ModelVerifier
                model={selectedModels[0] || ""}
                show={false}
                autoVerify={isRightSidebarOpen && !!selectedModels[0]}
                onClose={() => {}}
                onStatusUpdate={handleModelStatusUpdate}
              />

              {modelVerificationStatus?.loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-emerald-300 border-b-2" />
                  <span className="ml-3 text-gray-600 text-sm dark:text-gray-400">
                    {t("Verifying confidentiality...")}
                  </span>
                </div>
              ) : modelVerificationStatus?.error ? (
                <>
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center">
                      <XCircleIcon className="mr-2 h-4 w-4 text-red-400" />
                      <span className="text-red-800 text-sm dark:text-red-200">{modelVerificationStatus.error}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setModelVerificationStatus(null)}
                    disabled={!selectedModels[0]}
                    className="w-full rounded-md bg-green-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {t("Retry Verification")}
                  </button>
                </>
              ) : modelVerificationStatus?.isVerified ? (
                <>
                  <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-emerald-300/10 dark:bg-emerald-300/10">
                    <div className="mb-2 flex items-center">
                      <CheckCircleIcon className="mr-2 h-5 w-5 text-green-500" />
                      <span className="font-medium text-green-700 text-sm dark:text-emerald-300">
                        {t("Your chat is confidential.")}
                      </span>
                    </div>
                    <div className="mb-2">
                      <p className="mb-2 text-gray-600 text-xs dark:text-[rgba(248,248,248,0.64)]">
                        {t("Attested by")}
                      </p>
                      <div className="flex items-center space-x-4">
                        <div className="flex space-x-2">
                          <img src={NvidiaLogo} alt="NVIDIA" className="h-6 w-16" />
                        </div>
                        <span className="text-[rgba(248,248,248,0.64)] text-xs">{t("and")}</span>
                        <div className="flex space-x-2">
                          <img src={IntelLogo} alt="Intel" className="h-6 w-12" />
                        </div>
                      </div>
                    </div>
                    <p style={{ lineHeight: "1.5em" }} className="text-gray-600 text-xs dark:text-gray-400">
                      {t(
                        "This automated verification tool lets you independently confirm that the model is running in the TEE (Trusted Execution Environment)."
                      )}
                    </p>
                  </div>
                  <button
                    onClick={openModelVerifier}
                    className="w-full rounded-md bg-gray-100 px-4 py-2 text-gray-700 text-sm transition-colors hover:bg-gray-200 dark:bg-[rgba(248,248,248,0.08)] dark:text-white"
                  >
                    {t("View Verification Details")}
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-green-600 border-b-2" />
                  <span className="ml-3 text-gray-600 text-sm dark:text-gray-400">
                    {t("Verifying confidentiality...")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {chatId && (
            <div className="flex-1 overflow-hidden">
              <div className="flex h-full flex-col">
                <div className="flex-shrink-0">
                  <h2 className="flex h-8 items-center rounded pl-4 font-semibold text-base text-gray-900 dark:text-gray-300">
                    {t("Messages Verification")}
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <MessagesVerifier history={history} chatId={chatId} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ModelVerifier model={selectedModels[0] || ""} show={showModelVerifier} onClose={closeModelVerifier} />
    </div>
  );
};

export default ChatVerifier;
