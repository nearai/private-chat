import { useEffect, useMemo, useState } from "react";
import {
  LinkIcon,
  CheckIcon,
  XMarkIcon,
  UserGroupIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  UserPlusIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Spinner from "@/components/common/Spinner";
import { cn, copyToClipboard } from "@/lib";
import { ManageShareGroupsDialog } from "./ManageShareGroupsDialog";
import { useConversationShares } from "@/api/sharing/useConversationShares";
import { useCreateConversationShare } from "@/api/sharing/useCreateConversationShare";
import { useDeleteConversationShare } from "@/api/sharing/useDeleteConversationShare";
import { useShareGroups } from "@/api/sharing/useShareGroups";
import { useUserData } from "@/api/users/queries/useUserData";
import type {
  ConversationShareInfo,
  CreateConversationShareRequest,
  ShareGroup,
  SharePermission,
  ShareRecipient,
} from "@/types";

interface ShareConversationDialogProps {
  conversationId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const buildConversationUrl = (conversationId: string) => {
  if (typeof window === "undefined") return conversationId;
  return `${window.location.origin}/c/${conversationId}`;
};

// Generate initials from email or NEAR account
const getInitials = (value: string) => {
  if (value.includes("@")) {
    return value.split("@")[0].slice(0, 2).toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
};

// Generate a consistent color based on the value
const getAvatarColor = (value: string) => {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const ShareConversationDialog = ({
  conversationId,
  open,
  onOpenChange,
}: ShareConversationDialogProps) => {
  const { data: userData } = useUserData();
  const { data: sharesData, isLoading: isSharesLoading } = useConversationShares(conversationId);
  const { data: shareGroups = [] } = useShareGroups();
  const createShare = useCreateConversationShare();
  const deleteShare = useDeleteConversationShare();

  // Extract is_owner, can_share, and shares from the response
  const isOwner = sharesData?.is_owner ?? false;
  const canShare = sharesData?.can_share ?? false;
  const shares = sharesData?.shares ?? [];

  // Get current user info
  const currentUserEmail = userData?.user?.email?.toLowerCase() || "";
  const currentUserName = userData?.user?.name || "";

  const [emailInput, setEmailInput] = useState("");
  const [permission, setPermission] = useState<SharePermission>("read");
  const [linkCopied, setLinkCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Advanced options state
  const [advancedMode, setAdvancedMode] = useState<"group" | "organization" | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [orgPattern, setOrgPattern] = useState("");

  useEffect(() => {
    if (!open) {
      setEmailInput("");
      setPermission("read");
      setLinkCopied(false);
      setShowAdvanced(false);
      setAdvancedMode(null);
      setOrgPattern("");
    }
  }, [open]);

  useEffect(() => {
    if (shareGroups.length && !selectedGroupId) {
      setSelectedGroupId(shareGroups[0].id);
    }
  }, [shareGroups, selectedGroupId]);

  const groupsById = useMemo(() => {
    const map = new Map<string, ShareGroup>();
    shareGroups.forEach((group) => {
      map.set(group.id, group);
    });
    return map;
  }, [shareGroups]);

  // Find existing public share
  const publicShare = useMemo(
    () => shares.find((s) => s.share_type === "public"),
    [shares]
  );

  // Non-public shares for the "People with access" list
  const peopleShares = useMemo(
    () => shares.filter((s) => s.share_type !== "public"),
    [shares]
  );

  const handleInvite = async () => {
    if (!conversationId) return;

    const emails = emailInput
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      toast.error("Please enter an email address");
      return;
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nearRegex = /^[a-z0-9_-]+\.near$/i;

    // Check if trying to share with self (the owner)
    const selfEmails = emails.filter((e) => e === currentUserEmail);
    if (selfEmails.length > 0) {
      toast.error("You can't share a conversation with yourself");
      return;
    }

    const recipients: ShareRecipient[] = emails.map((value) => ({
      kind: nearRegex.test(value) ? "near_account" : "email",
      value,
    }));

    const invalidEmails = recipients.filter(
      (r) => r.kind === "email" && !emailRegex.test(r.value)
    );

    if (invalidEmails.length > 0) {
      toast.error(`Invalid email: ${invalidEmails[0].value}`);
      return;
    }

    try {
      await createShare.mutateAsync({
        conversationId,
        payload: {
          permission,
          target: {
            mode: "direct",
            recipients,
          },
        },
      });
      setEmailInput("");
      toast.success(
        recipients.length === 1
          ? `Invited ${recipients[0].value}`
          : `Invited ${recipients.length} people`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invite");
    }
  };

  const handleAdvancedShare = async () => {
    if (!conversationId) return;

    let payload: CreateConversationShareRequest | null = null;

    if (advancedMode === "group") {
      if (!selectedGroupId) {
        toast.error("Please select a group");
        return;
      }
      payload = {
        permission,
        target: { mode: "group", group_id: selectedGroupId },
      };
    } else if (advancedMode === "organization") {
      const pattern = orgPattern.trim();
      if (!pattern) {
        toast.error("Please enter an email pattern");
        return;
      }
      payload = {
        permission,
        target: { mode: "organization", email_pattern: pattern },
      };
    }

    if (!payload) return;

    try {
      await createShare.mutateAsync({ conversationId, payload });
      toast.success("Access granted");
      setAdvancedMode(null);
      setOrgPattern("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to share");
    }
  };

  const handleCreatePublicLink = async () => {
    if (!conversationId || publicShare) return;

    try {
      await createShare.mutateAsync({
        conversationId,
        payload: {
          permission: "read",
          target: { mode: "public" },
        },
      });
      toast.success("Public link created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create link");
    }
  };

  const handleCopyLink = async () => {
    if (!conversationId) return;

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

  const handleRemoveAccess = async (share: ConversationShareInfo) => {
    if (!conversationId) return;

    setPendingDeleteId(share.id);
    try {
      await deleteShare.mutateAsync({ conversationId, shareId: share.id });
      toast.success("Access removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove access");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const getShareDisplayInfo = (share: ConversationShareInfo) => {
    switch (share.share_type) {
      case "direct":
        return {
          name: share.recipient?.value || "Unknown",
          subtitle: share.recipient?.kind === "near_account" ? "NEAR Account" : "Email",
          icon: null,
        };
      case "group": {
        const group = share.group_id ? groupsById.get(share.group_id) : null;
        return {
          name: group?.name || "Group",
          subtitle: `${group?.members.length || 0} members`,
          icon: <UserGroupIcon className="size-4" />,
        };
      }
      case "organization":
        return {
          name: share.org_email_pattern || "Organization",
          subtitle: "Anyone with matching email",
          icon: <BuildingOfficeIcon className="size-4" />,
        };
      default:
        return { name: "Unknown", subtitle: "", icon: null };
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-xl">
              {canShare ? "Share this conversation" : "Conversation access"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 px-6 pb-6">
            {/* Main invite section - for users who can share */}
            {canShare && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                      placeholder="Add people by email or NEAR account"
                      className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm transition-all placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        className="h-11 gap-1.5 rounded-xl border border-border px-3 font-normal"
                      >
                        {permission === "write" ? "Can edit" : "Can view"}
                        <ChevronDownIcon className="size-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onClick={() => setPermission("read")} className="rounded-lg">
                        <div className="flex flex-col">
                          <span>Can view</span>
                          <span className="text-muted-foreground text-xs">Read-only access</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPermission("write")} className="rounded-lg">
                        <div className="flex flex-col">
                          <span>Can edit</span>
                          <span className="text-muted-foreground text-xs">Can add messages</span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Button
                  onClick={handleInvite}
                  disabled={!emailInput.trim() || createShare.isPending}
                  className="h-11 w-full rounded-xl font-medium"
                >
                  {createShare.isPending ? (
                    <Spinner className="size-4" />
                  ) : (
                    <>
                      <UserPlusIcon className="mr-2 size-4" />
                      Send invite
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Copy link section - available to everyone */}
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

            {/* Non-sharer info message */}
            {!canShare && !isSharesLoading && (
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/50 p-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserGroupIcon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">Shared with you</p>
                  <p className="text-muted-foreground text-xs">
                    You have access to this conversation. Only the owner can manage sharing.
                  </p>
                </div>
              </div>
            )}

            {/* Public access section - for users who can share */}
            {canShare && (
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/50 p-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <GlobeAltIcon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">
                    {publicShare ? "Public access enabled" : "Make public"}
                  </p>
                  <p className="truncate text-muted-foreground text-xs">
                    {publicShare
                      ? "Anyone with the link can view without signing in"
                      : "Allow anyone to view without signing in"}
                  </p>
                </div>
                {publicShare ? (
                  <span className="rounded-md bg-green-500/10 px-2 py-1 font-medium text-green-600 text-xs">
                    Enabled
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={handleCreatePublicLink}
                    disabled={createShare.isPending}
                    className="rounded-lg border border-border"
                  >
                    Enable
                  </Button>
                )}
              </div>
            )}

            {/* People with access - only show for owners who have shares */}
            {isOwner && (
              <div className="space-y-3">
                <h3 className="font-medium text-muted-foreground text-sm">
                  People with access
                </h3>

                {isSharesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Owner (current user) - always shown first */}
                    {currentUserEmail && (
                      <div className="flex items-center gap-3 rounded-xl p-2">
                        {/* Avatar */}
                        <div
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-full font-medium text-white text-xs",
                            getAvatarColor(currentUserEmail)
                          )}
                        >
                          {getInitials(currentUserEmail)}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-sm">
                            {currentUserName || currentUserEmail}
                            <span className="ml-1.5 text-muted-foreground">(you)</span>
                          </p>
                          <p className="text-muted-foreground text-xs">{currentUserEmail}</p>
                        </div>

                        {/* Owner badge */}
                        <span className="rounded-md bg-primary/10 px-2 py-1 font-medium text-primary text-xs">
                          Owner
                        </span>
                      </div>
                    )}

                    {/* Other shares */}
                    {peopleShares.map((share) => {
                      const info = getShareDisplayInfo(share);
                      const isDeleting = pendingDeleteId === share.id;

                      return (
                        <div
                          key={share.id}
                          className={cn(
                            "flex items-center gap-3 rounded-xl p-2 transition-colors",
                            "group hover:bg-muted/50"
                          )}
                        >
                          {/* Avatar */}
                          <div
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-full font-medium text-white text-xs",
                              info.icon ? "bg-muted text-muted-foreground" : getAvatarColor(info.name)
                            )}
                          >
                            {info.icon || getInitials(info.name)}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-sm">{info.name}</p>
                            <p className="text-muted-foreground text-xs">{info.subtitle}</p>
                          </div>

                          {/* Permission badge */}
                          <span className="rounded-md bg-muted/50 px-2 py-1 text-muted-foreground text-xs">
                            {share.permission === "write" ? "Can edit" : "Can view"}
                          </span>

                          {/* Remove button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAccess(share)}
                            disabled={isDeleting}
                            className={cn(
                              "size-8 rounded-lg opacity-0 transition-opacity group-hover:opacity-100",
                              "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            )}
                          >
                            {isDeleting ? (
                              <Spinner className="size-4" />
                            ) : (
                              <XMarkIcon className="size-4" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Advanced options toggle - for users who can share */}
            {canShare && (
              <div className="border-border/50 border-t pt-2">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
                >
                  <ChevronDownIcon
                    className={cn(
                      "size-4 transition-transform",
                      showAdvanced && "rotate-180"
                    )}
                  />
                  Advanced sharing options
                </button>

              {showAdvanced && (
                <div className="mt-4 space-y-3">
                  {/* Advanced option buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAdvancedMode(advancedMode === "group" ? null : "group")}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                        advancedMode === "group"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      )}
                    >
                      <UserGroupIcon className="size-5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Share with group</p>
                        <p className="text-muted-foreground text-xs">Reuse saved lists</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setAdvancedMode(advancedMode === "organization" ? null : "organization")}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                        advancedMode === "organization"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      )}
                    >
                      <BuildingOfficeIcon className="size-5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Organization</p>
                        <p className="text-muted-foreground text-xs">By email domain</p>
                      </div>
                    </button>
                  </div>

                  {/* Group selection */}
                  {advancedMode === "group" && (
                    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">Select a group</p>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => setIsManageGroupsOpen(true)}
                          className="h-7 text-xs"
                        >
                          Manage groups
                        </Button>
                      </div>

                      {shareGroups.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          No groups yet. Create one to save frequent collaborators.
                        </p>
                      ) : (
                        <>
                          <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            {shareGroups.map((group) => (
                              <option key={group.id} value={group.id}>
                                {group.name} ({group.members.length} members)
                              </option>
                            ))}
                          </select>
                          <Button
                            onClick={handleAdvancedShare}
                            disabled={createShare.isPending}
                            className="w-full rounded-lg"
                          >
                            Share with group
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Organization pattern */}
                  {advancedMode === "organization" && (
                    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/30 p-4">
                      <div>
                        <p className="mb-1 font-medium text-sm">Email domain pattern</p>
                        <p className="text-muted-foreground text-xs">
                          Anyone with a matching email address will have access
                        </p>
                      </div>
                      <input
                        type="text"
                        value={orgPattern}
                        onChange={(e) => setOrgPattern(e.target.value)}
                        placeholder="e.g. @company.com or %@company.com"
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <Button
                        onClick={handleAdvancedShare}
                        disabled={!orgPattern.trim() || createShare.isPending}
                        className="w-full rounded-lg"
                      >
                        Grant organization access
                      </Button>
                    </div>
                  )}
                </div>
              )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ManageShareGroupsDialog
        open={isManageGroupsOpen}
        onOpenChange={setIsManageGroupsOpen}
        onGroupSelected={(groupId) => {
          setSelectedGroupId(groupId);
          setAdvancedMode("group");
        }}
      />
    </>
  );
};

export default ShareConversationDialog;
