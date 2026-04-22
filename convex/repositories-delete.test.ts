/// <reference types="vite/client" />

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const {
  cloneRepositoryInSandboxMock,
  collectRepositorySnapshotMock,
  deleteSandboxMock,
  getSandboxStateMock,
  isDaytonaConfiguredMock,
  provisionSandboxMock,
  runFocusedInspectionMock,
  stopSandboxMock,
} = vi.hoisted(() => ({
  cloneRepositoryInSandboxMock: vi.fn(),
  collectRepositorySnapshotMock: vi.fn(),
  deleteSandboxMock: vi.fn(),
  getSandboxStateMock: vi.fn(),
  isDaytonaConfiguredMock: vi.fn(),
  provisionSandboxMock: vi.fn(),
  runFocusedInspectionMock: vi.fn(),
  stopSandboxMock: vi.fn(),
}));

vi.mock('./daytona', () => ({
  cloneRepositoryInSandbox: cloneRepositoryInSandboxMock,
  collectRepositorySnapshot: collectRepositorySnapshotMock,
  deleteSandbox: deleteSandboxMock,
  getSandboxState: getSandboxStateMock,
  isDaytonaConfigured: isDaytonaConfiguredMock,
  provisionSandbox: provisionSandboxMock,
  runFocusedInspection: runFocusedInspectionMock,
  stopSandbox: stopSandboxMock,
}));

describe('repository deletion cleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cloneRepositoryInSandboxMock.mockReset();
    collectRepositorySnapshotMock.mockReset();
    deleteSandboxMock.mockReset();
    getSandboxStateMock.mockReset();
    isDaytonaConfiguredMock.mockReset();
    provisionSandboxMock.mockReset();
    runFocusedInspectionMock.mockReset();
    stopSandboxMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('deleteRepository deletes the remote sandbox before removing sandbox records', async () => {
    const ownerTokenIdentifier = 'user|delete-cleanup';
    const t = convexTest(schema, modules);
    deleteSandboxMock.mockResolvedValue(undefined);

    const repositoryId = await t.run(async (ctx) => {
      const repositoryId = await ctx.db.insert('repositories', {
        ownerTokenIdentifier,
        sourceHost: 'github',
        sourceUrl: 'https://github.com/acme/delete-cleanup',
        sourceRepoFullName: 'acme/delete-cleanup',
        sourceRepoOwner: 'acme',
        sourceRepoName: 'delete-cleanup',
        defaultBranch: 'main',
        visibility: 'private',
        accessMode: 'private',
        importStatus: 'completed',
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
        fileCount: 0,
      });

      const sandboxId = await ctx.db.insert('sandboxes', {
        repositoryId,
        ownerTokenIdentifier,
        provider: 'daytona',
        sourceAdapter: 'git_clone',
        remoteId: 'remote-delete-cleanup',
        status: 'ready',
        workDir: '/workspace',
        repoPath: '/workspace/repo',
        cpuLimit: 2,
        memoryLimitGiB: 4,
        diskLimitGiB: 10,
        ttlExpiresAt: Date.now() + 60_000,
        autoStopIntervalMinutes: 30,
        autoArchiveIntervalMinutes: 60,
        autoDeleteIntervalMinutes: 120,
        networkBlockAll: false,
      });

      await ctx.db.patch(repositoryId, {
        latestSandboxId: sandboxId,
      });

      return repositoryId;
    });

    const viewer = t.withIdentity({ tokenIdentifier: ownerTokenIdentifier });
    await viewer.mutation(api.repositories.deleteRepository, { repositoryId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(deleteSandboxMock).toHaveBeenCalledWith('remote-delete-cleanup');

    const remainingState = await t.run(async (ctx) => {
      const repository = await ctx.db.get(repositoryId);
      const sandboxes = await ctx.db
        .query('sandboxes')
        .withIndex('by_repositoryId', (q) => q.eq('repositoryId', repositoryId))
        .take(10);
      const jobs = await ctx.db
        .query('jobs')
        .withIndex('by_repositoryId', (q) => q.eq('repositoryId', repositoryId))
        .take(10);

      return { repository, sandboxes, jobs };
    });

    expect(remainingState.repository).toBeNull();
    expect(remainingState.sandboxes).toHaveLength(0);
    expect(remainingState.jobs).toHaveLength(0);
  });
});
