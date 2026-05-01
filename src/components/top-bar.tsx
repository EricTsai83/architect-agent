import { DotsThreeVerticalIcon, SparkleIcon, TrashIcon, ArrowsClockwiseIcon } from "@phosphor-icons/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRelativeTime } from "@/hooks/use-relative-time";
import { RepoInfoPopover } from "@/components/repo-info-popover";
import { RepoStatusIndicator } from "@/components/repo-status-indicator";
import { JobsPopoverButton } from "@/components/jobs-popover-button";
import { AttachRepoMenu } from "@/components/attach-repo-menu";
import type { AttachedRepositorySummary } from "@/hooks/use-thread-capabilities";
import type { SandboxModeStatus, ThreadId } from "@/lib/types";

export type TopBarRepoDetail = {
  repository: {
    sourceRepoFullName: string;
    importStatus: string;
    defaultBranch?: string | null;
    detectedLanguages: string[];
    lastImportedAt?: number;
    lastSyncedCommitSha?: string;
  };
  sandbox: { status: string; ttlExpiresAt: number; autoArchiveIntervalMinutes: number } | null;
  sandboxModeStatus: SandboxModeStatus;
  hasRemoteUpdates: boolean;
  fileCount: number;
  fileCountLabel: string;
  jobs?: Doc<"jobs">[];
};

export function TopBar({
  repoDetail,
  repoName,
  threadId,
  attachedRepository,
  availableRepositories,
  isSyncing,
  onSync,
  onDeleteRepo,
  onRunAnalysis,
}: {
  repoDetail?: TopBarRepoDetail;
  /** Immediate repo name from the already-loaded repository list so the title
   *  never flashes "Repository" while `repoDetail` is still loading. */
  repoName?: string;
  /**
   * The thread the workspace is currently viewing, or `null` on bare-repo
   * (`/r/:repoId`) and empty (`/chat`) routes. Drives whether the inline
   * {@link AttachRepoMenu} chip renders — without a thread there is nothing
   * to attach a repo *to*.
   */
  threadId: ThreadId | null;
  /** Repository currently attached to {@link threadId}, if any. */
  attachedRepository: AttachedRepositorySummary | null;
  /** All repositories the viewer owns, used to populate the swap menu. */
  availableRepositories: ReadonlyArray<Doc<"repositories">>;
  isSyncing: boolean;
  onSync: () => void;
  onDeleteRepo: () => void;
  onRunAnalysis: () => void;
}) {
  const title = repoDetail?.repository.sourceRepoFullName ?? repoName;

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 md:px-4">
      <SidebarTrigger />
      {title ? (
        // Title group only renders when the workspace has a repo to title —
        // for thread-only views (no repo attached yet) we skip straight to
        // the AttachRepoMenu so the user is never stranded without an entry
        // point to attach one. `flex-1 min-w-0` lets long repo names truncate
        // gracefully while leaving room for the attach chip and the right
        // cluster.
        <div className="flex min-w-0 flex-1 items-center gap-2 animate-in fade-in duration-300">
          {repoDetail ? (
            <RepoInfoPopover repoDetail={repoDetail} title={title} />
          ) : (
            <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight md:text-base">{title}</h1>
          )}
          {repoDetail ? (
            <RepoStatusIndicator importStatus={repoDetail.repository.importStatus} sandbox={repoDetail.sandbox} />
          ) : null}
        </div>
      ) : null}

      {threadId !== null ? (
        // PRD US 2 / 3: inline attach/swap/detach chip lives in the TopBar so
        // changing the thread's grounding is a single click that never leaves
        // the chat. Rendered outside the title block so it is also reachable
        // when the thread has no repo attached yet (otherwise the user would
        // have no entry point to attach one). Hidden when threadId is null
        // because there is nothing to bind a repo to.
        <AttachRepoMenu
          threadId={threadId}
          attachedRepository={attachedRepository}
          availableRepositories={availableRepositories}
        />
      ) : null}

      <div className="ml-auto flex items-center gap-1.5">
        <JobsPopoverButton jobs={repoDetail?.jobs} />

        <TooltipProvider delayDuration={150}>
          <SyncButton repoDetail={repoDetail} isSyncing={isSyncing} onSync={onSync} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={!repoDetail}
                aria-label="Repository actions"
                className="text-muted-foreground hover:text-foreground"
              >
                <DotsThreeVerticalIcon weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => onRunAnalysis()}>
                <SparkleIcon weight="bold" />
                Run deep analysis
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  onDeleteRepo();
                }}
              >
                <TrashIcon weight="bold" />
                Delete repository
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>
      </div>
    </div>
  );
}

/**
 * Unified sync button that combines the action with a live-updating
 * "Synced X ago" label, so there is one compact control instead of two.
 */
function SyncButton({
  repoDetail,
  isSyncing,
  onSync,
}: {
  repoDetail?: TopBarRepoDetail;
  isSyncing: boolean;
  onSync: () => void;
}) {
  const syncedLabel = useRelativeTime(repoDetail?.repository.lastImportedAt);
  const repositoryImportStatus = repoDetail?.repository.importStatus;
  const isRepositorySyncing = repositoryImportStatus === "queued" || repositoryImportStatus === "running";
  const isBusy = isSyncing || isRepositorySyncing;
  const hasUpdates = repoDetail?.hasRemoteUpdates && !isBusy;
  const isExpanded = isBusy || hasUpdates;

  // Derive the text shown inside the button
  let label: string | null = null;
  if (isBusy) {
    label = "Syncing…";
  } else if (hasUpdates) {
    label = "Update available";
  } else if (syncedLabel) {
    label = `Synced ${syncedLabel}`;
  } else if (repoDetail) {
    label = "Sync";
  }

  const syncedTooltipLabel = syncedLabel ? `Synced ${syncedLabel}` : "Synced recently";
  const updateTooltipLabel = "New commits available on remote - click to sync";

  const buttonClassName = hasUpdates
    ? "relative justify-start gap-1.5 text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
    : "justify-start gap-1.5 text-xs text-muted-foreground hover:text-foreground";

  if (label === null && !repoDetail && !isBusy) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label="Sync unavailable">
        <ArrowsClockwiseIcon weight="bold" />
      </Button>
    );
  }

  if (!isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={!repoDetail}
            onClick={onSync}
            aria-label={label ?? "Sync"}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowsClockwiseIcon weight="bold" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label ?? syncedTooltipLabel}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" disabled={!repoDetail || isBusy} onClick={onSync} className={buttonClassName}>
          {hasUpdates && (
            <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
            </span>
          )}
          {label ? (
            <span className="inline-flex items-center gap-1.5 animate-in fade-in duration-300">
              <ArrowsClockwiseIcon weight="bold" className={isBusy ? "animate-spin" : ""} />
              {label}
            </span>
          ) : null}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{hasUpdates ? updateTooltipLabel : syncedTooltipLabel}</TooltipContent>
    </Tooltip>
  );
}
