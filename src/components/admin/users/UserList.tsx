import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";

// import { ChevronDownIcon, ChevronUpIcon, SearchIcon } from "lucide-react";
// import { useMemo, useState } from "react";
// import { useTranslation } from "react-i18next";
// import { toast } from "sonner";
// import { DEPRECATED_API_BASE_URL } from "@/api/constants";
// import { useUpdateUserRole, useUsers } from "@/api/users/queries";
// import LoadingScreen from "@/components/common/LoadingScreen";
// import { Pagination } from "@/components/common/Pagination";
// import { Badge } from "@/components/ui/badge";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import type { UserRole } from "@/types";

// import { ConfirmDialog } from "@/components/common/dialogs/ConfirmDialog";
// import { AddUserModal } from "@/components/admin/users/AddUserModal";
// import { EditUserModal } from "@/components/admin/users/EditUserModal";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

// type SortKey =
//   | "role"
//   | "name"
//   | "email"
//   | "last_active_at"
//   | "created_at"
//   | "oauth_sub";
// type SortOrder = "asc" | "desc";

// const ITEMS_PER_PAGE = 20;

const UserList = () => {
  // const { t } = useTranslation("translation");
  // const [search, setSearch] = useState("");
  // const [sortKey, setSortKey] = useState<SortKey>("created_at");
  // const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  // const [currentPage, setCurrentPage] = useState(1);

  //TODO: Modal states - commented out for future implementation
  // const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  // const [showAddUserModal, setShowAddUserModal] = useState(false);
  // const [showEditUserModal, setShowEditUserModal] = useState(false);
  // const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // const { data: users = [], isLoading } = useUsers();
  // const updateRoleMutation = useUpdateUserRole({
  //   onSuccess: () => {
  //     toast.success("User role updated successfully");
  //   },
  //   onError: (error) => {
  //     toast.error(`Failed to update role: ${error.message}`);
  //   },
  // });

  //TODO: Commented out for future implementation when delete modal is ready
  // const deleteUserMutation = useDeleteUser({
  //   onSuccess: () => {
  //     toast.success("User deleted successfully");
  //   },
  //   onError: (error) => {
  //     toast.error(`Failed to delete user: ${error.message}`);
  //   },
  // });

  // const handleSortChange = (key: SortKey) => {
  //   if (sortKey === key) {
  //     setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  //   } else {
  //     setSortKey(key);
  //     setSortOrder("asc");
  //   }
  // };

  // const handleUpdateRole = async (id: string, currentRole: UserRole) => {
  //   let newRole: UserRole;
  //   if (currentRole === "user") {
  //     newRole = "admin";
  //   } else if (currentRole === "pending") {
  //     newRole = "user";
  //   } else {
  //     newRole = "pending";
  //   }

  //   updateRoleMutation.mutate({ id, role: newRole });
  // };

  // const handleDeleteUser = async (id: string) => {
  //   deleteUserMutation.mutate({ id });
  // };

  // const filteredAndSortedUsers = useMemo(() => {
  //   return users
  //     .filter((user) => {
  //       if (search === "") return true;
  //       const name = user.name.toLowerCase();
  //       const email = user.email.toLowerCase();
  //       const query = search.toLowerCase();
  //       return name.includes(query) || email.includes(query);
  //     })
  //     .sort((a, b) => {
  //       const aValue = a[sortKey];
  //       const bValue = b[sortKey];

  //       if (aValue === undefined || aValue === null) return 1;
  //       if (bValue === undefined || bValue === null) return -1;

  //       if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
  //       if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
  //       return 0;
  //     });
  // }, [users, search, sortKey, sortOrder]);

  // const paginatedUsers = useMemo(() => {
  //   const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  //   return filteredAndSortedUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  // }, [filteredAndSortedUsers, currentPage]);

  // const totalPages = Math.ceil(filteredAndSortedUsers.length / ITEMS_PER_PAGE);

  // const renderSortIcon = (key: SortKey) => {
  //   if (sortKey === key) {
  //     return sortOrder === "asc" ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />;
  //   }
  //   return <ChevronUpIcon className="invisible h-3 w-3" />;
  // };

  // const getBadgeVariant = (role: UserRole) => {
  //   switch (role) {
  //     case "admin":
  //       return "default";
  //     case "user":
  //       return "secondary";
  //     case "pending":
  //       return "outline";
  //     default:
  //       return "outline";
  //   }
  // };

  // if (isLoading) {
  //   return <LoadingScreen />;
  // }

  return (
    <div>UserList</div>
    // <div className="flex flex-col gap-4">
    //   {/* <ConfirmDialog
    //     show={showDeleteConfirmDialog}
    //     onConfirm={() => {
    //       if (selectedUser) {
    //         handleDeleteUser(selectedUser.id);
    //         setShowDeleteConfirmDialog(false);
    //       }
    //     }}
    //     onCancel={() => setShowDeleteConfirmDialog(false)}
    //   /> */}

    //   {/* <EditUserModal
    //     show={showEditUserModal}
    //     selectedUser={selectedUser}
    //     onClose={() => setShowEditUserModal(false)}
    //     onSave={() => {
    //       setShowEditUserModal(false);
    //     }}
    //   /> */}

    //   {/* <AddUserModal
    //     show={showAddUserModal}
    //     onClose={() => setShowAddUserModal(false)}
    //     onSave={() => {
    //       setShowAddUserModal(false);
    //     }}
    //   /> */}

    //   <div className="mt-0.5 mb-2 flex flex-col justify-between gap-1 md:flex-row">
    //     <div className="flex px-0.5 font-medium text-lg md:self-center">
    //       <p className="flex-shrink-0">{t("Users")}</p>
    //       <div className="mx-2.5 h-6 w-[1px] self-center bg-gray-50 dark:bg-gray-850" />
    //       <span className="font-medium text-gray-500 text-lg dark:text-gray-300">{users.length}</span>
    //     </div>

    //     <div className="flex w-full gap-1 space-x-2 md:w-auto">
    //       <div className="flex flex-1">
    //         <div className="mr-3 ml-1 self-center">
    //           <SearchIcon className="h-4 w-4" />
    //         </div>
    //         <input
    //           className="w-full rounded-r-xl bg-transparent py-1 pr-4 text-sm outline-hidden"
    //           value={search}
    //           onChange={(e) => setSearch(e.target.value)}
    //           placeholder={t("Search")}
    //         />
    //       </div>

    //       {/* <div>
    //         <CompactTooltip content={t("Add User")}>
    //           <button
    //             className="flex items-center space-x-1 rounded-xl p-2 font-medium text-sm transition hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-850"
    //             onClick={() => {
    //               // setShowAddUserModal(true);
    //             }}
    //           >
    //             <PlusIcon className="h-3.5 w-3.5" />
    //           </button>
    //         </CompactTooltip>
    //       </div> */}
    //     </div>
    //   </div>

    //   <Table containerClassName="whitespace-nowrap rounded-sm text-left text-gray-500 text-sm dark:text-gray-400">
    //     <TableHeader className="-translate-y-0.5 bg-gray-50 text-gray-700 text-xs uppercase dark:bg-gray-850 dark:text-gray-400">
    //       <TableRow>
    //         <TableHead className="cursor-pointer select-none px-3 py-1.5" onClick={() => handleSortChange("role")}>
    //           <div className="flex items-center gap-1.5">
    //             {t("Role")}
    //             {renderSortIcon("role")}
    //           </div>
    //         </TableHead>
    //         <TableHead className="cursor-pointer select-none px-3 py-1.5" onClick={() => handleSortChange("name")}>
    //           <div className="flex items-center gap-1.5">
    //             {t("Name")}
    //             {renderSortIcon("name")}
    //           </div>
    //         </TableHead>
    //         <TableHead className="cursor-pointer select-none px-3 py-1.5" onClick={() => handleSortChange("email")}>
    //           <div className="flex items-center gap-1.5">
    //             {t("Email")}
    //             {renderSortIcon("email")}
    //           </div>
    //         </TableHead>
    //         <TableHead
    //           className="cursor-pointer select-none px-3 py-1.5"
    //           onClick={() => handleSortChange("last_active_at")}
    //         >
    //           <div className="flex items-center gap-1.5">
    //             {t("Last Active")}
    //             {renderSortIcon("last_active_at")}
    //           </div>
    //         </TableHead>
    //         <TableHead
    //           className="cursor-pointer select-none px-3 py-1.5"
    //           onClick={() => handleSortChange("created_at")}
    //         >
    //           <div className="flex items-center gap-1.5">
    //             {t("Created at")}
    //             {renderSortIcon("created_at")}
    //           </div>
    //         </TableHead>
    //         <TableHead className="cursor-pointer select-none px-3 py-1.5" onClick={() => handleSortChange("oauth_sub")}>
    //           <div className="flex items-center gap-1.5">
    //             {t("OAuth ID")}
    //             {renderSortIcon("oauth_sub")}
    //           </div>
    //         </TableHead>
    //         <TableHead className="px-3 py-2 text-right" />
    //       </TableRow>
    //     </TableHeader>
    //     <TableBody>
    //       {paginatedUsers.map((user) => (
    //         <TableRow key={user.id} className="bg-white text-xs dark:border-gray-850 dark:bg-gray-900">
    //           <TableCell className="w-28 min-w-[7rem] px-3 py-1">
    //             <button
    //               className="translate-y-0.5"
    //               onClick={() => handleUpdateRole(user.id, user.role)}
    //               disabled={updateRoleMutation.isPending}
    //             >
    //               <Badge variant={getBadgeVariant(user.role)}>{user.role}</Badge>
    //             </button>
    //           </TableCell>
    //           <TableCell className="w-max px-3 py-1 font-medium text-gray-900">
    //             <div className="flex w-max flex-row">
    //               <img
    //                 className="mr-2.5 h-6 w-6 rounded-full object-cover"
    //                 src={
    //                   user.profile_image_url?.startsWith(DEPRECATED_API_BASE_URL) ||
    //                   user.profile_image_url?.startsWith("https://www.gravatar.com/avatar/") ||
    //                   user.profile_image_url?.startsWith("data:")
    //                     ? user.profile_image_url
    //                     : "/user.png"
    //                 }
    //                 alt={user.name}
    //               />
    //               <div className="self-center font-medium">{user.name}</div>
    //             </div>
    //           </TableCell>
    //           <TableCell className="px-3 py-1">{user.email}</TableCell>
    //           <TableCell className="px-3 py-1">{dayjs(user.last_active_at * 1000).fromNow()}</TableCell>
    //           <TableCell className="px-3 py-1">{dayjs(user.created_at * 1000).format("LL")}</TableCell>
    //           <TableCell className="px-3 py-1">{user.oauth_sub ?? ""}</TableCell>
    //         </TableRow>
    //       ))}
    //     </TableBody>
    //   </Table>

    //   <div className="mt-1.5 text-right text-gray-500 text-xs">
    //     ⓘ {t("Click on the user role button to change a user's role.")}
    //   </div>

    //   <Pagination
    //     currentPage={currentPage}
    //     totalPages={totalPages}
    //     totalItems={filteredAndSortedUsers.length}
    //     onPageChange={setCurrentPage}
    //   />
    // </div>
  );
};

export default UserList;
