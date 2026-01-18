import { Navigate } from "react-router";
import { APP_ROUTES } from "@/pages/routes";
import { useUserStore } from "@/stores/useUserStore";
import { usePermissionsStore } from "@/stores/usePermissionsStore";

const AdminProtectedRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  const user = useUserStore((state) => state.user);
  const { hasAnyPermission, permissions } = usePermissionsStore();

  // Check if user has any admin-level permissions
  // This includes organization management, workspace management, role management, etc.
  const hasAdminAccess = hasAnyPermission([
    "admin:access",
    "organizations:manage",
    "organizations:admin",
    "workspaces:manage",
    "roles:manage",
    "audit:read",
    "saml:manage",
    "domains:manage",
    "settings:manage",
  ]);

  // Fallback to legacy role check if no permissions are loaded yet
  // (supports backward compatibility during migration)
  const isLegacyAdmin = user?.role === "admin";

  // Allow access if user has admin permissions OR legacy admin role
  const canAccessAdmin = hasAdminAccess || (permissions.length === 0 && isLegacyAdmin);

  if (!canAccessAdmin) {
    return <Navigate to={APP_ROUTES.HOME} replace />;
  }

  return children;
};

export default AdminProtectedRoute;
