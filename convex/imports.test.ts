/// <reference types="vite/client" />

import { describe, expect, test } from 'vitest';
import { convexTest } from 'convex-test';
import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

describe('import snapshot cleanup', () => {
  test('removes superseded files, chunks, and import-generated artifacts', async () => {
    const ownerTokenIdentifier = 'user|import-cleanup';
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const repositoryId = await ctx.db.insert('repositories', {
        ownerTokenIdentifier,
        sourceHost: 'github',
        sourceUrl: 'https://github.com/acme/cleanup-repo',
        sourceRepoFullName: 'acme/cleanup-repo',
        sourceRepoOwner: 'acme',
        sourceRepoName: 'cleanup-repo',
        defaultBranch: 'main',
        visibility: 'private',
        accessMode: 'private',
        importStatus: 'completed',
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
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
        sourceUrl: 'https://github.com/acme/cleanup-repo',
        branch: 'main',
        adapterKind: 'git_clone',
        status: 'completed',
        jobId: oldJobId,
      });
      const oldFileId = await ctx.db.insert('repoFiles', {
        repositoryId,
        ownerTokenIdentifier,
        importId: oldImportId,
        path: 'src/old.ts',
        parentPath: 'src',
        fileType: 'file',
        extension: 'ts',
        language: 'typescript',
        sizeBytes: 100,
        isEntryPoint: false,
        isConfig: false,
        isImportant: false,
      });
      await ctx.db.insert('repoChunks', {
        repositoryId,
        ownerTokenIdentifier,
        importId: oldImportId,
        fileId: oldFileId,
        path: 'src/old.ts',
        chunkIndex: 0,
        startLine: 1,
        endLine: 3,
        chunkKind: 'code',
        summary: 'Old chunk',
        content: 'old',
      });
      await ctx.db.insert('analysisArtifacts', {
        repositoryId,
        jobId: oldJobId,
        ownerTokenIdentifier,
        kind: 'manifest',
        title: 'Old Manifest',
        summary: 'Old summary',
        contentMarkdown: 'old',
        source: 'heuristic',
        version: 1,
      });

      const currentJobId = await ctx.db.insert('jobs', {
        repositoryId,
        ownerTokenIdentifier,
        kind: 'import',
        status: 'completed',
        stage: 'completed',
        progress: 1,
        costCategory: 'indexing',
        triggerSource: 'user',
      });
      const currentImportId = await ctx.db.insert('imports', {
        repositoryId,
        ownerTokenIdentifier,
        sourceUrl: 'https://github.com/acme/cleanup-repo',
        branch: 'main',
        adapterKind: 'git_clone',
        status: 'completed',
        jobId: currentJobId,
      });
      const currentFileId = await ctx.db.insert('repoFiles', {
        repositoryId,
        ownerTokenIdentifier,
        importId: currentImportId,
        path: 'src/current.ts',
        parentPath: 'src',
        fileType: 'file',
        extension: 'ts',
        language: 'typescript',
        sizeBytes: 120,
        isEntryPoint: true,
        isConfig: false,
        isImportant: true,
      });
      await ctx.db.insert('repoChunks', {
        repositoryId,
        ownerTokenIdentifier,
        importId: currentImportId,
        fileId: currentFileId,
        path: 'src/current.ts',
        chunkIndex: 0,
        startLine: 1,
        endLine: 3,
        chunkKind: 'code',
        summary: 'Current chunk',
        content: 'current',
      });
      await ctx.db.insert('analysisArtifacts', {
        repositoryId,
        jobId: currentJobId,
        ownerTokenIdentifier,
        kind: 'manifest',
        title: 'Current Manifest',
        summary: 'Current summary',
        contentMarkdown: 'current',
        source: 'heuristic',
        version: 1,
      });

      return { oldImportId, oldJobId, currentImportId, currentJobId };
    });

    await t.mutation(internal.imports.cleanupSupersededImportSnapshot, {
      importId: ids.oldImportId,
      importJobId: ids.oldJobId,
    });

    const snapshot = await t.run(async (ctx) => ({
      files: await ctx.db
        .query('repoFiles')
        .withIndex('by_importId', (q) => q.eq('importId', ids.oldImportId))
        .take(10),
      chunks: await ctx.db
        .query('repoChunks')
        .withIndex('by_importId_and_path_and_chunkIndex', (q) => q.eq('importId', ids.oldImportId))
        .take(10),
      artifacts: await ctx.db
        .query('analysisArtifacts')
        .withIndex('by_jobId', (q) => q.eq('jobId', ids.oldJobId))
        .take(10),
      currentFiles: await ctx.db
        .query('repoFiles')
        .withIndex('by_importId', (q) => q.eq('importId', ids.currentImportId))
        .take(10),
      currentChunks: await ctx.db
        .query('repoChunks')
        .withIndex('by_importId_and_path_and_chunkIndex', (q) => q.eq('importId', ids.currentImportId))
        .take(10),
      currentArtifacts: await ctx.db
        .query('analysisArtifacts')
        .withIndex('by_jobId', (q) => q.eq('jobId', ids.currentJobId))
        .take(10),
    }));

    expect(snapshot.files).toHaveLength(0);
    expect(snapshot.chunks).toHaveLength(0);
    expect(snapshot.artifacts).toHaveLength(0);
    expect(snapshot.currentFiles).toHaveLength(1);
    expect(snapshot.currentChunks).toHaveLength(1);
    expect(snapshot.currentArtifacts).toHaveLength(1);
  });
});
