import {
  createBrowserRouter,
  createMemoryRouter,
  type RouteObject,
} from 'react-router-dom';
import { AppLayout, LandingRoute, ProtectedLayout } from '@/router-layouts';

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
