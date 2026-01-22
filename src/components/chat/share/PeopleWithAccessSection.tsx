import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/common/Spinner";
import { cn } from "@/lib";
import type { ConversationShareInfo, ShareGroup } from "@/types";
import { ShareAvatar } from "./ShareAvatar";
import { getAvatarColor, getInitials, getShareDisplayInfo } from "./utils";

interface PeopleWithAccessSectionProps {
  isOwner: boolean;
  isLoading: boolean;
  currentUserEmail: string;
  currentUserName: string;
  peopleShares: ConversationShareInfo[];
  groupsById: Map<string, ShareGroup>;
  pendingDeleteId: string | null;
  onRemoveAccess: (share: ConversationShareInfo) => void;
}

export const PeopleWithAccessSection = ({
  isOwner,
  isLoading,
  currentUserEmail,
  currentUserName,
  peopleShares,
  groupsById,
  pendingDeleteId,
  onRemoveAccess,
}: PeopleWithAccessSectionProps) => {
  const { t } = useTranslation("translation", { useSuspense: false });

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-muted-foreground text-sm">
        {t("People with access")}
      </h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-1">
          {/* Owner (current user) - shown first only if current user is owner */}
          {isOwner && currentUserEmail && (
            <div className="flex items-center gap-3 rounded-xl p-2">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full font-medium text-white text-xs",
                  getAvatarColor(currentUserEmail)
                )}
              >
                {getInitials(currentUserEmail)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">
                  {currentUserName || currentUserEmail}
                  <span className="ml-1.5 text-muted-foreground">{t("(you)")}</span>
                </p>
                <p className="text-muted-foreground text-xs">{currentUserEmail}</p>
              </div>

              <span className="rounded-md bg-primary/10 px-2 py-1 font-medium text-primary text-xs">
                {t("Owner")}
              </span>
            </div>
          )}

          {/* Other shares */}
          {peopleShares.map((share) => {
            const info = getShareDisplayInfo(share, groupsById);
            const isDeleting = pendingDeleteId === share.id;
            const isCurrentUser = share.share_type === "direct" &&
              share.recipient?.value?.toLowerCase() === currentUserEmail;

            return (
              <div
                key={share.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl p-2 transition-colors",
                  "group hover:bg-muted/10",
                )}
              >
                <ShareAvatar
                  name={info.name}
                  iconType={"iconType" in info ? info.iconType : undefined}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">
                    {info.name}
                    {isCurrentUser && (
                      <span className="ml-1.5 text-muted-foreground">
                        {t("(you)")}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {info.subtitle}
                  </p>
                </div>

                <span className="rounded-md bg-muted/50 px-2 py-1 text-muted-foreground text-xs">
                  {share.permission === "write" ? t("Can edit") : t("Can view")}
                </span>

                {isOwner && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onRemoveAccess(share)}
                    disabled={isDeleting}
                    className={cn(
                      "size-7 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/40",
                    )}
                  >
                    {isDeleting ? (
                      <Spinner className="size-4" />
                    ) : (
                      <XMarkIcon className="size-4" />
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
