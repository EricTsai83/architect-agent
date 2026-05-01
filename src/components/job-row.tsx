import type { Doc } from "../../convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp } from "@/lib/format";

export function JobRow({ job }: { job: Doc<"jobs"> }) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{job.kind}</p>
          <p className="text-xs text-muted-foreground">
            {job.stage} · {Math.round(job.progress * 100)}%
          </p>
        </div>
        <Badge variant="outline" className="uppercase">
          {job.status}
        </Badge>
      </div>
      {job.outputSummary ? <p className="mt-2 text-xs text-muted-foreground">{job.outputSummary}</p> : null}
      {job.errorMessage ? <p className="mt-2 text-xs text-destructive">{job.errorMessage}</p> : null}
      <p className="mt-2 text-[10px] text-muted-foreground">{formatTimestamp(job._creationTime)}</p>
    </Card>
  );
}
