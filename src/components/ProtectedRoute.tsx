import { Navigate, useLocation } from "react-router";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { APP_ROUTES } from "@/pages/routes";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);

  if (!token) {
    // Save the intended destination for redirect after login
    const currentPath = location.pathname + location.search;
    if (currentPath !== "/" && currentPath !== APP_ROUTES.WELCOME) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.REDIRECT_AFTER_LOGIN, currentPath);
    }
    return <Navigate to={APP_ROUTES.WELCOME} replace />;
  }

  return children;
};

export default ProtectedRoute;
