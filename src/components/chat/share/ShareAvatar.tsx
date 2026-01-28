import { UserGroupIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib";
import { getInitials, getAvatarColor } from "./utils";

interface ShareAvatarProps {
  name: string;
  iconType?: "group" | "organization";
}

export const ShareAvatar = ({ name, iconType }: ShareAvatarProps) => {
  const hasIcon = iconType === "group" || iconType === "organization";

  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full font-medium text-white text-xs",
        hasIcon ? "bg-muted text-muted-foreground" : getAvatarColor(name)
      )}
    >
      {iconType === "group" ? (
        <UserGroupIcon className="size-4" />
      ) : iconType === "organization" ? (
        <BuildingOfficeIcon className="size-4" />
      ) : (
        getInitials(name)
      )}
    </div>
  );
};
