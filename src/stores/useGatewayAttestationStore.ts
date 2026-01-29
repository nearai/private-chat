import { create } from "zustand";
import type { GatewayAttestation } from "@/api/nearai/client";
import { nearAIClient } from "@/api/nearai/client";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";

interface GatewayAttestationState {
  gatewayAttestation: GatewayAttestation | null;
  isLoading: boolean;
  fetchGatewayAttestation: () => Promise<GatewayAttestation | null>;
  setGatewayAttestation: (attestation: GatewayAttestation) => void;
}

export const useGatewayAttestationStore = create<GatewayAttestationState>()((set, get) => ({
  gatewayAttestation: null,
  isLoading: false,
  fetchGatewayAttestation: async () => {
    // Return cached attestation if available
    const { gatewayAttestation } = get();
    if (gatewayAttestation) {
      return gatewayAttestation;
    }

    // Check if already loading to prevent duplicate requests
    const { isLoading } = get();
    if (isLoading) {
      // Wait for the ongoing request to complete
      return new Promise<GatewayAttestation | null>((resolve) => {
        const checkInterval = setInterval(() => {
          const currentState = get();
          if (!currentState.isLoading && currentState.gatewayAttestation) {
            clearInterval(checkInterval);
            resolve(currentState.gatewayAttestation);
          } else if (!currentState.isLoading) {
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

    set({ isLoading: true });

    try {
      const data = await nearAIClient.getModelAttestationReport('');
      const gatewayAttest = data.cloud_api_gateway_attestation;
      if (gatewayAttest) {
        set({ gatewayAttestation: gatewayAttest, isLoading: false });
        return gatewayAttest;
      }
      set({ isLoading: false });
      return null;
    } catch (err) {
      console.error("Error fetching gateway attestation:", err);
      set({ isLoading: false });
      return null;
    }
  },
  setGatewayAttestation: (attestation: GatewayAttestation) => {
    set({ gatewayAttestation: attestation, isLoading: false });
  },
}));
