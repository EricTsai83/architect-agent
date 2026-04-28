import { type ComponentProps } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { Button } from '@/components/ui/button';

type ButtonVariant = ComponentProps<typeof Button>['variant'];

export function AuthButton({
  size = 'default',
  variant,
}: {
  size?: 'default' | 'sm';
  variant?: ButtonVariant;
}) {
  const { user, signIn, signOut } = useAuth();
  return user ? (
    <Button variant={variant ?? 'secondary'} size={size} onClick={() => signOut()}>
      Sign out
    </Button>
  ) : (
    <Button variant={variant ?? 'default'} size={size} onClick={() => void signIn()}>
      Sign in
    </Button>
  );
}
