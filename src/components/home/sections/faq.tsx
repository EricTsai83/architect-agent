import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

import { GitHubIcon, XIcon } from '@/components/icons';

import { FAQS, REPO_URL, X_URL } from '../data';
import { CornerMarks } from '../primitives/corner-marks';
import { Reveal } from '../primitives/reveal';
import type { FaqEntry } from '../types';

// Half-duration of the toggle icon animation. The cross shrinks to a dot in
// the first half, then expands into a minus (or back into a cross) in the
// second half — so the full transition is `2 * SHRINK_MS`.
const SHRINK_MS = 80;

const HEADING_ID = 'faq-heading';

export function Faq() {
  return (
    <Reveal>
      <section
        id="faq"
        aria-labelledby={HEADING_ID}
        className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-x-14 lg:gap-y-16"
      >
        <QuickAnswersPanel />
        <ul className="flex min-w-0 flex-col divide-y divide-border/60">
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
        className={`group flex w-full cursor-pointer items-center justify-between gap-3 py-5 text-left transition-colors hover:text-foreground sm:gap-6 ${
          isOpen ? 'text-foreground' : ''
        }`}
      >
        <span className="min-w-0 text-pretty text-[15.5px] font-semibold tracking-tight sm:text-lg">{item.q}</span>
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
      <div
        id={regionId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`pb-5 pr-2 transition-[opacity,transform] duration-200 ease-out sm:pr-12 ${
              isOpen ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
            }`}
          >
            <p className="text-pretty text-[14.5px] leading-relaxed text-muted-foreground sm:text-[15px]">{item.a}</p>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Single bordered panel that frames the section heading, the inviting
 * cat, and the support CTAs as one cohesive unit.
 *
 * Stacked rows separated by hairline rules:
 *   1. heading    — `<h2>` (the section's accessible label)
 *   2. cat scene  — an ASCII-art cat that blinks with a happy `^.^`
 *                   wink and emits gentle hearts that drift upward.
 *                   Reads as "come on in, I'm friendly", which is the
 *                   tone we want for a support CTA — invitation, not
 *                   just a greeting.
 *   3. CTA strip  — anchor to GitHub `issues/new`
 *   4. CTA strip  — anchor to the author's X profile
 *
 * Below `lg` the panel takes the full available width so the cat scene
 * has room to breathe; from `lg` upward it caps at `max-w-xs` so the
 * FAQ list to its right gets the bulk of the column. Only the CTA
 * strips are hyperlinks — wrapping the whole panel in `<a>` would
 * force screen readers to announce the heading as part of a link and
 * bury the `<h2>`'s landmark role.
 */
function QuickAnswersPanel() {
  return (
    <div className="relative w-full self-start overflow-hidden border border-border bg-card/70 backdrop-blur lg:max-w-xs">
      <CornerMarks />

      {/* Top strip — horizontal on mobile (heading left, cat right),
          stacked vertically on lg (sidebar mode). */}
      <div className="flex items-center lg:block">
        <div className="min-w-0 flex-1 px-4 py-3 sm:px-5 sm:py-4 lg:py-6">
          <p
            aria-hidden
            className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:mb-1.5 lg:mb-2"
          >
            Tech support
          </p>
          <h2
            id={HEADING_ID}
            className="text-balance text-xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl"
          >
            Quick answers.
          </h2>
        </div>

        <InvitingCat />
      </div>

      {/* CTA strip — compact side-by-side buttons on mobile,
          full-width stacked rows on lg (sidebar). */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-3 py-2.5 sm:px-4 lg:flex-col lg:items-stretch lg:gap-0 lg:border-t-0 lg:p-0">
        {/* GitHub */}
        <a
          href={`${REPO_URL}/issues/new`}
          rel="noreferrer"
          target="_blank"
          aria-label="Open a new issue on GitHub"
          className="group flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 transition-colors hover:bg-muted/30 lg:justify-between lg:gap-2 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:px-3.5 lg:py-2.5"
        >
          <span className="flex items-center gap-1.5 lg:gap-2">
            <GitHubIcon className="size-3 text-muted-foreground transition-colors group-hover:text-foreground lg:size-3.5" />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:text-foreground lg:text-[10px]">
              <span className="lg:hidden">open issue</span>
              <span className="hidden lg:inline">open an issue</span>
            </span>
          </span>
          <span
            aria-hidden
            className="hidden text-base text-muted-foreground/70 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground lg:inline"
          >
            →
          </span>
        </a>

        {/* X */}
        <a
          href={X_URL}
          rel="noreferrer"
          target="_blank"
          aria-label="Find the author on X"
          className="group flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 transition-colors hover:bg-muted/30 lg:justify-between lg:gap-2 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:px-3.5 lg:py-2.5"
        >
          <span className="flex items-center gap-1.5 lg:gap-2">
            <XIcon className="size-3 text-muted-foreground transition-colors group-hover:text-foreground lg:size-3.5" />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:text-foreground lg:text-[10px]">
              <span className="lg:hidden">find on x</span>
              <span className="hidden lg:inline">find me on x</span>
            </span>
          </span>
          <span
            aria-hidden
            className="hidden text-base text-muted-foreground/70 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground lg:inline"
          >
            →
          </span>
        </a>
      </div>
    </div>
  );
}

/* --------------- SVG cat illustration helpers --------------- */

/**
 * Cute sitting-cat SVG. Two eye variants are layered inside the same
 * SVG — the wink-overlay group is toggled by the `cat-blink` CSS
 * animation, exactly like the old ASCII overlay technique. This means
 * the keyframes in `index.css` keep working untouched.
 *
 * Design language: kawaii / chibi proportions — oversized head, tiny
 * body, round shapes, pastel-friendly strokes. The cat's colour
 * inherits `currentColor` so it follows `text-muted-foreground` like
 * the old ASCII version.
 */

/**
 * Stagger delays for the trio of rising hearts. Pulled to module scope
 * so they're easy to retune in one place; spaced at 1.5s on a 4.5s
 * cycle so at any moment one heart is starting, one is mid-rise, and
 * one is fading. `left` is a percentage so the hearts spread across
 * the panel regardless of width.
 */
const HEARTS: ReadonlyArray<{ left: string; delay: number }> = [
  { left: '40%', delay: 0 },
  { left: '52%', delay: 1.5 },
  { left: '60%', delay: 3 },
];

/**
 * Kawaii SVG cat with blink animation + floating hearts.
 *
 * The cat is a cute, chibi-style sitting cat rendered as an inline
 * SVG. Two eye-state groups are stacked: the base (open round eyes)
 * and the wink overlay (happy `^.^` arcs). The overlay group gets
 * the `animate-cat-blink` class so it flashes on/off exactly like
 * the old ASCII overlay — no CSS changes needed.
 *
 * Hearts and scan-line carry over from the previous version.
 */
function InvitingCat() {
  return (
    <div className="relative shrink-0 lg:border-t lg:border-border/60">
      {/* Scan line — desktop only */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 hidden h-px animate-scan-y bg-gradient-to-r from-transparent via-primary/60 to-transparent lg:block"
      />

      {/* Radial glow — desktop only */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden opacity-60 lg:block"
        style={{
          backgroundImage:
            'radial-gradient(60% 60% at 50% 75%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex flex-col items-center px-4 py-1 lg:px-5 lg:pt-4 lg:pb-6">
        {/* Rising hearts — desktop only */}
        <div aria-hidden className="pointer-events-none relative hidden h-10 w-full lg:block">
          {HEARTS.map((heart) => (
            <span
              key={heart.left}
              className="animate-cat-heart-rise absolute bottom-0 select-none font-mono text-[14px] leading-none text-primary"
              style={
                {
                  'left': heart.left,
                  '--heart-delay': `${heart.delay}s`,
                } as CSSProperties
              }
            >
              ♥
            </span>
          ))}
        </div>

        {/* SVG cat illustration — compact on mobile, full on desktop */}
        <div aria-hidden className="pointer-events-none relative select-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 120 110"
            overflow="visible"
            className="h-14 w-16 text-muted-foreground lg:h-[88px] lg:w-[96px]"
            fill="none"
          >
            {/* ---- Head group — gentle side-to-side tilt ---- */}
            <g className="animate-cat-head-tilt">
              {/* Left ear — rounded + twitch animation */}
              <g className="animate-cat-ear-twitch">
                <ellipse
                  cx={38}
                  cy={28}
                  rx={12}
                  ry={9}
                  transform="rotate(-20, 38, 28)"
                  fill="currentColor"
                  opacity={0.12}
                  stroke="currentColor"
                  strokeWidth={2.2}
                />
                <ellipse cx={38} cy={29} rx={8} ry={5.5} transform="rotate(-20, 38, 29)" className="fill-primary/25" />
              </g>

              {/* Right ear — rounded, moves with head only */}
              <ellipse
                cx={82}
                cy={28}
                rx={12}
                ry={9}
                transform="rotate(20, 82, 28)"
                fill="currentColor"
                opacity={0.12}
                stroke="currentColor"
                strokeWidth={2.2}
              />
              <ellipse cx={82} cy={29} rx={8} ry={5.5} transform="rotate(20, 82, 29)" className="fill-primary/25" />

              {/* Head */}
              <ellipse
                cx={60}
                cy={50}
                rx={32}
                ry={28}
                fill="currentColor"
                opacity={0.08}
                stroke="currentColor"
                strokeWidth={2.2}
              />

              {/* Eyes — scaleY blink */}
              <g className="animate-cat-blink">
                <ellipse cx={48} cy={48} rx={4.2} ry={4.8} fill="currentColor" opacity={0.85} />
                <circle cx={49.6} cy={46.2} r={1.6} className="fill-card" />
                <ellipse cx={72} cy={48} rx={4.2} ry={4.8} fill="currentColor" opacity={0.85} />
                <circle cx={73.6} cy={46.2} r={1.6} className="fill-card" />
              </g>

              {/* Nose */}
              <ellipse cx={60} cy={56} rx={2} ry={1.5} className="fill-primary" opacity={0.7} />

              {/* Mouth (w shape) */}
              <path
                d="M55 59 Q57.5 62 60 59 Q62.5 62 65 59"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                fill="none"
                opacity={0.55}
              />

              {/* Whiskers */}
              <g stroke="currentColor" strokeWidth={1.1} strokeLinecap="round" opacity={0.35}>
                <line x1={22} y1={52} x2={40} y2={54} />
                <line x1={20} y1={58} x2={39} y2={57} />
                <line x1={80} y1={54} x2={98} y2={52} />
                <line x1={81} y1={57} x2={100} y2={58} />
              </g>

              {/* Blush spots */}
              <ellipse cx={40} cy={57} rx={4} ry={2.5} className="fill-primary" opacity={0.12} />
              <ellipse cx={80} cy={57} rx={4} ry={2.5} className="fill-primary" opacity={0.12} />
            </g>

            {/* ---- Body (static) ---- */}
            <path
              d="M38 74 Q38 96 60 98 Q82 96 82 74"
              fill="currentColor"
              opacity={0.06}
              stroke="currentColor"
              strokeWidth={2}
              strokeLinejoin="round"
            />

            {/* Front paws */}
            <ellipse
              cx={46}
              cy={96}
              rx={7}
              ry={4}
              fill="currentColor"
              opacity={0.1}
              stroke="currentColor"
              strokeWidth={1.8}
            />
            <ellipse
              cx={74}
              cy={96}
              rx={7}
              ry={4}
              fill="currentColor"
              opacity={0.1}
              stroke="currentColor"
              strokeWidth={1.8}
            />
            {/* Paw pads */}
            <circle cx={44} cy={95.5} r={1.2} className="fill-primary" opacity={0.35} />
            <circle cx={48} cy={95.5} r={1.2} className="fill-primary" opacity={0.35} />
            <circle cx={72} cy={95.5} r={1.2} className="fill-primary" opacity={0.35} />
            <circle cx={76} cy={95.5} r={1.2} className="fill-primary" opacity={0.35} />

            {/* ---- Tail — wags side to side ---- */}
            <g className="animate-cat-tail-wag">
              <path
                d="M82 88 Q100 82 104 68 Q106 60 100 56"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                fill="none"
                opacity={0.45}
              />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
