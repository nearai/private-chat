import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import Layout from "@/components/layout/Layout";
import ChatController from "./ChatController";
import PublicConversationPage from "./PublicConversationPage";

/**
 * Wrapper component that determines whether to show the authenticated chat view
 * or the public conversation view based on login status.
 */
export default function ConversationWrapper() {
  const isLoggedIn = typeof window !== "undefined" && Boolean(localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN));

  // If logged in, show the regular chat controller with the full Layout (sidebar, etc.)
  // The ChatController will handle access checks internally
  if (isLoggedIn) {
    return (
      <Layout>
        <ChatController />
      </Layout>
    );
  }

  // If not logged in, show the public conversation view
  // This will fetch the conversation using the public API
  return <PublicConversationPage />;
}
