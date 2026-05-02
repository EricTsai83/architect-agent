import { MAX_CONTEXT_ARTIFACTS } from "../lib/constants";
import type { ReplyContext } from "./context";

export function buildSystemPrompt() {
  return [
    "You are an open source architecture analyst.",
    "Answer questions about the imported repository using the provided artifacts and code excerpts.",
    "Be concrete, mention likely boundaries, and state uncertainty when evidence is weak.",
  ].join(" ");
}

export function buildUserPrompt(
  context: ReplyContext,
  question: string,
  relevantChunks: Array<{ path: string; summary: string; content: string }>,
) {
  const artifactSection = context.artifacts
    .slice(0, MAX_CONTEXT_ARTIFACTS)
    .map((artifact) => `## ${artifact.title}\n${artifact.summary}\n${artifact.contentMarkdown.slice(0, 1400)}`)
    .join("\n\n");
  const chunkSection = relevantChunks
    .map((chunk) => `### ${chunk.path}\n${chunk.summary}\n${chunk.content.slice(0, 1200)}`)
    .join("\n\n");

  const hasRepoContext =
    !!context.sourceRepoFullName ||
    !!context.repositorySummary ||
    context.artifacts.length > 0 ||
    relevantChunks.length > 0;

  return [
    context.sourceRepoFullName ? `Repository: ${context.sourceRepoFullName}` : undefined,
    context.repositorySummary ? `Repository summary: ${context.repositorySummary}` : undefined,
    context.readmeSummary ? `README summary: ${context.readmeSummary}` : undefined,
    context.architectureSummary ? `Architecture summary: ${context.architectureSummary}` : undefined,
    ...(hasRepoContext
      ? [
          "",
          "Artifacts:",
          artifactSection || "No artifacts were pre-selected.",
          "",
          "Relevant code excerpts:",
          chunkSection || "No highly relevant chunks were pre-selected.",
          "",
        ]
      : ["No repository is attached to this thread; answer from general architecture knowledge."]),
    `User question: ${question}`,
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

export function buildHeuristicAnswer(
  context: ReplyContext,
  question: string,
  relevantChunks: Array<{ path: string; summary: string; content: string }>,
) {
  if (!context.sourceRepoFullName) {
    return [
      `目前沒有設定 \`OPENAI_API_KEY\`，且這個對話尚未綁定 repository，所以無法做 grounded 回覆。`,
      "",
      `你的問題：${question}`,
      "",
      "建議：在側邊欄附加一個 repository 之後再提問，就能取得 grounded / deep 模式的回覆。",
    ].join("\n");
  }

  return [
    `目前沒有設定 \`OPENAI_API_KEY\`，所以我先用已索引的 repository artifact 回答。`,
    "",
    `Repository: ${context.sourceRepoFullName}`,
    context.repositorySummary ? `- Summary: ${context.repositorySummary}` : undefined,
    context.architectureSummary ? `- Architecture: ${context.architectureSummary}` : undefined,
    "",
    `你的問題：${question}`,
    "",
    relevantChunks.length > 0
      ? `我目前最相關的線索來自：${relevantChunks.map((chunk) => `\`${chunk.path}\``).join(", ")}`
      : "目前沒有足夠的程式碼片段被選中，建議先執行一次深度分析。",
  ]
    .filter(Boolean)
    .join("\n");
}
