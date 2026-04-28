import { CircleNotchIcon } from '@phosphor-icons/react';

export function ScreenState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const isLoading = title.endsWith('…') || title.endsWith('...');

  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          {isLoading ? (
            <CircleNotchIcon
              size={22}
              weight="bold"
              className="animate-spin text-muted-foreground"
            />
          ) : (
            <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
          )}
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
