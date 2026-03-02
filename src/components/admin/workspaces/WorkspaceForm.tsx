import { useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  Workspace,
} from "@/types/enterprise";
import { workspaceClient } from "@/api/workspace/client";
import { toast } from "sonner";

interface WorkspaceFormProps {
  workspace?: Workspace;
  onSave?: (workspace: Workspace) => void;
  onCancel?: () => void;
}

export function WorkspaceForm({ workspace, onSave, onCancel }: WorkspaceFormProps) {
  const isEdit = !!workspace;
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: workspace?.name || "",
    slug: workspace?.slug || "",
    description: workspace?.description || "",
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({
      ...formData,
      name,
      slug: isEdit ? formData.slug : generateSlug(name),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result: Workspace;

      if (isEdit) {
        const updateData: UpdateWorkspaceRequest = {
          name: formData.name,
          description: formData.description || undefined,
        };
        result = await workspaceClient.updateWorkspace(workspace.id, updateData);
        toast.success("Workspace updated");
      } else {
        const createData: CreateWorkspaceRequest = {
          name: formData.name,
          slug: formData.slug,
          description: formData.description || undefined,
        };
        result = await workspaceClient.createWorkspace(createData);
        toast.success("Workspace created");
      }

      onSave?.(result);
    } catch (error) {
      toast.error(isEdit ? "Failed to update workspace" : "Failed to create workspace");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block font-medium text-sm">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={handleNameChange}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="My Workspace"
          required
        />
      </div>

      <div>
        <label className="mb-1 block font-medium text-sm">Slug</label>
        <input
          type="text"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted"
          placeholder="my-workspace"
          disabled={isEdit}
          required
        />
        <p className="mt-1 text-muted-foreground text-sm">
          Used in URLs. {isEdit ? "Cannot be changed." : "Auto-generated from name."}
        </p>
      </div>

      <div>
        <label className="mb-1 block font-medium text-sm">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Optional description..."
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : isEdit ? "Save Changes" : "Create Workspace"}
        </Button>
      </div>
    </form>
  );
}

export default WorkspaceForm;
