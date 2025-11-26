import { ArrowPathIcon, ArrowTopRightOnSquareIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { nearAIClient } from "@/api/nearai/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { verifySignature } from "@/lib/signature";
import { useMessagesSignaturesStore } from "@/stores/useMessagesSignaturesStore";
import { useViewStore } from "@/stores/useViewStore";
import {
  type ConversationModelOutput,
  ConversationTypes,
  type ConversationUserInput,
  type ConversationWebSearchCall,
} from "@/types";
import { extractMessageContent } from "@/types/openai";
import VerifySignatureDialog from "./VerifySignatureDialog";

interface MessageVerifierProps {
  message: {
    content: (ConversationUserInput | ConversationModelOutput | ConversationWebSearchCall)[];
    chatCompletionId: string;
  };
  index: number;
  isLastIndex: boolean;
}

const MessageVerifier: React.FC<MessageVerifierProps> = ({ message, index, isLastIndex }) => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const { messagesSignatures, setMessageSignature } = useMessagesSignaturesStore();
  const { selectedMessageIdForVerifier, shouldScrollToSignatureDetails, setShouldScrollToSignatureDetails } =
    useViewStore();

  const isSelected = useMemo(() => {
    return selectedMessageIdForVerifier === message.chatCompletionId;
  }, [selectedMessageIdForVerifier, message.chatCompletionId]);

  const messageRef = useRef<HTMLDivElement>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showVerifySignatureDialog, setShowVerifySignatureDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  const signature = messagesSignatures[message.chatCompletionId];

  const content = message.content
    .filter((item) => item.type === ConversationTypes.MESSAGE)
    .map((item) => extractMessageContent(item.content, "output_text"))
    .join("\n");

  const fetchSignature = useCallback(async () => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    if (!token || !message.chatCompletionId) return;

    if (signature) return;

    setIsLoading(true);
    setError(null);

    try {
      const model = message.content[0].model;
      const data = await nearAIClient.getMessageSignature(model || "gpt-3.5-turbo", message.chatCompletionId);

      if (!data || !data.signature) {
        const errorMsg = data?.detail || data?.message || "No signature data found for this message";
        setError(errorMsg);
        return;
      }

      setMessageSignature(message.chatCompletionId, data);

      if (data.signature && data.signing_address && data.text) {
        const isValid = verifySignature(data.signing_address, data.text, data.signature);
        setIsVerified(isValid);

        setMessageSignature(message.chatCompletionId, { ...data, verified: isValid });
      }
    } catch (err) {
      console.error("Error fetching message signature:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch message signature";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [signature, message.chatCompletionId, message.content, setMessageSignature]);

  useEffect(() => {
    if (signature?.signature && signature?.signing_address && signature?.text) {
      if (isVerified === null) {
        const isValid = verifySignature(signature.signing_address, signature.text, signature.signature);
        setIsVerified(isValid);

        if (signature.verified === undefined) {
          setMessageSignature(message.chatCompletionId, { ...signature, verified: isValid });
        }
      }
    } else if (!signature && !isLoading && !error) {
      fetchSignature();
    }
  }, [signature, message.chatCompletionId, isVerified, isLoading, error, fetchSignature, setMessageSignature]);

  useEffect(() => {
    if (isSelected) {
      setShowDetails(true);
    }
  }, [isSelected]);

  useEffect(() => {
    if (isSelected && shouldScrollToSignatureDetails && messageRef.current) {
      setShowDetails(true);

      const timer = setTimeout(() => {
        messageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });

        setShouldScrollToSignatureDetails(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isSelected, shouldScrollToSignatureDetails, setShouldScrollToSignatureDetails]);

  const details = [
    {
      label: t("ID"),
      value: message.chatCompletionId,
    },
    {
      label: t("Signing Address"),
      value: signature?.signing_address ?? "",
    },
    {
      label: t("Message"),
      value: signature?.text ?? "",
    },
    {
      label: t("Signature"),
      value: signature?.signature ?? "",
    },
    {
      label: t("Algorithm"),
      value: signature?.signing_algo ?? "",
    },
  ];

  const openVerifySignatureDialog = () => {
    if (!signature) return;
    setShowVerifySignatureDialog(true);
  };

  const closeVerifySignatureDialog = () => {
    setShowVerifySignatureDialog(false);
  };

  return (
    <div
      ref={messageRef}
      className={cn(
        "flex flex-col items-start gap-6 rounded-xl p-2 transition-colors",
        showDetails && "bg-card/30 dark:bg-card",
        (isVerified === false || error) && !isLoading && "bg-destructive/10",
        isSelected && "ring ring-border"
      )}
      data-message-id={message.chatCompletionId}
    >
      <div
        className="flex cursor-pointer flex-col gap-2"
        onClick={(e) => {
          e.preventDefault();
          setShowDetails((prev) => !prev);
        }}
        title="Click to view signature details"
      >
        <div className="flex items-center gap-1">
          <ChevronRightIcon className={cn("size-3.5 opacity-60 transition-transform", showDetails && "rotate-90")} />
          <p className="font-medium text-sm leading-[160%] opacity-80">
            {t("Message")} {index + 1} {isLastIndex ? " (latest)" : ""}
          </p>
        </div>
        <p className="line-clamp-2 max-w-[230px] font-normal text-sm leading-[140%] opacity-80">{content}</p>
      </div>

      {isLoading ? (
        <div className="flex w-full items-center justify-center gap-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="text-muted-foreground text-xs">Verifying signature...</p>
        </div>
      ) : null}

      {showDetails && (
        <>
          {error ? (
            <div className="flex w-full items-center justify-between gap-3 rounded-lg bg-destructive/5 p-3">
              <p
                className="max-w-[150px] flex-1 truncate whitespace-nowrap text-destructive text-xs leading-[160%]"
                title={error}
              >
                {error}
              </p>
              <Button
                variant="ghost"
                size="icon"
                title={t("Retry")}
                onClick={(e) => {
                  e.stopPropagation();
                  fetchSignature();
                }}
              >
                <ArrowPathIcon className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ) : (
            <>
              <button
                className={cn(
                  "flex items-center text-xs transition-colors",
                  isVerified ? "text-green hover:text-green-dark" : "text-destructive hover:text-destructive/80"
                )}
                onClick={openVerifySignatureDialog}
              >
                <ArrowTopRightOnSquareIcon className="mr-1 h-3 w-3" />
                {isVerified ? t("Verified ECDSA Signature") : t("Invalid ECDSA Signature")}
              </button>
              <div className="flex flex-col gap-4">
                {details.map((detail) => (
                  <div key={detail.label} className="flex flex-col gap-1">
                    <p className="font-normal text-xs leading-[160%] opacity-60">{detail.label}:</p>
                    <p className="max-w-[230px] truncate whitespace-nowrap font-normal text-sm leading-[160%]">
                      {detail.value}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
      <VerifySignatureDialog
        show={showVerifySignatureDialog}
        address={signature?.signing_address ?? ""}
        message={signature?.text ?? ""}
        signature={signature?.signature ?? ""}
        onClose={closeVerifySignatureDialog}
      />
    </div>
  );
};

export default MessageVerifier;
