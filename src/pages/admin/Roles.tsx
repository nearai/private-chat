import { useState } from "react";
import RoleList from "@/components/admin/roles/RoleList";
import RoleForm from "@/components/admin/roles/RoleForm";
import { PermissionGate } from "@/components/common/PermissionGate";
import type { Role } from "@/types/enterprise";

type View = "list" | "create" | "edit";

const AdminRolesPage = () => {
  const [view, setView] = useState<View>("list");
  const [editingRole, setEditingRole] = useState<Role | undefined>();

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setView("edit");
  };

  const handleCreate = () => {
    setEditingRole(undefined);
    setView("create");
  };

  const handleSave = () => {
    setView("list");
    setEditingRole(undefined);
  };

  const handleCancel = () => {
    setView("list");
    setEditingRole(undefined);
  };

  return (
    <PermissionGate
      permission="roles:read"
      fallback={
        <div className="py-8 text-center text-muted-foreground">
          You don't have permission to view roles.
        </div>
      }
    >
      <div className="space-y-6">
        {view === "list" && (
          <RoleList onEdit={handleEdit} onCreate={handleCreate} />
        )}

        {(view === "create" || view === "edit") && (
          <div className="space-y-4">
            <h2 className="font-semibold text-xl">
              {view === "create"
                ? "Create Role"
                : editingRole?.is_system
                  ? "View Role"
                  : "Edit Role"}
            </h2>
            <RoleForm
              role={editingRole}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        )}
      </div>
    </PermissionGate>
  );
};

export default AdminRolesPage;
