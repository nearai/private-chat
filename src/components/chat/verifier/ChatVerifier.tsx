import { XMarkIcon } from "@heroicons/react/24/outline";
import { XCircleIcon } from "@heroicons/react/24/solid";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGetConversation } from "@/api/chat/queries/useGetConversation";
import { useParams } from "react-router";
import ShieldIcon from "@/assets/icons/shield.svg?react";
import IntelLogo from "@/assets/images/intel.svg?react";
import NvidiaLogo from "@/assets/images/nvidia.svg?react";
import Spinner from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib";
import { useChatStore } from "@/stores/useChatStore";
import { useViewStore } from "@/stores/useViewStore";
import { useIsOnline } from "@/hooks/useIsOnline";
import type {
  ConversationModelOutput,
  ConversationReasoning,
  ConversationUserInput,
  ConversationWebSearchCall,
} from "@/types";
import type { VerificationStatus } from "../types";
import MessagesVerifier from "./MessagesVerifier";
import ModelVerifier from "./ModelVerifier";

const ChatVerifier: React.FC = () => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const { chatId } = useParams();
  const { selectedModels } = useChatStore();
  const { data: conversationData } = useGetConversation(chatId);
  const conversationImportedAt = conversationData?.metadata?.imported_at;

  const {
    isRightSidebarOpen,
    setIsRightSidebarOpen,
    setSelectedMessageIdForVerifier,
    setShouldScrollToSignatureDetails,
  } = useViewStore();
  const [showModelVerifier, setShowModelVerifier] = useState(false);
  const [modelVerificationStatus, setModelVerificationStatus] = useState<VerificationStatus | null>(null);
  const isOnline = useIsOnline();

  // Transform conversation data into history format for MessagesVerifier
  const history = useMemo(() => {
    if (!conversationData?.data) {
      return {
        messages: {},
        currentId: null,
      };
    }

    const messages = [];
    let currentId: string | null = null;
    const responseItems = conversationData?.data.reduce(
      (acc, item) => {
        if (acc[item.response_id]) {
          acc[item.response_id].content.push(item);
        } else {
          acc[item.response_id] = { content: [item] };
        }

        return acc;
      },
      {} as Record<
        string,
        {
          content: (
            | ConversationUserInput
            | ConversationModelOutput
            | ConversationWebSearchCall
            | ConversationReasoning
          )[];
        }
      >
    );

    for (const responseId in responseItems) {
      const response = responseItems[responseId];
      if (response.content.every((item) => item.status === "completed")) {
        messages.push({
          content: response.content,
          chatCompletionId: responseId,
        });
        currentId = responseId;
      }
    }

    return {
      messages: messages.reduce(
        (acc, item) => {
          acc[item.chatCompletionId] = item;
          return acc;
        },
        {} as Record<
          string,
          {
            content: (
              | ConversationUserInput
              | ConversationModelOutput
              | ConversationWebSearchCall
              | ConversationReasoning
            )[];
            chatCompletionId: string;
          }
        >
      ),
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

  const renderError = () => {
    if (!modelVerificationStatus?.error) return null;
    if (conversationImportedAt) return null;
    return (
      <>
        <div className="mb-3 flex items-center rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <XCircleIcon className="mr-2 h-4 w-4 text-destructive" />
          <span className="text-destructive text-sm">{modelVerificationStatus.error}</span>
        </div>
        <Button
          onClick={() => setModelVerificationStatus(null)}
          disabled={!selectedModels[0]}
          variant="secondary"
          className="w-full"
          size="small"
        >
          {t("Retry Verification")}
        </Button>
      </>
    )
  };

  const renderContent = () => {
    return (
      <div className="flex flex-col gap-6 overflow-hidden">
        <div className="flex w-full flex-col gap-6 p-2">
          {!isOnline ? (
            <div className="flex items-center justify-center rounded-lg bg-muted/30 px-3 py-4 text-center text-muted-foreground text-sm">
              {t("Offline. Using cached verification results.", { defaultValue: "Offline. Using cached verification results." })}
            </div>
          ) : modelVerificationStatus?.loading ? (
            <div className="flex items-center justify-center py-4">
              <Spinner className="size-5" />
              <span className="ml-3 text-sm">{t("Verifying confidentiality...")}</span>
            </div>
          ) : modelVerificationStatus?.error ? (
            renderError()
          ) : modelVerificationStatus?.isVerified ? (
            <>
              {selectedModels.length > 0 && (
                <p className="self-stretch font-medium text-green-dark text-xs leading-[normal]">
                  {selectedModels.length} Verified Models
                </p>
              )}

              <p className="font-normal text-sm leading-[140%] opacity-80">
                All models run in TEE (Trusted Execution Environment) — isolated hardware where no one can access your
                messages.
              </p>
              <div className="flex flex-col items-start gap-3">
                <p className="font-normal text-xs leading-[160%] opacity-60">Hardware attestation:</p>
                <div className="flex items-end gap-4">
                  <NvidiaLogo className="h-3" />
                  <IntelLogo className="h-4" />
                </div>
              </div>

              <Button onClick={openModelVerifier} className="w-full" variant="secondary" size="small">
                Show Verification Details
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-center py-4">
              <Spinner className="size-5" />
              <span className="ml-3 text-sm">{t("Verifying confidentiality...")}</span>
            </div>
          )}
        </div>

        {chatId && <MessagesVerifier conversation={conversationData} history={history} />}
      </div>
    );
  };

  useEffect(() => {
    if (!isRightSidebarOpen) {
      setModelVerificationStatus(null);
      // Clear the selected message ID when sidebar closes
      setSelectedMessageIdForVerifier(null);
      // Clear the scroll flag when sidebar closes
      setShouldScrollToSignatureDetails(false);
    }
  }, [isRightSidebarOpen, setSelectedMessageIdForVerifier, setShouldScrollToSignatureDetails]);

  return (
    <div className="relative z-50">
      <div
        id="chat-verifier-sidebar"
        className={cn(
          "h-dvh select-none overflow-y-hidden",
          "fixed top-0 right-0 z-50 shrink-0 overflow-x-hidden bg-input",
          "flex shrink-0 flex-col items-start gap-6 border-l border-l-border border-solid bg-input p-4",
          isRightSidebarOpen ? "w-[280px] max-w-[280px] md:relative" : "w-0 translate-x-[280px]"
        )}
      >
        <div className="flex w-full items-center justify-between">
          <p className="flex items-center gap-1 font-medium text-green text-sm leading-[normal]">
            <ShieldIcon className="size-4" />
            {t("Chat is confidential")}
          </p>
          <Button onClick={toggleVerifier} size="icon" variant="ghost">
            <XMarkIcon className="size-5" />
          </Button>
        </div>

        {renderContent()}
      </div>

      <ModelVerifier
        autoVerify={isRightSidebarOpen && !!selectedModels[0]}
        model={selectedModels[0] || ""}
        show={showModelVerifier}
        onClose={closeModelVerifier}
        onStatusUpdate={handleModelStatusUpdate}
      />
    </div>
  );
};

export default ChatVerifier;
