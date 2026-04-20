import type { ComponentProps } from 'react';
import { RouterProvider } from 'react-router-dom';

export function AppRouter({ router }: { router: ComponentProps<typeof RouterProvider>['router'] }) {
  return <RouterProvider router={router} />;
}
