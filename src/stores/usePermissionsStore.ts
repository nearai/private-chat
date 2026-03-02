import { create } from "zustand";
import type { PermissionsStore, Role } from "../types/enterprise";

export const usePermissionsStore = create<PermissionsStore>()((set, get) => ({
  permissions: [],
  roles: [],
  isLoading: false,
  error: null,

  setPermissions: (permissions: string[]) =>
    set({ permissions, error: null }),

  setRoles: (roles: Role[]) => set({ roles, error: null }),

  hasPermission: (permission: string) => {
    const { permissions } = get();
    return permissions.includes(permission);
  },

  hasAnyPermission: (requiredPermissions: string[]) => {
    const { permissions } = get();
    return requiredPermissions.some((p) => permissions.includes(p));
  },

  hasAllPermissions: (requiredPermissions: string[]) => {
    const { permissions } = get();
    return requiredPermissions.every((p) => permissions.includes(p));
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setError: (error: string | null) => set({ error, isLoading: false }),
}));

// Convenience permission check hooks
export const useHasPermission = (permission: string): boolean => {
  return usePermissionsStore((state) => state.permissions.includes(permission));
};

export const useHasAnyPermission = (permissions: string[]): boolean => {
  return usePermissionsStore((state) =>
    permissions.some((p) => state.permissions.includes(p))
  );
};

export const useHasAllPermissions = (permissions: string[]): boolean => {
  return usePermissionsStore((state) =>
    permissions.every((p) => state.permissions.includes(p))
  );
};

// Common permission checks
export const useCanManageOrg = (): boolean => {
  return useHasAnyPermission([
    "organizations:update:own",
    "organizations:manage:members",
    "settings:update:org",
  ]);
};

export const useCanManageWorkspaces = (): boolean => {
  return useHasAnyPermission([
    "workspaces:create",
    "workspaces:update:all",
    "workspaces:delete:all",
    "workspaces:manage:members",
  ]);
};

export const useCanManageRoles = (): boolean => {
  return useHasAnyPermission([
    "roles:create",
    "roles:update",
    "roles:delete",
    "users:update:roles",
  ]);
};

export const useCanViewAuditLogs = (): boolean => {
  return useHasPermission("audit:read");
};

export const useCanExportAuditLogs = (): boolean => {
  return useHasPermission("audit:export");
};

export const useCanManageSaml = (): boolean => {
  return useHasAnyPermission(["settings:update:saml", "settings:read:saml"]);
};

export const useCanManageDomains = (): boolean => {
  return useHasAnyPermission([
    "settings:update:domains",
    "settings:read:domains",
  ]);
};
