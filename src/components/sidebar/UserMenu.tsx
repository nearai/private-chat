import { ArchiveBoxIcon, ArrowRightStartOnRectangleIcon, Cog8ToothIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
// import { useNavigate } from "react-router";
import { useSignOut } from "@/api/auth/queries";
import { useUserData } from "@/api/users/queries/useUserData";
import ArchivedChatsModal from "@/components/common/dialogs/archived-chats/ArchivedChatsModal";
import SettingsDialog from "@/components/common/dialogs/settings/SettingsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useIsOnline } from "@/hooks/useIsOnline";

interface DropdownItem {
  title?: string;
  icon?: React.ReactNode;
  type: "item" | "separator";
  action?: () => void | Promise<void>;
  className?: string;
}

interface UserMenuProps {
  collapsed?: boolean;
  onSearchOpen?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ collapsed = false, onSearchOpen }) => {
  // const navigate = useNavigate();
  const { t } = useTranslation("translation", { useSuspense: false });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isArchivedChatsOpen, setIsArchivedChatsOpen] = useState(false);

  const { data: userData } = useUserData();
  const { mutateAsync: signOut } = useSignOut();
  const isOnline = useIsOnline();

  // const isAdmin = user?.role === "admin";

  const dropdownItems = useMemo<DropdownItem[]>(() => {
    const items: (DropdownItem | false)[] = [
      {
        title: t("Search"),
        icon: <MagnifyingGlassIcon className="h-5 w-5" />,
        type: "item",
        action: () => onSearchOpen?.(),
      },
      {
        title: t("Settings"),
        icon: <Cog8ToothIcon className="h-5 w-5" />,
        type: "item",
        action: () => setIsSettingsOpen(true),
      },
      {
        title: t("Archived Chats"),
        icon: <ArchiveBoxIcon className="h-5 w-5" />,
        type: "item",
        action: () => setIsArchivedChatsOpen(true),
      },
      // isAdmin && {
      //   title: t("Admin Panel"),
      //   icon: <UserCircleIcon className="!h-5 !w-5" />,
      //   type: "item",
      //   action: () => navigate(APP_ROUTES.ADMIN),
      // },
      { type: "separator" },
      {
        title: t("Sign Out"),
        icon: <ArrowRightStartOnRectangleIcon className="h-5 w-5" />,
        type: "item",
        action: async () => await signOut(),
        className:
          "bg-destructive/10 text-destructive-foreground hover:bg-destructive/20! hover:text-destructive-foreground!",
      },
    ];

    return items.filter(Boolean) as DropdownItem[];
  }, [t, signOut, onSearchOpen]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center outline-none">
          <div className="relative self-center">
            <Avatar className="size-[30px]">
              <AvatarImage src={userData?.user.avatar_url} alt={userData?.user.name ? `${userData.user.name}'s avatar` : "User avatar"} />
              <AvatarFallback className="bg-muted/35">{(userData?.user.name || "U").slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "-bottom-0.5 -right-0.5 absolute h-2.5 w-2.5 rounded-full border border-background",
                isOnline ? "bg-green-500" : "bg-red-500"
              )}
            />
          </div>
          {!collapsed && <div className="ml-3 self-center whitespace-pre-wrap break-all font-medium">{userData?.user.name}</div>}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full min-w-[240px] rounded-xl px-1 py-1.5" side="top" align="start">
          {dropdownItems.map((el, index) => (
            <React.Fragment key={`${el.type}-${index}`}>
              {el.type === "separator" && <DropdownMenuSeparator />}
              {el.type === "item" && (
                <DropdownMenuItem className={cn("flex flex-row gap-2 px-3 py-2", el.className)} onClick={el.action}>
                  {el.icon} {el.title}
                </DropdownMenuItem>
              )}
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <ArchivedChatsModal open={isArchivedChatsOpen} onOpenChange={setIsArchivedChatsOpen} />
    </>
  );
};

export default UserMenu;
