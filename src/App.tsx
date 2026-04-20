import { AppRouter } from '@/app-router';
import { createAppRouter } from '@/router';

const router = createAppRouter();

export default function App() {
  return <AppRouter router={router} />;
}
