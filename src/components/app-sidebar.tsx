import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { ChatCircleIcon, GlobeIcon, LockIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { ProfileCard } from "@/components/profile-card";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenuButton } from "@/components/ui/sidebar";
import { Logo } from "@/components/logo";
import { ImportRepoDialog } from "@/components/import-repo-dialog";
import { useAsyncCallback } from "@/hooks/use-async-callback";
import { toUserErrorMessage } from "@/lib/errors";
import type { RepositoryId, ThreadId } from "@/lib/types";

/**
 * Thread-first sidebar (PRD #19).
 *
 * Layout, top to bottom:
 *
 *   1. Header — logo + product name. Branding is "Systify".
 *   2. "+ New design conversation" CTA — the primary action. Creates a thread
 *      with no repository attached so the user can start an architectural
 *      discussion before importing any code (US 1, US 10).
 *   3. Threads section — every thread the user owns, sorted by recency. Each
 *      row shows an attached-repo badge (or a "general" badge when none),
 *      satisfying US 5. The list is owner-scoped, not repo-filtered, which is
 *      the structural reversal at the heart of this PRD.
 *   4. Import repository button — secondary action for adding new repos.
 *      Repo selection/attachment is handled inline via the chat panel's empty
 *      state and the TopBar's AttachRepoMenu, keeping threads as the primary
 *      navigation primitive.
 *   5. Footer — profile card.
 */
export function AppSidebar({
  repositories,
  selectedThreadId,
  onSelectThread,
  onDeleteThread,
  onImported,
  onError,
}: {
  repositories: Doc<"repositories">[] | undefined;
  selectedThreadId: ThreadId | null;
  onSelectThread: (id: ThreadId | null) => void;
  onDeleteThread: (id: ThreadId) => void;
  onImported: (repoId: RepositoryId, threadId: ThreadId | null) => void;
  onError: (message: string | null) => void;
}) {
  const threads = useQuery(api.chat.listThreads, {});
  const createThreadMutation = useMutation(api.chat.createThread);

  // Map for O(1) repo lookup when rendering thread badges. Built only when
  // either side has loaded so we never show stale/empty data on the badge.
  const repositoriesById = useMemo(() => {
    const map = new Map<RepositoryId, Doc<"repositories">>();
    for (const repository of repositories ?? []) {
      map.set(repository._id, repository);
    }
    return map;
  }, [repositories]);

  const [isCreatingThread, handleCreateThread] = useAsyncCallback(
    useCallback(async () => {
      onError(null);
      try {
        // No repositoryId: let the backend choose the default repo-less mode so
        // the sidebar stays in lockstep with `createThread`'s source of truth.
        const threadId = await createThreadMutation({});
        onSelectThread(threadId);
      } catch (error) {
        onError(toUserErrorMessage(error, "Failed to start a conversation."));
      }
    }, [createThreadMutation, onError, onSelectThread]),
  );

  return (
    <Sidebar>
      <SidebarHeader>
        <Logo size={30} />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold tracking-tight">Systify</div>
          <div className="truncate text-[11px] text-muted-foreground">Design copilot for your codebase</div>
        </div>
      </SidebarHeader>

      <div className="border-b border-border px-3 py-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-8 w-full justify-start gap-1.5 text-xs"
          disabled={isCreatingThread}
          onClick={() => void handleCreateThread()}
        >
          <PlusIcon size={13} weight="bold" />
          {isCreatingThread ? "Creating…" : "New design conversation"}
        </Button>
      </div>

      <SidebarContent>
        <ThreadsSection
          threads={threads}
          repositoriesById={repositoriesById}
          selectedThreadId={selectedThreadId}
          onSelectThread={onSelectThread}
          onDeleteThread={onDeleteThread}
        />

        <ImportRepositorySection onImported={onImported} />
      </SidebarContent>

      <SidebarFooter className="px-3 py-2">
        <ProfileCard />
      </SidebarFooter>
    </Sidebar>
  );
}

// ---------------------------------------------------------------------------
// Threads section — primary navigation. Owner-scoped, not repo-filtered.
// ---------------------------------------------------------------------------

function ThreadsSection({
  threads,
  repositoriesById,
  selectedThreadId,
  onSelectThread,
  onDeleteThread,
}: {
  threads: Doc<"threads">[] | undefined;
  repositoriesById: Map<RepositoryId, Doc<"repositories">>;
  selectedThreadId: ThreadId | null;
  onSelectThread: (id: ThreadId | null) => void;
  onDeleteThread: (id: ThreadId) => void;
}) {
  const previousThreadCountRef = useRef<number | null>(null);
  const liveRegionRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (threads === undefined) {
      return;
    }

    const previousCount = previousThreadCountRef.current;
    previousThreadCountRef.current = threads.length;

    if (previousCount === null || previousCount === threads.length) {
      return;
    }

    const delta = threads.length - previousCount;
    const count = Math.abs(delta);
    const message =
      delta > 0
        ? `${count} new conversation${count === 1 ? "" : "s"}. ${threads.length} total.`
        : `${count} conversation${count === 1 ? "" : "s"} removed. ${threads.length} total.`;
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
    }
  }, [threads]);

  return (
    <div className="flex flex-col gap-1 p-3">
      <span ref={liveRegionRef} className="sr-only" role="status" aria-live="polite" />
      <div className="flex items-center justify-between px-1 pb-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Threads</p>
      </div>
      {threads === undefined ? null : threads.length === 0 ? (
        <p
          className="px-1 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-300"
          aria-live="polite"
        >
          No conversations yet. Start one above.
        </p>
      ) : (
        <ThreadsList
          threads={threads}
          repositoriesById={repositoriesById}
          selectedThreadId={selectedThreadId}
          onSelectThread={onSelectThread}
          onDeleteThread={onDeleteThread}
        />
      )}
    </div>
  );
}

const ThreadsList = memo(function ThreadsList({
  threads,
  repositoriesById,
  selectedThreadId,
  onSelectThread,
  onDeleteThread,
}: {
  threads: Doc<"threads">[];
  repositoriesById: Map<RepositoryId, Doc<"repositories">>;
  selectedThreadId: ThreadId | null;
  onSelectThread: (id: ThreadId | null) => void;
  onDeleteThread: (id: ThreadId) => void;
}) {
  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-top-1 duration-300">
      {threads.map((thread) => {
        const isSelected = selectedThreadId === thread._id;
        const repository = thread.repositoryId ? repositoriesById.get(thread.repositoryId) : undefined;
        return (
          <div key={thread._id} className="group relative">
            <SidebarMenuButton
              selected={isSelected}
              onClick={() => onSelectThread(thread._id)}
              className="py-1.5 pr-10"
            >
              <ChatCircleIcon size={14} weight={isSelected ? "fill" : "regular"} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{thread.title}</p>
                <ThreadRepoBadge repository={repository} />
              </div>
            </SidebarMenuButton>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 text-muted-foreground opacity-70 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
              onClick={() => onDeleteThread(thread._id)}
              aria-label="Delete thread"
              title="Delete thread"
            >
              <TrashIcon size={13} weight="bold" />
            </Button>
          </div>
        );
      })}
    </div>
  );
});

/**
 * Per-thread repo indicator. PRD US 5 explicitly asks the row to show whether
 * the thread is grounded; we render either the repo's short name or an
 * unobtrusive "general" pill so the user can scan the list without opening
 * each thread to remember its grounding.
 */
function ThreadRepoBadge({ repository }: { repository: Doc<"repositories"> | undefined }) {
  if (!repository) {
    return <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-muted-foreground/70">General</p>;
  }
  const Icon = repository.visibility === "private" ? LockIcon : GlobeIcon;
  return (
    <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground/80">
      <Icon size={9} weight="bold" className="shrink-0" />
      <span className="truncate">{repository.sourceRepoFullName}</span>
    </p>
  );
}

// ---------------------------------------------------------------------------
// Import repository — secondary action, replaces the former collapsible list.
// ---------------------------------------------------------------------------

function ImportRepositorySection({
  onImported,
}: {
  onImported: (repoId: RepositoryId, threadId: ThreadId | null) => void;
}) {
  return (
    <div className="border-t border-border px-3 py-2">
      <ImportRepoDialog
        onImported={onImported}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-start gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <PlusIcon size={13} weight="bold" />
            Import repository
          </Button>
        }
      />
    </div>
  );
}
