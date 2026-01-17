import type { ReactNode } from "react";
import { usePermissionsStore } from "@/stores/usePermissionsStore";

interface PermissionGateProps {
  /** Single permission required */
  permission?: string;
  /** Any of these permissions required */
  anyOf?: string[];
  /** All of these permissions required */
  allOf?: string[];
  /** Content to show when authorized */
  children: ReactNode;
  /** Content to show when not authorized (optional) */
  fallback?: ReactNode;
}

/**
 * PermissionGate - Conditionally renders children based on user permissions
 *
 * Usage:
 * <PermissionGate permission="audit:read">
 *   <AuditLogTable />
 * </PermissionGate>
 *
 * <PermissionGate anyOf={["roles:manage", "roles:assign"]}>
 *   <RoleManagement />
 * </PermissionGate>
 *
 * <PermissionGate allOf={["workspaces:read", "workspaces:manage"]}>
 *   <WorkspaceAdmin />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    usePermissionsStore();

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Check any of permissions
  if (anyOf && anyOf.length > 0 && !hasAnyPermission(anyOf)) {
    return <>{fallback}</>;
  }

  // Check all permissions
  if (allOf && allOf.length > 0 && !hasAllPermissions(allOf)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook version for programmatic permission checking
 */
export function usePermissionCheck(
  permission?: string,
  anyOf?: string[],
  allOf?: string[]
): boolean {
  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    usePermissionsStore();

  if (permission && !hasPermission(permission)) {
    return false;
  }

  if (anyOf && anyOf.length > 0 && !hasAnyPermission(anyOf)) {
    return false;
  }

  if (allOf && allOf.length > 0 && !hasAllPermissions(allOf)) {
    return false;
  }

  return true;
}

export default PermissionGate;
