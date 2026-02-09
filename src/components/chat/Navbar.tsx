import { DocumentDuplicateIcon, GlobeAltIcon, ShareIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useConversationShares } from "@/api/sharing/useConversationShares";
import PencilIcon from "@/assets/icons/pencil-icon.svg?react";
import ShieldIcon from "@/assets/icons/shield.svg?react";
import SidebarIcon from "@/assets/icons/sidebar.svg?react";
import { useViewStore } from "@/stores/useViewStore";
import Spinner from "@/components/common/Spinner";
import { Button } from "../ui/button";
import ModelSelector from "./ModelSelector";
import ShareConversationDialog from "./ShareConversationDialog";

interface NavbarProps {
  sharesData?: ReturnType<typeof useConversationShares>["data"];
  onCopyAndContinue?: () => void;
  isCopying?: boolean;
}

export default function Navbar({ sharesData: propSharesData, onCopyAndContinue, isCopying }: NavbarProps = {} as NavbarProps) {
  const { isLeftSidebarOpen, isRightSidebarOpen, setIsRightSidebarOpen, setIsLeftSidebarOpen } = useViewStore();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId?: string }>();

  // Check sharing status - use prop if provided, otherwise fetch
  const { data: hookSharesData } = useConversationShares(chatId);
  const sharesData = propSharesData ?? hookSharesData;
  const isPublic = sharesData?.shares?.some((share) => share.share_type === "public") ?? false;
  const hasShares = (sharesData?.shares?.length ?? 0) > 0;

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
    <>
      {isPublic && (
        <div className="sticky top-0 z-40 flex items-center justify-center gap-2 border-amber-200 border-b bg-amber-50 px-4 py-2 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <GlobeAltIcon className="size-4" />
          <span className="text-sm">This conversation is public — Anyone with the link can view</span>
        </div>
      )}
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
              {chatId && sharesData && !sharesData.is_owner && onCopyAndContinue && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCopyAndContinue}
                  disabled={isCopying}
                  className="size-8 text-muted-foreground"
                  title="Copy conversation"
                >
                  {isCopying ? <Spinner className="size-4" /> : <DocumentDuplicateIcon className="size-4.5" />}
                </Button>
              )}
              {chatId && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsShareDialogOpen(true)}
                    className="size-8 text-muted-foreground"
                    title="Share"
                    aria-label="Share conversation"
                  >
                    <ShareIcon className="size-4.5" />
                  </Button>
                  {hasShares && <span className="-top-0.5 -right-0.5 absolute size-3 rounded-full bg-green-500" />}
                </div>
              )}
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
        {chatId && (
          <ShareConversationDialog
            conversationId={chatId}
            open={isShareDialogOpen}
            onOpenChange={setIsShareDialogOpen}
          />
        )}
      </nav>
    </>
  );
}
