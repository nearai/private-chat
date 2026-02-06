import {
  ChevronDownIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib";
import type { ConversationShareInfo, ShareGroup, SharePermission } from "@/types";

type AdvancedMode = "group" | "organization" | null;

interface AdvancedSharingSectionProps {
  showAdvanced: boolean;
  setShowAdvanced: (value: boolean) => void;
  advancedMode: AdvancedMode;
  setAdvancedMode: (value: AdvancedMode) => void;
  selectedGroupId: string;
  setSelectedGroupId: (value: string) => void;
  orgPattern: string;
  setOrgPattern: (value: string) => void;
  shareGroups: ShareGroup[];
  peopleShares: ConversationShareInfo[];
  permission: SharePermission;
  isPending: boolean;
  onAdvancedShare: () => Promise<void>;
  onManageGroups: () => void;
}

export const AdvancedSharingSection = ({
  showAdvanced,
  setShowAdvanced,
  advancedMode,
  setAdvancedMode,
  selectedGroupId,
  setSelectedGroupId,
  orgPattern,
  setOrgPattern,
  shareGroups,
  isPending,
  onAdvancedShare,
  onManageGroups,
}: AdvancedSharingSectionProps) => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const availableShareGroups = shareGroups;

  return (
    <div className="border-border/50 border-t pt-2">
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
      >
        <ChevronDownIcon
          className={cn(
            "size-4 transition-transform",
            showAdvanced && "rotate-180",
          )}
        />
        {t("Advanced sharing options")}
      </button>

      {showAdvanced && (
        <div className="mt-4 space-y-3">
          {/* Advanced option buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                setAdvancedMode(advancedMode === "group" ? null : "group")
              }
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border/40 p-3 text-left transition-all hover:border-muted-foreground/50",
                advancedMode === "group" && "border-muted-foreground/50",
              )}
            >
              <UserGroupIcon className="size-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{t("Share with group")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("Reuse saved lists")}
                </p>
              </div>
            </button>

            <button
              onClick={() =>
                setAdvancedMode(
                  advancedMode === "organization" ? null : "organization",
                )
              }
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border/40 p-3 text-left transition-all hover:border-muted-foreground/50",
                advancedMode === "organization" && "border-muted-foreground/50",
              )}
            >
              <BuildingOfficeIcon className="size-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{t("Organization")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("By email domain")}
                </p>
              </div>
            </button>
          </div>

          {/* Group selection */}
          {advancedMode === "group" && (
            <div className="space-y-3 rounded-xl border border-border/40 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{t("Select a group")}</p>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={onManageGroups}
                  className="h-7 text-muted-foreground text-xs hover:text-foreground"
                >
                  {t("Manage groups")}
                </Button>
              </div>

              {availableShareGroups.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t(
                    "No groups yet. Create one to save frequent collaborators.",
                  )}
                </p>
              ) : (
                <>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {availableShareGroups
                      .map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name} (
                          {t("{{count}} members", {
                            count: group.members.length,
                          })}
                          )
                        </option>
                      ))}
                  </select>
                  <Button
                    onClick={onAdvancedShare}
                    disabled={isPending}
                    className="w-full rounded-lg"
                  >
                    {isPending ? t("Sharing...") : t("Share with group")}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Organization pattern */}
          {advancedMode === "organization" && (
            <div className="space-y-3 rounded-xl border border-border/40 p-4">
              <div>
                <p className="mb-1 font-medium text-sm">
                  {t("Email domain pattern")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("Anyone with a matching email address will have access")}
                </p>
              </div>
              <input
                type="text"
                value={orgPattern}
                onChange={(e) => setOrgPattern(e.target.value)}
                placeholder={t("e.g. @company.com or %@company.com")}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button
                onClick={onAdvancedShare}
                disabled={!orgPattern.trim() || isPending}
                className="w-full rounded-lg"
              >
                {t("Grant organization access")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
