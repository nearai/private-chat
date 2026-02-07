import { useMemo } from "react";
import type { Permission } from "@/types/enterprise";

interface PermissionSelectorProps {
  permissions: Permission[];
  selectedIds: string[];
  onToggle: (permissionId: string) => void;
  disabled?: boolean;
}

export function PermissionSelector({
  permissions,
  selectedIds,
  onToggle,
  disabled = false,
}: PermissionSelectorProps) {
  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};

    permissions.forEach((permission) => {
      const module = permission.module || "other";
      if (!groups[module]) {
        groups[module] = [];
      }
      groups[module].push(permission);
    });

    // Sort modules alphabetically
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const handleSelectAll = (modulePermissions: Permission[]) => {
    if (disabled) return;

    const allSelected = modulePermissions.every((p) =>
      selectedIds.includes(p.id)
    );

    modulePermissions.forEach((p) => {
      if (allSelected) {
        // Deselect all if all are selected
        if (selectedIds.includes(p.id)) {
          onToggle(p.id);
        }
      } else {
        // Select all if not all are selected
        if (!selectedIds.includes(p.id)) {
          onToggle(p.id);
        }
      }
    });
  };

  if (permissions.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        Loading permissions...
      </div>
    );
  }

  return (
    <div className="max-h-[400px] space-y-4 overflow-y-auto rounded-lg border border-border p-4">
      {groupedPermissions.map(([module, modulePermissions]) => {
        const allSelected = modulePermissions.every((p) =>
          selectedIds.includes(p.id)
        );
        const someSelected = modulePermissions.some((p) =>
          selectedIds.includes(p.id)
        );

        return (
          <div key={module} className="space-y-2">
            <div className="flex items-center gap-2 border-border border-b pb-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={() => handleSelectAll(modulePermissions)}
                disabled={disabled}
                className="h-4 w-4 rounded border-border disabled:opacity-50"
              />
              <span className="font-medium capitalize">{module}</span>
              <span className="text-muted-foreground text-xs">
                ({modulePermissions.length} permissions)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 pl-6 md:grid-cols-2">
              {modulePermissions.map((permission) => (
                <label
                  key={permission.id}
                  className={`flex items-start gap-2 rounded p-2 hover:bg-muted/50 ${
                    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(permission.id)}
                    onChange={() => onToggle(permission.id)}
                    disabled={disabled}
                    className="mt-0.5 h-4 w-4 rounded border-border disabled:opacity-50"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{permission.name}</div>
                    {permission.description && (
                      <div className="truncate text-muted-foreground text-xs">
                        {permission.description}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PermissionSelector;
