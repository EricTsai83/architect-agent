import { useState, type ReactNode } from 'react';
import { useMutation, useQuery } from 'convex/react';
import {
  CircleNotchIcon,
  GraphIcon,
  LightningIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react';
import { api } from '../../convex/_generated/api';
import type { Doc } from '../../convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MermaidRenderer } from '@/components/mermaid-renderer';
import { useAsyncCallback } from '@/hooks/use-async-callback';
import { toUserErrorMessage } from '@/lib/errors';
import type { ThreadId } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * ArtifactPanel — slot-based right-side panel showing artifacts attached to
 * the current thread (PRD #19, "Modules to build (frontend)" + US 23 "all
 * artifacts associated with a thread visible in a side panel, so that I can
 * review them without leaving the conversation").
 *
 * The panel is *kind-dispatched*: each artifact's `kind` selects a renderer.
 * For now only `architecture_diagram` has a custom renderer (MermaidRenderer);
 * everything else falls back to a markdown-ish `<pre>` block. The dispatcher
 * is a single `kindRenderers` map so adding ADR / failure-mode renderers in
 * Phase 4 is a one-line change.
 *
 * The panel also hosts the generation CTA for the upstream artifact kind in
 * scope on this branch — a "Generate architecture diagram" affordance that
 * routes through `requestArchitectureDiagram`. Generation is gated on having
 * a repository attached to the thread; the CTA is hidden otherwise so the
 * empty state is honest about the current capability.
 */
export function ArtifactPanel({
  threadId,
  hasAttachedRepository,
  className,
}: {
  threadId: ThreadId | null;
  hasAttachedRepository: boolean;
  className?: string;
}) {
  // Query is scoped to thread-level artifacts. A diagram is double-parented
  // (thread + repo), so it shows up here. ADRs and failure modes will follow
  // the same pattern in Phase 4.
  const artifacts = useQuery(
    api.artifacts.listByThread,
    threadId ? { threadId } : 'skip',
  );

  return (
    <aside
      aria-label="Thread artifacts"
      className={cn(
        'flex h-full min-h-0 w-80 shrink-0 flex-col border-l border-border bg-muted/20',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Artifacts</span>
          <span className="text-[11px] text-muted-foreground">
            Persistent outputs of this design conversation.
          </span>
        </div>
      </div>

      {threadId ? (
        <div className="border-b border-border px-4 py-3">
          <ArchitectureDiagramCta
            threadId={threadId}
            hasAttachedRepository={hasAttachedRepository}
          />
        </div>
      ) : null}

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-4">
          {threadId === null ? (
            <EmptyArtifactState
              title="No conversation selected"
              description="Pick or start a thread to see its artifacts here."
            />
          ) : artifacts === undefined ? (
            <ArtifactSkeleton />
          ) : artifacts.length === 0 ? (
            <EmptyArtifactState
              title="No artifacts yet"
              description={
                hasAttachedRepository
                  ? 'Generate an architecture diagram to start grounding this thread.'
                  : 'Attach a repository to start producing diagrams, ADRs, and failure-mode analyses.'
              }
            />
          ) : (
            artifacts.map((artifact) => <ArtifactCard key={artifact._id} artifact={artifact} />)
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function ArchitectureDiagramCta({
  threadId,
  hasAttachedRepository,
}: {
  threadId: ThreadId;
  hasAttachedRepository: boolean;
}) {
  const requestDiagram = useMutation(api.architectureDiagram.requestArchitectureDiagram);

  // The error state is keyed by `threadId`. Reading via the comparison below
  // means a thread switch hides the prior thread's failure without needing
  // an effect to clear the underlying state — the next failed call on the
  // new thread overwrites it, and the prior thread won't render again.
  const [errorState, setErrorState] = useState<{ threadId: ThreadId; message: string } | null>(null);
  const error = errorState?.threadId === threadId ? errorState.message : null;

  const [isPending, run] = useAsyncCallback(async () => {
    setErrorState(null);
    try {
      await requestDiagram({ threadId, depth: 'module' });
    } catch (err) {
      setErrorState({
        threadId,
        message: toUserErrorMessage(err, 'Failed to generate architecture diagram.'),
      });
    }
  });

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="default"
        size="sm"
        disabled={!hasAttachedRepository || isPending}
        onClick={() => void run()}
        className="justify-center gap-2"
      >
        {isPending ? (
          <>
            <CircleNotchIcon size={14} className="animate-spin" weight="bold" />
            Generating diagram…
          </>
        ) : (
          <>
            <GraphIcon size={14} weight="bold" />
            Generate architecture diagram
          </>
        )}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        {hasAttachedRepository
          ? "Module-level Mermaid graph from your repo's structure."
          : 'Attach a repository to enable diagram generation.'}
      </p>
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-[11px] text-destructive"
        >
          <WarningCircleIcon size={12} weight="bold" className="mt-0.5 shrink-0" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setErrorState(null)}
            className="text-destructive/70 hover:text-destructive"
            aria-label="Dismiss error"
          >
            <XIcon size={10} weight="bold" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ArtifactCard({ artifact }: { artifact: Doc<'artifacts'> }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 p-3 pb-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold">{artifact.title}</h4>
          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
            {artifact.summary}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
          {artifact.kind.replace(/_/g, ' ')}
        </Badge>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <ArtifactBody artifact={artifact} />
        <ArtifactFooter artifact={artifact} />
      </CardContent>
    </Card>
  );
}

/**
 * Kind dispatcher. New artifact kinds with bespoke renderers (ADR, failure
 * mode analysis, etc.) plug in here so the rest of the panel — header,
 * footer, scrolling — stays uniform across kinds.
 */
function ArtifactBody({ artifact }: { artifact: Doc<'artifacts'> }) {
  const renderer = kindRenderers[artifact.kind] ?? defaultArtifactRenderer;
  return renderer(artifact);
}

const kindRenderers: Partial<Record<Doc<'artifacts'>['kind'], (artifact: Doc<'artifacts'>) => ReactNode>> = {
  architecture_diagram: (artifact) => <MermaidRenderer source={artifact.contentMarkdown} />,
};

function defaultArtifactRenderer(artifact: Doc<'artifacts'>): ReactNode {
  return (
    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-[11px] leading-snug text-muted-foreground">
      {artifact.contentMarkdown}
    </pre>
  );
}

function ArtifactFooter({ artifact }: { artifact: Doc<'artifacts'> }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <LightningIcon size={10} weight="bold" />
        <span className="capitalize">{artifact.source}</span>
        <span aria-hidden="true">·</span>
        <span>v{artifact.version}</span>
      </span>
      <time
        dateTime={new Date(artifact._creationTime).toISOString()}
        className="tabular-nums"
        title={new Date(artifact._creationTime).toLocaleString()}
      >
        {formatRelative(artifact._creationTime)}
      </time>
    </div>
  );
}

function formatRelative(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${Math.max(seconds, 1)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ArtifactSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" role="status">
      <span className="sr-only">Loading artifacts…</span>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function EmptyArtifactState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-dashed border-border bg-background/50 p-4 text-center">
      <p className="text-xs font-medium text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground">{description}</p>
    </div>
  );
}
