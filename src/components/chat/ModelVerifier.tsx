import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { type ModelAttestationReport, nearAIClient } from "@/api/nearai/client";
import IntelLogo from "@/assets/images/intel-2.svg";
import NvidiaLogo from "@/assets/images/nvidia-2.svg";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { copyToClipboard } from "@/lib/index";
import type { VerificationStatus } from "./types";

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
      setAttestationData(data);
      setNvidiaPayload(JSON.parse(data?.nvidia_payload || "{}"));
      setIntelQuote(data?.intel_quote || null);
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
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

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleBackdropClick}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border-gray-200 bg-white shadow-3xl dark:border-[rgba(255,255,255,0.04)] dark:bg-gray-875"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 dark:border-gray-700">
          <p className="flex items-center gap-2 text-gray-900 text-lg dark:text-white">{t("Model Verification")}</p>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded text-white shadow transition-colors hover:text-gray-600 dark:bg-[rgba(248,248,248,0.04)] dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className="mb-2 font-medium text-gray-900 text-sm dark:text-white">{t("Verified Model")}</p>
            <p className="text-gray-600 text-sm dark:text-gray-400">{model}</p>
          </div>

          <div className="mb-6">
            <p className="mb-3 text-gray-600 text-sm dark:text-gray-400">{t("Attested by")}</p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img src={NvidiaLogo} alt="NVIDIA" className="h-8 w-20" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">{t("and")}</p>

              <div className="flex items-center space-x-2">
                <img src={IntelLogo} alt="Intel" className="h-8 w-16" />
              </div>
            </div>
          </div>

          <p className="mb-6 text-gray-700 dark:text-gray-300">
            {t(
              "This automated verification tool lets you independently confirm that the model is running in the TEE (Trusted Execution Environment)."
            )}
          </p>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-[rgba(0,236,151,1)] border-b-2" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">{t("Verifying attestation...")}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center">
                <XCircleIcon className="mr-2 h-5 w-5 text-red-400" />
                <span className="text-red-800 dark:text-red-200">{error}</span>
              </div>
            </div>
          )}

          {attestationData && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-[rgba(0,236,151,0.08)]">
                <button
                  onClick={() => toggleSection("gpu")}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                      <CheckIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{t("GPU Attestation")}</span>
                  </div>
                  <ChevronDownIcon
                    className={`h-5 w-5 transform text-gray-400 transition-transform ${
                      expandedSections.gpu ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedSections.gpu && (
                  <div className="mt-4 border-gray-200 border-t pt-4 dark:border-gray-600">
                    <div className="space-y-4">
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                        <div className="mb-2 flex items-center">
                          <img src={NvidiaLogo} alt="NVIDIA" className="mr-2 h-8 w-20" />
                          <span className="font-medium text-green-900 text-sm dark:text-green-100">
                            {t("Remote Attestation Service")}
                          </span>
                        </div>
                        <p className="mb-3 text-green-800 text-xs dark:text-green-200">
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
                          <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                            {t("Nonce")}:
                          </label>
                          <div className="relative">
                            <textarea
                              readOnly
                              className="h-16 w-full resize-none rounded-md border border-gray-300 bg-gray-100 px-3 py-2 font-mono text-sm dark:border-[rgba(248,248,248,0.08)] dark:bg-[rgba(248,248,248,0.04)]"
                              value={nvidiaPayload?.nonce || ""}
                            />
                            <button
                              onClick={() => {
                                if (!nvidiaPayload) return;
                                handleCopy(nvidiaPayload.nonce, "nonce");
                              }}
                              className="absolute top-2 right-2 p-1 text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
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
                          <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                            {t("Evidence List")}:
                          </label>
                          <div className="relative">
                            <textarea
                              readOnly
                              className="h-32 w-full resize-none rounded-md border border-gray-300 bg-gray-100 px-3 py-2 font-mono text-sm dark:border-[rgba(248,248,248,0.08)] dark:bg-[rgba(248,248,248,0.04)]"
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
                              className="absolute top-2 right-2 p-1 text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
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
                        <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                          {t("Architecture")}:
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            readOnly
                            value={nvidiaPayload?.arch || ""}
                            className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm dark:border-[rgba(248,248,248,0.08)] dark:bg-[rgba(248,248,248,0.04)]"
                          />
                          <button
                            onClick={() => {
                              if (!nvidiaPayload) return;
                              handleCopy(nvidiaPayload.arch, "arch");
                            }}
                            className="absolute top-2 right-2 p-1 text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
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

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-[rgba(0,236,151,0.08)]">
                <button
                  onClick={() => toggleSection("tdx")}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                      <CheckIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{t("TDX Attestation")}</span>
                  </div>
                  <ChevronDownIcon
                    className={`h-5 w-5 transform text-gray-400 transition-transform ${
                      expandedSections.tdx ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedSections.tdx && (
                  <div className="mt-4 border-gray-200 border-t pt-4 dark:border-gray-600">
                    <div className="space-y-4">
                      {/* Intel Trust Domain Extensions Info */}
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                        <div className="mb-2 flex items-center">
                          <img src={IntelLogo} alt="Intel" className="mr-2 h-8 w-16" />
                          <span className="font-medium text-green-900 text-sm dark:text-green-100">
                            {t("Trust Domain Extensions")}
                          </span>
                        </div>
                        <p className="mb-3 text-green-800 text-xs dark:text-green-200">
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
                          <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                            {t("Quote")}:
                          </label>
                          <div className="relative">
                            <textarea
                              readOnly
                              className="h-32 w-full resize-none rounded-md border border-gray-300 bg-gray-100 px-3 py-2 font-mono text-sm dark:border-[rgba(248,248,248,0.08)] dark:bg-[rgba(248,248,248,0.04)]"
                              value={intelQuote}
                            />
                            <button
                              onClick={() => {
                                if (!intelQuote) return;
                                handleCopy(intelQuote, "intelQuote");
                              }}
                              className="absolute top-2 right-2 p-1 text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
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
              <button
                onClick={verifyAgain}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-gray-700/5 px-5 py-2.5 font-semibold text-sm transition hover:bg-gray-700/10 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-gray-750 dark:text-gray-300 dark:hover:bg-gray-100/10 dark:hover:text-white"
              >
                <ArrowPathIcon className="h-5 w-5" />
                <span>{t("Verify Again")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelVerifier;
