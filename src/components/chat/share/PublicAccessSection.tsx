import { GlobeAltIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { ConversationShareInfo } from "@/types";

interface PublicAccessSectionProps {
  publicShare: ConversationShareInfo | undefined;
  isPending: boolean;
  onCreatePublicLink: () => Promise<void>;
  onRemovePublicLink: () => Promise<void>;
}

export const PublicAccessSection = ({
  publicShare,
  isPending,
  onCreatePublicLink,
  onRemovePublicLink,
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
        <Button
          variant="secondary"
          size="small"
          onClick={onRemovePublicLink}
          disabled={isPending}
          className="h-8 rounded-lg px-3 font-medium text-muted-foreground text-xs hover:bg-destructive/10 hover:text-destructive"
        >
          {t("Disable")}
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="small"
          onClick={onCreatePublicLink}
          disabled={isPending}
          className="h-8 rounded-lg border border-border/60 transition-all hover:border-foreground/30 hover:bg-foreground/5"
        >
          {t("Enable")}
        </Button>
      )}
    </div>
  );
};
