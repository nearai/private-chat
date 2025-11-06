import { Suspense, useMemo } from "react";
import { Route, Routes } from "react-router";
import { Toaster } from "sonner";
import AdminProtectedRoute from "@/components/AdminProtectRoute";
import LoadingScreen from "@/components/common/LoadingScreen";
import AdminLayout from "@/components/layout/AdminLayot";
import Layout from "@/components/layout/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import AuthPage from "@/pages/AuthPage";
import AdminPage from "@/pages/admin";
import AdminSettingsPage from "@/pages/admin/Settings";
// import AdminUsersPage from "@/pages/admin/User";
import Home from "@/pages/Home";
import { APP_ROUTES } from "@/pages/routes";
import WelcomePage from "@/pages/WelcomePage";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useModels } from "./api/models/queries";
import { useUserData } from "./api/users/queries/useUserData";

function App() {
  const { isInitialized, isLoading: isAppLoading } = useAppInitialization();

  const { settings } = useSettingsStore();

  const { isFetching: isModelsFetching } = useModels();
  const { isFetching: isUserDataFetching } = useUserData();
  const isLoading = isModelsFetching || isUserDataFetching;

  const toasterTheme = useMemo(() => {
    if (settings.theme?.includes("dark")) {
      return "dark";
    }
    if (settings.theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  }, [settings.theme]);

  if (!isInitialized || isAppLoading || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <div className="relative h-screen">
        <Toaster theme={toasterTheme} richColors position="top-right" />
        <Routes>
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path={APP_ROUTES.HOME} element={<Home />} />
            <Route path={APP_ROUTES.CHAT} element={<Home />} />

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
