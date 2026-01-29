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
  fetchModelAttestation: (modelId: string, isVerifiable: boolean) => Promise<ModelAttestationReport | null>;
  setModelAttestation: (modelId: string, attestation: ModelAttestationReport) => void;
}

export const useModelAttestationStore = create<ModelAttestationState>()((set, get) => ({
  attestations: {},
  isLoading: {},
  fetchModelAttestation: async (modelId: string, isVerifiable: boolean) => {
    // Return cached attestation if available
    const { attestations } = get();
    if (attestations[modelId]) {
      return attestations[modelId];
    }

    // Check if already loading to prevent duplicate requests
    const { isLoading } = get();
    if (isLoading[modelId]) {
      // Wait for the ongoing request to complete
      return new Promise<ModelAttestationReport | null>((resolve) => {
        const checkInterval = setInterval(() => {
          const currentState = get();
          if (!currentState.isLoading[modelId] && currentState.attestations[modelId]) {
            clearInterval(checkInterval);
            resolve(currentState.attestations[modelId]);
          } else if (!currentState.isLoading[modelId]) {
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
      isLoading: { ...state.isLoading, [modelId]: true },
    }));

    try {
      const data = await nearAIClient.getModelAttestationReport(isVerifiable ? modelId : '');
      set((state) => ({
        attestations: { ...state.attestations, [modelId]: data },
        isLoading: { ...state.isLoading, [modelId]: false },
      }));
      return data;
    } catch (err) {
      console.error(`Error fetching model attestation for ${modelId}:`, err);
      set((state) => ({
        isLoading: { ...state.isLoading, [modelId]: false },
      }));
      return null;
    }
  },
  setModelAttestation: (modelId: string, attestation: ModelAttestationReport) => {
    set((state) => ({
      attestations: { ...state.attestations, [modelId]: attestation },
      isLoading: { ...state.isLoading, [modelId]: false },
    }));
  },
}));
