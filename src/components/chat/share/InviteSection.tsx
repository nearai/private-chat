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
import {
  createRecipientInput,
  isValidEmail,
  isValidNearAccount,
  type RecipientInputValue,
  ShareRecipientInputs,
} from "../ShareRecipientInputs";

interface InviteSectionProps {
  recipients: RecipientInputValue[];
  onRecipientsChange: (recipients: RecipientInputValue[]) => void;
  permission: SharePermission;
  setPermission: (value: SharePermission) => void;
  currentUserEmail: string;
  conversationId: string;
  isPending: boolean;
  onInvite: (recipients: ShareRecipient[], permission: SharePermission) => Promise<void>;
}

export const InviteSection = ({
  recipients,
  onRecipientsChange,
  permission,
  setPermission,
  currentUserEmail,
  isPending,
  onInvite,
}: InviteSectionProps) => {
  const { t } = useTranslation("translation", { useSuspense: false });

  const handleInvite = async () => {
    // Filter out empty values
    const validRecipients = recipients.filter((r) => r.value.trim().length > 0);

    if (validRecipients.length === 0) {
      toast.error(t("Please enter at least one recipient"));
      return;
    }

    // Check validation of each recipient
    const invalidRecipient = validRecipients.find((r) => {
      if (r.kind === "email") return !isValidEmail(r.value);
      if (r.kind === "near_account") return !isValidNearAccount(r.value);
      return false;
    });

    if (invalidRecipient) {
      toast.error(
        t("Invalid {{kind}}: {{value}}", {
          kind: invalidRecipient.kind === "email" ? "email" : "NEAR account",
          value: invalidRecipient.value,
        })
      );
      return;
    }

    // Check if trying to share with self
    const selfRecipient = validRecipients.find((r) => r.value.toLowerCase() === currentUserEmail.toLowerCase());
    if (selfRecipient) {
      toast.error(t("You can't share a conversation with yourself"));
      return;
    }

    // Convert to API format
    const apiRecipients: ShareRecipient[] = validRecipients.map((r) => ({
      kind: r.kind,
      value: r.value.trim(),
    }));

    await onInvite(apiRecipients, permission);
    onRecipientsChange([createRecipientInput()]);
  };

  const hasContent = recipients.some((r) => r.value.trim().length > 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 gap-1.5 rounded-lg font-normal text-muted-foreground text-xs dark:hover:bg-muted/0">
                {permission === "write" ? t("Can edit") : t("Can view")}
                <ChevronDownIcon className="size-3.5" />
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
        <ShareRecipientInputs
          recipients={recipients}
          onChange={onRecipientsChange}
          allowMultiple={true}
          className="w-full"
          placeholder={t("Add people by email or NEAR account")}
        />
      </div>

      <Button
        onClick={handleInvite}
        disabled={!hasContent || isPending}
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
