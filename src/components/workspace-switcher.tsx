import { memo, useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { CaretUpDown, CheckIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { RepositoryId, ThreadId, WorkspaceId } from "@/lib/types";

// ---------------------------------------------------------------------------
// Color mapping — maps the schema's color literal to Tailwind classes.
// ---------------------------------------------------------------------------

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
  orange: "bg-orange-500",
  teal: "bg-teal-500",
};

function getColorBg(color: string) {
  return COLOR_MAP[color] ?? COLOR_MAP.blue;
}

// ---------------------------------------------------------------------------
// Small color dot — sits next to the workspace name in the dropdown list.
// ---------------------------------------------------------------------------

function WorkspaceDot({ color }: { color: string }) {
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${getColorBg(color)}`} />;
}

// ---------------------------------------------------------------------------
// Workspace selector — a dropdown that shows the current workspace name and
// lets the user switch, create, or delete workspaces. Sits next to the
// compact profile avatar in the sidebar footer row.
// ---------------------------------------------------------------------------

export const WorkspaceSelector = memo(function WorkspaceSelector({
  workspaces,
  activeWorkspaceId,
  onSwitchWorkspace,
  repositories,
  onImported,
}: {
  workspaces: Doc<"workspaces">[] | undefined;
  activeWorkspaceId: WorkspaceId | null;
  onSwitchWorkspace: (id: WorkspaceId) => void;
  repositories: Doc<"repositories">[] | undefined;
  onImported: (repoId: RepositoryId, threadId: ThreadId | null) => void;
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<WorkspaceId | null>(null);
  const deleteWorkspaceMutation = useMutation(api.workspaces.deleteWorkspace);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);

  const activeWorkspace = workspaces?.find((ws) => ws._id === activeWorkspaceId);

  const handleDeleteWorkspace = useCallback(async () => {
    if (!workspaceToDelete) return;
    setIsDeletingWorkspace(true);
    try {
      await deleteWorkspaceMutation({ workspaceId: workspaceToDelete });
      setWorkspaceToDelete(null);
    } catch {
      // Silently fail.
    } finally {
      setIsDeletingWorkspace(false);
    }
  }, [workspaceToDelete, deleteWorkspaceMutation]);

  if (workspaces === undefined) {
    return (
      <div className="min-w-0 flex-1">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
          >
            {activeWorkspace && <WorkspaceDot color={activeWorkspace.color} />}
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {activeWorkspace?.name ?? "Select workspace"}
            </span>
            <CaretUpDown size={14} weight="bold" className="shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="start" className="w-56">
          {/* Workspace list */}
          {workspaces.map((ws) => {
            const isActive = ws._id === activeWorkspaceId;
            return (
              <DropdownMenuItem
                key={ws._id}
                onClick={() => {
                  if (!isActive) onSwitchWorkspace(ws._id);
                }}
                className="gap-2"
              >
                <WorkspaceDot color={ws.color} />
                <span className="min-w-0 flex-1 truncate">{ws.name}</span>
                {isActive && <CheckIcon size={14} weight="bold" className="shrink-0 text-primary" />}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />

          {/* Create new workspace */}
          <DropdownMenuItem onClick={() => setShowCreateDialog(true)} className="gap-2">
            <PlusIcon size={14} weight="bold" className="shrink-0" />
            <span>New workspace</span>
          </DropdownMenuItem>

          {/* Delete current workspace — only repo-bound workspaces can be deleted */}
          {activeWorkspace && activeWorkspace.repositoryId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                onClick={() => setWorkspaceToDelete(activeWorkspace._id)}
              >
                <TrashIcon size={14} weight="bold" className="shrink-0" />
                <span>Delete {activeWorkspace.name}</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        repositories={repositories}
        onCreated={(workspaceId) => {
          onSwitchWorkspace(workspaceId);
          setShowCreateDialog(false);
        }}
        onImported={onImported}
      />

      <ConfirmDialog
        open={workspaceToDelete !== null}
        onOpenChange={(open) => !open && setWorkspaceToDelete(null)}
        title="Delete workspace"
        description="This will delete the workspace. Threads inside it will be kept but unlinked. This action cannot be undone."
        actionLabel="Delete workspace"
        loadingLabel="Deleting..."
        isPending={isDeletingWorkspace}
        onConfirm={() => void handleDeleteWorkspace()}
      />
    </>
  );
});
