import { memo } from "react";
import { CaretUpDown, CheckIcon, GitBranchIcon } from "@phosphor-icons/react";
import type { Doc } from "../../convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImportRepoDialog } from "@/components/import-repo-dialog";
import type { RepositoryId, ThreadId, WorkspaceId } from "@/lib/types";

// ---------------------------------------------------------------------------
// Workspace selector — a dropdown that shows the current workspace name and
// lets the user switch workspaces or import repositories. Sits next to the
// compact profile avatar in the sidebar footer row.
// ---------------------------------------------------------------------------

export const WorkspaceSelector = memo(function WorkspaceSelector({
  workspaces,
  activeWorkspaceId,
  onSwitchWorkspace,
  onImported,
}: {
  workspaces: Doc<"workspaces">[] | undefined;
  activeWorkspaceId: WorkspaceId | null;
  onSwitchWorkspace: (id: WorkspaceId) => void;
  onImported: (repoId: RepositoryId, threadId: ThreadId | null, workspaceId: WorkspaceId) => void;
}) {
  const activeWorkspace = workspaces?.find((ws) => ws._id === activeWorkspaceId);

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
            className="flex min-w-0 flex-1 items-center gap-2 border border-border bg-background px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
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
                <span className="min-w-0 flex-1 truncate">{ws.name}</span>
                {isActive && <CheckIcon size={14} weight="bold" className="shrink-0 text-primary" />}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />

          <ImportRepoDialog
            onImported={onImported}
            trigger={
              <DropdownMenuItem onSelect={(event) => event.preventDefault()} className="gap-2">
                <GitBranchIcon size={14} weight="bold" className="shrink-0" />
                <span>Import repository</span>
              </DropdownMenuItem>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
});
