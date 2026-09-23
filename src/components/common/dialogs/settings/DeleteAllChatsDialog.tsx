import { useState } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteAllChatsDialogProps {
  isDeleting: boolean;
  isStopping: boolean;
  progress: { completed: number; total: number };
  onCancel: () => void;
  onExport: () => void;
  onConfirm: () => void;
  onStop: () => void;
}

export default function DeleteAllChatsDialog({
  isDeleting, isStopping, progress, onCancel, onExport, onConfirm, onStop,
}: DeleteAllChatsDialogProps) {
  const [backedUp, setBackedUp] = useState(false);

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open && !isDeleting) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
          <AlertDialogDescription>
            Export and save a copy of your data before continuing. This will permanently delete all
            your chat history, including archived chats. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Button variant="secondary" onClick={onExport} disabled={isDeleting}>
          Export Chats first
        </Button>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1 accent-destructive"
            checked={backedUp}
            disabled={isDeleting}
            onChange={(event) => setBackedUp(event.target.checked)}
          />
          <span>I have exported and saved my data, and I understand that all my chats will be permanently deleted.</span>
        </label>
        {isDeleting && (
          <p role="status" className="text-muted-foreground text-sm">
            {isStopping ? "Stopping after the current request finishes…" : (
              progress.total > 0 ? `Deleting chats: ${progress.completed} / ${progress.total}` : "Preparing to delete chats…"
            )}
            {" "}Deleted chats cannot be restored.
          </p>
        )}
        <AlertDialogFooter>
          {isDeleting ? (
            <Button variant="secondary" onClick={onStop} disabled={isStopping}>
              {isStopping ? "Stopping…" : "Stop deleting"}
            </Button>
          ) : (
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          )}
          <Button
            variant="destructive"
            className="text-white"
            disabled={!backedUp || isDeleting}
            onClick={() => { if (backedUp && !isDeleting) onConfirm(); }}
          >
            {isDeleting ? "Deleting…" : "Delete all chats"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
