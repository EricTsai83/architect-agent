import { CircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";

/**
 * Shows a badge in the TopBar ONLY when something needs the user's attention.
 * Happy path (import done + sandbox ready) renders nothing at all.
 */
export function RepoStatusIndicator({
  importStatus,
  sandbox,
}: {
  importStatus: string;
  sandbox: { status: string; ttlExpiresAt: number } | null;
}) {
  const lower = importStatus.toLowerCase();
  const isCompleted = lower.includes("complete") || lower.includes("ready") || lower.includes("success");
  const badgeClassName = "ml-1 gap-1 text-[10px] uppercase tracking-wide animate-in fade-in duration-300";

  // Import / sync in progress — user is waiting, show progress badge
  if (!isCompleted) {
    const isFailed = lower.includes("fail") || lower.includes("error");
    return (
      <Badge variant={isFailed ? "destructive" : "muted"} className={badgeClassName}>
        {!isFailed && <CircleIcon size={8} weight="fill" className="animate-pulse text-yellow-500" />}
        {isFailed && <WarningCircleIcon size={10} weight="fill" />}
        {isFailed ? importStatus : "Syncing…"}
      </Badge>
    );
  }

  // Sandbox errors — user needs to act
  if (sandbox?.status === "failed") {
    return (
      <Badge variant="destructive" className={badgeClassName}>
        <WarningCircleIcon size={10} weight="fill" />
        Sandbox error
      </Badge>
    );
  }

  // Sandbox provisioning — transient, show subtle indicator
  if (sandbox?.status === "provisioning") {
    return (
      <Badge variant="muted" className={badgeClassName}>
        <CircleIcon size={8} weight="fill" className="animate-pulse text-yellow-500" />
        Starting…
      </Badge>
    );
  }

  // Happy path: import done, sandbox ready/stopped/null — show nothing.
  return null;
}
