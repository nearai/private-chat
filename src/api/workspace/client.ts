import type {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  Workspace,
  WorkspaceMember,
} from "@/types/enterprise";
import { ApiClient } from "../base-client";

interface WorkspaceListResponse {
  workspaces: Workspace[];
  limit: number;
  offset: number;
  total: number;
}

interface MemberListResponse {
  members: WorkspaceMember[];
  limit: number;
  offset: number;
  total: number;
}

class WorkspaceClient extends ApiClient {
  constructor() {
    super({
      apiPrefix: "/api/v1",
      defaultHeaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      includeAuth: true,
    });
  }

  // Workspace CRUD
  async listWorkspaces(
    limit = 50,
    offset = 0
  ): Promise<WorkspaceListResponse> {
    return this.get<WorkspaceListResponse>(
      `/workspaces?limit=${limit}&offset=${offset}`
    );
  }

  async getWorkspace(id: string): Promise<Workspace> {
    return this.get<Workspace>(`/workspaces/${id}`);
  }

  async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
    return this.post<Workspace>("/workspaces", data);
  }

  async updateWorkspace(
    id: string,
    data: UpdateWorkspaceRequest
  ): Promise<Workspace> {
    return this.patch<Workspace>(`/workspaces/${id}`, data);
  }

  async deleteWorkspace(id: string): Promise<void> {
    return this.delete<void>(`/workspaces/${id}`);
  }

  // Members
  async listMembers(
    workspaceId: string,
    limit = 50,
    offset = 0
  ): Promise<MemberListResponse> {
    return this.get<MemberListResponse>(
      `/workspaces/${workspaceId}/members?limit=${limit}&offset=${offset}`
    );
  }

  async addMember(
    workspaceId: string,
    userId: string,
    role: string
  ): Promise<void> {
    return this.post<void>(`/workspaces/${workspaceId}/members`, {
      user_id: userId,
      role,
    });
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: string
  ): Promise<void> {
    return this.patch<void>(`/workspaces/${workspaceId}/members/${userId}`, {
      role,
    });
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    return this.delete<void>(`/workspaces/${workspaceId}/members/${userId}`);
  }
}

export const workspaceClient = new WorkspaceClient();
