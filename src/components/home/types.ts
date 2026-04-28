import type { ComponentType, SVGProps } from 'react';

export type StackItem = {
  name: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  role: string;
};

export type NarrativeEntry = {
  num: string;
  lead: string;
  trail: string;
};

/**
 * The three knowledge layers, in order of depth (shallow → deep).
 * Each {@link Mode} reads from a prefix of this list. Listing them by
 * name in the panel turns the abstract idea of "depth" into a literal
 * checklist of what the mode reaches into.
 */
export const LAYERS = ['model', 'indexed docs', 'live fs'] as const;

export type Layer = (typeof LAYERS)[number];

/**
 * Each mode owns a {@link ModeTone}. The tone shows up in two
 * load-bearing places — title color and the "lit" sources fill. Panel
 * border and scenario bullets stay neutral so the tone reads as
 * content, not chrome.
 *
 * Concrete Tailwind classes for each tone live in `mode-tones.ts` so
 * the data stays presentation-free.
 */
export type ModeTone = 'emerald' | 'sky' | 'amber';

export type Mode = {
  name: string;
  pitch: string;
  /** 1..3 — number of layers from {@link LAYERS} (in order) that this mode reads. */
  depth: 1 | 2 | 3;
  /** Concrete situations where this mode is the right pick — the user's "when do I use this?" answer. */
  scenarios: ReadonlyArray<string>;
  tone: ModeTone;
};

export type FaqEntry = {
  q: string;
  a: string;
};

export type CommandStep = string;
