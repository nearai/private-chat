import { cn } from "@/lib";

export interface TypingIndicatorProps {
  /** Users currently typing */
  typingUsers: string[];
  /** Optional className for styling */
  className?: string;
}

/**
 * Displays a typing indicator when other users are typing in the conversation
 */
export function TypingIndicator({ typingUsers, className }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const displayText =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing...`
      : typingUsers.length === 2
        ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
        : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-muted-foreground text-sm",
        className
      )}
    >
      <div className="flex gap-1">
        <span className="animate-bounce [animation-delay:-0.3s]">.</span>
        <span className="animate-bounce [animation-delay:-0.15s]">.</span>
        <span className="animate-bounce">.</span>
      </div>
      <span>{displayText}</span>
    </div>
  );
}
