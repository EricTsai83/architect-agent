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
      <section id="stack" aria-labelledby={HEADING_ID} className="relative flex flex-col gap-6">
        <div className="border-b border-border/70 pb-3">
          <h2 id={HEADING_ID} className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            built on open standards
          </h2>
        </div>

        <ul className="grid grid-cols-2 gap-x-8 gap-y-5 py-2 sm:grid-cols-3 lg:grid-cols-6">
          {STACK.map(({ name, Icon, role }) => (
            <li
              key={name}
              className="flex items-center gap-3 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Icon className="size-5 shrink-0" />
              <span className="whitespace-nowrap text-[14px] font-semibold tracking-tight text-foreground">
                {name}
              </span>
              <span aria-hidden className="h-3.5 w-px shrink-0 bg-border" />
              <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em]">{role}</span>
            </li>
          ))}
        </ul>
      </section>
    </Reveal>
  );
}
