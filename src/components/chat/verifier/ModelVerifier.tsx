import { ArrowPathIcon, ArrowUpRightIcon, CheckIcon, ChevronRightIcon, XCircleIcon } from "@heroicons/react/24/solid";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { type ModelAttestationReport, nearAIClient } from "@/api/nearai/client";
import ClipboardIcon from "@/assets/icons/clipboard.svg?react";
import IntelLogo from "@/assets/images/intel.svg?react";
import NvidiaLogo from "@/assets/images/nvidia.svg?react";
import Spinner from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { copyToClipboard } from "@/lib/index";
import { cn } from "@/lib/time";
import { useChatStore } from "@/stores/useChatStore";
import type { VerificationStatus } from "../types";

interface ModelVerifierProps {
  model: string;
  show: boolean;
  autoVerify?: boolean;
  onClose: () => void;
  onStatusUpdate?: (status: VerificationStatus) => void;
}

interface ExpandedSections {
  gpu: boolean;
  tdx: boolean;
}

interface CheckedMap {
  [key: string]: boolean;
}

const ModelVerifier: React.FC<ModelVerifierProps> = ({ model, show, autoVerify = false, onClose, onStatusUpdate }) => {
  const { t } = useTranslation("translation", { useSuspense: false });

  const { models } = useChatStore();
  const modelIcon = models.find((m) => m.modelId === model)?.metadata?.modelIcon;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attestationData, setAttestationData] = useState<ModelAttestationReport | null>(null);
  // biome-ignore lint/suspicious/noExplicitAny: explanation
  const [nvidiaPayload, setNvidiaPayload] = useState<any | null>(null);
  const [intelQuote, setIntelQuote] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    gpu: false,
    tdx: false,
  });
  const [checkedMap, setCheckedMap] = useState<CheckedMap>({});

  const fetchAttestationReport = useCallback(async () => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);

    if (!model || !token) return;

    setLoading(true);
    setError(null);

    try {
      const data = await nearAIClient.getModelAttestationReport(model);
      const attestations = data.model_attestations ?? data.all_attestations;
      const attestation = attestations[0];

      if (!attestation) {
        throw new Error("No attestation data found for this model");
      }
      setAttestationData(data);
      setNvidiaPayload(JSON.parse(attestation.nvidia_payload || "{}"));
      setIntelQuote(attestation.intel_quote || null);
    } catch (err) {
      console.error("Error fetching attestation report:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch attestation report");
    } finally {
      setLoading(false);
    }
  }, [model]);

  const verifyAgain = async () => {
    await fetchAttestationReport();
    setCheckedMap({});
  };

  const handleClose = () => {
    onClose();
    setCheckedMap({});
  };

  const toggleSection = (section: "gpu" | "tdx") => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCopy = async (text: string, key: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(t("Copied to clipboard"));
      setCheckedMap((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCheckedMap((prev) => ({ ...prev, [key]: false }));
      }, 1000);
    }
  };

  const verificationStatus: VerificationStatus = useMemo(
    () => ({
      loading,
      error,
      data: attestationData,
      isVerified: !loading && !error && attestationData !== null,
    }),
    [loading, error, attestationData]
  );

  useEffect(() => {
    if (autoVerify && onStatusUpdate) {
      onStatusUpdate(verificationStatus);
    }
  }, [autoVerify, onStatusUpdate, verificationStatus]);

  useEffect(() => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);

    if ((show || autoVerify) && model && token) {
      fetchAttestationReport();
    }
  }, [show, autoVerify, model, fetchAttestationReport]);

  useEffect(() => {
    if (!show) {
      setAttestationData(null);
      setError(null);
      setExpandedSections({ gpu: false, tdx: false });
    }
  }, [show]);

  useEffect(() => {
    if (show) {
      setCheckedMap({});
    }
  }, [show]);

  return (
    <Dialog open={show} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-[540px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">{t("Model Verification")}</DialogTitle>
          <DialogDescription className="sr-only" />
        </DialogHeader>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <p className="font-normal text-xs leading-[160%] opacity-60">{t("Verified Model")}</p>
            <div className="flex items-center gap-1">
              <img src={modelIcon} alt="Model" className="size-5" />
              <p className="leading-[normal]">{model}</p>
            </div>
          </div>
          <p className="font-normal text-sm leading-[140%] opacity-80">
            The hardware attestations below confirm the authenticity of this model and the environment it runs in.
            Expand any section to view the raw attestation data or verify it independently.
          </p>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Spinner className="size-5" />
              <span className="ml-3 text-sm">{t("Verifying attestation...")}</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <div className="flex items-center">
                <XCircleIcon className="mr-2 h-5 w-5 text-destructive" />
                <span className="text-destructive">{error}</span>
              </div>
            </div>
          )}

          {attestationData && (
            <div className="space-y-4">
              <div className="flex flex-col gap-6 rounded-xl bg-secondary/10 px-3 py-3.5">
                <button onClick={() => toggleSection("gpu")} className="flex w-full items-center gap-1">
                  <ChevronRightIcon
                    className={cn("size-4 transition-transform", {
                      "rotate-90": expandedSections.gpu,
                    })}
                  />
                  <span className="flex-1 text-left font-medium leading-[normal]">{t("GPU Attestation")}</span>
                  <NvidiaLogo className="h-5" />
                </button>

                {expandedSections.gpu && (
                  <>
                    <p className="font-normal text-sm leading-[140%] opacity-80">
                      NVIDIA’s Remote Attestation Service verifies that the GPU executing this model matches trusted
                      hardware specifications.
                    </p>
                    <div className="flex items-center gap-4">
                      <Button variant="secondary" asChild>
                        <a
                          href="https://docs.nvidia.com/attestation/index.html#overview"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Documentation <ArrowUpRightIcon className="size-4" />
                        </a>
                      </Button>
                      <Button variant="secondary" asChild>
                        <a
                          href="https://docs.api.nvidia.com/attestation/reference/attestmultigpu"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Verify via NVIDIA API <ArrowUpRightIcon className="size-4" />
                        </a>
                      </Button>
                    </div>

                    {nvidiaPayload && (
                      <div>
                        <label className="font-normal text-xs leading-[160%] opacity-60">{t("Nonce")}:</label>
                        <div className="relative">
                          <textarea
                            readOnly
                            className="h-16 w-full resize-none rounded-lg border border-border pt-1.5 pr-8 pb-3 pl-3 font-normal text-sm leading-[140%] opacity-80"
                            value={nvidiaPayload?.nonce || ""}
                          />
                          <button
                            onClick={() => {
                              if (!nvidiaPayload) return;
                              handleCopy(nvidiaPayload.nonce, "nonce");
                            }}
                            className="absolute top-2 right-2 p-1 text-muted-foreground transition-colors hover:text-foreground"
                            title="Copy nonce"
                          >
                            {checkedMap.nonce ? <CheckIcon className="size-4" /> : <ClipboardIcon className="size-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {nvidiaPayload && (
                      <div>
                        <label className="font-normal text-xs leading-[160%] opacity-60">{t("Evidence List")}:</label>
                        <div className="relative">
                          <textarea
                            readOnly
                            className="h-32 w-full resize-none rounded-lg border border-border pt-1.5 pr-8 pb-3 pl-3 font-normal text-sm leading-[140%] opacity-80"
                            value={JSON.stringify(nvidiaPayload?.evidence_list || [], null, 2)}
                          />
                          <button
                            onClick={() => {
                              if (!nvidiaPayload) return;
                              handleCopy(JSON.stringify(nvidiaPayload?.evidence_list || [], null, 2), "evidence_list");
                            }}
                            className="absolute top-2 right-2 p-1 text-muted-foreground transition-colors hover:text-foreground"
                            title="Copy evidence list"
                          >
                            {checkedMap.evidence_list ? (
                              <CheckIcon className="size-4" />
                            ) : (
                              <ClipboardIcon className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="font-normal text-xs leading-[160%] opacity-60">{t("Architecture")}:</label>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={nvidiaPayload?.arch || ""}
                          className="w-full rounded-lg border border-border pt-1.5 pr-8 pb-3 pl-3 font-normal text-sm leading-[140%] opacity-80"
                        />
                        <button
                          onClick={() => {
                            if (!nvidiaPayload) return;
                            handleCopy(nvidiaPayload.arch, "arch");
                          }}
                          className="absolute top-2 right-2 p-1 text-muted-foreground transition-colors hover:text-foreground"
                          title="Copy architecture"
                        >
                          {checkedMap.arch ? <CheckIcon className="size-4" /> : <ClipboardIcon className="size-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-6 rounded-xl bg-secondary/10 px-3 py-3.5">
                <button onClick={() => toggleSection("tdx")} className="flex w-full items-center gap-1">
                  <ChevronRightIcon
                    className={cn("size-4 transition-transform", {
                      "rotate-90": expandedSections.tdx,
                    })}
                  />
                  <span className="flex-1 text-left font-medium leading-[normal]">{t("TDX Attestation")}</span>
                  <IntelLogo className="h-5" />
                </button>

                {expandedSections.tdx && (
                  <>
                    <p className="font-normal text-sm leading-[140%] opacity-80">
                      Intel TDX provides a hardware-isolated environment and issues cryptographically signed attestation
                      reports.
                    </p>
                    <div className="flex items-center gap-4">
                      <Button variant="secondary" asChild>
                        <a
                          href="https://www.intel.com/content/www/us/en/developer/articles/technical/intel-trust-domain-extensions.html"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Documentation <ArrowUpRightIcon className="size-4" />
                        </a>
                      </Button>
                      <Button variant="secondary" asChild>
                        <a href="https://proof.t16z.com/" target="_blank" rel="noopener noreferrer">
                          Verify via Intel TDX Explorer <ArrowUpRightIcon className="size-4" />
                        </a>
                      </Button>
                    </div>

                    {/* Quote Section */}
                    {intelQuote && (
                      <div>
                        <label className="font-normal text-xs leading-[160%] opacity-60">{t("Quote")}:</label>
                        <div className="relative w-full">
                          <textarea
                            readOnly
                            className="h-32 w-full resize-none rounded-lg border border-border pt-1.5 pr-8 pb-3 pl-3 font-normal text-sm leading-[140%] opacity-80"
                            value={intelQuote}
                          />
                          <button
                            onClick={() => {
                              if (!intelQuote) return;
                              handleCopy(intelQuote, "intelQuote");
                            }}
                            className="absolute top-2 right-2 p-1 text-muted-foreground transition-colors hover:text-foreground"
                            title="Copy quote"
                          >
                            {checkedMap.intelQuote ? (
                              <CheckIcon className="size-4" />
                            ) : (
                              <ClipboardIcon className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {attestationData && (
            <div className="flex items-center gap-4">
              <Button onClick={verifyAgain} disabled={loading} variant="secondary">
                <ArrowPathIcon className="size-5" />
                <span>{t("Verify Again")}</span>
              </Button>
              <Button onClick={handleClose} className="flex-1">
                {t("Close")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModelVerifier;
