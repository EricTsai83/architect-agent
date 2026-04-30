/**
 * Replay system for the hero "Replay" button.
 *
 * CSS animations don't have a clean "restart" API: setting `animation: none`
 * and back to `''` on the next frame is the canonical workaround. The hard
 * part isn't *that* — it's deciding *which* elements should be replayed.
 *
 * Earlier versions of this code listed every animation class by name in a
 * `querySelectorAll('.animate-fade-up, .animate-fade-in, …')` selector.
 * That coupled the replay button to the exact set of class names used in
 * `<HeroChat />` — adding or renaming an animation class would silently
 * break the replay (the new element wouldn't be reset, but no test would
 * catch it).
 *
 * Instead, we mark each element that should be replayed with a stable
 * data attribute. The replay routine queries for that attribute alone.
 * Adding a new animated element is a one-line change at the call site;
 * the helper here never needs to be touched.
 *
 * Looping animations (e.g. `animate-pulse-soft`, `animate-cat-blink`,
 * `animate-cat-tail-wag`) deliberately do *not* receive this attribute —
 * resetting them would cause a visible jump and looping cadence already
 * conveys the "alive" feel without a replay.
 */

/**
 * Spread `{ [REPLAY_ON_MOUNT_ATTR]: '' }` onto any element with a one-shot
 * entry animation that the hero "Replay" button should re-trigger.
 */
export const REPLAY_ON_MOUNT_ATTR = 'data-replay-on-mount';

/**
 * Restart every replayable CSS animation inside `container` without
 * unmounting it.
 *
 * Uses `animationName` (longhand) instead of the `animation` shorthand so
 * inline `animationDelay` / `animationDuration` values set by React are
 * preserved across the reset.
 *
 * Returns the number of elements that were replayed. Call sites can use
 * this to assert in tests or log if it ever drops to zero unexpectedly.
 */
export function replayAnimationsIn(container: HTMLElement): number {
  const animated = container.querySelectorAll<HTMLElement>(`[${REPLAY_ON_MOUNT_ATTR}]`);
  if (animated.length === 0) return 0;

  animated.forEach((el) => {
    el.style.animationName = 'none';
  });
  // Force a reflow so the browser registers the reset before the next paint.
  // Reading `offsetHeight` is the cheapest synchronous-layout trigger
  // available; the result is intentionally discarded.
  void container.offsetHeight;
  animated.forEach((el) => {
    el.style.animationName = '';
  });
  return animated.length;
}
