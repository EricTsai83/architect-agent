import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useConvexAuth } from 'convex/react';
import { Button } from '@/components/ui/button';
import { useConvexAuthStatus } from '@/providers/convex-provider-with-auth-kit';

const HomePage = lazy(async () => {
  const module = await import('@/pages/home');
  return { default: module.HomePage };
});

const ChatPage = lazy(async () => {
  const module = await import('@/pages/chat');
  return { default: module.ChatPage };
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { authError } = useConvexAuthStatus();

  return (
    <div className="relative flex h-dvh overflow-hidden bg-background">
      {authError ? (
        <div className="absolute inset-x-0 top-0 z-10 border-b border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>{authError}</p>
            <Button variant="outline" size="sm" className="w-fit" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </div>
      ) : null}
      <Routes>
        <Route
          path="/"
          element={
            isLoading ? (
              <AuthLoadingScreen />
            ) : isAuthenticated ? (
              <Navigate to="/chat" replace />
            ) : (
              <Suspense fallback={<AuthLoadingScreen />}>
                <HomePage />
              </Suspense>
            )
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Suspense fallback={<AuthLoadingScreen />}>
                <ChatPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

function AuthLoadingScreen() {
  return (
    <div className="flex h-full w-full items-center justify-center px-6 text-sm text-muted-foreground">
      Authenticating…
    </div>
  );
}
