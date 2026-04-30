import {
  AnthropicIcon,
  ConvexIcon,
  DaytonaIcon,
  GitHubIcon,
  OpenAIIcon,
  WorkOSIcon,
} from '@/components/icons';
import type { CommandStep, FaqEntry, Mode, NarrativeEntry, StackItem } from './types';

export const REPO_URL = 'https://github.com/EricTsai83/systify';
export const REPO_LABEL = 'EricTsai83/systify';

/**
 * Author's public X (Twitter) profile. Surfaced from the homepage's
 * "Quick answers" panel as a softer, more direct line of contact than
 * GitHub issues — useful for non-bug feedback or just saying hi. The
 * handle itself isn't surfaced in the UI; we let the link go to the
 * profile and call it a day so the row stays visually symmetrical
 * with the GitHub CTA above it.
 */
export const X_URL = 'https://x.com/ericts718';

/**
 * Single source of truth for the self-host quickstart commands. Each row
 * is rendered by `<CommandRow>` and the joined form is what `<CopyAllButton>`
 * writes to the clipboard — keeping them derived prevents drift between the
 * visible terminal lines and the copied one-liner.
 */
export const CLONE_STEPS: ReadonlyArray<CommandStep> = [
  `git clone ${REPO_URL}.git`,
  'cd systify',
  'bun install',
  'bun run dev',
];

/** Joined one-liner — derived, never edited directly. */
export const CLONE_COMMAND_TEXT = CLONE_STEPS.join(' && ');

export const STACK: ReadonlyArray<StackItem> = [
  { name: 'WorkOS', Icon: WorkOSIcon, role: 'auth' },
  { name: 'GitHub App', Icon: GitHubIcon, role: 'auth' },
  { name: 'Daytona', Icon: DaytonaIcon, role: 'sandbox' },
  { name: 'Convex', Icon: ConvexIcon, role: 'backend' },
  { name: 'OpenAI', Icon: OpenAIIcon, role: 'model' },
  { name: 'Anthropic', Icon: AnthropicIcon, role: 'model' },
];

export const NARRATIVE: ReadonlyArray<NarrativeEntry> = [
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

export const MODES: ReadonlyArray<Mode> = [
  {
    name: 'Discuss',
    pitch: 'cheapest · seconds',
    depth: 1,
    scenarios: [
      'Open-ended discussions, no repo required',
      'Shaping a question before grounding',
      'Best CP for high-volume iteration',
    ],
    tone: 'emerald',
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
    tone: 'sky',
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
    tone: 'amber',
  },
];

export const FAQS: ReadonlyArray<FaqEntry> = [
  {
    q: 'What does “grounded answer” actually mean?',
    a: 'Every answer points back to the files it came from. If we cite src/main.tsx, you can open it and verify — no taking the model’s word for it.',
  },
  {
    q: 'Can I self-host it?',
    a: 'Yes. The full source is on GitHub under EricTsai83/systify. Clone it, plug in your own Convex and WorkOS keys, and run.',
  },
  {
    q: 'Is my code secure?',
    a: 'Yes. Your cloned code lives in an isolated, per-session Daytona sandbox. Each session is ephemeral and fully isolated from other users. Your code is never added to a shared training set.',
  },
  {
    q: 'Can I import private repositories?',
    a: 'Yes! Both public and private repositories are supported. To import a private repository, simply authorize access through our GitHub App during the import process.',
  },
  {
    q: 'When should I pick which mode?',
    a: 'Discuss is fastest. Docs is for grounded narrative answers. Sandbox is for line-precise checks against the current state of the code.',
  },
];

/**
 * Year shown in the footer copyright line. Computed once at module load —
 * the value is stable for the lifetime of a session and there is no need
 * to recompute it on every render of `<SiteFooter>`.
 */
export const COPYRIGHT_YEAR = new Date().getFullYear();
