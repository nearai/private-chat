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
    <div className="flex items-center gap-3 rounded-xl border border-border/40 p-3 transition-colors hover:bg-muted/20">
      <div className="flex size-10 items-center justify-center rounded-full bg-foreground/10 text-foreground/70">
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
        <span className="rounded-md bg-green/15 px-2 py-1 font-medium text-green-dark text-xs dark:text-green">
          {t("Enabled")}
        </span>
      ) : (
        <Button
          variant="secondary"
          size="small"
          onClick={onCreatePublicLink}
          disabled={isPending}
          className="rounded-lg border border-border/60 transition-all hover:border-foreground/30 hover:bg-foreground/5"
        >
          {t("Enable")}
        </Button>
      )}
    </div>
  );
};
