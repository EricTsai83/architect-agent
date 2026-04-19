// @vitest-environment jsdom

import type React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';

const { useMutationMock, useQueryMock } = vi.hoisted(() => ({
  useMutationMock: vi.fn(),
  useQueryMock: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useMutation: useMutationMock,
  useQuery: useQueryMock,
}));

vi.mock('@/components/profile-card', () => ({
  ProfileCard: () => <div>profile</div>,
}));

vi.mock('@/components/logo', () => ({
  Logo: () => <div>logo</div>,
}));

vi.mock('@/components/import-repo-dialog', () => ({
  ImportRepoDialog: () => <div>import</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenuButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => <button {...props}>{children}</button>,
}));

import { AppSidebar } from './app-sidebar';

describe('AppSidebar thread selection', () => {
  beforeEach(() => {
    useMutationMock.mockReset();
    useQueryMock.mockReset();
    useMutationMock.mockReturnValue(vi.fn());
  });

  test('does not clear the selected thread while threads are still loading', async () => {
    useQueryMock.mockReturnValue(undefined);
    const onSelectThread = vi.fn();

    render(
      <AppSidebar
        repositories={[
          {
            _id: 'repo_1' as never,
            sourceRepoFullName: 'acme/repo',
            visibility: 'private',
          } as never,
        ]}
        selectedRepositoryId={'repo_1' as never}
        onSelectRepository={vi.fn()}
        selectedThreadId={'thread_1' as never}
        onSelectThread={onSelectThread}
        onDeleteThread={vi.fn()}
        chatMode="fast"
        onImported={vi.fn()}
      />,
    );

    await waitFor(() => expect(useQueryMock).toHaveBeenCalled());
    expect(onSelectThread).not.toHaveBeenCalled();
  });

  test('clears the selected thread only when the loaded list is explicitly empty', async () => {
    useQueryMock.mockReturnValue([]);
    const onSelectThread = vi.fn();

    render(
      <AppSidebar
        repositories={[
          {
            _id: 'repo_1' as never,
            sourceRepoFullName: 'acme/repo',
            visibility: 'private',
          } as never,
        ]}
        selectedRepositoryId={'repo_1' as never}
        onSelectRepository={vi.fn()}
        selectedThreadId={'thread_1' as never}
        onSelectThread={onSelectThread}
        onDeleteThread={vi.fn()}
        chatMode="fast"
        onImported={vi.fn()}
      />,
    );

    await waitFor(() => expect(onSelectThread).toHaveBeenCalledWith(null));
  });
});
