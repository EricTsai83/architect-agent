import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { Logo } from '@/components/logo';
import { AuthButton } from '@/components/auth-button';
import { GitHubIcon } from '@/components/icons';
import { REPO_URL } from '../data';

/**
 * Sticky top bar for the signed-out shell. Lives outside `<main>` so the
 * in-page anchor links (`#how`, `#stack`, …) keep working even after a
 * user has scrolled deep into the page.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <a href="#top" className="group flex items-center gap-2.5">
          <Logo size={28} />
          <span className="font-mono text-[15px] font-semibold tracking-tight">Systify</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#stack" className="transition-colors hover:text-foreground">
            Stack
          </a>
          <a href="#modes" className="transition-colors hover:text-foreground">
            Modes
          </a>
          <a href="#self-host" className="transition-colors hover:text-foreground">
            Self-host
          </a>
          <a href="#faq" className="transition-colors hover:text-foreground">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-1.5">
          <Button
            asChild
            variant="secondary"
            size="icon"
            aria-label="View Systify on GitHub"
            title="View Systify on GitHub"
          >
            <a href={REPO_URL} rel="noreferrer" target="_blank">
              <GitHubIcon />
              <span className="sr-only">View Systify on GitHub</span>
            </a>
          </Button>
          <ModeToggle />
          <AuthButton size="sm" />
        </div>
      </div>
    </header>
  );
}
