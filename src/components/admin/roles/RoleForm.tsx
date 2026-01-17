import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { Role, Permission, CreateRoleRequest } from "@/types/enterprise";
import { rolesClient } from "@/api/roles/client";
import { toast } from "sonner";
import { PermissionSelector } from "./PermissionSelector";

interface RoleFormProps {
  role?: Role;
  onSave?: (role: Role) => void;
  onCancel?: () => void;
}

export function RoleForm({ role, onSave, onCancel }: RoleFormProps) {
  const isEdit = !!role;
  const isViewOnly = role?.is_system;
  const [isLoading, setIsLoading] = useState(false);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [formData, setFormData] = useState({
    name: role?.name || "",
    description: role?.description || "",
    permission_ids: role?.permissions.map((p) => p.id) || [],
  });

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const response = await rolesClient.listPermissions();
      setAllPermissions(response.permissions);
    } catch (error) {
      toast.error("Failed to load permissions");
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewOnly) return;

    setIsLoading(true);

    try {
      let result: Role;

      if (isEdit) {
        result = await rolesClient.updateRole(role.id, {
          name: formData.name,
          description: formData.description || undefined,
          permission_ids: formData.permission_ids,
        });
        toast.success("Role updated");
      } else {
        const createData: CreateRoleRequest = {
          name: formData.name,
          description: formData.description || undefined,
          permission_ids: formData.permission_ids,
        };
        result = await rolesClient.createRole(createData);
        toast.success("Role created");
      }

      onSave?.(result);
    } catch (error) {
      toast.error(isEdit ? "Failed to update role" : "Failed to create role");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    if (isViewOnly) return;

    setFormData((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permissionId)
        ? prev.permission_ids.filter((id) => id !== permissionId)
        : [...prev.permission_ids, permissionId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block font-medium text-sm">Role Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted"
            placeholder="e.g., Project Manager"
            disabled={isViewOnly}
            required
          />
        </div>

        <div>
          <label className="mb-1 block font-medium text-sm">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="min-h-[60px] w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted"
            placeholder="Optional description..."
            disabled={isViewOnly}
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block font-medium text-sm">Permissions</label>
        <PermissionSelector
          permissions={allPermissions}
          selectedIds={formData.permission_ids}
          onToggle={handlePermissionToggle}
          disabled={isViewOnly}
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {isViewOnly ? "Close" : "Cancel"}
          </Button>
        )}
        {!isViewOnly && (
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : isEdit ? "Save Changes" : "Create Role"}
          </Button>
        )}
      </div>
    </form>
  );
}

export default RoleForm;
