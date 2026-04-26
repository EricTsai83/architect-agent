import {
  createBrowserRouter,
  createMemoryRouter,
  matchRoutes,
  type RouteObject,
} from 'react-router-dom';
import {
  AppLayout,
  AuthCallbackRoute,
  LandingRoute,
  NotFoundRoute,
  ProtectedLayout,
  RouteErrorBoundary,
} from '@/router-layouts';

async function loadChatRoute() {
  const module = await import('@/pages/chat');
  return { Component: module.ChatPage };
}

/**
 * Routes mounted under {@link ProtectedLayout}. Defining them as a named const
 * (rather than inline in `appRoutes`) lets {@link isProtectedReturnTo} match
 * against the same data the router actually uses, so the post-login redirect
 * allowlist cannot drift from the route table — adding a route here is the
 * only place it needs to be registered.
 */
const protectedRoutes: RouteObject[] = [
  // `/chat` is the no-selection workspace entry point. ChatPage redirects
  // it to the most recent thread (`/t/:threadId`) when one exists, or
  // renders the dual-CTA empty state when none does. Per PRD #19 user
  // story 27 ("most recent thread loads on landing").
  { path: 'chat', lazy: loadChatRoute },
  // PRD #19 user story 25: stable, shareable URLs for design threads.
  { path: 't/:threadId', lazy: loadChatRoute },
  // PRD #19 user story 26: stable, shareable URLs for repository overviews
  // (artifacts + threads grounded in that repo).
  { path: 'r/:repoId', lazy: loadChatRoute },
];

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    Component: AppLayout,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      { index: true, Component: LandingRoute },
      { path: 'callback', Component: AuthCallbackRoute },
      { Component: ProtectedLayout, children: protectedRoutes },
      { path: '*', Component: NotFoundRoute },
    ],
  },
];

/**
 * True when `pathname` matches one of the routes mounted under
 * {@link ProtectedLayout}. Used by `normalizeReturnTo` (in router-layouts) to
 * gate which destinations are valid post-login targets.
 *
 * Derived from {@link protectedRoutes} via `matchRoutes`, so:
 *  - Adding a protected route automatically extends the allowlist.
 *  - Matching is exact (e.g. `/t/abc/extra` is rejected because `t/:threadId`
 *    has no trailing wildcard), which is stricter — and more correct — than
 *    `pathname.startsWith('/t/')`.
 *
 * Callers should pass the URL's parsed `pathname` (no query/hash).
 */
export function isProtectedReturnTo(pathname: string): boolean {
  return (
    matchRoutes([{ path: '/', children: protectedRoutes }], pathname) !== null
  );
}

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

export function createAppMemoryRouter(initialEntries: string[] = ['/']) {
  return createMemoryRouter(appRoutes, { initialEntries });
}
