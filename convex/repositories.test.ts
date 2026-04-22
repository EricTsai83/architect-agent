/// <reference types="vite/client" />

import { describe, expect, test } from 'vitest';
import { register as registerRateLimiter } from '@convex-dev/rate-limiter/test';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

function createTestConvex() {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
  return t;
}

describe('repository detail metadata', () => {
  test('getRepositoryDetail reads denormalized file counts and caps oversized labels as 400+', async () => {
    const ownerTokenIdentifier = 'user|repo-detail';
    const t = createTestConvex();

    const repositoryId = await t.run(async (ctx) => {
      const repositoryId = await ctx.db.insert('repositories', {
        ownerTokenIdentifier,
        sourceHost: 'github',
        sourceUrl: 'https://github.com/acme/huge-repo',
        sourceRepoFullName: 'acme/huge-repo',
        sourceRepoOwner: 'acme',
        sourceRepoName: 'huge-repo',
        defaultBranch: 'main',
        visibility: 'private',
        accessMode: 'private',
        importStatus: 'completed',
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
        fileCount: 401,
      });

      return repositoryId;
    });

    const viewer = t.withIdentity({ tokenIdentifier: ownerTokenIdentifier });
    const detail = await viewer.query(api.repositories.getRepositoryDetail, { repositoryId });

    expect(detail.fileCount).toBe(401);
    expect(detail.fileCountLabel).toBe('400+');
  });

  test('syncRepository keeps the last completed snapshot until the new sync finishes', async () => {
    const ownerTokenIdentifier = 'user|sync-pointer';
    const t = createTestConvex();
    const lastImportedAt = Date.now() - 60_000;

    const repositoryId = await t.run(async (ctx) => {
      await ctx.db.insert('githubInstallations', {
        ownerTokenIdentifier,
        installationId: 123,
        accountLogin: 'acme',
        accountType: 'User',
        status: 'active',
        repositorySelection: 'all',
        connectedAt: Date.now(),
      });

      const repositoryId = await ctx.db.insert('repositories', {
        ownerTokenIdentifier,
        sourceHost: 'github',
        sourceUrl: 'https://github.com/acme/sync-me',
        sourceRepoFullName: 'acme/sync-me',
        sourceRepoOwner: 'acme',
        sourceRepoName: 'sync-me',
        defaultBranch: 'main',
        visibility: 'private',
        accessMode: 'private',
        importStatus: 'completed',
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
        fileCount: 12,
        lastImportedAt,
        lastSyncedCommitSha: 'abc123',
        latestRemoteSha: 'def456',
      });

      const previousJobId = await ctx.db.insert('jobs', {
        repositoryId,
        ownerTokenIdentifier,
        kind: 'import',
        status: 'completed',
        stage: 'completed',
        progress: 1,
        costCategory: 'indexing',
        triggerSource: 'user',
      });

      const previousImportId = await ctx.db.insert('imports', {
        repositoryId,
        ownerTokenIdentifier,
        sourceUrl: 'https://github.com/acme/sync-me',
        branch: 'main',
        adapterKind: 'git_clone',
        status: 'completed',
        jobId: previousJobId,
      });

      await ctx.db.patch(repositoryId, {
        latestImportId: previousImportId,
        latestImportJobId: previousJobId,
      });

      return repositoryId;
    });

    const viewer = t.withIdentity({ tokenIdentifier: ownerTokenIdentifier });
    await viewer.mutation(api.repositories.syncRepository, { repositoryId });

    const repository = await t.run(async (ctx) => await ctx.db.get(repositoryId));
    expect(repository?.importStatus).toBe('queued');
    expect(repository?.lastImportedAt).toBe(lastImportedAt);
    expect(repository?.fileCount).toBe(12);
    expect(repository?.latestRemoteSha).toBeUndefined();
    expect(repository?.latestImportId).toBeDefined();
    expect(repository?.latestImportJobId).toBeDefined();
  });
});

describe('repository import guards', () => {
  test('createRepositoryImport rejects duplicate imports while one is already running', async () => {
    const ownerTokenIdentifier = 'user|duplicate-import';
    const t = createTestConvex();

    await t.run(async (ctx) => {
      await ctx.db.insert('githubInstallations', {
        ownerTokenIdentifier,
        installationId: 456,
        accountLogin: 'acme',
        accountType: 'User',
        status: 'active',
        repositorySelection: 'all',
        connectedAt: Date.now(),
      });

      await ctx.db.insert('repositories', {
        ownerTokenIdentifier,
        sourceHost: 'github',
        sourceUrl: 'https://github.com/acme/duplicate',
        sourceRepoFullName: 'acme/duplicate',
        sourceRepoOwner: 'acme',
        sourceRepoName: 'duplicate',
        defaultBranch: 'main',
        visibility: 'private',
        accessMode: 'private',
        importStatus: 'running',
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
        fileCount: 0,
      });
    });

    const viewer = t.withIdentity({ tokenIdentifier: ownerTokenIdentifier });

    await expect(
      viewer.mutation(api.repositories.createRepositoryImport, {
        url: 'https://github.com/acme/duplicate',
      }),
    ).rejects.toThrow('already in progress');
  });
});
