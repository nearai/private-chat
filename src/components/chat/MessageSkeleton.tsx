import type React from "react";
import { useMemo } from "react";
import NearAIIcon from "@/assets/images/near-icon.svg?react";
import { formatDate } from "@/lib/time";
import { useChatStore } from "@/stores/useChatStore";

interface MessageSkeletonProps {
  message?: string;

  model?: string;
}

const MessageSkeleton: React.FC<MessageSkeletonProps> = ({
  message = "Encrypting & fetching messages ...",
  model = "Assistant",
}) => {
  const { models } = useChatStore();

  const modelIcon = useMemo(() => {
    return models.find((m) => m.modelId === model)?.metadata?.modelIcon;
  }, [models, model]);

  return (
    <div className="group flex w-full">
      <div className="shrink-0 ltr:mr-2 rtl:ml-2">
        {modelIcon ? (
          <img src={modelIcon} alt={model} className="mt-0.5 h-6 w-6 rounded" />
        ) : (
          <NearAIIcon className="mt-0.5 h-6 w-6 rounded" />
        )}
      </div>

      <div className="w-0 flex-auto pl-1">
        <div className="flex items-center space-x-2">
          <span className="line-clamp-1 font-normal">{model}</span>

          <div className="invisible ml-0.5 self-center font-medium text-muted-foreground text-xs first-letter:capitalize group-hover:visible">
            <span className="line-clamp-1">{formatDate(Date.now())}</span>
          </div>
        </div>

        <div className={`markdown-prose w-full min-w-full`}>
          <div>
            <div className="relative flex w-full flex-col" id="response-content-container">
              <div className="shimmer text-muted-foreground">{message !== undefined ? message : "Processing..."}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageSkeleton;
