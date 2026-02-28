import type React from "react";
import { Outlet } from "react-router";
import ChatVerifier from "@/components/chat/verifier/ChatVerifier";
import ImportGuideBanner from "@/components/common/ImportGuideBanner";
import IronClawBanner from "@/components/common/IronClawBanner";
import LeftSidebar from "@/components/sidebar";

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen w-full flex-row">
      <LeftSidebar />
      <div className="flex h-screen max-h-dvh w-full max-w-full flex-col transition-width duration-200 ease-in-out">
        {children ?? <Outlet />}
      </div>
      <ChatVerifier />
      <div className="pointer-events-none fixed right-6 bottom-6 z-40 flex flex-col items-end gap-4">
        <ImportGuideBanner />
        <IronClawBanner />
      </div>
    </div>
  );
};

export default Layout;
