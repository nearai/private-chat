import { DEFAULT_SIGNING_ALGO } from "@/lib/constants";
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

  async getModelAttestationReport(
    model?: string,
    signingAlgorithm: SigningAlgorithm = DEFAULT_SIGNING_ALGO
  ): Promise<ModelAttestationReport> {
    let query = `/attestation/report?signing_algo=${encodeURIComponent(signingAlgorithm)}`;
    if (model) {
      query += `&model=${encodeURIComponent(model)}`
    }
    return this.get<ModelAttestationReport>(query, {
      apiVersion: "v2",
    });
  }

  async getMessageSignature(
    model: string,
    chatCompletionId: string,
    signingAlgorithm: SigningAlgorithm = DEFAULT_SIGNING_ALGO
  ): Promise<MessageSignature> {
    return this.get<MessageSignature>(
      `/signature/${encodeURIComponent(chatCompletionId)}?model=${encodeURIComponent(model)}&signing_algo=${encodeURIComponent(signingAlgorithm)}`,
      {
        apiVersion: "v2",
      }
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

export type GatewayAttestation = {
  intel_quote: string;
  request_nonce: string;
  signing_address?: Address;
}

export type ModelAttestationReport = {
  model_attestations?: Array<ModelAttestation>;
  all_attestations?: Array<ModelAttestation>;
  chat_api_gateway_attestation: GatewayAttestation;
  cloud_api_gateway_attestation: GatewayAttestation;
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
