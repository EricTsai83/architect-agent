import { Logo } from '@/components/logo';

export function ScreenState({
  title,
  description,
  isLoading = false,
}: {
  title: string;
  description?: string;
  isLoading?: boolean;
}) {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center px-6">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex justify-center">
          <Logo size={56} hero={isLoading} />
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
