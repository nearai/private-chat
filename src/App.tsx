import { Suspense, useCallback, useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
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
import CookiePrivacyPage from "@/pages/CookiePrivacyPage";
import PrivacyPage from "@/pages/PrivacyPage";
import { APP_ROUTES } from "@/pages/routes";
import TermsPage from "@/pages/TermsPage";
import WelcomePage from "@/pages/WelcomePage";
import { useModels } from "./api/models/queries";
import { useUserData } from "./api/users/queries/useUserData";
import { posthogPageView, posthogReset } from "./lib/posthog";
import ChatController from "./pages/ChatController";
import { useUserStore } from "./stores/useUserStore";
import { LOCAL_STORAGE_KEYS } from "./lib/constants";
import { eventEmitter } from "./lib/event";

function App() {
  const { isInitialized, isLoading: isAppLoading } = useAppInitialization();
  const location = useLocation();
  const { setUser } = useUserStore();
  const navigate = useNavigate();

  const { isFetching: isModelsFetching } = useModels();
  const { isFetching: isUserDataFetching } = useUserData();
  const isLoading = isModelsFetching || isUserDataFetching;

  useEffect(() => {
    posthogPageView();
  }, [location.pathname]);

  const handleLogout = useCallback(() => {
    setUser(null);
    posthogReset();
    localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION);
    navigate(APP_ROUTES.AUTH, { replace: true });
  }, [navigate, setUser]);

  useEffect(() => {
    eventEmitter.on('logout', handleLogout);
    return () => eventEmitter.off('logout', handleLogout);
  }, [handleLogout]);

  if (!isInitialized || isAppLoading || isLoading) {
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
              {/* <Route path={APP_ROUTES.PLAYGROUND} element={<Playground />} /> */}
            </Route>
          </Route>

          <Route path={APP_ROUTES.WELCOME} element={<WelcomePage />} />
          <Route path={APP_ROUTES.AUTH} element={<AuthPage />} />
          <Route path={APP_ROUTES.TERMS} element={<TermsPage />} />
          <Route path={APP_ROUTES.PRIVACY} element={<PrivacyPage />} />
          <Route path={APP_ROUTES.COOKIE} element={<CookiePrivacyPage />} />
        </Routes>
      </div>
    </Suspense>
  );
}

export default App;
