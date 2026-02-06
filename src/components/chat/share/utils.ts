import type { ConversationShareInfo, ShareGroup } from "@/types";

export const buildConversationUrl = (conversationId: string) => {
  if (typeof window === "undefined") return conversationId;
  return `${window.location.origin}/c/${conversationId}`;
};

// Generate initials from email or NEAR account
export const getInitials = (value: string) => {
  if (value.includes("@")) {
    return value.split("@")[0].slice(0, 2).toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
};

// Generate a consistent color based on the value
export const getAvatarColor = (value: string) => {
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

export const getShareDisplayInfo = (
  share: ConversationShareInfo,
  groupsById: Map<string, ShareGroup>
) => {
  switch (share.share_type) {
    case "direct":
      return {
        name: share.recipient?.value || "Unknown",
        subtitle: share.recipient?.kind === "near_account" ? "NEAR Account" : "Email",
        icon: null,
      };
    case "group": {
      const group = share.group_id ? groupsById.get(share.group_id) : null;
      if (!group) return null;
      return {
        name: group.name,
        subtitle: `${group.members.length || 0} members`,
        iconType: "group" as const,
      };
    }
    case "organization":
      return {
        name: share.org_email_pattern || "Organization",
        subtitle: "Anyone with matching email",
        iconType: "organization" as const,
      };
    default:
      return { name: "Unknown", subtitle: "", icon: null };
  }
};
