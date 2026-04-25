// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepositoryId, ThreadId } from '@/lib/types';

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useQuery: useQueryMock,
}));

// Imported after vi.mock so the mock is in place when the hook resolves
// `useQuery` from `convex/react`.
import { useThreadCapabilities } from './use-thread-capabilities';

const threadId = 'thread_1' as ThreadId;
const repositoryId = 'repo_1' as RepositoryId;

beforeEach(() => {
  useQueryMock.mockReset();
});

describe('useThreadCapabilities — bridging behavior', () => {
  test('threadId null: skips the query and returns general-only defaults', () => {
    useQueryMock.mockReturnValue(undefined);

    const { result } = renderHook(() => useThreadCapabilities(null));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.attachedRepository).toBeNull();
    expect(result.current.sandboxStatus).toBeNull();
    expect(result.current.availableModes).toEqual(['general']);
    expect(result.current.defaultMode).toBe('general');
    expect(Object.keys(result.current.disabledReasons).sort()).toEqual(['deep', 'grounded']);
    // The hook must pass the literal 'skip' sentinel so Convex does not run
    // the query for the non-thread case.
    expect(useQueryMock).toHaveBeenCalledWith(expect.anything(), 'skip');
  });

  test('threadId set, query loading: surfaces isLoading without dropping the selector', () => {
    useQueryMock.mockReturnValue(undefined);

    const { result } = renderHook(() => useThreadCapabilities(threadId));

    expect(result.current.isLoading).toBe(true);
    // Even while loading, the selector still has a sensible shape so the UI
    // does not blink between "no modes" and "modes" within a few hundred ms.
    expect(result.current.availableModes).toEqual(['general']);
    expect(result.current.defaultMode).toBe('general');
    expect(useQueryMock).toHaveBeenCalledWith(expect.anything(), { threadId });
  });

  test('threadId set, query returns null (thread missing): falls back to no-thread defaults', () => {
    useQueryMock.mockReturnValue(null);

    const { result } = renderHook(() => useThreadCapabilities(threadId));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.availableModes).toEqual(['general']);
    expect(result.current.attachedRepository).toBeNull();
  });

  test('thread without a repository: forwards resolver output (general only) and exposes both unlock hints', () => {
    useQueryMock.mockReturnValue({
      thread: { _id: threadId },
      attachedRepository: null,
      sandboxStatus: null,
      chatModes: {
        availableModes: ['general'],
        defaultMode: 'general',
        disabledReasons: {
          grounded: 'Attach a repository to use grounded mode.',
          deep: 'Attach a repository with a ready sandbox to use deep mode.',
        },
      },
    });

    const { result } = renderHook(() => useThreadCapabilities(threadId));

    expect(result.current.attachedRepository).toBeNull();
    expect(result.current.availableModes).toEqual(['general']);
    expect(result.current.defaultMode).toBe('general');
    expect(result.current.disabledReasons.grounded).toBeTruthy();
    expect(result.current.disabledReasons.deep).toBeTruthy();
  });

  test('thread with a repository but no sandbox: bridges general+grounded with a deep tooltip', () => {
    useQueryMock.mockReturnValue({
      thread: { _id: threadId, repositoryId },
      attachedRepository: {
        _id: repositoryId,
        sourceRepoFullName: 'acme/widget',
        sourceRepoName: 'widget',
      },
      sandboxStatus: null,
      chatModes: {
        availableModes: ['general', 'grounded'],
        defaultMode: 'grounded',
        disabledReasons: { deep: 'Provision a sandbox to use deep mode.' },
      },
    });

    const { result } = renderHook(() => useThreadCapabilities(threadId));

    expect(result.current.attachedRepository).toEqual({
      id: repositoryId,
      fullName: 'acme/widget',
      shortName: 'widget',
    });
    expect(result.current.sandboxStatus).toBeNull();
    expect(result.current.availableModes).toEqual(['general', 'grounded']);
    expect(result.current.defaultMode).toBe('grounded');
    expect(result.current.disabledReasons.deep).toMatch(/sandbox/i);
    expect(result.current.disabledReasons.grounded).toBeUndefined();
  });

  test('thread with a ready sandbox: bridges all three modes; default stays grounded so deep is opt-in', () => {
    useQueryMock.mockReturnValue({
      thread: { _id: threadId, repositoryId },
      attachedRepository: {
        _id: repositoryId,
        sourceRepoFullName: 'acme/widget',
        sourceRepoName: 'widget',
      },
      sandboxStatus: 'ready',
      chatModes: {
        availableModes: ['general', 'grounded', 'deep'],
        defaultMode: 'grounded',
        disabledReasons: {},
      },
    });

    const { result } = renderHook(() => useThreadCapabilities(threadId));

    expect(result.current.availableModes).toEqual(['general', 'grounded', 'deep']);
    expect(result.current.defaultMode).toBe('grounded');
    expect(result.current.sandboxStatus).toBe('ready');
    expect(result.current.disabledReasons).toEqual({});
  });

  test('thread with a provisioning sandbox: bridges the provisioning hint into the deep tooltip', () => {
    useQueryMock.mockReturnValue({
      thread: { _id: threadId, repositoryId },
      attachedRepository: {
        _id: repositoryId,
        sourceRepoFullName: 'acme/widget',
        sourceRepoName: 'widget',
      },
      sandboxStatus: 'provisioning',
      chatModes: {
        availableModes: ['general', 'grounded'],
        defaultMode: 'grounded',
        disabledReasons: {
          deep: 'Sandbox is provisioning — deep mode will be available once it is ready.',
        },
      },
    });

    const { result } = renderHook(() => useThreadCapabilities(threadId));

    expect(result.current.sandboxStatus).toBe('provisioning');
    expect(result.current.disabledReasons.deep).toMatch(/provisioning/i);
  });

  test('thread with a stopped sandbox: forwards the resolver-side "expired" hint without re-deriving it', () => {
    useQueryMock.mockReturnValue({
      thread: { _id: threadId, repositoryId },
      attachedRepository: {
        _id: repositoryId,
        sourceRepoFullName: 'acme/widget',
        sourceRepoName: 'widget',
      },
      // The schema-level status is "stopped"; the resolver collapses it onto
      // its own "expired" input. The hook must not duplicate that logic — it
      // hands back the schema status verbatim and trusts disabledReasons to
      // carry the user-visible explanation.
      sandboxStatus: 'stopped',
      chatModes: {
        availableModes: ['general', 'grounded'],
        defaultMode: 'grounded',
        disabledReasons: { deep: 'Sandbox expired — provision a new sandbox to use deep mode.' },
      },
    });

    const { result } = renderHook(() => useThreadCapabilities(threadId));

    expect(result.current.sandboxStatus).toBe('stopped');
    expect(result.current.disabledReasons.deep).toMatch(/expired/i);
  });
});
