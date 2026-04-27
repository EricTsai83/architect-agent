// @vitest-environment jsdom

import type React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Doc } from '../../convex/_generated/dataModel';
import type { RepositoryId, ThreadId } from '@/lib/types';

// Stub heavyweight UI primitives down to plain DOM so the test focuses on the
// TopBar's own conditional rendering rather than Radix portal mechanics.
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
}));

vi.mock('@/components/ui/sidebar', () => ({
  SidebarTrigger: () => <button aria-label="Toggle sidebar" />,
}));

// AttachRepoMenu pulls in `useMutation` from convex/react; we don't exercise
// the mutation flow here, so a lightweight stand-in keeps the test deterministic
// without needing a Convex provider.
vi.mock('@/components/attach-repo-menu', () => ({
  AttachRepoMenu: ({
    threadId,
    attachedRepository,
  }: {
    threadId: ThreadId;
    attachedRepository: { fullName: string } | null;
  }) => (
    <div data-testid="attach-repo-menu" data-thread-id={threadId}>
      {attachedRepository ? attachedRepository.fullName : 'Attach repository'}
    </div>
  ),
}));

vi.mock('@/components/repo-info-popover', () => ({
  RepoInfoPopover: ({ title }: { title: string }) => <span>{title}</span>,
}));

vi.mock('@/components/repo-status-indicator', () => ({
  RepoStatusIndicator: () => null,
}));

import { TopBar, type TopBarRepoDetail } from './top-bar';

const threadId = 'thread_1' as ThreadId;
const repoId = 'repo_1' as RepositoryId;

afterEach(() => {
  cleanup();
});

type TopBarTestProps = React.ComponentProps<typeof TopBar>;

function makeJob(overrides: Partial<Doc<'jobs'>>): Doc<'jobs'> {
  return {
    _id: 'job_1',
    _creationTime: Date.now(),
    kind: 'import',
    stage: 'cloning',
    status: 'running',
    progress: 0.5,
    repositoryId: repoId,
    ...overrides,
  } as unknown as Doc<'jobs'>;
}

function makeRepoDetail(overrides: Partial<TopBarRepoDetail> = {}): TopBarRepoDetail {
  return {
    repository: {
      sourceRepoFullName: 'octocat/hello-world',
      importStatus: 'completed',
      defaultBranch: 'main',
      detectedLanguages: ['TypeScript'],
    },
    sandbox: null,
    sandboxModeStatus: { reasonCode: 'available', message: null },
    hasRemoteUpdates: false,
    fileCount: 12,
    fileCountLabel: '12',
    ...overrides,
  };
}

function createTopBarProps(overrides: Partial<TopBarTestProps> = {}): TopBarTestProps {
  return {
    repoDetail: makeRepoDetail(),
    threadId,
    attachedRepository: null,
    availableRepositories: [],
    isSyncing: false,
    onSync: vi.fn(),
    onDeleteRepo: vi.fn(),
    isArtifactPanelOpen: true,
    isArtifactPanelToggleEnabled: true,
    onToggleArtifactPanel: vi.fn(),
    onRunAnalysis: vi.fn(),
    ...overrides,
  };
}

function renderTopBar(overrides: Partial<TopBarTestProps> = {}) {
  return render(<TopBar {...createTopBarProps(overrides)} />);
}

describe('TopBar attach repo chip behavior', () => {
  test('hides attach chip when no thread is selected', () => {
    renderTopBar({ threadId: null });

    expect(screen.queryByTestId('attach-repo-menu')).not.toBeInTheDocument();
  });

  test('shows attach chip when thread exists but no repository is attached', () => {
    // Thread-only routes (repo just got detached, or a fresh thread) must
    // still surface the attach affordance — otherwise the user has no way
    // back to a repo-grounded conversation from the TopBar.
    renderTopBar();

    const chip = screen.getByTestId('attach-repo-menu');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent('Attach repository');
  });

  test('shows attached repository name when repository is bound to thread', () => {
    renderTopBar({
      attachedRepository: { id: repoId, fullName: 'octocat/hello-world', shortName: 'hello-world' },
    });

    expect(screen.getByTestId('attach-repo-menu')).toHaveTextContent('octocat/hello-world');
  });
});

describe('TopBar jobs badge behavior', () => {
  test('shows active count when there are running or queued jobs', () => {
    renderTopBar({
      repoDetail: makeRepoDetail({
        jobs: [
          makeJob({ _id: 'job_a' as Doc<'jobs'>['_id'], status: 'running' }),
          makeJob({ _id: 'job_b' as Doc<'jobs'>['_id'], status: 'queued' }),
          makeJob({ _id: 'job_c' as Doc<'jobs'>['_id'], status: 'completed' }),
        ],
      }),
    });

    // Only running + queued jobs feed the count badge — completed jobs are
    // ignored so a finished-then-queued history doesn't keep nagging the user.
    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
  });

  test('hides active count when all jobs are finished', () => {
    renderTopBar({
      repoDetail: makeRepoDetail({
        jobs: [
          makeJob({ _id: 'job_a' as Doc<'jobs'>['_id'], status: 'completed' }),
          makeJob({ _id: 'job_b' as Doc<'jobs'>['_id'], status: 'failed' }),
        ],
      }),
    });

    expect(screen.queryByTestId('jobs-active-count')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Jobs/ })).toBeInTheDocument();
  });

  test('keeps jobs button enabled and shows empty copy when no jobs exist', () => {
    renderTopBar({
      repoDetail: makeRepoDetail({ jobs: [] }),
    });

    const jobsButton = screen.getByRole('button', { name: 'Jobs' });
    expect(jobsButton).toBeInTheDocument();
    expect(jobsButton).toBeEnabled();
    expect(screen.getByText('No jobs yet.')).toBeInTheDocument();
  });
});

describe('TopBar artifact shortcut behavior', () => {
  test('toggles artifact panel on Cmd/Ctrl + . when shortcut is enabled', () => {
    const onToggleArtifactPanel = vi.fn();
    renderTopBar({ onToggleArtifactPanel });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '.', metaKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '.', ctrlKey: true }));

    expect(onToggleArtifactPanel).toHaveBeenCalledTimes(2);
  });

  test('ignores shortcut when focus is inside an input field', () => {
    const onToggleArtifactPanel = vi.fn();
    renderTopBar({ onToggleArtifactPanel });

    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '.', metaKey: true, bubbles: true }));

    expect(onToggleArtifactPanel).not.toHaveBeenCalled();
  });

  test('ignores shortcut when toggle is disabled (no-repo guard)', () => {
    const onToggleArtifactPanel = vi.fn();
    renderTopBar({
      isArtifactPanelToggleEnabled: false,
      onToggleArtifactPanel,
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '.', metaKey: true }));
    expect(onToggleArtifactPanel).not.toHaveBeenCalled();
  });

  test('ignores shortcut from contenteditable targets', () => {
    const onToggleArtifactPanel = vi.fn();
    renderTopBar({ onToggleArtifactPanel });

    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    document.body.append(editable);
    editable.dispatchEvent(new KeyboardEvent('keydown', { key: '.', metaKey: true, bubbles: true }));

    expect(onToggleArtifactPanel).not.toHaveBeenCalled();
  });
});
