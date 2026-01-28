import { GlobeAltIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { ConversationShareInfo } from "@/types";

interface PublicAccessSectionProps {
  publicShare: ConversationShareInfo | undefined;
  isPending: boolean;
  onCreatePublicLink: () => Promise<void>;
}

export const PublicAccessSection = ({
  publicShare,
  isPending,
  onCreatePublicLink,
}: PublicAccessSectionProps) => {
  const { t } = useTranslation("translation", { useSuspense: false });

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/50 p-3">
      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <GlobeAltIcon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm">
          {publicShare ? t("Public access enabled") : t("Make public")}
        </p>
        <p className="truncate text-muted-foreground text-xs">
          {publicShare
            ? t("Anyone with the link can view without signing in")
            : t("Allow anyone to view without signing in")}
        </p>
      </div>
      {publicShare ? (
        <span className="rounded-md bg-green-500/10 px-2 py-1 font-medium text-green-600 text-xs">
          {t("Enabled")}
        </span>
      ) : (
        <Button
          variant="secondary"
          size="small"
          onClick={onCreatePublicLink}
          disabled={isPending}
          className="rounded-lg border border-border"
        >
          {t("Enable")}
        </Button>
      )}
    </div>
  );
};
