import type { Settings, User, UserRole } from "@/types";
import { ApiClient } from "../base-client";

class UsersClient extends ApiClient {
  constructor() {
    super({
      apiPrefix: "/api/v1",
      defaultHeaders: {
        Accept: "application/json",
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

  //TODO: is correct type?
  async getUserSettings(): Promise<Settings> {
    return this.get<Settings>("/users/user/setting");
  }

  async updateUserSettings(settings: Settings): Promise<void> {
    return this.post<void>("/users/user/setting", settings);
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
