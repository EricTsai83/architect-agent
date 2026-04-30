import type { CSSProperties, ReactNode } from 'react';
import {
  ArrowsClockwiseIcon,
  DotsThreeVerticalIcon,
  FileTextIcon,
  List,
  MagnifyingGlass,
  PaperPlaneTiltIcon,
} from '@phosphor-icons/react';

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
 * types a question in the composer, presses Send, the user message slides
 * in, the assistant header appears in `Generating` state, a tool-call
 * card enters, and body chunks stream in word-by-word as if tokens were
 * arriving. Every keyframe respects `prefers-reduced-motion` via the
 * existing utility classes — see `src/index.css` for the override block.
 */

/* ── timing (ms from mount) ─────────────────────────────────────── */
const TYPING_START = 800;
const TYPING_DURATION = 1500;
const SEND_PRESS = TYPING_START + TYPING_DURATION + 200; // 2500
const COMPOSE_CLEAR = SEND_PRESS + 300; // 2800
const USER_MSG = COMPOSE_CLEAR + 200; // 3000
const ASST_HEADER = USER_MSG + 1000; // 4000
const TOOL_CALL = ASST_HEADER + 400; // 4400
const STREAM_START = TOOL_CALL + 1200; // 5600
const STREAM_WORD_STEP = 60; // ms between each word

const TYPED_TEXT = 'How does the App Router resolve nested layouts?';

const BODY_TEXT =
  'Nested layouts are resolved across three phases — build-time discovery, runtime rendering, and component tree assembly:';
const BODY_WORDS = BODY_TEXT.split(/\s+/);
const STREAM_END = STREAM_START + BODY_WORDS.length * STREAM_WORD_STEP + 300;

export function HeroChat() {
  return (
    <div className="relative animate-fade-in" style={{ animationDelay: '600ms' }}>
      <div className="group/term relative overflow-hidden border border-border bg-card/85 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] backdrop-blur">
        <CornerMarks />

        <ChatTopBar />

        {/* Chat body — same layout vocabulary as <ChatPanel /> */}
        <div className="flex flex-col gap-3 px-5 py-5">
          <UserMessage delay={USER_MSG}>{TYPED_TEXT}</UserMessage>
          <AssistantMessage delay={ASST_HEADER} />
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

/**
 * Assistant message. The response sequence is:
 *   1. **Tool call** card — framed retrieval phase (guide accent).
 *   2. **Body text** — streams word-by-word to evoke LLM token
 *      streaming (guide accent on the paragraph).
 *   3. **Citations + footer** — fade in as a group once streaming
 *      completes.
 */
function AssistantMessage({ delay }: { delay: number }) {
  const citations = [
    'packages/next/src/server/app-render/app-render.tsx',
    'packages/next/src/server/app-render/create-component-tree.tsx',
    'packages/next/src/build/webpack/loaders/next-app-loader.ts',
  ];

  return (
    <div className="animate-fade-up px-0 py-1" style={{ animationDelay: `${delay}ms` }}>
      {/* Header */}
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">assistant</p>
      </div>

      <div className="flex flex-col gap-2.5 text-[13.5px] leading-6 text-foreground/95">
        {/* ── Group 1: Tool call ────────────────────────────────── */}
        <div className="relative animate-fade-up" style={{ animationDelay: `${TOOL_CALL}ms` }}>
          <GuideAccent delay={TOOL_CALL + 100} />
          <div className="rounded-sm border border-border/60 bg-muted/40 px-3 py-2.5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <MagnifyingGlass weight="bold" className="size-3 text-primary" />
              <span>search_codebase</span>
            </div>
            <p className="mt-1.5 font-mono text-[11px] leading-5 text-muted-foreground/80">
              query: &quot;App Router nested layouts&quot;
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
              <span className="size-1 rounded-full bg-emerald-500" />
              3 files found
            </p>
          </div>
        </div>

        {/* ── Group 2: Streamed body text ───────────────────────── */}
        <div>
          <p>
            {BODY_WORDS.map((word, i) => (
              <span
                key={i}
                className="animate-fade-in"
                style={{ animationDelay: `${STREAM_START + i * STREAM_WORD_STEP}ms`, animationDuration: '0.12s' }}
              >
                {word}
                {i < BODY_WORDS.length - 1 ? ' ' : ''}
              </span>
            ))}
          </p>
        </div>

        {/* ── Citations + footer — appear after streaming ───────── */}
        <div className="animate-fade-in flex flex-col gap-2.5" style={{ animationDelay: `${STREAM_END}ms` }}>
          <ul className="flex flex-col gap-1.5">
            {citations.map((path) => (
              <li key={path} className="relative flex items-start gap-2">
                <span aria-hidden className="leading-6 text-primary">
                  →
                </span>
                <code className="rounded-sm bg-muted/60 px-1.5 py-0.5 font-mono text-[11.5px] leading-5">{path}</code>
              </li>
            ))}
          </ul>

          <div className="relative flex items-center gap-2 pt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-primary" />
              grounded · {citations.length} files cited
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Guide accent — a thin vertical bar that draws in from the top edge
 * of each sequentially appearing element, then fades out. Creates a
 * "spotlight" effect that leads the viewer's eye through the streaming
 * animation sequence: user message → tool call → body text → each
 * citation → footer.
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
 * Composer mock with typing choreography. Before the chat messages
 * appear, the composer shows a typewriter animation of the user's
 * question, followed by a Send-button press, and finally the text
 * clears — as if the visitor just watched someone ask a question.
 */
function ChatComposer() {
  return (
    <div className="border-t border-border bg-background/60 px-3 py-3">
      <div className="relative flex min-h-16 items-start rounded-sm border border-border bg-background/80 px-3 py-2.5 text-[12.5px] leading-6">
        {/* Placeholder — disappears quickly right before typing begins */}
        <span
          className="animate-fade-out text-muted-foreground/70"
          style={{ animationDelay: `${TYPING_START - 50}ms`, animationDuration: '0.1s' }}
        >
          Ask about architecture, module boundaries, data flow, risks…
        </span>

        {/* Typed text — typewriter effect, wrapped in a container
            that fades out after Send so the composer "clears" */}
        <span className="absolute inset-x-3 top-2.5 animate-fade-out" style={{ animationDelay: `${COMPOSE_CLEAR}ms` }}>
          <span
            className="animate-hero-typing text-foreground"
            style={
              {
                animationDelay: `${TYPING_START}ms`,
                animationDuration: `${TYPING_DURATION}ms`,
                '--type-width': '100%',
              } as CSSProperties
            }
          >
            {TYPED_TEXT}
          </span>
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-1 text-[11px] text-foreground">
          <FileTextIcon size={12} weight="bold" />
          <span className="font-medium">Docs</span>
          <span className="hidden text-muted-foreground/70 sm:inline">searches your design docs</span>
        </span>
        {/* Send button — press animation at SEND_PRESS */}
        <span
          className="inline-flex animate-send-press items-center gap-1.5 rounded-sm bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground"
          style={{ animationDelay: `${SEND_PRESS}ms` }}
        >
          <PaperPlaneTiltIcon size={12} weight="bold" />
          Send
        </span>
      </div>
    </div>
  );
}
