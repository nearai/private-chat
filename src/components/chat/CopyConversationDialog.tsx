import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/common/Spinner";

interface CopyConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationTitle?: string;
  onConfirm: () => void;
  isCopying?: boolean;
}

export function CopyConversationDialog({
  open,
  onOpenChange,
  conversationTitle,
  onConfirm,
  isCopying = false,
}: CopyConversationDialogProps) {
  const displayTitle = conversationTitle || "Untitled Conversation";
  const newTitle = `${displayTitle} (Copy)`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <DocumentDuplicateIcon className="size-5 text-primary" />
            </div>
            <DialogTitle className="mb-0">Copy Conversation</DialogTitle>
          </div>
          <DialogDescription className="space-y-4 pt-2 text-left">
            <p>
              This will create a copy of the current conversation in your account. You'll be able to continue the conversation from where it left off.
            </p>
            
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
              <div>
                <p className="mb-1.5 font-medium text-muted-foreground text-xs">Current conversation:</p>
                <p className="break-words font-medium text-sm">
                  {displayTitle}
                </p>
              </div>
              <div className="h-px bg-border" />
              <div>
                <p className="mb-1.5 font-medium text-muted-foreground text-xs">New conversation will be named:</p>
                <p className="break-words font-medium text-primary text-sm">
                  {newTitle}
                </p>
              </div>
            </div>
            
            <p className="text-muted-foreground text-xs">
              The copied conversation will appear in your conversation list and you can continue chatting from there.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="default" className="mr-2 w-full sm:w-auto" onClick={onConfirm} disabled={isCopying}>
            {isCopying ? (
              <>
                <Spinner className="mr-2 size-4" />
                Copying...
              </>
            ) : (
              <>
                Continue
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isCopying}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
