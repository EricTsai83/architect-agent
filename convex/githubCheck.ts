import { v } from 'convex/values';
import { internal } from './_generated/api';
import { action, internalMutation, internalQuery } from './_generated/server';

// ---------------------------------------------------------------------------
// Public action — called by the frontend on visibility-change / repo-switch
// ---------------------------------------------------------------------------

/**
 * Lightweight check: hits the GitHub Git refs endpoint (~200 bytes response)
 * to see if the remote default branch has moved since our last sync.
 *
 * Stores the result on the repository doc so the reactive subscription
 * automatically pushes `hasRemoteUpdates` to every connected client.
 */
export const checkForUpdates = action({
  args: {
    repositoryId: v.id('repositories'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated.');

    // Fetch the repo record to get owner/repo/branch
    const repo: RepoForCheck | null = await ctx.runQuery(
      internal.githubCheck.getRepoForCheck,
      { repositoryId: args.repositoryId },
    );
    if (!repo) return;

    // Must have been synced at least once, must not be mid-sync
    if (!repo.lastSyncedCommitSha || !repo.defaultBranch) return;
    if (repo.importStatus === 'queued' || repo.importStatus === 'running') return;

    // Throttle: skip if we checked within the last 60 seconds
    if (repo.lastCheckedForUpdatesAt && Date.now() - repo.lastCheckedForUpdatesAt < 60_000) {
      return;
    }

    const sha = await fetchLatestRemoteSha(repo.owner, repo.repo, repo.defaultBranch);
    if (!sha) return;

    await ctx.runMutation(internal.githubCheck.updateRemoteSha, {
      repositoryId: args.repositoryId,
      latestRemoteSha: sha,
    });
  },
});

// ---------------------------------------------------------------------------
// Internal helpers (query + mutation) — not exposed to clients
// ---------------------------------------------------------------------------

type RepoForCheck = {
  owner: string;
  repo: string;
  defaultBranch: string | null;
  lastSyncedCommitSha: string | null;
  lastCheckedForUpdatesAt: number | null;
  importStatus: string;
  ownerTokenIdentifier: string;
};

export const getRepoForCheck = internalQuery({
  args: { repositoryId: v.id('repositories') },
  handler: async (ctx, args) => {
    const repo = await ctx.db.get(args.repositoryId);
    if (!repo) return null;
    return {
      owner: repo.sourceRepoOwner,
      repo: repo.sourceRepoName,
      defaultBranch: repo.defaultBranch ?? null,
      lastSyncedCommitSha: repo.lastSyncedCommitSha ?? null,
      lastCheckedForUpdatesAt: repo.lastCheckedForUpdatesAt ?? null,
      importStatus: repo.importStatus,
      ownerTokenIdentifier: repo.ownerTokenIdentifier,
    };
  },
});

export const updateRemoteSha = internalMutation({
  args: {
    repositoryId: v.id('repositories'),
    latestRemoteSha: v.string(),
  },
  handler: async (ctx, args) => {
    const repo = await ctx.db.get(args.repositoryId);
    if (!repo) return;
    await ctx.db.patch(args.repositoryId, {
      latestRemoteSha: args.latestRemoteSha,
      lastCheckedForUpdatesAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// GitHub API helper
// ---------------------------------------------------------------------------

/**
 * Fetches the latest commit SHA for a branch using the Git refs endpoint.
 * Works for public repos without authentication (60 req/hour rate limit).
 */
async function fetchLatestRemoteSha(
  owner: string,
  repo: string,
  branch: string,
): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'architect-agent',
      },
    });

    if (!response.ok) {
      console.warn(
        `[github-check] ${owner}/${repo}#${branch}: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = (await response.json()) as { object?: { sha?: string } };
    return data.object?.sha ?? null;
  } catch (error) {
    console.warn(
      '[github-check] Network error:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
