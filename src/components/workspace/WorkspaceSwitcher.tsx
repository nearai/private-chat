import { useState, useEffect, useRef, useCallback } from "react";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { workspaceClient } from "@/api/workspace/client";
import type { Workspace } from "@/types/enterprise";
import { toast } from "sonner";
import {
  ChevronUpDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  CheckIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";

interface WorkspaceSwitcherProps {
  compact?: boolean;
  onCreateWorkspace?: () => void;
}

export function WorkspaceSwitcher({ compact = false, onCreateWorkspace }: WorkspaceSwitcherProps) {
  const {
    currentWorkspace,
    workspaces,
    recentWorkspaces,
    setCurrentWorkspace,
    setWorkspaces,
    addRecentWorkspace,
  } = useWorkspaceStore();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch workspaces on mount
  useEffect(() => {
    fetchWorkspaces();
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    try {
      const response = await workspaceClient.listWorkspaces();
      setWorkspaces(response.workspaces);

      // Set current workspace if not set and there are workspaces
      if (!currentWorkspace && response.workspaces.length > 0) {
        const defaultWorkspace = response.workspaces.find(w => w.is_default) || response.workspaces[0];
        setCurrentWorkspace(defaultWorkspace);
      }
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectWorkspace = useCallback((workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    addRecentWorkspace(workspace.id);
    setIsOpen(false);
    setSearch("");
    toast.success(`Switched to ${workspace.name}`);
  }, [setCurrentWorkspace, addRecentWorkspace]);

  // Filter workspaces based on search
  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(search.toLowerCase()) ||
    ws.slug.toLowerCase().includes(search.toLowerCase())
  );

  // Get recent workspaces (excluding current)
  const recentWorkspacesList = recentWorkspaces
    .filter((id) => id !== currentWorkspace?.id)
    .map((id) => workspaces.find((ws) => ws.id === id))
    .filter(Boolean) as Workspace[];

  // Sort: recent first, then alphabetically
  const sortedWorkspaces = search
    ? filteredWorkspaces
    : [
        ...recentWorkspacesList.slice(0, 3),
        ...filteredWorkspaces.filter((ws) => !recentWorkspacesList.includes(ws)),
      ];

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-muted"
          title="Switch workspace (Cmd+K)"
        >
          <BuildingOfficeIcon className="h-4 w-4" />
          <span className="max-w-[100px] truncate">{currentWorkspace?.name || "Select"}</span>
          <ChevronUpDownIcon className="h-3 w-3" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-lg border border-border bg-background shadow-lg">
            <WorkspaceDropdownContent
              search={search}
              setSearch={setSearch}
              searchInputRef={searchInputRef}
              sortedWorkspaces={sortedWorkspaces}
              currentWorkspace={currentWorkspace}
              recentWorkspacesList={recentWorkspacesList}
              isLoading={isLoading}
              onSelect={handleSelectWorkspace}
              onCreateWorkspace={onCreateWorkspace}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <BuildingOfficeIcon className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">{currentWorkspace?.name || "Select Workspace"}</p>
            {currentWorkspace && (
              <p className="text-muted-foreground text-xs">{currentWorkspace.slug}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="hidden rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs sm:inline-block">
            {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+K
          </kbd>
          <ChevronUpDownIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-lg">
          <WorkspaceDropdownContent
            search={search}
            setSearch={setSearch}
            searchInputRef={searchInputRef}
            sortedWorkspaces={sortedWorkspaces}
            currentWorkspace={currentWorkspace}
            recentWorkspacesList={recentWorkspacesList}
            isLoading={isLoading}
            onSelect={handleSelectWorkspace}
            onCreateWorkspace={onCreateWorkspace}
          />
        </div>
      )}
    </div>
  );
}

interface WorkspaceDropdownContentProps {
  search: string;
  setSearch: (search: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  sortedWorkspaces: Workspace[];
  currentWorkspace: Workspace | null;
  recentWorkspacesList: Workspace[];
  isLoading: boolean;
  onSelect: (workspace: Workspace) => void;
  onCreateWorkspace?: () => void;
}

function WorkspaceDropdownContent({
  search,
  setSearch,
  searchInputRef,
  sortedWorkspaces,
  currentWorkspace,
  recentWorkspacesList,
  isLoading,
  onSelect,
  onCreateWorkspace,
}: WorkspaceDropdownContentProps) {
  return (
    <>
      {/* Search */}
      <div className="border-border border-b p-2">
        <div className="flex items-center gap-2 rounded-md bg-muted px-2">
          <MagnifyingGlassIcon className="h-4 w-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workspaces..."
            className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Workspace list */}
      <div className="max-h-64 overflow-y-auto p-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-primary border-b-2" />
          </div>
        ) : sortedWorkspaces.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground text-sm">
            {search ? "No workspaces found" : "No workspaces available"}
          </div>
        ) : (
          <>
            {!search && recentWorkspacesList.length > 0 && (
              <div className="mb-1 px-2 pt-1 text-muted-foreground text-xs">Recent</div>
            )}
            {sortedWorkspaces.map((workspace, index) => {
              const showSeparator = !search && index === recentWorkspacesList.length && recentWorkspacesList.length > 0;

              return (
                <div key={workspace.id}>
                  {showSeparator && (
                    <>
                      <div className="my-1 border-border border-t" />
                      <div className="mb-1 px-2 pt-1 text-muted-foreground text-xs">All Workspaces</div>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(workspace)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${
                      currentWorkspace?.id === workspace.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BuildingOfficeIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{workspace.name}</p>
                        <p className="text-muted-foreground text-xs">{workspace.slug}</p>
                      </div>
                    </div>
                    {currentWorkspace?.id === workspace.id && (
                      <CheckIcon className="h-4 w-4 text-primary" />
                    )}
                    {workspace.is_default && currentWorkspace?.id !== workspace.id && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary text-xs">
                        Default
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Create workspace button */}
      {onCreateWorkspace && (
        <div className="border-border border-t p-1">
          <button
            type="button"
            onClick={onCreateWorkspace}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground text-sm hover:bg-muted hover:text-foreground"
          >
            <PlusIcon className="h-4 w-4" />
            Create new workspace
          </button>
        </div>
      )}
    </>
  );
}

export default WorkspaceSwitcher;
