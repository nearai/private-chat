import { ArrowPathIcon, ArrowTopRightOnSquareIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { nearAIClient } from "@/api/nearai/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib";
import { IMPORTED_MESSAGE_SIGNATURE_TIP, LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { verifySignature } from "@/lib/signature";
import { useMessagesSignaturesStore } from "@/stores/useMessagesSignaturesStore";
import { useViewStore } from "@/stores/useViewStore";
import { useGatewayAttestationStore } from "@/stores/useGatewayAttestationStore";
import {
  type ConversationInfo,
  type ConversationModelOutput,
  type ConversationReasoning,
  ConversationTypes,
  type ConversationUserInput,
  type ConversationWebSearchCall,
} from "@/types";
import { extractMessageContent } from "@/types/openai";
import VerifySignatureDialog from "./VerifySignatureDialog";
import { useConversationStore } from "@/stores/useConversationStore";
import { useIsOnline } from "@/hooks/useIsOnline";
import { checkIsImportedConversation } from "@/utils/conversation";

interface MessageVerifierProps {
  conversation?: ConversationInfo;
  message: {
    content: (ConversationUserInput | ConversationModelOutput | ConversationWebSearchCall | ConversationReasoning)[];
    chatCompletionId: string;
  };
  index: number;
  isLastIndex: boolean;
}

const MessageVerifier: React.FC<MessageVerifierProps> = ({ conversation, message, index, isLastIndex }) => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const conversationState = useConversationStore((state) => state.conversation);
  const importedMessagesIdMapping = conversationState?.importedMessagesIdMapping || {};
  const {
    messagesSignatures,
    messagesSignaturesErrors,
    setMessageSignature,
    setMessageSignatureError,
    removeMessageSignatureError,
  } = useMessagesSignaturesStore();
  const { selectedMessageIdForVerifier, shouldScrollToSignatureDetails, setShouldScrollToSignatureDetails } =
    useViewStore();
  const { gatewayAttestation, fetchGatewayAttestation } = useGatewayAttestationStore();
  const signature = messagesSignatures[message.chatCompletionId];
  const signatureError = messagesSignaturesErrors[message.chatCompletionId];
  const hasSignatureData = Boolean(signature?.signature && signature?.signing_address && signature?.text);
  const isOnline = useIsOnline();

  const isSelected = useMemo(() => {
    return selectedMessageIdForVerifier === message.chatCompletionId;
  }, [selectedMessageIdForVerifier, message.chatCompletionId]);
  const isImportedConversation = checkIsImportedConversation(conversation);

  const messageRef = useRef<HTMLDivElement>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showVerifySignatureDialog, setShowVerifySignatureDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(hasSignatureData ? signature?.verified ?? null : null);

  const content = message.content
    .filter((item) => item.type === ConversationTypes.MESSAGE)
    .map((item) => extractMessageContent(item.content, "output_text"))
    .join("\n");

  // Shared verification logic helper
  const verifyMessageSignature = useCallback(
    (
      sig: { signing_address: string; text: string; signature: string },
      gatewayAttest: { signing_address?: string } | null,
      messageId: string
    ) => {
      const isValid = verifySignature(sig.signing_address, sig.text, sig.signature);

      // Also verify that signing address matches gateway attestation signing address
      let addressMatches = true;
      let addressMismatchError: string | null = null;
      if (gatewayAttest?.signing_address) {
        addressMatches = sig.signing_address.toLowerCase() === gatewayAttest.signing_address.toLowerCase();
        // Only set error if signature is cryptographically valid but addresses don't match
        if (!addressMatches && isValid) {
          addressMismatchError = t("Signing address does not match gateway attestation signing address", {
            defaultValue: `Signing address does not match gateway attestation signing address. Message signature address: ${sig.signing_address}, Gateway attestation address: ${gatewayAttest.signing_address}`,
          });
        }
      }

      const finalVerification = isValid && addressMatches;

      // Set error message if address mismatch (only when signature is valid)
      if (addressMismatchError) {
        setMessageSignatureError(messageId, addressMismatchError);
      } else if (finalVerification) {
        // Clear any previous errors if verification passes completely
        removeMessageSignatureError(messageId);
      }

      return finalVerification;
    },
    [t, setMessageSignatureError, removeMessageSignatureError]
  );

  const fetchSignature = useCallback(async () => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    if (!token || !message.chatCompletionId) return;
    if (signature) return;

    if (isImportedConversation) {
      if (importedMessagesIdMapping[message.chatCompletionId]) {
        setMessageSignatureError(message.chatCompletionId, IMPORTED_MESSAGE_SIGNATURE_TIP);
        return;
      }
    }

    if (!isOnline) return;

    setIsLoading(true);
    removeMessageSignatureError(message.chatCompletionId);

    try {
      // Fetch gateway attestation if not already fetched (uses global cache)
      const currentGatewayAttestation = await fetchGatewayAttestation();

      const model = message.content[0].model;
      const data = await nearAIClient.getMessageSignature(model || "gpt-3.5-turbo", message.chatCompletionId);

      if (!data || !data.signature) {
        const errorMsg = data?.detail || data?.message || "No signature data found for this message";
        setMessageSignatureError(message.chatCompletionId, errorMsg);
        return;
      }

      setMessageSignature(message.chatCompletionId, data);

      if (data.signature && data.signing_address && data.text) {
        const finalVerification = verifyMessageSignature(
          { signing_address: data.signing_address, text: data.text, signature: data.signature },
          currentGatewayAttestation,
          message.chatCompletionId
        );
        setIsVerified(finalVerification);
        setMessageSignature(message.chatCompletionId, { ...data, verified: finalVerification });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch message signature";
      // "Signature not found" is an expected case for recent messages, don't log as error
      const isNotFoundError = errorMsg.toLowerCase().includes("not found");
      if (!isNotFoundError) {
        console.error("Error fetching message signature:", err);
      }
      setMessageSignatureError(message.chatCompletionId, errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [
    signature,
    message.chatCompletionId,
    message.content,
    isImportedConversation,
    importedMessagesIdMapping,
    setMessageSignature,
    removeMessageSignatureError,
    setMessageSignatureError,
    isOnline,
    fetchGatewayAttestation,
    t,
  ]);

  useEffect(() => {
    if (isOnline && !gatewayAttestation) {
      fetchGatewayAttestation();
    }
  }, [isOnline, gatewayAttestation, fetchGatewayAttestation]);

  useEffect(() => {
    if (hasSignatureData && signature) {
      // Always verify when we have signature data
      // This will re-verify when gateway attestation becomes available
      const finalVerification = verifyMessageSignature(
        { signing_address: signature.signing_address, text: signature.text, signature: signature.signature },
        gatewayAttestation,
        message.chatCompletionId
      );

      // Only update if verification status changed or hasn't been set yet
      if (isVerified !== finalVerification || signature.verified === undefined) {
        setIsVerified(finalVerification);
        setMessageSignature(message.chatCompletionId, { ...signature, verified: finalVerification });
      }
    } else if (!signature && !isLoading && !signatureError && isOnline) {
      fetchSignature();
    }
  }, [
    signature,
    hasSignatureData,
    message.chatCompletionId,
    isVerified,
    isLoading,
    signatureError,
    fetchSignature,
    setMessageSignature,
    isOnline,
    gatewayAttestation,
    verifyMessageSignature,
  ]);

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

  const renderErrorDetails = () => {
    if (!showDetails) return null;
    if (!signatureError) return null;

    if (isImportedConversation) {
      return (
        <div className="flex w-full items-center justify-between gap-3 rounded-lg bg-blue-400/10 p-3">
          <p className="flex-1 text-blue-600 text-xs leading-[160%]" title={t(IMPORTED_MESSAGE_SIGNATURE_TIP)}>
            {t(IMPORTED_MESSAGE_SIGNATURE_TIP)}
          </p>
        </div>
      );
    }

    // Extract short error message for tooltip (without addresses)
    const shortError = signatureError.includes("Message signature address:") 
      ? signatureError.split("Message signature address:")[0].trim()
      : signatureError;

    return (
      <div className="flex w-full items-center justify-between gap-3 rounded-lg bg-destructive/5 p-3">
        <p
          className="wrap-break-word max-w-[150px] flex-1 text-destructive text-xs leading-[160%]"
          title={shortError}
        >
          {signatureError}
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
    );
  };

  return (
    <div
      ref={messageRef}
      className={cn(
        "flex flex-col items-start gap-6 rounded-xl p-2 transition-colors",
        showDetails && "bg-card/30 dark:bg-card",
        (isVerified === false || signatureError) && !isLoading && "bg-destructive/10",
        isSelected && "ring ring-border",
        signatureError && isImportedConversation && "bg-blue-400/10!"
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
          {signatureError ? (
            renderErrorDetails()
          ) : (
            <>
              {hasSignatureData ? (
                <button
                  className={cn(
                    "flex items-center text-xs transition-colors",
                    isVerified === true
                      ? "text-green hover:text-green-dark"
                      : isVerified === false
                        ? "text-destructive hover:text-destructive/80"
                        : "text-muted-foreground"
                  )}
                  onClick={openVerifySignatureDialog}
                >
                  <ArrowTopRightOnSquareIcon className="mr-1 h-3 w-3" />
                  {isVerified === true
                    ? t("Verified ECDSA Signature")
                    : isVerified === false
                      ? t("Invalid ECDSA Signature")
                      : t("Verification pending", { defaultValue: "Verification pending" })}
                </button>
              ) : (
                <div className="flex w-full items-center justify-between gap-3 rounded-lg bg-muted/30 p-3 text-muted-foreground text-xs">
                  <p className="flex-1">
                    {isOnline
                      ? t("Signature data will show when verification completes.", {
                        defaultValue: "Signature data will show when verification completes.",
                      })
                      : t("Offline. Signature data will sync when you're back online.", {
                        defaultValue: "Offline. Signature data will sync when you're back online.",
                      })}
                  </p>
                </div>
              )}
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
