import { UserGroupIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useConversationShares } from "@/api/sharing/useConversationShares";
import { useCreateConversationShare } from "@/api/sharing/useCreateConversationShare";
import { useDeleteConversationShare } from "@/api/sharing/useDeleteConversationShare";
import { useShareGroups } from "@/api/sharing/useShareGroups";
import { useUserData } from "@/api/users/queries/useUserData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type {
  ConversationShareInfo,
  CreateConversationShareRequest,
  ShareGroup,
  SharePermission,
  ShareRecipient,
} from "@/types";
import { ManageShareGroupsDialog } from "./ManageShareGroupsDialog";

import {
  createRecipientInput,
  type RecipientInputValue,
} from "./ShareRecipientInputs";

import {
  AdvancedSharingSection,
  CopyLinkSection,
  InviteSection,
  PeopleWithAccessSection,
  PublicAccessSection,
} from "./share";

interface ShareConversationDialogProps {
  conversationId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareConversationDialog = ({ conversationId, open, onOpenChange }: ShareConversationDialogProps) => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const { data: userData } = useUserData();
  const { data: sharesData, isLoading: isSharesLoading } = useConversationShares(conversationId);
  const { data: shareGroups = [] } = useShareGroups();
  const createShare = useCreateConversationShare();
  const deleteShare = useDeleteConversationShare();
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Extract is_owner, can_share, and shares from the response
  const isOwner = sharesData?.is_owner ?? false;
  const canShare = sharesData?.can_share ?? false;
  const shares = sharesData?.shares ?? [];

  // Get current user info
  const currentUserEmail = userData?.user?.email?.toLowerCase() || "";
  const currentUserName = userData?.user?.name || "";

  // Form state
  const [recipients, setRecipients] = useState<RecipientInputValue[]>([createRecipientInput()]);
  const [permission, setPermission] = useState<SharePermission>("read");
  const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Advanced options state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedMode, setAdvancedMode] = useState<"group" | "organization" | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [orgPattern, setOrgPattern] = useState("");

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setRecipients([createRecipientInput()]);
      setPermission("read");
      setShowAdvanced(false);
      setAdvancedMode(null);
      setOrgPattern("");
    }
  }, [open]);

  // Set default group selection
  useEffect(() => {
    if (shareGroups.length && !selectedGroupId) {
      setSelectedGroupId(shareGroups[0].id);
    }
  }, [shareGroups, selectedGroupId]);

  // Memoized values
  const groupsById = useMemo(() => {
    const map = new Map<string, ShareGroup>();
    shareGroups.forEach((group) => {
      map.set(group.id, group);
    });
    return map;
  }, [shareGroups]);

  const publicShare = useMemo(() => shares.find((s) => s.share_type === "public"), [shares]);

  const peopleShares = useMemo(() => shares.filter((s) => s.share_type !== "public"), [shares]);

  // Handlers
  const handleInvite = async (recipientsToInvite: ShareRecipient[], perm: SharePermission) => {
    if (!conversationId) return;

    try {
      await createShare.mutateAsync({
        conversationId,
        payload: {
          permission: perm,
          target: {
            mode: "direct",
            recipients: recipientsToInvite,
          },
        },
      });
      toast.success(recipientsToInvite.length === 1 ? t("Invited {{email}}", { email: recipientsToInvite[0].value }) : t("Invited {{count}} people", { count: recipientsToInvite.length }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to send invite"));
    }
  };

  const handleAdvancedShare = async () => {
    if (!conversationId) return;

    let payload: CreateConversationShareRequest | null = null;

    if (advancedMode === "group") {
      if (!selectedGroupId) {
        toast.error(t("Please select a group"));
        return;
      }
      payload = {
        permission,
        target: { mode: "group", group_id: selectedGroupId },
      };
    } else if (advancedMode === "organization") {
      const pattern = orgPattern.trim();
      if (!pattern) {
        toast.error(t("Please enter an email pattern"));
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
      toast.success(t("Access granted"));
      setAdvancedMode(null);
      setOrgPattern("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to share"));
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
      toast.success(t("Public link created"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to create link"));
    }
  };

  const handleRemoveAccess = async (share: ConversationShareInfo) => {
    if (!conversationId) return;

    setPendingDeleteId(share.id);
    try {
      await deleteShare.mutateAsync({ conversationId, shareId: share.id });
      toast.success(t("Access removed"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to remove access"));
    } finally {
      setPendingDeleteId(null);
    }
  };

  useEffect(() => {
    if (!containerRef.current || !showAdvanced) return
    setTimeout(() => {
      if (!containerRef.current) return
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }, 300);
  }, [advancedMode, showAdvanced])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-xl">
              {canShare
                ? t("Share this conversation")
                : t("Conversation access")}
            </DialogTitle>
          </DialogHeader>

          <div ref={containerRef} className="max-h-[80vh] space-y-6 overflow-y-auto px-6 pb-6">
            {/* Main invite section - for users who can share */}
            {canShare && conversationId && (
              <InviteSection
                recipients={recipients}
                onRecipientsChange={setRecipients}
                permission={permission}
                setPermission={setPermission}
                currentUserEmail={currentUserEmail}
                conversationId={conversationId}
                isPending={createShare.isPending}
                onInvite={handleInvite}
              />
            )}

            {/* Copy link section - available to everyone */}
            {conversationId && (
              <CopyLinkSection conversationId={conversationId} />
            )}

            {/* Non-sharer info message */}
            {!canShare && !isSharesLoading && (
              <div className="flex items-center gap-3 rounded-xl border border-border/40 p-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-foreground/10 text-foreground/70">
                  <UserGroupIcon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{t("Shared with you")}</p>
                  <p className="text-muted-foreground text-xs">
                    {t(
                      "You have access to this conversation. Only the owner can manage sharing.",
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Public access section - for users who can share */}
            {canShare && (
              <PublicAccessSection
                publicShare={publicShare}
                isPending={createShare.isPending || deleteShare.isPending || isSharesLoading}
                onCreatePublicLink={handleCreatePublicLink}
                onRemovePublicLink={async () => {
                  if (publicShare) {
                    await handleRemoveAccess(publicShare);
                  }
                }}
              />
            )}

            {/* People with access - show for owners and users with share permission */}
            {(isOwner || canShare) && (
              <PeopleWithAccessSection
                isOwner={isOwner}
                isLoading={isSharesLoading}
                currentUserEmail={currentUserEmail}
                currentUserName={currentUserName}
                peopleShares={peopleShares}
                groupsById={groupsById}
                pendingDeleteId={pendingDeleteId}
                onRemoveAccess={handleRemoveAccess}
              />
            )}

            {/* Advanced options toggle - for users who can share */}
            {canShare && (
              <AdvancedSharingSection
                showAdvanced={showAdvanced}
                setShowAdvanced={setShowAdvanced}
                advancedMode={advancedMode}
                setAdvancedMode={setAdvancedMode}
                selectedGroupId={selectedGroupId}
                setSelectedGroupId={setSelectedGroupId}
                orgPattern={orgPattern}
                setOrgPattern={setOrgPattern}
                shareGroups={shareGroups}
                peopleShares={peopleShares}
                permission={permission}
                isPending={createShare.isPending}
                onAdvancedShare={handleAdvancedShare}
                onManageGroups={() => {
                  setIsManageGroupsOpen(true)
                }}
              />
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
