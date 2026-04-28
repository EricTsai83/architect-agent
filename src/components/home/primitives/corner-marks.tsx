/**
 * Decorative corner brackets. Used to give terminal-style panels a
 * "cropped" look without committing the design to a full border. Purely
 * visual — `aria-hidden` on every span so screen readers skip them.
 */
export function CornerMarks() {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 size-2.5 border-l border-t border-foreground/30"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 size-2.5 border-r border-t border-foreground/30"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 size-2.5 border-b border-l border-foreground/30"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 size-2.5 border-b border-r border-foreground/30"
      />
    </>
  );
}
