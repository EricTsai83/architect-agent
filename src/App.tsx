import { AppRouter, createAppRouter } from '@/router';

const router = createAppRouter();

export default function App() {
  return <AppRouter router={router} />;
}
