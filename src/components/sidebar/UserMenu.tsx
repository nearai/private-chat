import { ArchiveBoxIcon, ArrowRightStartOnRectangleIcon, Cog8ToothIcon } from "@heroicons/react/24/outline";
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
import { cn } from "@/lib/time";

interface DropdownItem {
  title?: string;
  icon?: React.ReactNode;
  type: "item" | "separator";
  action?: () => void | Promise<void>;
  className?: string;
}

const UserMenu: React.FC<{ collapsed?: boolean }> = ({ collapsed = false }) => {
  // const navigate = useNavigate();
  const { t } = useTranslation("translation", { useSuspense: false });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isArchivedChatsOpen, setIsArchivedChatsOpen] = useState(false);

  const { data: userData } = useUserData();
  const { mutateAsync: signOut } = useSignOut();

  // const isAdmin = user?.role === "admin";

  const dropdownItems = useMemo<DropdownItem[]>(() => {
    const items: (DropdownItem | false)[] = [
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
  }, [t, signOut]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center outline-none">
          <div className="self-center">
            <img
              src={userData?.user.avatar_url || "/user.png"}
              alt="User"
              className="max-w-[30px] rounded-full object-cover"
            />
          </div>
          {!collapsed && <div className="ml-3 self-center font-medium">{userData?.user.name}</div>}
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
