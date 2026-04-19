/// <reference types="vite/client" />

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { convexTest } from 'convex-test';
import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const { deleteSandboxMock, getSandboxStateMock, stopSandboxMock } = vi.hoisted(() => ({
  deleteSandboxMock: vi.fn(),
  getSandboxStateMock: vi.fn(),
  stopSandboxMock: vi.fn(),
}));

vi.mock('./daytona', () => ({
  deleteSandbox: deleteSandboxMock,
  getSandboxState: getSandboxStateMock,
  stopSandbox: stopSandboxMock,
}));

describe('expired sandbox sweep', () => {
  beforeEach(() => {
    deleteSandboxMock.mockReset();
    getSandboxStateMock.mockReset();
    stopSandboxMock.mockReset();
  });

  test('getExpiredSandboxes returns both ready and stopped sandboxes past TTL', async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();

    await t.run(async (ctx) => {
      const repositoryId = await ctx.db.insert('repositories', {
        ownerTokenIdentifier: 'user|sandbox-query',
        sourceHost: 'github',
        sourceUrl: 'https://github.com/acme/ready-stop',
        sourceRepoFullName: 'acme/ready-stop',
        sourceRepoOwner: 'acme',
        sourceRepoName: 'ready-stop',
        defaultBranch: 'main',
        visibility: 'private',
        accessMode: 'private',
        importStatus: 'idle',
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
      });

      await ctx.db.insert('sandboxes', {
        repositoryId,
        ownerTokenIdentifier: 'user|sandbox-query',
        provider: 'daytona',
        sourceAdapter: 'git_clone',
        remoteId: 'ready-expired',
        status: 'ready',
        workDir: '/workspace',
        repoPath: '/workspace/repo',
        cpuLimit: 2,
        memoryLimitGiB: 4,
        diskLimitGiB: 10,
        ttlExpiresAt: now - 1_000,
        autoStopIntervalMinutes: 30,
        autoArchiveIntervalMinutes: 60,
        autoDeleteIntervalMinutes: 120,
        networkBlockAll: false,
      });

      await ctx.db.insert('sandboxes', {
        repositoryId,
        ownerTokenIdentifier: 'user|sandbox-query',
        provider: 'daytona',
        sourceAdapter: 'git_clone',
        remoteId: 'stopped-expired',
        status: 'stopped',
        workDir: '/workspace',
        repoPath: '/workspace/repo',
        cpuLimit: 2,
        memoryLimitGiB: 4,
        diskLimitGiB: 10,
        ttlExpiresAt: now - 2_000,
        autoStopIntervalMinutes: 30,
        autoArchiveIntervalMinutes: 60,
        autoDeleteIntervalMinutes: 120,
        networkBlockAll: false,
      });

      await ctx.db.insert('sandboxes', {
        repositoryId,
        ownerTokenIdentifier: 'user|sandbox-query',
        provider: 'daytona',
        sourceAdapter: 'git_clone',
        remoteId: 'ready-active',
        status: 'ready',
        workDir: '/workspace',
        repoPath: '/workspace/repo',
        cpuLimit: 2,
        memoryLimitGiB: 4,
        diskLimitGiB: 10,
        ttlExpiresAt: now + 60_000,
        autoStopIntervalMinutes: 30,
        autoArchiveIntervalMinutes: 60,
        autoDeleteIntervalMinutes: 120,
        networkBlockAll: false,
      });
    });

    const expired = await t.query(internal.ops.getExpiredSandboxes, {});

    expect(expired.map((entry) => entry.remoteId).sort()).toEqual([
      'ready-expired',
      'stopped-expired',
    ]);
  });

  test('started sandboxes are actually stopped before being marked stopped in Convex', async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();

    const sandboxId = await t.run(async (ctx) => {
      const repositoryId = await ctx.db.insert('repositories', {
        ownerTokenIdentifier: 'user|sandbox-started',
        sourceHost: 'github',
        sourceUrl: 'https://github.com/acme/started',
        sourceRepoFullName: 'acme/started',
        sourceRepoOwner: 'acme',
        sourceRepoName: 'started',
        defaultBranch: 'main',
        visibility: 'private',
        accessMode: 'private',
        importStatus: 'idle',
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
      });

      return await ctx.db.insert('sandboxes', {
        repositoryId,
        ownerTokenIdentifier: 'user|sandbox-started',
        provider: 'daytona',
        sourceAdapter: 'git_clone',
        remoteId: 'remote-started',
        status: 'ready',
        workDir: '/workspace',
        repoPath: '/workspace/repo',
        cpuLimit: 2,
        memoryLimitGiB: 4,
        diskLimitGiB: 10,
        ttlExpiresAt: now - 1_000,
        autoStopIntervalMinutes: 30,
        autoArchiveIntervalMinutes: 60,
        autoDeleteIntervalMinutes: 120,
        networkBlockAll: false,
      });
    });

    getSandboxStateMock.mockResolvedValue('started');
    stopSandboxMock.mockResolvedValue(undefined);

    await t.action(internal.opsNode.sweepExpiredSandboxes, {});

    expect(stopSandboxMock).toHaveBeenCalledWith('remote-started');

    const sandbox = await t.run(async (ctx) => await ctx.db.get(sandboxId));
    expect(sandbox?.status).toBe('stopped');
  });

  test('failed deletion of a stopped sandbox leaves it retryable', async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();

    const sandboxId = await t.run(async (ctx) => {
      const repositoryId = await ctx.db.insert('repositories', {
        ownerTokenIdentifier: 'user|sandbox-retry',
        sourceHost: 'github',
        sourceUrl: 'https://github.com/acme/retry',
        sourceRepoFullName: 'acme/retry',
        sourceRepoOwner: 'acme',
        sourceRepoName: 'retry',
        defaultBranch: 'main',
        visibility: 'private',
        accessMode: 'private',
        importStatus: 'idle',
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
      });

      return await ctx.db.insert('sandboxes', {
        repositoryId,
        ownerTokenIdentifier: 'user|sandbox-retry',
        provider: 'daytona',
        sourceAdapter: 'git_clone',
        remoteId: 'remote-stopped',
        status: 'stopped',
        workDir: '/workspace',
        repoPath: '/workspace/repo',
        cpuLimit: 2,
        memoryLimitGiB: 4,
        diskLimitGiB: 10,
        ttlExpiresAt: now - 1_000,
        autoStopIntervalMinutes: 30,
        autoArchiveIntervalMinutes: 60,
        autoDeleteIntervalMinutes: 120,
        networkBlockAll: false,
      });
    });

    getSandboxStateMock.mockResolvedValue('stopped');
    deleteSandboxMock.mockRejectedValue(new Error('temporary Daytona failure'));

    await t.action(internal.opsNode.sweepExpiredSandboxes, {});

    const sandbox = await t.run(async (ctx) => await ctx.db.get(sandboxId));
    expect(sandbox?.status).toBe('stopped');
  });
});
