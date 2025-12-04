import type React from "react";
import { Outlet } from "react-router";
import ChatVerifier from "@/components/chat/verifier/ChatVerifier";
import LeftSidebar from "@/components/sidebar";
import ImportGuideBanner from "@/components/common/ImportGuideBanner";
import { useUserSettings } from "@/api/users/queries";
import { useChatStore } from "@/stores/useChatStore";
import { useTheme } from "../common/ThemeProvider";
import { useEffect } from "react";

const Layout: React.FC = () => {
  const { data: remoteSettings } = useUserSettings();
  const { setTheme } = useTheme();
  const { setWebSearchEnabled } = useChatStore();

  useEffect(() => {
    if (remoteSettings?.settings) {
      if (remoteSettings.settings.appearance) {
        setTheme(remoteSettings.settings.appearance);
      }
      setWebSearchEnabled(remoteSettings.settings.web_search);
    }
  }, [remoteSettings, setTheme, setWebSearchEnabled]);

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
