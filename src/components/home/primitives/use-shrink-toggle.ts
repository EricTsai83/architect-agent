import { useEffect, useRef, useState } from 'react';

type UseShrinkToggleResult = {
  isOpen: boolean;
  /** True for the brief shrink-half of the icon animation. Use this to drive the icon CSS. */
  isShrinking: boolean;
  /** Toggle open ↔ closed after a short shrink animation. No-op while shrinking. */
  toggle: () => void;
};

/**
 * Two-phase toggle: the icon shrinks to a point, then the open/closed state
 * flips and the icon re-expands into its other shape.
 *
 * Used by `<Faq />` for the cross → minus icon animation. Pulled into a
 * hook so:
 *
 *   - The cleanup-on-unmount behavior is impossible to forget (every
 *     consumer gets it for free, instead of relying on each call site to
 *     wire its own `useEffect` teardown).
 *   - Re-entrancy is centralized — rapid clicks during the shrink phase
 *     are ignored here, not at the call site.
 *   - `<FaqItem />` reads as a disclosure widget, not a state machine.
 *
 * @param shrinkMs Half-duration of the icon animation. The icon shrinks
 *   for this long, then the state flips and the icon expands for the
 *   same duration.
 */
export function useShrinkToggle(shrinkMs: number): UseShrinkToggleResult {
  const [isOpen, setIsOpen] = useState(false);
  const [isShrinking, setIsShrinking] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Single mount/unmount effect: on teardown, cancel any in-flight timer so
  // it can't fire after the component is gone (which would be a no-op
  // setState on an unmounted instance — React 18+ tolerates it but warns,
  // and clearing it is cheap and explicit).
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const toggle = () => {
    // Re-entrancy guard: a click mid-shrink would queue a second timer
    // and end up flipping the state twice. The animation also looks
    // wrong if interrupted partway through.
    if (isShrinking) return;
    setIsShrinking(true);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setIsOpen((prev) => !prev);
      setIsShrinking(false);
    }, shrinkMs);
  };

  return { isOpen, isShrinking, toggle };
}
