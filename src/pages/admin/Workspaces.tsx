import { useState } from "react";
import WorkspaceList from "@/components/admin/workspaces/WorkspaceList";
import WorkspaceForm from "@/components/admin/workspaces/WorkspaceForm";
import { PermissionGate } from "@/components/common/PermissionGate";
import { Button } from "@/components/ui/button";
import type { Workspace } from "@/types/enterprise";

type View = "list" | "create" | "edit";

const AdminWorkspacesPage = () => {
  const [view, setView] = useState<View>("list");
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | undefined>();

  const handleEdit = (workspace: Workspace) => {
    setEditingWorkspace(workspace);
    setView("edit");
  };

  const handleCreate = () => {
    setEditingWorkspace(undefined);
    setView("create");
  };

  const handleSave = () => {
    setView("list");
    setEditingWorkspace(undefined);
  };

  const handleCancel = () => {
    setView("list");
    setEditingWorkspace(undefined);
  };

  return (
    <PermissionGate
      permission="workspaces:read"
      fallback={
        <div className="py-8 text-center text-muted-foreground">
          You don't have permission to view workspaces.
        </div>
      }
    >
      <div className="space-y-6">
        {view === "list" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-xl">Workspaces</h2>
              <Button onClick={handleCreate}>Create Workspace</Button>
            </div>
            <WorkspaceList onEdit={handleEdit} />
          </>
        )}

        {(view === "create" || view === "edit") && (
          <div className="space-y-4">
            <h2 className="font-semibold text-xl">
              {view === "create" ? "Create Workspace" : "Edit Workspace"}
            </h2>
            <WorkspaceForm
              workspace={editingWorkspace}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        )}
      </div>
    </PermissionGate>
  );
};

export default AdminWorkspacesPage;
