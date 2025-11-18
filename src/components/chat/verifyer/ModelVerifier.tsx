import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { type ModelAttestationReport, nearAIClient } from "@/api/nearai/client";
import IntelLogo from "@/assets/images/intel-2.svg?react";
import NvidiaLogo from "@/assets/images/nvidia-2.svg?react";
import Spinner from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { copyToClipboard } from "@/lib/index";
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">{t("Model Verification")}</DialogTitle>
          <DialogDescription className="sr-only" />
        </DialogHeader>

        <div>
          <div className="mb-4">
            <p className="mb-2 font-medium text-sm">{t("Verified Model")}</p>
            <p className="text-muted-foreground text-sm">{model}</p>
          </div>
          <div className="mb-6 border-border border-t" />
          <div className="mb-6">
            <p className="mb-3 text-muted-foreground text-sm">{t("Attested by")}</p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-foreground">
                <NvidiaLogo className="h-8 w-20" />
              </div>
              <p className="text-muted-foreground">{t("and")}</p>

              <div className="flex items-center space-x-2 text-foreground">
                <IntelLogo className="h-8 w-16" />
              </div>
            </div>
          </div>

          <p className="mb-6 text-muted-foreground">
            {t(
              "This automated verification tool lets you independently confirm that the model is running in the TEE (Trusted Execution Environment)."
            )}
          </p>

          <div className="mb-6 border-border border-t" />

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Spinner className="size-5" />
              <span className="ml-3 text-sm">{t("Verifying attestation...")}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <div className="flex items-center">
                <XCircleIcon className="mr-2 h-5 w-5 text-destructive" />
                <span className="text-destructive">{error}</span>
              </div>
            </div>
          )}

          {attestationData && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/10 p-4">
                <button
                  onClick={() => toggleSection("gpu")}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green">
                      <CheckIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium">{t("GPU Attestation")}</span>
                  </div>
                  <ChevronDownIcon
                    className={`h-5 w-5 transform text-muted-foreground transition-transform ${
                      expandedSections.gpu ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedSections.gpu && (
                  <div className="mt-4 border-border border-t pt-4">
                    <div className="space-y-4">
                      <div className="rounded-lg border border-green/30 bg-green/10 p-3">
                        <div className="mb-2 flex items-center">
                          <NvidiaLogo className="mr-2 h-8 w-20" />
                          <span className="font-medium text-green-dark text-sm">{t("Remote Attestation Service")}</span>
                        </div>
                        <p className="mb-3 text-foreground/80 text-xs">
                          {t(
                            "This verification uses NVIDIA's Remote Attestation Service (NRAS) to prove that your model is running on genuine NVIDIA hardware in a secure environment. You can independently verify the attestation evidence using NVIDIA's public API."
                          )}
                        </p>
                        <div className="space-y-1">
                          <a
                            href="https://docs.api.nvidia.com/attestation/reference/attestmultigpu"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-red-500 text-xs transition-colors hover:text-red-600"
                          >
                            <ArrowTopRightOnSquareIcon className="mr-1 h-3 w-3" />
                            {t("Verify GPU attestation by yourself")}
                          </a>
                          <a
                            href="https://docs.nvidia.com/attestation/index.html#overview"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-red-500 text-xs transition-colors hover:text-red-600"
                          >
                            <ArrowTopRightOnSquareIcon className="mr-1 h-3 w-3" />
                            {t("Learn about NVIDIA Attestation")}
                          </a>
                        </div>
                      </div>

                      {nvidiaPayload && (
                        <div>
                          <label className="mb-1 block font-medium text-foreground text-sm">{t("Nonce")}:</label>
                          <div className="relative">
                            <textarea
                              readOnly
                              className="h-16 w-full resize-none rounded-md border border-border bg-secondary/10 px-3 py-2 font-mono text-sm"
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
                              {checkedMap.nonce ? (
                                <CheckIcon className="h-4 w-4" />
                              ) : (
                                <ClipboardDocumentIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {nvidiaPayload && (
                        <div>
                          <label className="mb-1 block font-medium text-foreground text-sm">
                            {t("Evidence List")}:
                          </label>
                          <div className="relative">
                            <textarea
                              readOnly
                              className="h-32 w-full resize-none rounded-md border border-border bg-secondary/10 px-3 py-2 font-mono text-sm"
                              value={JSON.stringify(nvidiaPayload?.evidence_list || [], null, 2)}
                            />
                            <button
                              onClick={() => {
                                if (!nvidiaPayload) return;
                                handleCopy(
                                  JSON.stringify(nvidiaPayload?.evidence_list || [], null, 2),
                                  "evidence_list"
                                );
                              }}
                              className="absolute top-2 right-2 p-1 text-muted-foreground transition-colors hover:text-foreground"
                              title="Copy evidence list"
                            >
                              {checkedMap.evidence_list ? (
                                <CheckIcon className="h-4 w-4" />
                              ) : (
                                <ClipboardDocumentIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="mb-1 block font-medium text-foreground text-sm">{t("Architecture")}:</label>
                        <div className="relative">
                          <input
                            type="text"
                            readOnly
                            value={nvidiaPayload?.arch || ""}
                            className="w-full rounded-md border border-border bg-secondary/10 px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() => {
                              if (!nvidiaPayload) return;
                              handleCopy(nvidiaPayload.arch, "arch");
                            }}
                            className="absolute top-2 right-2 p-1 text-muted-foreground transition-colors hover:text-foreground"
                            title="Copy architecture"
                          >
                            {checkedMap.arch ? (
                              <CheckIcon className="h-4 w-4" />
                            ) : (
                              <ClipboardDocumentIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-secondary/10 p-4">
                <button
                  onClick={() => toggleSection("tdx")}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green">
                      <CheckIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium">{t("TDX Attestation")}</span>
                  </div>
                  <ChevronDownIcon
                    className={`h-5 w-5 transform text-muted-foreground transition-transform ${
                      expandedSections.tdx ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedSections.tdx && (
                  <div className="mt-4 border-border border-t pt-4">
                    <div className="space-y-4">
                      {/* Intel Trust Domain Extensions Info */}
                      <div className="rounded-lg border border-green/30 bg-green/10 p-3">
                        <div className="mb-2 flex items-center">
                          <IntelLogo className="mr-2 h-8 w-16" />
                          <span className="font-medium text-green-dark text-sm">{t("Trust Domain Extensions")}</span>
                        </div>
                        <p className="mb-3 text-foreground/80 text-xs">
                          {t(
                            "Intel TDX (Trust Domain Extensions) provides hardware-based attestation for confidential computing. You can verify the authenticity of this TDX quote using Phala's TEE Attestation Explorer - an open source tool for analyzing Intel attestation reports."
                          )}
                        </p>
                        <div className="space-y-1">
                          <a
                            href="https://proof.t16z.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-red-500 text-xs transition-colors hover:text-red-600"
                          >
                            <ArrowTopRightOnSquareIcon className="mr-1 h-3 w-3" />
                            {t("Verify TDX quote at TEE Explorer")}
                          </a>
                          <a
                            href="https://www.intel.com/content/www/us/en/developer/articles/technical/intel-trust-domain-extensions.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-red-500 text-xs transition-colors hover:text-red-600"
                          >
                            <ArrowTopRightOnSquareIcon className="mr-1 h-3 w-3" />
                            {t("Learn about Intel TDX")}
                          </a>
                        </div>
                      </div>

                      {/* Quote Section */}
                      {intelQuote && (
                        <div>
                          <label className="mb-1 block font-medium text-foreground text-sm">{t("Quote")}:</label>
                          <div className="relative">
                            <textarea
                              readOnly
                              className="h-32 w-full resize-none rounded-md border border-border bg-secondary/10 px-3 py-2 font-mono text-sm"
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
                                <CheckIcon className="h-4 w-4" />
                              ) : (
                                <ClipboardDocumentIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {attestationData && (
            <div className="mt-6 flex justify-center">
              <Button onClick={verifyAgain} disabled={loading} size="small" className="px-4!" variant="secondary">
                <ArrowPathIcon className="h-5 w-5" />
                <span>{t("Verify Again")}</span>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModelVerifier;
