import { ChevronDownIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Spinner from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SharePermission, ShareRecipient } from "@/types";

interface InviteSectionProps {
  emailInput: string;
  setEmailInput: (value: string) => void;
  permission: SharePermission;
  setPermission: (value: SharePermission) => void;
  currentUserEmail: string;
  conversationId: string;
  isPending: boolean;
  onInvite: (recipients: ShareRecipient[], permission: SharePermission) => Promise<void>;
}

export const InviteSection = ({
  emailInput,
  setEmailInput,
  permission,
  setPermission,
  currentUserEmail,
  isPending,
  onInvite,
}: InviteSectionProps) => {
  const { t } = useTranslation("translation", { useSuspense: false });

  const handleInvite = async () => {
    const emails = emailInput
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    // Deduplicate emails
    const uniqueEmails = [...new Set(emails)];

    if (uniqueEmails.length === 0) {
      toast.error(t("Please enter an email address"));
      return;
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nearRegex = /^[a-z0-9_-]+\.near$/i;

    // Check if trying to share with self (the owner)
    const selfEmails = uniqueEmails.filter((e) => e === currentUserEmail);
    if (selfEmails.length > 0) {
      toast.error(t("You can't share a conversation with yourself"));
      return;
    }

    const recipients: ShareRecipient[] = uniqueEmails.map((value) => ({
      kind: nearRegex.test(value) ? "near_account" : "email",
      value,
    }));

    const invalidEmails = recipients.filter((r) => r.kind === "email" && !emailRegex.test(r.value));

    if (invalidEmails.length > 0) {
      toast.error(t("Invalid email: {{email}}", { email: invalidEmails[0].value }));
      return;
    }

    await onInvite(recipients, permission);
    setEmailInput("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            placeholder={t("Add people by email or NEAR account")}
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm transition-all placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="h-11 gap-1.5 rounded-xl border border-border px-3 font-normal">
              {permission === "write" ? t("Can edit") : t("Can view")}
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={() => setPermission("read")} className="rounded-lg">
              <div className="flex flex-col">
                <span>{t("Can view")}</span>
                <span className="text-muted-foreground text-xs">{t("Read-only access")}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPermission("write")} className="rounded-lg">
              <div className="flex flex-col">
                <span>{t("Can edit")}</span>
                <span className="text-muted-foreground text-xs">{t("Can add messages")}</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Button
        onClick={handleInvite}
        disabled={!emailInput.trim() || isPending}
        className="h-11 w-full rounded-xl bg-primary font-medium text-primary-foreground hover:bg-primary/90"
      >
        {isPending ? (
          <Spinner className="size-4" />
        ) : (
          <>
            <UserPlusIcon className="mr-2 size-4" />
            {t("Send invite")}
          </>
        )}
      </Button>
    </div>
  );
};
