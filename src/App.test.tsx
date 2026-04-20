// @vitest-environment jsdom

import type React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { ConvexProviderWithAuthKit } from './providers/convex-provider-with-auth-kit';
import { AppRouter, createAppMemoryRouter } from './router';

const getAccessTokenMock = vi.fn<() => Promise<string | null>>();

vi.mock('@/pages/home', () => ({
  HomePage: () => <div>home page</div>,
}));

vi.mock('@/pages/chat', () => ({
  ChatPage: () => <div>chat page</div>,
}));

vi.mock('convex/react', async () => {
  const React = await import('react');

  const AuthContext = React.createContext({
    isLoading: true,
    isAuthenticated: false,
    fetchAccessToken: async () => null as string | null,
  });

  return {
    ConvexProviderWithAuth: ({
      children,
      useAuth,
    }: {
      children: React.ReactNode;
      useAuth: () => {
        isLoading: boolean;
        isAuthenticated: boolean;
        fetchAccessToken: () => Promise<string | null>;
      };
    }) => {
      const auth = useAuth();
      const { fetchAccessToken } = auth;

      React.useEffect(() => {
        const timer = window.setTimeout(() => {
          void fetchAccessToken();
        }, 0);

        return () => window.clearTimeout(timer);
      }, [fetchAccessToken]);

      return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
    },
    ConvexReactClient: class {},
    useConvexAuth: () => React.useContext(AuthContext),
  };
});

describe('App auth token failures', () => {
  afterEach(() => {
    cleanup();
    getAccessTokenMock.mockReset();
    vi.restoreAllMocks();
  });

  test('shows the auth error even when the user is signed in', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getAccessTokenMock.mockRejectedValue(new Error('token fetch failed'));

    function useAuth() {
      return {
        isLoading: false,
        user: { id: 'user_1' },
        getAccessToken: getAccessTokenMock,
      };
    }

    renderWithAuth(useAuth, ['/chat']);

    expect(await screen.findByText('chat page')).toBeInTheDocument();
    expect(
      await screen.findByText('Authentication failed. Please refresh the page and sign in again.'),
    ).toBeInTheDocument();
  });

  test('loads the home route for signed-out users on /', async () => {
    function useAuth() {
      return {
        isLoading: false,
        user: null,
        getAccessToken: getAccessTokenMock,
      };
    }

    renderWithAuth(useAuth, ['/']);

    expect(await screen.findByText('home page')).toBeInTheDocument();
  });

  test('redirects signed-in users from / to /chat', async () => {
    function useAuth() {
      return {
        isLoading: false,
        user: { id: 'user_1' },
        getAccessToken: getAccessTokenMock,
      };
    }

    renderWithAuth(useAuth, ['/']);

    expect(await screen.findByText('chat page')).toBeInTheDocument();
  });
});

function renderWithAuth(
  useAuth: () => {
    isLoading: boolean;
    user: { id: string } | null;
    getAccessToken: () => Promise<string | null>;
  },
  initialEntries: string[],
) {
  const router = createAppMemoryRouter(initialEntries);

  render(
    <ConvexProviderWithAuthKit client={{} as never} useAuth={useAuth}>
      <AppRouter router={router} />
    </ConvexProviderWithAuthKit>,
  );
}
