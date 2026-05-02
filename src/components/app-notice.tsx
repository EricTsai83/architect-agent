import { WarningCircleIcon, InfoIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type NoticeTone = "info" | "warning" | "error";

const toneClasses: Record<NoticeTone, string> = {
  info: "border-border bg-muted/50 text-foreground",
  warning: "border-primary/30 bg-primary/10 text-foreground",
  error: "border-destructive/20 bg-destructive/5 text-destructive",
};

export function AppNotice({
  title,
  message,
  tone = "info",
  actionLabel,
  onAction,
  actionDisabled = false,
  className,
}: {
  title: string;
  message: string;
  tone?: NoticeTone;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  className?: string;
}) {
  const Icon = tone === "error" || tone === "warning" ? WarningCircleIcon : InfoIcon;
  const isError = tone === "error";

  return (
    <Alert
      variant={isError ? "destructive" : "default"}
      className={cn("grid-cols-[auto_1fr]", toneClasses[tone], className)}
    >
      <Icon
        size={18}
        weight="fill"
        className={cn("mt-0.5 shrink-0", isError ? "text-destructive" : "text-muted-foreground")}
      />
      <div className="min-w-0">
        <AlertTitle className="text-sm">{title}</AlertTitle>
        <AlertDescription
          className={cn("mt-0.5 text-xs leading-5", isError ? "text-destructive" : "text-muted-foreground")}
        >
          {message}
        </AlertDescription>
      </div>
      {actionLabel && onAction ? (
        <AlertAction>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={actionDisabled} onClick={onAction}>
            {actionLabel}
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  );
}
