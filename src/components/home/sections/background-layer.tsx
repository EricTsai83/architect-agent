/**
 * Two stacked aria-hidden gradients painted behind every signed-out
 * section. Kept as a dedicated layer so individual sections can stay
 * concerned only with their own content.
 *
 * The gradient strings are hoisted to module-scope constants because they
 * are long and finicky — naming them as `*_GRADIENT` / `*_PATTERN` makes
 * the intent ("colored radial wash" vs. "tiling grid") obvious from the
 * JSX without having to parse 200+ characters of CSS.
 */

/**
 * Three soft radial color washes pinned to the corners + bottom. Tuned for
 * the dark theme; light theme tones the whole layer down via the
 * `dark:opacity-60` class on the rendered `<div>`.
 */
const COLOR_WASH_GRADIENT =
  "radial-gradient(58% 50% at 12% -4%, rgba(56,189,248,0.22) 0%, rgba(56,189,248,0) 60%)," +
  "radial-gradient(45% 40% at 92% 8%, rgba(125,211,252,0.18) 0%, rgba(125,211,252,0) 60%)," +
  "radial-gradient(50% 38% at 50% 96%, rgba(255,59,107,0.12) 0%, rgba(255,59,107,0) 60%)";

/**
 * 36 px tiling grid. Color is `currentColor` so the grid follows the
 * page's text color — meaningfully visible in dark mode, near-invisible
 * in light mode (which is the desired effect; the mask further fades the
 * grid as it approaches the bottom of the viewport).
 */
const GRID_PATTERN =
  "linear-gradient(to right, currentColor 1px, transparent 1px)," +
  "linear-gradient(to bottom, currentColor 1px, transparent 1px)";

export function BackgroundLayer() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.32] dark:opacity-60"
        style={{ backgroundImage: COLOR_WASH_GRADIENT }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] mask-[radial-gradient(ellipse_at_top,black,transparent_75%)]"
        style={{
          backgroundImage: GRID_PATTERN,
          backgroundSize: "36px 36px",
        }}
      />
    </>
  );
}
