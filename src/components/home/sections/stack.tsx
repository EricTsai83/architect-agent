import { STACK } from '../data';
import { Reveal } from '../primitives/reveal';

const HEADING_ID = 'stack-heading';

/**
 * Static grid of integration brand icons. Despite the historical name
 * "marquee" used during early prototypes, this section never animates
 * sideways — the brand list is short enough that a still grid reads
 * better than a moving strip on the homepage.
 */
export function Stack() {
  return (
    <Reveal>
      <section id="stack" aria-labelledby={HEADING_ID} className="relative">
        <div className="flex flex-col gap-6">
          <div className="border-b border-border/70 pb-3">
            <h2 id={HEADING_ID} className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              built on open standards
            </h2>
          </div>

          <ul className="grid grid-cols-2 gap-x-4 gap-y-4 py-2 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-5 xl:grid-cols-6">
            {STACK.map(({ name, Icon, role }) => (
              <li
                key={name}
                className="flex min-w-0 items-center gap-2 text-muted-foreground transition-colors hover:text-foreground sm:gap-3"
              >
                <Icon className="size-5 shrink-0" />
                <span className="min-w-0 truncate text-[13px] font-semibold tracking-tight text-foreground sm:text-[14px]">
                  {name}
                </span>
                <span aria-hidden className="h-3.5 w-px shrink-0 bg-border" />
                <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.18em]">{role}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Reveal>
  );
}
