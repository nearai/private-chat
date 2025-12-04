import { Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
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
import { posthogPageView } from "./lib/posthog";
import ChatController from "./pages/ChatController";

function App() {
  const { isInitialized, isLoading: isAppLoading } = useAppInitialization();
  const location = useLocation();

  const { isFetching: isModelsFetching } = useModels();
  const { isFetching: isUserDataFetching } = useUserData();
  const isLoading = isModelsFetching || isUserDataFetching;

  useEffect(() => {
    posthogPageView();
  }, [location.pathname]);

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
        </Routes>
      </div>
    </Suspense>
  );
}

export default App;
