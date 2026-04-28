import { useCallback, useEffect, useRef, useState } from 'react';

type UseClipboardOptions = {
  /** Milliseconds before `copied` flips back to `false`. Defaults to 1600. */
  resetAfterMs?: number;
};

type UseClipboardResult = {
  copied: boolean;
  /** Returns whether the copy was attempted. The promise resolves with the success boolean. */
  copy: (text: string) => Promise<boolean>;
};

/**
 * Copy-to-clipboard with an auto-resetting `copied` flag.
 *
 * Robustness notes:
 *   - Guards `navigator.clipboard` for environments where it is missing
 *     (older browsers, some embedded webviews) — `copy` resolves to `false`
 *     instead of throwing.
 *   - Suppresses `setState` after unmount so a slow `writeText` promise
 *     resolving post-teardown does not warn or trigger a stale render.
 *   - The reset timer is owned by `useEffect`, so flipping `copied` true
 *     repeatedly (rapid clicks) cleanly cancels and re-arms a single timer.
 */
export function useClipboard({ resetAfterMs = 1600 }: UseClipboardOptions = {}): UseClipboardResult {
  const [copied, setCopied] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => {
      if (isMountedRef.current) {
        setCopied(false);
      }
    }, resetAfterMs);
    return () => window.clearTimeout(timer);
  }, [copied, resetAfterMs]);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      if (isMountedRef.current) {
        setCopied(true);
      }
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, []);

  return { copied, copy };
}
