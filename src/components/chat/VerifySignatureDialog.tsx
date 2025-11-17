import { CheckIcon, ClipboardIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/index";
import { verifySignature } from "@/lib/signature";

interface VerifySignatureDialogProps {
  show: boolean;
  address: string;
  message: string;
  signature: string;
  onClose: () => void;
}

type VerifyStatus = "pending" | "success" | "error";

const VerifySignatureDialog: React.FC<VerifySignatureDialogProps> = ({
  show,
  address,
  message,
  signature,
  onClose,
}) => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("pending");
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (show && address && message && signature) {
      setVerifyStatus("pending");
      const isValid = verifySignature(address, message, signature);
      setVerifyStatus(isValid ? "success" : "error");
    }
  }, [show, address, message, signature]);

  useEffect(() => {
    if (show) {
      setCheckedMap({});
    }
  }, [show]);

  const handleCopy = async (text: string, key: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(t("Copied to clipboard"));
      setCheckedMap((prev) => ({ ...prev, [key]: true }));
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleBackdropClick}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-white shadow-2xl dark:border-[rgba(255,255,255,0.1)] dark:bg-gray-875"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-gray-200 px-6 pt-6 pb-3 dark:border-gray-700">
          <p className="flex items-center gap-2 text-gray-900 text-lg dark:text-white">{t("Signature Verification")}</p>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-white shadow transition-colors hover:text-gray-600 dark:bg-[rgba(248,248,248,0.04)] dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-6">
          {/* Status */}
          {verifyStatus === "success" && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-2.5 py-2 text-green-700 text-sm dark:border-[rgba(0,236,151,0.08)] dark:bg-[rgba(0,236,151,0.08)] dark:text-green-300">
              <CheckIcon className="mr-0.5 inline-block h-5 w-5 text-green-500 dark:text-[rgba(0,236,151,1)]" />
              Message Signature Verified. The message signature has been confirmed to be signed by the address using the
              <a
                className="mx-1 text-blue-500 underline"
                href="https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm"
                rel="noopener noreferrer"
                target="_blank"
              >
                ECDSA
              </a>
              algorithm.
            </div>
          )}
          {verifyStatus === "error" && (
            <p className="mb-4 flex items-center gap-2 rounded-lg border border-[#f1aeb5] bg-[#f8d7da] px-2.5 py-2 text-[#b02a37] text-sm">
              {t("Sorry! The Message Signature Verification Failed")}
            </p>
          )}

          {/* Form */}
          <form
            className="flex w-full flex-col"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            {/* Address Field */}
            <div className="mb-3 flex w-full flex-col">
              <div className="mb-2 flex items-center justify-between text-black text-sm dark:text-[rgba(161,161,161,1)]">
                <span>{t("Address")}</span>
                <button
                  type="button"
                  className="flex items-center gap-x-1 rounded-md border-none bg-gray-50 bg-none px-2 py-1 text-xs transition hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800"
                  onClick={() => handleCopy(address, "address")}
                >
                  {checkedMap.address ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                  {t("Copy")}
                </button>
              </div>
              <div className="flex-1">
                <input
                  className="w-full rounded border border-gray-300/50 px-3 py-2 text-sm outline-hidden placeholder:text-[rgba(161,161,161,1)] dark:border-[rgba(248,248,248,0.08)] dark:bg-[rgba(248,248,248,0.04)] dark:text-[rgba(161,161,161,1)]"
                  type="text"
                  autoComplete="off"
                  value={address}
                  placeholder="0x..."
                  disabled
                  required
                />
              </div>
            </div>

            {/* Message Field */}
            <div className="mb-3 flex w-full flex-col">
              <div className="mb-2 flex items-center justify-between text-black text-sm dark:text-[rgba(161,161,161,1)]">
                <span>{t("Message")}</span>
                <button
                  type="button"
                  className="flex items-center gap-x-1 rounded-md border-none bg-gray-50 bg-none px-2 py-1 text-xs transition hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800"
                  onClick={() => handleCopy(message, "message")}
                >
                  {checkedMap.message ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                  {t("Copy")}
                </button>
              </div>
              <div className="flex-1">
                <textarea
                  className="w-full rounded border border-gray-300/50 px-3 py-2 text-sm outline-hidden placeholder:text-[rgba(161,161,161,1)] dark:border-[rgba(248,248,248,0.08)] dark:bg-[rgba(248,248,248,0.04)] dark:text-[rgba(161,161,161,1)]"
                  rows={3}
                  required
                  value={message}
                  disabled
                  maxLength={60000}
                />
              </div>
            </div>

            {/* Signature Field */}
            <div className="mb-6 flex w-full flex-col">
              <div className="mb-2 flex items-center justify-between text-black text-sm dark:text-[rgba(161,161,161,1)]">
                <span>{t("Signature")}</span>
                <button
                  type="button"
                  className="flex items-center gap-x-1 rounded-md border-none bg-gray-50 bg-none px-2 py-1 text-xs transition hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800"
                  onClick={() => handleCopy(signature, "signature")}
                >
                  {checkedMap.signature ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                  {t("Copy")}
                </button>
              </div>
              <div className="flex-1">
                <textarea
                  className="w-full rounded border border-gray-300/50 px-3 py-2 text-sm outline-hidden placeholder:text-[rgba(161,161,161,1)] dark:border-[rgba(248,248,248,0.08)] dark:bg-[rgba(248,248,248,0.04)] dark:text-[rgba(161,161,161,1)]"
                  value={signature}
                  rows={3}
                  required
                  disabled
                  maxLength={60000}
                />
              </div>
            </div>

            {/* Close Button */}
            <div className="flex w-full items-center justify-end">
              <button
                className="rounded-lg bg-gray-700/5 px-4 py-2 font-medium text-sm transition hover:bg-gray-700/10 dark:bg-gray-100/5 dark:text-gray-300 dark:hover:bg-gray-100/10 dark:hover:text-white"
                type="button"
                onClick={onClose}
              >
                {t("Close")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifySignatureDialog;
