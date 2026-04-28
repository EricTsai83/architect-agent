import { Logo } from '@/components/logo';
import { GitHubIcon } from '@/components/icons';
import { COPYRIGHT_YEAR, REPO_LABEL, REPO_URL } from '../data';

export function SiteFooter() {
  return (
    <footer className="relative border-t border-border/70 bg-background/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 font-mono text-[13px] text-muted-foreground sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <Logo size={18} />
          <span className="tracking-tight">© {COPYRIGHT_YEAR} systify · open source</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#top" className="transition-colors hover:text-foreground">
            <span aria-hidden>↑ </span>top
          </a>
          <a
            href={REPO_URL}
            rel="noreferrer"
            target="_blank"
            aria-label={`View ${REPO_LABEL} on GitHub`}
            title={REPO_LABEL}
            className="inline-flex items-center transition-colors hover:text-foreground"
          >
            <GitHubIcon className="size-3.5" />
            <span className="sr-only">{REPO_LABEL}</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
