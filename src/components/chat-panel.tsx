import { useMemo, useRef, type FormEvent, type KeyboardEvent } from 'react';
import {
  ChatCircleIcon,
  CubeIcon,
  FileTextIcon,
  PaperPlaneTiltIcon,
} from '@phosphor-icons/react';
import type { Doc } from '../../convex/_generated/dataModel';
import { AppNotice } from '@/components/app-notice';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ActiveMessageStream, ThreadId, ChatMode, SandboxModeStatus } from '@/lib/types';

/**
 * Static catalogue of every mode the selector can render. Order is stable and
 * doubles as the visual order of the pill bar so the user's eye learns the
 * capability ladder left-to-right: discuss → docs → sandbox, lowest-context
 * to highest-context (and lowest-cost to highest-cost).
 *
 * Each caption is the short user-facing answer to "what does this mode read
 * from?". The disabled-mode tooltip (rendered by the resolver via
 * `disabledModeReasons`) takes over when the option isn't usable.
 */
const MODE_CATALOG: ReadonlyArray<{
  value: ChatMode;
  label: string;
  caption: string;
  icon: typeof ChatCircleIcon;
}> = [
  {
    value: 'discuss',
    label: 'Discuss',
    caption: 'no code reference',
    icon: ChatCircleIcon,
  },
  {
    value: 'docs',
    label: 'Docs',
    caption: 'searches your design docs',
    icon: FileTextIcon,
  },
  {
    value: 'sandbox',
    label: 'Sandbox',
    caption: 'runs in a sandbox against live code',
    icon: CubeIcon,
  },
];

const EMPTY_CHAT_OWL = ['   ^...^   ', '  / o,o \\  ', '  |):::(|  ', '====w=w===='].join('\n');

const EMPTY_CHAT_OWL_BLINK = ['   ^...^   ', '  / -,- \\  ', '  |):::(|  ', '====w=w===='].join('\n');

export function ChatPanel({
  selectedThreadId,
  messages,
  activeMessageStream,
  isChatLoading,
  chatInput,
  setChatInput,
  chatMode,
  setChatMode,
  availableModes,
  disabledModeReasons,
  isSending,
  onSendMessage,
  sandboxModeStatus,
  isSyncing,
  onSync,
  isArtifactPanelOpen = false,
  onToggleArtifactPanel,
  showArtifactToggle = false,
}: {
  selectedThreadId: ThreadId | null;
  messages: Doc<'messages'>[] | undefined;
  activeMessageStream: ActiveMessageStream | null | undefined;
  isChatLoading: boolean;
  chatInput: string;
  setChatInput: (v: string) => void;
  chatMode: ChatMode;
  setChatMode: (v: ChatMode) => void;
  availableModes: readonly ChatMode[];
  disabledModeReasons: Partial<Record<ChatMode, string>>;
  isSending: boolean;
  onSendMessage: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  sandboxModeStatus: SandboxModeStatus | null;
  isSyncing: boolean;
  onSync: () => void;
  isArtifactPanelOpen?: boolean;
  onToggleArtifactPanel?: () => void;
  showArtifactToggle?: boolean;
}) {
  const hasMessages = (messages?.length ?? 0) > 0;
  const availableModeSet = useMemo(() => new Set(availableModes), [availableModes]);
  const sandboxModeAvailable = sandboxModeStatus?.reasonCode === 'available';

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-3 px-6 py-6">
          {!isChatLoading && chatMode === 'sandbox' && sandboxModeStatus && !sandboxModeAvailable ? (
            <AppNotice
              title={getSandboxStatusTitle(sandboxModeStatus.reasonCode)}
              message={
                sandboxModeStatus.message ??
                'Sandbox mode is unavailable right now. Sync the repository to provision a fresh sandbox, or switch to a lighter mode.'
              }
              tone="warning"
              actionLabel={isSyncing ? 'Syncing…' : 'Sync now'}
              actionDisabled={isSyncing}
              onAction={onSync}
            />
          ) : null}
          {isChatLoading ? null : !hasMessages ? (
            <EmptyChatHint />
          ) : (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {messages!.map((message) => (
                <MessageBubble key={message._id} message={message} activeMessageStream={activeMessageStream ?? null} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-background">
        <form
          className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 py-3"
          onSubmit={(e) => {
            void onSendMessage(e);
          }}
        >
          <Textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask about architecture, module boundaries, data flow, risks…"
            className="min-h-20 resize-none border-border"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              {showArtifactToggle && onToggleArtifactPanel ? (
                <Button
                  type="button"
                  variant={isArtifactPanelOpen ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={onToggleArtifactPanel}
                  aria-label="Toggle artifacts panel"
                  aria-pressed={isArtifactPanelOpen}
                  className="h-8 shrink-0 gap-1.5 px-2 text-xs"
                >
                  <FileTextIcon size={14} weight="bold" />
                  <span className="hidden sm:inline">Artifacts</span>
                </Button>
              ) : null}
              <ModeCompactSelect
                chatMode={chatMode}
                setChatMode={setChatMode}
                availableModeSet={availableModeSet}
              />
              <div className="hidden md:flex md:items-center md:gap-2">
                {showArtifactToggle && onToggleArtifactPanel ? (
                  <span aria-hidden="true" className="h-5 w-px bg-border" />
                ) : null}
                <div className="flex items-center rounded-md border border-border/70 bg-muted/30 px-1.5 py-1">
                  <ModePillBar
                    chatMode={chatMode}
                    setChatMode={setChatMode}
                    availableModeSet={availableModeSet}
                    disabledModeReasons={disabledModeReasons}
                  />
                </div>
              </div>
            </div>
            <Button
              type="submit"
              variant="default"
              size="sm"
              className="w-full sm:min-w-24 sm:w-auto"
              disabled={isSending || !selectedThreadId || !chatInput.trim()}
            >
              <PaperPlaneTiltIcon weight="bold" />
              {isSending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Pill-bar mode selector. Shows all three modes side by side so the capability
 * ladder is visible at a glance (PRD US 11–14). Modes that the resolver
 * disabled render as `aria-disabled` pills wrapped in a Tooltip whose content
 * is the resolver-provided unlock hint.
 */
function ModePillBar({
  chatMode,
  setChatMode,
  availableModeSet,
  disabledModeReasons,
  className,
}: {
  chatMode: ChatMode;
  setChatMode: (v: ChatMode) => void;
  availableModeSet: Set<ChatMode>;
  disabledModeReasons: Partial<Record<ChatMode, string>>;
  className?: string;
}) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusAndSelect = (targetIndex: number) => {
    const targetOption = MODE_CATALOG[targetIndex];
    if (!targetOption || !availableModeSet.has(targetOption.value)) {
      return;
    }
    setChatMode(targetOption.value);
    buttonRefs.current[targetIndex]?.focus();
  };

  const getWrappedAvailableIndex = (currentIndex: number, step: -1 | 1) => {
    for (let offset = 1; offset <= MODE_CATALOG.length; offset += 1) {
      const nextIndex =
        (currentIndex + offset * step + MODE_CATALOG.length) % MODE_CATALOG.length;
      if (availableModeSet.has(MODE_CATALOG[nextIndex].value)) {
        return nextIndex;
      }
    }
    return currentIndex;
  };

  const getBoundaryAvailableIndex = (direction: 'first' | 'last') => {
    const orderedIndexes =
      direction === 'first'
        ? MODE_CATALOG.map((_, index) => index)
        : MODE_CATALOG.map((_, index) => MODE_CATALOG.length - 1 - index);
    return orderedIndexes.find((index) => availableModeSet.has(MODE_CATALOG[index].value));
  };

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        focusAndSelect(getWrappedAvailableIndex(currentIndex, -1));
        return;
      }
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        focusAndSelect(getWrappedAvailableIndex(currentIndex, 1));
        return;
      }
      case 'Home': {
        const firstIndex = getBoundaryAvailableIndex('first');
        if (firstIndex !== undefined) {
          event.preventDefault();
          focusAndSelect(firstIndex);
        }
        return;
      }
      case 'End': {
        const lastIndex = getBoundaryAvailableIndex('last');
        if (lastIndex !== undefined) {
          event.preventDefault();
          focusAndSelect(lastIndex);
        }
        return;
      }
      case ' ':
      case 'Enter': {
        event.preventDefault();
        focusAndSelect(currentIndex);
        return;
      }
      default:
        return;
    }
  };

  const handleModeChange = (value: string) => {
    if (!value) {
      return;
    }
    const mode = value as ChatMode;
    if (!availableModeSet.has(mode)) {
      return;
    }
    setChatMode(mode);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <ToggleGroup
        type="single"
        value={chatMode}
        onValueChange={handleModeChange}
        aria-label="Answer mode"
        variant="outline"
        size="sm"
        spacing={1}
        className={cn('items-center overflow-x-auto', className)}
      >
        {MODE_CATALOG.map((option, index) => {
          const isAvailable = availableModeSet.has(option.value);
          const isSelected = chatMode === option.value;
          const reason = disabledModeReasons[option.value];

          // Keep unavailable options focusable/hoverable so tooltip hints still
          // work. Selection is gated in `onValueChange` and prevented on
          // click/keyboard interactions for unavailable items.
          const pill = (
            <ToggleGroupItem
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              value={option.value}
              aria-label={option.label}
              aria-disabled={!isAvailable}
              onClick={(event) => {
                if (!isAvailable) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              onKeyDown={(event) => {
                if (!isAvailable && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }
                handleOptionKeyDown(event, index);
              }}
              className={cn(
                'gap-1.5 rounded-sm border border-transparent px-2.5 text-xs transition-colors',
                isAvailable
                  ? 'cursor-pointer bg-background/80 text-foreground/85'
                  : 'cursor-not-allowed text-muted-foreground/60 opacity-60',
                isSelected
                  ? 'border-border/80 bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground',
              )}
            >
              <option.icon size={12} weight="bold" />
              <span className="font-medium">{option.label}</span>
              {isSelected ? (
                <span className="hidden text-muted-foreground sm:inline">{option.caption}</span>
              ) : null}
            </ToggleGroupItem>
          );

          if (!isAvailable && reason) {
            return (
              <Tooltip key={option.value}>
                <TooltipTrigger asChild>{pill}</TooltipTrigger>
                <TooltipContent side="top">{reason}</TooltipContent>
              </Tooltip>
            );
          }

          if (isAvailable && !isSelected) {
            return (
              <Tooltip key={option.value}>
                <TooltipTrigger asChild>{pill}</TooltipTrigger>
                <TooltipContent side="top">{option.caption}</TooltipContent>
              </Tooltip>
            );
          }

          return <span key={option.value}>{pill}</span>;
        })}
      </ToggleGroup>
    </TooltipProvider>
  );
}

function ModeCompactSelect({
  chatMode,
  setChatMode,
  availableModeSet,
}: {
  chatMode: ChatMode;
  setChatMode: (v: ChatMode) => void;
  availableModeSet: Set<ChatMode>;
}) {
  const handleChange = (value: string) => {
    const mode = value as ChatMode;
    if (!availableModeSet.has(mode)) {
      return;
    }
    setChatMode(mode);
  };

  return (
    <div className="md:hidden">
      <label htmlFor="mode-compact-select" className="sr-only">
        Answer mode
      </label>
      <Select value={chatMode} onValueChange={handleChange}>
        <SelectTrigger id="mode-compact-select" className="h-8 w-44 text-xs">
          <SelectValue placeholder="Answer mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {MODE_CATALOG.map((option) => {
              const isAvailable = availableModeSet.has(option.value);
              return (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={!isAvailable}
                >
                  {isAvailable ? option.label : `${option.label} (locked)`}
                </SelectItem>
              );
            })}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function EmptyChatHint() {
  return (
    <div className="flex flex-1 animate-in items-center justify-center fade-in duration-300">
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-1 inline-grid place-items-center">
          <pre
            aria-hidden="true"
            className="pointer-events-none col-start-1 row-start-1 select-none font-mono text-[12px] leading-4 tracking-tight text-muted-foreground"
          >
            {EMPTY_CHAT_OWL}
          </pre>
          <pre
            aria-hidden="true"
            className="animate-terminal-owl-double-blink pointer-events-none col-start-1 row-start-1 select-none bg-background font-mono text-[12px] leading-4 tracking-tight text-muted-foreground"
          >
            {EMPTY_CHAT_OWL_BLINK}
          </pre>
        </div>
        <p className="mt-5 text-base font-medium text-foreground">Start a design conversation</p>
        <p className="mt-2 max-w-sm text-xs text-muted-foreground">
          Architecture · Module dependencies · Risk hotspots
        </p>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  activeMessageStream,
}: {
  message: Doc<'messages'>;
  activeMessageStream: ActiveMessageStream | null;
}) {
  const isUser = message.role === 'user';
  const statusLabel = getMessageStatusLabel(message.status);
  const displayContent =
    message.role === 'assistant' && activeMessageStream?.assistantMessageId === message._id
      ? activeMessageStream.content || message.content
      : message.content;
  return (
    <Card className={cn('p-4', isUser ? 'bg-muted border-transparent' : 'border-transparent bg-transparent px-0')}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{message.role}</p>
        <p className="text-[10px] text-muted-foreground">{statusLabel}</p>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6">{displayContent || '…'}</p>
      {message.errorMessage ? <p className="mt-2 text-xs text-destructive">{message.errorMessage}</p> : null}
    </Card>
  );
}

function getSandboxStatusTitle(reasonCode: SandboxModeStatus['reasonCode'] | undefined) {
  switch (reasonCode) {
    case 'sandbox_provisioning':
      return 'Sandbox still provisioning';
    case 'missing_sandbox':
      return 'Sandbox not ready yet';
    case 'sandbox_unavailable':
      return 'Sandbox no longer available';
    case 'sandbox_expired':
    default:
      return 'Sandbox expired';
  }
}

function getMessageStatusLabel(status: Doc<'messages'>['status']) {
  switch (status) {
    case 'pending':
      return 'Queued';
    case 'streaming':
      return 'Generating';
    case 'completed':
      return 'Ready';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}
