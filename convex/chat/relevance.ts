import { MAX_RELEVANT_CHUNKS } from "../lib/constants";

const SHORT_TECH_TOKENS = new Set([
  "ai",
  "cd",
  "ci",
  "db",
  "dx",
  "fs",
  "go",
  "io",
  "js",
  "md",
  "os",
  "qa",
  "ts",
  "ui",
  "ux",
  "vm",
]);

const QUESTION_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "can",
  "does",
  "for",
  "how",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "or",
  "show",
  "tell",
  "the",
  "this",
  "to",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "work",
  "works",
  "you",
  "your",
]);

function tokenizeQuestion(question: string) {
  return Array.from(
    new Set(
      question
        .toLowerCase()
        .split(/[^a-z0-9_]+/g)
        .filter(
          (token) =>
            token.length > 0 && !QUESTION_STOPWORDS.has(token) && (token.length > 2 || SHORT_TECH_TOKENS.has(token)),
        ),
    ),
  );
}

export function buildChunkSearchQuery(question: string) {
  return tokenizeQuestion(question).slice(0, 8).join(" ");
}

export function selectRelevantChunks(
  chunks: Array<{ path: string; summary: string; content: string }>,
  question: string,
) {
  const tokens = tokenizeQuestion(question);

  if (tokens.length === 0) {
    return chunks.slice(0, MAX_RELEVANT_CHUNKS);
  }

  return [...chunks]
    .map((chunk, origIndex) => ({
      ...chunk,
      origIndex,
      score: tokens.reduce((count, token) => {
        let nextScore = count;
        if (chunk.path.toLowerCase().includes(token)) {
          nextScore += 3;
        }
        if (chunk.summary.toLowerCase().includes(token)) {
          nextScore += 2;
        }
        if (chunk.content.toLowerCase().includes(token)) {
          nextScore += 1;
        }
        return nextScore;
      }, 0),
    }))
    .sort((left, right) => right.score - left.score || left.origIndex - right.origIndex)
    .slice(0, MAX_RELEVANT_CHUNKS)
    .map(({ origIndex: _origIndex, score: _score, ...chunk }) => chunk);
}
