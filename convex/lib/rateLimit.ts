import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";
import { components } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";

export type RateLimitBucket =
  | "importRequests"
  | "deepAnalysisRequests"
  | "chatRequestsPerOwner"
  | "chatRequestsGlobal"
  | "daytonaRequestsGlobal";

export type InFlightBucket = "repositoryImportInFlight" | "repositoryDeepAnalysisInFlight" | "threadChatInFlight";

type AppErrorCode = "RATE_LIMIT_EXCEEDED" | "OPERATION_ALREADY_IN_PROGRESS";

function readPositiveIntEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

const RATE_LIMIT_MESSAGES: Record<RateLimitBucket, string> = {
  importRequests: "Too many repository import requests. Please retry later.",
  deepAnalysisRequests: "Too many deep analysis requests. Please retry later.",
  chatRequestsPerOwner: "Too many chat requests. Please retry later.",
  chatRequestsGlobal: "Chat capacity is temporarily full. Please retry later.",
  daytonaRequestsGlobal: "Analysis capacity is temporarily full. Please retry later.",
};

const DEFAULT_IMPORTS_PER_HOUR = 5;
const DEFAULT_DEEP_ANALYSIS_PER_HOUR = 10;
const DEFAULT_CHAT_PER_MINUTE = 30;
const DEFAULT_CHAT_BURST_CAPACITY = 6;
const DEFAULT_GLOBAL_CHAT_PER_MINUTE = 300;
const DEFAULT_GLOBAL_CHAT_BURST_CAPACITY = 60;
const DEFAULT_DAYTONA_GLOBAL_PER_HOUR = 30;

export const CHAT_JOB_LEASE_MS = readPositiveIntEnv("CHAT_JOB_LEASE_MS", 10 * 60_000);
export const DEEP_ANALYSIS_JOB_LEASE_MS = readPositiveIntEnv("DEEP_ANALYSIS_JOB_LEASE_MS", 60 * 60_000);

export function isLeaseActive(leaseExpiresAt: number | undefined, now = Date.now()) {
  return typeof leaseExpiresAt === "number" && leaseExpiresAt > now;
}

export function getLeaseRetryAfterMs(leaseExpiresAt: number | undefined, now = Date.now()) {
  if (!isLeaseActive(leaseExpiresAt, now)) {
    return undefined;
  }

  return Math.max(1, leaseExpiresAt! - now);
}

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  importRequests: {
    kind: "fixed window",
    rate: readPositiveIntEnv("RATE_LIMIT_IMPORT_PER_HOUR", DEFAULT_IMPORTS_PER_HOUR),
    period: HOUR,
  },
  deepAnalysisRequests: {
    kind: "fixed window",
    rate: readPositiveIntEnv("RATE_LIMIT_DEEP_ANALYSIS_PER_HOUR", DEFAULT_DEEP_ANALYSIS_PER_HOUR),
    period: HOUR,
  },
  chatRequestsPerOwner: {
    kind: "token bucket",
    rate: readPositiveIntEnv("RATE_LIMIT_CHAT_PER_MINUTE", DEFAULT_CHAT_PER_MINUTE),
    period: MINUTE,
    capacity: readPositiveIntEnv("RATE_LIMIT_CHAT_BURST_CAPACITY", DEFAULT_CHAT_BURST_CAPACITY),
  },
  chatRequestsGlobal: {
    kind: "token bucket",
    rate: readPositiveIntEnv("RATE_LIMIT_GLOBAL_CHAT_PER_MINUTE", DEFAULT_GLOBAL_CHAT_PER_MINUTE),
    period: MINUTE,
    capacity: readPositiveIntEnv("RATE_LIMIT_GLOBAL_CHAT_BURST_CAPACITY", DEFAULT_GLOBAL_CHAT_BURST_CAPACITY),
    shards: 10,
  },
  daytonaRequestsGlobal: {
    kind: "fixed window",
    rate: readPositiveIntEnv("RATE_LIMIT_DAYTONA_GLOBAL_PER_HOUR", DEFAULT_DAYTONA_GLOBAL_PER_HOUR),
    period: HOUR,
    shards: 10,
  },
});

function throwAppError(
  code: AppErrorCode,
  bucket: RateLimitBucket | InFlightBucket,
  message: string,
  retryAfterMs?: number,
): never {
  throw new ConvexError({
    code,
    bucket,
    retryAfterMs,
    message,
  });
}

export function throwRateLimitExceeded(bucket: RateLimitBucket, retryAfterMs?: number): never {
  throwAppError(
    "RATE_LIMIT_EXCEEDED",
    bucket,
    RATE_LIMIT_MESSAGES[bucket],
    retryAfterMs ? Math.max(1, Math.ceil(retryAfterMs)) : undefined,
  );
}

export function throwOperationAlreadyInProgress(bucket: InFlightBucket, message: string, retryAfterMs?: number): never {
  throwAppError(
    "OPERATION_ALREADY_IN_PROGRESS",
    bucket,
    message,
    retryAfterMs ? Math.max(1, Math.ceil(retryAfterMs)) : undefined,
  );
}

async function consumeRateLimit(
  ctx: MutationCtx,
  bucket: RateLimitBucket,
  options?: {
    key?: string;
  },
) {
  const status = await rateLimiter.limit(ctx, bucket, options);
  if (!status.ok) {
    throwRateLimitExceeded(bucket, status.retryAfter);
  }
}

export async function consumeImportRateLimit(ctx: MutationCtx, ownerTokenIdentifier: string) {
  await consumeRateLimit(ctx, "importRequests", { key: ownerTokenIdentifier });
}

export async function consumeDeepAnalysisRateLimit(ctx: MutationCtx, ownerTokenIdentifier: string) {
  await consumeRateLimit(ctx, "deepAnalysisRequests", { key: ownerTokenIdentifier });
}

export async function consumeChatRateLimit(ctx: MutationCtx, ownerTokenIdentifier: string) {
  await consumeRateLimit(ctx, "chatRequestsPerOwner", { key: ownerTokenIdentifier });
}

export async function consumeChatGlobalRateLimit(ctx: MutationCtx) {
  await consumeRateLimit(ctx, "chatRequestsGlobal");
}

export async function consumeDaytonaGlobalRateLimit(ctx: MutationCtx) {
  await consumeRateLimit(ctx, "daytonaRequestsGlobal");
}
