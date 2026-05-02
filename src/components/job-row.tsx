import type { Doc } from "../../convex/_generated/dataModel";

/**
 * Minimal job row — status dot + text. No progress bar.
 */
export function JobRow({ job }: { job: Doc<"jobs"> }) {
  const isError = job.status === "error" || job.status === "failed";
  const isRunning = job.status === "running" || job.status === "queued";
  const isComplete = job.status === "completed" || job.status === "success";

  const dotColor = isError
    ? "bg-red-500"
    : isRunning
      ? "bg-blue-500 animate-pulse"
      : isComplete
        ? "bg-green-500"
        : "bg-muted-foreground/40";

  return (
    <div className="flex items-start gap-3 py-2">
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dotColor}`} />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium">{job.kind}</span>
          <span className="text-[11px] capitalize text-muted-foreground">{job.status}</span>
        </div>
        {job.stage ? <p className="text-[11px] text-muted-foreground">{job.stage}</p> : null}
        {job.errorMessage ? (
          <p className="text-[11px] text-red-600 dark:text-red-400">{job.errorMessage}</p>
        ) : null}
        {job.outputSummary && !isError ? (
          <p className="text-[11px] text-muted-foreground">{job.outputSummary}</p>
        ) : null}
      </div>
    </div>
  );
}
