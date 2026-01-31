import { ArrowPathIcon } from "@heroicons/react/24/outline";
import type { ConnectionState } from "@/lib/websocket";

interface OfflineBannerProps {
  connectionState: ConnectionState;
  isSharedConversation: boolean;
}

/**
 * Shows a banner when WebSocket is reconnecting in a shared conversation.
 */
export function OfflineBanner({ connectionState, isSharedConversation }: OfflineBannerProps) {
  // Show reconnecting banner for shared conversations with connection issues
  if (isSharedConversation && connectionState === "error") {
    return (
      <div className="flex items-center justify-center gap-2 border-yellow-200 border-b bg-yellow-50 px-4 py-2 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-200">
        <ArrowPathIcon className="size-4 animate-spin" />
        <span className="text-sm">Reconnecting to real-time updates...</span>
      </div>
    );
  }

  return null;
}
