import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Sweep expired sandboxes every hour.
// Reconciles Convex DB status with Daytona reality and proactively
// deletes sandboxes that have passed their TTL to free disk resources.
crons.interval(
  'sweep expired sandboxes',
  { hours: 1 },
  internal.opsNode.sweepExpiredSandboxes,
  {},
);

crons.interval(
  'reconcile stale interactive jobs',
  { minutes: 5 },
  internal.opsNode.reconcileStaleInteractiveJobs,
  {},
);

export default crons;
