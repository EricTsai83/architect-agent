/**
 * Two stacked aria-hidden gradients painted behind every signed-out
 * section. Kept as a dedicated layer so individual sections can stay
 * concerned only with their own content.
 */
export function BackgroundLayer() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.32] dark:opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(58% 50% at 12% -4%, rgba(56,189,248,0.22) 0%, rgba(56,189,248,0) 60%), radial-gradient(45% 40% at 92% 8%, rgba(125,211,252,0.18) 0%, rgba(125,211,252,0) 60%), radial-gradient(50% 38% at 50% 96%, rgba(255,59,107,0.12) 0%, rgba(255,59,107,0) 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] mask-[radial-gradient(ellipse_at_top,black,transparent_75%)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
    </>
  );
}
