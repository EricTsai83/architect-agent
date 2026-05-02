/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { internal } from "./_generated/api";
import { selectRelevantChunks } from "./chat/relevance";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("chat reply context", () => {
  test("uses the latest import snapshot instead of stale historical data", async () => {
    const ownerTokenIdentifier = "user|chat-context";
    const t = convexTest(schema, modules);

    const threadId = await t.run(async (ctx) => {
      const repositoryId = await ctx.db.insert("repositories", {
        ownerTokenIdentifier,
        sourceHost: "github",
        sourceUrl: "https://github.com/acme/context-repo",
        sourceRepoFullName: "acme/context-repo",
        sourceRepoOwner: "acme",
        sourceRepoName: "context-repo",
        defaultBranch: "main",
        visibility: "private",
        accessMode: "private",
        importStatus: "completed",
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
        fileCount: 0,
      });

      const threadId = await ctx.db.insert("threads", {
        repositoryId,
        ownerTokenIdentifier,
        title: "Context thread",
        // sandbox mode is exercised here so we go through the artifact/chunk
        // loading branches; `discuss` is now repo-context-free by design.
        mode: "sandbox",
        lastMessageAt: Date.now(),
      });

      const oldJobId = await ctx.db.insert("jobs", {
        repositoryId,
        ownerTokenIdentifier,
        kind: "import",
        status: "completed",
        stage: "completed",
        progress: 1,
        costCategory: "indexing",
        triggerSource: "user",
      });
      const oldImportId = await ctx.db.insert("imports", {
        repositoryId,
        ownerTokenIdentifier,
        sourceUrl: "https://github.com/acme/context-repo",
        branch: "main",
        adapterKind: "git_clone",
        status: "completed",
        jobId: oldJobId,
      });
      const oldFileId = await ctx.db.insert("repoFiles", {
        repositoryId,
        ownerTokenIdentifier,
        importId: oldImportId,
        path: "src/legacy.ts",
        parentPath: "src",
        fileType: "file",
        extension: "ts",
        language: "typescript",
        sizeBytes: 120,
        isEntryPoint: false,
        isConfig: false,
        isImportant: false,
      });
      await ctx.db.insert("repoChunks", {
        repositoryId,
        ownerTokenIdentifier,
        importId: oldImportId,
        fileId: oldFileId,
        path: "src/legacy.ts",
        chunkIndex: 0,
        startLine: 1,
        endLine: 5,
        chunkKind: "code",
        summary: "Old chunk",
        content: 'const legacyValue = "old";',
      });
      await ctx.db.insert("artifacts", {
        repositoryId,
        jobId: oldJobId,
        ownerTokenIdentifier,
        kind: "manifest",
        title: "Old Manifest",
        summary: "Old import summary",
        contentMarkdown: "old",
        source: "heuristic",
        version: 1,
      });

      const latestJobId = await ctx.db.insert("jobs", {
        repositoryId,
        ownerTokenIdentifier,
        kind: "import",
        status: "completed",
        stage: "completed",
        progress: 1,
        costCategory: "indexing",
        triggerSource: "user",
      });
      const latestImportId = await ctx.db.insert("imports", {
        repositoryId,
        ownerTokenIdentifier,
        sourceUrl: "https://github.com/acme/context-repo",
        branch: "main",
        adapterKind: "git_clone",
        status: "completed",
        jobId: latestJobId,
      });
      const latestFileId = await ctx.db.insert("repoFiles", {
        repositoryId,
        ownerTokenIdentifier,
        importId: latestImportId,
        path: "src/current.ts",
        parentPath: "src",
        fileType: "file",
        extension: "ts",
        language: "typescript",
        sizeBytes: 128,
        isEntryPoint: true,
        isConfig: false,
        isImportant: true,
      });
      await ctx.db.insert("repoChunks", {
        repositoryId,
        ownerTokenIdentifier,
        importId: latestImportId,
        fileId: latestFileId,
        path: "src/current.ts",
        chunkIndex: 0,
        startLine: 1,
        endLine: 5,
        chunkKind: "code",
        summary: "New chunk",
        content: 'const currentValue = "new";',
      });
      await ctx.db.insert("artifacts", {
        repositoryId,
        jobId: latestJobId,
        ownerTokenIdentifier,
        kind: "manifest",
        title: "New Manifest",
        summary: "New import summary",
        contentMarkdown: "new",
        source: "heuristic",
        version: 1,
      });

      const deepAnalysisJobId = await ctx.db.insert("jobs", {
        repositoryId,
        ownerTokenIdentifier,
        kind: "deep_analysis",
        status: "completed",
        stage: "completed",
        progress: 1,
        costCategory: "deep_analysis",
        triggerSource: "user",
      });
      await ctx.db.insert("artifacts", {
        repositoryId,
        jobId: deepAnalysisJobId,
        ownerTokenIdentifier,
        kind: "deep_analysis",
        title: "Latest Deep Analysis",
        summary: "Deep summary",
        contentMarkdown: "deep",
        source: "sandbox",
        version: 1,
      });

      await ctx.db.patch(repositoryId, {
        latestImportId,
        latestImportJobId: latestJobId,
      });

      return threadId;
    });

    const context = await t.query(internal.chat.context.getReplyContext, { threadId });

    expect(context.chunks).toHaveLength(1);
    expect(context.chunks[0]?.path).toBe("src/current.ts");
    expect(context.chunks[0]?.content).toContain('"new"');
    expect(context.chunks.some((chunk) => chunk.path === "src/legacy.ts")).toBe(false);
    expect(context.artifacts.map((artifact) => artifact.title)).toEqual(["New Manifest", "Latest Deep Analysis"]);
  });

  test("expands the candidate pool with query-aware search hits from the latest import", async () => {
    const ownerTokenIdentifier = "user|chat-query-aware";
    const t = convexTest(schema, modules);

    const threadId = await t.run(async (ctx) => {
      const repositoryId = await ctx.db.insert("repositories", {
        ownerTokenIdentifier,
        sourceHost: "github",
        sourceUrl: "https://github.com/acme/query-aware-repo",
        sourceRepoFullName: "acme/query-aware-repo",
        sourceRepoOwner: "acme",
        sourceRepoName: "query-aware-repo",
        defaultBranch: "main",
        visibility: "private",
        accessMode: "private",
        importStatus: "completed",
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
        fileCount: 0,
      });

      const threadId = await ctx.db.insert("threads", {
        repositoryId,
        ownerTokenIdentifier,
        title: "Query-aware thread",
        // sandbox mode preserves chunk loading so this test still exercises
        // search-index ranking; `discuss` is repo-context-free now.
        mode: "sandbox",
        lastMessageAt: Date.now(),
      });

      const olderJobId = await ctx.db.insert("jobs", {
        repositoryId,
        ownerTokenIdentifier,
        kind: "import",
        status: "completed",
        stage: "completed",
        progress: 1,
        costCategory: "indexing",
        triggerSource: "user",
      });
      const olderImportId = await ctx.db.insert("imports", {
        repositoryId,
        ownerTokenIdentifier,
        sourceUrl: "https://github.com/acme/query-aware-repo",
        branch: "main",
        adapterKind: "git_clone",
        status: "completed",
        jobId: olderJobId,
      });
      const olderFileId = await ctx.db.insert("repoFiles", {
        repositoryId,
        ownerTokenIdentifier,
        importId: olderImportId,
        path: "src/file-stale-auth.ts",
        parentPath: "src",
        fileType: "file",
        extension: "ts",
        language: "typescript",
        sizeBytes: 128,
        isEntryPoint: false,
        isConfig: false,
        isImportant: false,
      });
      await ctx.db.insert("repoChunks", {
        repositoryId,
        ownerTokenIdentifier,
        importId: olderImportId,
        fileId: olderFileId,
        path: "src/file-stale-auth.ts",
        chunkIndex: 0,
        startLine: 1,
        endLine: 6,
        chunkKind: "code",
        summary: "src/file-stale-auth.ts: stale auth middleware boundary",
        content: 'export function handleAuthToken() { return "stale auth middleware token flow"; }',
      });

      const latestJobId = await ctx.db.insert("jobs", {
        repositoryId,
        ownerTokenIdentifier,
        kind: "import",
        status: "completed",
        stage: "completed",
        progress: 1,
        costCategory: "indexing",
        triggerSource: "user",
      });
      const latestImportId = await ctx.db.insert("imports", {
        repositoryId,
        ownerTokenIdentifier,
        sourceUrl: "https://github.com/acme/query-aware-repo",
        branch: "main",
        adapterKind: "git_clone",
        status: "completed",
        jobId: latestJobId,
      });

      for (let index = 0; index < 200; index += 1) {
        const path = index === 180 ? "src/file-180-auth.ts" : `src/file-${index.toString().padStart(3, "0")}.ts`;
        const fileId = await ctx.db.insert("repoFiles", {
          repositoryId,
          ownerTokenIdentifier,
          importId: latestImportId,
          path,
          parentPath: "src",
          fileType: "file",
          extension: "ts",
          language: "typescript",
          sizeBytes: 128,
          isEntryPoint: index === 0,
          isConfig: false,
          isImportant: index < 10,
        });

        await ctx.db.insert("repoChunks", {
          repositoryId,
          ownerTokenIdentifier,
          importId: latestImportId,
          fileId,
          path,
          chunkIndex: 0,
          startLine: 1,
          endLine: 6,
          chunkKind: "code",
          summary: index === 180 ? `${path}: auth middleware boundary` : `${path}: generic helper ${index}`,
          content:
            index === 180
              ? 'export function handleAuthToken() { return "auth middleware token flow"; }'
              : `export const value${index} = ${index};`,
        });
      }

      await ctx.db.insert("messages", {
        repositoryId,
        threadId,
        ownerTokenIdentifier,
        role: "user",
        status: "completed",
        // sandbox mode keeps the chunk-loading code path live; the user
        // message mode is what `getReplyContext` uses for `effectiveMode`.
        mode: "sandbox",
        content: "How does auth work?",
      });

      await ctx.db.patch(repositoryId, {
        latestImportId,
        latestImportJobId: latestJobId,
      });

      return threadId;
    });

    const context = await t.query(internal.chat.context.getReplyContext, { threadId });

    expect(context.chunks.some((chunk) => chunk.path === "src/file-180-auth.ts")).toBe(true);
    expect(context.chunks.some((chunk) => chunk.path === "src/file-stale-auth.ts")).toBe(false);
  });

  test("keeps a baseline chunk set when search terms miss everything", async () => {
    const ownerTokenIdentifier = "user|chat-baseline-fallback";
    const t = convexTest(schema, modules);

    const threadId = await t.run(async (ctx) => {
      const repositoryId = await ctx.db.insert("repositories", {
        ownerTokenIdentifier,
        sourceHost: "github",
        sourceUrl: "https://github.com/acme/fallback-repo",
        sourceRepoFullName: "acme/fallback-repo",
        sourceRepoOwner: "acme",
        sourceRepoName: "fallback-repo",
        defaultBranch: "main",
        visibility: "private",
        accessMode: "private",
        importStatus: "completed",
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
        fileCount: 0,
      });

      const threadId = await ctx.db.insert("threads", {
        repositoryId,
        ownerTokenIdentifier,
        title: "Fallback thread",
        // sandbox mode keeps chunk loading active; `discuss` returns no chunks.
        mode: "sandbox",
        lastMessageAt: Date.now(),
      });

      const latestJobId = await ctx.db.insert("jobs", {
        repositoryId,
        ownerTokenIdentifier,
        kind: "import",
        status: "completed",
        stage: "completed",
        progress: 1,
        costCategory: "indexing",
        triggerSource: "user",
      });
      const latestImportId = await ctx.db.insert("imports", {
        repositoryId,
        ownerTokenIdentifier,
        sourceUrl: "https://github.com/acme/fallback-repo",
        branch: "main",
        adapterKind: "git_clone",
        status: "completed",
        jobId: latestJobId,
      });

      for (const [index, path] of ["src/a.ts", "src/b.ts", "src/c.ts"].entries()) {
        const fileId = await ctx.db.insert("repoFiles", {
          repositoryId,
          ownerTokenIdentifier,
          importId: latestImportId,
          path,
          parentPath: "src",
          fileType: "file",
          extension: "ts",
          language: "typescript",
          sizeBytes: 80,
          isEntryPoint: false,
          isConfig: false,
          isImportant: false,
        });

        await ctx.db.insert("repoChunks", {
          repositoryId,
          ownerTokenIdentifier,
          importId: latestImportId,
          fileId,
          path,
          chunkIndex: 0,
          startLine: 1,
          endLine: 4,
          chunkKind: "code",
          summary: `${path}: generic helper ${index}`,
          content: `export const value${index} = ${index};`,
        });
      }

      await ctx.db.insert("messages", {
        repositoryId,
        threadId,
        ownerTokenIdentifier,
        role: "user",
        status: "completed",
        // sandbox mode preserves chunk loading; user message mode wins
        // over thread.mode in `getReplyContext.effectiveMode`.
        mode: "sandbox",
        content: "quaternion entanglement neutron lattice",
      });

      await ctx.db.patch(repositoryId, {
        latestImportId,
        latestImportJobId: latestJobId,
      });

      return threadId;
    });

    const context = await t.query(internal.chat.context.getReplyContext, { threadId });

    expect(context.chunks).not.toHaveLength(0);
    expect(context.chunks.map((chunk) => chunk.path)).toContain("src/a.ts");
  });

  test("content matches influence ranking even when path and summary miss", () => {
    const ranked = selectRelevantChunks(
      [
        {
          path: "src/helpers.ts",
          summary: "Generic utility helpers",
          content: "This module coordinates auth middleware session token validation.",
        },
        {
          path: "src/misc.ts",
          summary: "Assorted helpers",
          content: "This module formats timestamps.",
        },
      ],
      "How does auth middleware work?",
    );

    expect(ranked[0]?.path).toBe("src/helpers.ts");
  });

  test("preserves short technical tokens while dropping question filler words", () => {
    const ranked = selectRelevantChunks(
      [
        {
          path: "src/how-does-work.ts",
          summary: "How does the system work",
          content: "This file explains how it works for you.",
        },
        {
          path: "src/db-auth.ts",
          summary: "DB auth adapter",
          content: "Database auth token validation pipeline.",
        },
      ],
      "How does db auth work?",
    );

    expect(ranked[0]?.path).toBe("src/db-auth.ts");
  });

  test("preserves original candidate order for equal scores", () => {
    const ranked = selectRelevantChunks(
      [
        {
          path: "src/zeta.ts",
          summary: "Auth helper",
          content: "Token refresh flow.",
        },
        {
          path: "src/alpha.ts",
          summary: "Auth helper",
          content: "Token refresh flow.",
        },
      ],
      "auth",
    );

    expect(ranked.map((chunk) => chunk.path)).toEqual(["src/zeta.ts", "src/alpha.ts"]);
  });

  test("returns early with empty artifacts and chunks for repository-less threads", async () => {
    const ownerTokenIdentifier = "user|repo-less-thread";
    const t = convexTest(schema, modules);

    const threadId = await t.run(async (ctx) => {
      return await ctx.db.insert("threads", {
        ownerTokenIdentifier,
        title: "Design conversation",
        mode: "discuss",
        lastMessageAt: Date.now(),
      });
    });

    const context = await t.query(internal.chat.context.getReplyContext, { threadId });

    expect(context.sourceRepoFullName).toBeUndefined();
    expect(context.artifacts).toHaveLength(0);
    expect(context.chunks).toHaveLength(0);
    expect(context.repositorySummary).toBeUndefined();
    expect(context.readmeSummary).toBeUndefined();
    expect(context.architectureSummary).toBeUndefined();
  });

  test("docs mode uses artifact-only context and skips indexed code chunks", async () => {
    const ownerTokenIdentifier = "user|docs-artifact-only";
    const t = convexTest(schema, modules);

    const threadId = await t.run(async (ctx) => {
      const repositoryId = await ctx.db.insert("repositories", {
        ownerTokenIdentifier,
        sourceHost: "github",
        sourceUrl: "https://github.com/acme/docs-mode",
        sourceRepoFullName: "acme/docs-mode",
        sourceRepoOwner: "acme",
        sourceRepoName: "docs-mode",
        defaultBranch: "main",
        visibility: "private",
        accessMode: "private",
        importStatus: "completed",
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
        fileCount: 0,
      });

      const threadId = await ctx.db.insert("threads", {
        repositoryId,
        ownerTokenIdentifier,
        title: "Docs thread",
        mode: "docs",
        lastMessageAt: Date.now(),
      });

      const importJobId = await ctx.db.insert("jobs", {
        repositoryId,
        ownerTokenIdentifier,
        kind: "import",
        status: "completed",
        stage: "completed",
        progress: 1,
        costCategory: "indexing",
        triggerSource: "user",
      });
      const importId = await ctx.db.insert("imports", {
        repositoryId,
        ownerTokenIdentifier,
        sourceUrl: "https://github.com/acme/docs-mode",
        branch: "main",
        adapterKind: "git_clone",
        status: "completed",
        jobId: importJobId,
      });
      const fileId = await ctx.db.insert("repoFiles", {
        repositoryId,
        ownerTokenIdentifier,
        importId,
        path: "src/engine.ts",
        parentPath: "src",
        fileType: "file",
        extension: "ts",
        language: "typescript",
        sizeBytes: 128,
        isEntryPoint: false,
        isConfig: false,
        isImportant: true,
      });
      await ctx.db.insert("repoChunks", {
        repositoryId,
        ownerTokenIdentifier,
        importId,
        fileId,
        path: "src/engine.ts",
        chunkIndex: 0,
        startLine: 1,
        endLine: 3,
        chunkKind: "code",
        summary: "engine internals",
        content: 'export const engine = () => "hot path";',
      });

      await ctx.db.insert("artifacts", {
        repositoryId,
        threadId,
        ownerTokenIdentifier,
        kind: "architecture_diagram",
        title: "Architecture diagram",
        summary: "Module boundaries",
        contentMarkdown: "graph TD\nA-->B",
        source: "heuristic",
        version: 1,
      });
      await ctx.db.insert("messages", {
        repositoryId,
        threadId,
        ownerTokenIdentifier,
        role: "user",
        status: "completed",
        mode: "docs",
        content: "What did we already decide about architecture?",
      });

      await ctx.db.patch(repositoryId, {
        latestImportId: importId,
        latestImportJobId: importJobId,
      });

      return threadId;
    });

    const context = await t.query(internal.chat.context.getReplyContext, { threadId });
    expect(context.artifacts.map((artifact) => artifact.title)).toContain("Architecture diagram");
    expect(context.chunks).toHaveLength(0);
  });

  test("docs mode can fill the limit from a single artifact kind", async () => {
    const ownerTokenIdentifier = "user|docs-single-kind";
    const t = convexTest(schema, modules);

    const threadId = await t.run(async (ctx) => {
      const repositoryId = await ctx.db.insert("repositories", {
        ownerTokenIdentifier,
        sourceHost: "github",
        sourceUrl: "https://github.com/acme/docs-single-kind",
        sourceRepoFullName: "acme/docs-single-kind",
        sourceRepoOwner: "acme",
        sourceRepoName: "docs-single-kind",
        defaultBranch: "main",
        visibility: "private",
        accessMode: "private",
        importStatus: "completed",
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
        fileCount: 0,
      });

      const threadId = await ctx.db.insert("threads", {
        repositoryId,
        ownerTokenIdentifier,
        title: "Docs single kind thread",
        mode: "docs",
        lastMessageAt: Date.now(),
      });

      for (let index = 0; index < 20; index += 1) {
        await ctx.db.insert("artifacts", {
          repositoryId,
          threadId,
          ownerTokenIdentifier,
          kind: "architecture_diagram",
          title: `Architecture diagram ${index}`,
          summary: `Diagram summary ${index}`,
          contentMarkdown: `graph TD\nA${index}-->B${index}`,
          source: "heuristic",
          version: 1,
        });
      }

      await ctx.db.insert("messages", {
        repositoryId,
        threadId,
        ownerTokenIdentifier,
        role: "user",
        status: "completed",
        mode: "docs",
        content: "Show the latest architecture artifacts.",
      });

      return threadId;
    });

    const context = await t.query(internal.chat.context.getReplyContext, { threadId });

    expect(context.artifacts).toHaveLength(12);
    expect(context.artifacts[0]?.title).toBe("Architecture diagram 19");
    expect(context.artifacts[11]?.title).toBe("Architecture diagram 8");
  });

  test("discuss mode returns no repo context even when a repository is attached", async () => {
    const ownerTokenIdentifier = "user|discuss-with-repo";
    const t = convexTest(schema, modules);

    const threadId = await t.run(async (ctx) => {
      const repositoryId = await ctx.db.insert("repositories", {
        ownerTokenIdentifier,
        sourceHost: "github",
        sourceUrl: "https://github.com/acme/discuss-mode",
        sourceRepoFullName: "acme/discuss-mode",
        sourceRepoOwner: "acme",
        sourceRepoName: "discuss-mode",
        defaultBranch: "main",
        visibility: "private",
        accessMode: "private",
        importStatus: "completed",
        detectedLanguages: [],
        packageManagers: [],
        entrypoints: [],
        fileCount: 0,
        summary: "rich repository summary",
        readmeSummary: "readme",
        architectureSummary: "architecture",
      });

      const threadId = await ctx.db.insert("threads", {
        repositoryId,
        ownerTokenIdentifier,
        title: "Discuss with repo",
        // discuss is "no repo, no sandbox" by design — even with a
        // repository attached the reply context must skip every
        // repo-scoped lookup so this conversation stays training-only.
        mode: "discuss",
        lastMessageAt: Date.now(),
      });

      const importJobId = await ctx.db.insert("jobs", {
        repositoryId,
        ownerTokenIdentifier,
        kind: "import",
        status: "completed",
        stage: "completed",
        progress: 1,
        costCategory: "indexing",
        triggerSource: "user",
      });
      const importId = await ctx.db.insert("imports", {
        repositoryId,
        ownerTokenIdentifier,
        sourceUrl: "https://github.com/acme/discuss-mode",
        branch: "main",
        adapterKind: "git_clone",
        status: "completed",
        jobId: importJobId,
      });
      const fileId = await ctx.db.insert("repoFiles", {
        repositoryId,
        ownerTokenIdentifier,
        importId,
        path: "src/engine.ts",
        parentPath: "src",
        fileType: "file",
        extension: "ts",
        language: "typescript",
        sizeBytes: 128,
        isEntryPoint: false,
        isConfig: false,
        isImportant: true,
      });
      await ctx.db.insert("repoChunks", {
        repositoryId,
        ownerTokenIdentifier,
        importId,
        fileId,
        path: "src/engine.ts",
        chunkIndex: 0,
        startLine: 1,
        endLine: 3,
        chunkKind: "code",
        summary: "engine internals",
        content: 'export const engine = () => "hot path";',
      });
      await ctx.db.insert("artifacts", {
        repositoryId,
        threadId,
        ownerTokenIdentifier,
        kind: "architecture_diagram",
        title: "Architecture diagram",
        summary: "Module boundaries",
        contentMarkdown: "graph TD\nA-->B",
        source: "heuristic",
        version: 1,
      });
      await ctx.db.insert("messages", {
        repositoryId,
        threadId,
        ownerTokenIdentifier,
        role: "user",
        status: "completed",
        mode: "discuss",
        content: "Let's brainstorm.",
      });

      await ctx.db.patch(repositoryId, {
        latestImportId: importId,
        latestImportJobId: importJobId,
      });

      return threadId;
    });

    const context = await t.query(internal.chat.context.getReplyContext, { threadId });

    expect(context.artifacts).toHaveLength(0);
    expect(context.chunks).toHaveLength(0);
    expect(context.repositorySummary).toBeUndefined();
    expect(context.readmeSummary).toBeUndefined();
    expect(context.architectureSummary).toBeUndefined();
    expect(context.sourceRepoFullName).toBeUndefined();
    // Messages are still returned so the model can see the conversation.
    expect(context.messages.map((message) => message.content)).toEqual(["Let's brainstorm."]);
  });
});
