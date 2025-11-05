import { Navigate } from "react-router";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { APP_ROUTES } from "@/pages/routes";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // const user = useUserStore((state) => state.user);
  const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
  if (!token) {
    return <Navigate to={APP_ROUTES.WELCOME} replace />;
  }

  // if (!user) {
  //   return <Navigate to={APP_ROUTES.WELCOME} replace />;
  // }

  return children;
};

export default ProtectedRoute;
