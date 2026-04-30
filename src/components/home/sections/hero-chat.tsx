import type { ReactNode } from 'react';
import { ArrowsClockwiseIcon, DotsThreeVerticalIcon, FileTextIcon, List, PaperPlaneTiltIcon } from '@phosphor-icons/react';

import { GitHubIcon } from '@/components/icons';
import { CornerMarks } from '../primitives/corner-marks';

/**
 * HeroChat — a faithful preview of the real `<ChatPanel />` the user
 * lands on after signing in. Marketing surfaces should not lie about
 * what the product looks like, so this hero reproduces, in miniature,
 * the actual chrome the authed app renders:
 *
 *   - top bar  → src/components/top-bar.tsx     (sidebar trigger glyph,
 *                                                 repo title, status pill,
 *                                                 sync)
 *   - body     → src/components/chat-panel.tsx  (user `bg-muted` Card,
 *                                                 transparent assistant
 *                                                 bubble with role+status
 *                                                 header and file
 *                                                 citations)
 *   - composer → chat-panel.tsx form            (textarea, mode pill, Send)
 *
 * Streaming choreography stands in for the real Convex stream: the user
 * message slides in first, the assistant header appears in `Generating`
 * state, and body chunks fade in sequentially as if tokens were arriving.
 * Every keyframe respects `prefers-reduced-motion` via the existing
 * utility classes (`animate-fade-up`, `animate-pulse-soft`,
 * `animate-scan-y`) — see `src/index.css` for the override block.
 */
export function HeroChat() {
  return (
    <div className="relative animate-fade-in" style={{ animationDelay: '600ms' }}>
      <div className="group/term relative overflow-hidden border border-border bg-card/85 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] backdrop-blur">
        <CornerMarks />

        <ChatTopBar />

        {/* Chat body — same layout vocabulary as <ChatPanel /> */}
        <div className="flex flex-col gap-3 px-5 py-5">
          <UserMessage delay={1500}>How does the App Router resolve nested layouts?</UserMessage>
          <AssistantMessage delay={2800} />
        </div>

        <ChatComposer />
      </div>
    </div>
  );
}

/**
 * Top-bar mock. The real `<TopBar />` renders the sidebar trigger, repo
 * title with the `<RepoStatusIndicator />` dot, an attach-repo chip and
 * a right-side cluster (jobs, sync, more). We reproduce only the
 * read-only shape — clickable affordances would mislead a signed-out
 * visitor.
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
 * User bubble. Mirrors `MessageBubble` for role=user: muted Card with
 * the `[10px] uppercase` role label and a status label aligned to the
 * right.
 */
function UserMessage({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <div className="relative animate-fade-up bg-muted px-4 py-3" style={{ animationDelay: `${delay}ms` }}>
      <GuideAccent delay={delay + 100} />
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">user</p>
        <p className="text-[10px] text-muted-foreground">Ready</p>
      </div>
      <p className="text-[13.5px] leading-6 text-foreground">{children}</p>
    </div>
  );
}

// Citation streaming choreography. Each row enters a fixed step after the
// assistant header; numbers are kept at module scope so they're easy to
// retune in one place rather than scattered across JSX.
const CITATION_STEP_MS = 350;
const ASSISTANT_BODY_DELAY_MS = 400;
const CITATION_BASE_DELAY_MS = 900;
const GROUNDED_FOOTER_DELAY_MS = 2000;

/**
 * Assistant message. Mirrors `MessageBubble` for role=assistant
 * (transparent background, no border, same role+status header). Body
 * chunks are staggered with `animate-fade-up` to evoke streaming, and
 * citations land as inline `<code>` chips matching how grounded answers
 * reference real files.
 */
function AssistantMessage({ delay }: { delay: number }) {
  const citations = [
    'packages/next/src/server/app-render/app-render.tsx',
    'packages/next/src/server/app-render/create-component-tree.tsx',
    'packages/next/src/build/webpack/loaders/next-app-loader.ts',
  ];

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
        <div className="relative animate-fade-up" style={{ animationDelay: `${delay + ASSISTANT_BODY_DELAY_MS}ms` }}>
          <GuideAccent delay={delay + ASSISTANT_BODY_DELAY_MS + 100} />
          <p>Nested layouts are resolved across three phases — build-time discovery, runtime rendering, and component tree assembly:</p>
        </div>

        <ul className="flex flex-col gap-1.5">
          {citations.map((path, idx) => (
            <CitationItem key={path} delay={delay + CITATION_BASE_DELAY_MS + idx * CITATION_STEP_MS}>
              {path}
            </CitationItem>
          ))}
        </ul>

        <div
          className="relative flex animate-fade-up items-center gap-2 pt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
          style={{ animationDelay: `${delay + GROUNDED_FOOTER_DELAY_MS}ms` }}
        >
          <GuideAccent delay={delay + GROUNDED_FOOTER_DELAY_MS + 100} />
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-primary" />
            grounded · {citations.length} files cited
          </span>
        </div>
      </div>
    </div>
  );
}

function CitationItem({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <li className="relative flex animate-fade-up items-start gap-2" style={{ animationDelay: `${delay}ms` }}>
      <GuideAccent delay={delay + 100} />
      <span aria-hidden className="leading-6 text-primary">
        →
      </span>
      <code className="rounded-sm bg-muted/60 px-1.5 py-0.5 font-mono text-[11.5px] leading-5">{children}</code>
    </li>
  );
}

/**
 * Guide accent — a thin vertical bar that draws in from the top edge
 * of each sequentially appearing element, then fades out. Creates a
 * "spotlight" effect that leads the viewer's eye through the streaming
 * animation sequence: user message → body text → each citation → footer.
 */
function GuideAccent({ delay }: { delay: number }) {
  return (
    <span
      className="absolute left-0 top-0 block h-full w-[3px] animate-guide-accent bg-primary"
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden
    />
  );
}

/**
 * Composer mock. Mirrors the `<form>` at the bottom of `<ChatPanel />`:
 * a textarea-shaped placeholder, an inline mode pill (Docs is the
 * default that fits this hero's narrative — grounded, sourced answers),
 * and a Send button. Decorative only — no event handlers.
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
