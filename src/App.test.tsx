// @vitest-environment jsdom

import type React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { ConvexProviderWithAuthKit } from './providers/convex-provider-with-auth-kit';

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

    render(
      <MemoryRouter initialEntries={['/chat']}>
        <ConvexProviderWithAuthKit client={{} as never} useAuth={useAuth}>
          <App />
        </ConvexProviderWithAuthKit>
      </MemoryRouter>,
    );

    expect(await screen.findByText('chat page')).toBeInTheDocument();
    expect(
      await screen.findByText('Authentication failed. Please refresh the page and sign in again.'),
    ).toBeInTheDocument();
  });
});
