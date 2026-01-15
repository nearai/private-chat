import {
  ChevronDownIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib";
import type { ShareGroup, SharePermission } from "@/types";

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
  return (
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
                  onClick={onManageGroups}
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
                    onClick={onAdvancedShare}
                    disabled={isPending}
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
                onClick={onAdvancedShare}
                disabled={!orgPattern.trim() || isPending}
                className="w-full rounded-lg"
              >
                Grant organization access
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
