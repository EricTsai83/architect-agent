import { ChatCircleTextIcon, GitBranchIcon } from "@phosphor-icons/react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ImportRepoDialog } from "@/components/import-repo-dialog";
import type { RepositoryId, ThreadId, WorkspaceId } from "@/lib/types";

/**
 * Workspace empty state — what the user sees the very first time they sign
 * in (no threads, no repos) and any time they hit `/chat` without any
 * threads to redirect to.
 *
 * Home is repo-free by design: start with unscoped design notes here, or
 * import a repository to create a dedicated repo workspace.
 */
export function EmptyState({
  onStartConversation,
  onImported,
  isStartingConversation = false,
}: {
  onStartConversation: () => void;
  onImported: (repoId: RepositoryId, threadId: ThreadId | null, workspaceId: WorkspaceId) => void;
  isStartingConversation?: boolean;
}) {
  return (
    <div className="flex flex-1 animate-in flex-col items-center justify-center gap-6 p-10 text-center fade-in duration-300">
      <Logo size={64} hero />
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Home for design conversations</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Capture unscoped design notes, architecture questions, and ideas before they need a repository.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="default"
          size="default"
          className="gap-2"
          disabled={isStartingConversation}
          onClick={onStartConversation}
        >
          <ChatCircleTextIcon size={14} weight="bold" />
          {isStartingConversation ? "Starting…" : "Start a design conversation"}
        </Button>
        <ImportRepoDialog
          onImported={onImported}
          trigger={
            <Button type="button" variant="outline" size="default" className="gap-2">
              <GitBranchIcon size={14} weight="bold" />
              Import repository
            </Button>
          }
        />
      </div>
      <p className="max-w-md text-xs text-muted-foreground">
        Importing a repository creates a dedicated workspace for grounded docs, sandbox, sync, and analysis tools.
      </p>
    </div>
  );
}
