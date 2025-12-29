import { CheckIcon, ClipboardIcon } from "@heroicons/react/24/outline";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">{t("Signature Verification")}</DialogTitle>
          <DialogDescription className="sr-only" />
        </DialogHeader>

        <div>
          <div className="mb-4 border-border border-t" />

          {/* Status */}
          {verifyStatus === "success" && (
            <div className="mb-4 rounded-lg border border-green/30 bg-green/10 px-2.5 py-2 text-green-dark text-sm">
              <CheckIcon className="mr-0.5 inline-block h-5 w-5 text-green" />
              Message Signature Verified. The message signature has been confirmed to be signed by the address using the
              <a
                className="mx-1 text-green-dark underline hover:text-green"
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
            <p className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-destructive text-sm">
              {t("Sorry! The Message Signature Verification Failed")}
            </p>
          )}

          {/* Form */}
          <div className="flex w-full flex-col">
            {/* Address Field */}
            <div className="mb-3 flex w-full flex-col">
              <div className="mb-2 flex items-center justify-between text-foreground text-sm">
                <span>{t("Address")}</span>
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  className="h-auto gap-x-1 px-2 py-1 text-xs"
                  onClick={() => handleCopy(address, "address")}
                >
                  {checkedMap.address ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                  {t("Copy")}
                </Button>
              </div>
              <div className="flex-1">
                <input
                  className="w-full rounded-lg border border-border bg-card/30 px-3 py-2 text-sm outline-hidden placeholder:text-muted-foreground dark:bg-secondary/10"
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
              <div className="mb-2 flex items-center justify-between text-foreground text-sm">
                <span>{t("Message")}</span>
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  className="h-auto gap-x-1 px-2 py-1 text-xs"
                  onClick={() => handleCopy(message, "message")}
                >
                  {checkedMap.message ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                  {t("Copy")}
                </Button>
              </div>
              <div className="flex-1">
                <textarea
                  className="w-full rounded-lg border border-border bg-card/30 px-3 py-2 text-sm outline-hidden placeholder:text-muted-foreground dark:bg-secondary/10"
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
              <div className="mb-2 flex items-center justify-between text-foreground text-sm">
                <span>{t("Signature")}</span>
                <Button
                  onClick={() => handleCopy(signature, "signature")}
                  size="small"
                  variant="secondary"
                  className="h-auto gap-x-1 px-2 py-1 text-xs"
                >
                  {checkedMap.signature ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                  {t("Copy")}
                </Button>
              </div>
              <div className="flex-1">
                <textarea
                  className="w-full rounded-lg border border-border bg-card/30 px-3 py-2 text-sm outline-hidden placeholder:text-muted-foreground dark:bg-secondary/10"
                  value={signature}
                  rows={3}
                  required
                  disabled
                  maxLength={60000}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VerifySignatureDialog;
