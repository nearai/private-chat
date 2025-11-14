import type { ModelsPage } from "openai/resources/models.mjs";
import { ApiClient } from "@/api/base-client";
import type { Model } from "@/types";

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

  async getModels(): Promise<Model[]> {
    const response = await this.get<ModelsPage>("/models", {
      apiVersion: "v2",
    });
    return response.data as unknown as Model[];
  }
}

export const modelsClient = new ModelsClient();
