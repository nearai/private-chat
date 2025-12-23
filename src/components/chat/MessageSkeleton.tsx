import type React from "react";

interface MessageSkeletonProps {
  message?: string;
}

const MessageSkeleton: React.FC<MessageSkeletonProps> = ({ message = "Encrypting & fetching messages ..." }) => {
  return (
    <div className="relative flex w-full flex-col" id="response-content-container">
      <div className="shimmer text-muted-foreground">{message !== undefined ? message : "Processing..."}</div>
    </div>
  );
};

export default MessageSkeleton;
