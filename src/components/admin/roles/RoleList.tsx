import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Role } from "@/types/enterprise";
import { rolesClient } from "@/api/roles/client";
import { toast } from "sonner";

interface RoleListProps {
  onEdit?: (role: Role) => void;
  onCreate?: () => void;
}

export function RoleList({ onEdit, onCreate }: RoleListProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setIsLoading(true);
    try {
      const response = await rolesClient.listRoles();
      setRoles(response.roles);
    } catch (error) {
      toast.error("Failed to load roles");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.is_system) {
      toast.error("System roles cannot be deleted");
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      return;
    }

    try {
      await rolesClient.deleteRole(role.id);
      toast.success("Role deleted");
      loadRoles();
    } catch (error) {
      toast.error("Failed to delete role");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg">Roles</h3>
        <Button onClick={onCreate}>Create Role</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="font-medium">{role.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {role.description || "-"}
              </TableCell>
              <TableCell>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    role.is_system
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-gray-500/10 text-gray-500"
                  }`}
                >
                  {role.is_system ? "System" : "Custom"}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">
                  {role.permissions.length} permissions
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => onEdit?.(role)}
                  >
                    {role.is_system ? "View" : "Edit"}
                  </Button>
                  {!role.is_system && (
                    <Button
                      variant="ghost"
                      size="small"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(role)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default RoleList;
