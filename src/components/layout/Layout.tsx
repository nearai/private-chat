import type React from "react";
import { Outlet } from "react-router";
import ChatVerifier from "@/components/chat/verifier/ChatVerifier";
import LeftSidebar from "@/components/sidebar";

const Layout: React.FC = () => {
  return (
    <div className="flex h-screen w-full flex-row">
      <LeftSidebar />
      <div className="flex h-screen max-h-dvh w-full max-w-full flex-col transition-width duration-200 ease-in-out">
        <Outlet />
      </div>
      <ChatVerifier />
    </div>
  );
};

export default Layout;
