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
import {
  createRecipientInput,
  isValidEmail,
  isValidNearAccount,
  type RecipientInputValue,
  ShareRecipientInputs,
} from "./ShareRecipientInputs";

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

  const isFormValid = useMemo(() => {
    if (!name.trim()) return false;
    const activeMembers = members.filter(m => m.value.trim().length > 0);
    if (!activeMembers.length) return false;
    return activeMembers.every(member => {
      const value = member.value.trim();
      if (member.kind === "email") return isValidEmail(value);
      if (member.kind === "near_account") return isValidNearAccount(value);
      return false;
    });
  }, [name, members]);

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

    const invalidMember = payloadMembers.find((member) => {
      if (member.kind === "email") return !isValidEmail(member.value);
      if (member.kind === "near_account") return !isValidNearAccount(member.value);
      return false;
    });

    if (invalidMember) {
      toast.error(`Invalid ${invalidMember.kind === "email" ? "email" : "NEAR account"}: ${invalidMember.value}`);
      return;
    }

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
        <DialogHeader className="pb-2">
          <DialogTitle className="font-bold text-xl tracking-tight">Manage Share Groups</DialogTitle>
          <DialogDescription className="text-muted-foreground/80">
            Create and organize reusable groups for easier sharing.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[320px,1fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="font-semibold text-[11px] text-muted-foreground/70 uppercase tracking-wider">Your Groups</p>
              {isLoading && <Spinner className="size-3" />}
            </div>
            <div className="max-h-[50vh] space-y-1 overflow-y-auto rounded-2xl border border-border/40 bg-muted/10 p-1.5">
              {currentGroups.length === 0 && (
                <p className="text-muted-foreground text-sm">No groups yet. Create one to reuse recipients.</p>
              )}
              {currentGroups.map((group) => (
                <button
                  type="button"
                  key={group.id}
                  onClick={() => setEditingGroup(group)}
                  className={cn(
                    "w-full rounded-xl border border-transparent px-3 py-2.5 text-left transition-all duration-200",
                    editingGroup?.id === group.id
                      ? "translate-x-1 bg-background shadow-md ring-1 ring-border/50"
                      : "hover:bg-foreground/5"
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
                <label className="ml-1 font-medium text-muted-foreground text-xs" htmlFor="group-name">
                  {editingGroup ? "Edit Group Name" : "Group Name"}
                </label>
                <input
                  id="group-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="My collaborators"
                  className="mt-1.5 w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm outline-none transition-all focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10"
                />
              </div>
              <div className="pt-2">
                <p className="mb-2 ml-1 font-medium text-muted-foreground text-xs">Members</p>
                <ShareRecipientInputs recipients={members} onChange={setMembers} allowMultiple />
              </div>
            </div>
            <DialogFooter className="mt-6 border-border/20 border-t pt-4">
              {editingGroup && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="rounded-xl px-4 text-muted-foreground hover:bg-foreground/5"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving || !isFormValid}
                className="rounded-xl px-8 font-semibold shadow-sm transition-all active:scale-[0.98]"
              >
                {editingGroup ? "Save Changes" : "Create Group"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
