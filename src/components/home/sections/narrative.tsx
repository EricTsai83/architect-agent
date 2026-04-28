import { NARRATIVE } from '../data';
import { Reveal } from '../primitives/reveal';

const HEADING_ID = 'how-heading';

export function Narrative() {
  return (
    <Reveal>
      <section
        id="how"
        aria-labelledby={HEADING_ID}
        className="relative grid grid-cols-[auto_1fr] gap-x-10 gap-y-12 sm:gap-x-14 lg:grid-cols-[auto_1fr_auto] lg:items-start"
      >
        <div className="hidden flex-col items-center gap-3 self-stretch lg:flex">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">how</span>
          <span
            className="block w-px flex-1 origin-top animate-line-draw-y bg-linear-to-b from-foreground/40 via-border to-transparent"
            aria-hidden
          />
        </div>

        <h2
          id={HEADING_ID}
          className="col-span-2 max-w-3xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:col-span-1"
        >
          A repo URL becomes a grounded answer in three moves.
        </h2>

        <ol className="col-span-2 flex flex-col gap-0 lg:col-span-1 lg:col-start-2">
          {NARRATIVE.map((item, idx) => (
            <li
              key={item.num}
              className="group/row relative isolate grid grid-cols-[auto_1fr] items-baseline gap-x-6 border-t border-border/60 py-7 pl-4 last:border-b sm:gap-x-10"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              {/* backdrop wash — anchored to the left line, wipes rightward */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-4 right-0 -z-10 origin-left scale-x-0 transition-transform duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/row:scale-x-100 group-hover/row:duration-300"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(56,189,248,0.10) 0%, rgba(56,189,248,0.04) 40%, rgba(56,189,248,0) 80%)',
                }}
              />
              {/* left accent — appears instantly on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-4 w-0.5 bg-primary opacity-0 shadow-[0_0_12px_rgba(56,189,248,0.55)] group-hover/row:opacity-100"
              />
              {/* bottom underline — extends from the same origin */}
              <span
                aria-hidden
                className="pointer-events-none absolute -left-4 right-0 -bottom-px h-px origin-left scale-x-0 bg-linear-to-r from-primary/50 via-primary/15 to-transparent transition-transform duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/row:scale-x-100 group-hover/row:duration-300"
              />
              <span className="font-mono text-base uppercase tracking-[0.2em] text-muted-foreground/90 transition-colors duration-150 group-hover/row:text-primary group-hover/row:duration-300 sm:text-lg">
                {item.num}
              </span>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-6">
                <p className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{item.lead}</p>
                <p className="text-[14.5px] leading-relaxed text-muted-foreground sm:flex-1 sm:text-[15px]">
                  {item.trail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </Reveal>
  );
}
