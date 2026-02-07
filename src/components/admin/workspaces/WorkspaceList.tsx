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
import type { Workspace } from "@/types/enterprise";
import { workspaceClient } from "@/api/workspace/client";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { toast } from "sonner";

interface WorkspaceListProps {
  onSelect?: (workspace: Workspace) => void;
  onEdit?: (workspace: Workspace) => void;
}

export function WorkspaceList({ onSelect, onEdit }: WorkspaceListProps) {
  const [isLoading, setIsLoading] = useState(true);
  const { workspaces, setWorkspaces, currentWorkspace, setCurrentWorkspace } =
    useWorkspaceStore();

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    setIsLoading(true);
    try {
      const response = await workspaceClient.listWorkspaces();
      setWorkspaces(response.workspaces);
    } catch (error) {
      toast.error("Failed to load workspaces");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitch = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    toast.success(`Switched to ${workspace.name}`);
    onSelect?.(workspace);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No workspaces found</p>
        <Button className="mt-4" onClick={() => onEdit?.(null as any)}>
          Create Workspace
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workspaces.map((workspace) => (
            <TableRow key={workspace.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {workspace.name}
                  {workspace.is_default && (
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-primary text-xs">
                      Default
                    </span>
                  )}
                  {currentWorkspace?.id === workspace.id && (
                    <span className="rounded bg-green-500/10 px-2 py-0.5 text-green-500 text-xs">
                      Current
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {workspace.description || "-"}
              </TableCell>
              <TableCell>
                <span
                  className={`rounded px-2 py-0.5 text-xs capitalize ${
                    workspace.status === "active"
                      ? "bg-green-500/10 text-green-500"
                      : "bg-yellow-500/10 text-yellow-500"
                  }`}
                >
                  {workspace.status}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {currentWorkspace?.id !== workspace.id && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => handleSwitch(workspace)}
                    >
                      Switch
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => onEdit?.(workspace)}
                  >
                    Edit
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default WorkspaceList;
