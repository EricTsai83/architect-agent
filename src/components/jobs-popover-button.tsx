import { ListChecksIcon } from "@phosphor-icons/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { JobRow } from "@/components/job-row";

export function JobsPopoverButton({ jobs }: { jobs?: Doc<"jobs">[] }) {
  const activeJobCount = jobs?.filter((job) => job.status === "running" || job.status === "queued").length ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={activeJobCount > 0 ? `Jobs (${activeJobCount} active)` : "Jobs"}
          className="relative text-muted-foreground hover:text-foreground"
        >
          {activeJobCount > 0 && (
            <>
              <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <Badge
                variant="accent"
                data-testid="jobs-active-count"
                className="absolute -right-1 -top-1 min-w-5 justify-center rounded-full bg-primary px-1 py-px text-[10px] text-primary-foreground"
              >
                {activeJobCount}
              </Badge>
            </>
          )}
          <ListChecksIcon weight="bold" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Jobs</h3>
          {!jobs || jobs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No jobs yet.</p>
          ) : (
            <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
              {jobs.map((job) => (
                <JobRow key={job._id} job={job} />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
