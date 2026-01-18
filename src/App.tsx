import { Suspense, useCallback, useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import AdminProtectedRoute from "@/components/AdminProtectRoute";
import LoadingScreen from "@/components/common/LoadingScreen";
import AdminLayout from "@/components/layout/AdminLayot";
import Layout from "@/components/layout/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import AuthPage from "@/pages/AuthPage";
import AdminPage from "@/pages/admin";
import AdminAuditLogsPage from "@/pages/admin/AuditLogs";
import AdminOrganizationPage from "@/pages/admin/Organization";
import AdminRolesPage from "@/pages/admin/Roles";
import AdminSamlPage from "@/pages/admin/Saml";
import AdminSettingsPage from "@/pages/admin/Settings";
import AdminWorkspacesPage from "@/pages/admin/Workspaces";
import { APP_ROUTES } from "@/pages/routes";
import WelcomePage from "@/pages/WelcomePage";
import { useModels } from "./api/models/queries";
import { useUserData } from "./api/users/queries/useUserData";
import { posthogPageView, posthogReset } from "./lib/posthog";
import ChatController from "./pages/ChatController";
import { useUserStore } from "./stores/useUserStore";
import { LOCAL_STORAGE_KEYS } from "./lib/constants";
import { eventEmitter } from "./lib/event";
import useInitRemoteSettings from "./hooks/useInitRemoteSettings";
import { useRemoteConfig } from "./api/config/queries/useRemoteConfig";
import { offlineCache } from "./lib/offlineCache";
import { useIsOnline } from "./hooks/useIsOnline";
import { useEnterpriseInit } from "./hooks/useEnterpriseInit";
import { usePermissionsStore } from "./stores/usePermissionsStore";
import { useOrganizationStore } from "./stores/useOrganizationStore";
import { useWorkspaceStore } from "./stores/useWorkspaceStore";

function App() {
  const { isInitialized, isLoading: isAppLoading } = useAppInitialization();
  const location = useLocation();
  const { setUser } = useUserStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasAuthToken = typeof window !== "undefined" && Boolean(localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN));
  const isOnline = useIsOnline();
  const canFetchAuthenticatedData = hasAuthToken && isOnline;
  const { isSettingsLoading } = useInitRemoteSettings(canFetchAuthenticatedData);

  const {
    isFetching: isRemoteConfigFetching,
    data: remoteConfig,
  } = useRemoteConfig({ enabled: canFetchAuthenticatedData });
  const { isFetching: isModelsFetching } = useModels({
    enabled: canFetchAuthenticatedData && !!remoteConfig?.default_model && !isRemoteConfigFetching,
    defaultModel: remoteConfig?.default_model,
  });
  const { isFetching: isUserDataFetching } = useUserData({ enabled: canFetchAuthenticatedData });

  // Initialize enterprise data (permissions, organization, workspace)
  const { isLoading: isEnterpriseLoading } = useEnterpriseInit(canFetchAuthenticatedData);

  // Enterprise store setters for logout
  const { setPermissions, setRoles } = usePermissionsStore();
  const { setCurrentOrganization, setOrganizations } = useOrganizationStore();
  const { setCurrentWorkspace, setWorkspaces } = useWorkspaceStore();

  const shouldFetchData = canFetchAuthenticatedData;
  const isDataLoading = shouldFetchData ? isModelsFetching || isUserDataFetching || isRemoteConfigFetching || isEnterpriseLoading : false;
  const isLoading = isAppLoading || isSettingsLoading || isDataLoading;

  useEffect(() => {
    posthogPageView(location.pathname);
  }, [location.pathname]);

  const handleLogout = useCallback(() => {
    setUser(null);
    posthogReset();
    localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION);
    offlineCache.clearAll();
    queryClient.clear();

    // Clear enterprise stores
    setPermissions([]);
    setRoles([]);
    setCurrentOrganization(null);
    setOrganizations([]);
    setCurrentWorkspace(null);
    setWorkspaces([]);

    navigate(APP_ROUTES.AUTH, { replace: true });
  }, [
    navigate,
    setUser,
    queryClient,
    setPermissions,
    setRoles,
    setCurrentOrganization,
    setOrganizations,
    setCurrentWorkspace,
    setWorkspaces,
  ]);

  useEffect(() => {
    eventEmitter.on('logout', handleLogout);
    return () => eventEmitter.off('logout', handleLogout);
  }, [handleLogout]);

  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <div className="relative h-screen">
        <Toaster />
        <Routes>
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ChatController />} />
            <Route path="c/:chatId" element={<ChatController />} />

            <Route
              element={
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              }
            >
              <Route path={APP_ROUTES.ADMIN} element={<AdminPage />} />
              {/* <Route
                path={APP_ROUTES.ADMIN_USERS}
                element={<AdminUsersPage />}
              /> */}
              <Route path={APP_ROUTES.ADMIN_SETTINGS} element={<AdminSettingsPage />} />
              <Route path={APP_ROUTES.ADMIN_ORGANIZATION} element={<AdminOrganizationPage />} />
              <Route path={APP_ROUTES.ADMIN_WORKSPACES} element={<AdminWorkspacesPage />} />
              <Route path={APP_ROUTES.ADMIN_ROLES} element={<AdminRolesPage />} />
              <Route path={APP_ROUTES.ADMIN_SAML} element={<AdminSamlPage />} />
              <Route path={APP_ROUTES.ADMIN_AUDIT_LOGS} element={<AdminAuditLogsPage />} />
              {/* <Route path={APP_ROUTES.PLAYGROUND} element={<Playground />} /> */}
            </Route>
          </Route>

          <Route path={APP_ROUTES.WELCOME} element={<WelcomePage />} />
          <Route path={APP_ROUTES.AUTH} element={<AuthPage />} />
        </Routes>
      </div>
    </Suspense>
  );
}

export default App;
