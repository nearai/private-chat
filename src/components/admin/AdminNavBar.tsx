import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import MenuLines from "@/assets/icons/menu-lines.svg?react";
import { cn } from "@/lib";
import { ADMIN_ROUTES } from "@/pages/routes";
import { useViewStore } from "@/stores/useViewStore";

const AdminNavBar = () => {
  const { t } = useTranslation("translation");
  const { pathname } = useLocation();
  const isLeftSidebarOpen = useViewStore((state) => state.isLeftSidebarOpen);
  const setIsLeftSidebarOpen = useViewStore((state) => state.setIsLeftSidebarOpen);

  const links = [
    {
      label: t("Users"),
      to: ADMIN_ROUTES.ADMIN_USERS,
    },
    {
      label: "Organization",
      to: ADMIN_ROUTES.ADMIN_ORGANIZATION,
    },
    {
      label: "Workspaces",
      to: ADMIN_ROUTES.ADMIN_WORKSPACES,
    },
    {
      label: "Roles",
      to: ADMIN_ROUTES.ADMIN_ROLES,
    },
    {
      label: "Audit Logs",
      to: ADMIN_ROUTES.ADMIN_AUDIT_LOGS,
    },
    // {
    //   label: t("Evaluations"),
    //   to: ADMIN_ROUTES.ADMIN_EVALUATIONS,
    // },
    // {
    //   label: t("Functions"),
    //   to: ADMIN_ROUTES.ADMIN_FUNCTIONS,
    // },
    // {
    //   label: t("Settings"),
    //   to: ADMIN_ROUTES.ADMIN_SETTINGS,
    // },
  ];

  return (
    <nav className="drag-region px-2.5 pt-1 backdrop-blur-xl">
      <div className="flex items-center gap-1">
        <div className={cn("flex flex-none items-center self-end", isLeftSidebarOpen && "md:hidden")}>
          <button
            id="sidebar-toggle-button"
            className="flex cursor-pointer rounded-xl p-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-850"
            onClick={() => {
              setIsLeftSidebarOpen(!isLeftSidebarOpen);
            }}
            aria-label="Toggle Sidebar"
          >
            <div className="size-5 self-center">
              <MenuLines />
            </div>
          </button>
        </div>
        <div className="flex w-full">
          <div className="scrollbar-none flex w-fit gap-1 overflow-x-auto bg-transparent pt-1 text-center font-medium text-sm">
            {links.map((link) => (
              <Link
                key={link.to}
                className={cn(
                  "min-w-fit p-1.5",
                  link.to !== pathname && "text-muted-foreground transition hover:text-foreground"
                )}
                to={link.to}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavBar;
