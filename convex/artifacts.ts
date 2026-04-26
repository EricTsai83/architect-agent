import { v } from 'convex/values';
import { query } from './_generated/server';
import { requireViewerIdentity } from './lib/auth';

const ARTIFACTS_PER_THREAD_LIMIT = 40;

/**
 * Public, owner-scoped list of artifacts attached to a thread.
 *
 * Drives the right-rail ArtifactPanel (PRD #19, US 23 — "all artifacts
 * associated with a thread visible in a side panel"). The internal
 * `artifactStore.listByThread` is kept private because it skips ownership
 * checks; this query is the public-facing entry point.
 *
 * The repository-scoped artifact list still lives on
 * `repositories.getRepositoryDetail` and is used by the repository overview
 * tab; threads-vs-repositories is the primary axis the UI cares about.
 */
export const listByThread = query({
  args: {
    threadId: v.id('threads'),
  },
  handler: async (ctx, args) => {
    const identity = await requireViewerIdentity(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.ownerTokenIdentifier !== identity.tokenIdentifier) {
      throw new Error('Thread not found.');
    }

    return await ctx.db
      .query('artifacts')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .order('desc')
      .take(ARTIFACTS_PER_THREAD_LIMIT);
  },
});
