/// <reference types="vite/client" />

import { describe, expect, test } from 'vitest';
import { convexTest } from 'convex-test';
import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

describe('chat reply context', () => {
  test('uses the latest import snapshot instead of stale historical data', async () => {
    const ownerTokenIdentifier = 'user|chat-context';
    const t = convexTest(schema, modules);

    const threadId = await t.run(async (ctx) => {
      const repositoryId = await ctx.db.insert('repositories', {
        ownerTokenIdentifier,
        sourceHost: 'github',
        sourceUrl: 'https://github.com/acme/context-repo',
        sourceRepoFullName: 'acme/context-repo',
        sourceRepoOwner: 'acme',
        sourceRepoName: 'context-repo',
        defaultBranch: 'main',
        visibility: 'private',
        accessMode: 'private',
        importStatus: 'completed',
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
      });

      const threadId = await ctx.db.insert('threads', {
        repositoryId,
        ownerTokenIdentifier,
        title: 'Context thread',
        mode: 'fast',
        lastMessageAt: Date.now(),
      });

      const oldJobId = await ctx.db.insert('jobs', {
        repositoryId,
        ownerTokenIdentifier,
        kind: 'import',
        status: 'completed',
        stage: 'completed',
        progress: 1,
        costCategory: 'indexing',
        triggerSource: 'user',
      });
      const oldImportId = await ctx.db.insert('imports', {
        repositoryId,
        ownerTokenIdentifier,
        sourceUrl: 'https://github.com/acme/context-repo',
        branch: 'main',
        adapterKind: 'git_clone',
        status: 'completed',
        jobId: oldJobId,
      });
      const oldFileId = await ctx.db.insert('repoFiles', {
        repositoryId,
        ownerTokenIdentifier,
        importId: oldImportId,
        path: 'src/legacy.ts',
        parentPath: 'src',
        fileType: 'file',
        extension: 'ts',
        language: 'typescript',
        sizeBytes: 120,
        isEntryPoint: false,
        isConfig: false,
        isImportant: false,
      });
      await ctx.db.insert('repoChunks', {
        repositoryId,
        ownerTokenIdentifier,
        importId: oldImportId,
        fileId: oldFileId,
        path: 'src/legacy.ts',
        chunkIndex: 0,
        startLine: 1,
        endLine: 5,
        chunkKind: 'code',
        summary: 'Old chunk',
        content: 'const legacyValue = "old";',
      });
      await ctx.db.insert('analysisArtifacts', {
        repositoryId,
        jobId: oldJobId,
        ownerTokenIdentifier,
        kind: 'manifest',
        title: 'Old Manifest',
        summary: 'Old import summary',
        contentMarkdown: 'old',
        source: 'heuristic',
        version: 1,
      });

      const latestJobId = await ctx.db.insert('jobs', {
        repositoryId,
        ownerTokenIdentifier,
        kind: 'import',
        status: 'completed',
        stage: 'completed',
        progress: 1,
        costCategory: 'indexing',
        triggerSource: 'user',
      });
      const latestImportId = await ctx.db.insert('imports', {
        repositoryId,
        ownerTokenIdentifier,
        sourceUrl: 'https://github.com/acme/context-repo',
        branch: 'main',
        adapterKind: 'git_clone',
        status: 'completed',
        jobId: latestJobId,
      });
      const latestFileId = await ctx.db.insert('repoFiles', {
        repositoryId,
        ownerTokenIdentifier,
        importId: latestImportId,
        path: 'src/current.ts',
        parentPath: 'src',
        fileType: 'file',
        extension: 'ts',
        language: 'typescript',
        sizeBytes: 128,
        isEntryPoint: true,
        isConfig: false,
        isImportant: true,
      });
      await ctx.db.insert('repoChunks', {
        repositoryId,
        ownerTokenIdentifier,
        importId: latestImportId,
        fileId: latestFileId,
        path: 'src/current.ts',
        chunkIndex: 0,
        startLine: 1,
        endLine: 5,
        chunkKind: 'code',
        summary: 'New chunk',
        content: 'const currentValue = "new";',
      });
      await ctx.db.insert('analysisArtifacts', {
        repositoryId,
        jobId: latestJobId,
        ownerTokenIdentifier,
        kind: 'manifest',
        title: 'New Manifest',
        summary: 'New import summary',
        contentMarkdown: 'new',
        source: 'heuristic',
        version: 1,
      });

      const deepAnalysisJobId = await ctx.db.insert('jobs', {
        repositoryId,
        ownerTokenIdentifier,
        kind: 'deep_analysis',
        status: 'completed',
        stage: 'completed',
        progress: 1,
        costCategory: 'deep_analysis',
        triggerSource: 'user',
      });
      await ctx.db.insert('analysisArtifacts', {
        repositoryId,
        jobId: deepAnalysisJobId,
        ownerTokenIdentifier,
        kind: 'deep_analysis',
        title: 'Latest Deep Analysis',
        summary: 'Deep summary',
        contentMarkdown: 'deep',
        source: 'sandbox',
        version: 1,
      });

      await ctx.db.patch(repositoryId, {
        latestImportId,
        latestImportJobId: latestJobId,
      });

      return threadId;
    });

    const context = await t.query(internal.chat.getReplyContext, { threadId });

    expect(context.chunks).toHaveLength(1);
    expect(context.chunks[0]?.path).toBe('src/current.ts');
    expect(context.chunks[0]?.content).toContain('"new"');
    expect(context.chunks.some((chunk) => chunk.path === 'src/legacy.ts')).toBe(false);
    expect(context.artifacts.map((artifact) => artifact.title)).toEqual([
      'New Manifest',
      'Latest Deep Analysis',
    ]);
  });
});
