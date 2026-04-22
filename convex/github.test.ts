/// <reference types="vite/client" />

import { describe, expect, test } from 'vitest';
import { register as registerRateLimiter } from '@convex-dev/rate-limiter/test';
import { convexTest } from 'convex-test';
import { api, internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

function createTestConvex() {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
  return t;
}

function activeInstallation(ownerTokenIdentifier: string, installationId: number) {
  return {
    ownerTokenIdentifier,
    installationId,
    accountLogin: `active-${installationId}`,
    accountType: 'User' as const,
    status: 'active' as const,
    repositorySelection: 'selected' as const,
    connectedAt: Date.now(),
  };
}

function deletedInstallation(ownerTokenIdentifier: string, installationId: number) {
  return {
    ownerTokenIdentifier,
    installationId,
    accountLogin: `deleted-${installationId}`,
    accountType: 'User' as const,
    status: 'deleted' as const,
    repositorySelection: 'selected' as const,
    connectedAt: Date.now() - 10_000,
    deletedAt: Date.now() - 5_000,
  };
}

describe('GitHub installation selection', () => {
  test('connection status ignores deleted installations that were created first', async () => {
    const ownerTokenIdentifier = 'user|github-status';
    const t = createTestConvex();

    await t.run(async (ctx) => {
      await ctx.db.insert('githubInstallations', deletedInstallation(ownerTokenIdentifier, 101));
      await ctx.db.insert('githubInstallations', activeInstallation(ownerTokenIdentifier, 202));
    });

    const viewer = t.withIdentity({ tokenIdentifier: ownerTokenIdentifier });
    const status = await viewer.query(api.github.getGitHubConnectionStatus, {});

    expect(status).toMatchObject({
      isConnected: true,
      installationId: 202,
      accountLogin: 'active-202',
      repositorySelection: 'selected',
    });
  });

  test('syncRepository uses the active installation when history rows exist', async () => {
    const ownerTokenIdentifier = 'user|sync';
    const t = createTestConvex();

    const repositoryId = await t.run(async (ctx) => {
      await ctx.db.insert('githubInstallations', deletedInstallation(ownerTokenIdentifier, 301));
      await ctx.db.insert('githubInstallations', activeInstallation(ownerTokenIdentifier, 302));

      return await ctx.db.insert('repositories', {
        ownerTokenIdentifier,
        sourceHost: 'github',
        sourceUrl: 'https://github.com/acme/repo',
        sourceRepoFullName: 'acme/repo',
        sourceRepoOwner: 'acme',
        sourceRepoName: 'repo',
        defaultBranch: 'main',
        visibility: 'private',
        accessMode: 'private',
        importStatus: 'idle',
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
        fileCount: 0,
      });
    });

    const viewer = t.withIdentity({ tokenIdentifier: ownerTokenIdentifier });
    const result = await viewer.mutation(api.repositories.syncRepository, { repositoryId });

    expect(result.jobId).toBeTruthy();
    expect(result.importId).toBeTruthy();

    const repository = await t.run(async (ctx) => await ctx.db.get(repositoryId));
    expect(repository?.importStatus).toBe('queued');
  });

  test('getInstallationIdForOwner returns the active installation id', async () => {
    const ownerTokenIdentifier = 'user|installation-query';
    const t = createTestConvex();

    await t.run(async (ctx) => {
      await ctx.db.insert('githubInstallations', deletedInstallation(ownerTokenIdentifier, 401));
      await ctx.db.insert('githubInstallations', activeInstallation(ownerTokenIdentifier, 402));
    });

    const installationId = await t.query(internal.github.getInstallationIdForOwner, {
      ownerTokenIdentifier,
    });

    expect(installationId).toBe(402);
  });
});
