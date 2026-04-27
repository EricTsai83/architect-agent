import { ListChecksIcon } from '@phosphor-icons/react';
import type { Doc } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { JobRow } from '@/components/job-row';

export function JobsPopoverButton({ jobs }: { jobs?: Doc<'jobs'>[] }) {
  const hasActiveJobs = jobs?.some(
    (job) => job.status === 'running' || job.status === 'queued',
  );
  const activeJobCount = jobs?.filter(
    (job) => job.status === 'running' || job.status === 'queued',
  ).length ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Jobs"
          className="relative text-muted-foreground hover:text-foreground"
        >
          {hasActiveJobs && (
            <>
              <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
              {activeJobCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 py-px text-[10px] font-semibold text-white">
                  {activeJobCount}
                </span>
              )}
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
