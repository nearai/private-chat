import { ArrowPathIcon, ArrowTopRightOnSquareIcon, ChevronDownIcon, XCircleIcon } from "@heroicons/react/24/outline";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { type MessageSignature, nearAIClient } from "@/api/nearai/client";
import VerifiedLogo from "@/assets/images/verified.svg";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { verifySignature } from "@/lib/signature";
import { useMessagesSignaturesStore } from "@/stores/useMessagesSignaturesStore";
import type { Message } from "@/types";
import VerifySignatureDialog from "./VerifySignatureDialog";

interface MessagesVerifierProps {
  history: {
    messages: Record<string, Message>;
    currentId: string | null;
  };
  chatId?: string | null;
}

const MessagesVerifier: React.FC<MessagesVerifierProps> = ({ history, chatId }) => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const { messagesSignatures, setMessageSignature } = useMessagesSignaturesStore();

  const [loadingSignatures, setLoadingSignatures] = useState<Set<string>>(new Set());
  const [errorSignatures, setErrorSignatures] = useState<Record<string, string>>({});
  const [verificationStatus, setVerificationStatus] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string>("");
  const [lastCurrentId, setLastCurrentId] = useState<string>("");
  const [showVerifySignatureDialog, setShowVerifySignatureDialog] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<MessageSignature | null>(null);
  const [viewMore, setViewMore] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const chatCompletions = useMemo(() => {
    if (!history) return [];
    return Object.values(history.messages).filter((message) => message.role === "assistant" && message.done === true);
  }, [history]);

  useEffect(() => {
    if (history?.currentId && history.messages[history.currentId]?.chatCompletionId) {
      if (history.currentId !== lastCurrentId || !selectedMessageId) {
        setSelectedMessageId(history.messages[history.currentId].chatCompletionId!);
      }
      setLastCurrentId(history.currentId);
    }
  }, [history, lastCurrentId, selectedMessageId]);

  const messageList = viewMore ? chatCompletions : chatCompletions.slice(0, 2);

  // Function to fetch message signature
  const fetchMessageSignature = useCallback(
    async (msgId: string) => {
      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
      if (!token || !history || !chatCompletions.length || !msgId) return;
      const msg = chatCompletions.find((message) => message.chatCompletionId === msgId);
      if (!msg || !msg.chatCompletionId || messagesSignatures[msg.chatCompletionId]) return;
      if (loadingSignatures.has(msg.chatCompletionId)) return;

      setLoadingSignatures((prev) => new Set(prev).add(msg.chatCompletionId!));

      try {
        const data = await nearAIClient.getMessageSignature(msg.model || "gpt-3.5-turbo", msg.chatCompletionId);
        if (!data || !data.signature) {
          const errorMsg = data?.detail || data?.message || "No signature data found for this message";
          setErrorSignatures((prev) => ({
            ...prev,
            [msg.chatCompletionId!]: errorMsg,
          }));
          setError(errorMsg);
          return;
        }
        setMessageSignature(msg.chatCompletionId, data);
        setErrorSignatures((prev) => {
          const newErrors = { ...prev };
          delete newErrors[msg.chatCompletionId!];
          return newErrors;
        });

        // Verify the signature
        if (data.signature && data.signing_address && data.text) {
          const isValid = verifySignature(data.signing_address, data.text, data.signature);
          setVerificationStatus((prev) => ({
            ...prev,
            [msg.chatCompletionId!]: isValid,
          }));
        }
      } catch (err) {
        console.error("Error fetching message signature:", err);
        const errorMsg = err instanceof Error ? err.message : "Failed to fetch message signature";
        setErrorSignatures((prev) => ({
          ...prev,
          [msg.chatCompletionId!]: errorMsg,
        }));
        setError(errorMsg);
      } finally {
        setLoadingSignatures((prev) => {
          const newSet = new Set(prev);
          newSet.delete(msg.chatCompletionId!);
          return newSet;
        });
      }
    },
    [history, chatCompletions, messagesSignatures, loadingSignatures, setMessageSignature]
  );

  const scrollToSelectedMessage = useCallback(() => {
    if (!containerRef.current || !selectedMessageId) return;

    setTimeout(() => {
      const selectedElement = containerRef.current?.querySelector(
        `[data-message-id="${selectedMessageId}"]`
      ) as HTMLElement;
      if (selectedElement) {
        const scrollContainer = selectedElement.closest(".overflow-y-auto") as HTMLElement;
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const elementRect = selectedElement.getBoundingClientRect();
          const scrollTop =
            selectedElement.offsetTop - scrollContainer.offsetTop - containerRect.height / 2 + elementRect.height / 2;

          scrollContainer.scrollTo({
            top: scrollTop,
            behavior: "smooth",
          });
        } else {
          selectedElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      } else {
        console.log("Could not find element with data-message-id:", selectedMessageId);
      }
    }, 300);
  }, [selectedMessageId]);

  useEffect(() => {
    if (selectedMessageId) {
      scrollToSelectedMessage();
    }
  }, [selectedMessageId, scrollToSelectedMessage]);

  const openVerifySignatureDialog = () => {
    if (!messagesSignatures[selectedMessageId]) return;
    if (!messagesSignatures[selectedMessageId].signature) return;
    setShowVerifySignatureDialog(true);
    setSelectedSignature(messagesSignatures[selectedMessageId]);
  };

  const closeVerifySignatureDialog = () => {
    setShowVerifySignatureDialog(false);
    setSelectedSignature(null);
  };

  useEffect(() => {
    setSelectedMessageId("");
  }, [chatId]);

  // Function to verify a signature if it's already loaded
  const verifyLoadedSignature = useCallback(
    (msgId: string) => {
      const signature = messagesSignatures[msgId];
      if (signature && signature.signature && signature.signing_address && signature.text) {
        if (verificationStatus[msgId] === undefined) {
          const isValid = verifySignature(signature.signing_address, signature.text, signature.signature);
          setVerificationStatus((prev) => ({
            ...prev,
            [msgId]: isValid,
          }));
        }
      }
    },
    [messagesSignatures, verificationStatus]
  );

  // Verify all messages - both fetch signatures and verify already loaded ones
  useEffect(() => {
    if (chatCompletions.length === 0) return;

    // Verify signatures that are already loaded
    chatCompletions.forEach((message) => {
      if (message.chatCompletionId) {
        verifyLoadedSignature(message.chatCompletionId);
      }
    });

    // Fetch signatures for messages that don't have them yet
    chatCompletions.forEach((message) => {
      if (message.chatCompletionId && !messagesSignatures[message.chatCompletionId]) {
        fetchMessageSignature(message.chatCompletionId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatCompletions, messagesSignatures]);

  useEffect(() => {
    if (selectedMessageId) {
      fetchMessageSignature(selectedMessageId);
      verifyLoadedSignature(selectedMessageId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMessageId]);

  return (
    <div className="h-full space-y-4 overflow-y-auto px-4 pb-4" ref={containerRef}>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center">
            <XCircleIcon className="mr-2 h-5 w-5 text-red-400" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        </div>
      ) : chatCompletions.length > 0 ? (
        <div className="space-y-4">
          <p className="mt-4 text-gray-900 text-xs uppercase dark:text-[rgba(161,161,161,1)]">
            {t("Verifiable Messages")} ({chatCompletions.length})
          </p>

          {messageList.map((message, index) => {
            const isNotVerified = verificationStatus[message.chatCompletionId!] === false;
            return (
              <div
                key={message.chatCompletionId}
                className={`relative my-2 cursor-pointer rounded-lg border p-2 text-xs transition-colors ${
                  isNotVerified
                    ? `border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:hover:bg-red-900/30 ${
                        selectedMessageId === message.chatCompletionId ? "ring-1 ring-red-700 dark:bg-red-900/30" : ""
                      }`
                    : `border-green-200 bg-green-50 hover:bg-green-100 dark:border-[rgba(0,236,151,0.16)] dark:bg-[rgba(0,236,151,0.08)] dark:hover:bg-green-900/30 ${
                        selectedMessageId === message.chatCompletionId
                          ? "ring-1 ring-green-700 dark:bg-[rgba(0,236,151,0.15)]"
                          : ""
                      }`
                }`}
                onClick={() => message.chatCompletionId && setSelectedMessageId(message.chatCompletionId)}
                title="Click to view signature details"
                data-message-id={message.chatCompletionId}
              >
                <div className="mb-3">
                  <h4 className="mb-3 flex items-center justify-between font-medium text-gray-900 text-sm dark:text-white">
                    <span>
                      {t("Message")} {index + 1}
                    </span>
                    <div className="flex items-center space-x-1">
                      {verificationStatus[message.chatCompletionId!] === false ? (
                        <span className="flex items-center gap-1 rounded border border-red-500 bg-red-50 px-2 py-0.5 text-red-700 text-xs dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                          <XCircleIcon className="h-3 w-3" />
                          Not Verified
                        </span>
                      ) : (
                        <img src={VerifiedLogo} alt="Verified" />
                      )}
                    </div>
                  </h4>
                  <p
                    className={`mb-2 line-clamp-2 text-gray-700 text-xs dark:text-[rgba(248,248,248,0.88)] ${
                      selectedMessageId === message.chatCompletionId ? "dark:text-white" : ""
                    }`}
                  >
                    {message.content}
                  </p>
                  <p className="text-gray-500 text-xs dark:text-[rgba(248,248,248,0.64)]">
                    {t("ID")}: {message.chatCompletionId}
                  </p>
                </div>
              </div>
            );
          })}

          {chatCompletions.length > 2 && (
            <button
              className="flex w-full items-center justify-center gap-2.5 rounded-md bg-gray-100 px-4 py-2 text-gray-700 text-sm transition-colors hover:bg-gray-200 dark:bg-[rgba(248,248,248,0.08)] dark:text-white"
              onClick={() => setViewMore(!viewMore)}
            >
              {viewMore ? t("View Less") : t("View More")}
              <ChevronDownIcon className={`h-4 w-4 ${viewMore ? "rotate-180" : ""}`} strokeWidth={2.5} />
            </button>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="mt-4 text-gray-900 text-xs uppercase dark:text-[rgba(161,161,161,1)]">
                {t("Signature Details")}
              </p>
            </div>

            {selectedMessageId && messagesSignatures[selectedMessageId] ? (
              <>
                {messagesSignatures[selectedMessageId].signature && (
                  <button
                    className={`mb-4 flex items-center text-xs transition-colors ${
                      verificationStatus[selectedMessageId] === false
                        ? "text-red-500 hover:text-red-700"
                        : "text-green-500 hover:text-green-700"
                    }`}
                    onClick={openVerifySignatureDialog}
                  >
                    <ArrowTopRightOnSquareIcon className="mr-1 h-3 w-3" />
                    {t("Verify the ECDSA Signature")}
                  </button>
                )}

                <div className="min-h-[150px] rounded-lg">
                  <div className="mb-2">
                    <label className="mb-1 block text-gray-700 text-xs dark:text-[rgba(161,161,161,1)]">
                      {t("Signing Address")}:
                    </label>
                    <div className="flex min-h-[24px] items-center break-all rounded border border-gray-300 bg-gray-100 px-2 py-1 font-mono text-xs dark:border-[rgba(248,248,248,0.08)] dark:bg-[rgba(248,248,248,0.04)]">
                      {messagesSignatures[selectedMessageId].signing_address ?? ""}
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="mb-1 block text-gray-700 text-xs dark:text-[rgba(161,161,161,1)]">
                      {t("Message")}:
                    </label>
                    <div className="flex min-h-[24px] items-center break-all rounded border border-gray-300 bg-gray-100 px-2 py-1 font-mono text-xs dark:border-[rgba(248,248,248,0.08)] dark:bg-[rgba(248,248,248,0.04)]">
                      {messagesSignatures[selectedMessageId].text ?? ""}
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="mb-1 block text-gray-700 text-xs dark:text-[rgba(161,161,161,1)]">
                      {t("Signature")}:
                    </label>
                    <div className="flex min-h-[24px] items-center break-all rounded border border-gray-300 bg-gray-100 px-2 py-1 font-mono text-xs dark:border-[rgba(248,248,248,0.08)] dark:bg-[rgba(248,248,248,0.04)]">
                      {messagesSignatures[selectedMessageId].signature ?? ""}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-gray-700 text-xs dark:text-[rgba(161,161,161,1)]">
                      {t("Algorithm")}:
                    </label>
                    <div className="flex min-h-[24px] items-center rounded border border-gray-300 bg-gray-100 px-2 py-1 text-xs dark:border-[rgba(248,248,248,0.08)] dark:bg-[rgba(248,248,248,0.04)]">
                      {messagesSignatures[selectedMessageId].signing_algo ?? ""}
                    </div>
                  </div>
                </div>
              </>
            ) : selectedMessageId ? (
              loadingSignatures.has(selectedMessageId) ? (
                <div className="flex min-h-[150px] items-center justify-center rounded-lg">
                  <div className="h-4 w-4 animate-spin rounded-full border-[rgba(0,236,151,1)] border-b-2" />
                </div>
              ) : errorSignatures[selectedMessageId] ? (
                <div className="flex min-h-[150px] items-center justify-center rounded-lg">
                  <div className="py-2 text-center text-gray-500 dark:text-gray-400">
                    <p className="text-xs">{t("No signature data found for this message.")}</p>
                  </div>

                  <button
                    title={t("Retry")}
                    type="button"
                    className="ml-1 cursor-pointer hover:opacity-75"
                    onClick={() => fetchMessageSignature(selectedMessageId)}
                  >
                    <ArrowPathIcon className="h-3.5 w-3.5 text-[rgba(0,236,151,1)]" />
                  </button>
                </div>
              ) : (
                <div className="flex min-h-[150px] items-center justify-center rounded-lg">
                  <div className="py-2 text-center text-gray-500 dark:text-gray-400">
                    <p className="text-xs">{t("No signature data found for this message.")}</p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex min-h-[150px] items-center justify-center rounded-lg">
                <div className="py-2 text-center text-gray-500 dark:text-gray-400">
                  <p className="text-xs">{t("Click on a message above to view signature details")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">{t("No verifiable messages found for this chat.")}</p>
        </div>
      )}

      <div className="h-10" />

      <VerifySignatureDialog
        show={showVerifySignatureDialog}
        address={selectedSignature?.signing_address ?? ""}
        message={selectedSignature?.text ?? ""}
        signature={selectedSignature?.signature ?? ""}
        onClose={closeVerifySignatureDialog}
      />
    </div>
  );
};

export default MessagesVerifier;
