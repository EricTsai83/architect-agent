import type { SVGProps } from "react";

/**
 * X (formerly Twitter) wordmark glyph. Drawn at 16×16 to match the
 * other small social icons (`GitHubIcon`) so it can be dropped into
 * the same flex rows without having to rebalance whitespace.
 */
export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.601.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.42 5.07H.32l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.876 11.633Z" />
    </svg>
  );
}
