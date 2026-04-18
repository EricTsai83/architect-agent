import {
  DotsThreeVerticalIcon,
  SparkleIcon,
  TrashIcon,
  CircleIcon,
  WarningCircleIcon,
  ArrowsClockwiseIcon,
  GitBranchIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { shortSha } from '@/lib/format';
import { useRelativeTime } from '@/hooks/use-relative-time';

export type TopBarRepoDetail = {
  repository: {
    sourceRepoFullName: string;
    importStatus: string;
    defaultBranch: string | null;
    detectedLanguages: string[];
    lastImportedAt?: number;
    lastSyncedCommitSha?: string;
  };
  sandbox: { status: string; ttlExpiresAt: number; autoArchiveIntervalMinutes: number } | null;
  deepModeAvailable: boolean;
  hasRemoteUpdates: boolean;
  fileCount: number;
};

export function TopBar({
  repoDetail,
  repoName,
  isSyncing,
  onSync,
  onDeleteRepo,
  onRunAnalysis,
}: {
  repoDetail?: TopBarRepoDetail;
  /** Immediate repo name from the already-loaded repository list so the title
   *  never flashes "Repository" while `repoDetail` is still loading. */
  repoName?: string;
  isSyncing: boolean;
  onSync: () => void;
  onDeleteRepo: () => void;
  onRunAnalysis: () => void;
}) {
  const title = repoDetail?.repository.sourceRepoFullName ?? repoName ?? 'Repository';

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 md:px-4">
      <SidebarTrigger />
      {repoDetail ? (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="min-w-0 truncate text-sm font-semibold tracking-tight hover:underline md:text-base"
              >
                {title}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Repository info
              </p>
              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                <InfoRow label="Status" value={deriveStatusLabel(repoDetail)} />
                <InfoRow label="Branch" value={repoDetail.repository.defaultBranch ?? 'Unknown'} />
                <InfoRow label="Files indexed" value={String(repoDetail.fileCount)} />
                <InfoRow
                  label="Languages"
                  value={repoDetail.repository.detectedLanguages.join(', ') || 'Unknown'}
                  truncate
                />
                <PopoverLastSynced timestamp={repoDetail.repository.lastImportedAt} />
                {repoDetail.repository.lastSyncedCommitSha ? (
                  <InfoRow
                    label="Commit"
                    value={shortSha(repoDetail.repository.lastSyncedCommitSha)}
                    mono
                  />
                ) : null}
                <InfoRow
                  label="Deep mode"
                  value={repoDetail.deepModeAvailable ? 'Available' : 'Unavailable'}
                  highlight={repoDetail.deepModeAvailable ? 'positive' : 'negative'}
                />
              </div>
            </PopoverContent>
          </Popover>
          {repoDetail.repository.defaultBranch && (
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
              <GitBranchIcon size={13} weight="bold" className="shrink-0" />
              <span className="max-w-[120px] truncate">{repoDetail.repository.defaultBranch}</span>
            </span>
          )}
          <RepoStatusIndicator
            importStatus={repoDetail.repository.importStatus}
            sandbox={repoDetail.sandbox}
          />

        </>
      ) : (
        <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight md:text-base">{title}</h1>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        {/* Sync button — integrates last-synced time, update-available, and syncing state */}
        <SyncButton
          repoDetail={repoDetail}
          isSyncing={isSyncing}
          onSync={onSync}
        />

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
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/** Single row inside the repo-info popover. */
function InfoRow({
  label,
  value,
  truncate,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  truncate?: boolean;
  mono?: boolean;
  highlight?: 'positive' | 'negative';
}) {
  let valueClass = 'truncate text-foreground';
  if (truncate) valueClass = 'max-w-[60%] truncate text-right text-foreground';
  if (mono) valueClass += ' font-mono';
  if (highlight === 'positive') valueClass += ' text-emerald-600 dark:text-emerald-400';
  if (highlight === 'negative') valueClass += ' text-orange-600 dark:text-orange-400';

  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

/** Derives a human-readable combined status for the popover. */
function deriveStatusLabel(repoDetail: TopBarRepoDetail): string {
  const importLower = repoDetail.repository.importStatus.toLowerCase();
  const importDone =
    importLower.includes('complete') || importLower.includes('ready') || importLower.includes('success');

  if (!importDone) {
    return `Sync: ${repoDetail.repository.importStatus}`;
  }

  if (!repoDetail.sandbox) return 'Ready (no sandbox)';

  const sb = repoDetail.sandbox;
  if (sb.status === 'failed') return 'Sandbox error';
  if (sb.status === 'archived' || Date.now() > sb.ttlExpiresAt) return 'Sandbox expired';
  if (sb.status === 'provisioning') return 'Sandbox starting…';
  return 'Ready';
}

/**
 * Shows a badge in the TopBar ONLY when something needs the user's attention.
 * Happy path (import done + sandbox ready) renders nothing at all.
 */
function RepoStatusIndicator({
  importStatus,
  sandbox,
}: {
  importStatus: string;
  sandbox: { status: string; ttlExpiresAt: number } | null;
}) {
  const lower = importStatus.toLowerCase();
  const isCompleted = lower.includes('complete') || lower.includes('ready') || lower.includes('success');

  // Import / sync in progress — user is waiting, show progress badge
  if (!isCompleted) {
    const isFailed = lower.includes('fail') || lower.includes('error');
    return (
      <Badge variant={isFailed ? 'destructive' : 'muted'} className="ml-1 gap-1 text-[10px] uppercase tracking-wide">
        {!isFailed && <CircleIcon size={8} weight="fill" className="animate-pulse text-yellow-500" />}
        {isFailed && <WarningCircleIcon size={10} weight="fill" />}
        {isFailed ? importStatus : 'Syncing…'}
      </Badge>
    );
  }

  // Sandbox errors — user needs to act
  if (sandbox?.status === 'failed') {
    return (
      <Badge variant="destructive" className="ml-1 gap-1 text-[10px] uppercase tracking-wide">
        <WarningCircleIcon size={10} weight="fill" />
        Sandbox error
      </Badge>
    );
  }

  // Sandbox provisioning — transient, show subtle indicator
  if (sandbox?.status === 'provisioning') {
    return (
      <Badge variant="muted" className="ml-1 gap-1 text-[10px] uppercase tracking-wide">
        <CircleIcon size={8} weight="fill" className="animate-pulse text-yellow-500" />
        Starting…
      </Badge>
    );
  }

  // Happy path: import done, sandbox ready/stopped/null — show nothing.
  return null;
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
  const hasUpdates = repoDetail?.hasRemoteUpdates && !isSyncing;

  // Derive the text shown inside the button
  let label: string;
  if (isSyncing) {
    label = 'Syncing…';
  } else if (hasUpdates) {
    label = 'Update available';
  } else if (syncedLabel) {
    label = `Synced ${syncedLabel}`;
  } else {
    label = 'Sync';
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={!repoDetail || isSyncing}
      onClick={onSync}
      className={
        hasUpdates
          ? 'relative gap-1.5 text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300'
          : 'gap-1.5 text-xs text-muted-foreground hover:text-foreground'
      }
      title={
        hasUpdates
          ? 'New commits available on remote — click to sync'
          : repoDetail?.repository.lastImportedAt
            ? new Date(repoDetail.repository.lastImportedAt).toLocaleString()
            : undefined
      }
    >
      {hasUpdates && (
        <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
        </span>
      )}
      <ArrowsClockwiseIcon weight="bold" className={isSyncing ? 'animate-spin' : ''} />
      {label}
    </Button>
  );
}

/** Live-updating "Last synced" row inside the repo-info popover. */
function PopoverLastSynced({ timestamp }: { timestamp?: number }) {
  const label = useRelativeTime(timestamp);
  if (!label) return null;
  return <InfoRow label="Last synced" value={label} />;
}
