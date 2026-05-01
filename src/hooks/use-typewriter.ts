import { useEffect, useState } from "react";

type Phase = "typing" | "pausingType" | "deleting" | "pausingDelete";

export type UseTypewriterOptions = {
  /**
   * Phrases to cycle through. The hook types each one out, pauses, deletes
   * it, then moves on to the next. When the list is exhausted it wraps back
   * to the first entry. An empty list returns an empty string.
   *
   * **Stability:** pass a stable reference (module-level constant or
   * `useMemo`). An inline array literal creates a new reference every
   * render, which restarts the effect loop.
   */
  words: ReadonlyArray<string>;
  /**
   * When `false`, the typewriter resets to an empty string and stops
   * scheduling timers. Flip this on/off (e.g. while the input is focused
   * or has user-supplied content) instead of conditionally rendering — the
   * hook handles its own teardown.
   */
  active?: boolean;
  /** ms between characters while typing. Default 90. */
  typeSpeed?: number;
  /** ms between characters while deleting. Default 40. */
  deleteSpeed?: number;
  /** ms held on a fully-typed phrase before deletion begins. Default 1400. */
  pauseAfterType?: number;
  /** ms held on an empty buffer before the next phrase starts. Default 350. */
  pauseAfterDelete?: number;
};

/**
 * Drives a typewriter-style placeholder: cycles through `words`, returning
 * the substring that should currently be visible. Pair the returned string
 * with a separately-rendered caret element placed *after* the text in the
 * DOM, and the caret will naturally track the last visible character without
 * any extra positioning math.
 *
 * The hook is purely time-based — it doesn't read or write the input value,
 * so the consumer stays in control of when to hide the typewriter (e.g.
 * `active={!value && !isFocused}`).
 */
export function useTypewriter({
  words,
  active = true,
  typeSpeed = 90,
  deleteSpeed = 40,
  pauseAfterType = 1400,
  pauseAfterDelete = 350,
}: UseTypewriterOptions): string {
  const [text, setText] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (!active || words.length === 0) {
      if (text !== "" || wordIdx !== 0 || phase !== "typing") {
        timer = setTimeout(() => {
          setText("");
          setWordIdx(0);
          setPhase("typing");
        }, 0);
      }

      return () => {
        if (timer !== undefined) clearTimeout(timer);
      };
    }

    const word = words[wordIdx % words.length];

    switch (phase) {
      case "typing": {
        if (text.length < word.length) {
          timer = setTimeout(() => {
            setText(word.slice(0, text.length + 1));
          }, typeSpeed);
        } else {
          // Typing complete — transition immediately to the pause phase.
          // A 0ms timer keeps the transition cancellable and avoids a
          // synchronous state update inside the effect body.
          timer = setTimeout(() => setPhase("pausingType"), 0);
        }
        break;
      }
      case "pausingType": {
        timer = setTimeout(() => setPhase("deleting"), pauseAfterType);
        break;
      }
      case "deleting": {
        if (text.length > 0) {
          timer = setTimeout(() => {
            setText((current) => current.slice(0, -1));
          }, deleteSpeed);
        } else {
          // Deletion complete — same cancellable immediate transition as above.
          timer = setTimeout(() => setPhase("pausingDelete"), 0);
        }
        break;
      }
      case "pausingDelete": {
        timer = setTimeout(() => {
          setWordIdx((i) => (i + 1) % words.length);
          setPhase("typing");
        }, pauseAfterDelete);
        break;
      }
    }

    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [text, wordIdx, phase, active, words, typeSpeed, deleteSpeed, pauseAfterType, pauseAfterDelete]);

  // While inactive, or without words, the hook resets and renders nothing.
  return active && words.length > 0 ? text : "";
}
