import { UserGroupIcon, UsersIcon } from "@heroicons/react/24/solid";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Groups from "@/components/admin/users/Groups";
import UserList from "@/components/admin/users/UserList";
import TabbedContent from "@/components/common/TabbedContent";

const AdminUsersPage = () => {
  const { t } = useTranslation("translation", { useSuspense: false });
  const tabs = useMemo(
    () =>
      [
        {
          id: "overview",
          label: t("Overview"),
          icon: UsersIcon,
          content: <UserList />,
        },
        {
          id: "groups",
          label: t("Groups"),
          icon: UserGroupIcon,
          content: <Groups />,
        },
      ] as const,
    [t]
  );

  return <TabbedContent tabs={tabs} defaultTab="overview" />;
};

export default AdminUsersPage;
