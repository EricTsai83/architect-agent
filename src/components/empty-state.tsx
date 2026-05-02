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
    <div className="flex flex-1 animate-in items-center justify-center px-5 py-10 fade-in duration-300">
      <div className="w-full max-w-3xl">
        <div className="mx-auto mb-7 flex max-w-xl flex-col items-center text-center">
          <Logo size={64} hero />
          <div className="mt-5 border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Choose your starting point
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <section className="border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground">
                <ChatCircleTextIcon size={18} weight="bold" />
              </div>
              <div className="min-w-0 text-left">
                <h2 className="text-base font-semibold tracking-tight">Start without a repository</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Best for loose ideas, system design tradeoffs, and questions that are not tied to code yet.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="default"
              size="lg"
              className="mt-5 w-full justify-center"
              disabled={isStartingConversation}
              onClick={onStartConversation}
            >
              {isStartingConversation ? "Starting..." : "Start design conversation"}
            </Button>
          </section>

          <section className="border border-border bg-card/80 p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground">
                <GitBranchIcon size={18} weight="bold" />
              </div>
              <div className="min-w-0 text-left">
                <h2 className="text-base font-semibold tracking-tight">Import a repository</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Best when answers should cite project context, inspect files, or use sandbox-backed analysis.
                </p>
              </div>
            </div>
            <ImportRepoDialog
              onImported={onImported}
              trigger={
                <Button type="button" variant="outline" size="lg" className="mt-5 w-full justify-center">
                  Import repository
                </Button>
              }
            />
          </section>
        </div>
      </div>
    </div>
  );
}
