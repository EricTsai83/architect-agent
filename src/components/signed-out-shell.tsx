import { useEffect, useId, useRef, useState, type ComponentType, type SVGProps } from 'react';
import {
  ArrowsClockwiseIcon,
  Check,
  Copy,
  DotsThreeVerticalIcon,
  FileTextIcon,
  List,
  PaperPlaneTiltIcon,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { Logo } from '@/components/logo';
import { AuthButton } from '@/components/auth-button';
import { AnthropicIcon, ConvexIcon, DaytonaIcon, GitHubIcon, OpenAIIcon, WorkOSIcon } from '@/components/icons';

const REPO_URL = 'https://github.com/EricTsai83/systify';
const REPO_LABEL = 'EricTsai83/systify';
const CLONE_COMMAND = `git clone ${REPO_URL}.git && cd systify && bun install && bun run dev`;

type StackItem = {
  name: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  role: string;
};

const STACK: ReadonlyArray<StackItem> = [
  { name: 'WorkOS', Icon: WorkOSIcon, role: 'auth' },
  { name: 'GitHub App', Icon: GitHubIcon, role: 'auth' },
  { name: 'Daytona', Icon: DaytonaIcon, role: 'sandbox' },
  { name: 'Convex', Icon: ConvexIcon, role: 'backend' },
  { name: 'OpenAI', Icon: OpenAIIcon, role: 'model' },
  { name: 'Anthropic', Icon: AnthropicIcon, role: 'model' },
];

const NARRATIVE: ReadonlyArray<{ num: string; lead: string; trail: string }> = [
  {
    num: '01',
    lead: 'Drop in a public GitHub URL.',
    trail: 'We clone it into an isolated Daytona sandbox.',
  },
  {
    num: '02',
    lead: 'Systify maps the codebase.',
    trail: 'Files indexed, README parsed, ADRs surfaced.',
  },
  {
    num: '03',
    lead: 'Every answer cites a real file.',
    trail: 'No hallucinated guesses — open the source and verify.',
  },
];

/**
 * The three knowledge layers, in order of depth (shallow → deep).
 * Each mode reads from a prefix of this list. Listing them by name in
 * the panel turns the abstract idea of "depth" into a literal checklist
 * of what the mode reaches into — the user can see, at a glance, exactly
 * what each mode does and does not consult.
 */
const LAYERS = ['model', 'indexed docs', 'live fs'] as const;

/**
 * Each mode owns a tone (emerald → sky → amber). The tone shows up in
 * two load-bearing places — title and sources fill. The panel border and
 * scenario bullets stay neutral so the tone reads as content, not chrome.
 *
 * Every Tailwind utility below is a full class literal so JIT picks it
 * up — do not template them.
 */
type Mode = {
  name: string;
  pitch: string;
  /** 1..3 — number of layers from `LAYERS` (in order) that this mode reads. */
  depth: 1 | 2 | 3;
  /** Concrete situations where this mode is the right pick — the user's "when do I use this?" answer. */
  scenarios: ReadonlyArray<string>;
  /** Tailwind class literals (do not template). */
  title: string;
  fill: string;
};

const MODES: ReadonlyArray<Mode> = [
  {
    name: 'Discuss',
    pitch: 'cheapest · seconds',
    depth: 1,
    scenarios: [
      'Open-ended discussions, no repo required',
      'Shaping a question before grounding',
      'Best CP for high-volume iteration',
    ],
    title: 'text-emerald-500',
    fill: 'bg-emerald-500',
  },
  {
    name: 'Docs',
    pitch: 'grounded · always sourced',
    depth: 2,
    scenarios: [
      'Architecture & onboarding from README / ADRs',
      'Concept traces with file citations',
      'Best CP for grounded answers — no live-fs cost',
    ],
    title: 'text-sky-500',
    fill: 'bg-sky-500',
  },
  {
    name: 'Sandbox',
    pitch: 'current state · line precise',
    depth: 3,
    scenarios: [
      'Exact paths, line numbers, config values',
      'Verifying state when the index is stale',
      'Premium cost — when a stale answer would be wrong',
    ],
    title: 'text-amber-500',
    fill: 'bg-amber-500',
  },
];

const FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'What does “grounded answer” actually mean?',
    a: 'Every answer points back to the files it came from. If we cite src/main.tsx, you can open it and verify — no taking the model’s word for it.',
  },
  {
    q: 'Can I self-host it?',
    a: 'Yes. The full source is on GitHub under EricTsai83/systify. Clone it, plug in your own Convex and WorkOS keys, and run.',
  },
  {
    q: 'Is my code private?',
    a: 'Today only public repositories are imported. Cloned code lives in a per-session Daytona sandbox and is never added to a shared training set.',
  },
  {
    q: 'When should I pick which mode?',
    a: 'Discuss is fastest. Docs is for grounded narrative answers. Sandbox is for line-precise checks against the current state of the code.',
  },
];

export function SignedOutShell() {
  return (
    <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto scroll-pt-20">
      <BackgroundLayer />

      <Header />

      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-28 px-6 pb-24 pt-12 md:gap-32 md:pt-16">
        <Hero />
        <Narrative />
        <StackMarquee />
        <ModesRows />
        <SelfHost />
        <Faq />
      </main>

      <Footer />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Backdrop
 * ──────────────────────────────────────────────────────────── */

function BackgroundLayer() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.32] dark:opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(58% 50% at 12% -4%, rgba(56,189,248,0.22) 0%, rgba(56,189,248,0) 60%), radial-gradient(45% 40% at 92% 8%, rgba(125,211,252,0.18) 0%, rgba(125,211,252,0) 60%), radial-gradient(50% 38% at 50% 96%, rgba(255,59,107,0.12) 0%, rgba(255,59,107,0) 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] mask-[radial-gradient(ellipse_at_top,black,transparent_75%)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
 * Header
 * ──────────────────────────────────────────────────────────── */

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <a href="#top" className="group flex items-center gap-2.5">
          <Logo size={28} />
          <span className="font-mono text-[15px] font-semibold tracking-tight">systify</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#stack" className="transition-colors hover:text-foreground">
            Stack
          </a>
          <a href="#modes" className="transition-colors hover:text-foreground">
            Modes
          </a>
          <a href="#self-host" className="transition-colors hover:text-foreground">
            Self-host
          </a>
        </nav>
        <div className="flex items-center gap-1.5">
          <Button
            asChild
            variant="secondary"
            size="icon"
            aria-label="View Systify on GitHub"
            title="View Systify on GitHub"
          >
            <a href={REPO_URL} rel="noreferrer" target="_blank">
              <GitHubIcon />
              <span className="sr-only">View Systify on GitHub</span>
            </a>
          </Button>
          <ModeToggle />
          <AuthButton size="sm" />
        </div>
      </div>
    </header>
  );
}

/* ────────────────────────────────────────────────────────────
 * Hero
 * ──────────────────────────────────────────────────────────── */

function Hero() {
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
            <a href="#self-host">Run it locally →</a>
          </Button>
        </div>
        <Stat />
      </div>

      <HeroChat />
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

/**
 * HeroChat — a faithful preview of the real `<ChatPanel />` the user lands on
 * after signing in. Marketing surfaces should not lie about what the product
 * looks like, so this hero reproduces, in miniature, the actual chrome the
 * authed app renders:
 *
 *   - top bar  → src/components/top-bar.tsx     (sidebar trigger glyph, repo
 *                                                 title, status pill, sync)
 *   - body     → src/components/chat-panel.tsx  (user `bg-muted` Card,
 *                                                 transparent assistant
 *                                                 bubble with role+status
 *                                                 header and file citations)
 *   - composer → chat-panel.tsx form            (textarea, mode pill, Send)
 *
 * Streaming choreography stands in for the real Convex stream: the user
 * message slides in first, the assistant header appears in `Generating`
 * state, and body chunks fade in sequentially as if tokens were arriving.
 * Every keyframe respects `prefers-reduced-motion` via the existing utility
 * classes (`animate-fade-up`, `animate-pulse-soft`, `animate-scan-y`).
 */
function HeroChat() {
  return (
    <div className="relative animate-fade-up" style={{ animationDelay: '180ms' }}>
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 opacity-70 blur-3xl"
        style={{
          backgroundImage: 'radial-gradient(50% 50% at 50% 50%, rgba(56,189,248,0.22) 0%, rgba(56,189,248,0) 70%)',
        }}
      />

      <div className="group/term relative overflow-hidden border border-border bg-card/85 shadow-[0_30px_80px_-30px_rgba(56,189,248,0.35)] backdrop-blur">
        {/* scan line — keeps the existing tech-style motion vocabulary */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px animate-scan-y bg-linear-to-r from-transparent via-primary/70 to-transparent"
        />

        <CornerMarks />

        <ChatTopBar />

        {/* Chat body — same layout vocabulary as <ChatPanel /> */}
        <div className="flex flex-col gap-3 px-5 py-5">
          <UserMessage delay={500}>Where does middleware live in this codebase?</UserMessage>
          <AssistantMessage delay={1000} />
        </div>

        <ChatComposer />
      </div>
    </div>
  );
}

/**
 * Top-bar mock. The real {@link TopBar} renders the sidebar trigger, repo
 * title with the {@link RepoStatusIndicator} dot, an attach-repo chip and a
 * right-side cluster (jobs, sync, more). We reproduce only the read-only
 * shape — clickable affordances would mislead a signed-out visitor.
 */
function ChatTopBar() {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/60 px-3">
      <span aria-hidden className="flex size-7 items-center justify-center text-muted-foreground/70">
        <List weight="bold" className="size-4" />
      </span>

      <div className="flex min-w-0 items-center gap-2">
        <GitHubIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-[12.5px] font-semibold tracking-tight">vercel/next.js</span>
        <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
          ready
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="hidden items-center gap-1 sm:inline-flex">
          <ArrowsClockwiseIcon weight="bold" className="size-3" />
          synced 14s ago
        </span>
        <DotsThreeVerticalIcon weight="bold" className="size-3.5 text-muted-foreground/60" />
      </div>
    </div>
  );
}

/**
 * User bubble. Mirrors `MessageBubble` for role=user: muted Card with the
 * `[10px] uppercase` role label and a status label aligned to the right.
 */
function UserMessage({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <div className="animate-fade-up bg-muted px-4 py-3" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">user</p>
        <p className="text-[10px] text-muted-foreground">Ready</p>
      </div>
      <p className="text-[13.5px] leading-6 text-foreground">{children}</p>
    </div>
  );
}

/**
 * Assistant message. Mirrors `MessageBubble` for role=assistant (transparent
 * background, no border, same role+status header). Body chunks are staggered
 * with `animate-fade-up` to evoke streaming, and citations land as inline
 * `<code>` chips matching how grounded answers reference real files.
 */
function AssistantMessage({ delay }: { delay: number }) {
  return (
    <div className="animate-fade-up px-0 py-1" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">assistant</p>
        <p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="size-1 rounded-full bg-primary animate-pulse-soft" />
          Generating
        </p>
      </div>

      <div className="flex flex-col gap-2.5 text-[13.5px] leading-6 text-foreground/95">
        <p className="animate-fade-up" style={{ animationDelay: `${delay + 250}ms` }}>
          Middleware in Next.js is wired across three layers — runtime sandbox, build pipeline, and dev bundler:
        </p>

        <ul className="flex flex-col gap-1.5">
          <CitationItem delay={delay + 600}>packages/next/src/server/web/sandbox/sandbox.ts</CitationItem>
          <CitationItem delay={delay + 800}>packages/next/src/build/webpack/loaders/next-middleware-loader.ts</CitationItem>
          <CitationItem delay={delay + 1000}>packages/next/src/server/lib/router-utils/setup-dev-bundler.ts</CitationItem>
        </ul>

        <div
          className="flex animate-fade-up items-center gap-2 pt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
          style={{ animationDelay: `${delay + 1200}ms` }}
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-primary" />
            grounded · 3 files cited
          </span>
        </div>
      </div>
    </div>
  );
}

function CitationItem({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <li className="flex animate-fade-up items-start gap-2" style={{ animationDelay: `${delay}ms` }}>
      <span aria-hidden className="leading-6 text-primary">
        →
      </span>
      <code className="rounded-sm bg-muted/60 px-1.5 py-0.5 font-mono text-[11.5px] leading-5">{children}</code>
    </li>
  );
}

/**
 * Composer mock. Mirrors the `<form>` at the bottom of {@link ChatPanel}: a
 * textarea-shaped placeholder, an inline mode pill (Docs is the default that
 * fits this Hero's narrative — grounded, sourced answers), and a Send
 * button. Decorative only — no event handlers.
 */
function ChatComposer() {
  return (
    <div className="border-t border-border bg-background/60 px-3 py-3">
      <div className="flex min-h-16 items-start rounded-sm border border-border bg-background/80 px-3 py-2.5 text-[12.5px] leading-6 text-muted-foreground/70">
        Ask about architecture, module boundaries, data flow, risks…
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-1 text-[11px] text-foreground">
          <FileTextIcon size={12} weight="bold" />
          <span className="font-medium">Docs</span>
          <span className="hidden text-muted-foreground/70 sm:inline">searches your design docs</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
          <PaperPlaneTiltIcon size={12} weight="bold" />
          Send
        </span>
      </div>
    </div>
  );
}

function CornerMarks() {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 size-2.5 border-l border-t border-foreground/30"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 size-2.5 border-r border-t border-foreground/30"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 size-2.5 border-b border-l border-foreground/30"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 size-2.5 border-b border-r border-foreground/30"
      />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
 * Narrative — three lines, no cards
 * ──────────────────────────────────────────────────────────── */

function Narrative() {
  return (
    <Reveal>
      <section
        id="how"
        className="relative grid grid-cols-[auto_1fr] gap-x-10 gap-y-12 sm:gap-x-14 lg:grid-cols-[auto_1fr_auto] lg:items-start"
      >
        <div className="hidden flex-col items-center gap-3 self-stretch lg:flex">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">how</span>
          <span
            className="block w-px flex-1 origin-top animate-line-draw-y bg-linear-to-b from-foreground/40 via-border to-transparent"
            aria-hidden
          />
        </div>

        <h2 className="col-span-2 max-w-3xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:col-span-1">
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

/* ────────────────────────────────────────────────────────────
 * Stack — static grid
 * ──────────────────────────────────────────────────────────── */

function StackMarquee() {
  return (
    <Reveal>
      <section id="stack" className="relative flex flex-col gap-6">
        <div className="border-b border-border/70 pb-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
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

/* ────────────────────────────────────────────────────────────
 * Modes — three terminal panels, one per depth
 * Each panel owns its color (emerald/sky/amber). The depth metaphor
 * in the section title is made literal by an explicit SOURCES list:
 * the user reads exactly which knowledge layers each mode consults.
 * Every visual element carries information — no decorative chrome.
 * ──────────────────────────────────────────────────────────── */

function ModesRows() {
  return (
    <Reveal>
      <section id="modes" className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h2 className="max-w-3xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Three depths of grounding.{' '}
            <span className="text-muted-foreground">Match the mode to the question.</span>
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            shallow → deep · cheap → precise
          </p>
        </div>

        <ul className="grid gap-5 lg:grid-cols-3">
          {MODES.map((mode, idx) => (
            <ModePanel key={mode.name} mode={mode} index={idx} />
          ))}
        </ul>
      </section>
    </Reveal>
  );
}

function ModePanel({ mode, index }: { mode: Mode; index: number }) {
  return (
    <li className="animate-fade-up list-none" style={{ animationDelay: `${index * 90}ms` }}>
      <article
        className="relative isolate flex h-full flex-col overflow-hidden border border-border bg-card/70 backdrop-blur"
      >
        <CornerMarks />

        {/* Title */}
        <div className="px-5 pt-7">
          <h3 className={`text-3xl font-semibold tracking-tight ${mode.title}`}>{mode.name}</h3>
        </div>

        {/* Sources — what the mode reads from. The literal definition of "depth" for this mode.
            Each row is a knowledge layer: lit row = consulted, dim row = not consulted. */}
        <div className="mt-5 flex flex-col gap-2 border-t border-border/60 px-5 pt-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80">
            sources <span className="text-muted-foreground/50">— {mode.depth} of {LAYERS.length}</span>
          </span>
          <ul className="flex flex-col gap-1.5">
            {LAYERS.map((layer, i) => {
              const lit = i < mode.depth;
              return (
                <li
                  key={layer}
                  className={`flex items-center gap-2.5 font-mono text-[12px] ${
                    lit ? 'text-foreground/90' : 'text-muted-foreground/45 line-through decoration-muted-foreground/40'
                  }`}
                >
                  <span aria-hidden className={`size-2 shrink-0 ${lit ? mode.fill : 'bg-foreground/12'}`} />
                  <span>{layer}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Use-when scenarios — professional copy that includes the cost-performance angle */}
        <div className="mt-5 flex flex-col gap-2 border-t border-border/60 px-5 pt-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80">use when —</span>
          <ul className="flex flex-col gap-2">
            {mode.scenarios.map((scenario) => (
              <li key={scenario} className="flex items-start gap-2.5 text-[13.5px] text-foreground/90">
                <span aria-hidden className="mt-[7px] size-1 shrink-0 bg-muted-foreground/60" />
                <span className="leading-relaxed">{scenario}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pitch */}
        <div className="mt-auto flex items-center gap-2 border-t border-border/60 px-5 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
          <span aria-hidden className={`size-1.5 ${mode.fill}`} />
          <span>{mode.pitch}</span>
        </div>
      </article>
    </li>
  );
}

/* ────────────────────────────────────────────────────────────
 * Self-host — the primary CTA, presented as a real terminal
 * ──────────────────────────────────────────────────────────── */

function SelfHost() {
  return (
    <Reveal>
      <section id="self-host" className="relative grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <div className="flex flex-col gap-6">
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
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
                Read the README →
              </a>
            </Button>
          </div>

          <ul className="mt-2 grid grid-cols-1 gap-2.5 font-mono text-[13px] text-muted-foreground sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <span className="size-1.5 bg-primary" /> MIT licensed
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 bg-primary" /> No vendor lock-in
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 bg-primary" /> Bring your own keys
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 bg-primary" /> Public-repo first
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
            <span className="size-1 rounded-full bg-emerald-500 animate-pulse-soft" />
            <span className="tracking-tight">bash</span>
          </span>
        </div>

        <div className="space-y-3.5 p-5 font-mono text-[12.5px] leading-relaxed">
          <CommandRow value={`git clone ${REPO_URL}.git`} />
          <CommandRow value="cd systify" />
          <CommandRow value="bun install" />
          <CommandRow value="bun run dev" />

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
      <span className="select-none text-primary">$</span>
      <span className="min-w-0 flex-1 truncate text-foreground/95">{value}</span>
    </div>
  );
}

function CopyAllButton() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(CLONE_COMMAND)
      .then(() => setCopied(true))
      .catch((err) => {
        console.error('Failed to copy clone command:', err);
      });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-live="polite"
      className="group/copy inline-flex items-center gap-1.5 border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
    >
      {copied ? (
        <>
          <Check weight="bold" className="size-3 text-emerald-500" />
          <span>copied</span>
        </>
      ) : (
        <>
          <Copy weight="bold" className="size-3" />
          <span>copy all</span>
        </>
      )}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────
 * FAQ — minimal accordion, no panel chrome
 * ──────────────────────────────────────────────────────────── */

function Faq() {
  return (
    <Reveal>
      <section className="grid gap-10 lg:grid-cols-[auto_1fr] lg:gap-16">
        <div className="flex flex-col gap-3">
          <h2 className="max-w-xs text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Quick answers.
          </h2>
        </div>
        <ul className="flex flex-col divide-y divide-border/60 border-y border-border/60">
          {FAQS.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </ul>
      </section>
    </Reveal>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const baseId = useId();
  const buttonId = `${baseId}-button`;
  const regionId = `${baseId}-region`;
  return (
    <li>
      <button
        type="button"
        id={buttonId}
        aria-expanded={isOpen}
        aria-controls={regionId}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left transition-colors hover:text-foreground ${
          isOpen ? 'text-foreground' : ''
        }`}
      >
        <span className="text-[17px] font-semibold tracking-tight sm:text-lg">{q}</span>
        <span
          aria-hidden
          className="inline-flex size-9 shrink-0 items-center justify-center border border-border bg-card text-muted-foreground transition-colors duration-200 group-hover:border-foreground/30 group-hover:bg-muted group-hover:text-foreground"
        >
          <span className="relative size-3.5">
            <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
            <span
              className={`absolute left-1/2 top-0 h-full w-px origin-center -translate-x-1/2 bg-current transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                isOpen ? 'scale-y-0' : ''
              }`}
            />
          </span>
        </span>
      </button>
      <div
        id={regionId}
        role="region"
        aria-labelledby={buttonId}
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
            <p className="text-[15px] leading-relaxed text-muted-foreground">{a}</p>
          </div>
        </div>
      </div>
    </li>
  );
}

/* ────────────────────────────────────────────────────────────
 * Footer
 * ──────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="relative border-t border-border/70 bg-background/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 font-mono text-[13px] text-muted-foreground sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <Logo size={18} />
          <span className="tracking-tight">© {new Date().getFullYear()} systify · open source</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#top" className="transition-colors hover:text-foreground">
            ↑ top
          </a>
          <a
            href={REPO_URL}
            rel="noreferrer"
            target="_blank"
            aria-label={`View ${REPO_LABEL} on GitHub`}
            title={REPO_LABEL}
            className="inline-flex items-center transition-colors hover:text-foreground"
          >
            <GitHubIcon className="size-3.5" />
            <span className="sr-only">{REPO_LABEL}</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────────
 * Reveal — fade-in once visible (IntersectionObserver)
 * ──────────────────────────────────────────────────────────── */

function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // If IntersectionObserver isn't available (older browsers / SSR), reveal
  // immediately so content is never left invisible. Setting this in the
  // initial state avoids a setState-in-effect cascade.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      {children}
    </div>
  );
}
