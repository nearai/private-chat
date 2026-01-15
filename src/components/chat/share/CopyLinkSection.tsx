import { useState } from "react";
import { LinkIcon, CheckIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn, copyToClipboard } from "@/lib";
import { buildConversationUrl } from "./utils";

interface CopyLinkSectionProps {
  conversationId: string;
}

export const CopyLinkSection = ({ conversationId }: CopyLinkSectionProps) => {
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = buildConversationUrl(conversationId);
    const success = await copyToClipboard(url);

    if (success) {
      setLinkCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setLinkCopied(false), 2000);
    } else {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/50 p-3">
      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <LinkIcon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm">Copy link</p>
        <p className="truncate text-muted-foreground text-xs">
          Share this conversation with the link
        </p>
      </div>
      <Button
        variant="secondary"
        size="small"
        onClick={handleCopyLink}
        className={cn(
          "rounded-lg border border-border transition-all",
          linkCopied && "border-green-500/30 bg-green-500/10 text-green-600"
        )}
      >
        {linkCopied ? (
          <>
            <CheckIcon className="mr-1.5 size-4" />
            Copied
          </>
        ) : (
          <>
            <LinkIcon className="mr-1.5 size-4" />
            Copy link
          </>
        )}
      </Button>
    </div>
  );
};
