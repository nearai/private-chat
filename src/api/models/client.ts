import { ApiClient } from "@/api/base-client";
import type { ModelsResponse, ModelV1 } from "@/types";

class ModelsClient extends ApiClient {
  constructor() {
    super({
      apiPrefix: "/api",
      defaultHeaders: {
        "Content-Type": "application/json",
      },
      includeAuth: true,
    });
  }

  async getModels(): Promise<ModelV1[]> {
    const response = await this.get<ModelsResponse>("/model/list", {
      apiVersion: "v2",
    });
    console.log("response", response);
    return response.models as unknown as ModelV1[];
  }
}

export const modelsClient = new ModelsClient();
