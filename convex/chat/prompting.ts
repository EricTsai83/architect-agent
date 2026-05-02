import { MAX_CONTEXT_ARTIFACTS } from "../lib/constants";
import type { ReplyContext } from "./context";

/**
 * UI language for the degraded heuristic response. The chat UI is currently
 * English-only, so we default to "en". The i18n map below is intentionally
 * preserved so additional locales can be plugged in once the UI starts
 * persisting a per-thread/per-user language hint (e.g. on `ReplyContext`).
 */
type UILanguage = "en" | "zh";

function getUILanguage(_context: ReplyContext): UILanguage {
  return "en";
}

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
  const language = getUILanguage(context);

  const noRepoNoKeyMessages = {
    en: [
      `\`OPENAI_API_KEY\` is not configured, and this thread is not bound to a repository, so I cannot provide a grounded response.`,
      "",
      `Your question: ${question}`,
      "",
      "Suggestion: Attach a repository from the sidebar and ask again to get grounded / deep mode responses.",
    ],
    zh: [
      `目前沒有設定 \`OPENAI_API_KEY\`，且這個對話尚未綁定 repository，所以無法做 grounded 回覆。`,
      "",
      `你的問題：${question}`,
      "",
      "建議：在側邊欄附加一個 repository 之後再提問，就能取得 grounded / deep 模式的回覆。",
    ],
  };

  if (!context.sourceRepoFullName) {
    return noRepoNoKeyMessages[language].join("\n");
  }

  const withRepoNoKeyMessages = {
    en: [
      `\`OPENAI_API_KEY\` is not configured, so I'm using indexed repository artifacts to answer.`,
      "",
      `Repository: ${context.sourceRepoFullName}`,
      context.repositorySummary ? `- Summary: ${context.repositorySummary}` : undefined,
      context.architectureSummary ? `- Architecture: ${context.architectureSummary}` : undefined,
      "",
      `Your question: ${question}`,
      "",
      relevantChunks.length > 0
        ? `Most relevant code references: ${relevantChunks.map((chunk) => `\`${chunk.path}\``).join(", ")}`
        : "Not enough code snippets were selected; consider running a deep analysis first.",
    ],
    zh: [
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
    ],
  };

  return withRepoNoKeyMessages[language]
    .filter(Boolean)
    .join("\n");
}
