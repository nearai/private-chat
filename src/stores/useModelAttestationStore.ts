import { create } from "zustand";
import type { ModelAttestationReport } from "@/api/nearai/client";
import { nearAIClient } from "@/api/nearai/client";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";

interface ModelAttestationCache {
  [modelId: string]: ModelAttestationReport;
}

interface LoadingState {
  [modelId: string]: boolean;
}

interface ModelAttestationState {
  attestations: ModelAttestationCache;
  isLoading: LoadingState;
  fetchModelAttestation: (modelId: string, isVerifiable: boolean, forceRefresh?: boolean) => Promise<ModelAttestationReport | null>;
  setModelAttestation: (modelId: string, attestation: ModelAttestationReport) => void;
}

// Use a consistent cache key for non-verifiable models since they all use the same API call
const ANONYMIZED_MODEL_CACHE_KEY = '__ANONYMIZED_MODEL__';

export const useModelAttestationStore = create<ModelAttestationState>()((set, get) => ({
  attestations: {},
  isLoading: {},
  fetchModelAttestation: async (modelId: string, isVerifiable: boolean, forceRefresh: boolean = false) => {
    // For non-verifiable models, use a consistent cache key since they all share the same API response
    const cacheKey = isVerifiable ? modelId : ANONYMIZED_MODEL_CACHE_KEY;
    
    // Return cached attestation if available (unless forcing refresh)
    if (!forceRefresh) {
      const { attestations } = get();
      if (attestations[cacheKey]) {
        return attestations[cacheKey];
      }
    }

    // Check if already loading to prevent duplicate requests
    const { isLoading } = get();
    if (isLoading[cacheKey]) {
      // Wait for the ongoing request to complete (with timeout to prevent memory leaks)
      return new Promise<ModelAttestationReport | null>((resolve) => {
        const maxWaitTime = 120000; // 120 seconds timeout
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          const currentState = get();
          const elapsedTime = Date.now() - startTime;
          
          // Check timeout to prevent infinite polling
          if (elapsedTime >= maxWaitTime) {
            clearInterval(checkInterval);
            resolve(null);
            return;
          }
          
          if (!currentState.isLoading[cacheKey] && currentState.attestations[cacheKey]) {
            clearInterval(checkInterval);
            resolve(currentState.attestations[cacheKey]);
          } else if (!currentState.isLoading[cacheKey]) {
            clearInterval(checkInterval);
            resolve(null);
          }
        }, 100);
      });
    }

    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    if (!token) {
      return null;
    }

    set((state) => ({
      isLoading: { ...state.isLoading, [cacheKey]: true },
    }));

    try {
      const data = await nearAIClient.getModelAttestationReport(isVerifiable ? modelId : '');
      set((state) => ({
        attestations: { ...state.attestations, [cacheKey]: data },
        isLoading: { ...state.isLoading, [cacheKey]: false },
      }));
      return data;
    } catch (err) {
      console.error(`Error fetching model attestation for ${modelId}:`, err);
      set((state) => ({
        isLoading: { ...state.isLoading, [cacheKey]: false },
      }));
      return null;
    }
  },
  setModelAttestation: (modelId: string, attestation: ModelAttestationReport) => {
    // Note: This function is used to manually set attestation data.
    // Since we don't have access to model metadata here to determine verifiability,
    // we cache by modelId. The fetchModelAttestation function handles the cache key
    // logic correctly for non-verifiable models using ANONYMIZED_MODEL_CACHE_KEY.
    set((state) => ({
      attestations: { ...state.attestations, [modelId]: attestation },
      isLoading: { ...state.isLoading, [modelId]: false },
    }));
  },
}));
