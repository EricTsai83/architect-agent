import { useState, type ReactNode } from 'react';
import { useMutation, useQuery } from 'convex/react';
import {
  CircleNotchIcon,
  FileTextIcon,
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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MermaidRenderer } from '@/components/mermaid-renderer';
import { useAsyncCallback } from '@/hooks/use-async-callback';
import { toUserErrorMessage } from '@/lib/errors';
import type { SandboxModeStatus, ThreadId } from '@/lib/types';
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
  sandboxModeStatus,
  className,
}: {
  threadId: ThreadId | null;
  hasAttachedRepository: boolean;
  sandboxModeStatus: SandboxModeStatus | null;
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
          <ArtifactActions
            threadId={threadId}
            hasAttachedRepository={hasAttachedRepository}
            sandboxModeStatus={sandboxModeStatus}
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
            artifacts.map((artifact: Doc<'artifacts'>) => (
              <ArtifactCard key={artifact._id} artifact={artifact} />
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function ArtifactActions({
  threadId,
  hasAttachedRepository,
  sandboxModeStatus,
}: {
  threadId: ThreadId;
  hasAttachedRepository: boolean;
  sandboxModeStatus: SandboxModeStatus | null;
}) {
  const [subsystem, setSubsystem] = useState('API and data access');
  const captureAdr = useMutation(api.designArtifacts.captureAdr);
  const requestFailureMode = useMutation(api.designArtifacts.requestFailureModeAnalysis);
  const requestDiagram = useMutation(api.architectureDiagram.requestArchitectureDiagram);
  const sandboxReady = sandboxModeStatus?.reasonCode === 'available';

  const [diagramError, setDiagramError] = useState<string | null>(null);
  const [adrError, setAdrError] = useState<string | null>(null);
  const [failureError, setFailureError] = useState<string | null>(null);

  const [isDiagramPending, runDiagram] = useAsyncCallback(async () => {
    setDiagramError(null);
    try {
      await requestDiagram({ threadId, depth: 'module' });
    } catch (err) {
      setDiagramError(toUserErrorMessage(err, 'Failed to generate architecture diagram.'));
    }
  });

  const [isAdrPending, runAdr] = useAsyncCallback(async () => {
    setAdrError(null);
    try {
      await captureAdr({ threadId });
    } catch (err) {
      setAdrError(toUserErrorMessage(err, 'Failed to capture ADR.'));
    }
  });

  const [isFailurePending, runFailureMode] = useAsyncCallback(async () => {
    setFailureError(null);
    try {
      await requestFailureMode({
        threadId,
        subsystem: subsystem.trim(),
      });
    } catch (err) {
      setFailureError(toUserErrorMessage(err, 'Failed to start failure mode analysis.'));
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant="default"
        size="sm"
        disabled={!hasAttachedRepository || isDiagramPending}
        onClick={() => void runDiagram()}
        className="justify-center gap-2"
      >
        {isDiagramPending ? (
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
      <InlineError error={diagramError} onClear={() => setDiagramError(null)} />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isAdrPending}
        onClick={() => void runAdr()}
        className="justify-center gap-2"
      >
        {isAdrPending ? (
          <>
            <CircleNotchIcon size={14} className="animate-spin" weight="bold" />
            Capturing ADR…
          </>
        ) : (
          <>
            <FileTextIcon size={14} weight="bold" />
            Capture as ADR
          </>
        )}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        One-click ADR in Context / Decision / Consequences / Alternatives format.
      </p>
      <InlineError error={adrError} onClear={() => setAdrError(null)} />

      <div className="flex flex-col gap-2">
        <Input
          value={subsystem}
          onChange={(event) => setSubsystem(event.target.value)}
          placeholder="Subsystem (e.g. payments pipeline)"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasAttachedRepository || !sandboxReady || isFailurePending || !subsystem.trim()}
          onClick={() => void runFailureMode()}
          className="justify-center gap-2"
        >
          {isFailurePending ? (
            <>
              <CircleNotchIcon size={14} className="animate-spin" weight="bold" />
              Running failure mode analysis…
            </>
          ) : (
            <>
              <WarningCircleIcon size={14} weight="bold" />
              Run failure mode analysis
            </>
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          {hasAttachedRepository
            ? sandboxReady
              ? 'Sandbox-backed scan that records component, blast radius, mitigation, and code references.'
              : sandboxModeStatus?.message ?? 'Sandbox is not ready yet. Sync and wait for ready state.'
            : 'Attach a repository to enable failure mode analysis.'}
        </p>
        <InlineError error={failureError} onClear={() => setFailureError(null)} />
      </div>
    </div>
  );
}

function InlineError({ error, onClear }: { error: string | null; onClear: () => void }) {
  if (!error) {
    return null;
  }
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-[11px] text-destructive"
    >
      <WarningCircleIcon size={12} weight="bold" className="mt-0.5 shrink-0" />
      <p className="flex-1">{error}</p>
      <button
        type="button"
        onClick={onClear}
        className="text-destructive/70 hover:text-destructive"
        aria-label="Dismiss error"
      >
        <XIcon size={10} weight="bold" />
      </button>
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
