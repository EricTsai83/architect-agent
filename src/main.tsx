import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthKitProvider, useAuth } from '@workos-inc/authkit-react';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithAuthKit } from '@/providers/convex-provider-with-auth-kit';
import './index.css';
import { ErrorBoundary } from '@/providers/error-boundary';
import { ThemeProvider } from '@/providers/theme-provider';
import { AppRouter } from '@/app-router';
import { createAppRouter } from '@/router';
import { AUTH_CALLBACK_PATH } from '@/route-paths';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
const workosRedirectUri = new URL(AUTH_CALLBACK_PATH, window.location.origin).toString();
const router = createAppRouter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <AuthKitProvider
          clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
          redirectUri={workosRedirectUri}
        >
          <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
            <AppRouter router={router} />
          </ConvexProviderWithAuthKit>
        </AuthKitProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
