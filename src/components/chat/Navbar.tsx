import { useNavigate, useParams } from "react-router";
import SafeLogo from "@/assets/images/safe.svg";

import { useViewStore } from "@/stores/useViewStore";
import ChatOptions from "./ChatOptions";
import ModelSelector from "./ModelSelector";

export default function Navbar() {
  const { isLeftSidebarOpen, isRightSidebarOpen, setIsRightSidebarOpen, setIsLeftSidebarOpen } = useViewStore();

  const navigate = useNavigate();
  const { chatId } = useParams();

  const handleNewChat = async () => {
    try {
      navigate("/");
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  const handleToggleSidebar = () => {
    setIsLeftSidebarOpen(!isLeftSidebarOpen);
  };

  return (
    <nav className="-mb-6 drag-region sticky top-0 z-30 flex w-full flex-col items-center py-1.5">
      <div className="flex w-full items-center px-1.5">
        <div className="-bottom-7 pointer-events-none absolute inset-0 z-[-1] bg-gradient-to-b from-white via-50% via-white to-transparent dark:from-gray-900 dark:via-gray-900 dark:to-transparent" />

        <div className="mx-auto flex w-full max-w-full bg-transparent px-1 pt-1">
          <div className="flex w-full max-w-full">
            {!isLeftSidebarOpen && (
              <div className={`mr-2 flex flex-col gap-y-3 self-start pt-0.5 text-gray-600 md:mr-4 dark:text-gray-400`}>
                <button
                  type="button"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-white shadow hover:bg-gray-50 dark:bg-[rgba(248,248,248,0.04)] dark:hover:bg-gray-850"
                  onClick={handleToggleSidebar}
                  title="Expand Sidebar"
                >
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  id="new-chat-button"
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded text-white shadow transition-colors hover:bg-gray-50 hover:text-gray-600 dark:bg-[rgba(248,248,248,0.04)] dark:hover:bg-gray-850 dark:hover:text-gray-300"
                  onClick={handleNewChat}
                  aria-label="New Chat"
                  title="New Chat"
                >
                  <svg className="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex max-w-full flex-1 justify-center overflow-hidden py-0.5">
              <ModelSelector />
            </div>

            <div className="flex flex-none items-center gap-2 self-start text-gray-600 dark:text-gray-400">
              {chatId && <ChatOptions chatId={chatId} />}
              {!isRightSidebarOpen && (
                <button
                  onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                  className="top-4 right-4 z-50 rounded-full bg-green-500 text-white shadow-lg transition-all duration-200 hover:bg-green-600"
                  title="Toggle Verification Panel"
                >
                  <img alt="safe" src={SafeLogo} className="h-8 w-8" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
