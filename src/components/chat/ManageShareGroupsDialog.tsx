import { TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCreateShareGroup } from "@/api/sharing/useCreateShareGroup";
import { useDeleteShareGroup } from "@/api/sharing/useDeleteShareGroup";
import { useShareGroups } from "@/api/sharing/useShareGroups";
import { useUpdateShareGroup } from "@/api/sharing/useUpdateShareGroup";
import Spinner from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, generateId } from "@/lib";
import type { ShareGroup, ShareRecipient } from "@/types";
import { createRecipientInput, type RecipientInputValue, ShareRecipientInputs } from "./ShareRecipientInputs";

interface ManageShareGroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupSelected?: (groupId: string) => void;
}

const toRecipientInputs = (members: ShareRecipient[]): RecipientInputValue[] => {
  if (!members.length) {
    return [createRecipientInput()];
  }
  return members.map((member) => ({
    id: generateId(),
    kind: member.kind,
    value: member.value,
  }));
};

export const ManageShareGroupsDialog = ({ open, onOpenChange, onGroupSelected }: ManageShareGroupsDialogProps) => {
  const { data: groups = [], isLoading } = useShareGroups();
  const createGroup = useCreateShareGroup();
  const updateGroup = useUpdateShareGroup();
  const deleteGroup = useDeleteShareGroup();
  const [editingGroup, setEditingGroup] = useState<ShareGroup | null>(null);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<RecipientInputValue[]>([createRecipientInput()]);

  const isSaving = createGroup.isPending || updateGroup.isPending;
  const isDeleting = deleteGroup.isPending;

  useEffect(() => {
    if (editingGroup) {
      setName(editingGroup.name);
      setMembers(toRecipientInputs(editingGroup.members));
    } else {
      setName("");
      setMembers([createRecipientInput()]);
    }
  }, [editingGroup]);

  const handleSubmit = async () => {
    const payloadMembers = members
      .map((member) => ({ kind: member.kind, value: member.value.trim() }))
      .filter((member) => member.value.length > 0);

    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }

    if (!payloadMembers.length) {
      toast.error("Add at least one member");
      return;
    }

    if (editingGroup) {
      await updateGroup.mutateAsync({
        groupId: editingGroup.id,
        payload: { name: name.trim(), members: payloadMembers },
      });
      toast.success("Group updated");
    } else {
      const result = await createGroup.mutateAsync({ name: name.trim(), members: payloadMembers });
      toast.success("Group created");
      if (result.id) {
        onGroupSelected?.(result.id);
      }
    }

    setEditingGroup(null);
    setName("");
    setMembers([createRecipientInput()]);
  };

  const handleDeleteGroup = async (groupId: string) => {
    await deleteGroup.mutateAsync(groupId);
    toast.success("Group deleted");
    if (editingGroup?.id === groupId) {
      setEditingGroup(null);
      setName("");
      setMembers([createRecipientInput()]);
    }
  };

  const currentGroups = useMemo(() => groups, [groups]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Share Groups</DialogTitle>
          <DialogDescription>Organize frequent collaborators into reusable groups.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[320px,1fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-muted-foreground text-sm">Your Groups</p>
              {isLoading && <Spinner className="size-4" />}
            </div>
            <div className="space-y-2 rounded-2xl border border-border/70 p-2">
              {currentGroups.length === 0 && (
                <p className="text-muted-foreground text-sm">No groups yet. Create one to reuse recipients.</p>
              )}
              {currentGroups.map((group) => (
                <button
                  type="button"
                  key={group.id}
                  onClick={() => setEditingGroup(group)}
                  className={cn(
                    "w-full rounded-xl border border-transparent px-3 py-2 text-left text-sm transition hover:border-border",
                    editingGroup?.id === group.id ? "bg-secondary/60" : "bg-transparent"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{group.name}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteGroup(group.id);
                      }}
                      disabled={isDeleting}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">{group.members.length} member(s)</p>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 p-4">
            <div className="space-y-3">
              <div>
                <label className="font-medium text-muted-foreground text-sm" htmlFor="group-name">
                  {editingGroup ? "Edit Group Name" : "Group Name"}
                </label>
                <input
                  id="group-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="My collaborators"
                  className="mt-1 w-full rounded-xl border border-border/70 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-0"
                />
              </div>
              <div>
                <p className="mb-1 font-medium text-muted-foreground text-sm">Members</p>
                <ShareRecipientInputs recipients={members} onChange={setMembers} allowMultiple />
              </div>
            </div>
            <DialogFooter className="mt-4">
              {editingGroup && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="text-muted-foreground"
                >
                  Cancel edit
                </Button>
              )}
              <Button type="button" onClick={handleSubmit} disabled={isSaving}>
                {editingGroup ? "Save changes" : "Create group"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
