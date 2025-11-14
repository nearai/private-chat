import { ApiClient } from "../base-client";

class NearAIClient extends ApiClient {
  constructor() {
    super({
      apiPrefix: "/api",
      defaultHeaders: {
        Accept: "application/json",
      },
      includeAuth: true,
    });
  }

  async getModelAttestationReport(model: string): Promise<ModelAttestationReport> {
    return this.get<ModelAttestationReport>(`/attestation/report?model=${encodeURIComponent(model)}`, {
      apiVersion: "v2",
    });
  }

  async getMessageSignature(
    model: string,
    chatCompletionId: string,
    signingAlgorithm: SigningAlgorithm = "ecdsa"
  ): Promise<MessageSignature> {
    return this.get<MessageSignature>(
      `/signature/${encodeURIComponent(chatCompletionId)}?model=${encodeURIComponent(model)}&signing_algo=${encodeURIComponent(signingAlgorithm)}`
    );
  }
}

export const nearAIClient = new NearAIClient();

// Type definitions
export type Address = `0x${string}`;

export type SigningAlgorithm = "ecdsa";

export type ModelAttestation = {
  signing_address: Address;
  nvidia_payload: string;
  intel_quote: string;
};

export type ModelAttestationReport = {
  model_attestations: Array<ModelAttestation>;
  all_attestations?: Array<ModelAttestation>;
};

export type MessageSignature = {
  text: string; // Format: request_body_sha256:response_body_sha256
  signature: string;
  signing_address: Address;
  signing_algo: SigningAlgorithm;
  // params for error message
  message?: string;
  detail?: string;
};
