import type {
  CreateRoleRequest,
  Permission,
  Role,
  UpdateRoleRequest,
} from "@/types/enterprise";
import { ApiClient } from "../base-client";

interface RoleListResponse {
  roles: Role[];
  limit: number;
  offset: number;
  total: number;
}

interface PermissionListResponse {
  permissions: Permission[];
}

class RolesClient extends ApiClient {
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

  // Roles
  async listRoles(limit = 50, offset = 0): Promise<RoleListResponse> {
    return this.get<RoleListResponse>(`/roles?limit=${limit}&offset=${offset}`);
  }

  async getRole(id: string): Promise<Role> {
    return this.get<Role>(`/roles/${id}`);
  }

  async createRole(data: CreateRoleRequest): Promise<Role> {
    return this.post<Role>("/roles", data);
  }

  async updateRole(id: string, data: UpdateRoleRequest): Promise<Role> {
    return this.patch<Role>(`/roles/${id}`, data);
  }

  async deleteRole(id: string): Promise<void> {
    return this.delete<void>(`/roles/${id}`);
  }

  // Permissions
  async listPermissions(): Promise<PermissionListResponse> {
    return this.get<PermissionListResponse>("/permissions");
  }

  async getPermissionsByModule(module: string): Promise<PermissionListResponse> {
    return this.get<PermissionListResponse>(`/permissions?module=${module}`);
  }

  // User role assignments
  async assignRoleToUser(
    userId: string,
    roleId: string,
    scope?: { organizationId?: string; workspaceId?: string }
  ): Promise<void> {
    return this.post<void>(`/users/${userId}/roles`, {
      role_id: roleId,
      organization_id: scope?.organizationId,
      workspace_id: scope?.workspaceId,
    });
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    return this.delete<void>(`/users/${userId}/roles/${roleId}`);
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    return this.get<Role[]>(`/users/${userId}/roles`);
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    return this.get<string[]>(`/users/${userId}/permissions`);
  }

  // Current user permissions
  async getMyPermissions(): Promise<string[]> {
    return this.get<string[]>("/users/me/permissions");
  }

  async getMyRoles(): Promise<Role[]> {
    return this.get<Role[]>("/users/me/roles");
  }
}

export const rolesClient = new RolesClient();
