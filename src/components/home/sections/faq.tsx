import { useEffect, useId, useRef, useState } from 'react';

import { FAQS } from '../data';
import { Reveal } from '../primitives/reveal';
import type { FaqEntry } from '../types';

// Half-duration of the toggle icon animation. The cross shrinks to a dot in
// the first half, then expands into a minus (or back into a cross) in the
// second half — so the full transition is `2 * SHRINK_MS`.
const SHRINK_MS = 150;

const HEADING_ID = 'faq-heading';

export function Faq() {
  return (
    <Reveal>
      <section aria-labelledby={HEADING_ID} className="grid gap-10 lg:grid-cols-[auto_1fr] lg:gap-16">
        <div className="flex flex-col gap-3">
          <h2
            id={HEADING_ID}
            className="max-w-xs text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
          >
            Quick answers.
          </h2>
        </div>
        <ul className="flex flex-col divide-y divide-border/60 border-y border-border/60">
          {FAQS.map((item) => (
            <FaqItem key={item.q} item={item} />
          ))}
        </ul>
      </section>
    </Reveal>
  );
}

function FaqItem({ item }: { item: FaqEntry }) {
  const [isOpen, setIsOpen] = useState(false);
  // `isShrinking` drives the first half of the toggle animation: both arms of
  // the icon collapse into a single dot. Once it flips off, the horizontal arm
  // (and the vertical arm, when closing) springs back to full length, leaving
  // the icon in its destination state.
  const [isShrinking, setIsShrinking] = useState(false);
  const shrinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseId = useId();
  const buttonId = `${baseId}-button`;
  const regionId = `${baseId}-region`;

  useEffect(() => {
    return () => {
      if (shrinkTimeoutRef.current) {
        clearTimeout(shrinkTimeoutRef.current);
      }
    };
  }, []);

  const handleToggle = () => {
    // Ignore clicks while the dot is mid-flight to avoid the icon getting
    // stuck in an inconsistent intermediate state.
    if (isShrinking) return;
    setIsShrinking(true);
    shrinkTimeoutRef.current = setTimeout(() => {
      setIsOpen((prev) => !prev);
      setIsShrinking(false);
    }, SHRINK_MS);
  };

  return (
    <li>
      <button
        type="button"
        id={buttonId}
        aria-expanded={isOpen}
        aria-controls={regionId}
        onClick={handleToggle}
        className={`group flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left transition-colors hover:text-foreground ${
          isOpen ? 'text-foreground' : ''
        }`}
      >
        <span className="text-[17px] font-semibold tracking-tight sm:text-lg">{item.q}</span>
        <span
          aria-hidden
          className="inline-flex size-9 shrink-0 items-center justify-center border border-border bg-card text-muted-foreground transition-colors duration-200 group-hover:border-foreground/30 group-hover:bg-muted group-hover:text-foreground"
        >
          <span className="relative size-3.5">
            <span
              className={`absolute left-0 top-1/2 h-px w-full origin-center -translate-y-1/2 bg-current transition-transform duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                isShrinking ? 'scale-x-0' : ''
              }`}
            />
            <span
              className={`absolute left-1/2 top-0 h-full w-px origin-center -translate-x-1/2 bg-current transition-transform duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                isOpen || isShrinking ? 'scale-y-0' : ''
              }`}
            />
          </span>
        </span>
      </button>
      {/*
        `role="region"` plus `aria-labelledby` exposes the answer panel as a
        named landmark to assistive tech. We also flip `aria-hidden` and
        `inert` while collapsed so the answer text stays out of focus order
        and screen-reader virtual cursor traversal even though it remains
        in the DOM (kept there for the smooth height transition).
      */}
      <div
        id={regionId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`pb-5 pr-12 transition-[opacity,transform] duration-300 ease-out ${
              isOpen ? 'translate-y-0 opacity-100 delay-100' : '-translate-y-1 opacity-0'
            }`}
          >
            <p className="text-[15px] leading-relaxed text-muted-foreground">{item.a}</p>
          </div>
        </div>
      </div>
    </li>
  );
}
