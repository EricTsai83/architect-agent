import { lazy, Suspense, type ComponentProps } from 'react';
import { useConvexAuth } from 'convex/react';
import {
  createBrowserRouter,
  createMemoryRouter,
  Navigate,
  Outlet,
  RouterProvider,
  type RouteObject,
} from 'react-router-dom';
import { AppNotice } from '@/components/app-notice';
import { ScreenState } from '@/components/screen-state';
import { useConvexAuthStatus } from '@/providers/convex-provider-with-auth-kit';

const HomePage = lazy(() => import('@/pages/home').then((module) => ({ default: module.HomePage })));

async function loadChatRoute() {
  const module = await import('@/pages/chat');
  return { Component: module.ChatPage };
}

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    Component: AppLayout,
    children: [
      {
        index: true,
        Component: LandingRoute,
      },
      {
        Component: ProtectedLayout,
        children: [
          {
            path: 'chat',
            lazy: loadChatRoute,
          },
        ],
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

export function createAppMemoryRouter(initialEntries: string[] = ['/']) {
  return createMemoryRouter(appRoutes, { initialEntries });
}

export function AppRouter({ router }: { router: ComponentProps<typeof RouterProvider>['router'] }) {
  return <RouterProvider router={router} />;
}

function AppLayout() {
  const { authError } = useConvexAuthStatus();

  return (
    <div className="relative flex h-dvh overflow-hidden bg-background">
      {authError ? (
        <div className="absolute inset-x-0 top-0 z-10 border-b border-border px-4 py-3">
          <AppNotice
            title="Authentication error"
            message={authError}
            tone="error"
            actionLabel="Refresh"
            onAction={() => window.location.reload()}
          />
        </div>
      ) : null}
      <Outlet />
    </div>
  );
}

function LandingRoute() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <Suspense fallback={<RouteLoadingScreen description="Loading the home experience." />}>
      <HomePage />
    </Suspense>
  );
}

function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense fallback={<RouteLoadingScreen description="Loading your chat workspace." />}>
      <Outlet />
    </Suspense>
  );
}

function AuthLoadingScreen() {
  return <RouteLoadingScreen description="Reconnecting your session and loading your workspace." />;
}

function RouteLoadingScreen({ description }: { description: string }) {
  return <ScreenState title="Loading…" description={description} />;
}
