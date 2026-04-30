import { NARRATIVE } from '../data';
import { Reveal } from '../primitives/reveal';
import type { NarrativeEntry } from '../types';

const HEADING_ID = 'how-heading';

/**
 * Stagger between adjacent narrative rows. Pulled to module scope so the
 * three rows feel like a sequence rather than a hard cut, and so the
 * cadence is one constant to tune instead of one literal per row.
 */
const ROW_STAGGER_MS = 80;

export function Narrative() {
  return (
    <Reveal>
      <section
        id="how"
        aria-labelledby={HEADING_ID}
        className="relative flex flex-col gap-10 sm:gap-12"
      >
        <h2
          id={HEADING_ID}
          className="max-w-3xl text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-4xl"
        >
          A repo URL becomes a grounded answer in three moves.
        </h2>

        <ol className="flex flex-col gap-0">
          {NARRATIVE.map((item, idx) => (
            <NarrativeRow key={item.num} item={item} index={idx} />
          ))}
        </ol>
      </section>
    </Reveal>
  );
}

function NarrativeRow({ item, index }: { item: NarrativeEntry; index: number }) {
  return (
    <li
      className="group/row relative isolate grid grid-cols-[auto_1fr] items-baseline gap-x-4 border-t border-border/60 py-6 pl-2 last:border-b sm:gap-x-10 sm:py-7 sm:pl-4"
      style={{ animationDelay: `${index * ROW_STAGGER_MS}ms` }}
    >
      <RowHoverAccents />
      <span className="font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground/90 transition-colors duration-150 group-hover/row:text-primary group-hover/row:duration-300 sm:text-lg">
        {item.num}
      </span>
      <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-6">
        <p className="text-balance text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
          {item.lead}
        </p>
        <p className="text-pretty text-[14px] leading-relaxed text-muted-foreground sm:flex-1 sm:text-[15px]">
          {item.trail}
        </p>
      </div>
    </li>
  );
}

/**
 * Three decorative layers that animate together on row hover:
 *   1. backdrop wash — anchored to the left line, wipes rightward.
 *   2. left accent  — appears instantly on hover (glow shadow).
 *   3. bottom rule  — extends from the same origin as the wash.
 *
 * All purely visual (`aria-hidden` + `pointer-events-none`). Kept in their
 * own component so `<NarrativeRow />` reads as content + accents, not as
 * a wall of `<span>`s with overlapping concerns.
 *
 * The `-left-2 sm:-left-4` offsets put the accents in the row's outer
 * gutter so they extend slightly *past* the row content — that's what
 * gives the hover state its "spotlit" feel rather than reading as a
 * boxed-in highlight.
 */
function RowHoverAccents() {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-2 right-0 -z-10 origin-left scale-x-0 transition-transform duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/row:scale-x-100 group-hover/row:duration-300 sm:-left-4"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(56,189,248,0.10) 0%, rgba(56,189,248,0.04) 40%, rgba(56,189,248,0) 80%)',
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-2 w-0.5 bg-primary opacity-0 shadow-[0_0_12px_rgba(56,189,248,0.55)] group-hover/row:opacity-100 sm:-left-4"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -left-2 right-0 -bottom-px h-px origin-left scale-x-0 bg-linear-to-r from-primary/50 via-primary/15 to-transparent transition-transform duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/row:scale-x-100 group-hover/row:duration-300 sm:-left-4"
      />
    </>
  );
}
