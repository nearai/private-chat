import { useEffect, useState } from "react";
import { rolesClient } from "@/api/roles/client";
import { organizationClient } from "@/api/organization/client";
import { workspaceClient } from "@/api/workspace/client";
import { usePermissionsStore } from "@/stores/usePermissionsStore";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

/**
 * Hook to initialize enterprise data on app startup.
 * Loads:
 * - User permissions and roles
 * - User's organization(s)
 * - User's workspace(s)
 */
export function useEnterpriseInit(enabled: boolean) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setPermissions, setRoles } = usePermissionsStore();
  const { setOrganizations, setCurrentOrganization, currentOrganization } =
    useOrganizationStore();
  const { setWorkspaces, setCurrentWorkspace, currentWorkspace } =
    useWorkspaceStore();

  useEffect(() => {
    if (!enabled || isInitialized || isLoading) return;

    const initializeEnterprise = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load permissions, roles, orgs, and workspaces in parallel
        const [permissionsResult, rolesResult, orgsResult, workspacesResult] =
          await Promise.allSettled([
            rolesClient.getMyPermissions(),
            rolesClient.getMyRoles(),
            organizationClient.listOrganizations(),
            workspaceClient.listWorkspaces(),
          ]);

        // Set permissions
        if (permissionsResult.status === "fulfilled") {
          setPermissions(permissionsResult.value);
        } else {
          console.error(
            "Failed to load permissions:",
            permissionsResult.reason
          );
          // Set empty permissions on failure - this will cause PermissionGate to show fallbacks
          setPermissions([]);
        }

        // Set roles
        if (rolesResult.status === "fulfilled") {
          setRoles(rolesResult.value);
        }

        // Set organizations
        if (orgsResult.status === "fulfilled") {
          const orgs = orgsResult.value.organizations;
          setOrganizations(orgs);

          // Set current organization if not already set
          if (!currentOrganization && orgs.length > 0) {
            // Try to find a default org, or use the first one
            const defaultOrg =
              orgs.find((org) => org.settings?.personal !== true) || orgs[0];
            setCurrentOrganization(defaultOrg);
          }
        }

        // Set workspaces
        if (workspacesResult.status === "fulfilled") {
          const workspaces = workspacesResult.value.workspaces;
          setWorkspaces(workspaces);

          // Set current workspace if not already set
          if (!currentWorkspace && workspaces.length > 0) {
            // Try to find the default workspace, or use the first one
            const defaultWorkspace =
              workspaces.find((ws) => ws.is_default) || workspaces[0];
            setCurrentWorkspace(defaultWorkspace);
          }
        }

        setIsInitialized(true);
      } catch (err) {
        console.error("Failed to initialize enterprise data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to initialize"
        );
        // Still mark as initialized to avoid infinite retries
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeEnterprise();
  }, [
    enabled,
    isInitialized,
    isLoading,
    setPermissions,
    setRoles,
    setOrganizations,
    setCurrentOrganization,
    currentOrganization,
    setWorkspaces,
    setCurrentWorkspace,
    currentWorkspace,
  ]);

  return {
    isLoading,
    isInitialized,
    error,
  };
}

export default useEnterpriseInit;
