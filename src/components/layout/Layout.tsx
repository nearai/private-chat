import type React from "react";
import { Outlet } from "react-router";
import ChatVerifier from "@/components/chat/verifier/ChatVerifier";
import SunsetBanner from "@/components/common/SunsetBanner";
import LeftSidebar from "@/components/sidebar";

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen w-full flex-row">
      <LeftSidebar />
      <div className="flex h-screen max-h-dvh w-full min-w-0 max-w-full flex-col transition-width duration-200 ease-in-out">
        <SunsetBanner />
        <div className="min-h-0 flex-1 overflow-y-auto">{children ?? <Outlet />}</div>
      </div>
      <ChatVerifier />
    </div>
  );
};

export default Layout;
