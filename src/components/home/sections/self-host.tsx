import { Check, Copy } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { useClipboard } from '@/hooks/use-clipboard';
import { CLONE_COMMAND_TEXT, CLONE_STEPS, REPO_URL } from '../data';
import { Reveal } from '../primitives/reveal';
import { CornerMarks } from '../primitives/corner-marks';

const HEADING_ID = 'self-host-heading';

export function SelfHost() {
  return (
    <Reveal>
      <section
        id="self-host"
        aria-labelledby={HEADING_ID}
        className="relative grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14"
      >
        <div className="flex flex-col gap-6">
          <h2
            id={HEADING_ID}
            className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
          >
            Run it on{' '}
            <span className="relative">
              <span className="relative z-10">your</span>
              <span aria-hidden className="absolute inset-x-0 bottom-0.5 -z-0 h-3 bg-primary/60 sm:h-3.5" />
            </span>{' '}
            machine.
          </h2>
          <p className="max-w-md text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Systify is MIT-licensed and dependency-clear. Clone the repo, plug in your own Convex and WorkOS keys, and
            you have a private, grounded codebase Q&amp;A surface you fully own.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" variant="secondary">
              <a href={`${REPO_URL}#readme`} rel="noreferrer" target="_blank" className="text-[15px]">
                Read the README <span aria-hidden>→</span>
              </a>
            </Button>
          </div>

          <ul className="mt-2 grid grid-cols-1 gap-2.5 font-mono text-[13px] text-muted-foreground sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-1.5 bg-primary" /> MIT licensed
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-1.5 bg-primary" /> No vendor lock-in
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-1.5 bg-primary" /> Bring your own keys
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-1.5 bg-primary" /> Public-repo first
            </li>
          </ul>
        </div>

        <CloneTerminal />
      </section>
    </Reveal>
  );
}

function CloneTerminal() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 opacity-60 blur-3xl"
        style={{
          backgroundImage: 'radial-gradient(60% 60% at 70% 30%, rgba(56,189,248,0.22) 0%, rgba(56,189,248,0) 65%)',
        }}
      />

      <div className="relative overflow-hidden border border-border bg-card/85 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.4)] backdrop-blur">
        <CornerMarks />

        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>~/projects</span>
          <span className="inline-flex items-center gap-1.5 normal-case">
            <span aria-hidden className="size-1 rounded-full bg-emerald-500 animate-pulse-soft" />
            <span className="tracking-tight">bash</span>
          </span>
        </div>

        <div className="space-y-3.5 p-5 font-mono text-[12.5px] leading-relaxed">
          {CLONE_STEPS.map((step) => (
            <CommandRow key={step} value={step} />
          ))}

          <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>local · :5173</span>
            <CopyAllButton />
          </div>
        </div>
      </div>
    </div>
  );
}

function CommandRow({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden className="select-none text-primary">
        $
      </span>
      <span className="min-w-0 flex-1 truncate text-foreground/95">{value}</span>
    </div>
  );
}

function CopyAllButton() {
  const { copied, copy } = useClipboard();

  return (
    <button
      type="button"
      onClick={() => void copy(CLONE_COMMAND_TEXT)}
      aria-label={copied ? 'Quickstart commands copied' : 'Copy quickstart commands to clipboard'}
      className="group/copy inline-flex items-center gap-1.5 border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
    >
      {copied ? (
        <>
          <Check weight="bold" className="size-3 text-emerald-500" />
          <span aria-hidden>copied</span>
        </>
      ) : (
        <>
          <Copy weight="bold" className="size-3" />
          <span aria-hidden>copy all</span>
        </>
      )}
      {/* Visually-hidden status ensures the state change is announced once,
          regardless of how the surrounding label is rendered. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Quickstart commands copied to clipboard' : ''}
      </span>
    </button>
  );
}
