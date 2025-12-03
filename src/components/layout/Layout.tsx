import type React from "react";
import { Outlet, useNavigate } from "react-router";
import ChatVerifier from "@/components/chat/verifier/ChatVerifier";
import LeftSidebar from "@/components/sidebar";
import ImportGuideBanner from "@/components/common/ImportGuideBanner";
import { useUserStore } from "@/stores/useUserStore";
import { eventEmitter } from "@/lib/event";
import { useEffect } from "react";
import { posthogReset } from "@/lib/posthog";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { APP_ROUTES } from "@/pages/routes";

const Layout: React.FC = () => {
  const { setUser } = useUserStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser(null);
    posthogReset();
    localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION);
    navigate(APP_ROUTES.AUTH, { replace: true });
  }

  useEffect(() => {
    eventEmitter.on('logout', handleLogout);
    return () => eventEmitter.off('logout', handleLogout);
  }, [handleLogout]);

  return (
    <div className="flex h-screen w-full flex-row">
      <LeftSidebar />
      <div className="flex h-screen max-h-dvh w-full max-w-full flex-col transition-width duration-200 ease-in-out">
        <Outlet />
      </div>
      <ChatVerifier />
      <ImportGuideBanner />
    </div>
  );
};

export default Layout;
