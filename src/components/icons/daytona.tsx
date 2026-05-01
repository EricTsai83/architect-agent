import type { SVGProps } from "react";

/**
 * Daytona logo: a 7-blade pinwheel of bold rectangles arranged ~51.4° apart
 * around the center with a slight tangential offset to create the spinning
 * effect. Drawn with `<rect>`s so it scales crisply at any size and respects
 * `currentColor` for theming.
 */
export function DaytonaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="10 10 80 80" fill="currentColor" aria-hidden="true" {...props}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x="54" y="36" width="30" height="10" transform={`rotate(${i * (360 / 7)} 50 50)`} />
      ))}
    </svg>
  );
}
