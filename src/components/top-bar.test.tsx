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

describe('TopBar attach-repo chip', () => {
  test('does not render the AttachRepoMenu when threadId is null', () => {
    render(
      <TopBar
        repoDetail={makeRepoDetail()}
        threadId={null}
        attachedRepository={null}
        availableRepositories={[]}
        isSyncing={false}
        onSync={vi.fn()}
        onDeleteRepo={vi.fn()}
        onRunAnalysis={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('attach-repo-menu')).not.toBeInTheDocument();
  });

  test('renders the AttachRepoMenu chip even when no repository is attached', () => {
    // Thread-only routes (repo just got detached, or a fresh thread) must
    // still surface the attach affordance — otherwise the user has no way
    // back to a repo-grounded conversation from the TopBar.
    render(
      <TopBar
        threadId={threadId}
        attachedRepository={null}
        availableRepositories={[]}
        isSyncing={false}
        onSync={vi.fn()}
        onDeleteRepo={vi.fn()}
        onRunAnalysis={vi.fn()}
      />,
    );

    const chip = screen.getByTestId('attach-repo-menu');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent('Attach repository');
  });

  test('shows the attached repository name in the chip when one is bound', () => {
    render(
      <TopBar
        repoDetail={makeRepoDetail()}
        threadId={threadId}
        attachedRepository={{ id: repoId, fullName: 'octocat/hello-world', shortName: 'hello-world' }}
        availableRepositories={[]}
        isSyncing={false}
        onSync={vi.fn()}
        onDeleteRepo={vi.fn()}
        onRunAnalysis={vi.fn()}
      />,
    );

    expect(screen.getByTestId('attach-repo-menu')).toHaveTextContent('octocat/hello-world');
  });
});

describe('TopBar jobs popover badge', () => {
  test('shows the running-job badge when at least one job is running or queued', () => {
    render(
      <TopBar
        repoDetail={makeRepoDetail({
          jobs: [
            makeJob({ _id: 'job_a' as Doc<'jobs'>['_id'], status: 'running' }),
            makeJob({ _id: 'job_b' as Doc<'jobs'>['_id'], status: 'queued' }),
            makeJob({ _id: 'job_c' as Doc<'jobs'>['_id'], status: 'completed' }),
          ],
        })}
        threadId={threadId}
        attachedRepository={null}
        availableRepositories={[]}
        isSyncing={false}
        onSync={vi.fn()}
        onDeleteRepo={vi.fn()}
        onRunAnalysis={vi.fn()}
      />,
    );

    // Only running + queued jobs feed the count badge — completed jobs are
    // ignored so a finished-then-queued history doesn't keep nagging the user.
    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
  });

  test('hides the count badge when every job has finished', () => {
    render(
      <TopBar
        repoDetail={makeRepoDetail({
          jobs: [
            makeJob({ _id: 'job_a' as Doc<'jobs'>['_id'], status: 'completed' }),
            makeJob({ _id: 'job_b' as Doc<'jobs'>['_id'], status: 'failed' }),
          ],
        })}
        threadId={threadId}
        attachedRepository={null}
        availableRepositories={[]}
        isSyncing={false}
        onSync={vi.fn()}
        onDeleteRepo={vi.fn()}
        onRunAnalysis={vi.fn()}
      />,
    );

    // The literal "2" only appears as the count badge in the active branch —
    // its absence here confirms the badge isn't wrongly counting finished jobs.
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jobs' })).toBeInTheDocument();
  });

  test('renders an enabled jobs button and empty-state message when no jobs exist yet', () => {
    render(
      <TopBar
        repoDetail={makeRepoDetail({ jobs: [] })}
        threadId={threadId}
        attachedRepository={null}
        availableRepositories={[]}
        isSyncing={false}
        onSync={vi.fn()}
        onDeleteRepo={vi.fn()}
        onRunAnalysis={vi.fn()}
      />,
    );

    const jobsButton = screen.getByRole('button', { name: 'Jobs' });
    expect(jobsButton).toBeInTheDocument();
    expect(jobsButton).toBeEnabled();
    expect(screen.getByText('No jobs yet.')).toBeInTheDocument();
  });
});
