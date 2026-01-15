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
import AdminSettingsPage from "@/pages/admin/Settings";
import { APP_ROUTES } from "@/pages/routes";
import WelcomePage from "@/pages/WelcomePage";
import { useModels } from "./api/models/queries";
import { useUserData } from "./api/users/queries/useUserData";
import { posthogPageView, posthogReset } from "./lib/posthog";
import ChatController from "./pages/ChatController";
import ConversationWrapper from "./pages/ConversationWrapper";
import SharedPage from "./pages/SharedPage";
import { useUserStore } from "./stores/useUserStore";
import { LOCAL_STORAGE_KEYS } from "./lib/constants";
import { eventEmitter } from "./lib/event";
import useInitRemoteSettings from "./hooks/useInitRemoteSettings";
import { useRemoteConfig } from "./api/config/queries/useRemoteConfig";
import { offlineCache } from "./lib/offlineCache";
import { useIsOnline } from "./hooks/useIsOnline";

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

  const shouldFetchData = canFetchAuthenticatedData;
  const isDataLoading = shouldFetchData ? isModelsFetching || isUserDataFetching || isRemoteConfigFetching : false;
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
    navigate(APP_ROUTES.AUTH, { replace: true });
  }, [navigate, setUser, queryClient]);

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
          {/* Protected routes - require authentication */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ChatController />} />
            <Route path={APP_ROUTES.SHARED} element={<SharedPage />} />

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
              {/* <Route path={APP_ROUTES.PLAYGROUND} element={<Playground />} /> */}
            </Route>
          </Route>

          {/* Conversation route - accessible with or without auth */}
          {/* Uses ConversationWrapper to determine authenticated vs public view */}
          <Route path="c/:chatId" element={<ConversationWrapper />} />

          <Route path={APP_ROUTES.WELCOME} element={<WelcomePage />} />
          <Route path={APP_ROUTES.AUTH} element={<AuthPage />} />
        </Routes>
      </div>
    </Suspense>
  );
}

export default App;
