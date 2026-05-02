import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { STREAM_FLUSH_THRESHOLD } from "../lib/constants";
import { logWarn } from "../lib/observability";
import { estimateCostUsd } from "../lib/openaiPricing";
import type { ReplyContext } from "./context";
import { buildHeuristicAnswer, buildSystemPrompt, buildUserPrompt } from "./prompting";
import { selectRelevantChunks } from "./relevance";

export const generateAssistantReply = internalAction({
  args: {
    threadId: v.id("threads"),
    userMessageId: v.id("messages"),
    assistantMessageId: v.id("messages"),
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.chat.streaming.markAssistantReplyRunning, {
      assistantMessageId: args.assistantMessageId,
      jobId: args.jobId,
    });

    // Anything still buffered in pendingDelta below STREAM_FLUSH_THRESHOLD can be lost on a crash; recoverStaleChatJob only sees persisted messageStreamChunks flushed via appendAssistantStreamChunk before compactMessageStreamTail/finalizeAssistantReply/failAssistantReply run.
    let pendingDelta = "";

    try {
      const replyContext = (await ctx.runQuery(internal.chat.context.getReplyContext, {
        threadId: args.threadId,
      })) as ReplyContext;

      // Bind the assistant reply to the exact queued user message rather than
      // "the latest user message in this thread". If a second user message
      // ever lands between queueing and generation, picking the latest one
      // would cause this assistantMessageId to answer a different prompt
      // than it was paired with at send time. If the queued user message has
      // been deleted (or was filtered out of the context window), throw and
      // let the outer catch run failAssistantReply once — this keeps the
      // error path consistent with every other failure in this action.
      const queuedUserMessage = replyContext.messages.find((message) => message.id === args.userMessageId);
      if (!queuedUserMessage || queuedUserMessage.role !== "user") {
        throw new Error("Queued user message not found in thread context for this assistant reply.");
      }
      const userPrompt = queuedUserMessage.content;
      const relevantChunks = selectRelevantChunks(replyContext.chunks, userPrompt);

      if (!process.env.OPENAI_API_KEY) {
        const heuristicAnswer = buildHeuristicAnswer(replyContext, userPrompt, relevantChunks);
        await ctx.runMutation(internal.chat.streaming.finalizeAssistantReply, {
          threadId: args.threadId,
          assistantMessageId: args.assistantMessageId,
          jobId: args.jobId,
          finalDelta: heuristicAnswer,
        });
        return;
      }

      const modelName = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
      const response = streamText({
        model: openai(modelName),
        system: buildSystemPrompt(),
        prompt: buildUserPrompt(replyContext, userPrompt, relevantChunks),
      });

      for await (const delta of response.textStream) {
        pendingDelta += delta;
        if (pendingDelta.length >= STREAM_FLUSH_THRESHOLD) {
          await ctx.runMutation(internal.chat.streaming.appendAssistantStreamChunk, {
            assistantMessageId: args.assistantMessageId,
            jobId: args.jobId,
            delta: pendingDelta,
          });
          pendingDelta = "";
        }
      }

      let inputTokens: number | undefined;
      let outputTokens: number | undefined;
      let costUsd: number | undefined;
      try {
        const usage = await response.totalUsage;
        inputTokens = usage.inputTokens;
        outputTokens = usage.outputTokens;
        costUsd = estimateCostUsd(modelName, inputTokens, outputTokens);
      } catch (error) {
        logWarn("chat", "assistant_reply_usage_unavailable", {
          assistantMessageId: args.assistantMessageId,
          jobId: args.jobId,
          model: modelName,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      await ctx.runMutation(internal.chat.streaming.finalizeAssistantReply, {
        threadId: args.threadId,
        assistantMessageId: args.assistantMessageId,
        jobId: args.jobId,
        finalDelta: pendingDelta,
        inputTokens,
        outputTokens,
        costUsd,
      });
    } catch (error) {
      await ctx.runMutation(internal.chat.streaming.failAssistantReply, {
        assistantMessageId: args.assistantMessageId,
        jobId: args.jobId,
        errorMessage: error instanceof Error ? error.message : "Unknown assistant error",
        finalDelta: pendingDelta,
      });
    }
  },
});
