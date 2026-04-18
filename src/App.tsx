import { memo, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { Authenticated, Unauthenticated, useMutation, useQuery } from 'convex/react';
import { GithubLogoIcon } from '@phosphor-icons/react';
import { TrashIcon } from '@phosphor-icons/react';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import { ModeToggle } from './components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { AppSidebar } from '@/components/app-sidebar';
import { TopBar } from '@/components/top-bar';
import { ChatPanel } from '@/components/chat-panel';
import { JobRow } from '@/components/job-row';
import { DeepAnalysisDialog } from '@/components/deep-analysis-dialog';
import { useCheckForUpdates } from '@/hooks/use-check-for-updates';

type RepositoryId = Id<'repositories'>;
type ThreadId = Id<'threads'>;

export default function App() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Authenticated>
        <SidebarProvider>
          <RepositoryShell />
        </SidebarProvider>
      </Authenticated>
      <Unauthenticated>
        <SignedOutShell />
      </Unauthenticated>
    </div>
  );
}

function RepositoryShell() {
  const repositories = useQuery(api.repositories.listRepositories);
  const requestDeepAnalysis = useMutation(api.analysis.requestDeepAnalysis);
  const sendMessage = useMutation(api.chat.sendMessage);
  const createThread = useMutation(api.chat.createThread);
  const syncRepository = useMutation(api.repositories.syncRepository);
  const deleteThread = useMutation(api.chat.deleteThread);
  const deleteRepository = useMutation(api.repositories.deleteRepository);

  const [selectedRepositoryId, setSelectedRepositoryId] = useState<RepositoryId | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<ThreadId | null>(null);
  const [threadToDelete, setThreadToDelete] = useState<ThreadId | null>(null);
  const [isDeletingThread, setIsDeletingThread] = useState(false);
  const [showDeleteRepoDialog, setShowDeleteRepoDialog] = useState(false);
  const [isDeletingRepo, setIsDeletingRepo] = useState(false);
  const [analysisPrompt, setAnalysisPrompt] = useState(
    'Summarize the main modules, data flow, and risk areas for this repository.',
  );
  const [chatInput, setChatInput] = useState('');
  const [chatMode, setChatMode] = useState<'fast' | 'deep'>('fast');
  const [isSending, setIsSending] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'jobs' | 'artifacts'>('chat');
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  useEffect(() => {
    if (!repositories || repositories.length === 0) {
      return;
    }
    if (!selectedRepositoryId || !repositories.some((r) => r._id === selectedRepositoryId)) {
      setSelectedRepositoryId(repositories[0]._id);
    }
  }, [repositories, selectedRepositoryId]);

  const repoDetail = useQuery(
    api.repositories.getRepositoryDetail,
    selectedRepositoryId ? { repositoryId: selectedRepositoryId } : 'skip',
  );

  // Derive repo name from the already-loaded list so the TopBar title is
  // available immediately when switching repos (no flash of "Repository").
  const selectedRepoName = repositories?.find((r) => r._id === selectedRepositoryId)?.sourceRepoFullName;

  // Check GitHub for new remote commits on tab-focus and repo-switch
  useCheckForUpdates(selectedRepositoryId);

  useEffect(() => {
    if (!repoDetail?.threads?.length) {
      setSelectedThreadId(null);
      return;
    }
    const preferred = repoDetail.repository.defaultThreadId ?? repoDetail.threads[0]?._id;
    if (!selectedThreadId || !repoDetail.threads.some((t) => t._id === selectedThreadId)) {
      setSelectedThreadId(preferred ?? null);
    }
  }, [selectedThreadId, repoDetail]);

  const messages = useQuery(api.chat.listMessages, selectedThreadId ? { threadId: selectedThreadId } : 'skip');
  const artifacts = useMemo(() => repoDetail?.artifacts ?? [], [repoDetail?.artifacts]);
  const jobs = useMemo(() => repoDetail?.jobs ?? [], [repoDetail?.jobs]);

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedThreadId || !chatInput.trim()) return;
    setIsSending(true);
    try {
      await sendMessage({
        threadId: selectedThreadId,
        content: chatInput,
        mode: chatMode,
      });
      setChatInput('');
    } finally {
      setIsSending(false);
    }
  }

  async function handleCreateThread() {
    if (!selectedRepositoryId) return;
    setIsCreatingThread(true);
    try {
      const threadId = await createThread({
        repositoryId: selectedRepositoryId,
        mode: chatMode,
      });
      setSelectedThreadId(threadId);
    } finally {
      setIsCreatingThread(false);
    }
  }

  async function handleRunAnalysis() {
    if (!selectedRepositoryId) return;
    setIsRunningAnalysis(true);
    try {
      await requestDeepAnalysis({
        repositoryId: selectedRepositoryId,
        prompt: analysisPrompt,
      });
    } finally {
      setIsRunningAnalysis(false);
    }
  }

  async function handleSync() {
    if (!selectedRepositoryId) return;
    setIsSyncing(true);
    try {
      await syncRepository({ repositoryId: selectedRepositoryId });
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleDeleteThread() {
    if (!threadToDelete) return;
    setIsDeletingThread(true);
    try {
      await deleteThread({ threadId: threadToDelete });
      if (selectedThreadId === threadToDelete) {
        setSelectedThreadId(null);
      }
    } finally {
      setIsDeletingThread(false);
      setThreadToDelete(null);
    }
  }

  async function handleDeleteRepo() {
    if (!selectedRepositoryId) return;
    setIsDeletingRepo(true);
    try {
      await deleteRepository({ repositoryId: selectedRepositoryId });
      setSelectedRepositoryId(null);
      setSelectedThreadId(null);
    } finally {
      setIsDeletingRepo(false);
      setShowDeleteRepoDialog(false);
    }
  }

  return (
    <>
      <AppSidebar
        repositories={repositories}
        selectedRepositoryId={selectedRepositoryId}
        onSelectRepository={setSelectedRepositoryId}
        selectedThreadId={selectedThreadId}
        onSelectThread={setSelectedThreadId}
        threads={repoDetail?.threads ?? null}
        isCreatingThread={isCreatingThread}
        onCreateThread={() => void handleCreateThread()}
        onDeleteThread={setThreadToDelete}
        onImported={(repoId, threadId) => {
          setSelectedRepositoryId(repoId);
          if (threadId) setSelectedThreadId(threadId);
        }}
        authButton={<AuthButton size="sm" />}
      />

      <SidebarInset>
        <TopBar
          repoDetail={repoDetail}
          repoName={selectedRepoName}
          isSyncing={isSyncing}
          onSync={() => void handleSync()}
          onDeleteRepo={() => setShowDeleteRepoDialog(true)}
          onRunAnalysis={() => setShowAnalysisDialog(true)}
        />

        {!selectedRepositoryId ? (
          <EmptyState />
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <MainTabsList jobCount={jobs.length} artifactCount={artifacts.length} />

            <TabsContent value="chat">
              <ChatPanel
                selectedThreadId={selectedThreadId}
                messages={messages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                chatMode={chatMode}
                setChatMode={setChatMode}
                isSending={isSending}
                onSendMessage={handleSendMessage}
                deepModeAvailable={repoDetail?.deepModeAvailable ?? false}
                isSyncing={isSyncing}
                onSync={() => void handleSync()}
              />
            </TabsContent>

            <TabsContent value="jobs">
              <ListPanel emptyText="No jobs yet." isEmpty={jobs.length === 0}>
                {jobs.map((job) => (
                  <JobRow key={job._id} job={job} />
                ))}
              </ListPanel>
            </TabsContent>

            <TabsContent value="artifacts">
              <ListPanel
                emptyText="Once the import finishes, manifests, READMEs, and architecture summaries appear here."
                isEmpty={artifacts.length === 0}
              >
                {artifacts.map((artifact) => (
                  <Card key={artifact._id}>
                    <CardHeader className="flex-row items-start justify-between gap-3 p-4 pb-2">
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold">{artifact.title}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">{artifact.summary}</p>
                      </div>
                      <Badge variant="outline" className="uppercase">
                        {artifact.kind}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
                        {artifact.contentMarkdown}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </ListPanel>
            </TabsContent>
          </Tabs>
        )}
      </SidebarInset>

      {/* Confirm delete thread dialog */}
      <Dialog open={threadToDelete !== null} onOpenChange={(open) => !open && setThreadToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete thread</DialogTitle>
            <DialogDescription>
              This will permanently delete this thread and all its messages. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isDeletingThread}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingThread}
              onClick={() => void handleDeleteThread()}
            >
              <TrashIcon weight="bold" />
              {isDeletingThread ? 'Deleting…' : 'Delete thread'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete repository dialog */}
      <Dialog open={showDeleteRepoDialog} onOpenChange={setShowDeleteRepoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete repository</DialogTitle>
            <DialogDescription>
              This will permanently delete this repository and all its threads, messages, analysis artifacts, jobs, and
              indexed files. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isDeletingRepo}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingRepo}
              onClick={() => void handleDeleteRepo()}
            >
              <TrashIcon weight="bold" />
              {isDeletingRepo ? 'Deleting…' : 'Delete repository'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deep analysis dialog */}
      <DeepAnalysisDialog
        open={showAnalysisDialog}
        onOpenChange={setShowAnalysisDialog}
        analysisPrompt={analysisPrompt}
        onAnalysisPromptChange={setAnalysisPrompt}
        isRunning={isRunningAnalysis}
        onRun={() => void handleRunAnalysis()}
      />
    </>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span
      className="ml-1.5 inline-flex min-w-5 items-center justify-center px-1 py-px text-[10px] font-semibold bg-muted text-muted-foreground"
    >
      {count}
    </span>
  );
}

/**
 * Memoised tab bar – only re-renders when the badge counts actually change,
 * not on every repo switch or repoDetail reload.
 */
const MainTabsList = memo(function MainTabsList({
  jobCount,
  artifactCount,
}: {
  jobCount: number;
  artifactCount: number;
}) {
  return (
    <TabsList className="border-b border-border px-4">
      <TabsTrigger value="chat">Chat</TabsTrigger>
      <TabsTrigger value="jobs">
        Jobs
        <CountBadge count={jobCount} />
      </TabsTrigger>
      <TabsTrigger value="artifacts">
        Artifacts
        <CountBadge count={artifactCount} />
      </TabsTrigger>
    </TabsList>
  );
});

function ListPanel({
  emptyText,
  children,
  isEmpty,
}: {
  emptyText: string;
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-6 py-6">
        {isEmpty ? <p className="text-sm text-muted-foreground">{emptyText}</p> : children}
      </div>
    </div>
  );
}

function AuthButton({ size = 'default' }: { size?: 'default' | 'sm' }) {
  const { user, signIn, signOut } = useAuth();
  return user ? (
    <Button variant="secondary" size={size} onClick={() => signOut()}>
      Sign out
    </Button>
  ) : (
    <Button variant="default" size={size} onClick={() => void signIn()}>
      Sign in
    </Button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-10 text-center">
      <Logo size={64} hero />
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Import your first repository</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the <span className="font-semibold text-foreground">+</span> button in the sidebar to paste a GitHub URL.
        </p>
      </div>
    </div>
  );
}

function SignedOutShell() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] dark:opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(60% 50% at 18% 0%, rgba(56,189,248,0.22) 0%, rgba(56,189,248,0) 60%), radial-gradient(40% 40% at 90% 10%, rgba(125,211,252,0.18) 0%, rgba(125,211,252,0) 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08] mask-[radial-gradient(ellipse_at_top,black,transparent_70%)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      <header className="border-b border-border bg-background/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div className="min-w-0 leading-tight">
              <div className="text-sm font-semibold tracking-tight">Architect Agent</div>
              <div className="text-[11px] text-muted-foreground">Grounded codebase answers</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <AuthButton size="sm" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-14 px-6 py-16">
        <section className="flex flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2 border border-border bg-card/60 px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted-foreground backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 bg-primary" />
            </span>
            <span className="uppercase">Early access · open source</span>
          </div>
          <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
            Ask the repo,{' '}
            <span className="bg-linear-to-r from-foreground via-foreground/70 to-foreground/40 bg-clip-text text-transparent">
              not the internet.
            </span>
          </h1>
          <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Import a public repository, let the sandbox boot, and get grounded answers about its architecture, data
            flow, and risk areas — not generic guesses from a model that never saw the code.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <AuthButton />
            <Button asChild variant="secondary">
              <a href="https://github.com" rel="noreferrer" target="_blank">
                <GithubLogoIcon weight="bold" />
                View on GitHub
              </a>
            </Button>
          </div>
        </section>

        <section className="grid items-stretch gap-5 lg:grid-cols-3">
          {[
            {
              label: 'Import',
              eyebrow: 'step 1',
              title: 'Paste a GitHub URL.',
              body: 'We clone it into a fresh sandbox and map the structure.',
            },
            {
              label: 'Ask',
              eyebrow: 'step 2',
              title: 'Pick Quick or Deep mode.',
              body: 'Quick answers from indexed data. Deep searches the live sandbox for any file.',
            },
            {
              label: 'Capture',
              eyebrow: 'step 3',
              title: 'Save the answer.',
              body: 'Conversations, manifests, and architecture notes are saved as artifacts.',
            },
          ].map((card) => (
            <Card key={card.label} className="flex h-full flex-col">
              <CardHeader className="flex-row items-center justify-between gap-4 p-5 pb-3">
                <Badge variant="accent">
                  <span className="h-1.5 w-1.5 bg-primary" />
                  <span>{card.label}</span>
                </Badge>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.eyebrow}
                </span>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col p-5 pt-0">
                <h2 className="text-lg font-semibold">{card.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
