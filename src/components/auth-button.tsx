import { useAuth } from '@workos-inc/authkit-react';
import { Button } from '@/components/ui/button';

type AuthButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost';

export function AuthButton({
  size = 'default',
  variant,
}: {
  size?: 'default' | 'sm';
  variant?: AuthButtonVariant;
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
