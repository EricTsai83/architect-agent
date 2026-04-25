import type { Id } from '../../convex/_generated/dataModel';
import type { ChatMode } from '../../convex/chatModeResolver';

export type RepositoryId = Id<'repositories'>;
export type ThreadId = Id<'threads'>;
export type MessageId = Id<'messages'>;

/**
 * UI-level chat mode the user picks in the ChatPanel selector. Mirrors the
 * resolver's `ChatMode` so there is exactly one source of truth across the
 * client and server.
 */
export type { ChatMode };

/**
 * Schema-level mode persisted on `threads.mode` and `messages.mode`. The
 * schema only records whether sandbox-backed analysis was used (`'deep'`)
 * versus everything else (`'fast'`); the repository attachment is encoded
 * separately on `thread.repositoryId`. Hence both `'general'` and `'grounded'`
 * map to `'fast'` here — the distinction is purely UI-level for the mode
 * selector and the disabled-mode tooltips.
 */
export type BackendThreadMode = 'fast' | 'deep';

export function toBackendThreadMode(mode: ChatMode): BackendThreadMode {
  return mode === 'deep' ? 'deep' : 'fast';
}

export type ActiveMessageStream = {
  assistantMessageId: MessageId;
  content: string;
  startedAt: number;
  lastAppendedAt: number;
};

export type DeepModeReasonCode =
  | 'available'
  | 'missing_sandbox'
  | 'sandbox_unavailable'
  | 'sandbox_expired'
  | 'sandbox_provisioning';

export type DeepModeStatus = {
  reasonCode: DeepModeReasonCode;
  message: string | null;
};
