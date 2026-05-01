import { useAuth } from "@workos-inc/authkit-react";
import { CaretUpDown, Moon, Sun, SignOut, UserCircle, Stack, ChartLineUp } from "@phosphor-icons/react";
import { useTheme } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProfileCard() {
  const { user, signIn, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (!user) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void signIn()}
        className="h-auto w-full justify-start gap-3 px-2 py-2 text-left hover:bg-muted"
      >
        <Avatar className="shrink-0 rounded-md">
          <AvatarFallback className="rounded-md">
            <UserCircle size={20} weight="bold" className="text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 text-sm font-medium">Sign in</span>
      </Button>
    );
  }

  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : (user.email ?? "User");

  const avatarUrl = user.profilePictureUrl;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto w-full justify-start gap-3 px-2 py-2 text-left hover:bg-muted"
        >
          <Avatar className="shrink-0 rounded-md">
            <AvatarImage src={avatarUrl ?? undefined} alt={displayName} className="rounded-md" />
            <AvatarFallback className="rounded-md text-xs font-semibold uppercase">
              {displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user.email ?? "Workspace shortcuts"}</p>
          </div>
          <CaretUpDown size={14} weight="bold" className="shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuItem disabled title="Coming soon">
          <Stack weight="bold" />
          <span>Resources</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled title="Coming soon">
          <ChartLineUp weight="bold" />
          <span>Usage</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
          {isDark ? <Sun weight="bold" /> : <Moon weight="bold" />}
          <span>{isDark ? "Light mode" : "Dark mode"}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
          <SignOut weight="bold" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
