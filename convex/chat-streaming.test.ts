/// <reference types="vite/client" />

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { convexTest } from 'convex-test';
import { api, internal } from './_generated/api';
import { MESSAGE_STREAM_COMPACT_CHUNK_THRESHOLD } from './lib/constants';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

describe('chat streaming lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('getActiveMessageStream reads the compacted prefix plus active tail', async () => {
    const ownerTokenIdentifier = 'user|active-stream';
    const t = convexTest(schema, modules);
    const { threadId, streamId, assistantMessageId } = await createStreamingFixture(t, ownerTokenIdentifier, 'active-stream');

    await t.run(async (ctx) => {
      await ctx.db.patch(streamId, {
        compactedContent: 'Hello ',
        compactedThroughSequence: 0,
        nextSequence: 2,
      });
      await ctx.db.insert('messageStreamChunks', {
        streamId,
        sequence: 1,
        text: 'world',
      });
      await ctx.db.patch(assistantMessageId, {
        status: 'streaming',
      });
    });

    const viewer = t.withIdentity({ tokenIdentifier: ownerTokenIdentifier });
    const activeStream = await viewer.query(api.chat.getActiveMessageStream, { threadId });

    expect(activeStream).toMatchObject({
      assistantMessageId,
      content: 'Hello world',
    });
  });

  test('appendAssistantStreamChunk compacts the tail and finalizeAssistantReply writes once', async () => {
    const ownerTokenIdentifier = 'user|stream-finalize';
    const t = convexTest(schema, modules);
    const { threadId, jobId, assistantMessageId, streamId } = await createStreamingFixture(
      t,
      ownerTokenIdentifier,
      'stream-finalize',
    );

    const compactedParts: string[] = [];
    for (let index = 0; index < MESSAGE_STREAM_COMPACT_CHUNK_THRESHOLD; index += 1) {
      const part = `chunk-${index}|`;
      compactedParts.push(part);
      await t.mutation(internal.chat.appendAssistantStreamChunk, {
        assistantMessageId,
        delta: part,
      });
    }

    const afterCompaction = await t.run(async (ctx) => ({
      stream: await ctx.db.get(streamId),
      tailChunks: await ctx.db
        .query('messageStreamChunks')
        .withIndex('by_streamId_and_sequence', (q) => q.eq('streamId', streamId))
        .take(20),
    }));

    expect(afterCompaction.stream?.compactedContent).toBe(compactedParts.join(''));
    expect(afterCompaction.stream?.compactedThroughSequence).toBe(MESSAGE_STREAM_COMPACT_CHUNK_THRESHOLD - 1);
    expect(afterCompaction.tailChunks).toHaveLength(0);

    await t.mutation(internal.chat.finalizeAssistantReply, {
      threadId,
      assistantMessageId,
      jobId,
      finalDelta: 'done',
    });

    const finalized = await t.run(async (ctx) => ({
      message: await ctx.db.get(assistantMessageId),
      stream: await ctx.db.get(streamId),
      tailChunks: await ctx.db
        .query('messageStreamChunks')
        .withIndex('by_streamId_and_sequence', (q) => q.eq('streamId', streamId))
        .take(20),
      job: await ctx.db.get(jobId),
    }));

    expect(finalized.message?.status).toBe('completed');
    expect(finalized.message?.content).toBe(`${compactedParts.join('')}done`);
    expect(finalized.stream).toBeNull();
    expect(finalized.tailChunks).toHaveLength(0);
    expect(finalized.job?.status).toBe('completed');
  });

  test('failAssistantReply preserves streamed content and removes stream state', async () => {
    const ownerTokenIdentifier = 'user|stream-fail';
    const t = convexTest(schema, modules);
    const { jobId, assistantMessageId, streamId } = await createStreamingFixture(t, ownerTokenIdentifier, 'stream-fail');

    await t.mutation(internal.chat.appendAssistantStreamChunk, {
      assistantMessageId,
      delta: 'partial ',
    });

    await t.mutation(internal.chat.failAssistantReply, {
      assistantMessageId,
      jobId,
      errorMessage: 'stream failed',
      finalDelta: 'tail',
    });

    const failed = await t.run(async (ctx) => ({
      message: await ctx.db.get(assistantMessageId),
      stream: await ctx.db.get(streamId),
      tailChunks: await ctx.db
        .query('messageStreamChunks')
        .withIndex('by_streamId_and_sequence', (q) => q.eq('streamId', streamId))
        .take(20),
    }));

    expect(failed.message?.status).toBe('failed');
    expect(failed.message?.content).toBe('partial tail');
    expect(failed.message?.errorMessage).toBe('stream failed');
    expect(failed.stream).toBeNull();
    expect(failed.tailChunks).toHaveLength(0);
  });

  test('repository cascade cleanup removes active stream tables', async () => {
    const ownerTokenIdentifier = 'user|repo-cascade';
    const t = convexTest(schema, modules);
    const { repositoryId, threadId, jobId, assistantMessageId, streamId } = await createStreamingFixture(
      t,
      ownerTokenIdentifier,
      'repo-cascade',
    );

    await t.mutation(internal.chat.appendAssistantStreamChunk, {
      assistantMessageId,
      delta: 'active chunk',
    });

    await t.mutation(internal.repositories.cascadeDeleteRepository, {
      repositoryId,
    });

    const afterDelete = await t.run(async (ctx) => ({
      repository: await ctx.db.get(repositoryId),
      thread: await ctx.db.get(threadId),
      job: await ctx.db.get(jobId),
      assistantMessage: await ctx.db.get(assistantMessageId),
      stream: await ctx.db.get(streamId),
      tailChunks: await ctx.db
        .query('messageStreamChunks')
        .withIndex('by_streamId_and_sequence', (q) => q.eq('streamId', streamId))
        .take(20),
    }));

    expect(afterDelete.repository).toBeNull();
    expect(afterDelete.thread).toBeNull();
    expect(afterDelete.job).toBeNull();
    expect(afterDelete.assistantMessage).toBeNull();
    expect(afterDelete.stream).toBeNull();
    expect(afterDelete.tailChunks).toHaveLength(0);
  });
});

async function createStreamingFixture(
  t: ReturnType<typeof convexTest>,
  ownerTokenIdentifier: string,
  slug: string,
) {
  return await t.run(async (ctx) => {
    const repositoryId = await ctx.db.insert('repositories', {
      ownerTokenIdentifier,
      sourceHost: 'github',
      sourceUrl: `https://github.com/acme/${slug}`,
      sourceRepoFullName: `acme/${slug}`,
      sourceRepoOwner: 'acme',
      sourceRepoName: slug,
      defaultBranch: 'main',
      visibility: 'private',
      accessMode: 'private',
      importStatus: 'completed',
      detectedLanguages: [],
      packageManagers: [],
      entrypoints: [],
      fileCount: 0,
    });

    const threadId = await ctx.db.insert('threads', {
      repositoryId,
      ownerTokenIdentifier,
      title: `${slug} thread`,
      mode: 'fast',
      lastMessageAt: Date.now(),
    });

    const jobId = await ctx.db.insert('jobs', {
      repositoryId,
      ownerTokenIdentifier,
      threadId,
      kind: 'chat',
      status: 'running',
      stage: 'generating_reply',
      progress: 0.5,
      costCategory: 'chat',
      triggerSource: 'user',
      startedAt: Date.now(),
      leaseExpiresAt: Date.now() + 60_000,
    });

    await ctx.db.insert('messages', {
      repositoryId,
      threadId,
      jobId,
      ownerTokenIdentifier,
      role: 'user',
      status: 'completed',
      mode: 'fast',
      content: 'How does this work?',
    });

    const assistantMessageId = await ctx.db.insert('messages', {
      repositoryId,
      threadId,
      jobId,
      ownerTokenIdentifier,
      role: 'assistant',
      status: 'streaming',
      mode: 'fast',
      content: '',
    });

    const streamId = await ctx.db.insert('messageStreams', {
      repositoryId,
      threadId,
      jobId,
      assistantMessageId,
      ownerTokenIdentifier,
      compactedContent: '',
      compactedThroughSequence: -1,
      nextSequence: 0,
      startedAt: Date.now(),
      lastAppendedAt: Date.now(),
    });

    return { repositoryId, threadId, jobId, assistantMessageId, streamId };
  });
}
