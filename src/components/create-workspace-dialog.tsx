import { useCallback, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import {
  ChatCircleTextIcon,
  CircleNotchIcon,
  GitBranchIcon,
  GlobeIcon,
  LockIcon,
} from "@phosphor-icons/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImportRepoDialog } from "@/components/import-repo-dialog";
import type { RepositoryId, ThreadId, WorkspaceId } from "@/lib/types";

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  repositories,
  onCreated,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositories: Doc<"repositories">[] | undefined;
  onCreated: (workspaceId: WorkspaceId) => void;
  onImported: (repoId: RepositoryId, threadId: ThreadId | null) => void;
}) {
  const createWorkspace = useMutation(api.workspaces.createWorkspace);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const filteredRepos = useMemo(() => {
    if (!repositories) return [];
    const query = search.trim().toLowerCase();
    if (!query) return repositories;
    return repositories.filter((r) =>
      r.sourceRepoFullName.toLowerCase().includes(query),
    );
  }, [repositories, search]);

  const handleCreateForRepo = useCallback(
    async (repo: Doc<"repositories">) => {
      setIsCreating(true);
      try {
        const workspaceId = await createWorkspace({
          repositoryId: repo._id,
        });
        onCreated(workspaceId);
      } catch {
        // Silently fail.
      } finally {
        setIsCreating(false);
      }
    },
    [createWorkspace, onCreated],
  );

  const handleCreateGeneral = useCallback(async () => {
    setIsCreating(true);
    try {
      const workspaceId = await createWorkspace({
        name: "General",
      });
      onCreated(workspaceId);
    } catch {
      // Silently fail.
    } finally {
      setIsCreating(false);
    }
  }, [createWorkspace, onCreated]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) {
        setSearch("");
      }
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[420px] flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>New workspace</DialogTitle>
          <DialogDescription>
            Choose a repository for this workspace, or create a general workspace.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        {repositories && repositories.length > 3 && (
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories..."
            className="shrink-0"
          />
        )}

        {/* Repo list */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-0.5 pr-3">
            {/* General workspace option */}
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
              disabled={isCreating}
              onClick={() => void handleCreateGeneral()}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted-foreground/20">
                <ChatCircleTextIcon size={16} weight="bold" className="text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">General</p>
                <p className="text-[11px] text-muted-foreground">No repository attached</p>
              </div>
            </button>

            {/* Import new repo option */}
            <ImportRepoDialog
              onImported={(repoId, threadId) => {
                // After import, create a workspace for the new repo and switch to it.
                void (async () => {
                  // Close this dialog first.
                  handleOpenChange(false);
                  onImported(repoId, threadId);
                })();
              }}
              trigger={
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30">
                    <GitBranchIcon size={16} weight="bold" className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Import new repository</p>
                    <p className="text-[11px] text-muted-foreground">
                      Import from GitHub and create workspace
                    </p>
                  </div>
                </button>
              }
            />

            {/* Separator */}
            {filteredRepos.length > 0 && (
              <div className="px-3 pb-1 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Imported repositories
                </p>
              </div>
            )}

            {/* Repo options */}
            {filteredRepos.map((repo) => {
              const Icon = repo.visibility === "private" ? LockIcon : GlobeIcon;
              const initial = (repo.sourceRepoName[0] ?? "R").toUpperCase();
              return (
                <button
                  key={repo._id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
                  disabled={isCreating}
                  onClick={() => void handleCreateForRepo(repo)}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{repo.sourceRepoFullName}</span>
                      <Icon size={11} weight="bold" className="shrink-0 text-muted-foreground" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {repo.importStatus === "completed"
                        ? `${repo.fileCount} files indexed`
                        : repo.importStatus}
                    </p>
                  </div>
                  {isCreating && (
                    <CircleNotchIcon size={14} className="shrink-0 animate-spin text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
