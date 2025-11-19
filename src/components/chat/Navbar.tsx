import { useNavigate, useParams } from "react-router";
import PencilIcon from "@/assets/icons/pencil-icon.svg?react";
import ShieldIcon from "@/assets/icons/shield.svg?react";
import SidebarIcon from "@/assets/icons/sidebar.svg?react";
import { useViewStore } from "@/stores/useViewStore";
import { Button } from "../ui/button";
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
    <nav className="-mb-6 drag-region sticky top-0 z-30 flex w-full flex-col py-1.5">
      <div className="flex w-full px-1.5">
        <div className="-bottom-7 pointer-events-none absolute inset-0 z-[-1] bg-linear-to-b from-background via-50% via-background to-transparent" />

        <div className="mx-auto flex w-full max-w-full bg-transparent px-1 pt-1">
          {!isLeftSidebarOpen && (
            <div className="mr-2 flex flex-col gap-y-3 self-start pt-0.5 md:mr-4">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={handleToggleSidebar}
                title="Expand Sidebar"
                className="size-8 text-muted-foreground"
              >
                <SidebarIcon className="size-5 rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                id="new-chat-button"
                type="button"
                className="size-8 text-muted-foreground"
                onClick={handleNewChat}
                aria-label="New Chat"
                title="New Chat"
              >
                <PencilIcon className="size-4.5" />
              </Button>
            </div>
          )}

          <div className="flex max-w-full flex-1 justify-center overflow-hidden py-0.5">
            <ModelSelector />
          </div>

          <div className="flex h-fit items-center gap-2">
            {chatId && <ChatOptions chatId={chatId} />}
            {!isRightSidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                className="top-4 right-4 z-50 size-8 text-green-dark"
                title="Toggle Verification Panel"
              >
                <ShieldIcon className="size-4.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
