import { ArrowPathIcon, ArrowUpRightIcon, CheckIcon, ChevronRightIcon, XCircleIcon } from "@heroicons/react/24/solid";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ModelAttestationReport } from "@/api/nearai/client";
import ClipboardIcon from "@/assets/icons/clipboard.svg?react";
import NearAICloudLogo from "@/assets/images/near-ai-cloud.svg?react";
import IntelLogo from "@/assets/images/intel.svg?react";
import NvidiaLogo from "@/assets/images/nvidia.svg?react";
import Spinner from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { copyToClipboard } from "@/lib/index";
import { useChatStore } from "@/stores/useChatStore";
import { useGatewayAttestationStore } from "@/stores/useGatewayAttestationStore";
import { useModelAttestationStore } from "@/stores/useModelAttestationStore";
import type { VerificationStatus } from "../types";

interface ModelVerifierProps {
  model: string;
  selectedModels?: string[];
  show: boolean;
  autoVerify?: boolean;
  onClose: () => void;
  onStatusUpdate?: (status: VerificationStatus) => void;
}

interface ExpandedSections {
  gpu: boolean;
  tdx: boolean;
  gatewayTdx: boolean;
}

interface CheckedMap {
  [key: string]: boolean;
}

const ModelVerifier: React.FC<ModelVerifierProps> = ({ model, selectedModels, show, autoVerify = false, onClose, onStatusUpdate }) => {
  const { t } = useTranslation("translation", { useSuspense: false });

  const { models } = useChatStore();
  const { gatewayAttestation: cachedGatewayAttestation, setGatewayAttestation } = useGatewayAttestationStore();
  const { attestations: cachedAttestations, fetchModelAttestation } = useModelAttestationStore();
  
  // Use selectedModels if provided, otherwise fall back to single model
  const availableModels = selectedModels && selectedModels.length > 0 ? selectedModels : [model];
  const [selectedModelId, setSelectedModelId] = useState<string>(model);
  const currentModel = selectedModelId;
  const modelInfo = models.find((m) => m.modelId === currentModel);
  const modelIcon = modelInfo?.metadata?.modelIcon;
  const isCurrentModelVerifiable = modelInfo?.metadata?.verifiable ?? false;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attestationData, setAttestationData] = useState<ModelAttestationReport | null>(null);
  // biome-ignore lint/suspicious/noExplicitAny: explanation
  const [modelNvidiaPayload, setModelNvidiaPayload] = useState<any | null>(null);
  const [modelIntelQuote, setModelIntelQuote] = useState<string | null>(null);
  const [gatewayIntelQuote, setGatewayIntelQuote] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    gpu: false,
    tdx: false,
    gatewayTdx: false,
  });
  const [checkedMap, setCheckedMap] = useState<CheckedMap>({});
  const hasFetchedRef = useRef(false);
  const prevShowRef = useRef(show);
  const fetchedModelRef = useRef<string | null>(null);
  const prevModelRef = useRef<string | null>(null);
  const [activeVerificationTab, setActiveVerificationTab] = useState<'model' | 'gateway'>("model");
  const activeTabRef = useRef<'model' | 'gateway'>("model");
  const [modelIsVerifiable, setModelIsVerifiable] = useState<boolean>(false);

  const loadAttestationData = useCallback((data: ModelAttestationReport, modelId: string) => {
    const modelInfo = models.find((m) => m.modelId === modelId);
    const isVerifiable = modelInfo?.metadata.verifiable ?? false;
    setModelIsVerifiable(isVerifiable);
    
    const attestations = data.model_attestations ?? data.all_attestations;
    
    if (attestations && attestations.length > 0) {
      const attestation = attestations[0];
      setModelNvidiaPayload(JSON.parse(attestation.nvidia_payload || "{}"));
      setModelIntelQuote(attestation.intel_quote || null);
      // Only set to model tab if not already on gateway tab (preserve user's tab choice)
      if (activeTabRef.current !== 'gateway') {
        setActiveVerificationTab('model');
        activeTabRef.current = 'model';
      }
    } else {
      if (isVerifiable) {
        setError("No attestation data found for this model");
      }
      setModelNvidiaPayload(null);
      setModelIntelQuote(null);
      // Only set to model tab if not already on gateway tab (preserve user's tab choice)
      if (activeTabRef.current !== 'gateway') {
        setActiveVerificationTab('model');
        activeTabRef.current = 'model';
      }
    }
    setGatewayIntelQuote(data.cloud_api_gateway_attestation?.intel_quote || null);
    setAttestationData(data);
    fetchedModelRef.current = modelId;
    // Update global store with gateway attestation so MessageVerifier can reuse it
    if (data.cloud_api_gateway_attestation) {
      setGatewayAttestation(data.cloud_api_gateway_attestation);
    }
  }, [models, setGatewayAttestation]);

  const fetchAttestationReport = useCallback(async (forceRefresh: boolean = false) => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);

    if (!currentModel || !token) return;

    const modelInfo = models.find((m) => m.modelId === currentModel);
    const isVerifiable = modelInfo?.metadata.verifiable ?? false;
    
    setLoading(true);
    setError(null);

    try {
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedData = cachedAttestations[currentModel];
        if (cachedData) {
          loadAttestationData(cachedData, currentModel);
          setLoading(false);
          return;
        }
      }

      // Fetch from API and cache (with forceRefresh flag to bypass store cache)
      const data = await fetchModelAttestation(currentModel, isVerifiable, forceRefresh);
      if (data) {
        loadAttestationData(data, currentModel);
      } else {
        // Only set error for verifiable models - non-verifiable models don't have attestation data
        if (isVerifiable) {
          setError("Failed to fetch attestation report");
        } else {
          // For non-verifiable models, just load gateway attestation if available from cache
          if (cachedGatewayAttestation?.intel_quote) {
            setGatewayIntelQuote(cachedGatewayAttestation.intel_quote);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching attestation report:", err);
      // Only set error for verifiable models - non-verifiable models don't need attestation
      if (isVerifiable) {
        setError(err instanceof Error ? err.message : "Failed to fetch attestation report");
      }
    } finally {
      setLoading(false);
    }
  }, [currentModel, models, cachedAttestations, fetchModelAttestation, loadAttestationData, cachedGatewayAttestation]);

  const verifyAgain = async () => {
    hasFetchedRef.current = false;
    await fetchAttestationReport(true); // Force refresh, bypass cache
    setCheckedMap({});
  };

  const handleClose = () => {
    onClose();
    setExpandedSections({ gpu: false, tdx: false, gatewayTdx: false });
    setCheckedMap({});
  };

  const toggleSection = (section: "gpu" | "tdx" | "gatewayTdx") => {
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

  const renderGPUSection = () => {
    if (!attestationData || !modelNvidiaPayload) return null;
    return (
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

            <div>
              <label className="font-normal text-xs leading-[160%] opacity-60">{t("Nonce")}:</label>
              <div className="relative">
                <textarea
                  readOnly
                  className="h-16 w-full resize-none rounded-lg border border-border pt-1.5 pr-8 pb-3 pl-3 font-normal text-sm leading-[140%] opacity-80"
                  value={modelNvidiaPayload?.nonce || ""}
                />
                <button
                  onClick={() => {
                    handleCopy(modelNvidiaPayload.nonce, "nonce");
                  }}
                  className="absolute top-2 right-2 p-1 text-muted-foreground transition-colors hover:text-foreground"
                  title="Copy nonce"
                >
                  {checkedMap.nonce ? <CheckIcon className="size-4" /> : <ClipboardIcon className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="font-normal text-xs leading-[160%] opacity-60">{t("Evidence List")}:</label>
              <div className="relative">
                <textarea
                  readOnly
                  className="h-32 w-full resize-none rounded-lg border border-border pt-1.5 pr-8 pb-3 pl-3 font-normal text-sm leading-[140%] opacity-80"
                  value={JSON.stringify(modelNvidiaPayload?.evidence_list || [], null, 2)}
                />
                <button
                  onClick={() => {
                    if (!modelNvidiaPayload) return;
                    handleCopy(JSON.stringify(modelNvidiaPayload?.evidence_list || [], null, 2), "evidence_list");
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

            <div>
              <label className="font-normal text-xs leading-[160%] opacity-60">{t("Architecture")}:</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={modelNvidiaPayload?.arch || ""}
                  className="w-full rounded-lg border border-border pt-1.5 pr-8 pb-3 pl-3 font-normal text-sm leading-[140%] opacity-80"
                />
                <button
                  onClick={() => {
                    if (!modelNvidiaPayload) return;
                    handleCopy(modelNvidiaPayload.arch, "arch");
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
    );
  }

  const renderTDXSectionItem = (quote: string | null, key: string = "intelQuote") => {
    if (!quote) return null;
    return (
      <div>
        <label className="font-normal text-xs leading-[160%] opacity-60">{t("Quote")}:</label>
        <div className="relative w-full">
          <textarea
            readOnly
            className="h-32 w-full resize-none rounded-lg border border-border pt-1.5 pr-8 pb-3 pl-3 font-normal text-sm leading-[140%] opacity-80"
            value={quote}
          />
          <button
            onClick={() => {
              handleCopy(quote, key);
            }}
            className="absolute top-2 right-2 p-1 text-muted-foreground transition-colors hover:text-foreground"
            title="Copy quote"
          >
            {checkedMap[key] ? (
              <CheckIcon className="size-4" />
            ) : (
              <ClipboardIcon className="size-4" />
            )}
          </button>
        </div>
      </div>
    );
  }

  const renderTDXSection = () => {
    if (!attestationData) return null;
    if (!modelIntelQuote) return null;
  
    return (
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
            {renderTDXSectionItem(modelIntelQuote, "intelQuote")}
          </>
        )}
      </div>
    );
  }

  const renderGatewayTDXSection = () => {
    // Use gatewayIntelQuote from state, or fall back to cached gateway attestation
    const quoteToUse = gatewayIntelQuote || cachedGatewayAttestation?.intel_quote;
    if (!quoteToUse) return null;
  
    return (
      <div className="flex flex-col gap-6 rounded-xl bg-secondary/10 px-3 py-3.5">
        <button onClick={() => toggleSection("gatewayTdx")} className="flex w-full items-center gap-1">
          <ChevronRightIcon
            className={cn("size-4 transition-transform", {
              "rotate-90": expandedSections.gatewayTdx,
            })}
          />
          <span className="flex-1 text-left font-medium leading-[normal]">{t("TDX Attestation")}</span>
          <IntelLogo className="h-5" />
        </button>
        {expandedSections.gatewayTdx && (
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
            {renderTDXSectionItem(quoteToUse, "gatewayIntelQuote")}
          </>
        )}
      </div>
    );
  }

  useEffect(() => {
    if (autoVerify && onStatusUpdate) {
      onStatusUpdate(verificationStatus);
    }
  }, [autoVerify, onStatusUpdate, verificationStatus]);

  useEffect(() => {
    activeTabRef.current = activeVerificationTab;
  }, [activeVerificationTab]);

  // Update selected model when prop changes (only when dialog first opens, not when user selects)
  useEffect(() => {
    const isOpening = show && !prevShowRef.current;
    if (isOpening && model) {
      setSelectedModelId(model);
      prevModelRef.current = null; // Reset so fetch will trigger
      // Restore gateway attestation from cache if available (gateway is same for all models)
      if (cachedGatewayAttestation?.intel_quote) {
        setGatewayIntelQuote(cachedGatewayAttestation.intel_quote);
      }
    }
  }, [model, show, cachedGatewayAttestation]);

  // Handle model selection change from dropdown
  const handleModelChange = useCallback((newModelId: string) => {
    if (newModelId !== selectedModelId) {
      setSelectedModelId(newModelId);
    }
  }, [selectedModelId]);

  useEffect(() => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    const isOpening = show && !prevShowRef.current;

    if (token) {
      // Check if both attestations already exist and are for the current model
      const hasModelAttestations = attestationData && (modelNvidiaPayload || modelIntelQuote);
      const hasGatewayAttestations = attestationData && gatewayIntelQuote;
      const isForCurrentModel = fetchedModelRef.current === currentModel;
      const bothAttestationsExist = hasModelAttestations && hasGatewayAttestations && isForCurrentModel;

      if (isOpening || (autoVerify && !hasFetchedRef.current)) {
        hasFetchedRef.current = true;
        // Skip fetch if both attestations already exist for the current model
        if (!bothAttestationsExist) {
          fetchAttestationReport();
        }
      }
    }
    
    prevShowRef.current = show;
  }, [show, autoVerify, fetchAttestationReport, currentModel, attestationData, modelNvidiaPayload, modelIntelQuote, gatewayIntelQuote]);

  // Handle model selection change and trigger fetch
  useEffect(() => {
    if (show && currentModel && currentModel !== prevModelRef.current) {
      prevModelRef.current = currentModel;
      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
      if (token) {
        hasFetchedRef.current = true;
        // Reset state when model changes (but preserve gateway attestation)
        setAttestationData(null);
        setModelNvidiaPayload(null);
        setModelIntelQuote(null);
        setError(null);
        // Restore gateway attestation from cache if available (gateway is same for all models)
        if (cachedGatewayAttestation?.intel_quote) {
          setGatewayIntelQuote(cachedGatewayAttestation.intel_quote);
        }
        // Trigger fetch for the new model
        fetchAttestationReport();
      }
    }
  }, [currentModel, show, fetchAttestationReport, cachedGatewayAttestation]);

  // Gateway attestation is the same for all models, so check both current data and cached store
  const hasGatewayAttestations = (attestationData && gatewayIntelQuote) || cachedGatewayAttestation;
  const showModelTab = true; // Always show model tab
  const modelIsAnonymized = !modelIsVerifiable;

  return (
    <Dialog open={show} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-[540px] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogDescription className="sr-only" />
        </DialogHeader>

        <div className="-mt-4 flex flex-col gap-8">
          {/* Tab Navigation - in same row as close button */}
          {(showModelTab || hasGatewayAttestations) && (
            <div className="-mx-4 flex border-border border-b px-4 pt-4 pr-12">
              {showModelTab && (
                <button
                  className={cn(
                    "px-4 py-2 font-medium text-base transition-colors",
                    activeVerificationTab === "model"
                      ? "border-primary border-b-2 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => {
                    setActiveVerificationTab("model");
                    activeTabRef.current = "model";
                  }}
                >
                  {t("Model Verification")}
                </button>
              )}
              {hasGatewayAttestations && (
                <button
                  className={cn(
                    "px-4 py-2 font-medium text-base transition-colors",
                    activeVerificationTab === "gateway"
                      ? "border-primary border-b-2 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => {
                    setActiveVerificationTab("gateway");
                    activeTabRef.current = "gateway";
                  }}
                >
                  {t("Gateway Verification")}
                </button>
              )}
            </div>
          )}

          {/* Model Verification Tab Content */}
          {activeVerificationTab === "model" ? (
            <>
              {/* Model Tag/Selector - merged into single element */}
              {availableModels.length > 1 ? (
                <div className="flex flex-col gap-2">
                  <p className="font-normal text-xs leading-[160%] opacity-60">
                    {isCurrentModelVerifiable ? t("Private Model") : t("Anonymized Model")}
                  </p>
                  <Select value={selectedModelId} onValueChange={handleModelChange}>
                    <SelectTrigger className="h-auto w-auto max-w-[400px] border-none bg-transparent px-0 py-1 text-base hover:bg-transparent focus:bg-transparent focus:ring-0 data-[state=open]:bg-transparent [&>span:first-child]:hidden">
                      <SelectValue>{currentModel}</SelectValue>
                      <div className="flex min-w-0 flex-1 items-center gap-1">
                        {modelIcon && <img src={modelIcon} alt="Model" className="size-5 shrink-0" />}
                        <span className="flex-1 truncate text-left text-base leading-[normal]">{currentModel}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((modelId) => {
                        const mInfo = models.find((m) => m.modelId === modelId);
                        const isVerifiable = mInfo?.metadata?.verifiable ?? false;
                        return (
                          <SelectItem key={modelId} value={modelId}>
                            <div className="flex items-center gap-2">
                              {mInfo?.metadata?.modelIcon && (
                                <img src={mInfo.metadata.modelIcon} alt="Model" className="size-4" />
                              )}
                              <span>{modelId}</span>
                              {isVerifiable && (
                                <span className="rounded bg-green-dark/10 px-1 py-0.5 text-[10px] text-green-dark leading-tight">
                                  {t("Private")}
                                </span>
                              )}
                              {!isVerifiable && (
                                <span className="rounded bg-blue-500/10 px-1 py-0.5 text-[10px] text-blue-600 leading-tight">
                                  {t("Anonymized")}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="font-normal text-xs leading-[160%] opacity-60">
                    {isCurrentModelVerifiable ? t("Private Model") : t("Anonymized Model")}
                  </p>
                  <div className="flex items-center gap-1">
                    {modelIcon && <img src={modelIcon} alt="Model" className="size-5" />}
                    <p className="leading-[normal]">{currentModel}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="font-normal text-xs leading-[160%] opacity-60">{t("Private Gateway")}</p>
              <div className="flex items-center gap-1">
                <NearAICloudLogo className="h-6" />
                <p className="leading-[normal]">NEAR AI Cloud Gateway</p>
              </div>
            </div>
          )}

          {/* Model Verification/Anonymization Tab Content */}
          {activeVerificationTab === "model" && (
            <>
              {isCurrentModelVerifiable ? (
                <>
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

                  {!loading && !error && !attestationData && (
                    <div className="flex items-center justify-center py-8">
                      <Spinner className="size-5" />
                      <span className="ml-3 text-sm">{t("Verifying attestation...")}</span>
                    </div>
                  )}

                  {attestationData && (
                    <div className="space-y-4">
                      {renderGPUSection()}
                      {renderTDXSection()}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="font-normal text-sm leading-[140%] opacity-80">
                    The inference requests of the model are anonymized for all the users and cannot be traced back to any individual identity.
                    Your conversations are stored privately in TEE (Trusted Execution Environment) and not accessible by anyone. See Gateway Verification for more details.
                  </p>
                </>
              )}
            </>
          )}

          {/* Gateway Verification Tab Content */}
          {activeVerificationTab === "gateway" && (
            <>
              <p className="font-normal text-sm leading-[140%] opacity-80">
                The hardware attestations below confirm the authenticity of the NEAR AI Cloud private LLM gateway environment where your conversations are privately and securely stored.
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

              {(attestationData || cachedGatewayAttestation) && (
                <div className="space-y-4">
                  {renderGatewayTDXSection()}
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-4">
            {attestationData && (!modelIsAnonymized || activeVerificationTab === "gateway") && (
              <Button onClick={verifyAgain} disabled={loading} variant="secondary">
                <ArrowPathIcon className="size-5" />
                <span>{t("Verify Again")}</span>
              </Button>
            )}
            <Button onClick={handleClose} className="flex-1">
              {t("Close")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModelVerifier;
