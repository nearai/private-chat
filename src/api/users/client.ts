import type { UpdateUserSettingsRequest, User, UserRole, UserSettingsResponse } from "@/types";
import { ApiClient } from "../base-client";

class UsersClient extends ApiClient {
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

  //TODO: add type
  async getUserGroups(): Promise<unknown[]> {
    return this.get<unknown[]>("/users/groups");
  }

  //TODO: add type
  async getUserDefaultPermissions(): Promise<unknown> {
    return this.get<unknown>("/users/default/permissions");
  }

  //TODO: add type
  async updateUserDefaultPermissions(permissions: unknown): Promise<void> {
    return this.post<void>("/users/default/permissions", permissions);
  }

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    return this.post<User>("/users/update/role", { id, role });
  }

  async getUsers(): Promise<User[]> {
    return this.get<User[]>("/users/");
  }

  async getUserSettings(): Promise<UserSettingsResponse> {
    return this.get<UserSettingsResponse>("/users/me/settings", { apiVersion: "v2" });
  }

  async updateUserSettings(settings: UpdateUserSettingsRequest): Promise<UserSettingsResponse> {
    return this.post<UserSettingsResponse>("/users/me/settings", settings, { apiVersion: "v2" });
  }

  async getUserById(id: string): Promise<User> {
    return this.get<User>(`/users/${id}`);
  }

  async getUserData(): Promise<User> {
    return this.get<User>("/users/me", { apiVersion: "v2" });
  }

  async updateUserInfo(info: unknown): Promise<void> {
    return this.post<void>("users/user/info/update", info);
  }

  //TODO: is needed?
  //   async getAndUpdateUserLocation() => {}

  async deleteUserById(id: string): Promise<void> {
    return this.delete<void>(`/users/${id}`);
  }
}

export const usersClient = new UsersClient();
