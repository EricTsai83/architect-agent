import { useCallback, useRef } from 'react';

import { ArrowCounterClockwise } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { GitHubIcon } from '@/components/icons';
import { REPO_URL } from '../data';
import { HeroChat } from './hero-chat';

/**
 * Restart every CSS animation inside a container without unmounting it.
 * Uses `animationName` (longhand) instead of the `animation` shorthand
 * so that inline `animationDelay` values set by React are preserved.
 */
function restartAnimations(container: HTMLElement) {
  const animated = container.querySelectorAll<HTMLElement>(
    '.animate-fade-up, .animate-fade-in, .animate-guide-accent, .animate-fade-out, .animate-send-press, .animate-hero-typing',
  );
  animated.forEach((el) => {
    el.style.animationName = 'none';
  });
  // Force a reflow so the browser registers the reset
  void container.offsetHeight;
  animated.forEach((el) => {
    el.style.animationName = '';
  });
}

export function Hero() {
  const chatRef = useRef<HTMLDivElement>(null);

  const handleReplay = useCallback(() => {
    if (chatRef.current) restartAnimations(chatRef.current);
  }, []);

  return (
    <section id="top" className="relative grid items-center gap-14 pt-6 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
      <div className="flex flex-col gap-7">
        <StatusPill />
        <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-[clamp(3rem,5vw,3.75rem)]">
          <span className="block animate-fade-up sm:whitespace-nowrap">Your codebase,</span>
          <span className="block animate-fade-up text-primary sm:whitespace-nowrap" style={{ animationDelay: '120ms' }}>
            explained in place.
          </span>
        </h1>
        <p
          className="max-w-xl animate-fade-up text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
          style={{ animationDelay: '220ms' }}
        >
          An open-source, self-hostable Q&amp;A surface for any public repo. Every answer is cited back to a file you
          can open. Run it on your own machine, with your own keys.
        </p>
        <div
          className="flex animate-fade-up flex-col gap-3 sm:flex-row sm:items-center"
          style={{ animationDelay: '320ms' }}
        >
          <Button asChild size="lg">
            <a href={REPO_URL} rel="noreferrer" target="_blank" aria-label="View Systify on GitHub">
              <GitHubIcon />
              <span>View on GitHub</span>
            </a>
          </Button>
          <Button asChild size="lg" variant="ghost" className="text-[14.5px]">
            <a href="#self-host">
              Run it locally <span aria-hidden>→</span>
            </a>
          </Button>
        </div>
        <Stat />
      </div>

      <HeroChat ref={chatRef} />

      <button
        onClick={handleReplay}
        className="absolute right-0 top-0 z-10 inline-flex items-center gap-1.5 border border-border bg-card/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur transition-colors hover:bg-card hover:text-foreground"
        aria-label="Replay hero animation"
      >
        <ArrowCounterClockwise weight="bold" className="size-3" />
        Replay
      </button>
    </section>
  );
}

function StatusPill() {
  return (
    <div className="inline-flex w-fit animate-fade-up items-center gap-2 border border-border bg-card/60 px-2.5 py-1 font-mono text-[10.5px] tracking-[0.18em] text-muted-foreground backdrop-blur">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping bg-primary opacity-60" />
        <span className="relative inline-flex size-1.5 bg-primary" />
      </span>
      <span className="uppercase">open source · mit · self-hostable</span>
    </div>
  );
}

function Stat() {
  return (
    <dl
      className="mt-2 flex animate-fade-up items-center gap-6 border-t border-border/60 pt-5 font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground sm:gap-10"
      style={{ animationDelay: '420ms' }}
    >
      <div className="flex flex-col gap-1">
        <dt className="opacity-70">Answers</dt>
        <dd className="text-[14px] tracking-tight text-foreground">file-cited</dd>
      </div>
      <div className="h-8 w-px bg-border" aria-hidden />
      <div className="flex flex-col gap-1">
        <dt className="opacity-70">License</dt>
        <dd className="text-[14px] tracking-tight text-foreground">MIT</dd>
      </div>
      <div className="h-8 w-px bg-border" aria-hidden />
      <div className="flex flex-col gap-1">
        <dt className="opacity-70">Run</dt>
        <dd className="text-[14px] tracking-tight text-foreground">your machine</dd>
      </div>
    </dl>
  );
}
