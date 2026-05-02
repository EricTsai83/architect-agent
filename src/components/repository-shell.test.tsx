// @vitest-environment jsdom

import type React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Doc } from "../../convex/_generated/dataModel";
import { RepositoryShell } from "./repository-shell";
import type { RepositoryId, ThreadId, WorkspaceId } from "@/lib/types";

const { useMutationMock, useQueryMock } = vi.hoisted(() => ({
  useMutationMock: vi.fn(),
  useQueryMock: vi.fn(),
}));

const navigateMock = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: useMutationMock,
  useQuery: useQueryMock,
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/components/app-sidebar", () => ({
  AppSidebar: ({
    onImported,
  }: {
    onImported: (repoId: RepositoryId, threadId: ThreadId | null, workspaceId: WorkspaceId) => void;
  }) => (
    <button
      type="button"
      data-testid="sidebar-import"
      onClick={() =>
        onImported("repo_imported" as RepositoryId, "thread_imported" as ThreadId, "workspace_imported" as WorkspaceId)
      }
    >
      Import from sidebar
    </button>
  ),
}));

vi.mock("@/components/top-bar", () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));

vi.mock("@/components/chat-panel", () => ({
  ChatPanel: ({
    showArtifactToggle,
    isArtifactPanelOpen,
    onToggleArtifactPanel,
  }: {
    showArtifactToggle?: boolean;
    isArtifactPanelOpen?: boolean;
    onToggleArtifactPanel?: () => void;
  }) => (
    <div data-testid="chat-panel">
      {showArtifactToggle ? (
        <button
          data-testid="artifact-panel-toggle"
          data-open={isArtifactPanelOpen ? "true" : "false"}
          onClick={onToggleArtifactPanel}
        >
          Toggle artifacts
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("@/components/artifact-panel", () => ({
  ArtifactPanel: () => <div data-testid="artifact-panel" />,
}));

vi.mock("@/components/empty-state", () => ({
  EmptyState: ({
    onImported,
  }: {
    onImported: (repoId: RepositoryId, threadId: ThreadId | null, workspaceId: WorkspaceId) => void;
  }) => (
    <button
      type="button"
      data-testid="empty-state"
      onClick={() =>
        onImported("repo_empty" as RepositoryId, "thread_empty" as ThreadId, "workspace_empty" as WorkspaceId)
      }
    >
      Empty import
    </button>
  ),
}));

vi.mock("@/components/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("@/components/app-notice", () => ({
  AppNotice: () => null,
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarInset: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) => (
    <div data-testid="artifact-sheet" data-open={open ? "true" : "false"}>
      {children}
    </div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div />,
}));

vi.mock("@/hooks/use-thread-capabilities", () => ({
  useThreadCapabilities: () => ({
    availableModes: ["discuss"],
    defaultMode: "discuss",
    attachedRepository: null,
    sandboxModeStatus: { reasonCode: "missing_sandbox", message: null },
    disabledReasons: {},
    isMissingThread: false,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-check-for-updates", () => ({
  useCheckForUpdates: vi.fn(),
}));

vi.mock("@/hooks/use-repository-actions", () => ({
  useRepositoryActions: () => ({
    isSending: false,
    handleSendMessage: vi.fn(),
    isRunningAnalysis: false,
    handleRunAnalysis: vi.fn(),
    isSyncing: false,
    handleSync: vi.fn(),
    isDeletingThread: false,
    handleDeleteThread: vi.fn(),
    isDeletingRepo: false,
    handleDeleteRepo: vi.fn(),
  }),
}));

type MatchMediaListener = (event: MediaQueryListEvent) => void;

let repositoriesResult: Doc<"repositories">[] | undefined;
let ownerThreadsResult: Doc<"threads">[] | undefined;
let isDesktopMatches = false;
let mediaListener: MatchMediaListener | null = null;
let storedActiveWorkspaceId: string | null = null;

beforeEach(() => {
  navigateMock.mockReset();
  storedActiveWorkspaceId = null;
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => (key === "systify.activeWorkspaceId" ? storedActiveWorkspaceId : null)),
      setItem: vi.fn((key: string, value: string) => {
        if (key === "systify.activeWorkspaceId") {
          storedActiveWorkspaceId = value;
        }
      }),
      removeItem: vi.fn((key: string) => {
        if (key === "systify.activeWorkspaceId") {
          storedActiveWorkspaceId = null;
        }
      }),
    },
  });
  repositoriesResult = [];
  ownerThreadsResult = [];
  isDesktopMatches = false;
  mediaListener = null;

  useMutationMock.mockReset();
  useQueryMock.mockReset();
  useMutationMock.mockReturnValue(vi.fn().mockResolvedValue(null));
  useQueryMock.mockImplementation((_query: unknown, args: unknown) => {
    if (args === undefined) {
      return repositoriesResult;
    }
    if (args && typeof args === "object" && Object.keys(args).length === 0) {
      return ownerThreadsResult;
    }
    if (args === "skip") {
      return undefined;
    }
    if (args && typeof args === "object" && "threadId" in args) {
      return [];
    }
    if (args && typeof args === "object" && "repositoryId" in args) {
      return null;
    }
    return undefined;
  });

  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: isDesktopMatches,
    media: "(min-width: 1024px)",
    onchange: null,
    addEventListener: (_: "change", listener: MatchMediaListener) => {
      mediaListener = listener;
    },
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
});

const repoId = "repo_1" as RepositoryId;

function makeRepository(overrides: Partial<Doc<"repositories">> = {}): Doc<"repositories"> {
  return {
    _id: repoId,
    _creationTime: Date.now(),
    sourceRepoFullName: "octocat/hello-world",
    ...overrides,
  } as unknown as Doc<"repositories">;
}

describe("RepositoryShell artifact toggle behavior", () => {
  test("hides the artifact toggle while workspace is in no-repo state", () => {
    // The no-repo guard is structural — the ChatPanel-level toggle does not
    // render — instead of a disabled-but-present button. Assert the
    // absence and confirm the sheet stays closed once the workspace
    // transitions into ready, so the previous click intent (had there been
    // one) cannot have leaked into shared state.
    const { rerender } = render(<RepositoryShell urlThreadId={null} urlRepositoryId={null} />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("artifact-panel-toggle")).not.toBeInTheDocument();

    repositoriesResult = [makeRepository()];
    rerender(<RepositoryShell urlThreadId={null} urlRepositoryId={repoId} />);

    expect(screen.getByTestId("artifact-sheet")).toHaveAttribute("data-open", "false");
  });

  test("opens mobile sheet in ready state and closes it on desktop breakpoint", () => {
    repositoriesResult = [makeRepository()];

    render(<RepositoryShell urlThreadId={null} urlRepositoryId={repoId} />);
    expect(screen.getByTestId("artifact-sheet")).toHaveAttribute("data-open", "false");

    fireEvent.click(screen.getByTestId("artifact-panel-toggle"));
    expect(screen.getByTestId("artifact-sheet")).toHaveAttribute("data-open", "true");

    act(() => {
      mediaListener?.({ matches: true } as MediaQueryListEvent);
    });
    expect(screen.queryByTestId("artifact-sheet")).not.toBeInTheDocument();
  });
});

describe("RepositoryShell import workspace routing", () => {
  test("sidebar import switches the active workspace and opens the imported default thread", () => {
    render(<RepositoryShell urlThreadId={null} urlRepositoryId={null} />);

    fireEvent.click(screen.getByTestId("sidebar-import"));

    expect(localStorage.getItem("systify.activeWorkspaceId")).toBe("workspace_imported");
    expect(navigateMock).toHaveBeenCalledWith("/t/thread_imported");
  });

  test("empty-state import follows the same workspace switch and thread navigation path", () => {
    render(<RepositoryShell urlThreadId={null} urlRepositoryId={null} />);

    fireEvent.click(screen.getByTestId("empty-state"));

    expect(localStorage.getItem("systify.activeWorkspaceId")).toBe("workspace_empty");
    expect(navigateMock).toHaveBeenCalledWith("/t/thread_empty");
  });
});
