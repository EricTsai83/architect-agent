import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";
import { requireViewerIdentity } from "../lib/auth";
import { CHAT_JOB_LEASE_MS } from "../lib/rateLimit";
import { logWarn } from "../lib/observability";
import {
  compactMessageStreamTail,
  deleteMessageStreamState,
  getMessageStreamByThread,
  getMessageStreamByAssistantMessageId,
  getMessageStreamByJobId,
  loadAllStreamTailChunks,
  loadMessageStreamSnapshot,
} from "./streamStore";

const STALE_CHAT_JOB_ERROR_MESSAGE = "The assistant reply stalled and was automatically marked as failed.";

export const getActiveMessageStream = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await requireViewerIdentity(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found.");
    }

    if (thread.ownerTokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Thread not found.");
    }

    if (thread.repositoryId) {
      const repository = await ctx.db.get(thread.repositoryId);
      if (!repository || repository.ownerTokenIdentifier !== identity.tokenIdentifier) {
        throw new Error("Thread not found.");
      }
    }

    const stream = await getMessageStreamByThread(ctx, args.threadId);
    if (!stream) {
      return null;
    }

    const assistantMessage = await ctx.db.get(stream.assistantMessageId);
    if (!assistantMessage || assistantMessage.status !== "streaming") {
      return null;
    }

    const tailChunks = await loadAllStreamTailChunks(ctx, stream);

    return {
      assistantMessageId: stream.assistantMessageId,
      content: `${stream.compactedContent}${tailChunks.map((chunk) => chunk.text).join("")}`,
      startedAt: stream.startedAt,
      lastAppendedAt: stream.lastAppendedAt,
    };
  },
});

export const markAssistantReplyRunning = internalMutation({
  args: {
    assistantMessageId: v.id("messages"),
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.assistantMessageId, {
      status: "streaming",
    });
    await ctx.db.patch(args.jobId, {
      status: "running",
      stage: "generating_reply",
      progress: 0.15,
      startedAt: now,
      leaseExpiresAt: now + CHAT_JOB_LEASE_MS,
    });
  },
});

export const appendAssistantStreamChunk = internalMutation({
  args: {
    assistantMessageId: v.id("messages"),
    delta: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.delta) {
      return;
    }

    const stream = await getMessageStreamByAssistantMessageId(ctx, args.assistantMessageId);
    if (!stream) {
      logWarn("chat", "assistant_stream_missing_for_chunk_append", {
        assistantMessageId: args.assistantMessageId,
        deltaLength: args.delta.length,
        hint: "messageStreamChunks append skipped before compactMessageStreamTail",
      });
      throw new Error(
        "Missing message stream while appending assistant delta: messageStreamChunks append aborted before compactMessageStreamTail.",
      );
    }

    await ctx.db.insert("messageStreamChunks", {
      streamId: stream._id,
      sequence: stream.nextSequence,
      text: args.delta,
    });
    await ctx.db.patch(stream._id, {
      nextSequence: stream.nextSequence + 1,
      lastAppendedAt: Date.now(),
    });

    await compactMessageStreamTail(ctx, stream._id);
  },
});

export const finalizeAssistantReply = internalMutation({
  args: {
    threadId: v.id("threads"),
    assistantMessageId: v.id("messages"),
    jobId: v.id("jobs"),
    finalDelta: v.string(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.assistantMessageId);
    if (!message) {
      return;
    }

    const streamSnapshot = await loadMessageStreamSnapshot(ctx, args.assistantMessageId);
    const now = Date.now();
    const finalContent = `${streamSnapshot?.content ?? message.content}${args.finalDelta}`;
    await ctx.db.patch(args.assistantMessageId, {
      content: finalContent,
      status: "completed",
      errorMessage: undefined,
      estimatedInputTokens: args.inputTokens,
      estimatedOutputTokens: args.outputTokens,
    });
    await ctx.db.patch(args.threadId, {
      lastAssistantMessageAt: now,
      lastMessageAt: now,
    });
    await ctx.db.patch(args.jobId, {
      status: "completed",
      stage: "completed",
      progress: 1,
      completedAt: now,
      outputSummary: "Assistant reply generated.",
      estimatedInputTokens: args.inputTokens,
      estimatedOutputTokens: args.outputTokens,
      estimatedCostUsd: args.costUsd,
      leaseExpiresAt: undefined,
    });

    if (streamSnapshot) {
      await deleteMessageStreamState(ctx, streamSnapshot.stream._id);
    }
  },
});

export const failAssistantReply = internalMutation({
  args: {
    assistantMessageId: v.id("messages"),
    jobId: v.id("jobs"),
    errorMessage: v.string(),
    finalDelta: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const streamSnapshot = await loadMessageStreamSnapshot(ctx, args.assistantMessageId);
    const message = await ctx.db.get(args.assistantMessageId);
    if (!message) {
      if (streamSnapshot) {
        await deleteMessageStreamState(ctx, streamSnapshot.stream._id);
      }
      return;
    }

    const streamedContent = `${streamSnapshot?.content ?? message.content}${args.finalDelta ?? ""}`;
    await ctx.db.patch(args.assistantMessageId, {
      status: "failed",
      errorMessage: args.errorMessage,
      content: streamedContent || args.errorMessage,
    });
    await ctx.db.patch(args.jobId, {
      status: "failed",
      stage: "failed",
      progress: 1,
      completedAt: now,
      errorMessage: args.errorMessage,
      leaseExpiresAt: undefined,
    });

    if (streamSnapshot) {
      await deleteMessageStreamState(ctx, streamSnapshot.stream._id);
    }
  },
});

export const recoverStaleChatJob = internalMutation({
  args: {
    jobId: v.id("jobs"),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    const now = Date.now();
    if (
      !job ||
      job.kind !== "chat" ||
      (job.status !== "queued" && job.status !== "running") ||
      typeof job.leaseExpiresAt !== "number" ||
      job.leaseExpiresAt > now
    ) {
      return;
    }

    const message = args.errorMessage ?? STALE_CHAT_JOB_ERROR_MESSAGE;
    const jobMessages = await ctx.db
      .query("messages")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .take(10);
    const assistantMessage = jobMessages.find((entry) => entry.role === "assistant");
    const stream = await getMessageStreamByJobId(ctx, args.jobId);
    const streamSnapshot =
      assistantMessage && stream ? await loadMessageStreamSnapshot(ctx, assistantMessage._id) : null;

    if (assistantMessage) {
      await ctx.db.patch(assistantMessage._id, {
        status: "failed",
        errorMessage: message,
        content: streamSnapshot?.content || message,
      });
    }

    await ctx.db.patch(args.jobId, {
      status: "failed",
      stage: "failed",
      progress: 1,
      completedAt: now,
      errorMessage: message,
      leaseExpiresAt: undefined,
    });

    if (stream) {
      await deleteMessageStreamState(ctx, stream._id);
    }
  },
});
