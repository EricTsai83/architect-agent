import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Returns `true` when the user's OS or browser is configured to prefer
 * reduced motion. The value is **reactive** — if the user toggles the
 * preference while the page is open (e.g. via System Preferences on
 * macOS), the hook triggers a re-render with the updated value.
 *
 * Use this to gate JS-driven animations (typewriter effects, scroll-
 * driven transitions, etc.) so `prefers-reduced-motion` users never
 * see them. CSS-only animations should still be handled via the
 * `@media (prefers-reduced-motion: reduce)` block in `index.css`.
 */
export function usePrefersReducedMotion(): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return matches;
}
